ALTER TABLE "subscriptions" ADD COLUMN "provider" text DEFAULT 'none' NOT NULL;
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "provider_subscription_id" text;
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "provider_customer_id" text;
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "pending_plan" text;
--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_provider_subscription_id_uidx" ON "subscriptions" USING btree ("provider_subscription_id");
--> statement-breakpoint
ALTER TABLE "billing_history" ADD COLUMN "provider_payment_id" text;
--> statement-breakpoint
CREATE UNIQUE INDEX "billing_history_provider_payment_id_uidx" ON "billing_history" USING btree ("provider_payment_id");
--> statement-breakpoint
CREATE TABLE "payment_webhook_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "provider" text DEFAULT 'razorpay' NOT NULL,
  "event_id" text NOT NULL,
  "event_type" text NOT NULL,
  "payload" jsonb NOT NULL,
  "processed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "payment_webhook_events_provider_event_uidx" ON "payment_webhook_events" USING btree ("provider", "event_id");
--> statement-breakpoint
CREATE INDEX "payment_webhook_events_created_at_idx" ON "payment_webhook_events" USING btree ("created_at");
