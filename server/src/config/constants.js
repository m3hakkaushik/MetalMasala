// Core constants and domain enums aligned with docs/01_API_CONTRACT.md

export const DEV_USER_IDS = {
  customer: '65f0c0ffee0000000000a001',
  manager: '65f0c0ffee0000000000a002',
  admin: '65f0c0ffee0000000000a003',
};

export const MATERIALS = [
  'brass',
  'german-silver',
  'sterling-silver',
  'copper',
  'alloy',
];

export const FINISHES = [
  'oxidized-silver',
  'oxidized-black',
  'antique-gold',
  'antique-copper',
  'patina-green',
];

export const TAGS = [
  'festive',
  'college',
  'office-desi',
  'wedding-guest',
  'gift',
  'statement',
  'everyday',
  'date-night',
];

export const ROLES = ['customer', 'manager', 'admin'];

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 12,
  MAX_LIMIT: 48,
};

// [L29] Stable contract values live separately from environment configuration.
export const ORDER_STATUS = Object.freeze([
  'placed', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled',
]);

export const ORDER_TRANSITIONS = Object.freeze({
  placed: Object.freeze(['confirmed', 'cancelled']),
  confirmed: Object.freeze(['packed', 'cancelled']),
  packed: Object.freeze(['shipped']),
  shipped: Object.freeze(['out_for_delivery']),
  out_for_delivery: Object.freeze(['delivered']),
  delivered: Object.freeze([]),
  cancelled: Object.freeze([]),
});

export const PAYMENT_METHODS = Object.freeze(['cod', 'upi_mock', 'card_mock']);
export const PAYMENT_STATUS = Object.freeze(['pending', 'paid', 'failed', 'refunded']);

export const ERROR_CODES = Object.freeze({
  BAD_REQUEST: 'BAD_REQUEST',
  INVALID_ID: 'INVALID_ID',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  AI_UNAVAILABLE: 'AI_UNAVAILABLE',
});
