import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth-schema";

export * from "./auth-schema";

export const monitors = pgTable(
  "monitors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    url: text("url").notNull(),
    frequency: text("frequency").notNull().default("6h"),
    keywords: text("keywords").array().notNull().default([]),
    ignoreKeywords: text("ignore_keywords").array().notNull().default([]),
    notifyEmail: boolean("notify_email").notNull().default(true),
    status: text("status").notNull().default("active"),
    latestSnapshotId: uuid("latest_snapshot_id"),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    lastChangedAt: timestamp("last_changed_at", { withTimezone: true }),
    nextCheckAt: timestamp("next_check_at", { withTimezone: true }),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("monitors_user_id_idx").on(table.userId),
    index("monitors_next_check_idx").on(table.nextCheckAt),
  ],
);

export const snapshots = pgTable(
  "snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    monitorId: uuid("monitor_id")
      .notNull()
      .references(() => monitors.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    contentHash: text("content_hash").notNull(),
    wordCount: integer("word_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("snapshots_monitor_id_idx").on(table.monitorId),
    index("snapshots_created_at_idx").on(table.createdAt),
  ],
);

export const changes = pgTable(
  "changes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    monitorId: uuid("monitor_id")
      .notNull()
      .references(() => monitors.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    fromSnapshotId: uuid("from_snapshot_id").references(() => snapshots.id, {
      onDelete: "set null",
    }),
    toSnapshotId: uuid("to_snapshot_id").references(() => snapshots.id, {
      onDelete: "set null",
    }),
    summary: text("summary").notNull(),
    aiSummary: text("ai_summary"),
    addedText: text("added_text").notNull().default(""),
    removedText: text("removed_text").notNull().default(""),
    diff: jsonb("diff").$type<DiffSegment[]>().notNull().default([]),
    changeScore: integer("change_score").notNull().default(0),
    detectedAt: timestamp("detected_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("changes_monitor_id_idx").on(table.monitorId),
    index("changes_user_id_idx").on(table.userId),
    index("changes_detected_at_idx").on(table.detectedAt),
  ],
);

export const checkRuns = pgTable(
  "check_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    monitorId: uuid("monitor_id")
      .notNull()
      .references(() => monitors.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    httpStatus: integer("http_status"),
    durationMs: integer("duration_ms"),
    changeId: uuid("change_id").references(() => changes.id, {
      onDelete: "set null",
    }),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("check_runs_monitor_id_idx").on(table.monitorId),
    index("check_runs_created_at_idx").on(table.createdAt),
    index("check_runs_user_id_idx").on(table.userId),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    monitorId: uuid("monitor_id").references(() => monitors.id, {
      onDelete: "cascade",
    }),
    changeId: uuid("change_id").references(() => changes.id, {
      onDelete: "cascade",
    }),
    type: text("type").notNull().default("change"),
    title: text("title").notNull(),
    body: text("body").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    emailStatus: text("email_status").notNull().default("disabled"),
    emailError: text("email_error"),
    emailAttempts: integer("email_attempts").notNull().default(0),
    emailNextAttemptAt: timestamp("email_next_attempt_at", { withTimezone: true }),
    emailLockedUntil: timestamp("email_locked_until", { withTimezone: true }),
    emailSentAt: timestamp("email_sent_at", { withTimezone: true }),
    emailProviderId: text("email_provider_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("notifications_user_id_idx").on(table.userId),
    index("notifications_created_at_idx").on(table.createdAt),
    index("notifications_email_retry_idx").on(table.emailStatus, table.emailNextAttemptAt),
  ],
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: "cascade" }),
    plan: text("plan").notNull().default("free"),
    status: text("status").notNull().default("active"),
    currentPeriodStart: timestamp("current_period_start", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    provider: text("provider").notNull().default("none"),
    providerSubscriptionId: text("provider_subscription_id").unique(),
    providerCustomerId: text("provider_customer_id"),
    pendingPlan: text("pending_plan"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("subscriptions_user_id_idx").on(table.userId)],
);

export const billingHistory = pgTable(
  "billing_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    plan: text("plan").notNull(),
    amountCents: integer("amount_cents").notNull().default(0),
    currency: text("currency").notNull().default("usd"),
    status: text("status").notNull().default("paid"),
    provider: text("provider").notNull().default("none"),
    description: text("description").notNull(),
    providerPaymentId: text("provider_payment_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("billing_history_user_id_idx").on(table.userId), uniqueIndex("billing_history_provider_payment_id_uidx").on(table.providerPaymentId)],
);


export const userPreferences = pgTable(
  "user_preferences",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    emailAlerts: boolean("email_alerts").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

export type DiffSegment = {
  type: "added" | "removed" | "unchanged";
  text: string;
};

export type Monitor = typeof monitors.$inferSelect;
export type NewMonitor = typeof monitors.$inferInsert;
export type Snapshot = typeof snapshots.$inferSelect;
export type Change = typeof changes.$inferSelect;
export type CheckRun = typeof checkRuns.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type BillingHistoryEntry = typeof billingHistory.$inferSelect;


export const paymentWebhookEvents = pgTable(
  "payment_webhook_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: text("provider").notNull().default("razorpay"),
    eventId: text("event_id").notNull(),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("payment_webhook_events_created_at_idx").on(table.createdAt),
    uniqueIndex("payment_webhook_events_provider_event_uidx").on(table.provider, table.eventId),
  ],
);
