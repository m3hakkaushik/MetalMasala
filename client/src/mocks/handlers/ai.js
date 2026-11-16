import { z } from 'zod';
import { FINISHES, MATERIALS, money } from '../../api/catalogue';
import { readDb } from '../db';
import { endpoint, failure, success } from '../http';
import { actor } from '../session';
import { parseBody } from '../validation';

const chatSchema = z.object({
  message: z.string().trim().min(1).max(500),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(1000),
      }),
    )
    .max(6)
    .optional(),
});
const descriptor = z.object({
  name: z.string().trim().min(2),
  category: z.string().trim().min(1),
  finish: z.enum(Object.keys(FINISHES)),
  material: z.enum(Object.keys(MATERIALS)),
  tags: z.array(z.string()).optional(),
  notes: z.string().trim().max(500).optional(),
});
const styles = {
  'wedding-guest': /sangeet|wedding|mehfil|reception/,
  college: /college|class|campus/,
  'office-desi': /office|work|meeting/,
  statement: /loud|bold|statement/,
  everyday: /daily|everyday|simple/,
  festive: /festive|diwali|festiv/,
  gift: /gift|present/,
};
const recent = [];

function recommend(text, products) {
  const price = text.match(
    /(?:under|below|up to|budget|less than|within)\s*(?:₹|rs\.?\s*|inr\s*)?([\d,]+)/i,
  );
  const budget = price && Number(price[1].replaceAll(',', ''));
  const tags = Object.keys(styles).filter((tag) => styles[tag].test(text));
  const finish = Object.entries(FINISHES).find(([, label]) =>
    text.includes(label.toLowerCase()),
  )?.[0];
  const pieces = [
    'jhumka',
    'choker',
    'necklace',
    'ring',
    'kada',
    'payal',
    'tikka',
    'nose pin',
    'combo',
  ];
  const piece = pieces.find((value) => text.includes(value));
  return products
    .filter(
      (product) =>
        product.inStock &&
        (!budget || product.price <= budget) &&
        (!finish || product.finish === finish) &&
        (!piece || product.name.toLowerCase().includes(piece)),
    )
    .map((product) => ({
      product,
      score: tags.filter((tag) => product.tags.includes(tag)).length,
    }))
    .sort(
      (a, b) => b.score - a.score || b.product.soldCount - a.product.soldCount,
    )
    .slice(0, 3)
    .map(({ product }) => product);
}

export const aiHandlers = [
  endpoint('post', '/ai/stylist', async ({ request }) => {
    const cutoff = Date.now() - 60_000;
    while (recent.length && recent[0] < cutoff) recent.shift();
    if (recent.length >= 10)
      return failure(429, 'RATE_LIMITED', 'Try the stylist again in a minute.');
    const body = await parseBody(request, chatSchema);
    if (body.error) return body.error;
    recent.push(Date.now());
    const { message, history = [] } = body.data;
    const previous =
      history.filter(({ role }) => role === 'user').at(-1)?.content ?? '';
    const context =
      /^(what about|and |anything |something cheaper|cheaper)/i.test(message)
        ? previous + ' ' + message
        : message;
    const products = recommend(context.toLowerCase(), readDb().products);
    const best = products[0];
    const reply = best
      ? `Start with the ${best.name} at ${money(best.price)}. ${best.tagline} ${products.length > 1 ? 'I’ve included a few other options from the collection.' : ''}`.trim()
      : 'I couldn’t find an in-stock piece with those details. Try another finish, style, or budget.';
    return success({ reply, products, provider: 'mock' });
  }),
  endpoint('post', '/ai/describe', async ({ request }) => {
    const body = await parseBody(request, descriptor);
    if (body.error) return body.error;
    const { error } = actor(readDb(), request, ['manager', 'admin']);
    if (error) return error;
    const { name, finish, material, notes } = body.data;
    const finishLabel = FINISHES[finish].toLowerCase();
    const materialLabel = MATERIALS[material].toLowerCase();
    const article = /^[aeiou]/.test(finishLabel) ? 'An' : 'A';
    return success({
      tagline: `${article} ${finishLabel} piece with a little extra masala.`,
      description: `${name} is shaped from ${materialLabel} and finished by hand. The ${finishLabel} surface picks up the light on raised details. Wear it against a plain shirt, a soft cotton kurta, or a simple neckline so the finish can catch the light. ${notes ? notes.split(/\s+/).slice(0, 25).join(' ') : 'Wipe it with a soft cloth after wearing and keep it in its pouch.'}`,
    });
  }),
];
