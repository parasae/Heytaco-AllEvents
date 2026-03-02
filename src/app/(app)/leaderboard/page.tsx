"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DEMO_TEAM_ID, TACO_EMOJI } from "@/lib/constants";
import type { LeaderboardEntry } from "@/lib/types";

type Period = "week" | "month" | "all";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// --- Animated Number ---
function AnimatedNumber({
  value,
  duration = 900,
}: {
  value: number;
  duration?: number;
}) {
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

// --- Podium Card ---
function PodiumCard({
  entry,
  rank,
  sort,
}: {
  entry: LeaderboardEntry;
  rank: number;
  sort: "received" | "given";
}) {
  const count = sort === "received" ? entry.totalReceived : entry.totalGiven;
  const medals = ["", "👑", "🥈", "🥉"];
  const isFirst = rank === 1;

  return (
    <div
      className={`flex flex-col items-center ${isFirst ? "order-1 lg:-mt-6" : rank === 2 ? "order-0" : "order-2"}`}
    >
      <Card
        className={`relative w-full text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
          isFirst
            ? "border-amber-300 bg-gradient-to-b from-amber-50 to-white shadow-lg shadow-amber-200/40"
            : "bg-white"
        }`}
      >
        <CardContent className={`${isFirst ? "p-6 pt-8" : "p-5 pt-6"}`}>
          {/* Medal */}
          <div
            className={`mb-3 text-center ${isFirst ? "text-4xl" : "text-2xl"}`}
          >
            {medals[rank]}
          </div>

          {/* Avatar */}
          <div className="flex justify-center">
            <Avatar
              className={`${isFirst ? "h-20 w-20 ring-4 ring-amber-300 ring-offset-2" : "h-14 w-14"}`}
            >
              <AvatarImage src={entry.avatarUrl || undefined} />
              <AvatarFallback
                className={isFirst ? "text-xl" : "text-sm"}
              >
                {getInitials(entry.displayName)}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Name */}
          <h3
            className={`mt-3 font-bold text-amber-950 ${isFirst ? "text-lg" : "text-base"}`}
          >
            {entry.displayName}
          </h3>

          {/* Count */}
          <div
            className={`mt-2 font-bold text-amber-600 ${isFirst ? "text-3xl" : "text-xl"}`}
          >
            <AnimatedNumber value={count} />
            <span className="ml-1">{TACO_EMOJI}</span>
          </div>

          {/* Rank badge */}
          <div
            className={`mx-auto mt-3 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
              isFirst
                ? "bg-amber-400 text-white shadow-sm shadow-amber-400/30"
                : rank === 2
                  ? "bg-gray-200 text-gray-700"
                  : "bg-amber-700/10 text-amber-700"
            }`}
          >
            #{rank}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// --- Skeleton Loaders ---
function PodiumSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardContent className="flex flex-col items-center p-6">
            <Skeleton className="mb-3 h-8 w-8 rounded-full" />
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="mt-3 h-5 w-24" />
            <Skeleton className="mt-2 h-8 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(7)].map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-lg p-3"
        >
          <Skeleton className="h-6 w-8" />
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="ml-auto h-4 w-12" />
        </div>
      ))}
    </div>
  );
}

