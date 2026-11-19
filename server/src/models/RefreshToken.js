import mongoose from 'mongoose';

// [L35] Store only the token digest. Keep revoked records until expiration to detect reuse.
const refreshTokenSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  tokenHash: { type: String, required: true, unique: true },
  family: { type: String, required: true, index: true },
  expiresAt: { type: Date, required: true, expires: 0 },
  revokedAt: { type: Date, default: null },
  replacedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'RefreshToken' },
  userAgent: String,
  ip: String,
});

export default mongoose.model('RefreshToken', refreshTokenSchema);
