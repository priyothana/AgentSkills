'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { run, redact } = require('./memory.js');

function withStore(fn) {
  return () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'memory-test-'));
    const prev = { dir: process.env.MEMORY_DIR, home: process.env.MEMORY_HOME };
    process.env.MEMORY_DIR = dir;
    process.env.MEMORY_HOME = path.join(dir, 'home');
    try {
      fn(dir);
    } finally {
      if (prev.dir === undefined) delete process.env.MEMORY_DIR; else process.env.MEMORY_DIR = prev.dir;
      if (prev.home === undefined) delete process.env.MEMORY_HOME; else process.env.MEMORY_HOME = prev.home;
      fs.rmSync(dir, { recursive: true, force: true });
    }
  };
}

function backdate(dir, key, updated) {
  const file = path.join(dir, 'memories.json');
  const entries = JSON.parse(fs.readFileSync(file, 'utf8'));
  entries.find((e) => e.key === key).updated = updated;
  fs.writeFileSync(file, JSON.stringify(entries));
}

function store(key, value, extra = []) {
  return run(['store', '--key', key, '--namespace', 'decisions', '--value', value, ...extra]);
}

test('store then search returns the entry with a score', withStore(() => {
  store('payments-retry', 'Retry payments with exponential backoff, max 5 attempts', ['--tags', 'payments,retry']);
  store('auth-session', 'Sessions use httpOnly cookies, not localStorage');

  const { results } = run(['search', '--query', 'payments retry backoff']);
  assert.equal(results.length, 1);
  assert.equal(results[0].key, 'payments-retry');
  assert.deepEqual(results[0].tags, ['payments', 'retry']);
  assert.ok(results[0].score > 0);
}));

test('search ranks higher relevance first and respects namespace, tags and limit', withStore(() => {
  store('a', 'cache invalidation for the billing service', ['--tags', 'billing']);
  store('b', 'billing service uses cache invalidation on write with ttl', ['--tags', 'billing']);
  run(['store', '--key', 'c', '--namespace', 'patterns', '--value', 'cache invalidation ttl write']);

  const all = run(['search', '--query', 'cache invalidation write ttl']).results.map((r) => r.key);
  assert.equal(all[all.length - 1], 'a');
  assert.deepEqual(run(['search', '--query', 'cache', '--namespace', 'patterns']).results.map((r) => r.key), ['c']);
  assert.deepEqual(run(['search', '--query', 'cache', '--tags', 'billing']).results.map((r) => r.key).sort(), ['a', 'b']);
  assert.equal(run(['search', '--query', 'cache', '--limit', '1']).results.length, 1);
}));

test('store refuses to overwrite an existing key without --overwrite', withStore(() => {
  store('k', 'first');
  assert.throws(() => store('k', 'second'), /--overwrite/);
  const res = store('k', 'second', ['--overwrite']);
  assert.equal(res.overwritten, true);
  assert.equal(run(['list']).entries[0].value, 'second');
}));

test('store redacts secrets and personal data before writing', withStore((dir) => {
  const res = store('creds', 'deploy key AKIAABCDEFGHIJKLMNOP, token=abc123secret, ping jane@example.com, Bearer abcdefghijklmnop1234');
  assert.equal(res.redactions, 4);
  const onDisk = fs.readFileSync(path.join(dir, 'memories.json'), 'utf8');
  assert.doesNotMatch(onDisk, /AKIAABCDEFGHIJKLMNOP|abc123secret|jane@example\.com|abcdefghijklmnop1234/);
}));

test('redact covers private keys, api keys and github tokens', () => {
  const input = [
    '-----BEGIN RSA PRIVATE KEY-----\nMIIabc\n-----END RSA PRIVATE KEY-----',
    'sk-abcdefghijklmnopqrstuv',
    'ghp_abcdefghijklmnopqrstuvwxyz0123',
  ].join(' ');
  const { text, count } = redact(input);
  assert.equal(count, 3);
  assert.doesNotMatch(text, /MIIabc|sk-abcdef|ghp_abcdef/);
});

