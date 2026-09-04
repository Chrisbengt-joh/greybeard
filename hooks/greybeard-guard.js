#!/usr/bin/env node
'use strict';
// greybeard — PreToolUse hook.
//
// The greybeard saying "don't touch it" at the exact moment it matters.
// Before an edit, write, or shell command that touches a path with an entry
// in GREYBEARD.md, the entry is injected as context. In ultra mode the change
// also needs the user's explicit go-ahead.

const path = require('path');
const {
  currentMode,
  findMemoryFile,
  formatEntries,
  matchEntries,
  matchEntriesInText,
  parseEntries,
  readMemoryFile,
  readStdin,
  writeHookOutput,
} = require('./greybeard-runtime');

const EVENT = 'PreToolUse';

function targetPaths(toolName, input) {
  const paths = [];
  if (!input) return paths;
  if (input.file_path) paths.push(String(input.file_path));
  if (input.notebook_path) paths.push(String(input.notebook_path));
  if (toolName === 'MultiEdit' && Array.isArray(input.edits)) {
    for (const e of input.edits) if (e && e.file_path) paths.push(String(e.file_path));
  }
  return paths;
}

function firstLine(text) {
  const m = /\*\*Why:\*\*\s*(.+)/i.exec(text) || /^\s*-\s*(.+)$/m.exec(text);
  return (m ? m[1] : text.split('\n')[0]).trim();
}

readStdin((data) => {
  const mode = currentMode();
  if (mode === 'off') return;

  const toolName = data.tool_name || '';
  const input = data.tool_input || {};
  const cwd = data.cwd || process.cwd();

  const paths = targetPaths(toolName, input);
  const command = toolName === 'Bash' ? String(input.command || '') : '';
  if (paths.length === 0 && !command) return;

  const startDirs = paths.map((p) => path.dirname(path.resolve(cwd, p))).concat([cwd]);
  const memoryFile = findMemoryFile(startDirs);
  if (!memoryFile) return;

  const entries = parseEntries(readMemoryFile(memoryFile));
  const seen = new Set();
  const hits = [];
  const add = (list) => {
    for (const e of list) {
      if (!seen.has(e.heading)) {
        seen.add(e.heading);
        hits.push(e);
      }
    }
  };
  for (const p of paths) add(matchEntries(entries, p));
  if (command) add(matchEntriesInText(entries, command));
  if (hits.length === 0) return;

  const target = paths[0] || 'this command';
  const context =
    'GREYBEARD: ' + target + ' has history in ' + memoryFile + '. Read it before changing anything:\n\n' +
    formatEntries(hits) +
    '\n\nDo not remove or alter what these entries guard without saying so and naming the consequence. ' +
    'If the reason no longer applies, update the entry in the same change.';

  const extra = {};
  if (mode === 'ultra') {
    extra.permissionDecision = 'ask';
    extra.permissionDecisionReason =
      'greybeard: ' + target + ' has a GREYBEARD.md entry (' + firstLine(hits[0].body) + '). Confirm the change.';
  }

  writeHookOutput(EVENT, context, extra);
});
