import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCart = create(
  persist(
    (set, get) => ({
      items: [],
      add(product, qty) {
        const current = get().items.find(
          (line) => line.product.id === product.id,
        );
        if ((current?.qty ?? 0) + qty > product.stock) return false;
        const snapshot = {
          id: product.id,
          name: product.name,
          slug: product.slug,
          price: product.price,
          stock: product.stock,
          category: product.category.slug,
          finish: product.finish,
          image: product.images[0]?.url,
        };
        set(({ items }) => ({
          items: current
            ? items.map((line) =>
                line === current
                  ? { product: snapshot, qty: line.qty + qty }
                  : line,
              )
            : [...items, { product: snapshot, qty }],
        }));
        return true;
      },
      removeMerged(merged) {
        const quantities = new Map(
          merged.map(({ productId, qty }) => [productId, qty]),
        );
        set(({ items }) => ({
          items: items.flatMap((line) => {
            const qty = line.qty - (quantities.get(line.product.id) ?? 0);
            return qty > 0 ? [{ ...line, qty }] : [];
          }),
        }));
      },
      setQty(id, qty) {
        set(({ items }) => ({
          items: items.flatMap((line) => {
            if (line.product.id !== id) return [line];
            if (qty <= 0) return [];
            return [{ ...line, qty: Math.min(qty, line.product.stock) }];
          }),
        }));
      },
    }),
    { name: 'metal-masala:guest-bag:v1' },
  ),
);

export const countBag = (items) =>
  items.reduce((sum, line) => sum + line.qty, 0);
export const subtotalBag = (items) =>
  items.reduce((sum, line) => sum + line.product.price * line.qty, 0);
