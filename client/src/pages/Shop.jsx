import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { ArrowRight, Search, SlidersHorizontal, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { FINISHES, MATERIALS, SORTS, VIBES } from '../api/catalogue';
import { getCategories } from '../api/categories';
import { getFacets, getProducts } from '../api/products';
import { Seo } from '../app/Seo';
import { Button } from '../components/ui/Button';
import { Drawer } from '../components/ui/Drawer';
import { ProductSkeletons, RequestError } from '../components/ui/Status';
import { ProductCard } from '../features/catalogue/ProductCard';

const priceKeys = ['minPrice', 'maxPrice'];
const filterKeys = [
  'q',
  'category',
  ...priceKeys,
  'finish',
  'material',
  'tags',
  'inStock',
  'featured',
  'newDrop',
  'sort',
];
const titles = {
  category: 'Piece',
  finish: 'Finish',
  material: 'Material',
  tags: 'Vibe',
};
const flags = {
  inStock: 'In stock',
  featured: 'Featured',
  newDrop: 'New drop',
};

function optionsFromFacet(labels, facet = [], key = 'value') {
  const counts = new Map(facet.map((entry) => [entry[key], entry.count]));
  const options = new Map(Object.entries(labels));
  for (const value of counts.keys()) {
    if (!options.has(value)) {
      options.set(
        value,
        value
          .replaceAll('-', ' ')
          .replace(/^./, (letter) => letter.toUpperCase()),
      );
    }
  }
  return [...options].map(([value, label]) => ({
    value,
    label,
    count: counts.get(value),
  }));
}

function Filters({
  selection,
  categorySlug,
  categories,
  facets,
  search,
  setParams,
  idPrefix,
}) {
  const [priceError, setPriceError] = useState('');
  const groups = {
    category: optionsFromFacet(categories, facets?.categories, 'slug'),
    finish: optionsFromFacet(FINISHES, facets?.finishes),
    material: optionsFromFacet(MATERIALS, facets?.materials),
    tags: optionsFromFacet(VIBES, facets?.tags),
  };

  function changeChoice(key, value) {
    const values = selection[key]?.split(',').filter(Boolean) ?? [];
    const nextValues = values.includes(value)
      ? values.filter((item) => item !== value)
      : [...values, value];
    setParams({ [key]: nextValues.join(',') });
  }

  function changePrice(event) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const min = values.get('minPrice');
    const max = values.get('maxPrice');
    if (min && max && Number(min) > Number(max)) {
      setPriceError('Maximum price must be at least the minimum.');
      return;
    }
    setPriceError('');
    setParams({ minPrice: min, maxPrice: max });
  }

  return (
    <div className="filter-list">
      <fieldset>
        <legend>Availability</legend>
        <label className="filter-option">
          <input
            checked={search.get('inStock') === 'true'}
            type="checkbox"
            onChange={(event) =>
              setParams({ inStock: event.target.checked ? 'true' : '' })
            }
          />
          In stock
        </label>
      </fieldset>
      <form
        className="price-filter"
        key={priceKeys.map((key) => search.get(key)).join(':')}
        onSubmit={changePrice}
      >
        <fieldset>
          <legend>Price</legend>
          <div className="price-filter__range">
            {priceKeys.map((key, index) => (
              <label key={key} htmlFor={`${idPrefix}-${key}`}>
                {index === 0 ? 'Min (₹)' : 'Max (₹)'}
                <input
                  id={`${idPrefix}-${key}`}
                  name={key}
                  type="number"
                  min="0"
                  step="1"
                  defaultValue={search.get(key) ?? ''}
                  placeholder={
                    index === 0 ? facets?.price.min : facets?.price.max
                  }
                />
              </label>
            ))}
          </div>
          {priceError && (
            <p role="alert" className="field-error">
              {priceError}
            </p>
          )}
          <Button type="submit" variant="outline">
            Apply price
          </Button>
        </fieldset>
      </form>
      {Object.entries(groups)
        .filter(([key]) => !(key === 'category' && categorySlug))
        .map(([key, options]) => (
          <fieldset key={key}>
            <legend>{titles[key]}</legend>
            {options.map(({ value, label, count }) => (
              <label key={value} className="filter-option">
                <input
                  type="checkbox"
                  checked={selection[key]?.split(',').includes(value) ?? false}
                  onChange={() => changeChoice(key, value)}
                />
                {label} {count !== undefined && <small>{count}</small>}
              </label>
            ))}
          </fieldset>
        ))}
    </div>
  );
}

