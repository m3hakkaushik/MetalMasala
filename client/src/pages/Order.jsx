import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleCheck, PackageCheck } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { nextStatuses, orderDate } from '../api/commerce';
import { cancelOrder, getOrder } from '../api/orders';
import { Seo } from '../app/Seo';
import { Button } from '../components/ui/Button';
import { Drawer } from '../components/ui/Drawer';
import { RequestError } from '../components/ui/Status';
import {
  OrderItems,
  OrderShipping,
  OrderTimeline,
} from '../features/account/OrderView';
import { useOrderLive } from '../hooks/useOrderLive';
import { useAuth } from '../stores/auth.store';

function OrderScreen({ data, confirmed, userId }) {
  const order = data;
  const queryClient = useQueryClient();
  const [cancelOpen, setCancelOpen] = useState(false);
  const cancel = useMutation({
    mutationFn: () => cancelOrder(order.id),
    onSuccess: (result) => {
      if (result.data)
        queryClient.setQueryData(['order', userId, order.id], result);
      setCancelOpen(false);
      for (const key of [
        'order',
        'orders',
        'product',
        'products',
        'shop',
        'related',
        'facets',
      ]) {
        void queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
  });
  const canCancel =
    order.user === userId && nextStatuses(order.status).includes('cancelled');

  return (
    <div className="site-width order-page">
      <Seo title={confirmed ? 'Order confirmed' : order.orderNumber} />
      <header
        className={`order-header ${confirmed ? 'order-header--confirmed' : ''}`}
      >
        {confirmed ? (
          <CircleCheck size={38} aria-hidden="true" />
        ) : (
          <PackageCheck size={32} aria-hidden="true" />
        )}
        <h1>{confirmed ? 'Order confirmed' : order.orderNumber}</h1>
        {confirmed && (
          <p>
            Your order number is <strong>{order.orderNumber}</strong>.
          </p>
        )}
        <p>Placed on {orderDate(order.createdAt)}</p>
        <div className="form-actions">
          {confirmed ? (
            <>
              <Button to={`/orders/${order.id}`}>Track order</Button>
              <Button variant="outline" to="/shop">
                Continue shopping
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" to="/account?tab=orders">
                Your orders
              </Button>
              {canCancel && (
                <Button variant="outline" onClick={() => setCancelOpen(true)}>
                  Cancel order
                </Button>
              )}
            </>
          )}
        </div>
      </header>
      <div className="order-grid">
        <section className="account-panel">
          <h2>Order timeline</h2>
          <OrderTimeline order={order} />
        </section>
        <OrderItems order={order} />
        <OrderShipping order={order} />
      </div>
      <Drawer
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel this order?"
        placement="center"
      >
        <div className="drawer-padding form-stack">
          <p>
            Cancel order {order.orderNumber} and release its reserved pieces.
          </p>
          {cancel.isError && <RequestError error={cancel.error} />}
          <div className="form-actions">
            <Button variant="outline" onClick={() => setCancelOpen(false)}>
              Keep order
            </Button>
            <Button
              onClick={() => cancel.mutate()}
              disabled={cancel.isPending || !canCancel}
            >
              Cancel order
            </Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}

function OrderResult({ query, confirmed, userId }) {
  if (query.isPending)
    return (
      <p className="site-width empty-state" role="status">
        Loading order…
      </p>
    );
  if (query.isError)
    return (
      <div className="site-width empty-state">
        <Seo title="Order unavailable" />
        <RequestError error={query.error} retry={query.refetch} />
        <Button to="/account?tab=orders" variant="outline">
          Your orders
        </Button>
      </div>
    );
  return (
    <OrderScreen data={query.data.data} confirmed={confirmed} userId={userId} />
  );
}

export function OrderConfirmed() {
  const { id } = useParams();
  const userId = useAuth((state) => state.user.id);
  const query = useQuery({
    queryKey: ['order', userId, id],
    queryFn: ({ signal }) => getOrder(id, signal),
  });
  return <OrderResult query={query} userId={userId} confirmed />;
}

export function TrackOrder() {
  const { id } = useParams();
  const userId = useAuth((state) => state.user.id);
  const query = useOrderLive(id, userId);
  return <OrderResult query={query} userId={userId} />;
}
