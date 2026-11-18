import { createHash } from 'node:crypto';
import { productService } from '../services/product.service.js';
import { sendSuccess } from '../utils/response.js';

function sendCached(req, res, data, meta) {
  // [L2] [L11] The validator includes list metadata so pagination changes invalidate cached responses.
  const payload = meta ? { data, meta } : data;
  const hash = createHash('sha1').update(JSON.stringify(payload)).digest('hex');
  res.set({ ETag: `W/"${hash}"`, 'Cache-Control': 'public, max-age=60' });
  if (req.fresh) return res.status(304).end();
  return sendSuccess(res, data, { meta });
}

// [L12] [L13] Controllers turn validated inputs and service results into HTTP responses.
export const productController = {
  async list(req, res) {
    const { items, meta } = await productService.list(req.validated.query);
    return sendCached(req, res, items, meta);
  },
  get(req, res) {
    return sendCached(req, res, req.product);
  },
  async create(req, res) {
    const product = await productService.create(req.validated.body);
    return sendSuccess(res, product, {
      status: 201,
      headers: { Location: `/api/v1/products/${product.slug}` },
      message: 'Product created successfully',
    });
  },
  async update(req, res) {
    const product = await productService.update(
      req.validated.params.id,
      req.validated.body
    );
    return sendSuccess(res, product, {
      message: 'Product updated successfully',
    });
  },
  async remove(req, res) {
    await productService.remove(req.validated.params.id);
    return sendSuccess(res, null, { status: 204 });
  },
  async exportCsv(_req, res) {
    const csv = await productService.exportCsv();
    return res
      .set({
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="products.csv"',
      })
      .send(csv);
  },
  // [L23] Facets endpoint for filtering
  async getFacets(req, res) {
    const facets = await productService.getFacets(req.query);
    return sendSuccess(res, facets);
  },
  // [L28] Related products endpoint
  async getRelated(req, res) {
    const related = await productService.getRelated(req.params.slug);
    return sendSuccess(res, related);
  },
};
