'use strict';
// greybeard — hook tests. No framework, no fixtures: node --test.
//
// Each hook is run as a real child process with CLAUDE_CONFIG_DIR pointed at
// a temp dir, the way Claude Code runs it.

const assert = require('node:assert/strict');
const { test, beforeEach } = require('node:test');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const HOOKS = path.join(ROOT, 'hooks');
const runtime = require(path.join(HOOKS, 'greybeard-runtime.js'));

let configDir;
let projectDir;

beforeEach(() => {
  configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'greybeard-cfg-'));
  projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'greybeard-proj-'));
  // The runtime helpers used directly by the tests must hit the same dir.
  process.env.CLAUDE_CONFIG_DIR = configDir;
});

function runHook(script, input, env) {
  const res = spawnSync(process.execPath, [path.join(HOOKS, script)], {
    input: JSON.stringify(input || {}),
    encoding: 'utf8',
    env: Object.assign({}, process.env, { CLAUDE_CONFIG_DIR: configDir, GREYBEARD_DEFAULT_MODE: '' }, env || {}),
  });
  assert.equal(res.status, 0, 'hook exited non-zero: ' + res.stderr);
  const out = res.stdout.trim();
  return out ? JSON.parse(out).hookSpecificOutput : null;
}

function readFlag() {
  try {
    return fs.readFileSync(path.join(configDir, '.greybeard-mode'), 'utf8').trim();
  } catch (e) {
    return null;
  }
}

const MEMORY = `# GREYBEARD.md

## src/payments/client.py

- **What:** 150 ms sleep between requests.
- **Why:** Provider returns 500 on two requests within 100 ms.
- **If removed:** Payments drop silently.

## Decision: one database

- **Why:** Three people.

## infra/**/*.yaml

- **Why:** maxSurge 0, connection limit.
`;

// ---- runtime -------------------------------------------------------------

test('parseEntries splits sections and detects path headings', () => {
  const entries = runtime.parseEntries(MEMORY);
  assert.deepEqual(
    entries.map((e) => [e.heading, e.isPath]),
    [
      ['src/payments/client.py', true],
      ['Decision: one database', false],
      ['infra/**/*.yaml', true],
    ],
  );
  assert.match(entries[0].body, /Provider returns 500/);
});

test('matchEntries matches substrings, globs, and Windows paths', () => {
  const entries = runtime.parseEntries(MEMORY);
  const hit = (p) => runtime.matchEntries(entries, p).map((e) => e.heading);
  assert.deepEqual(hit('/repo/src/payments/client.py'), ['src/payments/client.py']);
  assert.deepEqual(hit('C:\\repo\\src\\payments\\client.py'), ['src/payments/client.py']);
  assert.deepEqual(hit('/repo/infra/k8s/api.yaml'), ['infra/**/*.yaml']);
  assert.deepEqual(hit('/repo/src/orders/service.py'), []);
});

test('matchEntriesInText finds paths mentioned in a shell command', () => {
  const entries = runtime.parseEntries(MEMORY);
  const hits = runtime.matchEntriesInText(entries, 'git rm src/payments/client.py && ls');
  assert.deepEqual(hits.map((e) => e.heading), ['src/payments/client.py']);
});

test('stripBom removes a leading byte order mark only', () => {
  assert.equal(runtime.stripBom(runtime.BOM + '{"a":1}'), '{"a":1}');
  assert.equal(runtime.stripBom('{"a":1}'), '{"a":1}');
});

// ---- activate ------------------------------------------------------------

test('activate emits the ruleset at the default level and writes the flag', () => {
  const out = runHook('greybeard-activate.js', { source: 'startup', cwd: projectDir });
  assert.equal(out.hookEventName, 'SessionStart');
  assert.match(out.additionalContext, /GREYBEARD MODE ACTIVE — level: full/);
  assert.match(out.additionalContext, /The reflexes/);
  assert.doesNotMatch(out.additionalContext, /^---/m, 'frontmatter must be stripped');
  assert.match(out.additionalContext, /no GREYBEARD\.md found/);
  assert.equal(readFlag(), 'full');
});

test('activate injects GREYBEARD.md when the project has one', () => {
  fs.writeFileSync(path.join(projectDir, 'GREYBEARD.md'), MEMORY);
  const sub = path.join(projectDir, 'src', 'deep');
  fs.mkdirSync(sub, { recursive: true });
  const out = runHook('greybeard-activate.js', { source: 'startup', cwd: sub });
  assert.match(out.additionalContext, /PROJECT MEMORY/);
  assert.match(out.additionalContext, /Provider returns 500/);
});

