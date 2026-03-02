"use client";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const AMBER_BACKGROUNDS = [
  "bg-amber-100",
  "bg-amber-200",
  "bg-orange-100",
  "bg-yellow-100",
  "bg-amber-50",
  "bg-orange-200",
] as const;

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getBackgroundForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AMBER_BACKGROUNDS[Math.abs(hash) % AMBER_BACKGROUNDS.length];
}

interface UserAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
  showOnlineStatus?: boolean;
  isOnline?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "h-7 w-7 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
} as const;

const statusSizeClasses = {
  sm: "h-2 w-2 border",
  md: "h-3 w-3 border-2",
  lg: "h-4 w-4 border-2",
} as const;

export function UserAvatar({
  name,
  avatarUrl,
  size = "md",
  showOnlineStatus = false,
  isOnline = false,
  className,
}: UserAvatarProps) {
  const initials = getInitials(name);
  const bgClass = getBackgroundForName(name);

  return (
    <div className="relative inline-flex">
      <Avatar className={cn(sizeClasses[size], className)}>
        {avatarUrl && (
          <AvatarImage src={avatarUrl} alt={name} />
        )}
        <AvatarFallback
          className={cn(
            bgClass,
            "font-semibold text-amber-800",
            size === "sm" && "text-[10px]",
            size === "lg" && "text-base"
          )}
        >
          {initials}
        </AvatarFallback>
      </Avatar>
      {showOnlineStatus && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full border-white",
            statusSizeClasses[size],
            isOnline ? "bg-emerald-400" : "bg-gray-300"
          )}
        />
      )}
    </div>
  );
}
