export const PAYMENT_METHODS = {
  upi_mock: 'UPI (demo)',
  card_mock: 'Card (demo)',
  cod: 'Cash on delivery',
};
export const ORDER_STATUSES = {
  placed: 'Placed',
  confirmed: 'Confirmed',
  packed: 'Packed',
  shipped: 'Shipped',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export const ORDER_FLOW = Object.keys(ORDER_STATUSES).filter(
  (status) => status !== 'cancelled',
);

export function nextStatuses(status) {
  const index = ORDER_FLOW.indexOf(status);
  const next = index >= 0 && ORDER_FLOW[index + 1];
  if (!next) return [];
  return ['placed', 'confirmed'].includes(status)
    ? [next, 'cancelled']
    : [next];
}

export function orderDate(value) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));
}