test('activate keeps a session-level switch across resume and compact', () => {
  runtime.setMode('ultra');
  const out = runHook('greybeard-activate.js', { source: 'compact', cwd: projectDir });
  assert.match(out.additionalContext, /level: ultra/);
  assert.equal(readFlag(), 'ultra');
});

test('activate resets to the default on startup', () => {
  fs.writeFileSync(path.join(configDir, '.greybeard-mode'), 'ultra\n');
  const out = runHook('greybeard-activate.js', { source: 'startup', cwd: projectDir });
  assert.match(out.additionalContext, /level: full/);
});

test('activate emits nothing when the default is off', () => {
  const out = runHook('greybeard-activate.js', { source: 'startup', cwd: projectDir }, { GREYBEARD_DEFAULT_MODE: 'off' });
  assert.equal(out, null);
  assert.equal(readFlag(), 'off');
});

test('activate honours greybeard.json default', () => {
  fs.writeFileSync(path.join(configDir, 'greybeard.json'), JSON.stringify({ defaultMode: 'lite' }));
  const out = runHook('greybeard-activate.js', { source: 'startup', cwd: projectDir });
  assert.match(out.additionalContext, /level: lite/);
});

test('activate reports SubagentStart as its event', () => {
  const out = runHook('greybeard-activate.js', { hook_event_name: 'SubagentStart', cwd: projectDir });
  assert.equal(out.hookEventName, 'SubagentStart');
});

// ---- mode tracker --------------------------------------------------------

test('tracker switches level on /greybeard <level>', () => {
  const out = runHook('greybeard-mode-tracker.js', { prompt: '/greybeard ultra' });
  assert.match(out.additionalContext, /MODE CHANGED — level: ultra/);
  assert.equal(readFlag(), 'ultra');
});

test('tracker accepts the namespaced form /greybeard:greybeard', () => {
  runHook('greybeard-mode-tracker.js', { prompt: '/greybeard:greybeard lite' });
  assert.equal(readFlag(), 'lite');
});

test('tracker ignores other greybeard commands', () => {
  const out = runHook('greybeard-mode-tracker.js', { prompt: '/greybeard-why src/x.py' });
  assert.equal(out, null);
  assert.equal(readFlag(), null);
});

test('tracker reports the current level on bare /greybeard', () => {
  runtime.setMode('lite');
  const out = runHook('greybeard-mode-tracker.js', { prompt: '/greybeard' });
  assert.match(out.additionalContext, /ACTIVE — level: lite/);
});

test('tracker turns off on /greybeard off and on plain language', () => {
  runtime.setMode('full');
  let out = runHook('greybeard-mode-tracker.js', { prompt: '/greybeard off' });
  assert.match(out.additionalContext, /MODE OFF/);
  assert.equal(readFlag(), 'off');

  runtime.setMode('full');
  out = runHook('greybeard-mode-tracker.js', { prompt: 'stop greybeard, just do it' });
  assert.match(out.additionalContext, /MODE OFF/);
  assert.equal(readFlag(), 'off');
});

test('tracker turns back on with "greybeard on"', () => {
  runtime.setMode('off');
  const out = runHook('greybeard-mode-tracker.js', { prompt: 'greybeard on' });
  assert.match(out.additionalContext, /ACTIVE — level: full/);
  assert.equal(readFlag(), 'full');
});

test('tracker persists a default with /greybeard default <level>', () => {
  const out = runHook('greybeard-mode-tracker.js', { prompt: '/greybeard default ultra' });
  assert.match(out.additionalContext, /DEFAULT SET/);
  const cfg = JSON.parse(fs.readFileSync(path.join(configDir, 'greybeard.json'), 'utf8'));
  assert.equal(cfg.defaultMode, 'ultra');
});

test('tracker rejects an unknown argument without touching the flag', () => {
  const out = runHook('greybeard-mode-tracker.js', { prompt: '/greybeard loud' });
  assert.match(out.additionalContext, /unknown argument/);
  assert.equal(readFlag(), null);
});

// ---- guard ---------------------------------------------------------------

function guard(toolName, toolInput, cwd) {
  return runHook('greybeard-guard.js', { tool_name: toolName, tool_input: toolInput, cwd: cwd || projectDir });
}

