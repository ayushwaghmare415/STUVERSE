// Offer model alias for compatibility with the frontend and requested API
// Internally we reuse the existing Coupon model/schema to avoid duplicating
// schema definitions. This file simply re-exports the Coupon model under
// the `Offer` name so other code (or future changes) can import `Offer`.
module.exports = require('./Coupon');
