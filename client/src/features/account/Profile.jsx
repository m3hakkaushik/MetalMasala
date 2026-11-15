import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { changePassword } from '../../api/auth';
import { updateProfile } from '../../api/users';
import { passwordSchema, profileSchema } from '../../api/validation';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { RequestError } from '../../components/ui/Status';
import { useAuth } from '../../stores/auth.store';
import { useUi } from '../../stores/ui.store';

export function Profile({ profile }) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: profile.name, phone: profile.phone ?? '' },
  });
  async function save(fields) {
    try {
      const response = await updateProfile(fields);
      const user = response.data ?? { ...profile, ...fields };
      useAuth.getState().setUser(user);
      queryClient.setQueryData(['profile', profile.id], { data: user });
      await queryClient.invalidateQueries({
        queryKey: ['profile', profile.id],
      });
      useUi.getState().announce('Profile saved');
    } catch (error) {
      setError('root.api', { message: error.message });
    }
  }
  return (
    <div className="account-columns">
      <section className="account-panel">
        <h2>Profile details</h2>
        <form className="form-stack" noValidate onSubmit={handleSubmit(save)}>
          <Field
            label="Name"
            autoComplete="name"
            error={errors.name?.message}
            {...register('name')}
          />
          <Field
            label="Email address"
            type="email"
            value={profile.email}
            readOnly
          />
          <Field
            label="Phone number"
            type="tel"
            maxLength={10}
            autoComplete="tel-national"
            inputMode="numeric"
            error={errors.phone?.message}
            {...register('phone')}
          />
          {errors.root?.api && <RequestError error={errors.root.api} />}
          <Button type="submit" disabled={isSubmitting}>
            Save profile
          </Button>
        </form>
      </section>
      <Password />
    </div>
  );
}

function Password() {
  const {
    register,
    reset,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '' },
  });
  async function save(fields) {
    try {
      const { data } = await changePassword(fields);
      if (data?.accessToken) useAuth.getState().setToken(data.accessToken);
      reset();
      useUi.getState().announce('Password updated');
    } catch (error) {
      setError('root.api', { message: error.message });
    }
  }
  return (
    <section className="account-panel">
      <h2>Change password</h2>
      <form className="form-stack" noValidate onSubmit={handleSubmit(save)}>
        <Field
          type="password"
          label="Current password"
          autoComplete="current-password"
          error={errors.currentPassword?.message}
          {...register('currentPassword')}
        />
        <Field
          type="password"
          label="New password"
          autoComplete="new-password"
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />
        <p className="form-help">
          Use at least eight characters, with a letter and a number.
        </p>
        {errors.root?.api && <RequestError error={errors.root.api} />}
        <Button type="submit" disabled={isSubmitting}>
          Change password
        </Button>
      </form>
    </section>
  );
}
