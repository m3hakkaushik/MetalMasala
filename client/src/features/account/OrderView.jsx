import { motion, useReducedMotion } from 'framer-motion';
import { Check, Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import { money } from '../../api/catalogue';
import {
  ORDER_FLOW,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  orderDate,
} from '../../api/commerce';
import { PriceBreakdown } from '../checkout/PricingSummary';
import { AddressLines } from './AddressFields';

export function OrderTimeline({ order }) {
  const reduced = useReducedMotion();
  const steps =
    order.status === 'cancelled'
      ? order.statusHistory.map(({ status }) => status)
      : ORDER_FLOW;
  const history = new Map(
    order.statusHistory.map((entry) => [entry.status, entry]),
  );
  return (
    <ol
      className="order-timeline"
      aria-label="Order timeline"
      aria-live="polite"
    >
      {steps.map((status) => {
        const event = history.get(status);
        const current = status === order.status;
        return (
          <li
            key={status}
            data-reached={Boolean(event)}
            aria-current={current ? 'step' : undefined}
          >
            <motion.span
              key={String(current)}
              className="order-timeline__mark"
              aria-hidden="true"
              initial={current && !reduced ? { scale: 0.75 } : false}
              animate={{ scale: 1 }}
            >
              {event ? <Check size={15} /> : <Package size={13} />}
            </motion.span>
            <div>
              <strong>{ORDER_STATUSES[status]}</strong>
              {event && (
                <span>
                  {orderDate(event.at)}
                  {event.note ? ` · ${event.note}` : ''}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function OrderItems({ order }) {
  return (
    <section className="account-panel">
      <h2>Pieces in this order</h2>
      <ul className="order-items">
        {order.items.map((item) => (
          <li key={item.product}>
            <div>
              <Link className="text-link" to={`/product/${item.slug}`}>
                {item.name}
              </Link>
              <p>Quantity {item.qty}</p>
            </div>
            <strong>{money(item.lineTotal)}</strong>
          </li>
        ))}
      </ul>
      <PriceBreakdown pricing={order.pricing} />
    </section>
  );
}

export function OrderShipping({ order }) {
  return (
    <section className="account-panel">
      <h2>Delivery and payment</h2>
      <AddressLines address={order.shippingAddress} />
      <p className="payment-status">
        {PAYMENT_METHODS[order.payment.method]} · {order.payment.status}
      </p>
    </section>
  );
}
