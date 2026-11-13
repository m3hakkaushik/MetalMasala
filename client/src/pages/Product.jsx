import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ChevronDown,
  Heart,
  ShoppingBag,
  Star,
  ZoomIn,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  FINISHES,
  LOW_STOCK_THRESHOLD,
  MATERIALS,
  money,
} from '../api/catalogue';
import { getProduct, getRelated } from '../api/products';
import { Seo } from '../app/Seo';
import { Button } from '../components/ui/Button';
import { Drawer } from '../components/ui/Drawer';
import { SmartImage } from '../components/ui/SmartImage';
import { RequestError } from '../components/ui/Status';
import { ProductCard } from '../features/catalogue/ProductCard';
import { Quantity } from '../features/catalogue/Quantity';
import { WishlistButton } from '../features/catalogue/WishlistButton';
import { Reviews } from '../features/catalogue/Reviews';
import { useBag } from '../features/cart/useBag';
import { flyToBag } from '../features/cart/flyToBag';
import { useUi } from '../stores/ui.store';

function Gallery({ product }) {
  const [selected, setSelected] = useState(0);
  const [zoom, setZoom] = useState(false);
  const touchStart = useRef(null);
  const pictures = product.images;
  const picture = pictures[selected];
  const artwork = { category: product.category.slug, finish: product.finish };
  function swipe(event) {
    if (touchStart.current === null) return;
    const distance = event.changedTouches[0].clientX - touchStart.current;
    touchStart.current = null;
    if (Math.abs(distance) > 48) {
      setSelected(
        (index) =>
          (index + (distance < 0 ? 1 : -1) + pictures.length) % pictures.length,
      );
    }
  }
  return (
    <div className="gallery">
      <button
        type="button"
        className="gallery__main"
        aria-label="Enlarge product image"
        onClick={() => setZoom(true)}
        onTouchStart={(event) => {
          touchStart.current = event.touches[0].clientX;
        }}
        onTouchEnd={swipe}
      >
        <SmartImage
          src={picture?.url}
          alt={picture?.alt ?? product.name}
          view={selected}
          eager
          {...artwork}
        />
        <span className="gallery__zoom" aria-hidden="true">
          <ZoomIn size={19} />
        </span>
      </button>
      <div
        className="gallery__thumbs"
        role="group"
        aria-label="Select a product view"
      >
        {pictures.map((item, index) => (
          <button
            key={item.url}
            type="button"
            aria-label={`View image ${index + 1}`}
            aria-pressed={selected === index}
            onClick={() => setSelected(index)}
          >
            <SmartImage
              src={item.url}
              alt={item.alt}
              view={index}
              {...artwork}
            />
          </button>
        ))}
      </div>
      <Drawer
        open={zoom}
        onClose={() => setZoom(false)}
        title="Product image"
        placement="center"
      >
        <SmartImage
          src={picture?.url}
          alt={picture?.alt ?? product.name}
          view={selected}
          eager
          {...artwork}
        />
      </Drawer>
    </div>
  );
}

