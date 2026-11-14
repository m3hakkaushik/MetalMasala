import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../stores/auth.store';
import { Button } from '../components/ui/Button';
import { Seo } from './Seo';

export function loginPath(location) {
  return `/login?${new URLSearchParams({ returnTo: location.pathname + location.search + location.hash })}`;
}

export function safeReturnTo(value) {
  if (
    !value ||
    !value.startsWith('/') ||
    /[\\]/.test(value) ||
    value.startsWith('//')
  )
    return '/account';
  const path = value.split(/[?#]/)[0].replace(/\/$/, '');
  return ['/login', '/register'].includes(path) ? '/account' : value;
}

export function RequireAuth() {
  const status = useAuth((state) => state.status);
  const location = useLocation();
  if (status === 'checking')
    return (
      <p className="site-width empty-state" role="status">
        Checking your session…
      </p>
    );
  if (status === 'guest') return <Navigate replace to={loginPath(location)} />;
  return <Outlet />;
}

export function RequireRole({ roles }) {
  const user = useAuth((state) => state.user);
  if (!roles.includes(user?.role)) {
    return (
      <div className="site-width empty-state">
        <Seo title="Access restricted" />
        <h1>Not for your account</h1>
        <p>Sign in with a permitted account to view this page.</p>
        <Button to="/account" variant="outline">
          Go to your account
        </Button>
        <Link className="text-link" to="/shop">
          Return to the shop
        </Link>
      </div>
    );
  }
  return <Outlet />;
}
