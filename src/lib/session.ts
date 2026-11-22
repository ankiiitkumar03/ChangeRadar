import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "./auth";

export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

export async function requireSession(redirectTo = "/dashboard") {
  const requestHeaders = await headers();
  const session = await getSession();
  if (!session) {
    const pathname = requestHeaders.get("x-pathname");
    const target =
      pathname && pathname.startsWith("/") ? pathname : redirectTo;
    redirect(`/sign-in?redirectTo=${encodeURIComponent(target)}`);
  }
  return session;
}

export async function isAdminUser(session: NonNullable<Awaited<ReturnType<typeof getSession>>>) {
  const role = (session.user as { role?: string | null }).role;
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  return role === "admin" || adminEmails.includes(session.user.email.toLowerCase());
}
