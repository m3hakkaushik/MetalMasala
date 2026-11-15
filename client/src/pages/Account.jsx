import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { logout } from '../api/auth';
import { getProfile } from '../api/users';
import { Seo } from '../app/Seo';
import { Button } from '../components/ui/Button';
import { RequestError } from '../components/ui/Status';
import {
  AccountOrders,
  AccountWishlist,
} from '../features/account/AccountLists';
import { Addresses } from '../features/account/Addresses';
import { Profile } from '../features/account/Profile';
import { useAuth } from '../stores/auth.store';

const tabs = {
  profile: 'Profile',
  orders: 'Orders',
  wishlist: 'Wishlist',
  addresses: 'Addresses',
};

export default function Account() {
  const user = useAuth((state) => state.user);
  const queryClient = useQueryClient();
  const [search] = useSearchParams();
  const current = search.get('tab');
  const tab = Object.hasOwn(tabs, current) ? current : 'profile';
  const needsProfile = tab === 'profile' || tab === 'addresses';
  const profile = useQuery({
    queryKey: ['profile', user.id],
    queryFn: ({ signal }) => getProfile(signal),
    enabled: needsProfile,
  });
  const signOut = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      useAuth.getState().clear();
      for (const key of [
        'cart',
        'orders',
        'order',
        'profile',
        'wishlist',
        'admin',
      ])
        queryClient.removeQueries({ queryKey: [key] });
      window.location.replace('/');
    },
  });
  return (
    <div className="site-width account-page">
      <Seo title={`${tabs[tab]} · Your account`} />
      <header className="panel-heading">
        <div>
          <h1>Your account</h1>
          <p>{user.name}</p>
        </div>
        <div className="form-actions">
          {user.role !== 'customer' && (
            <Button
              to={user.role === 'admin' ? '/admin' : '/admin/products'}
              variant="outline"
            >
              Manage store
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => signOut.mutate()}
            disabled={signOut.isPending}
          >
            Sign out
          </Button>
        </div>
      </header>
      {signOut.isError && <RequestError error={signOut.error} />}
      <nav className="account-tabs" aria-label="Account sections">
        {Object.entries(tabs).map(([key, title]) => (
          <Link
            key={key}
            to={key === 'profile' ? '/account' : `/account?tab=${key}`}
            aria-current={tab === key ? 'page' : undefined}
          >
            {title}
          </Link>
        ))}
      </nav>
      {needsProfile && profile.isPending && (
        <p role="status">Loading your account…</p>
      )}
      {needsProfile && profile.isError && (
        <RequestError error={profile.error} retry={profile.refetch} />
      )}
      {tab === 'profile' && profile.data && (
        <Profile profile={profile.data.data} />
      )}
      {tab === 'addresses' && profile.data && (
        <Addresses profile={profile.data.data} />
      )}
      {tab === 'orders' && <AccountOrders userId={user.id} />}
      {tab === 'wishlist' && <AccountWishlist userId={user.id} />}
    </div>
  );
}
