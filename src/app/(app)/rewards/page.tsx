"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TACO_EMOJI } from "@/lib/constants";
import { formatDate, cn } from "@/lib/utils";
import { useCurrentUser } from "@/lib/auth-user";
import type { RewardItem, RedemptionItem } from "@/lib/types";

// Reward type emojis
const rewardEmojis: Record<string, string> = {
  coffee: "☕",
  lunch: "🍽️",
  swag: "👕",
  gift_card: "🎁",
  experience: "🎯",
  time_off: "🏖️",
  custom: "🌟",
};

function getRewardEmoji(type: string): string {
  return rewardEmojis[type] || "🌟";
}

// --- Reward Card Skeleton ---
function RewardCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-5">
        <Skeleton className="mx-auto mb-4 h-16 w-16 rounded-full" />
        <Skeleton className="mx-auto mb-2 h-5 w-3/4" />
        <Skeleton className="mx-auto mb-4 h-4 w-full" />
        <Skeleton className="mx-auto mb-2 h-8 w-20" />
        <Skeleton className="mx-auto h-4 w-24" />
      </CardContent>
      <CardFooter className="justify-center p-4 pt-0">
        <Skeleton className="h-10 w-full" />
      </CardFooter>
    </Card>
  );
}

// --- Redemption Status Badge ---
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    approved: "bg-blue-100 text-blue-800 border-blue-200",
    fulfilled: "bg-green-100 text-green-800 border-green-200",
    rejected: "bg-red-100 text-red-800 border-red-200",
  };

  return (
    <Badge
      className={cn(
        "text-xs capitalize",
        styles[status] || "bg-gray-100 text-gray-800"
      )}
    >
      {status}
    </Badge>
  );
}

// --- Reward Card ---
function RewardCard({
  reward,
  userBalance,
  onRedeem,
}: {
  reward: RewardItem;
  userBalance: number;
  onRedeem: (reward: RewardItem) => void;
}) {
  const canAfford = userBalance >= reward.cost;
  const isOutOfStock = reward.quantity !== null && reward.quantity <= 0;

  return (
    <Card className="group flex flex-col transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
      <CardContent className="flex flex-1 flex-col items-center p-6 text-center">
        {/* Emoji / Image */}
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 to-amber-200 text-4xl shadow-inner transition-transform duration-200 group-hover:scale-110">
          {reward.imageUrl ? (
            <img
              src={reward.imageUrl}
              alt={reward.title}
              className="h-12 w-12 rounded-lg object-cover"
            />
          ) : (
            getRewardEmoji(reward.type)
          )}
        </div>

        {/* Title */}
        <h3 className="mb-1 text-lg font-bold text-amber-950">
          {reward.title}
        </h3>

        {/* Description */}
        {reward.description && (
          <p className="mb-4 text-sm text-amber-600/80 line-clamp-2">
            {reward.description}
          </p>
        )}

        {/* Cost */}
        <div className="mb-2 flex items-center gap-1 rounded-full bg-amber-50 px-4 py-2 text-xl font-bold text-amber-700">
          {reward.cost} {TACO_EMOJI}
        </div>

        {/* Quantity */}
        <p className="text-xs text-amber-500">
          {reward.quantity === null
            ? "Unlimited"
            : isOutOfStock
              ? "Out of stock"
              : `${reward.quantity} remaining`}
        </p>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Button
          className="w-full"
          disabled={!canAfford || isOutOfStock}
          onClick={() => onRedeem(reward)}
          variant={canAfford && !isOutOfStock ? "default" : "outline"}
        >
          {isOutOfStock
            ? "Out of Stock"
            : !canAfford
              ? `Need ${reward.cost - userBalance} more ${TACO_EMOJI}`
              : "Redeem"}
        </Button>
      </CardFooter>
    </Card>
  );
}

