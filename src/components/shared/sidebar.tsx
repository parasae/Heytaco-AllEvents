"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Trophy,
  Activity,
  ShoppingBag,
  BarChart3,
  Users,
  Gift,
  Settings,
  ChevronLeft,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, ADMIN_NAV_ITEMS, APP_NAME } from "@/lib/constants";
import { useDemoUser } from "@/lib/demo-user";
import { UserAvatar } from "@/components/shared/user-avatar";
import { TacoCounter } from "@/components/shared/taco-counter";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Trophy,
  Activity,
  ShoppingBag,
  BarChart3,
  Users,
  Gift,
  Settings,
};

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user: demoUser } = useDemoUser();
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 flex h-dvh w-[260px] flex-col bg-white border-r border-amber-100 sidebar-shadow transition-transform duration-300 ease-in-out",
          "lg:translate-x-0 lg:z-30",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo & Close */}
        <div className="flex h-16 items-center justify-between px-5 border-b border-amber-50">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <span className="text-2xl transition-transform duration-300 group-hover:animate-taco-bounce">
              {"\uD83C\uDF2E"}
            </span>
            <span className="text-xl font-bold taco-gradient-text">
              {APP_NAME}
            </span>
          </Link>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-amber-400 hover:bg-amber-50 hover:text-amber-600 transition-colors lg:hidden"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {/* Main nav */}
          <div className="mb-2">
            <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-amber-400">
              Menu
            </p>
            {NAV_ITEMS.map((item) => {
              const Icon = iconMap[item.icon];
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-amber-50 text-amber-900 shadow-sm shadow-amber-100/50"
                      : "text-amber-700/70 hover:bg-amber-50/60 hover:text-amber-800"
                  )}
                >
                  {Icon && (
                    <Icon
                      className={cn(
                        "h-5 w-5 shrink-0 transition-colors",
                        isActive ? "text-amber-500" : "text-amber-400/70"
                      )}
                    />
                  )}
                  <span>{item.label}</span>
                  {isActive && (
                    <div className="ml-auto h-1.5 w-1.5 rounded-full bg-amber-500" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Divider */}
          <div className="mx-3 border-t border-amber-100" />

          {/* Admin nav */}
          <div className="mt-2">
            <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-amber-400">
              Admin
            </p>
            {ADMIN_NAV_ITEMS.map((item) => {
              const Icon = iconMap[item.icon];
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-amber-50 text-amber-900 shadow-sm shadow-amber-100/50"
                      : "text-amber-700/70 hover:bg-amber-50/60 hover:text-amber-800"
                  )}
                >
                  {Icon && (
                    <Icon
                      className={cn(
                        "h-5 w-5 shrink-0 transition-colors",
                        isActive ? "text-amber-500" : "text-amber-400/70"
                      )}
                    />
                  )}
                  <span>{item.label}</span>
                  {isActive && (
                    <div className="ml-auto h-1.5 w-1.5 rounded-full bg-amber-500" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Taco Counter */}
        <div className="px-3 py-3">
          <TacoCounter />
        </div>

        {/* User Profile */}
        <div className="border-t border-amber-100 p-3">
          <div className="flex items-center gap-3 rounded-xl p-2 hover:bg-amber-50 transition-colors cursor-pointer group">
            <UserAvatar
              name={demoUser?.displayName || "Demo User"}
              avatarUrl={demoUser?.avatarUrl}
              size="sm"
              showOnlineStatus
              isOnline
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-900 truncate">
                {demoUser?.displayName || "Demo User"}
              </p>
              <p className="text-xs text-amber-500 truncate">
                {demoUser?.email || "demo@tacotime.app"}
              </p>
            </div>
            <LogOut className="h-4 w-4 text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </aside>
    </>
  );
}
