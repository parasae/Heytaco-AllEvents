"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { DEMO_TEAM_ID, TACO_EMOJI } from "@/lib/constants";
import { formatRelativeTime, generateTacoEmojis } from "@/lib/utils";
import { useDemoUser } from "@/lib/demo-user";
import type { TacoTransaction, LeaderboardEntry } from "@/lib/types";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// --- Animated Number ---
function AnimatedNumber({ value, duration = 800 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value === 0) {
      setDisplay(0);
      return;
    }
    let start = 0;
    const increment = value / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value, duration]);

  return <span>{display}</span>;
}

// --- Floating Taco Decorations ---
function FloatingTacos() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute animate-bounce text-2xl opacity-20"
          style={{
            left: `${15 + i * 15}%`,
            top: `${10 + (i % 3) * 25}%`,
            animationDelay: `${i * 0.4}s`,
            animationDuration: `${2 + (i % 3)}s`,
          }}
        >
          {TACO_EMOJI}
        </div>
      ))}
    </div>
  );
}

// --- Stat Card ---
function StatCard({
  title,
  value,
  icon,
  accent,
  subtitle,
}: {
  title: string;
  value: number;
  icon: string;
  accent: string;
  subtitle?: string;
}) {
  return (
    <Card className={`relative overflow-hidden border-l-4 ${accent}`}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-amber-600">{title}</p>
            <p className="mt-1 text-3xl font-bold text-amber-950">
              <AnimatedNumber value={value} />
            </p>
            {subtitle && (
              <p className="mt-0.5 text-xs text-amber-500">{subtitle}</p>
            )}
          </div>
          <div className="text-3xl">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

// --- Skeleton Loaders ---
function StatsSkeletons() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i} className="border-l-4 border-l-amber-200">
          <CardContent className="p-5">
            <Skeleton className="mb-2 h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="ml-2 flex-1">
                <Skeleton className="mb-2 h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function LeaderboardSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-4 w-8" />
        </div>
      ))}
    </div>
  );
}

