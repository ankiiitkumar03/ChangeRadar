import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

const API_BASE = "https://api.razorpay.com/v1";

export function razorpayConfigured() {
  return Boolean(
    process.env.RAZORPAY_KEY_ID &&
      process.env.RAZORPAY_KEY_SECRET &&
      process.env.RAZORPAY_WEBHOOK_SECRET,
  );
}

export function razorpayPlansConfigured() {
  return razorpayConfigured() && Boolean(
    process.env.RAZORPAY_PLAN_STARTER_MONTHLY &&
      process.env.RAZORPAY_PLAN_PRO_MONTHLY &&
      process.env.RAZORPAY_PLAN_BUSINESS_MONTHLY,
  );
}

export function getRazorpayKeyId() {
  const value = process.env.RAZORPAY_KEY_ID;
  if (!value) throw new Error("Razorpay is not configured");
  return value;
}

export async function razorpayRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error("Razorpay API credentials are missing");

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body?.error?.description || body?.error?.reason || "Razorpay request failed";
    throw new Error(message);
  }
  return body as T;
}

function safeHexEqual(expected: string, actual: string) {
  if (!/^[a-f0-9]{64}$/i.test(actual) || !/^[a-f0-9]{64}$/i.test(expected)) return false;
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(actual, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function verifyCheckoutSignature(subscriptionId: string, paymentId: string, signature: string) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const expected = createHmac("sha256", secret)
    .update(`${subscriptionId}|${paymentId}`)
    .digest("hex");
  return safeHexEqual(expected, signature);
}

export function verifyWebhookSignature(rawBody: Buffer, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeHexEqual(expected, signature);
}
