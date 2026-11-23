import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {legacyPages, legacyRedirects} from '../src/legacy-site-manifest.mjs';
import {publicAsset, publicPageRedirect} from '../server/public-assets.mjs';

const inventory = JSON.parse(await readFile(new URL('../docs/seo/anciens-slugs-2026-11-22.json', import.meta.url), 'utf8'));

test('every recovered HTML URL has an explicit working migration destination', () => {
  const urls = inventory.urls;
  assert.equal(urls.length, 170);
  assert.equal(new Set(urls.map(item => item.path)).size, urls.length);
  const html = urls.filter(item => item.type !== 'media_attachment');
  assert.equal(html.length, 31);
  assert.equal(html.filter(item => item.proposed_action === 'keep_200').length, 22);
  assert.equal(html.filter(item => item.proposed_action === 'redirect_308').length, 9);
  for (const item of html) {
    assert.equal(item.observed_initial_status, 200, item.path);
    assert.equal(item.observed_final_status, 200, item.path);
    assert.ok(item.source_urls.length > 0, item.path);
    const target = item.proposed_target_path;
    assert.ok(target?.startsWith('/') && !target.includes('#') && !target.includes('?'), item.path);
    assert.equal(publicPageRedirect(target), null, `Redirect chain: ${item.path}`);
    assert.equal(publicAsset(target)?.contentType, 'text/html; charset=utf-8', item.path);
    if (item.proposed_action === 'keep_200') {
      assert.equal(target, item.path);
      assert.equal(item.proposed_status, 200);
      assert.equal(publicPageRedirect(item.path), null);
      assert.ok(item.path === '/' || legacyPages.some(page => page.pathname === item.path));
    } else {
      assert.equal(item.proposed_status, 308);
      assert.equal(publicPageRedirect(item.path), target);
      assert.ok(legacyRedirects.some(redirect => redirect.from === item.path && redirect.to === target));
    }
  }
});

test('recovered image aliases remain explicitly pending rather than becoming unrelated service pages', () => {
  const media = inventory.urls.filter(item => item.type === 'media_attachment');
  assert.equal(media.length, 139);
  for (const item of media) {
    assert.equal(item.observed_initial_status, 301);
    assert.equal(item.observed_final_status, 200);
    const original = new URL(item.observed_final_url);
    assert.equal(original.origin, 'https://reparapid.fr');
    assert.ok(original.pathname.startsWith('/wp-content/uploads/'));
    assert.equal(item.proposed_action, 'inventory_only');
    assert.equal(item.proposed_status, null);
    assert.equal(publicPageRedirect(item.path), null, item.path);
    assert.equal(publicAsset(item.path), null, item.path);
  }
});
