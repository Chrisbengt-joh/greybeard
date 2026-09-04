#!/usr/bin/env node
'use strict';
// greybeard — PreToolUse hook, git commit only.
//
// GREYBEARD.md is committed, and in a public repo a commit is permanent:
// deleting an entry later leaves it in the history, the clones and the forks.
// This reads the file before the commit goes out and says what should not be
// in it. It warns once per version of the file, not once per commit.

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const {
  currentMode,
  findMemoryFile,
  getClaudeDir,
  readMemoryFile,
  readStdin,
  writeHookOutput,
} = require('./greybeard-runtime');

const EVENT = 'PreToolUse';
const STATE_FILE = 'greybeard-scan.json';

// `git commit`, however it is spelled, but not `git commit --dry-run`.
const IS_COMMIT = /\bgit\b[^\n|;&]*\bcommit\b/;
const DRY_RUN = /--dry-run\b/;

// Two classes. A secret is a mistake in any repo and asks for confirmation.
// An exposure is only a problem depending on who can read the repo, so it is
// said once and left to the user.
const SECRETS = [
  ['private key block', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['AWS access key id', /\bAKIA[0-9A-Z]{16}\b/],
  ['GitHub token', /\bgh[pousr]_[A-Za-z0-9]{20,}\b/],
  ['Slack token', /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/],
  ['credentials in a URL', /:\/\/[^\s/:@]+:[^\s/@]{3,}@/],
  [
    'assigned secret',
    /\b(?:password|passwd|secret|api[_-]?key|access[_-]?token|private[_-]?key)\b\s*[:=]\s*["']?(?!<|\*|x{3,}|redacted|see\b)[^\s"'<>]{8,}/i,
  ],
];

const EXPOSURES = [
  [
    'how to break it, not what breaks',
    /\b(?:auth(?:entication|ori[sz]ation)?\s+bypass|unauthenticated\s+(?:access|endpoint|request)|no\s+auth\s+check|sql\s+injection|remote\s+code\s+execution|\brce\b|path\s+traversal|\bxss\b|\bcsrf\b|0-?day|exploit(?:able)?)\b/i,
  ],
  ['a named CVE', /\bCVE-\d{4}-\d{4,}\b/],
  ['a private address', /\b(?:10\.\d{1,3}|192\.168|172\.(?:1[6-9]|2\d|3[01]))\.\d{1,3}\.\d{1,3}\b/],
  ['an internal hostname', /\b[a-z0-9][a-z0-9-]*\.(?:internal|intranet|corp|local)\b/i],
];

function scan(text) {
  const lines = text.split(/\r?\n/);
  const hits = [];
  lines.forEach((line, i) => {
    for (const [label, re] of SECRETS) {
      if (re.test(line)) hits.push({ kind: 'secret', label, line: i + 1 });
    }
    for (const [label, re] of EXPOSURES) {
      if (re.test(line)) hits.push({ kind: 'exposure', label, line: i + 1 });
    }
  });
  return hits;
}

function statePath() {
  return path.join(getClaudeDir(), STATE_FILE);
}

function readState() {
  try {
    return JSON.parse(fs.readFileSync(statePath(), 'utf8')) || {};
  } catch (e) {
    return {};
  }
}

function writeState(state) {
  try {
    fs.mkdirSync(getClaudeDir(), { recursive: true });
    fs.writeFileSync(statePath(), JSON.stringify(state, null, 2) + '\n');
  } catch (e) {
    // best effort: without it the same version is reported again next commit
  }
}

readStdin((data) => {
  if (currentMode(data.session_id) === 'off') return;

  const command = String((data.tool_input || {}).command || '');
  if (!IS_COMMIT.test(command) || DRY_RUN.test(command)) return;

  const file = findMemoryFile([data.cwd || process.cwd()]);
  if (!file) return;

  let text;
  try {
    text = readMemoryFile(file);
  } catch (e) {
    return;
  }

  // One warning per version of the file. Editing it earns a fresh look;
  // committing ten times does not.
  const digest = crypto.createHash('sha256').update(text).digest('hex');
  const state = readState();
  if (state[file] === digest) return;
  state[file] = digest;
  writeState(state);

  const hits = scan(text);
  if (hits.length === 0) return;

  // Line numbers only. Repeating the value here would put it in the
  // transcript as well as the commit.
  const list = hits
    .map((h) => '  ' + file + ':' + h.line + '  ' + h.label + (h.kind === 'secret' ? '  (secret)' : ''))
    .join('\n');
  const secrets = hits.filter((h) => h.kind === 'secret');

  const context =
    'GREYBEARD: this commit includes a repository that has ' + file + '. Before it goes out:\n\n' +
    list +
    '\n\nGREYBEARD.md is committed, and a public repo keeps it in the history, the ' +
    'clones and the forks after any later deletion. Secrets do not belong in it at all. ' +
    'For the rest: what breaks, not how to break it — reference a private ticket by id ' +
    'instead of describing a live weakness. Tell the user what you found, by line, ' +
    'without repeating the value.';

  const extra = {};
  if (secrets.length > 0) {
    extra.permissionDecision = 'ask';
    extra.permissionDecisionReason =
      'greybeard: ' + path.basename(file) + ' line ' + secrets[0].line + ' looks like ' +
      secrets[0].label + '. Committing it publishes it.';
  }

  writeHookOutput(EVENT, context, extra);
});
