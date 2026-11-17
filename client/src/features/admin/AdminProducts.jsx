import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { deleteProduct } from '../../api/admin';
import { money } from '../../api/catalogue';
import { getCategories } from '../../api/categories';
import { getProducts } from '../../api/products';
import { Seo } from '../../app/Seo';
import { Button } from '../../components/ui/Button';
import { Drawer } from '../../components/ui/Drawer';
import { Field } from '../../components/ui/Field';
import { Pager } from '../../components/ui/Pager';
import { RequestError } from '../../components/ui/Status';
import { useDebounce } from '../../hooks/useDebounce';
import { useAuth } from '../../stores/auth.store';
import { useUi } from '../../stores/ui.store';
import { ProductForm } from './ProductForm';

export default function AdminProducts() {
  const id = useAuth((state) => state.user.id);
  const admin = useAuth((state) => state.user.role === 'admin');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);
  const q = useDebounce(search.trim());
  const queryClient = useQueryClient();
  const products = useQuery({
    queryKey: ['admin', id, 'products', page, q],
    queryFn: ({ signal }) => getProducts({ page, q, limit: 12 }, signal),
  });
  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: ({ signal }) => getCategories(signal),
  });
  async function refresh() {
    for (const key of [
      'admin',
      'products',
      'shop',
      'product',
      'facets',
      'related',
      'categories',
      'wishlist',
      'cart',
    ]) {
      void queryClient.invalidateQueries({ queryKey: [key] });
    }
  }
  const remove = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      setRemoving(null);
      if (page > 1 && products.data?.data.length === 1) setPage(page - 1);
      void refresh();
      useUi.getState().announce('Product removed');
    },
  });
  return (
    <>
      <Seo title="Manage products" />
      <div className="panel-heading">
        <h2>Products</h2>
        <Button onClick={() => setEditing({})} disabled={!categories.data}>
          Add product
        </Button>
      </div>
      <div className="admin-filters">
        <Field
          label="Search products"
          type="search"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
      </div>
      {products.isPending && <p role="status">Loading products…</p>}
      {products.isError && (
        <RequestError error={products.error} retry={products.refetch} />
      )}
      {categories.isError && (
        <RequestError error={categories.error} retry={categories.refetch} />
      )}
      {products.data && (
        <>
          <div
            className="table-wrap"
            tabIndex={0}
            role="region"
            aria-label="Product table"
          >
            <table>
              <thead>
                <tr>
                  <th scope="col">Product</th>
                  <th scope="col">Category</th>
                  <th scope="col">SKU</th>
                  <th scope="col">Price</th>
                  <th scope="col">Stock</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.data.data.map((product) => (
                  <tr key={product.id}>
                    <th scope="row">
                      <Link
                        className="text-link"
                        to={`/product/${product.slug}`}
                      >
                        {product.name}
                      </Link>
                    </th>
                    <td>{product.category.name}</td>
                    <td>{product.sku}</td>
                    <td>{money(product.price)}</td>
                    <td>{product.stock || 'Sold out'}</td>
                    <td>
                      <div className="form-actions">
                        <button
                          className="text-link"
                          type="button"
                          onClick={() => setEditing(product)}
                          disabled={!categories.data}
                          aria-label={`Edit ${product.name}`}
                        >
                          Edit
                        </button>
                        {admin && (
                          <button
                            className="text-link delete-link"
                            type="button"
                            onClick={() => setRemoving(product)}
                            aria-label={`Delete ${product.name}`}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {products.data.data.length === 0 && (
                  <tr>
                    <td colSpan={6}>No products match this search.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pager meta={products.data.meta} onPage={setPage} />
        </>
      )}
      <Drawer
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Edit product' : 'Add product'}
        placement="wide"
      >
        {editing && categories.data && (
          <ProductForm
            key={editing.id ?? 'new'}
            product={editing.id ? editing : undefined}
            categories={categories.data.data}
            saved={async () => {
              setEditing(null);
              void refresh();
              useUi.getState().announce('Product saved');
            }}
          />
        )}
      </Drawer>
      <Drawer
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        title="Delete this product?"
        placement="center"
      >
        <div className="drawer-padding form-stack">
          <p>{removing?.name} will be removed from the shop.</p>
          {remove.isError && <RequestError error={remove.error} />}
          <div className="form-actions">
            <Button variant="outline" onClick={() => setRemoving(null)}>
              Keep product
            </Button>
            <Button
              onClick={() => remove.mutate(removing.id)}
              disabled={remove.isPending}
            >
              Delete product
            </Button>
          </div>
        </div>
      </Drawer>
    </>
  );
}
