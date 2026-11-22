"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CreditCard,
  GitCompareArrows,
  Globe2,
  LayoutDashboard,
  ChartNoAxesCombined,
  Menu,
  Plus,
  Radar,
  Settings,
  Shield,
  Sparkles,
} from "lucide-react";

import { AccountMenu } from "@/components/dashboard/account-menu";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type ShellUser = {
  name: string;
  email: string;
  image?: string | null;
  planName: string;
  isAdmin: boolean;
};

function useNavItems(isAdmin: boolean) {
  return [
    {
      section: "Workspace",
      items: [
        { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
        { href: "/dashboard/monitors", label: "Monitors", icon: Globe2 },
        { href: "/dashboard/changes", label: "Changes", icon: GitCompareArrows },
        { href: "/dashboard/analytics", label: "Analytics", icon: ChartNoAxesCombined },
        { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
      ],
    },
    {
      section: "Account",
      items: [
        { href: "/dashboard/billing", label: "Billing & plan", icon: CreditCard },
        { href: "/settings", label: "Settings", icon: Settings },
      ],
    },
    ...(isAdmin
      ? [
          {
            section: "Platform",
            items: [{ href: "/admin", label: "Admin", icon: Shield }],
          },
        ]
      : []),
  ];
}

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavList({
  isAdmin,
  unread,
  onNavigate,
}: {
  isAdmin: boolean;
  unread: number;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const groups = useNavItems(isAdmin);

  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-2" aria-label="Dashboard">
      {groups.map((group) => (
        <div key={group.section}>
          <p className="px-2 pb-2 text-[10px] font-medium uppercase tracking-[0.18em] text-white/25">
            {group.section}
          </p>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href, "exact" in item ? item.exact : false);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] transition-colors",
                    active
                      ? "bg-white/[0.07] text-white"
                      : "text-white/45 hover:bg-white/[0.035] hover:text-white/80",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4 transition-colors",
                      active ? "text-violet-300" : "text-white/30 group-hover:text-white/60",
                    )}
                  />
                  <span className="flex-1">{item.label}</span>
                  {item.label === "Notifications" && unread > 0 && (
                    <span className="rounded-full bg-violet-500/20 px-1.5 py-0.5 font-mono text-[9.5px] font-medium text-violet-200">
                      {unread > 99 ? "99+" : unread}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function UsageCard({
  monitorCount,
  monitorLimit,
  planName,
  onNavigate,
}: {
  monitorCount: number;
  monitorLimit: number;
  planName: string;
  onNavigate?: () => void;
}) {
  const percent = Math.min(100, Math.round((monitorCount / Math.max(monitorLimit, 1)) * 100));
  const nearLimit = monitorCount >= monitorLimit;

  return (
    <div className="mx-3 mb-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium text-white/60">
          {monitorCount} of {monitorLimit} monitors
        </p>
        <span className="rounded-full border border-white/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-white/40">
          {planName}
        </span>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.08]">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            nearLimit
              ? "bg-amber-400"
              : "bg-gradient-to-r from-violet-500 to-cyan-400",
          )}
          style={{ width: `${Math.max(percent, 4)}%` }}
        />
      </div>
      <Link
        href="/dashboard/billing"
        onClick={onNavigate}
        className={cn(
          "mt-2.5 inline-flex items-center gap-1 text-[11px] transition-colors",
          nearLimit
            ? "text-amber-300 hover:text-amber-200"
            : "text-violet-300 hover:text-violet-200",
        )}
      >
        <Sparkles className="size-3" />
        {nearLimit ? "Limit reached — upgrade" : "Upgrade plan"}
      </Link>
    </div>
  );
}

export function DashboardShell({
  user,
  monitorCount,
  monitorLimit,
  unread,
  children,
}: {
  user: ShellUser;
  monitorCount: number;
  monitorLimit: number;
  unread: number;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const title =
    pathname === "/dashboard"
      ? "Overview"
      : pathname.startsWith("/dashboard/monitors")
        ? "Monitors"
        : pathname.startsWith("/dashboard/changes")
          ? "Changes"
          : pathname.startsWith("/dashboard/notifications")
            ? "Notifications"
            : pathname.startsWith("/dashboard/analytics")
              ? "Analytics"
              : pathname.startsWith("/dashboard/billing")
                ? "Billing & plan"
                : pathname.startsWith("/settings")
                  ? "Settings"
                  : pathname.startsWith("/admin")
                    ? "Admin"
                    : "Workspace";

  return (
    <div className="min-h-dvh bg-[#080a14] text-white">
      <a
        href="#main-content"
        className="sr-only fixed left-4 top-3 z-[100] rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg focus:not-sr-only focus:outline-none focus:ring-2 focus:ring-violet-400"
      >
        Skip to main content
      </a>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-white/[0.06] bg-[#0a0c16]/90 backdrop-blur-xl lg:flex">
        <div className="flex h-16 items-center px-5">
          <Logo href="/dashboard" />
        </div>
        <div className="px-3">
          <Button
            asChild
            className="h-9 w-full justify-start rounded-lg text-[12.5px] shadow-[0_0_24px_-12px] shadow-violet-500/80"
          >
            <Link href="/dashboard/monitors/new">
              <Plus className="size-4" />
              Add website
            </Link>
          </Button>
        </div>
        <div className="mt-5 flex flex-1 flex-col overflow-hidden">
          <NavList isAdmin={user.isAdmin} unread={unread} />
          <UsageCard
            monitorCount={monitorCount}
            monitorLimit={monitorLimit}
            planName={user.planName}
          />
          <div className="border-t border-white/[0.06] p-2">
            <AccountMenu
              name={user.name}
              email={user.email}
              image={user.image}
              planName={user.planName}
              isAdmin={user.isAdmin}
            />
          </div>
        </div>
      </aside>

      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#080a14]/80 backdrop-blur-xl">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                aria-label="Open navigation"
                aria-expanded={mobileOpen}
                aria-controls="mobile-navigation"
                onClick={() => setMobileOpen(true)}
                className="inline-flex size-10 items-center justify-center rounded-lg border border-white/10 text-white/60 lg:hidden"
              >
                <Menu className="size-4.5" />
              </button>
              <Logo href="/dashboard" compact className="lg:hidden" />
              <div className="min-w-0">
                <p className="hidden text-[10.5px] uppercase tracking-[0.16em] text-white/35 sm:block">
                  Workspace
                </p>
                <h1 className="truncate text-[13px] font-medium text-white/90 sm:text-[14px]">{title}</h1>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Link
                href="/dashboard/notifications"
                aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ""}`}
                className="relative inline-flex size-9 items-center justify-center rounded-lg text-white/45 transition-colors hover:bg-white/[0.05] hover:text-white"
              >
                <Bell className="size-4" />
                {unread > 0 && (
                  <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-violet-400 ring-2 ring-[#080a14]" />
                )}
              </Link>
              <Button asChild size="sm" className="hidden rounded-lg sm:inline-flex">
                <Link href="/dashboard/monitors/new">
                  <Plus className="size-3.5" />
                  Add website
                </Link>
              </Button>
            </div>
          </div>
        </header>

        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto min-h-[calc(100dvh-4rem)] w-full max-w-6xl px-4 py-6 outline-none sm:px-6 sm:py-7 lg:px-8 lg:py-9"
        >
          {children}
        </main>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          id="mobile-navigation"
          side="left"
          className="flex w-[min(88vw,320px)] flex-col border-white/10 bg-[#0a0c16] p-0 text-white"
        >
          <SheetHeader className="flex h-16 flex-row items-center border-b border-white/[0.06] px-5 py-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SheetDescription className="sr-only">
              Navigate your ChangeRadar workspace.
            </SheetDescription>
            <Logo href="/dashboard" />
          </SheetHeader>
          <div className="px-3 pt-4">
            <Button asChild className="h-9 w-full justify-start rounded-lg text-[12.5px]">
              <Link href="/dashboard/monitors/new" onClick={() => setMobileOpen(false)}>
                <Plus className="size-4" />
                Add website
              </Link>
            </Button>
          </div>
          <div className="mt-4 flex flex-1 flex-col overflow-hidden">
            <NavList
              isAdmin={user.isAdmin}
              unread={unread}
              onNavigate={() => setMobileOpen(false)}
            />
            <UsageCard
              monitorCount={monitorCount}
              monitorLimit={monitorLimit}
              planName={user.planName}
              onNavigate={() => setMobileOpen(false)}
            />
            <div className="border-t border-white/[0.06] p-2">
              <AccountMenu
                name={user.name}
                email={user.email}
                image={user.image}
                planName={user.planName}
                isAdmin={user.isAdmin}
              />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
