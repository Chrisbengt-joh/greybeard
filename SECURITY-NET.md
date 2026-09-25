# The fence and the gate

`greybeard-guard.js` tells the agent why the code is the way it is. This is the
part that stops the call.

Two pieces, and the second exists because of the first:

- **The fence** — `hooks/greybeard-fence.js`, a `PreToolUse` hook. Every Bash
  command and every file write is classified `deny`, `ask`, or nothing.
- **The gate** — `tools/greybeard-approve.js`. What the agent gets *instead* of
  the things the fence takes away: it can prepare the action, but only a human
  reading a dialog can complete it.

## Verdicts

`deny` is for calls with no recovery path — the work is gone, or it is gone
from a machine this session cannot reach. `ask` is for calls that are fine when
a human meant them and expensive when an agent guessed; it is the "keep me in
the loop" setting, not a refusal. Everything else never reaches the rules.

An `ask` rule escalates to `deny` when the command names a protected branch, so
`git rebase feature/x` asks and `git rebase main` does not.

## What is fenced

**Git history.** Denied: `push --force`, `push --delete` and `push origin
:branch`, `filter-branch`, `filter-repo`, `reflog expire`, `gc --prune`,
`update-ref -d`, `clean -fdx` (it takes `.env` with it), `--no-verify`, and
`config core.hooksPath` — that last one is the agent repointing the hooks away
from itself. Asked: `rebase`, `commit --amend`, `reset --hard`, `branch -D`,
`tag -f`/`-d`, `stash drop|clear|pop`, `checkout .`/`restore .`,
`push --force-with-lease`, and `config --global`.

`--force-with-lease` is deliberately only an `ask`. Denying the safe form and
the dangerous form equally teaches the agent that the fence is noise.

**Machines and infrastructure.** Denied: `ssh`/`scp`/`rsync` to a host matching
`prodHosts`, `terraform destroy`, namespace-wide `kubectl delete`, piping
`curl` into a shell, and any command holding both a secret path and a network
tool. Asked: `terraform apply`, `helm upgrade|uninstall`, `kubectl
apply|delete|scale|patch|drain|rollout`, `systemctl stop|restart|disable`,
deploys (`make deploy`, `fly deploy`, `vercel --prod`, `./deploy.sh`), and
databases on a host that is not this one.

**Data.** `DROP DATABASE|SCHEMA|TABLE`, `TRUNCATE`, `FLUSHALL` and `FLUSHDB`
are denied wherever they appear in a command.

**Itself.** Writes to `hooks/greybeard-*.js`, `hooks/hooks.json`,
`greybeard.fence.json`, `.claude/settings*.json` and `.git/hooks/` are denied,
and so is any `rm`, `mv`, `chmod`, `sed -i` or redirect aimed at them. The
fence also ignores greybeard mode: `/greybeard off` turns off the advice, not
the net. `GREYBEARD_FENCE=off` disables it, and it only exists in the
environment, where the agent is not the one writing.

## Configuration

`greybeard.fence.json`, found by walking up from the working directory the same
way `GREYBEARD.md` is:

```json
{
  "prodHosts": ["*.prod.example.com", "db-*.internal"],
  "protectedBranches": ["main", "release/*"],
  "allow": ["git.rebase"]
}
```

`allow` takes rule ids and is the only way to widen the fence — and the file is
itself covered by `self.edit-fence`, so widening it is a human's commit. Broken
JSON falls back to the defaults and says so in the reason, rather than failing
quietly in the permissive direction.

`"commitMemory": true` is read by the commit hook, not the fence: it lets this
repo commit its `GREYBEARD.md`. Anything but literal `true`, or broken JSON,
keeps the commit blocked.

## The gate

The fence denies `sendmail`, `msmtp`, `mail`, `mutt`, `swaks`, `osascript …
Mail` and `open -a Mail`, and points at this instead:

```
$ greybeard-approve request --action email.send --file payload.json
Approval requested: 9f3c1a2b
A dialog is on the user's screen with the full email.send payload and a
four-digit code. Ask the user for the code.
Then run: greybeard-approve confirm 9f3c1a2b <code>
```

The dialog shows the recipients, the subject and the body. The code is in the
dialog and nowhere else: not in the tool's output, not in the request file,
which stores a salted SHA-256. To get the code the agent has to ask the human,
and to answer, the human has to have read what is being sent. Approval and
review become the same act, which is the point — a confirmation prompt that can
be answered without reading is not a control.

Single use, five-minute expiry, three attempts before the request is burned,
constant-time comparison, and an append-only `audit.log` next to the requests.
The request is marked used *before* the transport runs, so a transport that
fails cannot leave a live approval behind for a quiet retry. With no transport
configured it exits non-zero and says so rather than reporting a send that
never happened.

The transport is a command in `~/.claude/greybeard.json`:

```json
{ "approve": { "email.send": "msmtp -t < {payload}" } }
```

Same shape works for anything else worth gating: `deploy.production`,
`slack.post`, `invoice.send`.

## Limits

This stops an agent that is wrong, confused, or pattern-matching a destructive
command from its training data. That is the failure that actually happens.

It does not stop an agent that is actively working around it, and nothing built
out of string matching would. A command can be base64-encoded, written to a
file and run, assembled from variables, or sent through a language runtime that
shells out. `splitSegments` respects quotes but is not a shell parser. On a
machine with a GUI, a shell can drive the GUI. The honest description is a
seatbelt: it makes the common accident survivable, and it is not a cage.

The one thing it does that is more than pattern matching is refuse to be edited
while it is running, which turns "disable the fence" from something an agent
can do mid-task into something that appears in a diff.

**PowerShell is a known hole.** The hook is registered for the `PowerShell`
tool, but the rules are written for sh syntax: `Remove-Item -Recurse`,
`Set-Content` on a hook file, `Invoke-WebRequest | iex` pass unclassified. On
Windows the fence covers file writes and `Bash`, not `PowerShell`. PowerShell
rules, with their own tests, are the next thing to do.

## Install

```
hooks/greybeard-fence.js         the hook
hooks/greybeard-fence-rules.js   the rules, as data
tools/greybeard-approve.js       the gate
tests/fence.test.js              32 tests
tests/approve.test.js             9 tests
hooks/hooks.json                 one PreToolUse block added
```

`npm test` runs all of it: 70 tests including the existing 29.

Adding a rule is a line in `greybeard-fence-rules.js` and a test. Keep the
`why` to one clause and name the consequence rather than the category — the
reason is what the human reads when the prompt appears, and "this is dangerous"
tells them nothing they did not already assume.
