'use strict';
// greybeard — gate tests.
//
// greybeard: the dialog is stubbed through the `approve.dialog` config key,
// not by putting a fake binary on PATH. The first version of this file wrote
// an sh script named `zenity` and set PATH with ":" — on Windows neither
// works, so the real PowerShell dialog ran and every test blocked on a modal
// box on the user's screen. A test must never reach the GUI.

const assert = require('node:assert/strict');
const { test, beforeEach } = require('node:test');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const TOOL = path.join(__dirname, '..', 'tools', 'greybeard-approve.js');
let cfg;
let screen;

beforeEach(() => {
  cfg = fs.mkdtempSync(path.join(os.tmpdir(), 'gb-appr-'));
  screen = path.join(cfg, 'screen.txt');
  // The stub is node, so it runs on every platform the plugin supports.
  const stub = path.join(cfg, 'dialog.js');
  fs.writeFileSync(stub, "require('fs').appendFileSync(process.env.FAKE_SCREEN, process.argv.slice(2).join('\\n') + '\\n');\n");
  writeConfig({ approve: { dialog: [process.execPath, stub] } });
});

function writeConfig(obj) {
  fs.writeFileSync(path.join(cfg, 'greybeard.json'), JSON.stringify(obj));
}

function run(argv, env) {
  return spawnSync(process.execPath, [TOOL].concat(argv), {
    encoding: 'utf8',
    env: Object.assign({}, process.env, { CLAUDE_CONFIG_DIR: cfg, FAKE_SCREEN: screen }, env || {}),
  });
}

function request() {
  const p = path.join(cfg, 'payload.json');
  fs.writeFileSync(p, JSON.stringify({ to: ['a@b.c'], subject: 'Q3 numbers', body: 'here they are' }));
  const res = run(['request', '--action', 'email.send', '--file', p]);
  assert.equal(res.status, 0, res.stderr);
  const shown = fs.readFileSync(screen, 'utf8');
  return {
    id: /Approval requested: ([0-9a-f]{8})/.exec(res.stdout)[1],
    stdout: res.stdout,
    code: /Approval code: (\d{4})/.exec(shown)[1],
    screen: shown,
  };
}

test('the dialog shows the recipient, subject and body', () => {
  const r = request();
  assert.match(r.screen, /a@b\.c/);
  assert.match(r.screen, /Q3 numbers/);
  assert.match(r.screen, /here they are/);
});

test('the code never reaches the agent', () => {
  const r = request();
  assert.doesNotMatch(r.stdout, new RegExp(r.code));
  assert.doesNotMatch(fs.readFileSync(path.join(cfg, 'approvals', r.id + '.json'), 'utf8'), new RegExp('"' + r.code));
});

test('the dialog command is not taken from the environment', () => {
  // The agent can set env vars for a process it spawns. If that could point
  // the dialog somewhere, the agent would read its own approval code.
  writeConfig({});
  const p = path.join(cfg, 'p.json');
  fs.writeFileSync(p, '{}');
  const res = run(['request', '--action', 'email.send', '--file', p], {
    GREYBEARD_APPROVE_DIALOG: process.execPath + ' -e ""',
    PATH: fs.mkdtempSync(path.join(os.tmpdir(), 'gb-nobin-')),
  });
  assert.equal(res.status, 3);
  assert.match(res.stderr, /nothing was requested/);
});

test('the right code approves once and cannot be replayed', () => {
  const r = request();
  assert.equal(run(['confirm', r.id, r.code, '--dry-run']).status, 0);
  const again = run(['confirm', r.id, r.code, '--dry-run']);
  assert.equal(again.status, 4);
  assert.match(again.stderr, /already used/);
});

test('three wrong codes burn the request', () => {
  const r = request();
  const wrong = String((Number(r.code) + 1) % 10000).padStart(4, '0');
  assert.equal(run(['confirm', r.id, wrong]).status, 4);
  assert.equal(run(['confirm', r.id, wrong]).status, 4);
  assert.match(run(['confirm', r.id, wrong]).stderr, /last attempt/);
  assert.match(run(['confirm', r.id, r.code]).stderr, /already burned/);
});

test('an expired request is refused', () => {
  const r = request();
  const f = path.join(cfg, 'approvals', r.id + '.json');
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  j.created -= 6 * 60 * 1000;
  fs.writeFileSync(f, JSON.stringify(j));
  assert.match(run(['confirm', r.id, r.code]).stderr, /expired/);
});

test('it fails closed when the dialog cannot be shown', () => {
  const r = request();
  writeConfig({ approve: { dialog: [process.execPath, path.join(cfg, 'missing.js')] } });
  const res = run(['request', '--action', 'email.send', '--file', path.join(cfg, 'payload.json')], {
    PATH: fs.mkdtempSync(path.join(os.tmpdir(), 'gb-nobin-')),
  });
  assert.equal(res.status, 3);
  assert.match(res.stderr, /nothing was requested/);
  assert.ok(r.id);
});

test('approval without a configured transport does not claim to have sent', () => {
  const r = request();
  const res = run(['confirm', r.id, r.code]);
  assert.equal(res.status, 5);
  assert.match(res.stderr, /no transport is configured/);
});

test('a configured transport receives the payload file', () => {
  const r = request();
  const out = path.join(cfg, 'sent.txt');
  // The transport string goes through a shell, so the node path is quoted:
  // on Windows it is usually under "Program Files", and cmd splits on the space.
  const cp = JSON.stringify(process.execPath) + ' -e "require(\'fs\').copyFileSync(process.argv[1], ' + JSON.stringify(out).replace(/"/g, "'") + ')" {payload}';
  writeConfig({ approve: { dialog: [process.execPath, path.join(cfg, 'dialog.js')], 'email.send': cp } });
  assert.equal(run(['confirm', r.id, r.code]).status, 0);
  assert.match(fs.readFileSync(out, 'utf8'), /Q3 numbers/);
});

test('every step is in the audit log', () => {
  const r = request();
  run(['confirm', r.id, r.code, '--dry-run']);
  const log = fs.readFileSync(path.join(cfg, 'approvals', 'audit.log'), 'utf8');
  assert.match(log, new RegExp('request ' + r.id));
  assert.match(log, new RegExp('confirm ' + r.id + ' OK'));
});
