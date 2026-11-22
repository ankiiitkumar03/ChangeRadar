"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Field, FormAlert, PasswordInput, authInputClass } from "@/components/auth/form-bits";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const [value, setValue] = useState(name);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const trimmed = value.trim();
    if (trimmed.length < 1) {
      setError("Enter your name.");
      return;
    }
    if (trimmed === name) return;

    setPending(true);
    const { error: updateError } = await authClient.updateUser({ name: trimmed });
    setPending(false);
    if (updateError) {
      setError(updateError.message ?? "Could not update your profile.");
      return;
    }
    toast.success("Profile updated");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4 p-4" noValidate>
      {error && <FormAlert>{error}</FormAlert>}
      <Field id="profile-name" label="Full name">
        <Input
          id="profile-name"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          maxLength={80}
          autoComplete="name"
          className={authInputClass}
        />
      </Field>
      <Field id="profile-email" label="Email" hint="Your sign-in email can’t be changed here.">
        <Input id="profile-email" value={email} readOnly disabled className={authInputClass} />
      </Field>
      <Button type="submit" disabled={pending || value.trim() === name} className="rounded-lg">
        {pending && <Loader2 className="size-3.5 animate-spin" />}
        Save profile
      </Button>
    </form>
  );
}

export function PasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!current) {
      setError("Enter your current password.");
      return;
    }
    if (next.length < 8) {
      setError("Your new password must be at least 8 characters.");
      return;
    }

    setPending(true);
    const { error: changeError } = await authClient.changePassword({
      currentPassword: current,
      newPassword: next,
      revokeOtherSessions: true,
    });
    setPending(false);

    if (changeError) {
      setError(
        changeError.message ??
          "Could not change your password. Accounts created with Google have no password to change.",
      );
      return;
    }
    setCurrent("");
    setNext("");
    toast.success("Password changed", { description: "Other devices have been signed out." });
  }

  return (
    <form onSubmit={submit} className="space-y-4 p-4" noValidate>
      {error && <FormAlert>{error}</FormAlert>}
      <Field id="current-password" label="Current password">
        <PasswordInput id="current-password" value={current} onChange={setCurrent} />
      </Field>
      <Field id="new-password" label="New password" hint="At least 8 characters.">
        <PasswordInput
          id="new-password"
          value={next}
          onChange={setNext}
          autoComplete="new-password"
          placeholder="Choose a new password"
        />
      </Field>
      <Button type="submit" disabled={pending} className="rounded-lg">
        {pending && <Loader2 className="size-3.5 animate-spin" />}
        Change password
      </Button>
    </form>
  );
}


export function EmailAlertsPreference({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function update(next: boolean) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailAlerts: next }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not save your preference.");
      setEnabled(next);
      toast.success(next ? "Email alerts enabled" : "Email alerts paused");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save your preference.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[12.5px] font-medium text-white/80">Change alert emails</p>
          <p className="mt-1 text-[11px] leading-relaxed text-white/35">A global switch for email alerts from all your monitors. In-app notifications remain available.</p>
        </div>
        <Switch checked={enabled} disabled={pending} onCheckedChange={(next) => void update(next)} aria-label="Enable change alert emails" />
      </div>
      {error && <FormAlert>{error}</FormAlert>}
      {pending && <p className="text-[11px] text-white/35">Saving preference…</p>}
    </div>
  );
}
