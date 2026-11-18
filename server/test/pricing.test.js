import './helpers/environment.js';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import config from '../src/config/index.js';
import { calculateQuote } from '../src/services/pricing.service.js';

test('adds shipping and COD fees below the free-shipping threshold', () => {
  assert.deepEqual(calculateQuote(799, 'cod'), {
    subtotal: 799,
    shipping: 79,
    codFee: 49,
    discount: 0,
    total: 927,
    freeShippingThreshold: 999,
    amountToFreeShipping: 200,
  });
});

test('free shipping includes the exact threshold and applies to each payment method', () => {
  assert.equal(calculateQuote(998, 'upi_mock').shipping, 79);
  for (const method of ['upi_mock', 'card_mock', 'cod']) {
    const quote = calculateQuote(999, method);
    assert.equal(quote.shipping, 0);
    assert.equal(quote.amountToFreeShipping, 0);
    assert.equal(quote.total, method === 'cod' ? 1048 : 999);
  }
});

test('uses supplied pricing rules without mutating configuration', () => {
  const rules = { freeShippingThreshold: 500, shippingFee: 30, codFee: 15 };
  assert.equal(calculateQuote(499, 'cod', rules).total, 544);
  assert.equal(config.pricing.freeShippingThreshold, 999);
  assert.ok(Object.isFrozen(config.pricing));
});
