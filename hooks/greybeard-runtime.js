'use strict';
// greybeard — shared runtime for the hooks.
//
// Mode is stored in a flag file under the Claude config dir so the
// SessionStart, UserPromptSubmit, and PreToolUse hooks agree on the level.
// GREYBEARD.md is the project's institutional memory; this module finds and
// parses it so hooks can inject the right entries at the right moment.

const fs = require('fs');
const os = require('os');
const path = require('path');

const BOM = String.fromCharCode(0xfeff);

// Some Windows editors and shells prepend a UTF-8 byte order mark. It breaks
// JSON.parse and frontmatter matching, so every read goes through this.
function stripBom(text) {
  const s = String(text || '');
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

const LEVELS = ['lite', 'full', 'ultra'];
const DEFAULT_LEVEL = 'full';
const MEMORY_FILE = 'GREYBEARD.md';

function isLevel(m) {
  return LEVELS.includes(m);
}

function isMode(m) {
  return m === 'off' || isLevel(m);
}

function getClaudeDir() {
  return process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
}

// The level is per session: two Claude Code windows must not share one flag,
// or "/greybeard off" in one silently disarms the guard in the other. Hooks
// pass the session_id from their payload. Without one the shared file is used,
// which is what every session did before.
const SHARED_MODE_FILE = '.greybeard-mode';
const SESSION_MODE_DIR = 'greybeard-modes';

// The id comes from a hook payload and ends up in a path; anything that is
// not a plain id is treated as no id at all.
function sessionKey(sessionId) {
  const id = String(sessionId || '').trim();
  return /^[A-Za-z0-9_-]{1,128}$/.test(id) ? id : null;
}

function modePath(sessionId) {
  const key = sessionKey(sessionId);
  if (!key) return path.join(getClaudeDir(), SHARED_MODE_FILE);
  return path.join(getClaudeDir(), SESSION_MODE_DIR, key + '.mode');
}

// Session flags outlive their sessions: nothing tells a hook that a window
// has closed. greybeard: swept by age at startup instead. A session left
// idle longer than this loses its level and falls back to the default, which
// is the harmless direction to fail in.
const STALE_MODE_MS = 7 * 24 * 60 * 60 * 1000;

function sweepStaleModes(now) {
  const dir = path.join(getClaudeDir(), SESSION_MODE_DIR);
  let names;
  try {
    names = fs.readdirSync(dir);
  } catch (e) {
    return; // no session flags yet
  }
  const cutoff = (now || Date.now()) - STALE_MODE_MS;
  for (const name of names) {
    if (!name.endsWith('.mode')) continue;
    const file = path.join(dir, name);
    try {
      if (fs.statSync(file).mtimeMs < cutoff) fs.unlinkSync(file);
    } catch (e) {
      // raced with another session, or not ours to remove
    }
  }
}

function configPath() {
  return path.join(getClaudeDir(), 'greybeard.json');
}

function readJson(file) {
  try {
    return JSON.parse(stripBom(fs.readFileSync(file, 'utf8')));
  } catch (e) {
    return null;
  }
}

function ensureDir(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (e) {
    // best effort; the write that follows will surface a real problem
  }
}

// Default mode: env var, then ~/.claude/greybeard.json, then "full".
function getDefaultMode() {
  const env = (process.env.GREYBEARD_DEFAULT_MODE || '').trim().toLowerCase();
  if (isMode(env)) return env;
  const cfg = readJson(configPath());
  if (cfg && isMode(cfg.defaultMode)) return cfg.defaultMode;
  return DEFAULT_LEVEL;
}

function writeDefaultMode(mode) {
  ensureDir(getClaudeDir());
  fs.writeFileSync(configPath(), JSON.stringify({ defaultMode: mode }, null, 2) + '\n');
}

function readMode(sessionId) {
  try {
    const m = fs.readFileSync(modePath(sessionId), 'utf8').trim();
    return isMode(m) ? m : null;
  } catch (e) {
    return null;
  }
}

function setMode(mode, sessionId) {
  const file = modePath(sessionId);
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, mode + '\n');
}

function clearMode(sessionId) {
  try {
    fs.unlinkSync(modePath(sessionId));
  } catch (e) {
    // already gone
  }
}

// The mode in force right now: an explicit session switch (including "off")
// wins, otherwise the configured default.
function currentMode(sessionId) {
  return readMode(sessionId) || getDefaultMode();
}

