// src/store/stripe-webhook.js
// Stripe webhook handler — Task 8 of docs/RUNTIME-CONTRACTS-STRIPE.md.
// Verifies the signature, claims the event for idempotency, then dispatches.

import { constructWebhookEvent } from "./stripe.js";
import { commitReservations, releaseReservations } from "./inventory.js";
import { recordDiscountRedemption } from "../lib/discounts.js";

export async function handleStripeWebhook(request, env) {
  const rawBody = await request.text();
  const sig = request.headers.get("Stripe-Signature");

  let event;
  try {
    event = await constructWebhookEvent(rawBody, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Idempotency: claim the event id. If the row already exists, it's a duplicate.
  const claim = await env.DB.prepare(
    `INSERT INTO stripe_webhook_events (event_id, event_type) VALUES (?, ?) ON CONFLICT(event_id) DO NOTHING`,
  )
    .bind(event.id, event.type)
    .run();
  if (claim.meta.changes === 0) {
    return Response.json({ received: true, duplicate: true }); // already processed
  }

  const obj = event.data.object;

  const dispatch = async () => {
    switch (event.type) {
      case "checkout.session.completed": {
        const orderId = Number(obj.metadata?.order_id);
        if (!orderId) return;

        await env.DB.prepare(
          `UPDATE orders SET status='paid', paid_at=datetime('now'), stripe_payment_intent_id=? WHERE id=?`,
        )
          .bind(obj.payment_intent, orderId)
          .run();

        const result = await commitReservations(env, orderId);
        if (!result.ok) {
          console.warn("stripe webhook: oversold shortfall on order", orderId, result.shortfalls);
        }

        const order = await env.DB.prepare(
          `SELECT discount_id, customer_email, discount_cents FROM orders WHERE id=?`,
        )
          .bind(orderId)
          .first();
        if (order?.discount_id) {
          await recordDiscountRedemption(env, {
            discountId: order.discount_id,
            orderId,
            customerEmail: order.customer_email,
            amountCents: order.discount_cents,
          });
        }
        return;
      }

      case "checkout.session.expired": {
        const orderId = Number(obj.metadata?.order_id);
        if (!orderId) return;

        await env.DB.prepare(
          `UPDATE orders SET status='expired' WHERE id=? AND status='awaiting_payment'`,
        )
          .bind(orderId)
          .run();
        await releaseReservations(env, orderId);
        return;
      }

      case "payment_intent.payment_failed": {
        const orderId = Number(obj.metadata?.order_id);
        if (!orderId) return;

        await env.DB.prepare(
          `UPDATE orders SET status='failed' WHERE id=? AND status='awaiting_payment'`,
        )
          .bind(orderId)
          .run();
        await releaseReservations(env, orderId);
        return;
      }

      default:
        // No-op: event recorded for idempotency; returns 200.
        return;
    }
  };

  try {
    await dispatch();
  } catch (err) {
    // Release the claim so Stripe's retry can reprocess.
    await env.DB.prepare(`DELETE FROM stripe_webhook_events WHERE event_id = ?`)
      .bind(event.id)
      .run();
    return Response.json({ error: "Processing failed" }, { status: 500 });
  }

  return Response.json({ received: true });
}
