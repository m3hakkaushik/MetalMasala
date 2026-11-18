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
