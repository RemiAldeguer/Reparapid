import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

// Exercise the browser API module with controlled responses. No server, real
// cookies, credentials, or private workshop data are needed for these races.
const source = readFileSync(new URL('../src/api.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS}}).outputText;
const session = csrfToken => ({user: {email: 'synthetic-admin@example.invalid', role: 'admin'}, csrfToken, expiresAt: 2000000000000});
const isAbort = error => error instanceof DOMException && error.name === 'AbortError';

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => {resolve = yes; reject = no;});
  return {promise, resolve, reject};
}

function fixture() {
  const module = {exports: {}}, window = new EventTarget(), calls = [];
  let expired = 0;
  window.addEventListener('clinique:expired', () => expired++);
  const fetch = (url, options) => {
    const pending = deferred(); calls.push({url, options, ...pending}); return pending.promise;
  };
  new Function('module', 'exports', 'window', 'fetch', compiled)(module, module.exports, window, fetch);
  const api = module.exports;
  function reply(index, status, data = {ok: true}) {calls[index].resolve(Response.json(data, {status}));}
  async function verifyCsrf(expected) {
    const index = calls.length, request = api.api('/api/store', {method: 'PUT', body: {revision: 0, data: 'synthetic'}});
    assert.equal(calls[index].options.headers['X-CSRF-Token'], expected);
    reply(index, 200); await request;
  }
  return {api, calls, reply, verifyCsrf, expired: () => expired};
}

test('A late 401 from an old session cannot expire a newly accepted session or erase its CSRF', async () => {
  const f = fixture(); f.api.setSession(session('synthetic-old'));
  const pending = f.api.api('/api/admin/client-access/synthetic-client');
  const rejected = assert.rejects(pending, isAbort);
  f.api.setSession(null); f.api.setSession(session('synthetic-new'));
  f.reply(0, 401, {error: 'The old session expired'}); await rejected;
  assert.equal(f.expired(), 0);
  await f.verifyCsrf('synthetic-new');
});

for (const route of ['/api/store', '/api/auth/me']) {
  test(`A late successful ${route} response cannot populate a replacement session`, async () => {
    const f = fixture(); f.api.setSession(session('synthetic-old'));
    const pending = f.api.api(route), rejected = assert.rejects(pending, isAbort);
    const body = deferred();
    f.calls[0].resolve({ok: true, status: 200, headers: new Headers({'Content-Type': 'application/json'}), json: () => body.promise});
    await Promise.resolve(); // Response headers arrived; body parsing is still pending.
    f.api.setSession(null); f.api.setSession(session('synthetic-new'));
    body.resolve({syntheticPrivateStore: 'old-session-only'}); await rejected;
    assert.equal(f.expired(), 0);
    await f.verifyCsrf('synthetic-new');
  });
}

test('Revalidating the same session token keeps a pending request valid', async () => {
  const f = fixture(), current = session('synthetic-current'); f.api.setSession(current);
  const pending = f.api.api('/api/store');
  f.api.setSession({...current, expiresAt: current.expiresAt + 1000, user: {...current.user}});
  f.reply(0, 200, {revision: 7, synthetic: true});
  assert.deepEqual(await pending, {revision: 7, synthetic: true});
  assert.equal(f.expired(), 0); await f.verifyCsrf('synthetic-current');
});

test('A current private API 401 still expires its session and clears the CSRF token', async () => {
  const f = fixture(); f.api.setSession(session('synthetic-current'));
  const pending = f.api.api('/api/store');
  const rejected = assert.rejects(pending, error => error instanceof f.api.ApiError && error.status === 401);
  f.reply(0, 401, {error: 'The current session expired'}); await rejected;
  assert.equal(f.expired(), 1); await f.verifyCsrf(undefined);
});

test('Authentication checks leave their current 401 handling to the gate', async () => {
  const f = fixture(); f.api.setSession(session('synthetic-current'));
  const pending = f.api.api('/api/auth/me');
  const rejected = assert.rejects(pending, error => error instanceof f.api.ApiError && error.status === 401);
  f.reply(0, 401, {error: 'Authentication required'}); await rejected;
  assert.equal(f.expired(), 0); await f.verifyCsrf('synthetic-current');
});

