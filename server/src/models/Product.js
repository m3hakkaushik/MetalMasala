import mongoose from 'mongoose';
import { FINISHES, MATERIALS, TAGS } from '../config/constants.js';
import { slugify } from '../utils/formatters.js';

// [L25] Introduction to Mongoose ODM + Schema & Model Design
// [L26] Data Validation using Mongoose (Built-in + Custom Validators)
const craftSchema = new mongoose.Schema(
  {
    artisan: { type: String, trim: true },
    region: { type: String, trim: true },
    technique: { type: String, trim: true },
  },
  { _id: false }
);

const detailsSchema = new mongoose.Schema(
  {
    weightGrams: { type: Number, min: 0 },
    lengthMm: { type: Number, min: 0 },
    care: { type: String, trim: true },
  },
  { _id: false }
);

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: [true, 'Image URL is required'], trim: true },
    alt: { type: String, default: '', trim: true },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      minlength: [3, 'Product name must be at least 3 characters'],
      maxlength: [120, 'Product name cannot exceed 120 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Product slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    tagline: {
      type: String,
      trim: true,
      maxlength: [200, 'Tagline cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price must be greater than or equal to 0'],
    },
    compareAtPrice: {
      type: Number,
      min: [0, 'Compare at price must be positive'],
      validate: {
        // [L26] Custom validator: compareAtPrice must be >= price
        validator: function (val) {
          if (val === undefined || val === null) return true;
          return val >= this.price;
        },
        message: 'compareAtPrice must be greater than or equal to price',
      },
    },
    currency: {
      type: String,
      default: 'INR',
      trim: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Product category is required'],
    },
    tags: [
      {
        type: String,
        enum: {
          values: TAGS,
          message: '{VALUE} is not a supported tag',
        },
      },
    ],
    material: {
      type: String,
      required: [true, 'Material is required'],
      enum: {
        values: MATERIALS,
        message: '{VALUE} is not a supported material',
      },
    },
    finish: {
      type: String,
      required: [true, 'Finish is required'],
      enum: {
        values: FINISHES,
        message: '{VALUE} is not a supported finish',
      },
    },
    images: {
      type: [imageSchema],
      default: [],
    },
    stock: {
      type: Number,
      required: [true, 'Stock count is required'],
      min: [0, 'Stock cannot be negative'],
      default: 0,
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isNewDrop: {
      type: Boolean,
      default: false,
    },
    ratingAverage: {
      type: Number,
      default: 0,
      min: [0, 'Rating average cannot be below 0'],
      max: [5, 'Rating average cannot exceed 5'],
    },
    ratingCount: {
      type: Number,
      default: 0,
      min: [0, 'Rating count cannot be negative'],
    },
    soldCount: {
      type: Number,
      default: 0,
      min: [0, 'Sold count cannot be negative'],
    },
    craft: {
      type: craftSchema,
      default: () => ({}),
    },
    details: {
      type: detailsSchema,
      default: () => ({}),
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

// [L25] Virtual Properties
productSchema.virtual('discountPercent').get(function () {
  if (this.compareAtPrice && this.compareAtPrice > this.price) {
    return Math.round(((this.compareAtPrice - this.price) / this.compareAtPrice) * 100);
  }
  return 0;
});

productSchema.virtual('inStock').get(function () {
  return this.stock > 0;
});

// [L25] Pre-validate hook for slug generation
productSchema.pre('validate', function () {
  if (!this.slug && this.name) {
    this.slug = slugify(this.name);
  }
});

// [L23] Index Declarations
// Weighted text search index
productSchema.index(
  { name: 'text', tags: 'text', tagline: 'text', description: 'text' },
  { weights: { name: 10, tags: 5, tagline: 3, description: 1 }, name: 'ProductTextIndex' }
);
// Compound indexes
productSchema.index({ category: 1, price: 1 });
productSchema.index({ isFeatured: 1, createdAt: -1 });

export const Product = mongoose.model('Product', productSchema);
export default Product;
