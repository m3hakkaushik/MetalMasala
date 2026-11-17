const staff = Object.freeze(['manager', 'admin']);
const admins = Object.freeze(['admin']);

// [L37] Capability checks for HTTP routes and realtime commands.
export const PERMISSIONS = Object.freeze({
  'product:write': staff,
  'analytics:read': admins,
  'user:manage': admins,
  'drop:publish': staff,
});
