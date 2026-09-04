# GREYBEARD.md

Institutional memory. Why things are the way they are. Read before you
change them.

## .claude-plugin/plugin.json

- **What:** No `"hooks"` key. `hooks/hooks.json` is loaded by convention,
  not by an explicit pointer.
- **Why:** Claude Code auto-discovers `hooks/hooks.json` at the plugin root.
  Verified 2026-09-04: the installed copy of this plugin
  (`~/.claude/plugins/cache/greybeard/greybeard/0.1.0`) is byte-identical to
  the manifest without the key, and its SessionStart hook fired. All six
  hook-carrying plugins in `anthropics/claude-plugins-official` omit the key
  the same way.
- **If the convention changes:** All four hooks go silent. There is no
  error and no warning — greybeard mode simply stops activating, and the
  only symptom is the agent behaving normally. The `hooks.json references
  scripts that exist` test reads `hooks/hooks.json` by that exact path, so
  moving the file fails CI; a change on Claude Code's side would not.
- **Since:** 2026-09-04

## hooks/greybeard-instructions.js

- **What:** `loadMemory` searches only the `cwd` from the hook payload. No
  `process.cwd()` fallback.
- **Why:** The fallback was there originally and was redundant — every
  caller already defaults `data.cwd` to `process.cwd()`, and `findUp` does
  too. It only changed behaviour in the one case where the payload cwd was
  present and different, and there it was wrong: the hook injected the
  GREYBEARD.md of whatever directory the process was launched from. Found
  2026-09-04 when a hermetic test run in a temp project picked up this
  repo's own GREYBEARD.md.
- **If restored:** A subagent or session started from another directory gets
  a foreign project's institutional memory presented as its own.
- **Since:** 2026-09-04

## hooks/hooks.json

- **What:** The `PreToolUse` matcher lists `PowerShell` alongside `Bash`.
- **Why:** Windows sessions get a `PowerShell` tool as well as, or instead
  of, `Bash`. A matcher without it means the guard never runs for shell
  commands on Windows: `Remove-Item` against a documented fence goes through
  with no warning and no error. Found 2026-09-04.
- **If removed:** Silent gap on one platform only, which is the kind that
  survives a green CI run. `PreToolUse matcher covers the shell tools on
  every platform` in `tests/hooks.test.js` fails if a tool drops out.
- **Since:** 2026-09-04