function ProductDetails({ product }) {
  const [qty, setQty] = useState(1);
  const [addError, setAddError] = useState('');
  const [adding, setAdding] = useState(false);
  const bag = useBag();
  const inBag =
    bag.items.find(({ product: item }) => item.id === product.id)?.qty ?? 0;
  const openBag = useUi((state) => state.openBag);
  const announce = useUi((state) => state.announce);
  const { hash } = useLocation();
  const available = Math.max(0, product.stock - inBag);
  const selectedQty = Math.min(qty, Math.max(available, 1));
  const stockLabel = !product.inStock
    ? 'Sold out'
    : product.stock <= LOW_STOCK_THRESHOLD
      ? `Only ${product.stock} left`
      : 'In stock';
  const related = useQuery({
    queryKey: ['related', product.slug],
    queryFn: ({ signal }) => getRelated(product.slug, signal),
  });

  useEffect(() => {
    if (hash === '#reviews')
      document.getElementById('reviews')?.scrollIntoView();
  }, [hash]);

  async function addProduct() {
    setAdding(true);
    try {
      await bag.add(product, selectedQty);
      setAddError('');
      await flyToBag().catch(() => {});
      announce('Added to bag');
      openBag();
    } catch (error) {
      setAddError(error.message);
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="site-width product-page">
      <Seo title={product.name} description={product.tagline} />
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/shop">Shop</Link>
        <span aria-hidden="true">/</span>
        <Link to={`/shop/${product.category.slug}`}>
          {product.category.name}
        </Link>
      </nav>
      <div className="product-page__top">
        <Gallery product={product} />
        <div className="product-info">
          <div className="product-info__heading">
            <h1>{product.name}</h1>
            <WishlistButton productId={product.id} />
          </div>
          <p className="product-info__tagline">{product.tagline}</p>
          <div className="product-info__price price">
            <span>{money(product.price)}</span>
            {product.compareAtPrice > product.price && (
              <s>{money(product.compareAtPrice)}</s>
            )}
          </div>
          {product.ratingCount > 0 && (
            <a className="rating" href="#reviews">
              <Star size={16} fill="currentColor" aria-hidden="true" />
              {product.ratingAverage} out of 5 ({product.ratingCount} reviews)
            </a>
          )}
          <p
            className="stock-status"
            data-low={product.stock <= LOW_STOCK_THRESHOLD}
          >
            <span />
            {stockLabel}
          </p>
          <div className="product-tags">
            <span className="chip">
              {FINISHES[product.finish] ?? product.finish}
            </span>
            <span className="chip">
              {MATERIALS[product.material] ?? product.material}
            </span>
          </div>
          <div className="product-buy">
            <Quantity value={selectedQty} onChange={setQty} max={available} />
            <Button
              disabled={available === 0 || adding || bag.working || bag.loading}
              onClick={addProduct}
            >
              <ShoppingBag size={18} aria-hidden="true" />
              {available === 0
                ? product.inStock
                  ? 'All available stock in bag'
                  : 'Sold out'
                : 'Add to bag'}
            </Button>
          </div>
          {addError && (
            <p className="field-error" role="alert">
              {addError}
            </p>
          )}
          <div className="product-accordions">
            <details open>
              <summary>
                Details <ChevronDown size={18} />
              </summary>
              <p>{product.description}</p>
              <p>
                {product.details.weightGrams} g · {product.details.lengthMm} mm
              </p>
            </details>
            <details>
              <summary>
                Craft <ChevronDown size={18} />
              </summary>
              <p>
                {product.craft.artisan}, {product.craft.region}
              </p>
              <p>{product.craft.technique}</p>
            </details>
            <details>
              <summary>
                Shipping and returns <ChevronDown size={18} />
              </summary>
              <p>
                Standard shipping is ₹79. Shipping is free on orders of ₹999 and
                above. See{' '}
                <Link className="text-link" to="/shipping-returns">
                  shipping and returns
                </Link>
                .
              </p>
            </details>
            <details>
              <summary>
                Care <ChevronDown size={18} />
              </summary>
              <p>{product.details.care}</p>
            </details>
          </div>
        </div>
      </div>
      {!!related.data?.data.length && (
        <section className="related-products">
          <h2>Style it with</h2>
          <div className="product-rail">
            {related.data.data.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
      <Reviews productId={product.id} />
      <div className="mobile-buy">
        <span>{money(product.price)}</span>
        <Button
          disabled={available === 0 || adding || bag.working || bag.loading}
          onClick={addProduct}
        >
          {available === 0
            ? product.inStock
              ? 'In bag'
              : 'Sold out'
            : 'Add to bag'}
        </Button>
      </div>
    </div>
  );
}

export default function Product() {
  const { slug } = useParams();
  const query = useQuery({
    queryKey: ['product', slug],
    queryFn: ({ signal }) => getProduct(slug, signal),
  });
  if (query.isPending)
    return (
      <div className="site-width empty-state" role="status">
        Loading piece…
      </div>
    );
  if (query.error?.status === 404)
    return (
      <div className="site-width empty-state">
        <Seo title="Piece not found" />
        <Heart size={30} aria-hidden="true" />
        <h1>This piece isn’t in the collection</h1>
        <Button to="/shop" variant="outline">
          <ArrowLeft size={17} /> Back to the shop
        </Button>
      </div>
    );
  if (query.isError)
    return (
      <div className="site-width empty-state">
        <RequestError error={query.error} retry={query.refetch} />
      </div>
    );
  return <ProductDetails key={slug} product={query.data.data} />;
}
