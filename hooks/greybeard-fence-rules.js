'use strict';
// greybeard — the fence: which tool calls the agent may not make alone.
//
// Three verdicts. `deny` is for things with no recovery path: the work is
// gone, or it is gone from a machine you cannot reach. `ask` is for things
// that are fine when a human meant them and expensive when an agent guessed.
// Everything else is allowed and this file never sees it again.
//
// Rules are data. Adding one is a line here and a test in tests/fence.test.js.

const DEFAULTS = {
  // Hosts the agent may not reach. Globs, matched against the ssh/scp target.
  prodHosts: ['*prod*', '*production*', '*.live.*'],
  // Branches whose history is not the agent's to rewrite.
  protectedBranches: ['main', 'master', 'release', 'release/*'],
  // Rule ids downgraded to allow, for a project that genuinely needs one.
  allow: [],
};

// --- shell splitting -------------------------------------------------------

// Split a command line into the pieces that each run on their own. Quotes are
// respected so a `;` inside a commit message is not a new command. greybeard:
// this is deliberately not a shell parser. It is a seatbelt, not a prison —
// see the limits section in SECURITY-NET.md.
function splitSegments(command) {
  const out = [];
  let buf = '';
  let quote = null;
  const src = String(command || '');
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quote) {
      if (c === quote) quote = null;
      buf += c;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      buf += c;
      continue;
    }
    if (c === '\\' && src[i + 1] === '\n') {
      i++;
      buf += ' ';
      continue;
    }
    if (c === ';' || c === '\n' || c === '|' || c === '&') {
      if (buf.trim()) out.push(buf.trim());
      buf = '';
      continue;
    }
    buf += c;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

function norm(s) {
  return String(s || '').replace(/\s+/g, ' ').trim();
}

function globToRegex(pattern) {
  const re = String(pattern)
    .split('*')
    .map((p) => p.replace(/[.+^${}()|[\]\\?]/g, '\\$&'))
    .join('.*');
  return new RegExp('^' + re + '$', 'i');
}

function globMatch(patterns, value) {
  return (patterns || []).some((p) => globToRegex(p).test(String(value || '')));
}

// --- git -------------------------------------------------------------------

// Pull the subcommand out of a git invocation, skipping the global options
// that can sit in front of it (`git -C /repo --no-pager push ...`).
function parseGit(segment) {
  const parts = norm(segment).split(' ');
  let i = 0;
  while (i < parts.length && parts[i] === 'sudo') i++;
  if (parts[i] !== 'git') return null;
  i++;
  while (i < parts.length && parts[i].startsWith('-')) {
    // -C and -c take a value
    if (parts[i] === '-C' || parts[i] === '-c') i++;
    i++;
  }
  const sub = parts[i] || '';
  const args = parts.slice(i + 1);
  return { sub, args, rest: args.join(' ') };
}

function hasFlag(args, ...flags) {
  return args.some((a) => flags.includes(a) || flags.some((f) => f.length > 2 && a.startsWith(f + '=')));
}

// Short flags cluster: -fd is -f and -d.
function hasShort(args, letter) {
  return args.some((a) => /^-[a-z]+$/i.test(a) && !a.startsWith('--') && a.slice(1).includes(letter));
}

