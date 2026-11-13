import { Seo } from '../app/Seo';
import { Button } from '../components/ui/Button';

export default function NotFound() {
  return (
    <div className="site-width empty-state">
      <Seo title="Page not found" />
      <h1>This page isn’t in the collection</h1>
      <p>Find your next piece in the shop.</p>
      <Button to="/shop">Explore the shop</Button>
    </div>
  );
}
