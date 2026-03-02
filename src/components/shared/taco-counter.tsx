"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { DEFAULT_DAILY_LIMIT, TACO_EMOJI } from "@/lib/constants";
import { useCurrentUser } from "@/lib/auth-user";
import { onTacoGiven } from "@/lib/events";

interface TacoCounterProps {
  tacosGiven?: number;
  dailyLimit?: number;
  compact?: boolean;
  className?: string;
}

export function TacoCounter({
  tacosGiven: tacosGivenProp,
  dailyLimit: dailyLimitProp,
  compact = false,
  className,
}: TacoCounterProps) {
  const { user } = useCurrentUser();
  const [fetchedGiven, setFetchedGiven] = useState(0);
  const [fetchedLimit, setFetchedLimit] = useState(DEFAULT_DAILY_LIMIT);

  // Determine whether we should self-fetch (no explicit props provided)
  const shouldFetch = tacosGivenProp === undefined;

  const tacosGiven = tacosGivenProp !== undefined ? tacosGivenProp : fetchedGiven;
  const dailyLimit = dailyLimitProp !== undefined ? dailyLimitProp : fetchedLimit;

  const remaining = Math.max(0, dailyLimit - tacosGiven);
  const percentage = dailyLimit > 0 ? (tacosGiven / dailyLimit) * 100 : 0;
  const [animating, setAnimating] = useState(false);
  const [displayedGiven, setDisplayedGiven] = useState(tacosGiven);

  const fetchStats = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/users/${user.id}/stats`);
      if (res.ok) {
        const data = await res.json();
        if (data?.daily) {
          setFetchedGiven(data.daily.tacosGiven);
          setFetchedLimit(data.daily.dailyLimit);
        }
      }
    } catch {
      // silently fail - will keep current values
    }
  }, [user?.id]);

  // Fetch stats on mount when self-fetching
  useEffect(() => {
    if (shouldFetch) {
      fetchStats();
    }
  }, [shouldFetch, fetchStats]);

  // Listen for taco:given events and re-fetch
  useEffect(() => {
    if (!shouldFetch) return;
    return onTacoGiven(() => {
      fetchStats();
    });
  }, [shouldFetch, fetchStats]);

  useEffect(() => {
    if (tacosGiven !== displayedGiven) {
      setAnimating(true);
      const timeout = setTimeout(() => {
        setDisplayedGiven(tacosGiven);
        setAnimating(false);
      }, 600);
      return () => clearTimeout(timeout);
    }
  }, [tacosGiven, displayedGiven]);

  if (compact) {
    return (
      <div className={cn("flex items-center gap-1.5", className)}>
        <span
          className={cn(
            "text-base transition-transform duration-300",
            animating && "animate-taco-bounce"
          )}
        >
          {TACO_EMOJI}
        </span>
        <span className="text-xs font-medium text-amber-700">
          {remaining}/{dailyLimit}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 p-4 border border-amber-100",
        className
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-amber-800">
          Today&apos;s Tacos
        </span>
        <span
          className={cn(
            "text-xl transition-transform duration-300",
            animating && "animate-taco-bounce"
          )}
        >
          {TACO_EMOJI}
        </span>
      </div>

      <div className="flex items-baseline gap-1 mb-3">
        <span className="text-2xl font-bold text-amber-900">{remaining}</span>
        <span className="text-sm text-amber-600">/ {dailyLimit} remaining</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-amber-100">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            percentage <= 40
              ? "bg-amber-400"
              : percentage <= 80
                ? "bg-orange-400"
                : "bg-red-400"
          )}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>

      <p className="mt-2 text-xs text-amber-500">
        {remaining === 0
          ? "All tacos given! Resets tomorrow."
          : `${remaining} taco${remaining !== 1 ? "s" : ""} left to give today`}
      </p>
    </div>
  );
}
