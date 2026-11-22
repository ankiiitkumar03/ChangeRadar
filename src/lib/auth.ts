import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { db } from "./db";
import * as schema from "./schema";
import { sendAuthEmail } from "./email";

const googleConfigured = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
);

const adminEmails = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export const auth = betterAuth({
  appName: "ChangeRadar",
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL
    ? process.env.BETTER_AUTH_URL
    : {
        allowedHosts: ["*"],
        protocol: "auto",
      },
  trustedOrigins: process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : ["*"],
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      await sendAuthEmail({
        to: user.email,
        subject: "Reset your ChangeRadar password",
        html: `<p>Hi ${user.name || "there"},</p><p>We received a request to reset your ChangeRadar password.</p><p><a href="${url}">Reset your password</a></p><p>This link expires in one hour. If you didn't request this, you can ignore this email.</p>`,
      });
    },
  },
  socialProviders: googleConfigured
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID as string,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        },
      }
    : {},
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "user",
        input: false,
      },
    },
  },
  advanced: {
    defaultCookieAttributes:
      process.env.NODE_ENV === "production"
        ? undefined
        : {
            sameSite: "none",
            secure: true,
            partitioned: true,
          },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (adminEmails.includes((user.email ?? "").toLowerCase())) {
            return { data: { ...user, role: "admin" } };
          }
          return { data: user };
        },
        after: async (createdUser) => {
          await db
            .insert(schema.subscriptions)
            .values({ userId: createdUser.id, plan: "free", status: "active" })
            .onConflictDoNothing();
        },
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
