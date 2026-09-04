#!/usr/bin/env node
'use strict';
// greybeard — UserPromptSubmit hook.
//
// Watches for /greybeard commands and plain-language deactivation, and keeps
// the flag file in step so the PreToolUse guard and later session restarts
// know the level.

const {
  currentMode,
  getDefaultMode,
  isLevel,
  isMode,
  readStdin,
  setMode,
  writeDefaultMode,
  writeHookOutput,
} = require('./greybeard-runtime');

const EVENT = 'UserPromptSubmit';

// "/greybeard", "/greybeard:greybeard", "@greybeard", "$greybeard" followed by
// end of string or whitespace. Does not match "/greybeard-why".
const COMMAND = /^[/@$]greybeard(?::greybeard)?(?:\s+(.*))?$/s;

function isDeactivation(prompt) {
  return /^(stop greybeard|greybeard off|normal mode)\b/.test(prompt);
}

function isActivation(prompt) {
  return /^(greybeard on|start greybeard|be the greybeard)\b/.test(prompt);
}

readStdin((data) => {
  const prompt = String(data.prompt || '').trim().toLowerCase();
  if (!prompt) return;

  const cmd = COMMAND.exec(prompt);
  if (cmd) {
    const args = (cmd[1] || '').trim().split(/\s+/).filter(Boolean);
    const arg = args[0] || '';

    if (arg === 'default') {
      const level = args[1];
      if (isMode(level)) {
        writeDefaultMode(level);
        writeHookOutput(EVENT, 'GREYBEARD DEFAULT SET — new sessions start in ' + level + '.');
      } else {
        writeHookOutput(EVENT, 'GREYBEARD: usage is /greybeard default lite|full|ultra|off');
      }
      return;
    }

    if (arg === 'off') {
      setMode('off');
      writeHookOutput(EVENT, 'GREYBEARD MODE OFF — normal behaviour until "/greybeard" or "greybeard on".');
      return;
    }

    if (isLevel(arg)) {
      setMode(arg);
      writeHookOutput(EVENT, 'GREYBEARD MODE CHANGED — level: ' + arg);
      return;
    }

    if (arg === '') {
      const mode = currentMode();
      if (mode === 'off') {
        writeHookOutput(EVENT, 'GREYBEARD MODE OFF. Switch on with /greybeard lite|full|ultra.');
      } else {
        writeHookOutput(EVENT, 'GREYBEARD MODE ACTIVE — level: ' + mode);
      }
      return;
    }

    writeHookOutput(EVENT, 'GREYBEARD: unknown argument "' + arg + '". Use lite, full, ultra, off, or default <level>.');
    return;
  }

  if (isDeactivation(prompt)) {
    setMode('off');
    writeHookOutput(EVENT, 'GREYBEARD MODE OFF');
    return;
  }

  if (isActivation(prompt)) {
    const def = getDefaultMode();
    const mode = def === 'off' ? 'full' : def;
    setMode(mode);
    writeHookOutput(EVENT, 'GREYBEARD MODE ACTIVE — level: ' + mode);
  }
});
