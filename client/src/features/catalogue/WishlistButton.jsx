import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { addWishlist, getWishlist, removeWishlist } from '../../api/users';
import { loginPath } from '../../app/Access';
import { useAuth } from '../../stores/auth.store';
import { useUi } from '../../stores/ui.store';

export function WishlistButton({ productId }) {
  const userId = useAuth((state) => state.user?.id);
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['wishlist', userId],
    queryFn: ({ signal }) => getWishlist(signal),
    enabled: Boolean(userId),
  });
  const saved = query.data?.data.some(({ id }) => id === productId) ?? false;
  const mutation = useMutation({
    mutationFn: (remove) => (remove ? removeWishlist : addWishlist)(productId),
    onSuccess: async (_, removed) => {
      await queryClient.invalidateQueries({ queryKey: ['wishlist', userId] });
      useUi
        .getState()
        .announce(removed ? 'Removed from wishlist' : 'Saved to wishlist');
    },
    onError: (error) => useUi.getState().announce(error.message),
  });
  function toggle() {
    if (!userId) return navigate(loginPath(location));
    return mutation.mutate(saved);
  }
  return (
    <button
      type="button"
      className="icon-button wishlist-trigger"
      aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
      aria-pressed={saved}
      onClick={toggle}
      disabled={mutation.isPending || Boolean(userId && query.isPending)}
    >
      <Heart
        size={21}
        fill={saved ? 'currentColor' : 'none'}
        aria-hidden="true"
      />
    </button>
  );
}
