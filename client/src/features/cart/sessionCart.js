import { mergeCart } from '../../api/cart';
import { useCart } from '../../stores/cart.store';

let merging;

export async function mergeGuestBag(queryClient, userId) {
  if (merging?.userId === userId) return merging.task;
  const original = useCart.getState().items;
  if (!original.length) return;
  const items = original.map(({ product, qty }) => ({
    productId: product.id,
    qty,
  }));
  const task = (async () => {
    await queryClient.cancelQueries({ queryKey: ['cart', userId] });
    const result = await mergeCart(items);
    useCart.getState().removeMerged(items);
    queryClient.setQueryData(['cart', userId], result);
    return result;
  })();
  merging = { userId, task };
  try {
    return await task;
  } finally {
    if (merging?.task === task) merging = undefined;
  }
}