// Walk up from startDir looking for a file named `name`.
function findUp(startDir, name) {
  let dir = path.resolve(startDir || process.cwd());
  for (;;) {
    const candidate = path.join(dir, name);
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function findMemoryFile(startDirs) {
  for (const dir of startDirs) {
    if (!dir) continue;
    const found = findUp(dir, MEMORY_FILE);
    if (found) return found;
  }
  return null;
}

function readMemoryFile(file) {
  try {
    return stripBom(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return '';
  }
}

// A heading is treated as a path pattern when it looks like one: contains a
// slash, or ends in a file extension, and has no spaces. Everything else is a
// free-form topic ("Decision: one database").
function headingIsPath(heading) {
  const h = heading.trim();
  if (/\s/.test(h)) return false;
  return /[\\/]/.test(h) || /\.[A-Za-z0-9]+$/.test(h);
}

// Split GREYBEARD.md into its "## " sections.
function parseEntries(text) {
  const entries = [];
  const lines = String(text || '').split(/\r?\n/);
  let current = null;
  for (const line of lines) {
    const m = /^##\s+(.+?)\s*$/.exec(line);
    if (m) {
      current = { heading: m[1].trim(), body: '' };
      current.isPath = headingIsPath(current.heading);
      entries.push(current);
    } else if (current) {
      current.body += line + '\n';
    }
  }
  for (const e of entries) e.body = e.body.trim();
  return entries;
}

function normalizePath(p) {
  return String(p || '').replace(/\\/g, '/').replace(/^\.\//, '').toLowerCase();
}

function globToRegex(pattern) {
  let re = '';
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === '*') {
      if (pattern[i + 1] === '*') {
        re += '.*';
        i++;
      } else {
        re += '[^/]*';
      }
    } else if (c === '?') {
      re += '[^/]';
    } else {
      re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(re);
}

// Does this entry's heading apply to the given file path? A plain heading
// matches as a substring of the normalized path; a heading with * or ? is a
// glob. greybeard: substring matching means "client.py" also matches
// "old_client.py". Use a longer heading if that bites.
function entryMatches(entry, filePath) {
  if (!entry.isPath) return false;
  const file = normalizePath(filePath);
  const head = normalizePath(entry.heading);
  if (/[*?]/.test(head)) return globToRegex(head).test(file);
  return file.includes(head);
}

function matchEntries(entries, filePath) {
  return entries.filter((e) => entryMatches(e, filePath));
}

// Entries whose heading appears anywhere in a free-text string, such as a
// shell command. Used for Bash and PowerShell tool calls.
function matchEntriesInText(entries, text) {
  const t = normalizePath(text);
  return entries.filter((e) => e.isPath && !/[*?]/.test(e.heading) && t.includes(normalizePath(e.heading)));
}

function formatEntries(entries) {
  return entries.map((e) => '## ' + e.heading + '\n\n' + e.body).join('\n\n');
}

// Emit the JSON Claude Code expects from a hook. `extra` merges into
// hookSpecificOutput (used for permissionDecision on PreToolUse).
function writeHookOutput(eventName, additionalContext, extra) {
  const hookSpecificOutput = Object.assign({ hookEventName: eventName }, extra || {});
  if (additionalContext) hookSpecificOutput.additionalContext = additionalContext;
  try {
    process.stdout.write(JSON.stringify({ hookSpecificOutput }));
  } catch (e) {
    // stdout closed at hook exit must not surface as a hook failure
  }
}

function readStdin(cb) {
  let input = '';
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    let data = {};
    try {
      data = JSON.parse(stripBom(input) || '{}');
    } catch (e) {
      data = {};
    }
    cb(data);
  };
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => {
    input += chunk;
  });
  process.stdin.on('end', finish);
  process.stdin.on('error', finish);
  // greybeard: a hook that never receives stdin must still exit; 3 s is well
  // inside the 5 s hook timeout.
  setTimeout(finish, 3000).unref();
}

module.exports = {
  BOM,
  stripBom,
  LEVELS,
  DEFAULT_LEVEL,
  MEMORY_FILE,
  isLevel,
  isMode,
  getClaudeDir,
  getDefaultMode,
  writeDefaultMode,
  modePath,
  readMode,
  setMode,
  sweepStaleModes,
  clearMode,
  currentMode,
  findUp,
  findMemoryFile,
  readMemoryFile,
  parseEntries,
  matchEntries,
  matchEntriesInText,
  formatEntries,
  normalizePath,
  writeHookOutput,
  readStdin,
};
