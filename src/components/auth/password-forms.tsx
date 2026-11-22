"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";

import {
  Field,
  FormAlert,
  PasswordInput,
  authInputClass,
} from "@/components/auth/form-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

export function ForgotPasswordForm({
  emailConfigured,
}: {
  emailConfigured: boolean;
}) {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFieldError("Enter a valid email address");
      return;
    }
    setFieldError(null);
    setPending(true);

    const result = await authClient.requestPasswordReset({
      email,
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (result.error) {
      setError(result.error.message ?? "The reset email could not be sent.");
      setPending(false);
      return;
    }

    setPending(false);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="rounded-xl border border-emerald-400/15 bg-emerald-500/[0.05] p-5">
        <CheckCircle2 className="size-6 text-emerald-300" />
        <h2 className="mt-3 text-[15px] font-semibold text-white/90">Check your inbox</h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-white/45">
          If an account exists for {email}, a password reset link is on its way.
          The link expires in one hour.
        </p>
        <Button asChild variant="outline" className="mt-4 rounded-lg border-white/12 bg-white/[0.02]">
          <Link href="/sign-in">Back to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {!emailConfigured && (
        <FormAlert tone="info">
          Password reset emails are not configured in this environment. Add
          RESEND_API_KEY and RESEND_FROM_EMAIL to enable delivery.
        </FormAlert>
      )}
      {error && <FormAlert>{error}</FormAlert>}

      <Field id="email" label="Email address" error={fieldError ?? undefined}>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          inputMode="email"
          placeholder="you@company.com"
          aria-invalid={Boolean(fieldError)}
          className={authInputClass}
        />
      </Field>

      <Button
        type="submit"
        disabled={pending || !emailConfigured}
        className="h-11 w-full rounded-lg text-[14px] font-medium"
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Sending reset link…
          </>
        ) : (
          <>
            Send reset link
            <ArrowRight className="size-4" />
          </>
        )}
      </Button>

      <p className="text-center text-[13px] text-white/40">
        Remembered it?{" "}
        <Link href="/sign-in" className="font-medium text-violet-300 hover:text-violet-200">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm({
  token,
  invalidToken,
}: {
  token: string | null;
  invalidToken: boolean;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const nextErrors: Record<string, string> = {};
    if (password.length < 8) nextErrors.password = "Use at least 8 characters";
    if (confirm !== password) nextErrors.confirm = "Passwords do not match";
    if (!token) nextErrors.password = "This reset link is missing its token";
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setPending(true);
    const result = await authClient.resetPassword({
      newPassword: password,
      token: token as string,
    });

    if (result.error) {
      setError(result.error.message ?? "This reset link is invalid or has expired.");
      setPending(false);
      return;
    }

    setPending(false);
    setDone(true);
  }

  if (invalidToken && !token) {
    return (
      <div className="space-y-4">
        <FormAlert>
          This password reset link is invalid or has expired. Request a new link to
          continue.
        </FormAlert>
        <Button asChild className="h-11 w-full rounded-lg">
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="rounded-xl border border-emerald-400/15 bg-emerald-500/[0.05] p-5">
        <CheckCircle2 className="size-6 text-emerald-300" />
        <h2 className="mt-3 text-[15px] font-semibold text-white/90">
          Password updated
        </h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-white/45">
          Your new password is active. Sign in to continue to your dashboard.
        </p>
        <Button asChild className="mt-4 w-full rounded-lg">
          <Link href="/sign-in">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {error && <FormAlert>{error}</FormAlert>}

      <Field id="new-password" label="New password" error={fieldErrors.password} hint="At least 8 characters.">
        <PasswordInput
          id="new-password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          placeholder="Enter a new password"
          invalid={Boolean(fieldErrors.password)}
        />
      </Field>

      <Field id="confirm-password" label="Confirm new password" error={fieldErrors.confirm}>
        <PasswordInput
          id="confirm-password"
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
          placeholder="Repeat the new password"
          invalid={Boolean(fieldErrors.confirm)}
        />
      </Field>

      <Button
        type="submit"
        disabled={pending}
        className="h-11 w-full rounded-lg text-[14px] font-medium"
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Updating password…
          </>
        ) : (
          "Update password"
        )}
      </Button>
    </form>
  );
}
