ALTER TABLE "notifications" ADD COLUMN "email_attempts" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "email_next_attempt_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "email_locked_until" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "email_sent_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "email_provider_id" text;
--> statement-breakpoint
CREATE INDEX "notifications_email_retry_idx" ON "notifications" USING btree ("email_status", "email_next_attempt_at");
--> statement-breakpoint
UPDATE "notifications" SET "email_attempts" = 4 WHERE "email_status" = 'failed';