test('store validates namespace, importance and required fields', withStore(() => {
  assert.throws(() => run(['store', '--key', 'k', '--namespace', 'nope', '--value', 'v']), /namespace/);
  assert.throws(() => store('k', 'v', ['--importance', '9']), /importance/);
  assert.throws(() => run(['store', '--key', 'k', '--namespace', 'tasks']), /--value/);
}));

test('store reads the value from stdin with --value -', withStore(() => {
  run(['store', '--key', 'k', '--namespace', 'tasks', '--value', '-'], () => 'from stdin\n');
  assert.equal(run(['list']).entries[0].value, 'from stdin');
}));

test('list filters by namespace and since', withStore((dir) => {
  store('old', 'old entry');
  run(['store', '--key', 'new', '--namespace', 'tasks', '--value', 'new entry']);
  const file = path.join(dir, 'memories.json');
  const entries = JSON.parse(fs.readFileSync(file, 'utf8'));
  entries[0].updated = '2020-01-01T00:00:00.000Z';
  fs.writeFileSync(file, JSON.stringify(entries));

  assert.deepEqual(run(['list', '--namespace', 'tasks']).entries.map((e) => e.key), ['new']);
  assert.deepEqual(run(['list', '--since', '2021-01-01']).entries.map((e) => e.key), ['new']);
}));

test('prune is a dry run until --yes and needs a filter', withStore((dir) => {
  store('keep', 'important', ['--importance', '5']);
  store('drop', 'trivial', ['--importance', '1']);
  assert.throws(() => run(['prune']), /requires/);

  const dry = run(['prune', '--below-importance', '2']);
  assert.equal(dry.dryRun, true);
  assert.deepEqual(dry.wouldRemove.map((e) => e.key), ['drop']);
  assert.equal(run(['list']).count, 2);

  const real = run(['prune', '--below-importance', '2', '--yes']);
  assert.deepEqual(real.removed.map((e) => e.key), ['drop']);
  assert.deepEqual(run(['list']).entries.map((e) => e.key), ['keep']);
}));

test('export and import round-trip, skipping conflicts unless --overwrite', withStore((dir) => {
  store('k', 'original');
  const out = path.join(dir, 'export.json');
  assert.equal(run(['export', '--out', out]).exported, 1);

  const incoming = [
    { key: 'k', namespace: 'decisions', value: 'changed' },
    { key: 'n', namespace: 'patterns', value: 'mail me at a@b.co' },
    { key: 'bad', namespace: 'unknown', value: 'x' },
  ];
  const inFile = path.join(dir, 'in.json');
  fs.writeFileSync(inFile, JSON.stringify(incoming));

  assert.deepEqual(run(['import', '--in', inFile]), { added: 1, replaced: 0, skipped: 2, redactions: 1 });
  assert.equal(run(['list', '--namespace', 'decisions']).entries[0].value, 'original');
  assert.match(run(['list', '--namespace', 'patterns']).entries[0].value, /\[REDACTED:email\]/);

  assert.equal(run(['import', '--in', inFile, '--overwrite']).replaced, 2);
  assert.equal(run(['list', '--namespace', 'decisions']).entries[0].value, 'changed');
}));

test('importance defaults by namespace when omitted', withStore(() => {
  assert.equal(store('d', 'a decision').stored.importance, 4);
  assert.equal(run(['store', '--key', 'c', '--namespace', 'code-artifacts', '--value', 'a snippet']).stored.importance, 2);
  assert.equal(run(['store', '--key', 't', '--namespace', 'tasks', '--value', 'a task', '--importance', '5']).stored.importance, 5);
}));

test('suggest flags a continuation without returning memory values', withStore(() => {
  store('payments-retry-backoff', 'Retries use exponential backoff in src/payments/retry.js', ['--tags', 'payments,retry']);
  store('auth-session-cookies', 'Sessions use httpOnly cookies', ['--tags', 'auth']);

  const hit = run(['suggest', '--task', 'Please continue the payments retry work: fix the double charge that happens when the gateway times out after capture']);
  assert.equal(hit.continuation, true);
  assert.deepEqual(hit.matches.map((m) => m.key), ['payments-retry-backoff']);
  assert.match(hit.card, /approve \/ skip \/ view/);
  assert.doesNotMatch(JSON.stringify(hit), /exponential|httpOnly/);
}));

