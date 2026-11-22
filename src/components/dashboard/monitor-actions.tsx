"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, PauseCircle, PlayCircle, RefreshCw, Settings2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Field, FormAlert, authInputClass } from "@/components/auth/form-bits";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { FREQUENCY_OPTIONS, planAllowsFrequency, type PlanId } from "@/lib/plans";

type MonitorSettings = {
  id: string;
  name: string;
  status: string;
  frequency: string;
  keywords: string[];
  ignoreKeywords: string[];
  notifyEmail: boolean;
};

const outline =
  "rounded-lg border-white/10 bg-white/[0.02] text-[12px] text-white/70 hover:bg-white/[0.06] hover:text-white";

async function request(url: string, init: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json" },
  });
  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
    fields?: Record<string, string[]>;
    check?: { status: string; error?: string; summary?: string };
  };
  return { ok: response.ok, data };
}

export function MonitorActions({
  monitor,
  planId,
}: {
  monitor: MonitorSettings;
  planId: PlanId;
}) {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const paused = monitor.status === "paused";

  async function checkNow() {
    setChecking(true);
    const { ok, data } = await request(`/api/monitors/${monitor.id}/check`, { method: "POST" }).catch(
      () => ({ ok: false, data: { error: "The request could not be completed.", check: undefined } }),
    );
    setChecking(false);

    if (!ok) {
      toast.error(data.error ?? "The check could not run.");
      return;
    }
    const status = data.check?.status;
    if (status === "changed") toast.success("Change detected", { description: data.check?.summary });
    else if (status === "failed") toast.error("The check failed", { description: data.check?.error });
    else toast.success("Checked — no meaningful changes");
    router.refresh();
  }

  async function togglePause() {
    setToggling(true);
    const { ok, data } = await request(`/api/monitors/${monitor.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: paused ? "active" : "paused" }),
    }).catch(() => ({ ok: false, data: { error: "The request could not be completed." } }));
    setToggling(false);

    if (!ok) {
      toast.error(data.error ?? "Could not update the monitor.");
      return;
    }
    toast.success(paused ? "Monitoring resumed" : "Monitoring paused");
    router.refresh();
  }

  async function remove() {
    setDeleting(true);
    const { ok, data } = await request(`/api/monitors/${monitor.id}`, { method: "DELETE" }).catch(
      () => ({ ok: false, data: { error: "The request could not be completed." } }),
    );
    if (!ok) {
      setDeleting(false);
      toast.error(data.error ?? "Could not delete this monitor.");
      return;
    }
    toast.success("Monitor deleted");
    router.replace("/dashboard/monitors");
    router.refresh();
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" className="rounded-lg text-[12px]" onClick={checkNow} disabled={checking || paused}>
          {checking ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          {checking ? "Checking…" : "Check now"}
        </Button>
        <Button size="sm" variant="outline" className={outline} onClick={togglePause} disabled={toggling}>
          {toggling ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : paused ? (
            <PlayCircle className="size-3.5" />
          ) : (
            <PauseCircle className="size-3.5" />
          )}
          {paused ? "Resume" : "Pause"}
        </Button>
        <Button size="sm" variant="outline" className={outline} onClick={() => setEditOpen(true)}>
          <Settings2 className="size-3.5" />
          Settings
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="rounded-lg border-rose-400/20 bg-rose-500/[0.04] text-[12px] text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="size-3.5" />
          Delete
        </Button>
      </div>

      <EditDialog
        key={editOpen ? "open" : "closed"}
        open={editOpen}
        onOpenChange={setEditOpen}
        monitor={monitor}
        planId={planId}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{monitor.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the monitor along with its saved versions, detected changes and check
              history. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void remove();
              }}
              disabled={deleting}
            >
              {deleting && <Loader2 className="size-3.5 animate-spin" />}
              Delete monitor
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function EditDialog({
  open,
  onOpenChange,
  monitor,
  planId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  monitor: MonitorSettings;
  planId: PlanId;
}) {
  const router = useRouter();
  const [name, setName] = useState(monitor.name);
  const [frequency, setFrequency] = useState(monitor.frequency);
  const [keywords, setKeywords] = useState(monitor.keywords.join(", "));
  const [ignoreKeywords, setIgnoreKeywords] = useState(monitor.ignoreKeywords.join(", "));
  const [notifyEmail, setNotifyEmail] = useState(monitor.notifyEmail);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const split = (value: string) =>
    value
      .split(",")
      .map((word) => word.trim())
      .filter(Boolean);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Give this monitor a name.");
      return;
    }
    setPending(true);
    const { ok, data } = await request(`/api/monitors/${monitor.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: name.trim(),
        frequency,
        keywords: split(keywords),
        ignoreKeywords: split(ignoreKeywords),
        notifyEmail,
      }),
    }).catch(() => ({ ok: false, data: { error: "The request could not be completed.", fields: undefined } }));
    setPending(false);

    if (!ok) {
      setError(data.error ?? "Could not save your changes.");
      return;
    }
    toast.success("Settings saved");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <form onSubmit={save} className="space-y-4" noValidate>
          <DialogHeader>
            <DialogTitle>Monitoring settings</DialogTitle>
            <DialogDescription>
              Changes apply from the next check. The page URL can’t be edited — add a new monitor to track a
              different page.
            </DialogDescription>
          </DialogHeader>

          {error && <FormAlert>{error}</FormAlert>}

          <Field id="edit-name" label="Name">
            <Input
              id="edit-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              className={authInputClass}
            />
          </Field>

          <Field id="edit-frequency" label="Check frequency">
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger id="edit-frequency" className={authInputClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCY_OPTIONS.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    disabled={!planAllowsFrequency(planId, option.value)}
                  >
                    {option.label}
                    {!planAllowsFrequency(planId, option.value) ? " (Pro & Business)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field id="edit-keywords" label="Keywords to track" hint="Comma-separated. Leave empty to watch the whole page.">
            <Input
              id="edit-keywords"
              value={keywords}
              onChange={(event) => setKeywords(event.target.value)}
              placeholder="price, in stock, hiring"
              className={authInputClass}
            />
          </Field>

          <Field id="edit-ignore" label="Keywords to ignore" hint="Comma-separated. Lines containing these are skipped.">
            <Input
              id="edit-ignore"
              value={ignoreKeywords}
              onChange={(event) => setIgnoreKeywords(event.target.value)}
              placeholder="cookie, copyright"
              className={authInputClass}
            />
          </Field>

          <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5">
            <div>
              <p className="text-[12.5px] font-medium text-white/75">Email notifications</p>
              <p className="text-[11px] text-white/35">Send an email when a meaningful change is detected.</p>
            </div>
            <Switch checked={notifyEmail} onCheckedChange={setNotifyEmail} aria-label="Email notifications" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="size-3.5 animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
