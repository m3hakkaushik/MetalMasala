import { Menu, Search, ShoppingBag, Sparkle, UserRound, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Drawer } from '../components/ui/Drawer';
import { BagDrawer } from '../features/cart/BagDrawer';
import { useBag } from '../features/cart/useBag';
import { SearchDrawer } from '../features/search/SearchDrawer';
import { Stylist } from '../features/stylist/Stylist';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../stores/auth.store';
import { useUi } from '../stores/ui.store';

const links = [
  { to: '/shop', label: 'Shop all' },
  { to: '/shop?newDrop=true', label: 'New drop' },
  { to: '/shop/jhumkas', label: 'Jhumkas' },
  { to: '/shop/gift-combos', label: 'Gift combos' },
];
const infoLinks = [
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
  { to: '/faq', label: 'FAQ' },
  { to: '/shipping-returns', label: 'Shipping and returns' },
];

function Brand() {
  return (
    <Link to="/" className="brand">
      Metal <span lang="hi">मसाला</span>
    </Link>
  );
}

function Navigation({ onSelect }) {
  const { pathname, search } = useLocation();
  return links.map(({ to, label }) => {
    const active = pathname + search === to;
    return (
      <Link
        key={to}
        to={to}
        aria-current={active ? 'page' : undefined}
        className={active ? 'nav-current' : undefined}
        onClick={onSelect}
      >
        {label}
      </Link>
    );
  });
}

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { count } = useBag();
  const user = useAuth((state) => state.user);
  const openBag = useUi((state) => state.openBag);
  const accountUrl = user ? '/account' : '/login';
  const accountLabel = user ? 'Your account' : 'Sign in';

  useEffect(() => {
    function openSearch(event) {
      if (event.defaultPrevented || document.querySelector('dialog[open]'))
        return;
      const editing =
        event.target instanceof Element &&
        event.target.closest(
          'input, textarea, select, [contenteditable="true"]',
        );
      const shortcut =
        (event.key === '/' && !editing) ||
        ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k');
      if (!shortcut) return;
      event.preventDefault();
      setSearchOpen(true);
    }
    document.addEventListener('keydown', openSearch);
    return () => document.removeEventListener('keydown', openSearch);
  }, []);

  return (
    <header className="site-header dark-field">
      <div className="shipping-banner">
        <Sparkle size={13} fill="currentColor" aria-hidden="true" />
        Free shipping on orders ₹999 and above{' '}
        <Sparkle size={13} fill="currentColor" aria-hidden="true" />
      </div>
      <div className="site-width header-row">
        <button
          type="button"
          className="icon-button header-menu"
          aria-label="Open menu"
          aria-haspopup="dialog"
          onClick={() => setMenuOpen(true)}
        >
          <Menu size={21} />
        </button>
        <Brand />
        <nav className="desktop-navigation" aria-label="Main navigation">
          <Navigation />
        </nav>
        <div className="header-actions">
          <button
            type="button"
            className="icon-button"
            aria-label="Search"
            aria-haspopup="dialog"
            aria-keyshortcuts="/ Meta+K Control+K"
            onClick={() => setSearchOpen(true)}
          >
            <Search size={20} />
          </button>
          <Link
            to={accountUrl}
            className="icon-button header-account"
            aria-label={accountLabel}
          >
            <UserRound size={20} />
          </Link>
          <button
            type="button"
            className="icon-button bag-trigger"
            aria-label={`Open bag, ${count} ${count === 1 ? 'item' : 'items'}`}
            aria-haspopup="dialog"
            onClick={openBag}
          >
            <ShoppingBag size={21} />
            <span aria-hidden="true">{count}</span>
          </button>
        </div>
      </div>
      <Drawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title="Explore the shop"
      >
        <nav className="mobile-navigation" aria-label="Main navigation">
          <Navigation onSelect={() => setMenuOpen(false)} />
          <Link to={accountUrl} onClick={() => setMenuOpen(false)}>
            {accountLabel}
          </Link>
          {infoLinks.map(({ to, label }) => (
            <Link key={to} to={to} onClick={() => setMenuOpen(false)}>
              {label}
            </Link>
          ))}
        </nav>
      </Drawer>
      <SearchDrawer open={searchOpen} close={() => setSearchOpen(false)} />
    </header>
  );
}

function Footer() {
  return (
    <footer className="site-footer dark-field">
      <div className="site-width footer-row">
        <div>
          <Brand />
          <p>Handcrafted Indian jewellery.</p>
        </div>
        <nav aria-label="Footer navigation">
          {infoLinks.map(({ to, label }) => (
            <Link key={to} to={to}>
              {label}
            </Link>
          ))}
          <Link to="/cart">Your bag</Link>
        </nav>
      </div>
      <div className="site-width footer-base">
        <span>© {new Date().getFullYear()} Metal मसाला</span>
        <span>India · INR ₹</span>
      </div>
    </footer>
  );
}

function DropAnnouncement() {
  const [drop, setDrop] = useState(null);
  const subscribe = useCallback((socket) => {
    socket.on('drop:announce', setDrop);
    return () => {
      socket.off('drop:announce', setDrop);
    };
  }, []);
  useSocket('/', subscribe);
  if (!drop) return null;
  return (
    <aside
      className="site-width drop-announcement"
      aria-label="New drop announcement"
    >
      <div role="status">
        <strong>{drop.title}</strong> {drop.message}{' '}
        {drop.productSlug && (
          <Link className="text-link" to={`/product/${drop.productSlug}`}>
            See the piece
          </Link>
        )}
      </div>
      <button
        type="button"
        className="icon-button"
        aria-label="Dismiss announcement"
        onClick={() => setDrop(null)}
      >
        <X size={18} />
      </button>
    </aside>
  );
}

export function Layout() {
  const { pathname, hash } = useLocation();
  const notice = useUi((state) => state.notice);
  const announce = useUi((state) => state.announce);

  useEffect(() => {
    if (!hash) window.scrollTo(0, 0);
  }, [pathname, hash]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => announce(''), 3500);
    return () => window.clearTimeout(timer);
  }, [notice, announce]);

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Header />
      <DropAnnouncement />
      <main id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
      <BagDrawer />
      {!pathname.startsWith('/admin') && !pathname.startsWith('/checkout') && (
        <Stylist />
      )}
      <div className={notice ? 'toast' : 'sr-only'} aria-live="polite">
        {notice}
      </div>
    </>
  );
}