// --- Rankings Table ---
function RankingsTable({
  entries,
  sort,
  search,
}: {
  entries: LeaderboardEntry[];
  sort: "received" | "given";
  search: string;
}) {
  const filtered = entries.filter(
    (e) =>
      e.displayName.toLowerCase().includes(search.toLowerCase()) ||
      e.name.toLowerCase().includes(search.toLowerCase())
  );

  // Skip top 3 for the table since they're in the podium
  const tableEntries = filtered.slice(3);

  if (tableEntries.length === 0 && filtered.length <= 3) {
    return null;
  }

  return (
    <div className="mt-8">
      <h3 className="mb-4 text-lg font-semibold text-amber-950">
        Full Rankings
      </h3>
      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-amber-50">
            {tableEntries.map((entry, index) => {
              const rank = index + 4;
              const count =
                sort === "received" ? entry.totalReceived : entry.totalGiven;
              return (
                <div
                  key={entry.id}
                  className={`flex items-center gap-4 px-4 py-3 transition-colors hover:bg-amber-50/60 ${
                    index % 2 === 0 ? "bg-white" : "bg-amber-50/30"
                  }`}
                >
                  {/* Rank */}
                  <span className="w-8 text-center text-sm font-bold text-amber-400">
                    #{rank}
                  </span>

                  {/* Avatar */}
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={entry.avatarUrl || undefined} />
                    <AvatarFallback className="text-xs">
                      {getInitials(entry.displayName)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Name */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-amber-950">
                      {entry.displayName}
                    </p>
                    <p className="truncate text-xs text-amber-500">
                      @{entry.name}
                    </p>
                  </div>

                  {/* Count */}
                  <div className="flex items-center gap-1 text-sm font-bold text-amber-600">
                    {count}
                    <span>{TACO_EMOJI}</span>
                  </div>

                  {/* Trend indicator */}
                  <div className="w-6 text-center">
                    {index < 3 ? (
                      <span className="text-green-500">&#9650;</span>
                    ) : index > tableEntries.length - 4 ? (
                      <span className="text-red-400">&#9660;</span>
                    ) : (
                      <span className="text-amber-300">&#8212;</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// --- Main Leaderboard Page ---
export default function LeaderboardPage() {
  const [sort, setSort] = useState<"received" | "given">("received");
  const [period, setPeriod] = useState<Period>("all");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/users?teamId=${DEMO_TEAM_ID}&sort=${sort}&limit=50`
      );
      const data = await res.json();
      const ranked: LeaderboardEntry[] = (data || []).map(
        (u: LeaderboardEntry, i: number) => ({
          ...u,
          rank: i + 1,
        })
      );
      setEntries(ranked);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [sort]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const filtered = entries.filter(
    (e) =>
      e.displayName.toLowerCase().includes(search.toLowerCase()) ||
      e.name.toLowerCase().includes(search.toLowerCase())
  );
  const top3 = filtered.slice(0, 3);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/60 via-white to-white">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-amber-950 sm:text-4xl">
            Leaderboard {TACO_EMOJI}
          </h1>
          <p className="mt-2 text-amber-600">
            See who&apos;s leading the taco game
          </p>
        </div>

        {/* Tabs & Filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Tabs
            value={sort}
            onValueChange={(v) => setSort(v as "received" | "given")}
          >
            <TabsList>
              <TabsTrigger value="received">Receivers</TabsTrigger>
              <TabsTrigger value="given">Givers</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-3">
            {/* Period filter */}
            <div className="flex rounded-lg bg-amber-50 p-1">
              {(
                [
                  { value: "week", label: "This Week" },
                  { value: "month", label: "This Month" },
                  { value: "all", label: "All Time" },
                ] as const
              ).map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                    period === p.value
                      ? "bg-white text-amber-900 shadow-sm"
                      : "text-amber-600 hover:text-amber-800"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <Input
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>

        {/* Content */}
        {loading ? (
          <>
            <PodiumSkeleton />
            <div className="mt-8">
              <TableSkeleton />
            </div>
          </>
        ) : entries.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <span className="text-6xl">🏆</span>
              <p className="mt-4 text-lg font-medium text-amber-800">
                No rankings yet
              </p>
              <p className="mt-1 text-sm text-amber-500">
                Start giving tacos to see the leaderboard come to life!
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Top 3 Podium */}
            {top3.length > 0 && (
              <div className="grid grid-cols-1 items-end gap-4 lg:grid-cols-3">
                {top3.map((entry, i) => (
                  <PodiumCard
                    key={entry.id}
                    entry={entry}
                    rank={i + 1}
                    sort={sort}
                  />
                ))}
              </div>
            )}

            {/* Full Rankings Table */}
            <RankingsTable entries={filtered} sort={sort} search={search} />
          </>
        )}
      </div>
    </div>
  );
}
