"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { TACO_EMOJI } from "@/lib/constants";
import { formatRelativeTime, generateTacoEmojis } from "@/lib/utils";
import { useCurrentUser } from "@/lib/auth-user";
import type { TacoTransaction } from "@/lib/types";
import { Trash2 } from "lucide-react";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// --- Timeline Skeleton ---
function TimelineSkeleton() {
  return (
    <div className="space-y-6">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="flex flex-col items-center">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="mt-2 h-16 w-0.5" />
          </div>
          <div className="flex-1 pb-6">
            <Skeleton className="mb-2 h-5 w-3/4" />
            <Skeleton className="mb-2 h-16 w-full rounded-xl" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Timeline Event ---
function TimelineEvent({
  taco,
  isAdmin,
  onDelete,
}: {
  taco: TacoTransaction;
  isAdmin: boolean;
  onDelete: (taco: TacoTransaction) => void;
}) {
  return (
    <div className="group flex gap-4">
      {/* Timeline line + dot */}
      <div className="flex flex-col items-center">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-lg shadow-md shadow-amber-400/20 transition-transform duration-200 group-hover:scale-110">
          {TACO_EMOJI}
        </div>
        <div className="mt-2 w-0.5 flex-1 bg-gradient-to-b from-amber-200 to-transparent" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 pb-8">
        {/* Header: Giver -> Receiver + Admin delete */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {/* Giver */}
            <div className="flex items-center gap-1.5">
              <Avatar className="h-6 w-6">
                <AvatarImage src={taco.giver.avatarUrl || undefined} />
                <AvatarFallback className="text-[10px]">
                  {getInitials(taco.giver.displayName)}
                </AvatarFallback>
              </Avatar>
              <span className="font-semibold text-amber-950">
                {taco.giver.displayName}
              </span>
            </div>

            <span className="text-amber-400">
              gave {generateTacoEmojis(taco.amount)} to
            </span>

            {/* Receiver */}
            <div className="flex items-center gap-1.5">
              <Avatar className="h-6 w-6">
                <AvatarImage src={taco.receiver.avatarUrl || undefined} />
                <AvatarFallback className="text-[10px]">
                  {getInitials(taco.receiver.displayName)}
                </AvatarFallback>
              </Avatar>
              <span className="font-semibold text-amber-950">
                {taco.receiver.displayName}
              </span>
            </div>
          </div>

          {/* Admin delete button */}
          {isAdmin && (
            <button
              onClick={() => onDelete(taco)}
              className="shrink-0 rounded-md p-1.5 text-red-300 opacity-0 transition-all duration-150 hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
              title="Remove entry (admin)"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Message bubble */}
        {taco.message && (
          <div className="mt-2 max-w-lg">
            <div className="relative rounded-2xl rounded-tl-sm bg-amber-50 px-4 py-3 shadow-sm transition-colors group-hover:bg-amber-100/60">
              <p className="text-sm text-amber-900">{taco.message}</p>
              {/* Speech bubble tail */}
              <div className="absolute -left-1 top-3 h-3 w-3 rotate-45 bg-amber-50 transition-colors group-hover:bg-amber-100/60" />
            </div>
          </div>
        )}

        {/* Tags + Timestamp */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
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
          <span className="text-xs text-amber-400">
            {formatRelativeTime(taco.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
}

// --- Empty State ---
function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className="relative">
          <span className="text-6xl">{TACO_EMOJI}</span>
          <span className="absolute -right-2 -top-2 text-2xl">💤</span>
        </div>
        <p className="mt-4 text-lg font-medium text-amber-800">
          No activity yet
        </p>
        <p className="mt-1 max-w-sm text-center text-sm text-amber-500">
          When team members give tacos to each other, their activity will show up
          here. Be the first to start the taco party!
        </p>
      </CardContent>
    </Card>
  );
}

// --- Delete Confirmation Dialog ---
function DeleteConfirmDialog({
  taco,
  open,
  deleting,
  onConfirm,
  onCancel,
}: {
  taco: TacoTransaction | null;
  open: boolean;
  deleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!taco) return null;
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Remove taco entry?</DialogTitle>
          <DialogDescription>
            This will permanently delete{" "}
            <span className="font-medium text-amber-700">
              {taco.giver.displayName}
            </span>
            &apos;s {taco.amount === 1 ? "taco" : `${taco.amount} tacos`} to{" "}
            <span className="font-medium text-amber-700">
              {taco.receiver.displayName}
            </span>{" "}
            and reverse all associated stats. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel} disabled={deleting}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={deleting}
            className="bg-red-500 text-white hover:bg-red-600"
          >
            {deleting ? "Removing…" : "Remove entry"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Main Activity Page ---
export default function ActivityPage() {
  const { user: currentUser } = useCurrentUser();
  const isAdmin = currentUser?.isAdmin ?? false;
  const [tacos, setTacos] = useState<TacoTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchUser, setSearchUser] = useState("");
  const [searchTag, setSearchTag] = useState("");

  // Delete dialog state
  const [pendingDelete, setPendingDelete] = useState<TacoTransaction | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchTacos = useCallback(
    async (pageNum: number, append: boolean = false) => {
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const params = new URLSearchParams({
          teamId: currentUser?.teamId || "",
          page: pageNum.toString(),
          limit: "15",
        });

        const res = await fetch(`/api/tacos?${params}`);
        const data = await res.json();
        const newTacos: TacoTransaction[] = data.tacos || [];
        const pagination = data.pagination;

        if (append) {
          setTacos((prev) => [...prev, ...newTacos]);
        } else {
          setTacos(newTacos);
        }

        setHasMore(pagination ? pageNum < pagination.totalPages : false);
      } catch {
        if (!append) setTacos([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [currentUser]
  );

  useEffect(() => {
    fetchTacos(1);
  }, [fetchTacos]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchTacos(nextPage, true);
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/tacos/${pendingDelete.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setTacos((prev) => prev.filter((t) => t.id !== pendingDelete.id));
        setPendingDelete(null);
      }
    } finally {
      setDeleting(false);
    }
  };

  // Client-side filtering
  const filtered = tacos.filter((taco) => {
    const userMatch =
      !searchUser ||
      taco.giver.displayName
        .toLowerCase()
        .includes(searchUser.toLowerCase()) ||
      taco.receiver.displayName
        .toLowerCase()
        .includes(searchUser.toLowerCase());

    const tagMatch =
      !searchTag ||
      taco.tags.some((tt) =>
        tt.tag.name.toLowerCase().includes(searchTag.toLowerCase())
      );

    return userMatch && tagMatch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/60 via-white to-white">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-amber-950">
            Activity Feed {TACO_EMOJI}
          </h1>
          <p className="mt-2 text-amber-600">
            All taco transactions across your team
          </p>
        </div>

        {/* Filter Bar */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex-1">
                <Input
                  placeholder="Filter by user name..."
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <Input
                  placeholder="Filter by tag..."
                  value={searchTag}
                  onChange={(e) => setSearchTag(e.target.value)}
                />
              </div>
              {(searchUser || searchTag) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchUser("");
                    setSearchTag("");
                  }}
                  className="self-center"
                >
                  Clear filters
                </Button>
              )}
            </div>
            {(searchUser || searchTag) && (
              <p className="mt-2 text-xs text-amber-500">
                Showing {filtered.length} of {tacos.length} results
              </p>
            )}
          </CardContent>
        </Card>

        {/* Timeline */}
        {loading ? (
          <TimelineSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="pl-1">
              {filtered.map((taco) => (
                <TimelineEvent
                  key={taco.id}
                  taco={taco}
                  isAdmin={isAdmin}
                  onDelete={setPendingDelete}
                />
              ))}
            </div>

            {/* Load More */}
            {hasMore && !searchUser && !searchTag && (
              <div className="mt-6 flex justify-center">
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="min-w-[160px]"
                >
                  {loadingMore ? (
                    <span className="flex items-center gap-2">
                      <svg
                        className="h-4 w-4 animate-spin"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Loading...
                    </span>
                  ) : (
                    "Load More"
                  )}
                </Button>
              </div>
            )}

            {!hasMore && tacos.length > 0 && (
              <p className="mt-8 text-center text-sm text-amber-400">
                You&apos;ve reached the end of the feed {TACO_EMOJI}
              </p>
            )}
          </>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <DeleteConfirmDialog
        taco={pendingDelete}
        open={pendingDelete !== null}
        deleting={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
