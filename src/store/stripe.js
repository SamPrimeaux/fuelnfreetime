// src/store/stripe.js
// Stripe checkout redirect paths — per docs/RUNTIME-CONTRACTS-STRIPE.md Task 3.
// Paths are code constants, NOT wrangler.toml [vars]. Only Stripe keys are secrets.

export const CHECKOUT_SUCCESS_PATH = "/order-confirmation";
export const CHECKOUT_CANCEL_PATH = "/cart.html";

export function checkoutUrls(request) {
  const base = new URL(request.url).origin;
  return {
    success: `${base}${CHECKOUT_SUCCESS_PATH}?session_id={CHECKOUT_SESSION_ID}`,
    cancel: `${base}${CHECKOUT_CANCEL_PATH}?cancelled=1`,
  };
}
