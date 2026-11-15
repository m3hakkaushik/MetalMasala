import { money } from '../../api/catalogue';
import { RequestError } from '../../components/ui/Status';

export function PriceBreakdown({ pricing }) {
  return (
    <dl className="price-breakdown">
      <div>
        <dt>Subtotal</dt>
        <dd>{money(pricing.subtotal)}</dd>
      </div>
      <div>
        <dt>Shipping</dt>
        <dd>{pricing.shipping ? money(pricing.shipping) : 'Free'}</dd>
      </div>
      {pricing.codFee > 0 && (
        <div>
          <dt>Cash-on-delivery fee</dt>
          <dd>{money(pricing.codFee)}</dd>
        </div>
      )}
      {pricing.discount > 0 && (
        <div>
          <dt>Discount</dt>
          <dd>−{money(pricing.discount)}</dd>
        </div>
      )}
      <div className="price-breakdown__total">
        <dt>Total</dt>
        <dd>{money(pricing.total)}</dd>
      </div>
    </dl>
  );
}

export function PricingSummary({ items, quote }) {
  return (
    <aside className="checkout-summary" aria-label="Order summary">
      <h2>Order summary</h2>
      <ul>
        {items.map(({ product, qty }) => (
          <li key={product.id}>
            <span>
              {product.name} × {qty}
            </span>
            <strong>{money(product.price * qty)}</strong>
          </li>
        ))}
      </ul>
      {quote.isPending && <p role="status">Calculating total…</p>}
      {quote.isError && (
        <RequestError error={quote.error} retry={quote.refetch} />
      )}
      {quote.data && <PriceBreakdown pricing={quote.data.data} />}
      <p className="form-help">Prices include GST.</p>
    </aside>
  );
}
