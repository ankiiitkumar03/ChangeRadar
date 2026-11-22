"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { BadgeCheck, ChevronsUpDown, CreditCard, LogOut, Settings, Shield, User } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { initials } from "@/lib/format";

export function AccountMenu({
  name,
  email,
  image,
  planName,
  isAdmin,
  align = "start",
}: {
  name: string;
  email: string;
  image?: string | null;
  planName: string;
  isAdmin?: boolean;
  align?: "start" | "end";
}) {
  const router = useRouter();

  async function signOut() {
    await authClient.signOut();
    router.replace("/sign-in");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="group flex w-full items-center gap-2.5 rounded-lg border border-transparent px-2 py-2 text-left transition-colors hover:border-white/[0.08] hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
        >
          <Avatar className="size-8 rounded-lg border border-white/10">
            {image && <AvatarImage src={image} alt="" />}
            <AvatarFallback className="rounded-lg bg-violet-500/15 text-[11px] font-semibold text-violet-200">
              {initials(name)}
            </AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12.5px] font-medium text-white/85">
              {name}
            </span>
            <span className="flex items-center gap-1 text-[10.5px] text-white/35">
              <BadgeCheck className="size-3 text-violet-300/70" />
              {planName} plan
            </span>
          </span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-white/25 transition-colors group-hover:text-white/50" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align={align}
        side="top"
        sideOffset={8}
        className="w-[232px] border-white/10 bg-[#12141f] text-white/80"
      >
        <DropdownMenuLabel className="font-normal">
          <p className="text-[12px] font-medium text-white">{name}</p>
          <p className="truncate text-[11px] text-white/40">{email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild className="focus:bg-white/[0.06] focus:text-white">
            <Link href="/settings">
              <User className="size-4" /> Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="focus:bg-white/[0.06] focus:text-white">
            <Link href="/dashboard/billing">
              <CreditCard className="size-4" /> Billing & plan
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="focus:bg-white/[0.06] focus:text-white">
            <Link href="/settings#security">
              <Settings className="size-4" /> Security
            </Link>
          </DropdownMenuItem>
          {isAdmin && (
            <DropdownMenuItem asChild className="focus:bg-white/[0.06] focus:text-white">
              <Link href="/admin">
                <Shield className="size-4" /> Admin
              </Link>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem
          onSelect={() => void signOut()}
          className="text-rose-300 focus:bg-rose-500/10 focus:text-rose-200"
        >
          <LogOut className="size-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
