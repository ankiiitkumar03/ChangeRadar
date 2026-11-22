"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        d="M21.6 12.23c0-.68-.06-1.33-.18-1.96H12v3.71h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.32 2.98-7.28Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.7 0 4.96-.9 6.62-2.43l-3.24-2.51c-.9.6-2.04.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A10 10 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.41 13.9a6 6 0 0 1 0-3.8V7.51H3.07a10 10 0 0 0 0 8.98l3.34-2.59Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.98c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.51l3.34 2.59C7.2 7.74 9.4 5.98 12 5.98Z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function GoogleButton({
  enabled,
  redirectTo,
}: {
  enabled: boolean;
  redirectTo: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setPending(true);
    setError(null);
    const result = await authClient.signIn.social({
      provider: "google",
      callbackURL: redirectTo,
    });
    if (result.error) {
      setError(result.error.message ?? "Google sign-in could not start.");
      setPending(false);
    }
  }

  return (
    <div>
      <Button
        type="button"
        variant="outline"
        className="h-11 w-full rounded-lg border-white/12 bg-white/[0.03] text-[13.5px] text-white/80 hover:bg-white/[0.07] hover:text-white"
        disabled={!enabled || pending}
        onClick={handleClick}
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <GoogleIcon />}
        Continue with Google
      </Button>
      {!enabled && (
        <p className="mt-2 text-[11.5px] leading-relaxed text-white/30">
          Google sign-in is not configured in this environment. Add
          GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable it.
        </p>
      )}
      {error && <p className="mt-2 text-[12px] text-rose-300">{error}</p>}
    </div>
  );
}

export function AuthDivider() {
  return (
    <div className="my-5 flex items-center gap-3">
      <div className="h-px flex-1 bg-white/[0.08]" />
      <span className="text-[10.5px] uppercase tracking-[0.16em] text-white/25">
        or email
      </span>
      <div className="h-px flex-1 bg-white/[0.08]" />
    </div>
  );
}
