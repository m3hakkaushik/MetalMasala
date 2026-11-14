import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addCartItem,
  getCart,
  removeCartItem,
  updateCartItem,
} from '../../api/cart';
import { useAuth } from '../../stores/auth.store';
import { countBag, useCart } from '../../stores/cart.store';
import { mergeGuestBag } from './sessionCart';

export function useBag() {
  const checking = useAuth((state) => state.status === 'checking');
  const userId = useAuth((state) => state.user?.id);
  const guestItems = useCart((state) => state.items);
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['cart', userId],
    queryFn: ({ signal }) => getCart(signal),
    enabled: Boolean(userId),
  });
  const mutation = useMutation({
    mutationFn: async ({ type, product, qty }) => {
      if (!userId) {
        const guest = useCart.getState();
        if (type === 'add' && !guest.add(product, qty)) {
          throw {
            code: 'OUT_OF_STOCK',
            message: 'Your bag already has all available stock.',
          };
        }
        if (type === 'quantity') guest.setQty(product.id, qty);
        if (type === 'remove') guest.setQty(product.id, 0);
        return;
      }
      if (type === 'add') return addCartItem(product.id, qty);
      if (type === 'quantity') return updateCartItem(product.id, qty);
      if (type === 'merge') return mergeGuestBag(queryClient, userId);
      return removeCartItem(product.id);
    },
    onSuccess: async (result) => {
      if (!userId) return;
      if (result?.data) queryClient.setQueryData(['cart', userId], result);
      else await queryClient.invalidateQueries({ queryKey: ['cart', userId] });
    },
  });

  const items = userId ? (query.data?.data.items ?? []) : guestItems;
  return {
    items,
    count: userId
      ? (query.data?.data.totals.itemCount ?? 0)
      : countBag(guestItems),
    guestPending: Boolean(userId && guestItems.length),
    loading: checking || Boolean(userId && query.isPending),
    queryError: query.error,
    mutationError: mutation.error,
    working: mutation.isPending,
    retry: query.refetch,
    add: (product, qty) => mutation.mutateAsync({ type: 'add', product, qty }),
    update: (product, qty) =>
      mutation.mutate({ type: 'quantity', product, qty }),
    remove: (product) => mutation.mutate({ type: 'remove', product }),
    sync: () => mutation.mutate({ type: 'merge' }),
  };
}
