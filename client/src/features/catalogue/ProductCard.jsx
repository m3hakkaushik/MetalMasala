import { Link } from 'react-router-dom';
import { LOW_STOCK_THRESHOLD, money } from '../../api/catalogue';
import { SmartImage } from '../../components/ui/SmartImage';
import { Sticker } from '../../components/ui/Sticker';

export function ProductCard({ product }) {
  const [first, second] = product.images;
  const artwork = { category: product.category.slug, finish: product.finish };
  const label = !product.inStock
    ? 'Sold out'
    : product.isNewDrop
      ? 'New drop'
      : product.stock <= LOW_STOCK_THRESHOLD
        ? `Only ${product.stock} left`
        : product.discountPercent > 0
          ? `${product.discountPercent}% off`
          : null;

  return (
    <article className="product-card">
      <Link to={`/product/${product.slug}`} className="product-card__link">
        <div className="product-card__art">
          <SmartImage
            src={first?.url}
            alt={first?.alt ?? product.name}
            {...artwork}
          />
          {second && (
            <div className="product-card__hover" aria-hidden="true">
              <SmartImage
                src={second.url}
                alt={second.alt}
                view={1}
                {...artwork}
              />
            </div>
          )}
          {label && (
            <Sticker variant={product.inStock ? 'highlight' : 'neutral'}>
              {label}
            </Sticker>
          )}
        </div>
        <div className="product-card__body">
          <h3>{product.name}</h3>
          <p className="price">
            <span>{money(product.price)}</span>
            {product.compareAtPrice > product.price && (
              <s>{money(product.compareAtPrice)}</s>
            )}
          </p>
        </div>
      </Link>
    </article>
  );
}
