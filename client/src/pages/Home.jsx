import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ArrowUpRight, Sparkle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getCategories } from '../api/categories';
import { getProducts } from '../api/products';
import { getReviews } from '../api/reviews';
import { Seo } from '../app/Seo';
import { JewelleryArt } from '../components/ui/JewelleryArt';
import { SmartImage } from '../components/ui/SmartImage';
import { ProductSkeletons, RequestError } from '../components/ui/Status';
import { ProductCard } from '../features/catalogue/ProductCard';
import { ReviewCard } from '../features/catalogue/ReviewCard';
import { Hero } from '../features/home/Hero';
import { Newsletter } from '../features/home/Newsletter';

const occasions = [
  {
    name: 'College days',
    tag: 'college',
    finish: 'oxidized-black',
    art: 'rings',
  },
  {
    name: 'Sangeet nights',
    tag: 'wedding-guest',
    finish: 'antique-gold',
    art: 'maang-tikka',
  },
  {
    name: 'Office desi',
    tag: 'office-desi',
    finish: 'patina-green',
    art: 'chokers-necklaces',
  },
];

function SectionHeading({ children, link, to }) {
  return (
    <div className="section-heading">
      <h2>{children}</h2>
      {link && (
        <Link to={to} className="text-link">
          {link}
          <ArrowUpRight size={17} aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

export default function Home() {
  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: ({ signal }) => getCategories(signal),
  });
  const dropParams = { newDrop: 'true', limit: 6 };
  const drop = useQuery({
    queryKey: ['products', dropParams],
    queryFn: ({ signal }) => getProducts(dropParams, signal),
  });
  const products = drop.data?.data ?? [];
  const craft = products[0];
  const reviews = useQuery({
    queryKey: ['home-reviews', craft?.id],
    queryFn: ({ signal }) =>
      getReviews(craft.id, { limit: 3, sort: 'rating' }, signal),
    enabled: Boolean(craft?.ratingCount),
  });

  return (
    <>
      <Seo title="Handcrafted Indian jewellery" />
      <Hero />
      <section
        className="site-width home-section"
        aria-labelledby="browse-title"
      >
        <div className="section-heading">
          <h2 id="browse-title">Shop by piece</h2>
          <Link to="/shop" className="text-link">
            Explore the shop <ArrowUpRight size={17} aria-hidden="true" />
          </Link>
        </div>
        {categories.isPending && (
          <div className="category-loading" role="status">
            Loading collections…
          </div>
        )}
        {categories.isError && (
          <RequestError error={categories.error} retry={categories.refetch} />
        )}
        <div className="category-grid">
          {categories.data?.data.map((category, index) => (
            <Link
              className="category-tile"
              to={`/shop/${category.slug}`}
              key={category.id}
            >
              <span className="category-tile__medallion" data-color={index % 4}>
                <JewelleryArt
                  category={category.slug}
                  finish={index % 4 === 1 ? 'antique-gold' : 'oxidized-silver'}
                  single
                />
              </span>
              <span>{category.name}</span>
              <span lang="hi">{category.nameHi}</span>
            </Link>
          ))}
        </div>
      </section>
      <section className="site-width home-section new-drop">
        <SectionHeading link="Browse the drop" to="/shop?newDrop=true">
          Fresh off the bench
        </SectionHeading>
        {drop.isPending && <ProductSkeletons />}
        {drop.isError && (
          <RequestError error={drop.error} retry={drop.refetch} />
        )}
        <div className="product-rail">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
      {craft && (
        <section className="craft-feature site-width">
          <div className="craft-feature__face">
            <Sparkle size={30} strokeWidth={1.3} aria-hidden="true" />
            <p className="craft-feature__note">{craft.craft.region}</p>
            <h2>Made by hand</h2>
            <dl>
              <div>
                <dt>Studio</dt>
                <dd>{craft.craft.artisan}</dd>
              </div>
              <div>
                <dt>Technique</dt>
                <dd>{craft.craft.technique}</dd>
              </div>
            </dl>
            <Link to={`/product/${craft.slug}`} className="text-link">
              See the piece <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
          </div>
          <SmartImage
            src={craft.images[1]?.url}
            alt={craft.images[1]?.alt ?? craft.name}
            category={craft.category.slug}
            finish={craft.finish}
            view={1}
          />
        </section>
      )}
      <section className="site-width home-section">
        <SectionHeading>How to style it</SectionHeading>
        <div className="lookbook">
          {occasions.map((occasion) => (
            <Link
              key={occasion.tag}
              to={`/shop?tags=${occasion.tag}`}
              className="lookbook__tile"
            >
              <SmartImage
                alt={`${occasion.name} jewellery`}
                category={occasion.art}
                finish={occasion.finish}
              />
              <span>
                {occasion.name} <ArrowRight size={19} aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
      </section>
      {!!reviews.data?.data.length && (
        <section className="site-width home-section home-reviews">
          <SectionHeading
            link="Read the reviews"
            to={`/product/${craft.slug}#reviews`}
          >
            Worn and loved
          </SectionHeading>
          <div className="review-grid">
            {reviews.data.data.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        </section>
      )}
      <Newsletter />
    </>
  );
}
