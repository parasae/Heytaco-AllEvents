"use client";

import { usePathname } from "next/navigation";
import { Menu, Search, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/shared/user-avatar";
import { TacoCounter } from "@/components/shared/taco-counter";
import { NAV_ITEMS, ADMIN_NAV_ITEMS, TACO_EMOJI } from "@/lib/constants";
import { useDemoUser } from "@/lib/demo-user";

interface HeaderProps {
  onMenuToggle: () => void;
  onGiveTaco: () => void;
}

function getPageTitle(pathname: string): string {
  const allItems = [...NAV_ITEMS, ...ADMIN_NAV_ITEMS];
  const match = allItems.find(
    (item) =>
      pathname === item.href ||
      (item.href !== "/dashboard" && pathname.startsWith(item.href))
  );
  if (match) return match.label;

  if (pathname.startsWith("/admin")) return "Admin";
  return "Dashboard";
}

export function Header({ onMenuToggle, onGiveTaco }: HeaderProps) {
  const { user: demoUser } = useDemoUser();
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-amber-100 bg-white/80 backdrop-blur-md px-4 lg:px-6">
      {/* Mobile menu button */}
      <button
        onClick={onMenuToggle}
        className="rounded-lg p-2 text-amber-600 hover:bg-amber-50 transition-colors lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Page title */}
      <h1 className="text-lg font-semibold text-amber-950 hidden sm:block">
        {pageTitle}
      </h1>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search */}
      <div className="relative hidden md:block w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-400" />
        <Input
          placeholder="Search people, tags..."
          className="pl-9 h-9 bg-amber-50/50 border-amber-100 text-sm focus-visible:ring-amber-300"
          readOnly
        />
      </div>

      {/* Taco counter - compact, hidden on mobile */}
      <div className="hidden lg:block">
        <TacoCounter compact />
      </div>

      {/* Give Taco button */}
      <Button
        onClick={onGiveTaco}
        size="sm"
        className="gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-md shadow-amber-500/20 text-white font-semibold"
      >
        <span className="text-base leading-none">{TACO_EMOJI}</span>
        <span className="hidden sm:inline">Give Taco</span>
      </Button>

      {/* Notifications */}
      <button className="relative rounded-lg p-2 text-amber-600 hover:bg-amber-50 transition-colors">
        <Bell className="h-5 w-5" />
        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-400 ring-2 ring-white" />
      </button>

      {/* User avatar */}
      <div className="cursor-pointer">
        <UserAvatar
          name={demoUser?.displayName || "Demo User"}
          avatarUrl={demoUser?.avatarUrl}
          size="sm"
        />
      </div>
    </header>
  );
}
