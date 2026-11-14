import { quotePricing } from '../commerce';
import { readDb } from '../db';
import { endpoint, failure, invalid, readJson, success } from '../http';

export const pricingHandlers = [
  endpoint('post', '/pricing/quote', async ({ request }) => {
    const body = await readJson(request);
    if (body === undefined)
      return failure(
        400,
        'BAD_REQUEST',
        'The request body must be valid JSON.',
      );
    if (!Array.isArray(body?.items))
      return invalid('items', 'Add a list of items to price.');
    if (!['cod', 'upi_mock', 'card_mock'].includes(body.paymentMethod)) {
      return invalid('paymentMethod', 'Choose a payment method.');
    }
    const { products } = readDb();
    let subtotal = 0;
    for (const [index, item] of body.items.entries()) {
      const product = products.find(({ id }) => id === item?.productId);
      if (!product)
        return invalid(
          `items.${index}.productId`,
          'Choose a product from the catalogue.',
        );
      if (!Number.isSafeInteger(item.qty) || item.qty < 1) {
        return invalid(
          `items.${index}.qty`,
          'Quantity must be a positive whole number.',
        );
      }
      subtotal += product.price * item.qty;
    }
    return success(quotePricing(subtotal, body.paymentMethod));
  }),
];
