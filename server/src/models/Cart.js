import mongoose from 'mongoose';

// [L25] Introduction to Mongoose ODM + Schema & Model Design
const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required'],
    },
    qty: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
      default: 1,
    },
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Cart must belong to a user'],
      unique: true,
    },
    items: {
      type: [cartItemSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// [L25] Instance method: toResponse() transforms populated cart to API contract shape
cartSchema.methods.toResponse = function () {
  let subtotal = 0;
  let itemCount = 0;

  const items = (this.items || []).map((item) => {
    const prod = item.product;
    const isPopulated = prod && typeof prod === 'object' && prod._id;
    const price = isPopulated ? prod.price : 0;
    const lineTotal = price * item.qty;

    subtotal += lineTotal;
    itemCount += item.qty;

    return {
      product: isPopulated
        ? {
            id: prod._id.toString(),
            name: prod.name,
            slug: prod.slug,
            price: prod.price,
            image: prod.images?.[0]?.url || '',
            stock: prod.stock,
          }
        : { id: prod?.toString() || '' },
      qty: item.qty,
      lineTotal,
    };
  });

  return {
    id: this._id ? this._id.toString() : this.id,
    items,
    totals: {
      itemCount,
      subtotal,
    },
  };
};

export const Cart = mongoose.model('Cart', cartSchema);
export default Cart;