const GIT_RULES = [
  {
    id: 'git.push-force',
    decision: 'deny',
    when: (g) => g.sub === 'push' && (hasFlag(g.args, '--force') || hasShort(g.args, 'f')),
    why: 'force push overwrites history on the remote, including commits you have never seen',
    instead: 'git push --force-with-lease, which this fence will ask you about instead of refusing',
  },
  {
    id: 'git.push-delete',
    decision: 'deny',
    when: (g) => g.sub === 'push' && (hasFlag(g.args, '--delete') || /(^|\s):[^\s]/.test(' ' + g.rest)),
    why: 'deleting a remote branch takes it from everyone, and the reflog that would undo it is local',
    instead: 'delete it yourself once you have looked at what is on it',
  },
  {
    id: 'git.history-rewrite',
    decision: 'deny',
    when: (g) => g.sub === 'filter-branch' || g.sub === 'filter-repo',
    why: 'rewrites every commit; every open branch and clone is invalidated at once',
    instead: 'do this by hand, on a clone, with the team told first',
  },
  {
    id: 'git.drop-reflog',
    decision: 'deny',
    when: (g) =>
      (g.sub === 'reflog' && g.args[0] === 'expire') ||
      (g.sub === 'gc' && (hasFlag(g.args, '--prune') || hasFlag(g.args, '--aggressive'))),
    why: 'the reflog is what undoes every other mistake on this list',
    instead: 'nothing. If the repository is genuinely too big, that is a human job',
  },
  {
    id: 'git.update-ref-delete',
    decision: 'deny',
    when: (g) => g.sub === 'update-ref' && hasFlag(g.args, '-d'),
    why: 'deletes a ref without touching the reflog of the branch it pointed at',
    instead: 'git branch -d, which refuses when the work is unmerged',
  },
  {
    id: 'git.clean-ignored',
    decision: 'deny',
    when: (g) => g.sub === 'clean' && (hasShort(g.args, 'x') || hasShort(g.args, 'X')),
    why: 'removes ignored files too: .env, local config, credentials, build caches nobody can regenerate',
    instead: 'git clean -fd, which leaves ignored files alone',
  },
  {
    id: 'git.no-verify',
    decision: 'deny',
    when: (g) => (g.sub === 'commit' || g.sub === 'push') && hasFlag(g.args, '--no-verify'),
    why: 'skips the hooks the team put there on purpose',
    instead: 'fix what the hook is complaining about, or say out loud why it should be skipped',
  },
  {
    id: 'git.rebase',
    decision: 'ask',
    when: (g) => g.sub === 'rebase' && !hasFlag(g.args, '--abort', '--continue', '--skip'),
    why: 'rewrites local history; anything already pushed will need a force push afterwards',
  },
  {
    id: 'git.amend',
    decision: 'ask',
    when: (g) => g.sub === 'commit' && hasFlag(g.args, '--amend'),
    why: 'replaces the last commit; if it was pushed, the two histories have now diverged',
  },
  {
    id: 'git.reset-hard',
    decision: 'ask',
    when: (g) => g.sub === 'reset' && hasFlag(g.args, '--hard'),
    why: 'throws away every uncommitted change in the working tree, including ones you made',
  },
  {
    id: 'git.branch-delete',
    decision: 'ask',
    when: (g) => g.sub === 'branch' && hasFlag(g.args, '-D', '--delete'),
    why: 'deletes a branch; with -D it does so even when the work is unmerged',
  },
  {
    id: 'git.tag-move',
    decision: 'ask',
    when: (g) => g.sub === 'tag' && (hasFlag(g.args, '-d', '--delete') || hasShort(g.args, 'f')),
    why: 'a moved or deleted tag means two people build different code from the same version number',
  },
  {
    id: 'git.stash-drop',
    decision: 'ask',
    when: (g) => g.sub === 'stash' && ['drop', 'clear', 'pop'].includes(g.args[0]),
    why: 'a dropped stash is not in the reflog and not on a branch',
  },
  {
    id: 'git.discard-worktree',
    decision: 'ask',
    when: (g) =>
      (g.sub === 'checkout' && /(^|\s)(--\s+)?\.(\s|$)/.test(' ' + g.rest)) ||
      (g.sub === 'restore' && /(^|\s)\.(\s|$)/.test(' ' + g.rest)),
    why: 'discards uncommitted work in the whole tree, with no reflog entry',
  },
  {
    id: 'git.force-with-lease',
    decision: 'ask',
    when: (g) => g.sub === 'push' && hasFlag(g.args, '--force-with-lease'),
    why: 'safer than --force, but still replaces what is on the remote',
  },
  {
    id: 'git.config-global',
    decision: 'ask',
    when: (g) => g.sub === 'config' && hasFlag(g.args, '--global', '--system'),
    why: 'changes settings for every repository on this machine, not just this one',
  },
  {
    id: 'git.hooks-path',
    decision: 'deny',
    when: (g) => g.sub === 'config' && g.rest.includes('core.hooksPath'),
    why: 'repointing core.hooksPath disables the repository hooks, which is the fence going out the window',
  },
];

// Branch-aware: a protected branch turns an `ask` into a `deny`.
function touchesProtectedBranch(g, config) {
  if (!g) return false;
  const branches = config.protectedBranches || [];
  return g.args.some((a) => !a.startsWith('-') && globMatch(branches, a.replace(/^.*:/, '')));
}

// --- everything that is not git -------------------------------------------