// --- Confirmation Dialog ---
function RedeemDialog({
  reward,
  open,
  onClose,
  onConfirm,
  isRedeeming,
}: {
  reward: RewardItem | null;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isRedeeming: boolean;
}) {
  if (!reward) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Redemption</DialogTitle>
          <DialogDescription>
            Are you sure you want to redeem this reward?
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center py-4">
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-3xl">
            {getRewardEmoji(reward.type)}
          </div>
          <h3 className="text-lg font-bold text-amber-950">{reward.title}</h3>
          {reward.description && (
            <p className="mt-1 text-center text-sm text-amber-600">
              {reward.description}
            </p>
          )}
          <div className="mt-3 flex items-center gap-1 rounded-full bg-amber-50 px-4 py-2 text-lg font-bold text-amber-700">
            {reward.cost} {TACO_EMOJI}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isRedeeming}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isRedeeming}>
            {isRedeeming ? (
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
                Redeeming...
              </span>
            ) : (
              `Redeem for ${reward.cost} ${TACO_EMOJI}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Main Rewards Page ---
export default function RewardsPage() {
  const { user: currentUser, loading: loadingUser } = useCurrentUser();
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [redemptions, setRedemptions] = useState<RedemptionItem[]>([]);
  const [userBalance, setUserBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedReward, setSelectedReward] = useState<RewardItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      const teamId = currentUser?.teamId || "";
      const [rewardsRes, redemptionsRes, userRes] = await Promise.all([
        fetch(`/api/rewards?teamId=${teamId}`),
        fetch(`/api/redemptions?teamId=${teamId}&userId=${currentUser.id}`),
        fetch(`/api/users/${currentUser.id}`),
      ]);

      const rewardsData = await rewardsRes.json();
      setRewards(Array.isArray(rewardsData) ? rewardsData : []);

      const redemptionsData = await redemptionsRes.json();
      setRedemptions(Array.isArray(redemptionsData) ? redemptionsData : []);

      if (userRes.ok) {
        const userData = await userRes.json();
        setUserBalance(userData.redeemable ?? 0);
      }
    } catch {
      // Graceful error handling
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!loadingUser) {
      fetchData();
    }
  }, [fetchData, loadingUser]);

  const handleRedeem = (reward: RewardItem) => {
    setSelectedReward(reward);
    setDialogOpen(true);
  };

  const confirmRedeem = async () => {
    if (!selectedReward || !currentUser) return;
    setIsRedeeming(true);

    try {
      const res = await fetch("/api/redemptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          rewardId: selectedReward.id,
          teamId: currentUser?.teamId || "",
        }),
      });

      if (res.ok) {
        setUserBalance((prev) => prev - selectedReward.cost);
        setSuccessMessage(
          `You redeemed "${selectedReward.title}" for ${selectedReward.cost} ${TACO_EMOJI}!`
        );
        setDialogOpen(false);
        // Refresh data
        fetchData();
        // Clear success message after 5 seconds
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to redeem reward.");
      }
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setIsRedeeming(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/60 via-white to-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-amber-950">
              Taco Shop 🛒
            </h1>
            <p className="mt-1 text-amber-600">
              Redeem your tacos for awesome rewards
            </p>
          </div>

          {/* Balance Card */}
          <Card className="border-amber-300 bg-gradient-to-r from-amber-400 to-orange-500 shadow-lg shadow-amber-500/20">
            <CardContent className="p-4">
              <span className="block text-sm font-medium text-white/80">Your Balance</span>
              <span className="block text-3xl font-bold text-white">
                {loading ? (
                  <Skeleton className="inline-block h-9 w-16 rounded bg-white/20" />
                ) : (
                  <>
                    {userBalance} {TACO_EMOJI}
                  </>
                )}
              </span>
            </CardContent>
          </Card>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 shadow-sm">
            <span className="text-2xl">🎉</span>
            <p className="text-sm font-medium text-green-800">
              {successMessage}
            </p>
            <button
              className="ml-auto text-green-400 transition-colors hover:text-green-600"
              onClick={() => setSuccessMessage(null)}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Rewards Grid */}
        <div className="mb-12">
          <h2 className="mb-4 text-xl font-bold text-amber-950">
            Available Rewards
          </h2>

          {loading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <RewardCardSkeleton key={i} />
              ))}
            </div>
          ) : rewards.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <span className="text-6xl">🏪</span>
                <p className="mt-4 text-lg font-medium text-amber-800">
                  No rewards available
                </p>
                <p className="mt-1 text-sm text-amber-500">
                  Check back later -- your admin will add rewards soon!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {rewards.map((reward) => (
                <RewardCard
                  key={reward.id}
                  reward={reward}
                  userBalance={userBalance}
                  onRedeem={handleRedeem}
                />
              ))}
            </div>
          )}
        </div>

        {/* My Redemptions */}
        <div>
          <h2 className="mb-4 text-xl font-bold text-amber-950">
            My Redemptions
          </h2>

          {loading ? (
            <Card>
              <CardContent className="space-y-4 p-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="flex-1">
                      <Skeleton className="mb-1 h-4 w-40" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : redemptions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-10">
                <span className="text-4xl">📦</span>
                <p className="mt-3 text-sm text-amber-500">
                  You haven&apos;t redeemed any rewards yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-amber-50">
                  {redemptions.map((redemption) => (
                    <div
                      key={redemption.id}
                      className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-amber-50/40"
                    >
                      {/* Icon */}
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-xl">
                        {TACO_EMOJI}
                      </div>

                      {/* Details */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-amber-950">
                          {redemption.reward.title}
                        </p>
                        <p className="text-xs text-amber-500">
                          {formatDate(redemption.createdAt)} &middot;{" "}
                          {redemption.reward.cost} {TACO_EMOJI}
                        </p>
                      </div>

                      {/* Status */}
                      <StatusBadge status={redemption.status} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Redeem Confirmation Dialog */}
      <RedeemDialog
        reward={selectedReward}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onConfirm={confirmRedeem}
        isRedeeming={isRedeeming}
      />
    </div>
  );
}
