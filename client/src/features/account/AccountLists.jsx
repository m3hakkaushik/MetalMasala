import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { money } from '../../api/catalogue';
import { ORDER_STATUSES, orderDate } from '../../api/commerce';
import { listOrders } from '../../api/orders';
import { getWishlist, removeWishlist } from '../../api/users';
import { Button } from '../../components/ui/Button';
import { Pager } from '../../components/ui/Pager';
import { RequestError } from '../../components/ui/Status';
import { ProductCard } from '../catalogue/ProductCard';

export function AccountOrders({ userId }) {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['orders', userId, page],
    queryFn: ({ signal }) => listOrders({ page }, signal),
  });
  if (query.isPending) return <p role="status">Loading your orders…</p>;
  if (query.isError)
    return <RequestError error={query.error} retry={query.refetch} />;
  return (
    <section className="account-panel">
      <h2>Your orders</h2>
      {query.data.data.length === 0 ? (
        <p>Orders you place will appear here.</p>
      ) : (
        <ul className="account-order-list">
          {query.data.data.map((order) => (
            <li key={order.id}>
              <div>
                <strong>{order.orderNumber}</strong>
                <p>{orderDate(order.createdAt)}</p>
              </div>
              <span className="chip">{ORDER_STATUSES[order.status]}</span>
              <strong>{money(order.pricing.total)}</strong>
              <Button variant="outline" to={`/orders/${order.id}`}>
                Track order
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Pager meta={query.data.meta} onPage={setPage} />
    </section>
  );
}

export function AccountWishlist({ userId }) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['wishlist', userId],
    queryFn: ({ signal }) => getWishlist(signal),
  });
  const remove = useMutation({
    mutationFn: removeWishlist,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['wishlist', userId] }),
  });
  if (query.isPending) return <p role="status">Loading your wishlist…</p>;
  if (query.isError)
    return <RequestError error={query.error} retry={query.refetch} />;
  return (
    <section className="account-panel">
      <h2>Your wishlist</h2>
      {remove.isError && <RequestError error={remove.error} />}
      {query.data.data.length ? (
        <div className="product-grid">
          {query.data.data.map((product) => (
            <div key={product.id} className="wishlist-item">
              <ProductCard product={product} />
              <button
                className="text-link"
                onClick={() => remove.mutate(product.id)}
                disabled={remove.isPending}
                aria-label={`Remove ${product.name} from wishlist`}
              >
                Remove from wishlist
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div>
          <p>Save the pieces you’re thinking about.</p>
          <Button to="/shop" variant="outline">
            Explore the shop
          </Button>
        </div>
      )}
    </section>
  );
}
