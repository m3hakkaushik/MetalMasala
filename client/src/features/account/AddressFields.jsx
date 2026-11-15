import { Field } from '../../components/ui/Field';

export function AddressFields({ register, errors, defaultChoice = false }) {
  return (
    <div className="address-fields">
      <Field
        label="Address label"
        placeholder="Home or work"
        error={errors.label?.message}
        {...register('label')}
      />
      <Field
        label="Full name"
        autoComplete="name"
        error={errors.fullName?.message}
        {...register('fullName')}
      />
      <Field
        label="Phone number"
        type="tel"
        autoComplete="tel-national"
        inputMode="numeric"
        maxLength={10}
        error={errors.phone?.message}
        {...register('phone')}
      />
      <Field
        label="Street address"
        autoComplete="address-line1"
        error={errors.line1?.message}
        {...register('line1')}
      />
      <Field
        label="Apartment or landmark (optional)"
        autoComplete="address-line2"
        error={errors.line2?.message}
        {...register('line2')}
      />
      <div className="form-row">
        <Field
          label="City"
          autoComplete="address-level2"
          error={errors.city?.message}
          {...register('city')}
        />
        <Field
          label="State"
          autoComplete="address-level1"
          error={errors.state?.message}
          {...register('state')}
        />
      </div>
      <Field
        label="Pincode"
        inputMode="numeric"
        autoComplete="postal-code"
        maxLength={6}
        error={errors.pincode?.message}
        {...register('pincode')}
      />
      {defaultChoice && (
        <label className="filter-option">
          <input type="checkbox" {...register('isDefault')} /> Set as default
          address
        </label>
      )}
    </div>
  );
}

export function AddressLines({ address }) {
  return (
    <address className="address-lines">
      <strong>{address.fullName}</strong>
      <span>{[address.line1, address.line2].filter(Boolean).join(', ')}</span>
      <span>
        {address.city}, {address.state} {address.pincode}
      </span>
      <span>{address.phone}</span>
    </address>
  );
}

export function addressDefaults(user) {
  return {
    label: 'Home',
    fullName: user?.name ?? '',
    phone: user?.phone ?? '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
    isDefault: false,
  };
}
