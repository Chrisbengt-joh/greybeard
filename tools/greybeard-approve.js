#!/usr/bin/env node
'use strict';
// greybeard — the gate. The other half of the fence.
//
// The fence blocks the mail clients. This is what the agent gets instead: an
// action it can prepare but not complete. `request` writes the payload and
// puts a dialog on the user's screen showing exactly what will be sent and a
// four-digit code. `confirm` takes that code back and performs the action.
//
// The code is shown on the screen and never returned to the agent. That is the
// whole mechanism: to get it, the agent has to ask the human, and to answer,
// the human has to have read the dialog. Approval and review are the same act.
//
// greybeard: this stops an agent that is wrong or confused, which is the case
// that actually happens. It does not stop an agent that is actively hostile
// and has a shell — that one can script the GUI. Do not sell it as more.

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 3;

function claudeDir() {
  return process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
}

function store() {
  const dir = path.join(claudeDir(), 'approvals');
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  return dir;
}

function config() {
  try {
    return JSON.parse(fs.readFileSync(path.join(claudeDir(), 'greybeard.json'), 'utf8'));
  } catch (e) {
    return {};
  }
}

function audit(line) {
  fs.appendFileSync(path.join(store(), 'audit.log'), new Date().toISOString() + ' ' + line + '\n');
}

function die(msg, code) {
  process.stderr.write('greybeard-approve: ' + msg + '\n');
  process.exit(code === undefined ? 1 : code);
}

// --- the dialog ------------------------------------------------------------

// Fail closed: if there is no way to put this in front of a human, there is no
// approval to be had, and the action does not happen.
function showDialog(title, body, code) {
  const text = body + '\n\nApproval code: ' + code + '\n\nGive this code to the agent only if the above is what you want sent.';
  const attempts = [];

  // greybeard: the dialog command can be overridden, but only from
  // ~/.claude/greybeard.json, never from the environment. An env var here
  // would be a hole the size of the whole tool: whoever sets it sees the code,
  // and the process that would set it is the agent. The config file is covered
  // by the fence's self.edit-fence rule. Tests point this at a stub.
  // A string is run through a shell; an array is argv, which is what tests and
  // Windows paths with spaces want.
  const custom = (config().approve || {}).dialog;
  if (Array.isArray(custom)) attempts.push([custom[0], custom.slice(1).concat([title, text]), false]);
  else if (custom) attempts.push([custom, [title, text], true]);
  if (process.platform === 'darwin') {
    attempts.push(['osascript', ['-e', 'display dialog ' + JSON.stringify(text) + ' with title ' + JSON.stringify(title) + ' buttons {"OK"} default button 1']]);
  } else if (process.platform === 'win32') {
    const ps = '[void][Reflection.Assembly]::LoadWithPartialName("System.Windows.Forms");' +
      '[Windows.Forms.MessageBox]::Show(' + JSON.stringify(text) + ',' + JSON.stringify(title) + ')';
    attempts.push(['powershell', ['-NoProfile', '-Command', ps]]);
  } else {
    attempts.push(['zenity', ['--info', '--title', title, '--width', '480', '--text', text]]);
    attempts.push(['kdialog', ['--title', title, '--msgbox', text]]);
    attempts.push(['notify-send', [title, text]]);
  }
  for (const [cmd, args, shell] of attempts) {
    const res = spawnSync(cmd, args, { stdio: 'ignore', shell: !!shell });
    if (!res.error && res.status === 0) return cmd;
  }
  return null;
}

// --- request ---------------------------------------------------------------

function summarise(action, payload) {
  if (action === 'email.send') {
    const body = String(payload.body || '');
    return [
      'To:      ' + [].concat(payload.to || []).join(', '),
      'Cc:      ' + [].concat(payload.cc || []).join(', '),
      'Subject: ' + (payload.subject || ''),
      '',
      body.length > 1200 ? body.slice(0, 1200) + '\n[...' + (body.length - 1200) + ' more characters]' : body,
    ].join('\n');
  }
  return JSON.stringify(payload, null, 2).slice(0, 1500);
}

