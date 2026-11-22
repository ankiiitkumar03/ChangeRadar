# CR-08 — Razorpay subscription billing

## Implemented
- Server-created Razorpay Subscriptions using server-configured Razorpay Plan IDs (100 billing cycles); the browser cannot choose a price or provider plan ID.
- Plan metadata is fetched from Razorpay before checkout and must be a positive INR plan.
- Razorpay Checkout.js flow with server-side subscription/payment signature verification.
- Signed webhook endpoint using the raw request body and HMAC-SHA256; webhook event IDs are unique and processing is transactional/idempotent.
- Subscription lifecycle handling for activated, charged, pending, halted, cancelled and completed events.
- Billing history entries for captured recurring subscription payments, deduplicated by provider payment ID.
- Cancel-at-period-end request and billing page status messaging.
- Prevents starting another paid subscription while an earlier subscription is active, pending or scheduled for cancellation. This avoids overlapping recurring mandates.

## Required setup
1. Create three monthly **INR** plans in the Razorpay Dashboard (Starter, Pro, Business). Set the intended recurring amount and billing frequency on each plan. Copy their `plan_...` IDs.
2. Add the six `RAZORPAY_*` variables from `.env.example` to local/Vercel environment settings. Use Test Mode keys first.
3. In Razorpay Dashboard → Account & Settings / Webhooks, add `https://YOUR_DOMAIN/api/webhooks/razorpay`. Set a strong webhook secret and subscribe to: `subscription.activated`, `subscription.charged`, `subscription.pending`, `subscription.halted`, `subscription.cancelled`, and `subscription.completed`. The webhook secret is `RAZORPAY_WEBHOOK_SECRET`.
4. Apply the migration with `bun run db:migrate`.
5. Test in Razorpay Test Mode: new subscription, failed/abandoned checkout, duplicate webhook, renewal charge, halted subscription, and cancellation at period end.
6. Only switch to Live Mode after Razorpay account approval and end-to-end testing.

## Important pricing note
The existing public plan catalogue displays USD prices. This CR-08 integration intentionally requires Razorpay plans to be INR and reads the actual INR amount from Razorpay, but it does **not** convert the existing USD catalogue prices into INR. Before accepting live payments, decide the INR prices and make the pricing page consistent with those exact amounts. Do not create live Razorpay plans until this pricing decision is made.

## Verification limits
No live Razorpay credentials, dashboard plan IDs, webhook endpoint, or PostgreSQL connection were available in this workspace. Therefore no real checkout, webhook delivery, cancellation, migration execution, production build, or full typecheck is claimed as passed.
