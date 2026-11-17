import bcrypt from 'bcryptjs';
import config from '../config/index.js';
import mongoose from 'mongoose';
import { ROLES } from '../config/constants.js';

// [L25] Introduction to Mongoose ODM + Schema & Model Design
// [L26] Data Validation using Mongoose
const addressSchema = new mongoose.Schema(
  {
    label: { type: String, default: 'Home', trim: true },
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
    isDefault: { type: Boolean, default: false },
  },
  {
    toJSON: {
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

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      select: false, // Hidden by default
    },
    role: {
      type: String,
      enum: {
        values: ROLES,
        message: '{VALUE} is not a valid role',
      },
      default: 'customer',
    },
    phone: {
      type: String,
      trim: true,
      validate: {
        validator: (v) => !v || /^\d{10}$/.test(v),
        message: 'Phone number must be exactly 10 digits',
      },
    },
    addresses: {
      type: [addressSchema],
      validate: {
        validator: (val) => val.length <= 5,
        message: 'User cannot have more than 5 saved addresses',
      },
      default: [],
    },
    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    passwordChangedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    optimisticConcurrency: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        delete ret.passwordChangedAt;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        delete ret.passwordChangedAt;
        return ret;
      },
    },
  }
);

// [L33] bcrypt generates a fresh salt and stores it with the cost in each hash.
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, config.auth.bcryptRounds);
  if (!this.isNew) this.invalidateCredentials();
});

userSchema.methods.invalidateCredentials = function () {
  this.passwordChangedAt = new Date(Math.max(Date.now(), (this.passwordChangedAt?.getTime() ?? 0) + 1));
};

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// [L23] User Email Unique constraint is defined on schema field
export const User = mongoose.model('User', userSchema);
export default User;
