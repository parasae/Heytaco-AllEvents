"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Gift,
  Plus,
  Pencil,
  Trash2,
  Package,
  CreditCard,
  Users as UsersIcon,
  Check,
  X,
  ShoppingBag,
  Clock,
  CheckCircle2,
  XCircle,
  Infinity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatDate } from "@/lib/utils";
import { TACO_EMOJI } from "@/lib/constants";
import { useCurrentUser } from "@/lib/auth-user";
import type { RewardItem, RedemptionItem } from "@/lib/types";

const REWARD_TYPE_ICONS: Record<string, React.ElementType> = {
  custom: Package,
  giftcard: CreditCard,
  group: UsersIcon,
};

const REWARD_TYPE_LABELS: Record<string, string> = {
  custom: "Custom",
  giftcard: "Gift Card",
  group: "Group Activity",
};

const REDEMPTION_STATUS_CONFIG: Record<string, { icon: React.ElementType; className: string; label: string }> = {
  pending: { icon: Clock, className: "bg-yellow-50 text-yellow-700 border-yellow-200", label: "Pending" },
  fulfilled: { icon: CheckCircle2, className: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Fulfilled" },
  cancelled: { icon: XCircle, className: "bg-red-50 text-red-700 border-red-200", label: "Cancelled" },
};

interface RewardFormData {
  title: string;
  description: string;
  cost: number;
  quantity: number | null;
  type: string;
  imageUrl: string;
}

const emptyForm: RewardFormData = {
  title: "",
  description: "",
  cost: 5,
  quantity: null,
  type: "custom",
  imageUrl: "",
};

export default function AdminRewardsPage() {
  const { user: currentUser } = useCurrentUser();
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [redemptions, setRedemptions] = useState<RedemptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<RewardItem | null>(null);
  const [formData, setFormData] = useState<RewardFormData>(emptyForm);
  const [formLoading, setFormLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Delete confirmation
  const [deleteDialog, setDeleteDialog] = useState<RewardItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Notifications
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const teamId = currentUser?.teamId || "";
      const [rewardsRes, redemptionsRes] = await Promise.all([
        fetch(`/api/rewards?teamId=${teamId}`),
        fetch(`/api/redemptions?teamId=${teamId}`),
      ]);

      if (!rewardsRes.ok) throw new Error("Failed to load rewards");

      const rewardsData = await rewardsRes.json();
      setRewards(Array.isArray(rewardsData) ? rewardsData : rewardsData.rewards || []);

      if (redemptionsRes.ok) {
        const redemptionsData = await redemptionsRes.json();
        setRedemptions(
          Array.isArray(redemptionsData) ? redemptionsData : redemptionsData.redemptions || []
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Open dialog for create or edit
  const openCreateDialog = () => {
    setEditingReward(null);
    setFormData(emptyForm);
    setFormErrors({});
    setDialogOpen(true);
  };

  const openEditDialog = (reward: RewardItem) => {
    setEditingReward(reward);
    setFormData({
      title: reward.title,
      description: reward.description || "",
      cost: reward.cost,
      quantity: reward.quantity,
      type: reward.type,
      imageUrl: reward.imageUrl || "",
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  // Validate
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.title.trim()) errors.title = "Title is required";
    if (formData.cost < 1) errors.cost = "Cost must be at least 1";
    if (formData.quantity !== null && formData.quantity < 0)
      errors.quantity = "Quantity must be 0 or more";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save reward
  const handleSave = async () => {
    if (!validateForm()) return;
    setFormLoading(true);
    try {
      const body = {
        ...formData,
        description: formData.description || null,
        imageUrl: formData.imageUrl || null,
        teamId: currentUser?.teamId || "",
      };

      let res: Response;
      if (editingReward) {
        res = await fetch(`/api/rewards/${editingReward.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch("/api/rewards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }

      if (!res.ok) throw new Error("Failed to save reward");

      const saved = await res.json();
      if (editingReward) {
        setRewards((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
      } else {
        setRewards((prev) => [saved, ...prev]);
      }

      setDialogOpen(false);
      showNotification("success", editingReward ? "Reward updated" : "Reward created");
    } catch {
      showNotification("error", "Failed to save reward");
    } finally {
      setFormLoading(false);
    }
  };

  // Delete reward
  const handleDelete = async () => {
    if (!deleteDialog) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/rewards/${deleteDialog.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete reward");
      setRewards((prev) => prev.filter((r) => r.id !== deleteDialog.id));
      setDeleteDialog(null);
      showNotification("success", "Reward deleted");
    } catch {
      showNotification("error", "Failed to delete reward");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Update redemption status
  const updateRedemptionStatus = async (redemptionId: string, status: string) => {
    try {
      const res = await fetch(`/api/redemptions/${redemptionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update redemption");
      const updated = await res.json();
      setRedemptions((prev) =>
        prev.map((r) => (r.id === redemptionId ? { ...r, ...updated } : r))
      );
      showNotification("success", `Redemption marked as ${status}`);
    } catch {
      showNotification("error", "Failed to update redemption status");
    }
  };

  // Get type icon
  const getTypeIcon = (type: string) => {
    const Icon = REWARD_TYPE_ICONS[type] || Package;
    return <Icon className="h-5 w-5" />;
  };

  return (
    <div className="space-y-6 p-6 animate-fade-in">
      {/* Notification toast */}
      {notification && (
        <div
          className={cn(
            "fixed right-6 top-6 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg animate-slide-up",
            notification.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border border-red-200 bg-red-50 text-red-800"
          )}
        >
          {notification.type === "success" ? (
            <Check className="h-4 w-4" />
          ) : (
            <X className="h-4 w-4" />
          )}
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-amber-100 p-2.5">
            <Gift className="h-6 w-6 text-amber-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-amber-950">Manage Rewards</h1>
            <p className="text-sm text-amber-600">
              {loading ? "Loading..." : `${rewards.length} rewards available`}
            </p>
          </div>
        </div>
        <Button className="gap-2" onClick={openCreateDialog}>
          <Plus className="h-4 w-4" />
          Add Reward
        </Button>
      </div>

      <Tabs defaultValue="rewards" className="w-full">
        <TabsList>
          <TabsTrigger value="rewards" className="gap-2">
            <ShoppingBag className="h-4 w-4" />
            Rewards
          </TabsTrigger>
          <TabsTrigger value="redemptions" className="gap-2">
            <Clock className="h-4 w-4" />
            Redemptions
          </TabsTrigger>
        </TabsList>

        {/* Rewards Tab */}
        <TabsContent value="rewards">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-5">
                    <Skeleton className="h-16 w-16 rounded-xl" />
                    <Skeleton className="mt-3 h-5 w-3/4" />
                    <Skeleton className="mt-2 h-4 w-full" />
                    <Skeleton className="mt-4 h-8 w-20" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : error ? (
            <Card className="border-red-200">
              <CardContent className="flex flex-col items-center gap-4 p-8">
                <p className="text-red-600">{error}</p>
                <Button onClick={fetchData} variant="outline">
                  Retry
                </Button>
              </CardContent>
            </Card>
          ) : rewards.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 p-12">
                <Gift className="h-12 w-12 text-amber-300" />
                <p className="text-lg font-medium text-amber-700">No rewards yet</p>
                <p className="text-sm text-amber-500">Create your first reward for the team</p>
                <Button onClick={openCreateDialog} className="mt-2 gap-2">
                  <Plus className="h-4 w-4" />
                  Add Reward
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rewards.map((reward) => (
                <Card
                  key={reward.id}
                  className={cn(
                    "taco-card-hover relative overflow-hidden",
                    !reward.isActive && "opacity-60"
                  )}
                >
                  <CardContent className="p-5">
                    {/* Type indicator */}
                    <div className="flex items-start justify-between">
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 text-2xl">
                        {reward.imageUrl ? (
                          <img
                            src={reward.imageUrl}
                            alt={reward.title}
                            className="h-full w-full rounded-xl object-cover"
                          />
                        ) : reward.type === "giftcard" ? (
                          "💳"
                        ) : reward.type === "group" ? (
                          "🎉"
                        ) : (
                          "🎁"
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant={reward.isActive ? "default" : "destructive"}
                          className="text-[10px]"
                        >
                          {reward.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="mt-3">
                      <h3 className="font-semibold text-amber-950">{reward.title}</h3>
                      {reward.description && (
                        <p className="mt-1 line-clamp-2 text-sm text-amber-600/80">
                          {reward.description}
                        </p>
                      )}
                    </div>

                    {/* Meta */}
                    <div className="mt-4 flex items-center gap-3">
                      <div className="flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1">
                        <span className="text-sm font-bold text-amber-700">{reward.cost}</span>
                        <span className="text-xs text-amber-500">{TACO_EMOJI}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-amber-500">
                        {reward.quantity === null ? (
                          <>
                            <Infinity className="h-3.5 w-3.5" />
                            Unlimited
                          </>
                        ) : (
                          <>
                            <Package className="h-3.5 w-3.5" />
                            {reward.quantity} left
                          </>
                        )}
                      </div>
                      <Badge variant="outline" className="ml-auto text-[10px]">
                        {REWARD_TYPE_LABELS[reward.type] || reward.type}
                      </Badge>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 flex gap-2 border-t border-amber-50 pt-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 gap-1.5"
                        onClick={() => openEditDialog(reward)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 gap-1.5 text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => setDeleteDialog(reward)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Redemptions Tab */}
        <TabsContent value="redemptions">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-9 w-9 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-7 w-20" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : redemptions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 p-12">
                <ShoppingBag className="h-12 w-12 text-amber-300" />
                <p className="text-lg font-medium text-amber-700">No redemptions yet</p>
                <p className="text-sm text-amber-500">
                  Redemptions will appear here once users start claiming rewards
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-amber-100">
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-amber-600">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-amber-600">
                        Reward
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-amber-600">
                        Cost
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-amber-600">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-amber-600">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-amber-600">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-50">
                    {redemptions.map((redemption) => {
                      const statusConfig =
                        REDEMPTION_STATUS_CONFIG[redemption.status] ||
                        REDEMPTION_STATUS_CONFIG.pending;
                      const StatusIcon = statusConfig.icon;

                      return (
                        <tr
                          key={redemption.id}
                          className="transition-colors hover:bg-amber-50/50"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={redemption.user?.avatarUrl || ""} />
                                <AvatarFallback className="text-xs">
                                  {redemption.user?.displayName?.charAt(0) || "?"}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium text-amber-950">
                                {redemption.user?.displayName || "Unknown"}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-amber-800">
                            {redemption.reward?.title || "Unknown Reward"}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-amber-700">
                            {redemption.reward?.cost} {TACO_EMOJI}
                          </td>
                          <td className="px-6 py-4 text-sm text-amber-600">
                            {formatDate(redemption.createdAt)}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                                statusConfig.className
                              )}
                            >
                              <StatusIcon className="h-3 w-3" />
                              {statusConfig.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {redemption.status === "pending" && (
                              <div className="flex justify-end gap-1.5">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 gap-1 text-xs text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                                  onClick={() =>
                                    updateRedemptionStatus(redemption.id, "fulfilled")
                                  }
                                >
                                  <CheckCircle2 className="h-3 w-3" />
                                  Fulfill
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 gap-1 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                                  onClick={() =>
                                    updateRedemptionStatus(redemption.id, "cancelled")
                                  }
                                >
                                  <XCircle className="h-3 w-3" />
                                  Cancel
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Add/Edit Reward Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingReward ? "Edit Reward" : "Add New Reward"}
            </DialogTitle>
            <DialogDescription>
              {editingReward
                ? "Update the reward details below"
                : "Create a new reward for your team to redeem"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="reward-title">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="reward-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Coffee Gift Card"
                className={formErrors.title ? "border-red-300" : ""}
              />
              {formErrors.title && (
                <p className="text-xs text-red-500">{formErrors.title}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reward-description">Description</Label>
              <Textarea
                id="reward-description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="What does the team member get?"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reward-cost">
                  Cost (tacos) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="reward-cost"
                  type="number"
                  min={1}
                  value={formData.cost}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      cost: Math.max(1, parseInt(e.target.value) || 1),
                    })
                  }
                  className={formErrors.cost ? "border-red-300" : ""}
                />
                {formErrors.cost && (
                  <p className="text-xs text-red-500">{formErrors.cost}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reward-quantity">
                  Quantity
                  <span className="ml-1 text-xs text-amber-400">(empty = unlimited)</span>
                </Label>
                <Input
                  id="reward-quantity"
                  type="number"
                  min={0}
                  value={formData.quantity ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      quantity: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  placeholder="Unlimited"
                  className={formErrors.quantity ? "border-red-300" : ""}
                />
                {formErrors.quantity && (
                  <p className="text-xs text-red-500">{formErrors.quantity}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={formData.type}
                onValueChange={(v) => setFormData({ ...formData, type: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom Reward</SelectItem>
                  <SelectItem value="giftcard">Gift Card</SelectItem>
                  <SelectItem value="group">Group Activity</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reward-image">Image URL</Label>
              <Input
                id="reward-image"
                value={formData.imageUrl}
                onChange={(e) =>
                  setFormData({ ...formData, imageUrl: e.target.value })
                }
                placeholder="https://..."
              />
              {formData.imageUrl && (
                <div className="mt-1 flex items-center gap-2">
                  <img
                    src={formData.imageUrl}
                    alt="Preview"
                    className="h-10 w-10 rounded-lg object-cover border border-amber-100"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <span className="text-xs text-amber-500">Image preview</span>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={formLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={formLoading}>
              {formLoading
                ? "Saving..."
                : editingReward
                ? "Update Reward"
                : "Create Reward"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Reward</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteDialog?.title}&quot;? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog(null)}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
