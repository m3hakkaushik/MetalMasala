import { ArrowUpRight } from 'lucide-react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { DropPublisher } from './DropPublisher';
import { useAuth } from '../../stores/auth.store';

export default function AdminShell() {
  const user = useAuth((state) => state.user);
  const links = [
    ...(user.role === 'admin' ? [['/admin', 'Overview']] : []),
    ['/admin/products', 'Products'],
    ['/admin/orders', 'Orders'],
    ...(user.role === 'admin' ? [['/admin/users', 'Users']] : []),
  ];
  return (
    <div className="admin-shell">
      <div className="admin-header dark-field">
        <div className="site-width">
          <div className="panel-heading">
            <div>
              <h1>Store management</h1>
              <p>
                {user.name} · {user.role === 'admin' ? 'Admin' : 'Manager'}
              </p>
            </div>
            <Link className="text-link" to="/shop">
              View storefront <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <nav
            className="account-tabs admin-tabs"
            aria-label="Store management"
          >
            {links.map(([path, label]) => (
              <NavLink key={path} to={path} end>
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
      <section
        className="site-width admin-content"
        aria-label="Store management content"
      >
        <DropPublisher />
        <Outlet />
      </section>
    </div>
  );
}