// --- Activity Feed Item ---
function ActivityItem({ taco }: { taco: TacoTransaction }) {
  return (
    <Card className="group transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Giver */}
          <Avatar className="h-9 w-9">
            <AvatarImage src={taco.giver.avatarUrl || undefined} />
            <AvatarFallback className="text-xs">
              {getInitials(taco.giver.displayName)}
            </AvatarFallback>
          </Avatar>

          {/* Arrow */}
          <div className="mt-2 flex items-center text-amber-400">
            <span className="text-lg">{generateTacoEmojis(taco.amount)}</span>
            <svg
              className="mx-1 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </div>

          {/* Receiver */}
          <Avatar className="h-9 w-9">
            <AvatarImage src={taco.receiver.avatarUrl || undefined} />
            <AvatarFallback className="text-xs">
              {getInitials(taco.receiver.displayName)}
            </AvatarFallback>
          </Avatar>

          {/* Content */}
          <div className="ml-1 min-w-0 flex-1">
            <p className="text-sm text-amber-950">
              <span className="font-semibold">{taco.giver.displayName}</span>
              <span className="mx-1 text-amber-400">gave to</span>
              <span className="font-semibold">{taco.receiver.displayName}</span>
            </p>
            {taco.message && (
              <p className="mt-1 text-sm text-amber-700/80 italic">
                &ldquo;{taco.message}&rdquo;
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {taco.tags.map((tt) => (
                <Badge
                  key={tt.id}
                  className="text-[10px] px-2 py-0"
                  style={{
                    backgroundColor: `${tt.tag.color}18`,
                    color: tt.tag.color,
                    borderColor: `${tt.tag.color}40`,
                  }}
                >
                  #{tt.tag.name}
                </Badge>
              ))}
              <span className="ml-auto text-xs text-amber-400">
                {formatRelativeTime(taco.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// --- Mini Leaderboard ---
function MiniLeaderboard({
  entries,
  loading,
}: {
  entries: LeaderboardEntry[];
  loading: boolean;
}) {
  const rankEmojis = ["", "#1", "#2", "#3", "#4", "#5"];

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Top Receivers This Week</CardTitle>
        </CardHeader>
        <CardContent>
          <LeaderboardSkeleton />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Top Receivers</CardTitle>
          <Link
            href="/leaderboard"
            className="text-sm font-medium text-amber-600 transition-colors hover:text-amber-700 hover:underline"
          >
            View all
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="py-6 text-center text-sm text-amber-400">
            No data yet. Start giving tacos! {TACO_EMOJI}
          </p>
        ) : (
          <div className="space-y-3">
            {entries.slice(0, 5).map((entry, index) => (
              <div
                key={entry.id}
                className="group flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-amber-50/80"
              >
                {/* Rank */}
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                    index === 0
                      ? "bg-amber-400 text-white shadow-sm shadow-amber-400/30"
                      : index === 1
                        ? "bg-gray-300 text-gray-700"
                        : index === 2
                          ? "bg-amber-700 text-amber-100"
                          : "bg-amber-100 text-amber-600"
                  }`}
                >
                  {rankEmojis[index + 1]}
                </div>

                {/* Avatar */}
                <Avatar className="h-8 w-8">
                  <AvatarImage src={entry.avatarUrl || undefined} />
                  <AvatarFallback className="text-xs">
                    {getInitials(entry.displayName)}
                  </AvatarFallback>
                </Avatar>

                {/* Name */}
                <span className="flex-1 truncate text-sm font-medium text-amber-900">
                  {entry.displayName}
                </span>

                {/* Count */}
                <span className="text-sm font-bold text-amber-600">
                  {entry.totalReceived} {TACO_EMOJI}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- Main Dashboard Page ---
export default function DashboardPage() {
  const { user: demoUser, loading: loadingUser } = useDemoUser();
  const [tacos, setTacos] = useState<TacoTransaction[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [stats, setStats] = useState<{
    daily: { tacosGiven: number; tacosRemaining: number; dailyLimit: number };
    streak: number;
    monthly: { given: number; received: number };
  } | null>(null);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);

  const fetchData = useCallback(async () => {
    // Fetch activity feed
    fetch(`/api/tacos?teamId=${DEMO_TEAM_ID}&limit=20`)
      .then((res) => res.json())
      .then((data) => {
        setTacos(data.tacos || []);
        setLoadingFeed(false);
      })
      .catch(() => setLoadingFeed(false));

    // Fetch leaderboard
    fetch(`/api/users?teamId=${DEMO_TEAM_ID}&sort=received&limit=5`)
      .then((res) => res.json())
      .then((data) => {
        const entries: LeaderboardEntry[] = (data || []).map(
          (u: LeaderboardEntry, i: number) => ({
            ...u,
            rank: i + 1,
          })
        );
        setLeaderboard(entries);
        setLoadingLeaderboard(false);
      })
      .catch(() => setLoadingLeaderboard(false));

    // Fetch user stats (only if we have a valid demo user ID)
    if (!demoUser) {
      setLoadingStats(false);
      return;
    }
    fetch(`/api/users/${demoUser.id}/stats`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.daily) {
          setStats(data);
        }
        setLoadingStats(false);
      })
      .catch(() => setLoadingStats(false));
  }, [demoUser]);

  useEffect(() => {
    if (!loadingUser) {
      fetchData();
    }
  }, [fetchData, loadingUser]);

  const tacosRemaining = stats?.daily.tacosRemaining ?? 5;
  const dailyLimit = stats?.daily.dailyLimit ?? 5;
  const progressPercent = ((dailyLimit - tacosRemaining) / dailyLimit) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/60 via-white to-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 p-6 shadow-lg shadow-amber-500/20 sm:p-8">
          <FloatingTacos />
          <div className="relative z-10">
            <h1 className="text-2xl font-bold text-white sm:text-3xl">
              {getGreeting()}! {TACO_EMOJI}
            </h1>
            <p className="mt-1 text-amber-100">
              Ready to celebrate your team today?
            </p>

            {/* Daily Taco Counter */}
            <div className="mt-5 max-w-md">
              <div className="flex items-center justify-between text-sm text-white/90">
                <span>Daily tacos used</span>
                <span className="font-semibold">
                  {dailyLimit - tacosRemaining}/{dailyLimit}
                </span>
              </div>
              <div className="mt-2 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-3 rounded-full bg-white/90 transition-all duration-700 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="mt-2 text-sm font-medium text-white">
                {tacosRemaining} {TACO_EMOJI} remaining today
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats Row */}
        {loadingStats ? (
          <StatsSkeletons />
        ) : (
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Given Today"
              value={stats?.daily.tacosGiven ?? 0}
              icon={TACO_EMOJI}
              accent="border-l-amber-400"
              subtitle={`of ${dailyLimit} daily limit`}
            />
            <StatCard
              title="Received (All Time)"
              value={stats?.monthly.received ?? 0}
              icon="🎉"
              accent="border-l-green-400"
              subtitle="this month"
            />
            <StatCard
              title="Your Rank"
              value={
                demoUser
                  ? leaderboard.findIndex((e) => e.id === demoUser.id) + 1 || 0
                  : 0
              }
              icon="🏆"
              accent="border-l-blue-400"
              subtitle="on leaderboard"
            />
            <StatCard
              title="Streak"
              value={stats?.streak ?? 0}
              icon="🔥"
              accent="border-l-orange-400"
              subtitle="consecutive days"
            />
          </div>
        )}

        {/* Main Content: Feed + Mini Leaderboard */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Activity Feed */}
          <div className="lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-amber-950">
                Recent Activity
              </h2>
              <Link
                href="/activity"
                className="text-sm font-medium text-amber-600 transition-colors hover:text-amber-700 hover:underline"
              >
                View all
              </Link>
            </div>

            {loadingFeed ? (
              <FeedSkeleton />
            ) : tacos.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <span className="text-5xl">{TACO_EMOJI}</span>
                  <p className="mt-3 text-lg font-medium text-amber-800">
                    No tacos yet!
                  </p>
                  <p className="mt-1 text-sm text-amber-500">
                    Be the first to give a taco to someone on your team.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {tacos.map((taco) => (
                  <ActivityItem key={taco.id} taco={taco} />
                ))}
              </div>
            )}
          </div>

          {/* Mini Leaderboard */}
          <div>
            <MiniLeaderboard
              entries={leaderboard}
              loading={loadingLeaderboard}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
