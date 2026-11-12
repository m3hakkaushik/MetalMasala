export const FINISHES = {
  'oxidized-silver': 'Oxidized silver',
  'oxidized-black': 'Oxidized black',
  'antique-gold': 'Antique gold',
  'antique-copper': 'Antique copper',
  'patina-green': 'Patina green',
};

export const MATERIALS = {
  brass: 'Brass',
  'german-silver': 'German silver',
  'sterling-silver': 'Sterling silver',
  copper: 'Copper',
  alloy: 'Alloy',
};

export const VIBES = {
  festive: 'Festive',
  college: 'College',
  'office-desi': 'Office desi',
  'wedding-guest': 'Wedding guest',
  gift: 'Gift',
  statement: 'Statement',
  everyday: 'Everyday',
  'date-night': 'Date night',
};

export const SORTS = {
  newest: 'Newest',
  'price-asc': 'Price, low to high',
  'price-desc': 'Price, high to low',
  popular: 'Most popular',
  rating: 'Highest rated',
};

export const FALLBACK_FREE_SHIPPING_THRESHOLD = 999;
export const LOW_STOCK_THRESHOLD = 5;

const rupees = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export const money = (value) => rupees.format(value);
