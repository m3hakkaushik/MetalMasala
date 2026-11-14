import { useQuery } from '@tanstack/react-query';
import { ShoppingBag, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FALLBACK_FREE_SHIPPING_THRESHOLD, money } from '../../api/catalogue';
import { quoteBag } from '../../api/pricing';
import { getProduct } from '../../api/products';
import { Button } from '../../components/ui/Button';
import { SmartImage } from '../../components/ui/SmartImage';
import { RequestError } from '../../components/ui/Status';
import { subtotalBag } from '../../stores/cart.store';
import { Quantity } from '../catalogue/Quantity';
import { useBag } from './useBag';

function BagImage({ product }) {
  const details = useQuery({
    queryKey: ['product', product.slug],
    queryFn: ({ signal }) => getProduct(product.slug, signal),
    enabled: !product.category,
  });
  return (
    <SmartImage
      src={product.image}
      alt={product.name}
      category={product.category ?? details.data?.data.category.slug}
      finish={product.finish ?? details.data?.data.finish}
    />
  );
}

export function Bag({ inDrawer = false, closeDrawer }) {
  const bag = useBag();
  const { items } = bag;
  const quoteItems = items.map(({ product, qty }) => ({
    productId: product.id,
    qty,
  }));
  const quote = useQuery({
    queryKey: ['quote', quoteItems, 'upi_mock'],
    queryFn: ({ signal }) => quoteBag(quoteItems, 'upi_mock', signal),
    enabled: items.length > 0,
  });

  if (bag.loading)
    return (
      <div className="empty-state" role="status">
        Loading your bag…
      </div>
    );
  if (bag.queryError)
    return (
      <div className="empty-state">
        <RequestError error={bag.queryError} retry={bag.retry} />
      </div>
    );

  const subtotal = quote.data?.data.subtotal ?? subtotalBag(items);
  const threshold =
    quote.data?.data.freeShippingThreshold ?? FALLBACK_FREE_SHIPPING_THRESHOLD;
  const remaining =
    quote.data?.data.amountToFreeShipping ?? Math.max(0, threshold - subtotal);

  return (
    <>
      {bag.guestPending && (
        <div className="bag-sync" role="status">
          <p>Sync the pieces you added before signing in.</p>
          <Button variant="outline" onClick={bag.sync} disabled={bag.working}>
            Sync guest bag
          </Button>
        </div>
      )}
      {bag.mutationError && <RequestError error={bag.mutationError} />}
      {items.length === 0 ? (
        <section className="empty-state">
          <ShoppingBag size={34} strokeWidth={1.3} aria-hidden="true" />
          <h2>Your bag is empty</h2>
          <p>Start with the new drop.</p>
          <Button to="/shop?newDrop=true" onClick={closeDrawer}>
            Shop the new drop
          </Button>
        </section>
      ) : (
        <div
          className={`bag-content ${inDrawer ? 'bag-content--compact' : ''}`}
        >
          <ul className="bag-items">
            {items.map(({ product, qty, lineTotal }) => (
              <li key={product.id}>
                <Link
                  to={`/product/${product.slug}`}
                  onClick={closeDrawer}
                  className="bag-item__image"
                >
                  <BagImage product={product} />
                </Link>
                <div className="bag-item__main">
                  <Link to={`/product/${product.slug}`} onClick={closeDrawer}>
                    {product.name}
                  </Link>
                  <Quantity
                    value={qty}
                    onChange={(next) => bag.update(product, next)}
                    max={product.stock}
                    disabled={bag.working}
                    label={`Quantity for ${product.name}`}
                  />
                  {qty > product.stock && (
                    <p className="field-error">
                      Only {product.stock} available.
                    </p>
                  )}
                </div>
                <div className="bag-item__end">
                  <strong>{money(lineTotal ?? product.price * qty)}</strong>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Remove ${product.name}`}
                    onClick={() => bag.remove(product)}
                    disabled={bag.working}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <section className="bag-summary" aria-label="Bag summary">
            <p>
              {remaining
                ? `You’re ${money(remaining)} away from free shipping.`
                : 'Your bag qualifies for free shipping.'}
            </p>
            <progress
              value={Math.min(subtotal, threshold)}
              max={threshold}
              aria-label="Progress towards free shipping"
            />
            <div className="bag-summary__subtotal">
              <span>Subtotal</span>
              <strong>{money(subtotal)}</strong>
            </div>
            {quote.isError && (
              <p className="field-error">
                Current shipping quote is unavailable.
              </p>
            )}
            <Button to="/checkout" onClick={closeDrawer}>
              Checkout
            </Button>
            {inDrawer ? (
              <Button to="/cart" variant="outline" onClick={closeDrawer}>
                View bag
              </Button>
            ) : (
              <Button to="/shop" variant="outline">
                Continue shopping
              </Button>
            )}
          </section>
        </div>
      )}
    </>
  );
}
