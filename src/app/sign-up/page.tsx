import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Create account", robots: { index: false, follow: false } };

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string; plan?: string }>;
}) {
  const session = await getSession();
  const params = await searchParams;
  const redirectTo =
    params.redirectTo && params.redirectTo.startsWith("/")
      ? params.redirectTo
      : "/dashboard";

  if (session) redirect("/dashboard");

  const googleEnabled = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
  );

  return (
    <AuthShell
      title="Start monitoring free"
      subtitle="Three monitors, full change history, and before-and-after comparisons. No credit card."
    >
      <SignUpForm
        googleEnabled={googleEnabled}
        redirectTo={redirectTo}
        plan={params.plan}
      />
    </AuthShell>
  );
}