test('An aborted caller ignores a late 401 even if the transport already returned it', async () => {
  const f = fixture(), controller = new AbortController(); f.api.setSession(session('synthetic-current'));
  const pending = f.api.api('/api/store', {signal: controller.signal}), rejected = assert.rejects(pending, isAbort);
  controller.abort(); assert.equal(f.calls[0].options.signal.aborted, true);
  f.reply(0, 401, {error: 'An abandoned request'}); await rejected;
  assert.equal(f.expired(), 0); await f.verifyCsrf('synthetic-current');
});

test('A submitted write is never retried when its session ends; the next session can reload the saved revision', async () => {
  const f = fixture(); f.api.setSession(session('synthetic-old'));
  const pending = f.api.api('/api/store', {method: 'PUT', body: {revision: 7, data: {synthetic: true}}});
  const rejected = assert.rejects(pending, isAbort);
  assert.equal(f.calls.length, 1); assert.equal(f.calls[0].options.method, 'PUT');
  assert.deepEqual(JSON.parse(f.calls[0].options.body), {revision: 7, data: {synthetic: true}});
  f.api.setSession(null); f.api.setSession(session('synthetic-new'));
  f.reply(0, 200, {revision: 8}); await rejected;
  assert.equal(f.calls.length, 1, 'an uncertain submitted write must not be resubmitted');
  const reload = f.api.api('/api/store'); assert.equal(f.calls[1].options.method, 'GET');
  f.reply(1, 200, {revision: 8}); assert.deepEqual(await reload, {revision: 8});
  assert.equal(f.expired(), 0);
});

test('A successful logout may confirm after local clearing without clearing a newer session', async () => {
  const f = fixture(); f.api.setSession(session('synthetic-old'));
  const pending = f.api.api('/api/auth/logout', {method: 'POST'});
  assert.equal(f.calls[0].options.headers['X-CSRF-Token'], 'synthetic-old');
  assert.equal(f.calls[0].options.keepalive, true, 'revocation may finish if navigation removes the private view');
  f.api.setSession(null); f.api.setSession(session('synthetic-new'));
  f.reply(0, 200); assert.deepEqual(await pending, {ok: true});
  assert.equal(f.expired(), 0); await f.verifyCsrf('synthetic-new');
});

for(const status of [401,503])test(`A logout ${status} outcome stays available without expiring a replacement session`, async () => {
  const f = fixture(); f.api.setSession(session('synthetic-old'));
  const pending = f.api.api('/api/auth/logout', {method: 'POST'}), rejected = assert.rejects(pending, error => error instanceof f.api.ApiError && error.status === status && error.message === 'Synthetic logout outcome');
  f.api.setSession(null); f.api.setSession(session('synthetic-new'));
  f.reply(0, status, {error: 'Synthetic logout outcome'}); await rejected;
  assert.equal(f.expired(), 0); await f.verifyCsrf('synthetic-new');
});

test('Invoice source reads carry the captured session CSRF even though their method is GET', async () => {
  const f = fixture(); f.api.setSession(session('synthetic-invoice-session'));
  const pending = f.api.api('/api/admin/invoice-source');
  assert.equal(f.calls[0].options.method, 'GET');
  assert.equal(f.calls[0].options.headers['X-CSRF-Token'], 'synthetic-invoice-session');
  assert.equal(f.calls[0].options.body, undefined);
  f.reply(0, 200, {revision: 7});
  assert.deepEqual(await pending, {revision: 7});
});

test('A changed invoice session closes the private view instead of leaving its previous billing draft visible', async () => {
  const f = fixture(); f.api.setSession(session('synthetic-invoice-session'));
  const pending = f.api.api('/api/admin/invoice-source');
  const rejected = assert.rejects(pending, error => error instanceof f.api.ApiError && error.status === 403);
  f.reply(0, 403, {error: 'Invoice session changed'}); await rejected;
  assert.equal(f.expired(), 1);
  const request = f.api.api('/api/auth/me');
  assert.equal(f.calls[1].options.headers['X-CSRF-Token'], undefined);
  f.reply(1, 200, session('synthetic-next')); await request;
});

test('A late invoice source rejection from another session cannot close a newly opened workshop', async () => {
  const f = fixture(); f.api.setSession(session('synthetic-old'));
  const pending = f.api.api('/api/admin/invoice-source');
  const rejected = assert.rejects(pending, isAbort);
  f.api.setSession(session('synthetic-new'));
  f.reply(0, 403, {error: 'Old invoice session'}); await rejected;
  assert.equal(f.expired(), 0); await f.verifyCsrf('synthetic-new');
});
