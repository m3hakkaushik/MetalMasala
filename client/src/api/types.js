/**
 * @typedef {{id: string, name: string, slug: string}} CategorySummary
 * @typedef {CategorySummary & {nameHi: string, description: string, image: string, sortOrder: number, productCount: number}} Category
 * @typedef {{url: string, alt: string}} ProductImage
 * @typedef {{artisan: string, region: string, technique: string}} Craft
 * @typedef {{weightGrams: number, lengthMm: number, care: string}} ProductDetails
 * @typedef {{
 *   id: string, name: string, slug: string, tagline: string, description: string,
 *   price: number, compareAtPrice: number | null, discountPercent: number, currency: 'INR',
 *   category: CategorySummary, tags: string[], material: string, finish: string, images: ProductImage[],
 *   stock: number, inStock: boolean, sku: string, isFeatured: boolean, isNewDrop: boolean,
 *   ratingAverage: number, ratingCount: number, soldCount: number, craft: Craft, details: ProductDetails,
 *   createdAt: string, updatedAt: string
 * }} Product
 * @typedef {{page: number, limit: number, total: number, totalPages: number, hasNext: boolean, hasPrev: boolean}} Pagination
 * @typedef {{subtotal: number, shipping: number, codFee: number, discount: number, total: number, freeShippingThreshold: number, amountToFreeShipping: number}} PricingQuote
 */

export {};

/**
 * @typedef {{id: string, label: string, fullName: string, phone: string, line1: string, line2?: string, city: string, state: string, pincode: string, isDefault: boolean}} Address
 * @typedef {{id: string, name: string, email: string, phone: string, role: 'customer' | 'manager' | 'admin', addresses: Address[], wishlist: string[], createdAt: string}} User
 * @typedef {{user: User, accessToken: string, expiresIn: number}} Session
 * @typedef {{id: string, name: string, slug: string, price: number, image: string, stock: number}} CartProduct
 * @typedef {{product: CartProduct, qty: number, lineTotal: number}} CartItem
 * @typedef {{id: string, items: CartItem[], totals: {itemCount: number, subtotal: number}}} Cart
 * @typedef {{product: string, name: string, slug: string, image: string, price: number, qty: number, lineTotal: number}} OrderItem
 * @typedef {{status: string, at: string, note?: string}} OrderEvent
 * @typedef {{id: string, orderNumber: string, items: OrderItem[], shippingAddress: Omit<Address, 'id'|'isDefault'>, pricing: Pick<PricingQuote, 'subtotal'|'shipping'|'codFee'|'discount'|'total'>, payment: {method: string, status: string, transactionId?: string | null}, user: string, status: string, statusHistory: OrderEvent[], createdAt: string, updatedAt: string}} Order
 * @typedef {{id: string, product: string, user: {id: string, name: string}, rating: number, title: string, body: string, isVerifiedPurchase: boolean, createdAt: string}} Review
 */