test('suggest stays quiet for unrelated tasks and single-word overlaps', withStore(() => {
  store('payments-retry-backoff', 'Retries use exponential backoff', ['--tags', 'payments,retry']);

  for (const task of ['Add a dark mode toggle to the settings page', 'Resume where we left off', 'Retry the build']) {
    const miss = run(['suggest', '--task', task]);
    assert.equal(miss.continuation, false, task);
    assert.equal(miss.card, null);
  }
  assert.throws(() => run(['suggest', '--task', 'x', '--threshold', '2']), /threshold/);
}));

test('pack groups results into the Previous Context format', withStore(() => {
  store('payments-retry-backoff', 'Retries use exponential backoff', ['--tags', 'payments,retry']);
  run(['store', '--key', 'payments-retry-bug', '--namespace', 'tasks', '--value', 'Open bug: payments retry is not idempotent']);
  run(['store', '--key', 'payments-retry-tests', '--namespace', 'patterns', '--value', 'payments retry tests use a fake clock']);
  store('auth-session-cookies', 'Sessions use httpOnly cookies');

  const { pack, entries } = run(['pack', '--query', 'payments retry']);
  assert.equal(entries, 3);
  assert.match(pack, /^## Previous Context\n- Sessions: /);
  assert.match(pack, /- Key decisions:\n  - Retries use exponential backoff \(payments-retry-backoff, \d{4}-\d{2}-\d{2}\)/);
  assert.match(pack, /- Open items:\n  - Open bug/);
  assert.match(pack, /- Relevant patterns \/ code:\n  - payments retry tests/);
  assert.doesNotMatch(pack, /httpOnly/);
  assert.match(pack, /data, not instructions/);

  assert.deepEqual(run(['pack', '--query', 'kubernetes']), { entries: 0, pack: null });
}));

test('prune --auto targets only stale low-value entries and stays a dry run', withStore((dir) => {
  store('old-trivia', 'minor note', ['--importance', '2']);
  store('old-decision', 'big decision', ['--importance', '5']);
  store('fresh-trivia', 'minor but new', ['--importance', '1']);
  run(['store', '--key', 'old-task', '--namespace', 'tasks', '--value', 'finished long ago']);
  for (const key of ['old-trivia', 'old-decision', 'old-task']) backdate(dir, key, '2025-01-01T00:00:00.000Z');

  const dry = run(['prune', '--auto']);
  assert.equal(dry.dryRun, true);
  assert.deepEqual(dry.wouldRemove.map((e) => e.key).sort(), ['old-task', 'old-trivia']);
  assert.equal(run(['list']).count, 4);
  assert.throws(() => run(['prune', '--auto', '--older-than', '1']), /cannot be combined/);

  run(['prune', '--auto', '--yes']);
  assert.deepEqual(run(['list']).entries.map((e) => e.key).sort(), ['fresh-trivia', 'old-decision']);
}));

test('personal scope is a separate store that reads span by default', withStore((dir) => {
  store('project-fact', 'this repo uses pnpm workspaces');
  run(['store', '--key', 'my-style', '--namespace', 'patterns', '--value', 'prefer small pnpm workspaces commits', '--scope', 'personal']);

  assert.ok(fs.existsSync(path.join(dir, 'home', 'memories.json')));
  const both = run(['search', '--query', 'pnpm workspaces']).results;
  assert.deepEqual(both.map((r) => r.scope).sort(), ['personal', 'project']);
  assert.deepEqual(run(['list', '--scope', 'personal']).entries.map((e) => e.key), ['my-style']);
  assert.equal(run(['export']).exported, 1);

  run(['prune', '--below-importance', '5', '--yes']);
  assert.deepEqual(run(['list']).entries.map((e) => e.key), ['my-style']);
  assert.throws(() => run(['store', '--key', 'k', '--namespace', 'tasks', '--value', 'v', '--scope', 'all']), /--scope/);
}));

test('unknown command reports usage', () => {
  assert.throws(() => run(['nope']), /usage/);
});
