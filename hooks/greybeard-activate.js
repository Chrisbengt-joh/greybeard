#!/usr/bin/env node
'use strict';
// greybeard — SessionStart and SubagentStart hook.
//
// On startup the configured default level is written to the flag file. On
// resume, clear, and compact the level chosen earlier in the session is kept.
// Then the ruleset and the project's GREYBEARD.md are emitted as context.

const {
  currentMode,
  getDefaultMode,
  readStdin,
  setMode,
  sweepStaleModes,
  writeHookOutput,
} = require('./greybeard-runtime');
const { getInstructions } = require('./greybeard-instructions');

readStdin((data) => {
  const event = data.hook_event_name === 'SubagentStart' ? 'SubagentStart' : 'SessionStart';
  const source = data.source || 'startup';
  const cwd = data.cwd || process.cwd();
  const sessionId = data.session_id;

  const mode = source === 'startup' ? getDefaultMode() : currentMode(sessionId);

  try {
    if (source === 'startup') sweepStaleModes();
    setMode(mode, sessionId);
  } catch (e) {
    // The flag is best effort; the rules still go out.
  }

  if (mode === 'off') return;

  writeHookOutput(event, getInstructions(mode, cwd));
});
