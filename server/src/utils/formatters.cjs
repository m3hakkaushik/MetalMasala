/**
 * // [L4] Node.js Modules: CommonJS module example.
 *
 * Demonstrates CommonJS export syntax (module.exports) for interop with ES Modules.
 * In Node.js:
 * 1. CommonJS uses `require()` and `module.exports` synchronously at runtime.
 * 2. ES Modules use static `import` and `export` statements evaluated at parse time.
 * 3. Module caching / singleton behavior: When a module is loaded via `require()` or `import`,
 *    Node.js evaluates the module once and caches the exported object in `require.cache`.
 *    Subsequent imports or requires receive the cached reference rather than re-executing.
 */

/**
 * Formats a number in Indian Rupees (INR) with the rupee symbol.
 * e.g. 1598 -> "₹1,598", 100000 -> "₹1,00,000"
 * @param {number} amount
 * @returns {string}
 */
function formatINR(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '₹0';
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Converts a text string into a URL-friendly slug.
 * e.g. "Chandni Chowk Jhumka" -> "chandni-chowk-jhumka"
 * @param {string} text
 * @returns {string}
 */
function slugify(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }
  return text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

module.exports = {
  formatINR,
  slugify,
};
