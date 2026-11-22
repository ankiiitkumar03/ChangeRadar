"use client";

import { useState } from "react";
import { AlertCircle, Eye, EyeOff } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function FormAlert({
  children,
  tone = "error",
}: {
  children: React.ReactNode;
  tone?: "error" | "info" | "success";
}) {
  const styles = {
    error: "border-rose-400/20 bg-rose-500/[0.08] text-rose-200",
    info: "border-amber-400/20 bg-amber-500/[0.08] text-amber-200",
    success: "border-emerald-400/20 bg-emerald-500/[0.08] text-emerald-200",
  };

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-lg border px-3 py-2.5 text-[12.5px] leading-relaxed",
        styles[tone],
      )}
    >
      <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

export function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-[12.5px] font-medium text-white/70">
        {label}
      </Label>
      {children}
      {hint && !error && <p className="text-[11.5px] text-white/30">{hint}</p>}
      {error && (
        <p className="text-[11.5px] text-rose-300" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export const authInputClass =
  "h-11 rounded-lg border-white/12 bg-white/[0.035] px-3 text-[14px] text-white placeholder:text-white/25 focus-visible:border-violet-400/50 focus-visible:ring-violet-400/15";

export function PasswordInput({
  id,
  value,
  onChange,
  autoComplete = "current-password",
  placeholder = "Enter your password",
  invalid,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  placeholder?: string;
  invalid?: boolean;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={invalid}
        className={cn(authInputClass, "pr-11")}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute right-0 top-0 flex size-11 items-center justify-center rounded-r-lg text-white/30 transition-colors hover:text-white/70"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}
