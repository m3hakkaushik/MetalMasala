import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { PAYMENT_METHODS } from '../../api/commerce';
import { addressSchema, paymentSchema } from '../../api/validation';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import {
  AddressFields,
  AddressLines,
  addressDefaults,
} from '../account/AddressFields';

export function AddressStep({ user, current, next }) {
  const addresses = user.addresses;
  const [selected, setSelected] = useState(
    addresses.find((address) => address.id === current?.id)?.id ??
      (current
        ? 'new'
        : (addresses.find(({ isDefault }) => isDefault)?.id ??
          addresses[0]?.id ??
          'new')),
  );
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(addressSchema),
    defaultValues: current?.address ?? addressDefaults(user),
  });
  function chooseSaved(event) {
    event.preventDefault();
    const address = addresses.find(({ id }) => id === selected);
    if (!address) return;
    const snapshot = { ...address };
    delete snapshot.id;
    delete snapshot.isDefault;
    next({ id: address.id, address: snapshot });
  }
  return (
    <section className="checkout-panel">
      <h2>Contact and address</h2>
      <p>Order updates will go to {user.email}.</p>
      <form
        className="form-stack"
        noValidate
        onSubmit={
          selected === 'new'
            ? handleSubmit((address) => next({ address }))
            : chooseSaved
        }
      >
        {addresses.length > 0 && (
          <fieldset className="choice-list">
            <legend>Choose an address</legend>
            {addresses.map((address) => (
              <label key={address.id} className="choice-card">
                <input
                  type="radio"
                  checked={selected === address.id}
                  name="shippingAddress"
                  onChange={() => setSelected(address.id)}
                />
                <span>
                  <strong>
                    {address.label}
                    {address.isDefault ? ' (default)' : ''}
                  </strong>
                  <span>
                    {address.line1}, {address.city} {address.pincode}
                  </span>
                </span>
              </label>
            ))}
            <label className="choice-card">
              <input
                type="radio"
                checked={selected === 'new'}
                name="shippingAddress"
                onChange={() => setSelected('new')}
              />
              <strong>Use a new address</strong>
            </label>
          </fieldset>
        )}
        {selected === 'new' && (
          <AddressFields register={register} errors={errors} />
        )}
        <Button type="submit">Continue to payment</Button>
      </form>
    </section>
  );
}

export function PaymentStep({ current, updateMethod, next, back }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(paymentSchema),
    defaultValues: current,
  });
  return (
    <section className="checkout-panel">
      <h2>Delivery and payment</h2>
      <p>Standard delivery. This demo charges no money.</p>
      <form className="form-stack" onSubmit={handleSubmit(next)} noValidate>
        <fieldset className="choice-list">
          <legend>Payment method</legend>
          {Object.entries(PAYMENT_METHODS).map(([value, label]) => (
            <label className="choice-card" key={value}>
              <input
                type="radio"
                value={value}
                {...register('paymentMethod', {
                  onChange: () => updateMethod(value),
                })}
              />
              <span>
                <strong>{label}</strong>
                {value === 'cod' && <span>₹49 cash-on-delivery fee</span>}
              </span>
            </label>
          ))}
          {errors.paymentMethod && (
            <p className="field-error">{errors.paymentMethod.message}</p>
          )}
        </fieldset>
        <Field
          as="textarea"
          rows={3}
          label="Delivery notes (optional)"
          error={errors.notes?.message}
          {...register('notes')}
        />
        <div className="form-actions">
          <Button variant="outline" onClick={back}>
            Back
          </Button>
          <Button type="submit">Review your order</Button>
        </div>
      </form>
    </section>
  );
}

export function ReviewOrderStep({
  shipping,
  payment,
  back,
  place,
  pending,
  ready,
}) {
  return (
    <section className="checkout-panel">
      <h2>Review your order</h2>
      <div className="checkout-review">
        <section>
          <h3>Deliver to</h3>
          <AddressLines address={shipping} />
        </section>
        <section>
          <h3>Payment</h3>
          <p>{PAYMENT_METHODS[payment.paymentMethod]}</p>
          {payment.notes && <p>Delivery note: {payment.notes}</p>}
        </section>
      </div>
      <div className="form-actions">
        <Button variant="outline" onClick={back} disabled={pending}>
          Back
        </Button>
        <Button onClick={place} disabled={!ready || pending}>
          {pending ? 'Placing order…' : 'Place order'}
        </Button>
      </div>
    </section>
  );
}