function cmdRequest(args) {
  const action = args.action;
  if (!action) die('--action is required (for example email.send)');
  if (!args.file) die('--file <payload.json> is required');

  let payload;
  try {
    payload = JSON.parse(fs.readFileSync(args.file, 'utf8'));
  } catch (e) {
    die('cannot read payload: ' + e.message);
  }

  const id = crypto.randomBytes(4).toString('hex');
  const code = String(crypto.randomInt(1000, 10000));
  const salt = crypto.randomBytes(16).toString('hex');
  const summary = summarise(action, payload);

  const shown = showDialog('greybeard: approve ' + action, summary, code);
  if (!shown) {
    audit('request ' + id + ' ' + action + ' REFUSED no-dialog');
    die('no way to show you the dialog on this machine, so nothing was requested. ' +
        'Install zenity or kdialog, or run the action yourself.', 3);
  }

  fs.writeFileSync(
    path.join(store(), id + '.json'),
    JSON.stringify({
      id,
      action,
      salt,
      hash: crypto.createHash('sha256').update(salt + code).digest('hex'),
      payloadFile: path.resolve(args.file),
      created: Date.now(),
      attempts: 0,
      status: 'pending',
    }),
    { mode: 0o600 }
  );
  audit('request ' + id + ' ' + action + ' shown via ' + shown);

  process.stdout.write(
    [
      'Approval requested: ' + id,
      'A dialog is on the user\'s screen with the full ' + action + ' payload and a four-digit code.',
      'Ask the user for the code. Do not guess it, and do not send this another way.',
      'Then run: greybeard-approve confirm ' + id + ' <code>',
      'The request expires in 5 minutes and burns after ' + MAX_ATTEMPTS + ' wrong codes.',
    ].join('\n') + '\n'
  );
}

// --- confirm ---------------------------------------------------------------

function loadRequest(id) {
  if (!/^[0-9a-f]{8}$/.test(String(id || ''))) die('bad request id');
  const file = path.join(store(), id + '.json');
  let req;
  try {
    req = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    die('no such request: ' + id);
  }
  return { file, req };
}

function timingSafeEqual(a, b) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function cmdConfirm(id, code, args) {
  const { file, req } = loadRequest(id);

  if (req.status !== 'pending') die('request ' + id + ' is already ' + req.status, 4);
  if (Date.now() - req.created > TTL_MS) {
    req.status = 'expired';
    fs.writeFileSync(file, JSON.stringify(req));
    audit('confirm ' + id + ' EXPIRED');
    die('request ' + id + ' expired. Ask again, and this time ask the user first.', 4);
  }

  req.attempts += 1;
  const given = crypto.createHash('sha256').update(req.salt + String(code || '')).digest('hex');
  if (!timingSafeEqual(given, req.hash)) {
    if (req.attempts >= MAX_ATTEMPTS) req.status = 'burned';
    fs.writeFileSync(file, JSON.stringify(req));
    audit('confirm ' + id + ' WRONG attempt ' + req.attempts + (req.status === 'burned' ? ' BURNED' : ''));
    die(
      req.status === 'burned'
        ? 'wrong code, and that was the last attempt. Request ' + id + ' is dead.'
        : 'wrong code. ' + (MAX_ATTEMPTS - req.attempts) + ' attempt(s) left. Ask the user to read the dialog again.',
      4
    );
  }

  // Single use, marked before the action runs: a transport that fails must not
  // leave a live approval lying around for a retry nobody saw.
  req.status = 'used';
  fs.writeFileSync(file, JSON.stringify(req));

  const transport = (config().approve || {})[req.action];
  if (args['dry-run']) {
    audit('confirm ' + id + ' OK dry-run');
    process.stdout.write('Approved. Dry run, so nothing was sent.\n');
    return;
  }
  if (!transport) {
    audit('confirm ' + id + ' OK no-transport');
    die('approved, but no transport is configured for ' + req.action + '. ' +
        'Add {"approve":{"' + req.action + '":"<command with {payload}>"}} to ~/.claude/greybeard.json', 5);
  }

  const cmd = transport.replace('{payload}', JSON.stringify(req.payloadFile));
  const res = spawnSync(cmd, { shell: true, stdio: 'inherit' });
  audit('confirm ' + id + ' OK exit ' + res.status);
  if (res.status !== 0) die('approved, but the transport exited ' + res.status, 6);
  process.stdout.write('Sent. Request ' + id + ' is used and cannot be replayed.\n');
}

// --- argv ------------------------------------------------------------------

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');
      out[k] = v === undefined ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true) : v;
    } else out._.push(a);
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const sub = args._[0];

if (sub === 'request') cmdRequest(args);
else if (sub === 'confirm') cmdConfirm(args._[1], args._[2], args);
else {
  process.stdout.write(
    [
      'greybeard-approve — actions that need a human, and prove it.',
      '',
      '  greybeard-approve request --action email.send --file payload.json',
      '  greybeard-approve confirm <id> <code> [--dry-run]',
      '',
      'The code appears only in the dialog on the user\'s screen. Ask for it.',
    ].join('\n') + '\n'
  );
  process.exit(sub ? 2 : 0);
}
