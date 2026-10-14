'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { checkPagesSource } = require('../scripts/check-pages-source');

const credentials = { repository: 'owner/Parking-Aero-WebApp', token: 'test-token' };

test('Pages preflight accepts the Actions source using a read-only authenticated request', async () => {
  const pages = { build_type: 'workflow', source: { branch: 'main', path: '/' } };
  const result = await checkPagesSource({ ...credentials, request: async (url, options) => {
    assert.equal(options.method || 'GET', 'GET');
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    assert(options.signal instanceof AbortSignal);
    if (url.endsWith('/pages')) return Response.json(pages);
    assert.equal(url, 'https://api.github.com/repos/owner/Parking-Aero-WebApp/actions/runs?event=dynamic&per_page=100&page=1');
    return Response.json({ workflow_runs: [{ path: 'dynamic/pages/pages-build-deployment', status: 'completed' }] });
  } });
  assert.deepEqual(result, pages);
});

test('Pages preflight rejects every unfinished legacy deployment even after the source was switched', async () => {
  for (const status of ['queued', 'in_progress', 'waiting', 'pending', 'requested']) {
    await assert.rejects(checkPagesSource({ ...credentials, request: async url => Response.json(url.endsWith('/pages') ?
      { build_type: 'workflow' } : { workflow_runs: [{ id: 123, path: 'dynamic/pages/pages-build-deployment', status }] }) }),
    new RegExp(`Legacy Pages run 123 is still ${status}`));
  }
});

test('Pages preflight also checks older runs beyond the first page', async () => {
  await assert.rejects(checkPagesSource({ ...credentials, request: async url => {
    if (url.endsWith('/pages')) return Response.json({ build_type: 'workflow' });
    return Response.json({ workflow_runs: url.endsWith('page=1') ?
      Array.from({ length: 100 }, () => ({ path: 'dynamic/pages/pages-build-deployment', status: 'completed' })) :
      [{ id: 456, path: 'dynamic/pages/pages-build-deployment', status: 'queued' }] });
  } }), /Legacy Pages run 456 is still queued/);
});

test('Pages preflight fails closed when the legacy run check fails', async () => {
  for (const response of [new Response('', { status: 403 }), Response.json({})]) {
    await assert.rejects(checkPagesSource({ ...credentials, request: async url => url.endsWith('/pages') ?
      Response.json({ build_type: 'workflow' }) : response }), /Cannot check legacy Pages runs|workflow_runs is missing/);
  }
});

test('Pages preflight rejects the legacy branch source that publishes the README', async () => {
  for (const build_type of ['legacy', undefined]) {
    await assert.rejects(checkPagesSource({ ...credentials, request: async () => Response.json({ build_type }) }),
      /Source > GitHub Actions.*legacy.*public\/index\.html/);
  }
});

test('Pages preflight fails closed when configuration cannot be read', async () => {
  for (const status of [403, 404, 500]) {
    await assert.rejects(checkPagesSource({ ...credentials, request: async () => new Response('', { status }) }),
      new RegExp(`HTTP ${status}`));
  }
  await assert.rejects(checkPagesSource({ ...credentials, request: async () => { throw new Error('Network unavailable'); } }), /Network unavailable/);
  await assert.rejects(checkPagesSource({ ...credentials, request: async () => new Response('invalid JSON') }), SyntaxError);
});

test('Pages preflight rejects missing credentials before issuing a request', async () => {
  for (const inputs of [{}, { repository: credentials.repository }, { token: credentials.token }]) {
    await assert.rejects(checkPagesSource({ ...inputs, request: () => assert.fail('Unexpected request') }), /GITHUB_REPOSITORY and GH_TOKEN/);
  }
});
