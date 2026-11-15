import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { createAddress, deleteAddress, updateAddress } from '../../api/users';
import { addressSchema } from '../../api/validation';
import { Button } from '../../components/ui/Button';
import { Drawer } from '../../components/ui/Drawer';
import { RequestError } from '../../components/ui/Status';
import { useUi } from '../../stores/ui.store';
import { AddressFields, AddressLines, addressDefaults } from './AddressFields';

function AddressForm({ profile, address, onClose, onSaved }) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(addressSchema),
    defaultValues: { ...addressDefaults(profile), ...address },
  });
  async function submit(data) {
    try {
      await (address?.id
        ? updateAddress(address.id, data)
        : createAddress(data));
      await onSaved();
      onClose();
      useUi.getState().announce('Address saved');
    } catch (error) {
      setError('root.api', { message: error.message });
    }
  }
  return (
    <form
      className="drawer-padding form-stack"
      noValidate
      onSubmit={handleSubmit(submit)}
    >
      <AddressFields register={register} errors={errors} defaultChoice />
      {errors.root?.api && <RequestError error={errors.root.api} />}
      <Button type="submit" disabled={isSubmitting}>
        Save address
      </Button>
    </form>
  );
}

export function Addresses({ profile }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);
  const reload = () =>
    queryClient.invalidateQueries({ queryKey: ['profile', profile.id] });
  const change = useMutation({
    mutationFn: ({ id, erase }) =>
      erase ? deleteAddress(id) : updateAddress(id, { isDefault: true }),
    onSuccess: async () => {
      setRemoving(null);
      await reload();
    },
  });
  return (
    <section className="account-panel">
      <div className="panel-heading">
        <h2>Saved addresses</h2>
        <Button
          variant="outline"
          onClick={() => setEditing({})}
          disabled={profile.addresses.length >= 5}
        >
          Add address
        </Button>
      </div>
      {!profile.addresses.length && <p>No addresses saved yet.</p>}
      {profile.addresses.length >= 5 && (
        <p className="form-help">
          Your address book has all five slots filled.
        </p>
      )}
      {change.isError && !removing && <RequestError error={change.error} />}
      <div className="account-columns">
        {profile.addresses.map((address) => (
          <article className="address-card" key={address.id}>
            <h3>
              {address.label}{' '}
              {address.isDefault && <span className="chip">Default</span>}
            </h3>
            <AddressLines address={address} />
            <div className="form-actions">
              <button className="text-link" onClick={() => setEditing(address)}>
                Edit {address.label}
              </button>
              {!address.isDefault && (
                <button
                  className="text-link"
                  disabled={change.isPending}
                  onClick={() => change.mutate({ id: address.id })}
                >
                  Make default
                </button>
              )}
              <button
                className="text-link"
                onClick={() => setRemoving(address)}
              >
                Remove {address.label}
              </button>
            </div>
          </article>
        ))}
      </div>
      <Drawer
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Edit address' : 'Add address'}
      >
        <AddressForm
          key={editing?.id ?? 'new'}
          address={editing}
          profile={profile}
          onClose={() => setEditing(null)}
          onSaved={reload}
        />
      </Drawer>
      <Drawer
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        title="Remove this address?"
        placement="center"
      >
        <div className="drawer-padding form-stack">
          <p>{removing?.label} will be removed from your address book.</p>
          {change.isError && <RequestError error={change.error} />}
          <div className="form-actions">
            <Button variant="outline" onClick={() => setRemoving(null)}>
              Keep address
            </Button>
            <Button
              disabled={change.isPending}
              onClick={() => change.mutate({ id: removing.id, erase: true })}
            >
              Remove address
            </Button>
          </div>
        </div>
      </Drawer>
    </section>
  );
}
