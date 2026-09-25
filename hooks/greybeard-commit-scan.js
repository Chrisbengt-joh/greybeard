#!/usr/bin/env node
'use strict';
// greybeard — PreToolUse hook, git commit only.
//
// GREYBEARD.md is personal: one person's notes for their own agent, kept out
// of git with .git/info/exclude. Shared notes from several people turn into a
// file nobody owns and nobody trusts. The exclude is written by the skills that
// create the file; this is the net for when it is missing, or when the file was
// tracked before the rule existed. It asks, it does not deny: a repo can keep
// its GREYBEARD.md committed on purpose, as this plugin's own repo does.

const { spawnSync } = require('child_process');
const path = require('path');
const { currentMode, readStdin, writeHookOutput } = require('./greybeard-runtime');

const EVENT = 'PreToolUse';
const MEMORY_FILE = 'GREYBEARD.md';

// `git commit`, however it is spelled, but not `git commit --dry-run`.
const IS_COMMIT = /\bgit\b[^\n|;&]*\bcommit\b/;
const DRY_RUN = /--dry-run\b/;
// Ways the same command line stages tracked changes before committing them:
// `commit -a`, `-am`, `--all`, or a `git add` chained in front.
const STAGES_TRACKED = /\bcommit\b[^\n|;&]*\s(?:-[a-zA-Z]*a[a-zA-Z]*|--all)\b|\bgit\s+add\b/;

// 3 s per git call: the hook as a whole has 5 s in hooks.json, and a hook that
// times out says nothing, which is the same as no net.
function git(cwd, args) {
  const res = spawnSync('git', args, { cwd, encoding: 'utf8', timeout: 3000 });
  if (res.status !== 0) return null;
  return res.stdout;
}

function memoryPaths(output) {
  return String(output || '')
    .split('\0')
    .filter((p) => p && path.basename(p) === MEMORY_FILE);
}

// Which GREYBEARD.md files this command would put in the commit, if any.
function memoryInCommit(cwd, command) {
  const staged = git(cwd, ['diff', '--cached', '--name-only', '-z']);
  if (staged === null) return []; // not a git repo, or no git: nothing to guard
  const found = new Set(memoryPaths(staged));

  if (STAGES_TRACKED.test(command)) {
    // Tracked and changed: `-a` or the chained `git add` picks it up. An
    // excluded, untracked file is not picked up by either, so it is not listed.
    for (const p of memoryPaths(git(cwd, ['ls-files', '-m', '-z']))) found.add(p);
  }
  // `git add GREYBEARD.md && git commit` stages it after this hook has run.
  if (/\bgit\s+add\b[^\n|;&]*GREYBEARD\.md/.test(command)) found.add(MEMORY_FILE);
  return [...found];
}

readStdin((data) => {
  if (currentMode(data.session_id) === 'off') return;

  const command = String((data.tool_input || {}).command || '');
  if (!IS_COMMIT.test(command) || DRY_RUN.test(command)) return;

  const files = memoryInCommit(data.cwd || process.cwd(), command);
  if (files.length === 0) return;

  const context =
    'GREYBEARD: this commit includes ' + files.join(', ') + '. GREYBEARD.md is personal ' +
    'and stays out of git. Unless the user says this repo keeps it committed on purpose: ' +
    'unstage it (`git restore --staged GREYBEARD.md`, or `git rm --cached GREYBEARD.md` ' +
    'if it is tracked), add `GREYBEARD.md` to `.git/info/exclude`, and commit the rest.';

  writeHookOutput(EVENT, context, {
    permissionDecision: 'ask',
    permissionDecisionReason:
      'greybeard: ' + files.join(', ') + ' is personal and is about to be committed.',
  });
});
