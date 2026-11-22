"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";

import { AuthDivider, GoogleButton } from "@/components/auth/google-button";
import {
  Field,
  FormAlert,
  PasswordInput,
  authInputClass,
} from "@/components/auth/form-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isPlanId, PLANS } from "@/lib/plans";
import { authClient } from "@/lib/auth-client";

export function SignUpForm({
  googleEnabled,
  redirectTo,
  plan,
}: {
  googleEnabled: boolean;
  redirectTo: string;
  plan?: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const selectedPlan = plan && isPlanId(plan) ? PLANS[plan] : null;
  const destination =
    selectedPlan && selectedPlan.id !== "free"
      ? `/dashboard/billing?plan=${selectedPlan.id}`
      : redirectTo;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const nextErrors: Record<string, string> = {};
    if (name.trim().length < 2) nextErrors.name = "Enter your name";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = "Enter a valid email address";
    }
    if (password.length < 8) {
      nextErrors.password = "Use at least 8 characters";
    }
    if (confirm !== password) {
      nextErrors.confirm = "Passwords do not match";
    }
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setPending(true);
    const result = await authClient.signUp.email({
      name: name.trim(),
      email,
      password,
    });

    if (result.error) {
      setError(
        result.error.status === 422
          ? "An account with that email already exists. Try signing in instead."
          : (result.error.message ?? "We could not create your account."),
      );
      setPending(false);
      return;
    }

    router.replace(destination);
    router.refresh();
  }

  return (
    <div>
      {selectedPlan && (
        <div className="mb-5 flex items-center justify-between rounded-lg border border-violet-400/20 bg-violet-500/[0.08] px-3.5 py-2.5">
          <div>
            <p className="text-[12px] font-medium text-violet-100">
              {selectedPlan.name} plan selected
            </p>
            <p className="text-[11px] text-white/40">
              Create your account first, then confirm the plan in billing.
            </p>
          </div>
          <span className="font-mono text-[13px] font-semibold text-white">
            ${selectedPlan.priceMonthly}/mo
          </span>
        </div>
      )}

      <GoogleButton enabled={googleEnabled} redirectTo={redirectTo} />
      <AuthDivider />

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && <FormAlert>{error}</FormAlert>}

        <Field id="name" label="Full name" error={fieldErrors.name}>
          <Input
            id="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            placeholder="Alex Morgan"
            aria-invalid={Boolean(fieldErrors.name)}
            className={authInputClass}
          />
        </Field>

        <Field id="email" label="Work email" error={fieldErrors.email}>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            inputMode="email"
            placeholder="you@company.com"
            aria-invalid={Boolean(fieldErrors.email)}
            className={authInputClass}
          />
        </Field>

        <Field
          id="password"
          label="Password"
          error={fieldErrors.password}
          hint="At least 8 characters."
        >
          <PasswordInput
            id="password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            placeholder="Create a password"
            invalid={Boolean(fieldErrors.password)}
          />
        </Field>

        <Field id="confirm" label="Confirm password" error={fieldErrors.confirm}>
          <PasswordInput
            id="confirm"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
            placeholder="Repeat your password"
            invalid={Boolean(fieldErrors.confirm)}
          />
        </Field>

        <Button
          type="submit"
          disabled={pending}
          className="h-11 w-full rounded-lg text-[14px] font-medium shadow-[0_0_30px_-12px] shadow-violet-500/70"
        >
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Creating your account…
            </>
          ) : (
            <>
              Create free account
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-[13px] text-white/40">
        Already have an account?{" "}
        <Link
          href={`/sign-in${redirectTo !== "/dashboard" ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ""}`}
          className="font-medium text-violet-300 transition-colors hover:text-violet-200"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
