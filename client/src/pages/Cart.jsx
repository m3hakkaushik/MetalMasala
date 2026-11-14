import { Seo } from '../app/Seo';
import { Bag } from '../features/cart/Bag';

export default function Cart() {
  return (
    <div className="site-width cart-page">
      <Seo title="Your bag" />
      <h1>Your bag</h1>
      <Bag />
    </div>
  );
}
