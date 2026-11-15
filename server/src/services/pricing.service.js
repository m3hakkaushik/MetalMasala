import config from '../config/index.js';
import { ERROR_CODES as codes } from '../config/constants.js';
import { productRepo } from '../repositories/json/product.repo.js';
import { AppError } from '../utils/AppError.js';

// [L13] Compute checkout totals from a verified subtotal. Order services can reuse this function.
export function calculateQuote(
  subtotal,
  paymentMethod,
  rules = config.pricing
) {
  const { freeShippingThreshold, shippingFee, codFee: surcharge } = rules;
  const amountToFreeShipping = Math.max(0, freeShippingThreshold - subtotal);
  const shipping = amountToFreeShipping > 0 ? shippingFee : 0;
  const codFee = paymentMethod === 'cod' ? surcharge : 0;
  return {
    subtotal,
    shipping,
    codFee,
    discount: 0,
    total: subtotal + shipping + codFee,
    freeShippingThreshold,
    amountToFreeShipping,
  };
}

export async function quoteCart({ items, paymentMethod }) {
  const products = new Map();
  const details = [];
  let subtotal = 0;
  for (const [index, { productId, qty }] of items.entries()) {
    if (!products.has(productId))
      products.set(productId, await productRepo.findById(productId));
    const product = products.get(productId);
    if (!product) {
      details.push({
        field: `items.${index}.productId`,
        message: 'Choose a product from the catalogue.',
      });
      continue;
    }
    subtotal += product.price * qty;
  }
  if (details.length)
    throw new AppError(
      422,
      codes.VALIDATION_ERROR,
      details[0].message,
      details
    );

  const quote = calculateQuote(subtotal, paymentMethod);
  if (!Number.isSafeInteger(quote.total)) {
    const message = 'Order total is outside the supported range.';
    throw new AppError(422, codes.VALIDATION_ERROR, message, [
      { field: 'items', message },
    ]);
  }
  return quote;
}
