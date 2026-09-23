#!/usr/bin/env node
'use strict';
// greybeard — PreToolUse hook. The fence.
//
// greybeard-guard.js tells the agent why the code is the way it is. This one
// stops the call. It runs on every Bash and every write, decides deny, ask, or
// nothing, and says which rule fired and what to do instead.
//
// greybeard: the fence deliberately ignores greybeard mode. A safety net that
// can be switched off from the chat is a safety net the agent can talk its way
// past, and the whole point is to keep the human in the loop for the calls
// nobody can take back. GREYBEARD_FENCE=off exists for the human, in the
// environment, where the agent is not writing.

const path = require('path');
const { findUp, readStdin, stripBom, writeHookOutput } = require('./greybeard-runtime');
const { classify, DEFAULTS } = require('./greybeard-fence-rules');
const fs = require('fs');

const EVENT = 'PreToolUse';
const CONFIG_FILE = 'greybeard.fence.json';

// Project overrides live next to GREYBEARD.md. The file is itself covered by
// the self.edit-fence rule, so the agent cannot widen its own allow list.
function loadConfig(cwd) {
  const file = findUp(cwd || process.cwd(), CONFIG_FILE);
  if (!file) return DEFAULTS;
  try {
    const cfg = JSON.parse(stripBom(fs.readFileSync(file, 'utf8')));
    return Object.assign({}, DEFAULTS, cfg, { configFile: file });
  } catch (e) {
    // A broken config must not open the fence. Fall back to the defaults and
    // say so, rather than failing quietly in the direction of permissive.
    return Object.assign({}, DEFAULTS, { configError: file });
  }
}

function reason(hits) {
  const worst = hits[0];
  const lead = worst.decision === 'deny' ? 'greybeard fence: blocked' : 'greybeard fence: needs you';
  const lines = [lead + ' (' + worst.id + ') — ' + worst.why + '.'];
  if (worst.instead) lines.push('Instead: ' + worst.instead + '.');
  const rest = hits.slice(1);
  if (rest.length) lines.push('Also fired: ' + rest.map((h) => h.id).join(', ') + '.');
  return lines.join(' ');
}

readStdin((data) => {
  if ((process.env.GREYBEARD_FENCE || '').trim().toLowerCase() === 'off') return;

  const toolName = data.tool_name || '';
  const input = data.tool_input || {};
  const cwd = data.cwd || process.cwd();

  const config = loadConfig(cwd);
  const hits = classify(toolName, input, config);
  if (hits.length === 0) return;

  const text = reason(hits);
  const extra = {
    permissionDecision: hits[0].decision,
    permissionDecisionReason: text,
  };

  // The reason reaches the user. The context reaches the agent, so it stops
  // trying variations of the same command.
  const context =
    text +
    (hits[0].decision === 'deny'
      ? ' Do not look for another way to run it. Say what you wanted to do and why, and let the user decide.'
      : '') +
    (config.configError ? ' (greybeard.fence.json at ' + path.relative(cwd, config.configError) + ' is not valid JSON; defaults in force.)' : '');

  writeHookOutput(EVENT, context, extra);
});
