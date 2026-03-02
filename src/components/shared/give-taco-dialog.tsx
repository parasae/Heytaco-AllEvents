"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { cn } from "@/lib/utils";
import {
  TACO_EMOJI,
  MAX_TACOS_PER_MESSAGE,
  DEFAULT_TAGS,
} from "@/lib/constants";
import { useCurrentUser } from "@/lib/auth-user";
import type { UserProfile } from "@/lib/types";
import { Search, Send, Loader2, Check, Sparkles } from "lucide-react";

interface GiveTacoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GiveTacoDialog({ open, onOpenChange }: GiveTacoDialogProps) {
  const { user: currentUser } = useCurrentUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [tacoCount, setTacoCount] = useState(1);
  const [message, setMessage] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [flyingTacos, setFlyingTacos] = useState<number[]>([]);

  // Fetch users (excluding current demo user - can't give tacos to yourself)
  useEffect(() => {
    if (!open) return;
    async function fetchUsers() {
      try {
        const res = await fetch(`/api/users?teamId=${currentUser?.teamId || ""}`);
        if (res.ok) {
          const data = await res.json();
          const allUsers: UserProfile[] = Array.isArray(data) ? data : data.users || [];
          // Filter out the current user so they can't give tacos to themselves
          const otherUsers = currentUser
            ? allUsers.filter((u) => u.id !== currentUser.id)
            : allUsers;
          setUsers(otherUsers);
        }
      } catch {
        // silently fail - users list will be empty
      }
    }
    fetchUsers();
  }, [open, currentUser]);

  // Filter users based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users.slice(0, 5));
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredUsers(
        users
          .filter(
            (u) =>
              u.name.toLowerCase().includes(query) ||
              u.displayName.toLowerCase().includes(query) ||
              (u.email && u.email.toLowerCase().includes(query))
          )
          .slice(0, 5)
      );
    }
  }, [searchQuery, users]);

  const resetForm = useCallback(() => {
    setSearchQuery("");
    setSelectedUser(null);
    setTacoCount(1);
    setMessage("");
    setSelectedTags([]);
    setShowSuccess(false);
    setFlyingTacos([]);
  }, []);

  const handleClose = useCallback(
    (value: boolean) => {
      if (!value) resetForm();
      onOpenChange(value);
    },
    [onOpenChange, resetForm]
  );

  const toggleTag = (tagName: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagName)
        ? prev.filter((t) => t !== tagName)
        : [...prev, tagName]
    );
  };

  const handleSubmit = async () => {
    if (!selectedUser || !currentUser) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/tacos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          giverId: currentUser.id,
          receiverId: selectedUser.id,
          amount: tacoCount,
          message: message || null,
          teamId: currentUser.teamId,
          tagIds: selectedTags,
        }),
      });

      if (res.ok) {
        // Trigger flying taco animation
        setFlyingTacos(Array.from({ length: tacoCount }, (_, i) => i));
        setShowSuccess(true);
        setTimeout(() => {
          handleClose(false);
        }, 2000);
      }
    } catch {
      // handle error silently
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {showSuccess ? (
          // Success state
          <div className="flex flex-col items-center justify-center py-8 animate-fade-in">
            <div className="relative mb-4">
              {/* Flying tacos */}
              {flyingTacos.map((i) => (
                <span
                  key={i}
                  className="absolute text-3xl animate-taco-rain"
                  style={{
                    left: `${Math.random() * 60 - 30}px`,
                    animationDelay: `${i * 0.15}s`,
                  }}
                >
                  {TACO_EMOJI}
                </span>
              ))}
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
                <Check className="h-8 w-8 text-emerald-500" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-amber-950">
              Taco{tacoCount > 1 ? "s" : ""} Sent!
            </h3>
            <p className="mt-1 text-sm text-amber-600">
              {selectedUser?.displayName || selectedUser?.name} received{" "}
              {TACO_EMOJI.repeat(tacoCount)}
            </p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="text-xl">{TACO_EMOJI}</span>
                Give a Taco
              </DialogTitle>
              <DialogDescription>
                Recognize someone awesome on your team
              </DialogDescription>
            </DialogHeader>

            {/* User search */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-amber-800">
                Who deserves a taco?
              </label>
              {selectedUser ? (
                <div className="flex items-center gap-3 rounded-xl bg-amber-50 p-3 border border-amber-100">
                  <UserAvatar
                    name={selectedUser.displayName || selectedUser.name}
                    avatarUrl={selectedUser.avatarUrl}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-amber-900 truncate">
                      {selectedUser.displayName || selectedUser.name}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedUser(null)}
                    className="text-xs text-amber-600"
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-400" />
                    <Input
                      placeholder="Search by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                      autoFocus
                    />
                  </div>
                  {filteredUsers.length > 0 && (
                    <div className="max-h-40 overflow-y-auto rounded-lg border border-amber-100 divide-y divide-amber-50">
                      {filteredUsers.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => {
                            setSelectedUser(user);
                            setSearchQuery("");
                          }}
                          className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-amber-50 transition-colors"
                        >
                          <UserAvatar
                            name={user.displayName || user.name}
                            avatarUrl={user.avatarUrl}
                            size="sm"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-amber-900 truncate">
                              {user.displayName || user.name}
                            </p>
                            {user.email && (
                              <p className="text-xs text-amber-500 truncate">
                                {user.email}
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Taco count */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-amber-800">
                How many tacos?
              </label>
              <div className="flex gap-2">
                {Array.from({ length: MAX_TACOS_PER_MESSAGE }, (_, i) => i + 1).map(
                  (count) => (
                    <button
                      key={count}
                      onClick={() => setTacoCount(count)}
                      className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-xl text-lg transition-all duration-200 border-2",
                        tacoCount >= count
                          ? "border-amber-400 bg-amber-50 scale-110 shadow-sm shadow-amber-200/50"
                          : "border-amber-100 bg-white hover:border-amber-200 hover:bg-amber-50/50"
                      )}
                    >
                      {TACO_EMOJI}
                    </button>
                  )
                )}
              </div>
              <p className="text-xs text-amber-500">
                {tacoCount} taco{tacoCount > 1 ? "s" : ""} selected
              </p>
            </div>

            {/* Message */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-amber-800">
                Add a message{" "}
                <span className="text-amber-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What did they do that was awesome?"
                rows={2}
                className="flex w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-amber-950 shadow-sm shadow-amber-50 placeholder:text-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:border-amber-400 resize-none transition-colors"
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-amber-800">
                Tags{" "}
                <span className="text-amber-400 font-normal">(optional)</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {DEFAULT_TAGS.map((tag) => (
                  <Badge
                    key={tag.name}
                    variant={
                      selectedTags.includes(tag.name) ? "default" : "outline"
                    }
                    className={cn(
                      "cursor-pointer transition-all duration-200",
                      selectedTags.includes(tag.name)
                        ? "shadow-sm"
                        : "hover:bg-amber-50"
                    )}
                    style={
                      selectedTags.includes(tag.name)
                        ? { backgroundColor: tag.color + "22", borderColor: tag.color, color: tag.color }
                        : {}
                    }
                    onClick={() => toggleTag(tag.name)}
                  >
                    {selectedTags.includes(tag.name) && (
                      <Sparkles className="mr-1 h-3 w-3" />
                    )}
                    {tag.name}
                  </Badge>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => handleClose(false)}
                className="text-amber-600"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!selectedUser || isSubmitting}
                className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send {TACO_EMOJI.repeat(tacoCount)}
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
