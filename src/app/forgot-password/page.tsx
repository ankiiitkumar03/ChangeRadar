import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/password-forms";
import { isEmailConfigured } from "@/lib/email";

export const metadata: Metadata = { title: "Reset password", robots: { index: false, follow: false } };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter the email on your account and we'll send a secure reset link."
    >
      <ForgotPasswordForm emailConfigured={isEmailConfigured()} />
    </AuthShell>
  );
}
