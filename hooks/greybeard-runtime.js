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

function modePath() {
  return path.join(getClaudeDir(), '.greybeard-mode');
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

function readMode() {
  try {
    const m = fs.readFileSync(modePath(), 'utf8').trim();
    return isMode(m) ? m : null;
  } catch (e) {
    return null;
  }
}

function setMode(mode) {
  ensureDir(getClaudeDir());
  fs.writeFileSync(modePath(), mode + '\n');
}

function clearMode() {
  try {
    fs.unlinkSync(modePath());
  } catch (e) {
    // already gone
  }
}

// The mode in force right now: an explicit session switch (including "off")
// wins, otherwise the configured default.
function currentMode() {
  return readMode() || getDefaultMode();
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
// shell command. Used for Bash tool calls.
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
  readMode,
  setMode,
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
