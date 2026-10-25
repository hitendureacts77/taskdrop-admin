import assert from 'node:assert/strict';
import { test } from 'node:test';
import { imageKitSignConfig, mediaRefId, signedImageKitUrl, urlExpiry } from './imagekit-sign.ts';

// Expected links were produced by the app's own signer (supabase/functions/_shared/imagekit.ts)
// with the same fake key and clock, so the admin and the app agree byte for byte.
const cfg = { privateKey: 'private_test_key', urlEndpoint: 'https://ik.imagekit.io/demo/' };
const NOW = Date.UTC(2026, 9, 25, 12, 34, 56);

test('urlExpiry is the end of the hour after the next one', () => {
  assert.equal(urlExpiry(NOW), 1792936800);
  assert.equal(urlExpiry(NOW + 60_000), 1792936800);
});

test('signedImageKitUrl matches the app signer: card size', () => {
  assert.equal(
    signedImageKitUrl(cfg, '/beta/u/5eed0000-0000-4000-8000-000000000001/9486189e-085c-41ac-b683-c2c76a4506d4.png', 'card', NOW),
    'https://ik.imagekit.io/demo/tr:w-640,h-640,c-at_max,q-80,f-auto/beta/u/5eed0000-0000-4000-8000-000000000001/9486189e-085c-41ac-b683-c2c76a4506d4.png?ik-t=1792936800&ik-s=b664dbbf63deb340ecaff8e3f34c0a536983f14c',
  );
});

test('signedImageKitUrl matches the app signer: full size, spaces escaped', () => {
  assert.equal(
    signedImageKitUrl(cfg, '/beta/u/abc/my file.jpg', 'full', NOW),
    'https://ik.imagekit.io/demo/tr:w-1600,h-1600,c-at_max,q-80,f-auto/beta/u/abc/my%20file.jpg?ik-t=1792936800&ik-s=258110d1e26552793ab1d7a8d90a150dff7c72dd',
  );
});

test('imageKitSignConfig needs both values and an ImageKit address', () => {
  assert.equal(imageKitSignConfig({}), null);
  assert.equal(imageKitSignConfig({ IMAGEKIT_PRIVATE_KEY: 'k' }), null);
  assert.equal(imageKitSignConfig({ IMAGEKIT_PRIVATE_KEY: 'k', IMAGEKIT_URL_ENDPOINT: 'https://evil.example/x' }), null);
  assert.deepEqual(imageKitSignConfig({ IMAGEKIT_PRIVATE_KEY: ' k ', IMAGEKIT_URL_ENDPOINT: 'https://ik.imagekit.io/demo/' }), {
    privateKey: 'k',
    urlEndpoint: 'https://ik.imagekit.io/demo',
  });
});

test('mediaRefId reads only well-formed media references', () => {
  assert.equal(mediaRefId('media:9486189E-085C-41AC-B683-C2C76A4506D4'), '9486189e-085c-41ac-b683-c2c76a4506d4');
  assert.equal(mediaRefId('media:not-a-uuid'), null);
  assert.equal(mediaRefId('5eed/1234-abc.jpg'), null);
  assert.equal(mediaRefId(null), null);
});