test('guard injects the entry before editing a file with history', () => {
  fs.writeFileSync(path.join(projectDir, 'GREYBEARD.md'), MEMORY);
  runtime.setMode('full');
  const file = path.join(projectDir, 'src', 'payments', 'client.py');
  const out = guard('Edit', { file_path: file, old_string: 'a', new_string: 'b' });
  assert.equal(out.hookEventName, 'PreToolUse');
  assert.match(out.additionalContext, /has history/);
  assert.match(out.additionalContext, /Provider returns 500/);
  assert.equal(out.permissionDecision, undefined);
});

test('guard stays silent for files without an entry', () => {
  fs.writeFileSync(path.join(projectDir, 'GREYBEARD.md'), MEMORY);
  runtime.setMode('full');
  const out = guard('Write', { file_path: path.join(projectDir, 'src', 'orders', 'service.py'), content: '' });
  assert.equal(out, null);
});

test('guard stays silent when there is no GREYBEARD.md', () => {
  runtime.setMode('full');
  const out = guard('Edit', { file_path: path.join(projectDir, 'src', 'payments', 'client.py') });
  assert.equal(out, null);
});

test('guard stays silent when greybeard is off', () => {
  fs.writeFileSync(path.join(projectDir, 'GREYBEARD.md'), MEMORY);
  runtime.setMode('off');
  const out = guard('Edit', { file_path: path.join(projectDir, 'src', 'payments', 'client.py') });
  assert.equal(out, null);
});

test('guard asks for confirmation in ultra mode', () => {
  fs.writeFileSync(path.join(projectDir, 'GREYBEARD.md'), MEMORY);
  runtime.setMode('ultra');
  const out = guard('Edit', { file_path: path.join(projectDir, 'src', 'payments', 'client.py') });
  assert.equal(out.permissionDecision, 'ask');
  assert.match(out.permissionDecisionReason, /Provider returns 500/);
});

test('guard catches paths inside Bash commands', () => {
  fs.writeFileSync(path.join(projectDir, 'GREYBEARD.md'), MEMORY);
  runtime.setMode('full');
  const out = guard('Bash', { command: 'git rm src/payments/client.py' });
  assert.match(out.additionalContext, /src\/payments\/client\.py/);
});

test('guard finds GREYBEARD.md above the edited file, not only cwd', () => {
  fs.writeFileSync(path.join(projectDir, 'GREYBEARD.md'), MEMORY);
  runtime.setMode('full');
  const elsewhere = fs.mkdtempSync(path.join(os.tmpdir(), 'greybeard-cwd-'));
  const out = guard('Edit', { file_path: path.join(projectDir, 'infra', 'k8s', 'api.yaml') }, elsewhere);
  assert.match(out.additionalContext, /maxSurge/);
});

test('guard survives a BOM on stdin', () => {
  fs.writeFileSync(path.join(projectDir, 'GREYBEARD.md'), MEMORY);
  runtime.setMode('full');
  const res = spawnSync(process.execPath, [path.join(HOOKS, 'greybeard-guard.js')], {
    input: runtime.BOM + JSON.stringify({ tool_name: 'Edit', tool_input: { file_path: path.join(projectDir, 'src/payments/client.py') }, cwd: projectDir }),
    encoding: 'utf8',
    env: Object.assign({}, process.env, { CLAUDE_CONFIG_DIR: configDir }),
  });
  assert.equal(res.status, 0);
  assert.match(res.stdout, /has history/);
});

// ---- manifests -----------------------------------------------------------

test('hooks.json references scripts that exist', () => {
  const cfg = JSON.parse(fs.readFileSync(path.join(HOOKS, 'hooks.json'), 'utf8'));
  for (const event of Object.keys(cfg.hooks)) {
    for (const group of cfg.hooks[event]) {
      for (const h of group.hooks) {
        const m = /\/hooks\/([\w-]+\.js)"/.exec(h.command);
        assert.ok(m, 'command should reference a hook script: ' + h.command);
        assert.ok(fs.existsSync(path.join(HOOKS, m[1])), 'missing ' + m[1]);
      }
    }
  }
});

test('every skill has frontmatter with a matching name', () => {
  const skillsDir = path.join(ROOT, 'skills');
  for (const dir of fs.readdirSync(skillsDir)) {
    const text = fs.readFileSync(path.join(skillsDir, dir, 'SKILL.md'), 'utf8');
    const m = /^---\r?\n[\s\S]*?^name:\s*(\S+)\s*$[\s\S]*?^---/m.exec(text);
    assert.ok(m, dir + ' has frontmatter');
    assert.equal(m[1], dir, dir + ' name matches directory');
  }
});