export default function Shop() {
  const { categorySlug } = useParams();
  const [search, updateSearch] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const categoryData = useQuery({
    queryKey: ['categories'],
    queryFn: ({ signal }) => getCategories(signal),
  });
  const categories = Object.fromEntries(
    (categoryData.data?.data ?? []).map(({ slug, name }) => [slug, name]),
  );
  const category = (categoryData.data?.data ?? []).find(
    ({ slug }) => slug === categorySlug,
  );
  const title = category?.name ?? 'Shop all jewellery';
  const filters = Object.fromEntries(
    filterKeys
      .filter((key) => search.get(key))
      .map((key) => [key, search.get(key)]),
  );
  if (categorySlug) filters.category = categorySlug;
  const { sort: sortValue, ...facetParams } = filters;
  const sort = sortValue || 'newest';

  function setParams(patch) {
    const next = new URLSearchParams(search);
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    updateSearch(next);
  }

  const catalogue = useInfiniteQuery({
    queryKey: ['shop', filters],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      getProducts({ ...filters, page: pageParam, limit: 12 }, signal),
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasNext ? lastPage.meta.page + 1 : undefined,
  });
  const facetQuery = useQuery({
    queryKey: ['facets', facetParams],
    queryFn: ({ signal }) => getFacets(facetParams, signal),
  });
  const filterProps = {
    selection: filters,
    categorySlug,
    categories,
    facets: facetQuery.data?.data,
    search,
    setParams,
  };
  const products = catalogue.data?.pages.flatMap((page) => page.data) ?? [];
  const total = catalogue.data?.pages[0]?.meta.total;
  const namedOptions = {
    category: categories,
    finish: FINISHES,
    material: MATERIALS,
    tags: VIBES,
  };
  const chips = Object.entries(namedOptions).flatMap(([key, labels]) => {
    if (key === 'category' && categorySlug) return [];
    const selections = filters[key]?.split(',') ?? [];
    return selections.map((value) => ({
      key: `${key}:${value}`,
      label: labels[value] ?? value,
      remove: () =>
        setParams({
          [key]: selections.filter((item) => item !== value).join(','),
        }),
    }));
  });
  for (const [key, label] of Object.entries(flags)) {
    if (filters[key])
      chips.push({ key, label, remove: () => setParams({ [key]: '' }) });
  }
  if (filters.q)
    chips.push({
      key: 'q',
      label: `Search: ${filters.q}`,
      remove: () => setParams({ q: '' }),
    });
  for (const key of priceKeys) {
    if (filters[key])
      chips.push({
        key,
        label: `${key === 'minPrice' ? 'From' : 'Up to'} ₹${filters[key]}`,
        remove: () => setParams({ [key]: '' }),
      });
  }

  function searchCatalogue(event) {
    event.preventDefault();
    setParams({ q: String(new FormData(event.currentTarget).get('q')).trim() });
  }

  return (
    <>
      <Seo title={title} description={category?.description} />
      <section className="shop-banner">
        <div className="site-width">
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span aria-hidden="true">/</span>
            {categorySlug && (
              <>
                <Link to="/shop">Shop</Link>
                <span aria-hidden="true">/</span>
              </>
            )}
            <span aria-current="page">{category?.name ?? 'Shop'}</span>
          </nav>
          <h1>{title}</h1>
          <p>
            {category?.description ??
              'Find handcrafted pieces for every kind of day.'}
          </p>
        </div>
      </section>
      <div className="shop site-width">
        <aside className="shop__filters" aria-label="Filter jewellery">
          <h2>Filters</h2>
          <Filters key={categorySlug} {...filterProps} idPrefix="desktop" />
        </aside>
        <section className="shop__results" aria-label="Shop results">
          <div className="shop-toolbar">
            <form
              className="shop-search"
              role="search"
              key={filters.q ?? ''}
              onSubmit={searchCatalogue}
            >
              <input
                type="search"
                name="q"
                defaultValue={filters.q ?? ''}
                aria-label="Search the shop"
                placeholder="Search the shop"
              />
              <button
                type="submit"
                className="icon-button"
                aria-label="Submit search"
              >
                <Search size={19} />
              </button>
            </form>
            <div className="shop-toolbar__actions">
              <Button
                variant="outline"
                className="mobile-filters"
                aria-haspopup="dialog"
                onClick={() => setFiltersOpen(true)}
              >
                <SlidersHorizontal size={17} aria-hidden="true" /> Filters
              </Button>
              <label className="sort-label">
                Sort by
                <select
                  value={sort}
                  onChange={(event) =>
                    setParams({
                      sort:
                        event.target.value === 'newest'
                          ? ''
                          : event.target.value,
                    })
                  }
                >
                  {Object.entries(SORTS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          {chips.length > 0 && (
            <div className="active-filters" aria-label="Active filters">
              {chips.map(({ key, label, remove }) => (
                <button
                  key={key}
                  className="chip"
                  type="button"
                  onClick={remove}
                  aria-label={`Remove ${label}`}
                >
                  {label} <X size={14} aria-hidden="true" />
                </button>
              ))}
              <button
                type="button"
                className="text-link"
                onClick={() =>
                  updateSearch(sortValue ? { sort: sortValue } : {})
                }
              >
                Clear filters
              </button>
            </div>
          )}
          {total !== undefined && (
            <p className="shop-count" aria-live="polite">
              {total} {total === 1 ? 'piece' : 'pieces'}
            </p>
          )}
          {catalogue.isPending && <ProductSkeletons count={6} />}
          {catalogue.isError && (
            <RequestError error={catalogue.error} retry={catalogue.refetch} />
          )}
          {catalogue.isSuccess && products.length === 0 && (
            <div className="empty-state">
              <h2>No pieces match</h2>
              <p>Try a different search or clear your filters.</p>
              <Button
                variant="outline"
                to={categorySlug ? `/shop/${categorySlug}` : '/shop'}
              >
                Clear filters
              </Button>
            </div>
          )}
          <div className="product-grid">
            {products.map((product) => (
              <ProductCard product={product} key={product.id} />
            ))}
          </div>
          {catalogue.hasNextPage && (
            <div className="load-more">
              <Button
                variant="outline"
                disabled={catalogue.isFetchingNextPage}
                onClick={() => catalogue.fetchNextPage()}
              >
                {catalogue.isFetchingNextPage ? 'Loading…' : 'Load more'}{' '}
                <ArrowRight size={17} aria-hidden="true" />
              </Button>
            </div>
          )}
        </section>
      </div>
      <Drawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filter jewellery"
        placement="bottom"
      >
        <div className="filter-drawer__content">
          <Filters {...filterProps} idPrefix="mobile" />
        </div>
        <div className="filter-drawer__footer">
          <Button onClick={() => setFiltersOpen(false)}>Show pieces</Button>
        </div>
      </Drawer>
    </>
  );
}
