import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Home from '../pages/Home';
import NotFound from '../pages/NotFound';
import { RequireAuth, RequireRole } from './Access';
import { Layout } from './Layout';

const Shop = lazy(() => import('../pages/Shop'));
const Product = lazy(() => import('../pages/Product'));
const Cart = lazy(() => import('../pages/Cart'));
const Auth = lazy(() => import('../pages/Auth'));
const Checkout = lazy(() => import('../pages/Checkout'));
const Account = lazy(() => import('../pages/Account'));
const TrackOrder = lazy(async () => ({
  default: (await import('../pages/Order')).TrackOrder,
}));
const OrderConfirmed = lazy(async () => ({
  default: (await import('../pages/Order')).OrderConfirmed,
}));
const About = lazy(async () => ({
  default: (await import('../pages/Info')).About,
}));
const Contact = lazy(async () => ({
  default: (await import('../pages/Info')).Contact,
}));
const Faq = lazy(async () => ({
  default: (await import('../pages/Info')).Faq,
}));
const Shipping = lazy(async () => ({
  default: (await import('../pages/Info')).Shipping,
}));
const Admin = lazy(() => import('../features/admin/AdminShell'));
const AdminProducts = lazy(() => import('../features/admin/AdminProducts'));
const AdminOrders = lazy(() => import('../features/admin/AdminOrders'));
const AdminDashboard = lazy(() => import('../features/admin/AdminDashboard'));
const AdminUsers = lazy(() => import('../features/admin/AdminUsers'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: (count, error) =>
        count === 0 && (!error.status || error.status >= 500),
    },
  },
});

export function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Suspense
            fallback={
              <div className="site-width empty-state" role="status">
                Loading…
              </div>
            }
          >
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="shop" element={<Shop />} />
                <Route path="shop/:categorySlug" element={<Shop />} />
                <Route path="product/:slug" element={<Product />} />
                <Route path="cart" element={<Cart />} />
                <Route path="login" element={<Auth key="login" />} />
                <Route
                  path="register"
                  element={<Auth key="register" create />}
                />
                <Route path="about" element={<About />} />
                <Route path="contact" element={<Contact />} />
                <Route path="faq" element={<Faq />} />
                <Route path="shipping-returns" element={<Shipping />} />
                <Route element={<RequireAuth />}>
                  <Route path="checkout" element={<Checkout />} />
                  <Route path="account" element={<Account />} />
                  <Route path="orders/:id" element={<TrackOrder />} />
                  <Route
                    path="order/confirmed/:id"
                    element={<OrderConfirmed />}
                  />
                  <Route element={<RequireRole roles={['admin', 'manager']} />}>
                    <Route path="admin" element={<Admin />}>
                      <Route path="products" element={<AdminProducts />} />
                      <Route path="orders" element={<AdminOrders />} />
                      <Route element={<RequireRole roles={['admin']} />}>
                        <Route index element={<AdminDashboard />} />
                        <Route path="users" element={<AdminUsers />} />
                      </Route>
                    </Route>
                  </Route>
                </Route>
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}
