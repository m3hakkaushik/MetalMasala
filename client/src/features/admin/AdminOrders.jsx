import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { listAdminOrders, updateOrderStatus } from '../../api/admin';
import { money } from '../../api/catalogue';
import { ORDER_STATUSES, nextStatuses, orderDate } from '../../api/commerce';
import { Seo } from '../../app/Seo';
import { Field } from '../../components/ui/Field';
import { Pager } from '../../components/ui/Pager';
import { RequestError } from '../../components/ui/Status';
import { useDebounce } from '../../hooks/useDebounce';
import { useAuth } from '../../stores/auth.store';
import { useUi } from '../../stores/ui.store';

export default function AdminOrders() {
  const userId = useAuth((state) => state.user.id);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounce(search.trim());
  const queryClient = useQueryClient();
  const orders = useQuery({
    queryKey: ['admin', userId, 'orders', page, status, q],
    queryFn: ({ signal }) =>
      listAdminOrders({ q, page, status: status || undefined }, signal),
  });
  const update = useMutation({
    mutationFn: ({ id, status }) => updateOrderStatus(id, status),
    onSuccess: async () => {
      for (const key of [
        'admin',
        'orders',
        'order',
        'product',
        'products',
        'shop',
      ]) {
        void queryClient.invalidateQueries({ queryKey: [key] });
      }
      useUi.getState().announce('Order status updated');
    },
  });
  return (
    <>
      <Seo title="Manage orders" />
      <h2>Orders</h2>
      <div className="admin-filters">
        <Field
          label="Search by order number or email"
          type="search"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
        <Field
          label="Filter by status"
          as="select"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          {Object.entries(ORDER_STATUSES).map(([id, title]) => (
            <option value={id} key={id}>
              {title}
            </option>
          ))}
        </Field>
      </div>
      {orders.isPending && <p role="status">Loading orders…</p>}
      {orders.isError && (
        <RequestError error={orders.error} retry={orders.refetch} />
      )}
      {update.isError && <RequestError error={update.error} />}
      {orders.data && (
        <>
          <div
            className="table-wrap"
            tabIndex={0}
            role="region"
            aria-label="Order table"
          >
            <table>
              <thead>
                <tr>
                  <th scope="col">Order</th>
                  <th scope="col">Customer</th>
                  <th scope="col">Date</th>
                  <th scope="col">Total</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.data.data.map((order) => {
                  const next = nextStatuses(order.status);
                  return (
                    <tr key={order.id}>
                      <th scope="row">
                        <Link className="text-link" to={`/orders/${order.id}`}>
                          {order.orderNumber}
                        </Link>
                      </th>
                      <td>{order.shippingAddress.fullName}</td>
                      <td>{orderDate(order.createdAt)}</td>
                      <td>{money(order.pricing.total)}</td>
                      <td>
                        {next.length ? (
                          <select
                            aria-label={`Status for ${order.orderNumber}`}
                            value={order.status}
                            disabled={update.isPending}
                            onChange={(event) =>
                              update.mutate({
                                id: order.id,
                                status: event.target.value,
                              })
                            }
                          >
                            {[order.status, ...next].map((value) => (
                              <option value={value} key={value}>
                                {ORDER_STATUSES[value]}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="chip">
                            {ORDER_STATUSES[order.status]}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {orders.data.data.length === 0 && (
                  <tr>
                    <td colSpan={5}>No orders match your filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pager meta={orders.data.meta} onPage={setPage} />
        </>
      )}
    </>
  );
}
