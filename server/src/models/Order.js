import mongoose from 'mongoose';
import {
  ORDER_STATUS,
  ORDER_TRANSITIONS,
  PAYMENT_METHODS,
  PAYMENT_STATUS,
} from '../config/constants.js';

// [L25] Introduction to Mongoose ODM + Schema & Model Design
// [L26] Data Validation using Mongoose (Pincode, Phone, Enum validators)
const orderItemSnapshotSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    image: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    qty: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const shippingAddressSnapshotSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: [true, 'Full name is required'], trim: true },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      validate: {
        validator: (v) => /^\d{10}$/.test(v),
        message: 'Phone number must be exactly 10 digits',
      },
    },
    line1: { type: String, required: [true, 'Address line 1 is required'], trim: true },
    line2: { type: String, trim: true, default: '' },
    city: { type: String, required: [true, 'City is required'], trim: true },
    state: { type: String, required: [true, 'State is required'], trim: true },
    pincode: {
      type: String,
      required: [true, 'Pincode is required'],
      trim: true,
      validate: {
        validator: (v) => /^\d{6}$/.test(v),
        message: 'Pincode must be exactly 6 digits',
      },
    },
  },
  { _id: false }
);

const pricingSnapshotSchema = new mongoose.Schema(
  {
    subtotal: { type: Number, required: true, min: 0 },
    shipping: { type: Number, required: true, min: 0 },
    codFee: { type: Number, required: true, min: 0 },
    discount: { type: Number, required: true, min: 0, default: 0 },
    total: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    method: {
      type: String,
      required: true,
      enum: {
        values: PAYMENT_METHODS,
        message: '{VALUE} is not a valid payment method',
      },
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: PAYMENT_STATUS,
        message: '{VALUE} is not a valid payment status',
      },
    },
    transactionId: { type: String, trim: true },
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true,
      enum: ORDER_STATUS,
    },
    at: {
      type: Date,
      default: Date.now,
    },
    note: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: [true, 'Order number is required'],
      unique: true,
      trim: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Order must belong to a user'],
    },
    items: {
      type: [orderItemSnapshotSchema],
      required: true,
      validate: {
        validator: (items) => items.length > 0,
        message: 'An order must have at least one item',
      },
    },
    shippingAddress: {
      type: shippingAddressSnapshotSchema,
      required: true,
    },
    pricing: {
      type: pricingSnapshotSchema,
      required: true,
    },
    payment: {
      type: paymentSchema,
      required: true,
    },
    status: {
      type: String,
      enum: ORDER_STATUS,
      default: 'placed',
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: () => [{ status: 'placed', at: new Date(), note: 'Order placed' }],
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

// [L23] Order Indexes
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

// [L25] Instance method: canTransitionTo(nextStatus) validates state machine transitions
orderSchema.methods.canTransitionTo = function (nextStatus) {
  const allowed = ORDER_TRANSITIONS[this.status];
  return Array.isArray(allowed) && allowed.includes(nextStatus);
};

export const Order = mongoose.model('Order', orderSchema);
export default Order;