const COMMAND_RULES = [
  {
    id: 'prod.ssh',
    decision: 'deny',
    when: (seg, config) => {
      const m = /^(?:sudo\s+)?(?:ssh|scp|rsync)\s+([^\s]+)/i.exec(seg);
      if (!m) return false;
      const target = m[1].replace(/^.*@/, '').replace(/:.*$/, '');
      return globMatch(config.prodHosts, target);
    },
    why: 'this host is on the production list, and a shell there is outside anything this session can undo',
    instead: 'say what you need run and let a human run it, or name a staging host',
  },
  {
    id: 'prod.kubectl-delete',
    decision: 'deny',
    when: (seg) => /^(?:sudo\s+)?kubectl\b/i.test(seg) && /\bdelete\b/.test(seg) && /--all\b|\bns\b|\bnamespace\b/.test(seg),
    why: 'a namespace-wide delete takes things that were never in any manifest',
    instead: 'delete one named resource, or apply the manifests and let the diff do it',
  },
  {
    id: 'prod.kubectl-write',
    decision: 'ask',
    when: (seg) => /^(?:sudo\s+)?kubectl\b/i.test(seg) && /\b(apply|delete|scale|patch|edit|drain|cordon|rollout)\b/.test(seg),
    why: 'this changes what is running in a cluster other people are using',
  },
  {
    id: 'infra.terraform-destroy',
    decision: 'deny',
    when: (seg) => /^(?:sudo\s+)?terraform\b/i.test(seg) && /\bdestroy\b/.test(seg),
    why: 'terraform destroy removes the infrastructure, not the code that described it',
    instead: 'terraform plan -destroy, and read it',
  },
  {
    id: 'infra.apply',
    decision: 'ask',
    when: (seg) =>
      (/^(?:sudo\s+)?terraform\b/i.test(seg) && /\bapply\b/.test(seg)) ||
      (/^(?:sudo\s+)?helm\b/i.test(seg) && /\b(upgrade|install|uninstall|rollback)\b/.test(seg)),
    why: 'this changes real infrastructure, and the plan is the only thing that said what it would change',
  },
  {
    id: 'infra.service-stop',
    decision: 'ask',
    when: (seg) => /^(?:sudo\s+)?(systemctl|service)\b/i.test(seg) && /\b(stop|restart|disable|mask)\b/.test(seg),
    why: 'stopping a service is instant and the people who notice are not in this session',
  },
  {
    id: 'deploy.ship',
    decision: 'ask',
    when: (seg) =>
      /\b(fly|vercel|netlify|heroku|eb|gcloud|serverless)\s+deploy\b/i.test(seg) ||
      /\bvercel\b.*--prod\b/i.test(seg) ||
      /^(?:sudo\s+)?(make|npm run|yarn|pnpm run|just)\s+(deploy|release|publish|ship)\b/i.test(seg) ||
      /^\.\/(deploy|release|ship)(\.sh)?\b/i.test(seg),
    why: 'a deploy is the one command whose blast radius is customers',
  },
  {
    id: 'data.drop',
    decision: 'deny',
    when: (seg) => /\b(drop\s+(database|schema|table)|truncate\s+table|flushall|flushdb)\b/i.test(seg),
    why: 'the data is gone at the moment the statement returns, and the backup is someone else\'s problem by then',
    instead: 'write the statement into a migration, where it is reviewed and reversible',
  },
  {
    id: 'data.remote-psql',
    decision: 'ask',
    when: (seg) => {
      if (!/^(?:sudo\s+)?(psql|mysql|mongosh|redis-cli)\b/i.test(seg)) return false;
      // greybeard: capture the host and test it. A negative lookahead here
      // backtracks past its own guard — `-h localhost` matched, because \s*
      // is allowed to match nothing and look at the space instead.
      const m =
        /(?:-h|--host)[=\s]\s*([^\s]+)/i.exec(seg) ||
        /(?:postgres(?:ql)?|mysql|mongodb|redis):\/\/(?:[^@\s]*@)?([^\s:/]+)/i.exec(seg);
      if (!m) return false;
      return !/^(localhost|127\.0\.0\.1|::1|0\.0\.0\.0)$/i.test(m[1]);
    },
    why: 'this is a database that is not on this machine, and a read can still take a lock',
  },
  {
    id: 'net.pipe-to-shell',
    decision: 'deny',
    when: (seg, _c, full) => /\b(curl|wget)\b/i.test(full) && /\|\s*(sudo\s+)?(ba)?sh\b/i.test(full),
    why: 'this runs whatever the server returns today, which is not what you read yesterday',
    instead: 'download it, read it, then run it',
  },
  {
    id: 'secrets.exfiltrate',
    decision: 'deny',
    when: (seg, _c, full) =>
      /(\.env\b|id_rsa|id_ed25519|\.aws\/credentials|\.ssh\/|\.netrc|service-account.*\.json)/i.test(full) &&
      /\b(curl|wget|nc|scp|ssh)\b/i.test(full),
    why: 'a secret and a network call in the same command is how a credential leaves the machine',
    instead: 'name the secret you need and let a human hand it over',
  },
  {
    id: 'mail.client',
    decision: 'deny',
    when: (seg) =>
      /^(?:sudo\s+)?(sendmail|msmtp|mailx|mail|mutt|neomutt|thunderbird|swaks)\b/i.test(seg) ||
      /osascript.*\bMail\b/i.test(seg) ||
      /\bopen\s+-a\s+["']?Mail/i.test(seg),
    why: 'mail leaves the machine, cannot be recalled, and is sent under your name',
    instead: 'greybeard-approve request --action email.send --file <payload.json>, which shows you the message and a code before anything is sent',
  },
  {
    id: 'self.disable-fence',
    decision: 'deny',
    when: (seg, _c, full) =>
      /(greybeard-fence|greybeard-guard|hooks\.json|greybeard\.fence\.json|\.claude\/(settings|greybeard\.json|approvals)|\.greybeard-mode|\.git\/hooks)/i.test(full) &&
      /\b(rm|mv|cp|chmod|truncate|tee|sed\s+-i|>\s*)/i.test(full),
    why: 'this is the safety net removing itself, which is the one change it exists to stop',
    instead: 'edit it as a normal change, in a commit, that a human reviews',
  },
];

// Tools that write files. The fence protects itself and the obvious secrets.
const PATH_RULES = [
  {
    id: 'self.edit-fence',
    decision: 'deny',
    match: /(hooks\/greybeard-[^/]*\.js|hooks\/hooks\.json|greybeard\.fence\.json|\.claude\/(settings[^/]*\.json|greybeard\.json|approvals\/)|\.git\/hooks\/)/i,
    why: 'the safety net is not the agent\'s to edit while it is running',
    instead: 'propose the change in the conversation and let a human make it',
  },
  {
    id: 'secrets.write',
    decision: 'ask',
    match: /(^|\/)(\.env(\.|$)|\.netrc$|id_rsa|id_ed25519|credentials$)/i,
    why: 'writing here changes what every process on this machine authenticates as',
  },
];

// --- classification --------------------------------------------------------

const RANK = { allow: 0, ask: 1, deny: 2 };

function finding(rule, decision) {
  return { id: rule.id, decision: decision || rule.decision, why: rule.why, instead: rule.instead };
}

// Returns every rule that fires, strongest first. An empty array means the
// call is none of the fence's business.
function classify(toolName, input, config) {
  const cfg = Object.assign({}, DEFAULTS, config || {});
  const allow = new Set(cfg.allow || []);
  const hits = [];

  if (toolName === 'Bash') {
    const full = String((input && input.command) || '');
    for (const seg of splitSegments(full)) {
      const g = parseGit(seg);
      if (g) {
        for (const rule of GIT_RULES) {
          if (!rule.when(g, cfg)) continue;
          const escalate = rule.decision === 'ask' && touchesProtectedBranch(g, cfg);
          hits.push(finding(rule, escalate ? 'deny' : rule.decision));
        }
      }
      for (const rule of COMMAND_RULES) {
        if (rule.when(seg, cfg, full)) hits.push(finding(rule));
      }
    }
  }

  const paths = [];
  if (input) {
    if (input.file_path) paths.push(String(input.file_path));
    if (input.notebook_path) paths.push(String(input.notebook_path));
    if (Array.isArray(input.edits)) for (const e of input.edits) if (e && e.file_path) paths.push(String(e.file_path));
  }
  for (const p of paths) {
    const unix = p.replace(/\\/g, '/');
    for (const rule of PATH_RULES) if (rule.match.test(unix)) hits.push(finding(rule));
  }

  const seen = new Set();
  return hits
    .filter((h) => !allow.has(h.id) && !seen.has(h.id) && seen.add(h.id))
    .sort((a, b) => RANK[b.decision] - RANK[a.decision]);
}

module.exports = {
  DEFAULTS,
  GIT_RULES,
  COMMAND_RULES,
  PATH_RULES,
  splitSegments,
  parseGit,
  globMatch,
  classify,
};
