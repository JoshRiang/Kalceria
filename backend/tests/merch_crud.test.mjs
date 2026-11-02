import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validUrl, createMerch, updateMerch, toggleSoldOut, listPublicMerch } from '../controllers/adminMerchController.js';

describe('Merch & Product Backend Structural Integrity & Security', () => {
  describe('1. URL & Asset Security Validation', () => {
    it('accepts valid HTTPS product and marketplace URLs', () => {
      assert.equal(validUrl('https://tokopedia.com/kalceros/shift-knob'), true);
      assert.equal(validUrl('https://shopee.co.id/kalcres/wing-carbon'), true);
      assert.equal(validUrl('https://images.unsplash.com/photo-1234.jpg'), true);
    });

    it('accepts valid site-relative photo assets', () => {
      assert.equal(validUrl('/media/products/part_1.webp'), true);
      assert.equal(validUrl('/favicon.webp'), true);
    });

    it('rejects unsafe protocols, script schemes, and invalid URLs', () => {
      assert.equal(validUrl('javascript:alert(1)'), false);
      assert.equal(validUrl('ftp://insecure.site/file.png'), false);
      assert.equal(validUrl('data:text/html;base64,PHNjcmlwdD4='), false);
      assert.equal(validUrl('//protocol-relative-exploit.com'), false);
      assert.equal(validUrl('not-a-valid-url'), false);
      assert.equal(validUrl(''), false);
      assert.equal(validUrl(null), false);
    });
  });

  describe('2. Product Creation Boundaries', () => {
    it('rejects product without a valid name', async () => {
      let status = 0;
      let body = {};
      const res = {
        status: (code) => { status = code; return { json: (data) => { body = data; } }; },
      };
      await createMerch({ body: { name: '', photoUrl: '/test.png', link: 'https://tokopedia.com', price: 100000 } }, res, () => {});
      assert.equal(status, 400);
      assert.match(body.error, /Provide a name/i);
    });

    it('rejects product with negative or non-finite price', async () => {
      let status = 0;
      let body = {};
      const res = {
        status: (code) => { status = code; return { json: (data) => { body = data; } }; },
      };
      await createMerch({ body: { name: 'Valid Product', photoUrl: '/test.png', link: 'https://tokopedia.com', price: -500 } }, res, () => {});
      assert.equal(status, 400);
      assert.match(body.error, /Price must be a non-negative amount/i);
    });

    it('rejects product with invalid or unsafe link', async () => {
      let status = 0;
      let body = {};
      const res = {
        status: (code) => { status = code; return { json: (data) => { body = data; } }; },
      };
      await createMerch({ body: { name: 'Valid Product', photoUrl: 'javascript:evil()', link: 'https://tokopedia.com', price: 50000 } }, res, () => {});
      assert.equal(status, 400);
      assert.match(body.error, /Provide a name, an HTTPS or site-relative photo URL/i);
    });
  });

  describe('3. Stock & Sold Out Architecture (Regulated by Tokopedia & Shopee)', () => {
    it('toggleSoldOut reports external marketplace management without throwing', async () => {
      let body = {};
      const res = {
        json: (data) => { body = data; },
      };
      await toggleSoldOut({ params: { id: 'any-id' } }, res, () => {});
      assert.equal(body.isSoldOut, false);
      assert.match(body.message, /Tokopedia and Shopee/i);
    });
  });
});

