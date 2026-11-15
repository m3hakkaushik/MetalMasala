import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createOrder } from '../api/orders';
import { quoteBag } from '../api/pricing';
import { getProfile } from '../api/users';
import { Seo } from '../app/Seo';
import { Button } from '../components/ui/Button';
import { RequestError } from '../components/ui/Status';
import { useBag } from '../features/cart/useBag';
import { PricingSummary } from '../features/checkout/PricingSummary';
import {
  AddressStep,
  PaymentStep,
  ReviewOrderStep,
} from '../features/checkout/Steps';
import { useAuth } from '../stores/auth.store';

const names = ['Contact and address', 'Delivery and payment', 'Review'];

export default function Checkout() {
  const user = useAuth((state) => state.user);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { items, loading, queryError, guestPending, retry } = useBag();
  const [step, setStep] = useState(1);
  const [shipping, setShipping] = useState(null);
  const [payment, setPayment] = useState({
    paymentMethod: 'upi_mock',
    notes: '',
  });
  const heading = useRef(null);
  const profile = useQuery({
    queryKey: ['profile', user.id],
    queryFn: ({ signal }) => getProfile(signal),
  });
  const quoteItems = items.map(({ product, qty }) => ({
    productId: product.id,
    qty,
  }));
  const quote = useQuery({
    queryKey: ['quote', quoteItems, payment.paymentMethod],
    queryFn: ({ signal }) =>
      quoteBag(quoteItems, payment.paymentMethod, signal),
    enabled: Boolean(items.length),
  });

  const order = useMutation({
    mutationFn: () =>
      createOrder({ shippingAddress: shipping.address, ...payment }),
    onSuccess: ({ data }) => {
      queryClient.setQueryData(['order', user.id, data.id], { data });
      navigate(`/order/confirmed/${data.id}`, { replace: true });
      for (const key of [
        'cart',
        'orders',
        'shop',
        'product',
        'products',
        'facets',
        'related',
      ]) {
        void queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
  });

  useEffect(() => {
    if (step > 1) heading.current?.focus();
  }, [step]);

  if (loading || profile.isPending)
    return (
      <p className="site-width empty-state" role="status">
        Loading checkout…
      </p>
    );
  if (queryError || profile.isError)
    return (
      <div className="site-width empty-state">
        <RequestError
          error={queryError ?? profile.error}
          retry={queryError ? retry : profile.refetch}
        />
      </div>
    );
  if (!items.length || guestPending)
    return (
      <div className="site-width empty-state">
        <Seo title="Checkout" />
        <h1>{guestPending ? 'Sync your guest bag' : 'Your bag is empty'}</h1>
        <Button to={guestPending ? '/cart' : '/shop'}>
          {guestPending ? 'Go to your bag' : 'Explore the shop'}
        </Button>
      </div>
    );

  return (
    <div className="site-width checkout-page">
      <Seo title="Checkout" />
      <h1 ref={heading} tabIndex={-1}>
        Checkout
      </h1>
      <ol className="checkout-steps" aria-label="Checkout steps">
        {names.map((name, index) => (
          <li key={name} aria-current={step === index + 1 ? 'step' : undefined}>
            <span>{index + 1}</span>
            {name}
          </li>
        ))}
      </ol>
      <div className="checkout-grid">
        <div>
          {step === 1 && (
            <AddressStep
              user={profile.data.data}
              current={shipping}
              next={(address) => {
                setShipping(address);
                setStep(2);
              }}
            />
          )}
          {step === 2 && (
            <PaymentStep
              current={payment}
              updateMethod={(paymentMethod) =>
                setPayment({ ...payment, paymentMethod })
              }
              back={() => setStep(1)}
              next={(value) => {
                setPayment(value);
                setStep(3);
              }}
            />
          )}
          {step === 3 && (
            <ReviewOrderStep
              shipping={shipping.address}
              payment={payment}
              back={() => setStep(2)}
              place={() => order.mutate()}
              pending={order.isPending}
              ready={quote.isSuccess}
            />
          )}
          {order.isError && <RequestError error={order.error} />}
        </div>
        <PricingSummary items={items} quote={quote} />
      </div>
    </div>
  );
}
