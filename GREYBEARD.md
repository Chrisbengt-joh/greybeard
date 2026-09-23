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
- **If the convention changes:** All five hooks go silent. There is no
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
  every platform` in `tests/hooks.test.js` fails if a tool drops out. That
  test finds the guard's group by script name, not by position: there are
  three `PreToolUse` groups now: the commit scan first, the fence last.
- **Since:** 2026-09-04

## hooks/greybeard-fence-rules.js — PowerShell

- **What:** The fence is registered for `PowerShell`, but every shell rule is
  written for sh syntax. PowerShell commands pass unclassified.
- **Why:** Known hole, not an oversight. Rules for PowerShell need their own
  syntax (`Remove-Item`, `Set-Content`, `iex`) and their own tests; a
  half-done set would read as coverage. Documented in `SECURITY-NET.md`
  under Limits.
- **If forgotten:** On Windows, a destructive PowerShell command gets no
  fence at all, and the green test run says nothing about it. Next thing to
  do.
- **Since:** 2026-09-23

## hooks/greybeard-runtime.js — the mode flag

- **What:** The level lives in `~/.claude/greybeard-modes/<session_id>.mode`,
  one file per session, not in a single shared flag.
- **Why:** The shared `~/.claude/.greybeard-mode` was read by every window at
  once. `/greybeard off` in one project turned the PreToolUse guard off in
  every other open session — no message in those transcripts, so nobody saw
  it happen. Changed 2026-09-04.
- **If reverted to one file:** Silent cross-session disarming. The session
  that loses its guard is never the one that typed the command.
- **Also:** The session id comes from a hook payload and is used in a path,
  so `sessionKey` rejects anything but `[A-Za-z0-9_-]`; a rejected id falls
  back to the shared file rather than to a path of the payload's choosing.
  Stale flags are swept by age at startup (7 days) because nothing tells a
  hook that a window has closed.
- **Since:** 2026-09-04

## hooks/greybeard-commit-scan.js

- **What:** Reads `GREYBEARD.md` before a `git commit` and reports secrets
  and exposures. It reports once per version of the file, keyed by a sha256
  in `~/.claude/greybeard-scan.json`, and only sets `permissionDecision:
  ask` for secret-class hits.
- **Why:** The file is committed, so a bad entry is published, and in a
  public repo the history keeps it after any later deletion. Added
  2026-09-04.
- **If it warns on every commit instead:** People learn to ignore it, and an
  ignored scanner is worse than none — it reads as assurance. The
  once-per-version rule is what keeps it credible; do not remove it to
  "catch more".
- **Also:** It prints line numbers and pattern names, never the matched
  value, so the transcript does not become a second copy of the leak.
  Regexes catch the obvious shapes only. This is a net, not a guarantee.
- **Since:** 2026-09-04
