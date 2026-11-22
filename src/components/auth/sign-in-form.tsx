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
import { authClient } from "@/lib/auth-client";

export function SignInForm({
  googleEnabled,
  redirectTo,
}: {
  googleEnabled: boolean;
  redirectTo: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const nextErrors: Record<string, string> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = "Enter a valid email address";
    }
    if (!password) nextErrors.password = "Enter your password";
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setPending(true);
    const result = await authClient.signIn.email({ email, password });

    if (result.error) {
      setError(
        result.error.status === 401
          ? "That email and password combination is not correct."
          : (result.error.message ?? "We could not sign you in. Please try again."),
      );
      setPending(false);
      return;
    }

    router.replace(redirectTo);
    router.refresh();
  }

  return (
    <div>
      <GoogleButton enabled={googleEnabled} redirectTo={redirectTo} />
      <AuthDivider />

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && <FormAlert>{error}</FormAlert>}

        <Field id="email" label="Email address" error={fieldErrors.email}>
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

        <Field id="password" label="Password" error={fieldErrors.password}>
          <PasswordInput
            id="password"
            value={password}
            onChange={setPassword}
            invalid={Boolean(fieldErrors.password)}
          />
        </Field>

        <div className="flex items-center justify-between">
          <Link
            href="/forgot-password"
            className="text-[12.5px] text-white/45 underline-offset-4 transition-colors hover:text-white hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          disabled={pending}
          className="h-11 w-full rounded-lg text-[14px] font-medium shadow-[0_0_30px_-12px] shadow-violet-500/70"
        >
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Signing you in…
            </>
          ) : (
            <>
              Sign in
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-[13px] text-white/40">
        New to ChangeRadar?{" "}
        <Link
          href={`/sign-up${redirectTo !== "/dashboard" ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ""}`}
          className="font-medium text-violet-300 transition-colors hover:text-violet-200"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
