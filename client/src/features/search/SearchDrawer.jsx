import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { money } from '../../api/catalogue';
import { getProducts } from '../../api/products';
import { Button } from '../../components/ui/Button';
import { Drawer } from '../../components/ui/Drawer';
import { RequestError } from '../../components/ui/Status';
import { useDebounce } from '../../hooks/useDebounce';

function SearchContents({ close }) {
  const [input, setInput] = useState('');
  const term = input.trim();
  const q = useDebounce(term);
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: ['products', { q, limit: 6 }],
    queryFn: ({ signal }) => getProducts({ q, limit: 6 }, signal),
    enabled: q.length > 0,
  });
  function submit(event) {
    event.preventDefault();
    close();
    navigate(term ? `/shop?${new URLSearchParams({ q: term })}` : '/shop');
  }
  return (
    <div className="drawer-padding form-stack">
      <form role="search" className="form-stack" onSubmit={submit}>
        <label htmlFor="quick-search">Search by name or style</label>
        <div className="join-row">
          <input
            id="quick-search"
            type="search"
            autoFocus
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Try jhumka or festive"
          />
          <Button type="submit">
            <Search size={18} aria-hidden="true" />{' '}
            <span className="sr-only">Submit search</span>
          </Button>
        </div>
      </form>
      {term && (term !== q || query.isPending) && (
        <p role="status">Searching…</p>
      )}
      {term === q && q && query.isError && (
        <RequestError error={query.error} retry={query.refetch} />
      )}
      {term === q && q && query.data && (
        <>
          {query.data.data.length > 0 ? (
            <ul className="quick-results">
              {query.data.data.map((product) => (
                <li key={product.id}>
                  <Link to={`/product/${product.slug}`} onClick={close}>
                    <span>{product.name}</span>
                    <strong>{money(product.price)}</strong>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p>No pieces match that search.</p>
          )}
          <Button
            variant="outline"
            to={`/shop?${new URLSearchParams({ q })}`}
            onClick={close}
          >
            See all results
          </Button>
        </>
      )}
    </div>
  );
}

export function SearchDrawer({ open, close }) {
  return (
    <Drawer open={open} onClose={close} title="Search jewellery">
      <SearchContents close={close} />
    </Drawer>
  );
}
