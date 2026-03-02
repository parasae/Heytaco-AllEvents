"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Users,
  Search,
  Plus,
  MoreHorizontal,
  Shield,
  ShieldOff,
  UserX,
  UserCheck,
  RotateCcw,
  ArrowUpDown,
  ChevronDown,
  Check,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
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
import { cn } from "@/lib/utils";
import { DEMO_TEAM_ID, TACO_EMOJI } from "@/lib/constants";
import type { UserProfile } from "@/lib/types";

type SortKey = "name" | "totalReceived" | "totalGiven";
type FilterStatus = "all" | "active" | "inactive";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);

  // Edit dialog
  const [editUser, setEditUser] = useState<UserProfile | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  // Actions dropdown
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // Notification
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/users?teamId=${DEMO_TEAM_ID}`);
      if (!res.ok) throw new Error("Failed to load users");
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : data.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClick = () => setOpenDropdownId(null);
    if (openDropdownId) document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [openDropdownId]);

  // Filter + sort
  const filteredUsers = useMemo(() => {
    let result = [...users];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.displayName.toLowerCase().includes(q) ||
          (u.email && u.email.toLowerCase().includes(q))
      );
    }

    // Filter
    if (filterStatus === "active") result = result.filter((u) => u.isActive);
    if (filterStatus === "inactive") result = result.filter((u) => !u.isActive);

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.displayName.localeCompare(b.displayName);
      else if (sortKey === "totalReceived") cmp = a.totalReceived - b.totalReceived;
      else if (sortKey === "totalGiven") cmp = a.totalGiven - b.totalGiven;
      return sortAsc ? cmp : -cmp;
    });

    return result;
  }, [users, searchQuery, filterStatus, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(key === "name");
    }
  };

  // PATCH user
  const updateUser = async (userId: string, updates: Partial<UserProfile>) => {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update user");
      const updated = await res.json();
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...updated } : u)));
      showNotification("success", "User updated successfully");
    } catch {
      showNotification("error", "Failed to update user");
    }
  };

  const handleToggleActive = (user: UserProfile) => {
    updateUser(user.id, { isActive: !user.isActive });
  };

  const handleToggleAdmin = (user: UserProfile) => {
    updateUser(user.id, { isAdmin: !user.isAdmin });
  };

  const handleResetTacos = (user: UserProfile) => {
    updateUser(user.id, { totalGiven: 0, totalReceived: 0, redeemable: 0 } as Partial<UserProfile>);
  };

  const handleEditSave = async () => {
    if (!editUser) return;
    setEditLoading(true);
    await updateUser(editUser.id, {
      displayName: editUser.displayName,
      email: editUser.email,
      isAdmin: editUser.isAdmin,
      isActive: editUser.isActive,
      dailyLimit: editUser.dailyLimit,
    });
    setEditLoading(false);
    setEditDialogOpen(false);
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
            <Users className="h-6 w-6 text-amber-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-amber-950">User Management</h1>
            <p className="text-sm text-amber-600">
              {loading ? "Loading..." : `${users.length} team members`}
            </p>
          </div>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add User
        </Button>
      </div>

      {/* Search & Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-400" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select
                value={filterStatus}
                onValueChange={(v) => setFilterStatus(v as FilterStatus)}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={sortKey}
                onValueChange={(v) => handleSort(v as SortKey)}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Sort: Name</SelectItem>
                  <SelectItem value="totalReceived">Sort: Received</SelectItem>
                  <SelectItem value="totalGiven">Sort: Given</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSortAsc(!sortAsc)}
                className="shrink-0"
              >
                <ArrowUpDown className={cn("h-4 w-4 transition-transform", !sortAsc && "rotate-180")} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users - Table on desktop, Cards on mobile */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="border-red-200">
          <CardContent className="flex flex-col items-center gap-4 p-8">
            <p className="text-red-600">{error}</p>
            <Button onClick={fetchUsers} variant="outline">
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : filteredUsers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-12">
            <Users className="h-10 w-10 text-amber-300" />
            <p className="text-amber-600">No users found</p>
            {searchQuery && (
              <Button variant="ghost" size="sm" onClick={() => setSearchQuery("")}>
                Clear search
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block">
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-amber-100">
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-amber-600">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-amber-600">
                        Email
                      </th>
                      <th
                        className="cursor-pointer px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-amber-600 hover:text-amber-800"
                        onClick={() => handleSort("totalGiven")}
                      >
                        <span className="flex items-center gap-1">
                          Given
                          <ArrowUpDown className="h-3 w-3" />
                        </span>
                      </th>
                      <th
                        className="cursor-pointer px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-amber-600 hover:text-amber-800"
                        onClick={() => handleSort("totalReceived")}
                      >
                        <span className="flex items-center gap-1">
                          Received
                          <ArrowUpDown className="h-3 w-3" />
                        </span>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-amber-600">
                        Role
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
                    {filteredUsers.map((user) => (
                      <tr
                        key={user.id}
                        className="transition-colors hover:bg-amber-50/50"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={user.avatarUrl || ""} />
                              <AvatarFallback className="text-xs">
                                {user.displayName.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-semibold text-amber-950">
                                {user.displayName}
                              </p>
                              <p className="text-xs text-amber-500">@{user.name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-amber-700">
                          {user.email || "--"}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-amber-800">
                            {user.totalGiven} {TACO_EMOJI}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-amber-800">
                            {user.totalReceived} {TACO_EMOJI}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            variant={user.isAdmin ? "default" : "secondary"}
                            className="text-[10px]"
                          >
                            {user.isAdmin ? "Admin" : "Member"}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <Switch
                            checked={user.isActive}
                            onCheckedChange={() => handleToggleActive(user)}
                          />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="relative inline-block">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenDropdownId(
                                  openDropdownId === user.id ? null : user.id
                                );
                              }}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                            {openDropdownId === user.id && (
                              <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-xl border border-amber-100 bg-white p-1 shadow-lg shadow-amber-100/40 animate-scale-in">
                                <button
                                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-amber-800 hover:bg-amber-50 transition-colors"
                                  onClick={() => {
                                    setEditUser({ ...user });
                                    setEditDialogOpen(true);
                                    setOpenDropdownId(null);
                                  }}
                                >
                                  <UserCheck className="h-4 w-4" />
                                  Edit User
                                </button>
                                <button
                                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-amber-800 hover:bg-amber-50 transition-colors"
                                  onClick={() => {
                                    handleToggleAdmin(user);
                                    setOpenDropdownId(null);
                                  }}
                                >
                                  {user.isAdmin ? (
                                    <>
                                      <ShieldOff className="h-4 w-4" />
                                      Remove Admin
                                    </>
                                  ) : (
                                    <>
                                      <Shield className="h-4 w-4" />
                                      Make Admin
                                    </>
                                  )}
                                </button>
                                <button
                                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-amber-800 hover:bg-amber-50 transition-colors"
                                  onClick={() => {
                                    handleToggleActive(user);
                                    setOpenDropdownId(null);
                                  }}
                                >
                                  {user.isActive ? (
                                    <>
                                      <UserX className="h-4 w-4" />
                                      Deactivate
                                    </>
                                  ) : (
                                    <>
                                      <UserCheck className="h-4 w-4" />
                                      Activate
                                    </>
                                  )}
                                </button>
                                <div className="my-1 h-px bg-amber-100" />
                                <button
                                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                  onClick={() => {
                                    handleResetTacos(user);
                                    setOpenDropdownId(null);
                                  }}
                                >
                                  <RotateCcw className="h-4 w-4" />
                                  Reset Tacos
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Mobile Cards */}
          <div className="grid gap-3 lg:hidden">
            {filteredUsers.map((user) => (
              <Card key={user.id} className="taco-card-hover">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-11 w-11">
                      <AvatarImage src={user.avatarUrl || ""} />
                      <AvatarFallback>
                        {user.displayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-amber-950">
                            {user.displayName}
                          </p>
                          <p className="text-xs text-amber-500">
                            @{user.name}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={user.isAdmin ? "default" : "secondary"}
                            className="text-[10px]"
                          >
                            {user.isAdmin ? "Admin" : "Member"}
                          </Badge>
                        </div>
                      </div>
                      {user.email && (
                        <p className="mt-1 truncate text-xs text-amber-600">
                          {user.email}
                        </p>
                      )}
                      <div className="mt-3 flex items-center gap-4">
                        <div className="flex items-center gap-1 text-xs text-amber-700">
                          <span className="font-medium">{user.totalGiven}</span>
                          <span className="text-amber-400">given</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-amber-700">
                          <span className="font-medium">{user.totalReceived}</span>
                          <span className="text-amber-400">received</span>
                        </div>
                        <div className="ml-auto flex items-center gap-2">
                          <Switch
                            checked={user.isActive}
                            onCheckedChange={() => handleToggleActive(user)}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditUser({ ...user });
                              setEditDialogOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user details and permissions
            </DialogDescription>
          </DialogHeader>
          {editUser && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={editUser.avatarUrl || ""} />
                  <AvatarFallback>
                    {editUser.displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-amber-950">@{editUser.name}</p>
                  <p className="text-xs text-amber-500">ID: {editUser.id.slice(0, 8)}...</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-displayName">Display Name</Label>
                <Input
                  id="edit-displayName"
                  value={editUser.displayName}
                  onChange={(e) =>
                    setEditUser({ ...editUser, displayName: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editUser.email || ""}
                  onChange={(e) =>
                    setEditUser({ ...editUser, email: e.target.value || null })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-dailyLimit">Daily Taco Limit</Label>
                <Input
                  id="edit-dailyLimit"
                  type="number"
                  min={1}
                  max={20}
                  value={editUser.dailyLimit}
                  onChange={(e) =>
                    setEditUser({
                      ...editUser,
                      dailyLimit: Math.max(1, Math.min(20, parseInt(e.target.value) || 1)),
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-amber-100 p-3">
                <div>
                  <Label>Admin Role</Label>
                  <p className="text-xs text-amber-500">
                    Grant admin privileges
                  </p>
                </div>
                <Switch
                  checked={editUser.isAdmin}
                  onCheckedChange={(checked) =>
                    setEditUser({ ...editUser, isAdmin: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-amber-100 p-3">
                <div>
                  <Label>Active Status</Label>
                  <p className="text-xs text-amber-500">
                    User can give and receive tacos
                  </p>
                </div>
                <Switch
                  checked={editUser.isActive}
                  onCheckedChange={(checked) =>
                    setEditUser({ ...editUser, isActive: checked })
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={editLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleEditSave} disabled={editLoading}>
              {editLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
