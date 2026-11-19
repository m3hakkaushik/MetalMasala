import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { login, register as registerAccount } from '../api/auth';
import { loginSchema, registerSchema } from '../api/validation';
import { safeReturnTo } from '../app/Access';
import { Seo } from '../app/Seo';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { RequestError } from '../components/ui/Status';
import { mergeGuestBag } from '../features/cart/sessionCart';
import { useAuth } from '../stores/auth.store';
import { useUi } from '../stores/ui.store';

export default function Auth({ create = false }) {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const status = useAuth((state) => state.status);
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm({
    resolver: zodResolver(create ? registerSchema : loginSchema),
    defaultValues: { name: '', email: '', password: '' },
  });
  const next = safeReturnTo(search.get('returnTo'));
  const title = create ? 'Create an account' : 'Sign in';
  const alternate = create ? '/login' : '/register';

  async function submit(fields) {
    try {
      const response = await (create ? registerAccount(fields) : login(fields));
      const session = response.data;
      useAuth.getState().setSession(session);
      try {
        await mergeGuestBag(queryClient, session.user.id);
      } catch {
        useUi
          .getState()
          .announce('Signed in. Your guest bag is ready to sync.');
      }
      navigate(next, { replace: true });
    } catch (error) {
      setError('root.api', { message: error.message });
    }
  }

  if (status === 'authenticated' && !isSubmitting)
    return <Navigate to={next} replace />;

  return (
    <div className="site-width auth-page">
      <Seo title={title} />
      <div className="auth-panel">
        <h1>{title}</h1>
        <form className="form-stack" onSubmit={handleSubmit(submit)} noValidate>
          {create && (
            <Field
              label="Name"
              autoComplete="name"
              error={errors.name?.message}
              {...register('name')}
            />
          )}
          <Field
            label="Email address"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <Field
            label="Password"
            type="password"
            autoComplete={create ? 'new-password' : 'current-password'}
            error={errors.password?.message}
            {...register('password')}
          />
          {create && (
            <p className="form-help">
              Use at least eight characters, with a letter and a number.
            </p>
          )}
          {errors.root?.api && <RequestError error={errors.root.api} />}
          <Button
            type="submit"
            disabled={isSubmitting || status === 'checking'}
          >
            {isSubmitting ? 'Please wait…' : title}
          </Button>
        </form>
        <p>
          {create ? 'Already have an account?' : 'New to Metal मसाला?'}{' '}
          <Link
            className="text-link"
            to={`${alternate}?${new URLSearchParams({ returnTo: next })}`}
          >
            {create ? 'Sign in' : 'Create an account'}
          </Link>
        </p>
      </div>
    </div>
  );
}
