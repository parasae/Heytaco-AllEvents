"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Settings,
  Save,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  AlertTriangle,
  Wifi,
  WifiOff,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  Zap,
  DatabaseZap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { DEMO_TEAM_ID, DEFAULT_TAGS } from "@/lib/constants";
import type { TagItem } from "@/lib/types";

// Preset colors for tag color picker
const TAG_PRESET_COLORS = [
  "#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444",
  "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#6366F1",
  "#14B8A6", "#A855F7", "#E11D48", "#0EA5E9", "#D946EF",
];

interface TeamSettings {
  teamName: string;
  dailyLimit: number;
  tacoEmoji: string;
  welcomeMessage: string;
  leaderboardEnabled: boolean;
  reactionsEnabled: boolean;
  giverMode: boolean;
  slackBotToken: string;
  slackSigningSecret: string;
  slackConnected: boolean;
}

const defaultSettings: TeamSettings = {
  teamName: "My Team",
  dailyLimit: 5,
  tacoEmoji: "🌮",
  welcomeMessage: "Welcome to TacoTime! Give tacos to recognize your teammates.",
  leaderboardEnabled: true,
  reactionsEnabled: true,
  giverMode: false,
  slackBotToken: "",
  slackSigningSecret: "",
  slackConnected: false,
};

interface TagFormData {
  name: string;
  description: string;
  color: string;
}

const emptyTagForm: TagFormData = {
  name: "",
  description: "",
  color: TAG_PRESET_COLORS[0],
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<TeamSettings>(defaultSettings);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Slack token visibility
  const [showBotToken, setShowBotToken] = useState(false);
  const [showSigningSecret, setShowSigningSecret] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  // Tag management
  const [tagFormOpen, setTagFormOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<TagItem | null>(null);
  const [tagForm, setTagForm] = useState<TagFormData>(emptyTagForm);
  const [tagLoading, setTagLoading] = useState(false);

  // Danger zone
  const [resetDialog, setResetDialog] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [seedLoading, setSeedLoading] = useState(false);

  // Notifications
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [settingsRes, tagsRes] = await Promise.all([
        fetch(`/api/settings?teamId=${DEMO_TEAM_ID}`),
        fetch(`/api/tags?teamId=${DEMO_TEAM_ID}`),
      ]);

      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setSettings((prev) => ({
          ...prev,
          ...data,
          // Ensure null values become empty strings for controlled inputs
          teamName: data.teamName ?? prev.teamName,
          tacoEmoji: data.tacoEmoji ?? prev.tacoEmoji,
          welcomeMessage: data.welcomeMessage ?? "",
          slackBotToken: data.slackBotToken ?? "",
          slackSigningSecret: data.slackSigningSecret ?? "",
        }));
      }

      if (tagsRes.ok) {
        const tagsData = await tagsRes.json();
        setTags(Array.isArray(tagsData) ? tagsData : tagsData.tags || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Save settings
  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...settings, teamId: DEMO_TEAM_ID }),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      showNotification("success", "Settings saved successfully");
    } catch {
      showNotification("error", "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  // Test Slack connection
  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      const res = await fetch("/api/slack/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botToken: settings.slackBotToken,
          signingSecret: settings.slackSigningSecret,
        }),
      });
      if (!res.ok) throw new Error("Connection test failed");
      const data = await res.json();
      setSettings((prev) => ({ ...prev, slackConnected: data.connected ?? true }));
      showNotification("success", "Slack connection successful!");
    } catch {
      setSettings((prev) => ({ ...prev, slackConnected: false }));
      showNotification("error", "Slack connection failed. Check your credentials.");
    } finally {
      setTestingConnection(false);
    }
  };

  // Tag CRUD
  const openAddTag = () => {
    setEditingTag(null);
    setTagForm(emptyTagForm);
    setTagFormOpen(true);
  };

  const openEditTag = (tag: TagItem) => {
    setEditingTag(tag);
    setTagForm({
      name: tag.name,
      description: tag.description || "",
      color: tag.color,
    });
    setTagFormOpen(true);
  };

  const handleSaveTag = async () => {
    if (!tagForm.name.trim()) return;
    setTagLoading(true);
    try {
      const body = {
        ...tagForm,
        description: tagForm.description || null,
        teamId: DEMO_TEAM_ID,
      };

      let res: Response;
      if (editingTag) {
        res = await fetch(`/api/tags/${editingTag.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch("/api/tags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }

      if (!res.ok) throw new Error("Failed to save tag");
      const saved = await res.json();

      if (editingTag) {
        setTags((prev) => prev.map((t) => (t.id === saved.id ? saved : t)));
      } else {
        setTags((prev) => [...prev, saved]);
      }

      setTagFormOpen(false);
      showNotification("success", editingTag ? "Tag updated" : "Tag created");
    } catch {
      showNotification("error", "Failed to save tag");
    } finally {
      setTagLoading(false);
    }
  };

  const handleDeleteTag = async (tag: TagItem) => {
    try {
      const res = await fetch(`/api/tags/${tag.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete tag");
      setTags((prev) => prev.filter((t) => t.id !== tag.id));
      showNotification("success", "Tag deleted");
    } catch {
      showNotification("error", "Failed to delete tag");
    }
  };

  // Danger zone actions
  const handleResetData = async () => {
    setResetLoading(true);
    try {
      const res = await fetch("/api/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: DEMO_TEAM_ID }),
      });
      if (!res.ok) throw new Error("Failed to reset data");
      showNotification("success", "All data has been reset");
      setResetDialog(false);
      fetchSettings();
    } catch {
      showNotification("error", "Failed to reset data");
    } finally {
      setResetLoading(false);
    }
  };

  const handleSeedData = async () => {
    setSeedLoading(true);
    try {
      const res = await fetch("/api/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: DEMO_TEAM_ID }),
      });
      if (!res.ok) throw new Error("Failed to seed data");
      showNotification("success", "Demo data has been seeded successfully");
      fetchSettings();
    } catch {
      showNotification("error", "Failed to seed demo data");
    } finally {
      setSeedLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-11 w-11 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-60" />
          </div>
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-56" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

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
            <Settings className="h-6 w-6 text-amber-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-amber-950">Team Settings</h1>
            <p className="text-sm text-amber-600">
              Configure your TacoTime workspace
            </p>
          </div>
        </div>
        <Button className="gap-2" onClick={handleSaveSettings} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>

      {error && (
        <Card className="border-red-200">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <p className="text-sm text-red-600">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchSettings} className="ml-auto">
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-amber-500" />
            General Settings
          </CardTitle>
          <CardDescription>Basic configuration for your workspace</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="teamName">Team Name</Label>
              <Input
                id="teamName"
                value={settings.teamName}
                onChange={(e) => setSettings({ ...settings, teamName: e.target.value })}
                placeholder="My Team"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dailyLimit">Daily Taco Limit</Label>
              <Input
                id="dailyLimit"
                type="number"
                min={1}
                max={20}
                value={settings.dailyLimit}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    dailyLimit: Math.max(1, Math.min(20, parseInt(e.target.value) || 1)),
                  })
                }
              />
              <p className="text-xs text-amber-400">
                Each user can give 1-20 tacos per day
              </p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tacoEmoji">Taco Emoji</Label>
              <Input
                id="tacoEmoji"
                value={settings.tacoEmoji}
                onChange={(e) => setSettings({ ...settings, tacoEmoji: e.target.value })}
                className="text-2xl"
                maxLength={4}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="welcomeMessage">Welcome Message</Label>
            <Textarea
              id="welcomeMessage"
              value={settings.welcomeMessage}
              onChange={(e) =>
                setSettings({ ...settings, welcomeMessage: e.target.value })
              }
              placeholder="Welcome message shown to new users"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Feature Toggles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            Feature Toggles
          </CardTitle>
          <CardDescription>Enable or disable platform features</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="flex items-center justify-between rounded-lg p-3 transition-colors hover:bg-amber-50/50">
            <div>
              <p className="text-sm font-medium text-amber-950">Leaderboard</p>
              <p className="text-xs text-amber-500">
                Show public leaderboard of taco rankings
              </p>
            </div>
            <Switch
              checked={settings.leaderboardEnabled}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, leaderboardEnabled: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between rounded-lg p-3 transition-colors hover:bg-amber-50/50">
            <div>
              <p className="text-sm font-medium text-amber-950">Emoji Reactions</p>
              <p className="text-xs text-amber-500">
                Allow giving tacos via emoji reactions in Slack
              </p>
            </div>
            <Switch
              checked={settings.reactionsEnabled}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, reactionsEnabled: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between rounded-lg p-3 transition-colors hover:bg-amber-50/50">
            <div>
              <p className="text-sm font-medium text-amber-950">Giver Mode</p>
              <p className="text-xs text-amber-500">
                Show leaderboard ranked by most tacos given instead of received
              </p>
            </div>
            <Switch
              checked={settings.giverMode}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, giverMode: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Taco Tags Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <span className="text-lg">🏷️</span>
                Taco Tags
              </CardTitle>
              <CardDescription>Categorize recognition with custom tags</CardDescription>
            </div>
            <Button size="sm" className="gap-1.5" onClick={openAddTag}>
              <Plus className="h-3.5 w-3.5" />
              Add Tag
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {tags.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <p className="text-sm text-amber-500">No tags configured</p>
              <Button variant="outline" size="sm" onClick={openAddTag}>
                Create your first tag
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center gap-3 rounded-lg border border-amber-50 p-3 transition-colors hover:bg-amber-50/50"
                >
                  <span
                    className="h-4 w-4 shrink-0 rounded-full ring-2 ring-white shadow-sm"
                    style={{ backgroundColor: tag.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-amber-950">{tag.name}</p>
                    {tag.description && (
                      <p className="truncate text-xs text-amber-500">{tag.description}</p>
                    )}
                  </div>
                  {tag.count !== undefined && (
                    <Badge variant="secondary" className="text-[10px]">
                      {tag.count} uses
                    </Badge>
                  )}
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => openEditTag(tag)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-500 hover:bg-red-50 hover:text-red-600"
                      onClick={() => handleDeleteTag(tag)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Inline tag form */}
          {tagFormOpen && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/30 p-4 animate-scale-in">
              <p className="mb-3 text-sm font-semibold text-amber-900">
                {editingTag ? "Edit Tag" : "New Tag"}
              </p>
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="tag-name" className="text-xs">
                      Name
                    </Label>
                    <Input
                      id="tag-name"
                      value={tagForm.name}
                      onChange={(e) =>
                        setTagForm({ ...tagForm, name: e.target.value })
                      }
                      placeholder="e.g., teamwork"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="tag-desc" className="text-xs">
                      Description
                    </Label>
                    <Input
                      id="tag-desc"
                      value={tagForm.description}
                      onChange={(e) =>
                        setTagForm({ ...tagForm, description: e.target.value })
                      }
                      placeholder="Optional description"
                      className="h-9"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Color</Label>
                  <div className="flex flex-wrap gap-2">
                    {TAG_PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={cn(
                          "h-7 w-7 rounded-full transition-all hover:scale-110",
                          tagForm.color === color
                            ? "ring-2 ring-amber-500 ring-offset-2 scale-110"
                            : "ring-1 ring-black/10"
                        )}
                        style={{ backgroundColor: color }}
                        onClick={() => setTagForm({ ...tagForm, color })}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTagFormOpen(false)}
                    disabled={tagLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveTag}
                    disabled={tagLoading || !tagForm.name.trim()}
                  >
                    {tagLoading ? "Saving..." : editingTag ? "Update" : "Create"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Slack Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
              <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" fill="#E01E5A"/>
              <path d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" fill="#36C5F0"/>
              <path d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.27 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.163 0a2.528 2.528 0 0 1 2.523 2.522v6.312z" fill="#2EB67D"/>
              <path d="M15.163 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.163 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.27a2.527 2.527 0 0 1-2.52-2.523 2.527 2.527 0 0 1 2.52-2.52h6.315A2.528 2.528 0 0 1 24 15.163a2.528 2.528 0 0 1-2.522 2.523h-6.315z" fill="#ECB22E"/>
            </svg>
            Slack Integration
          </CardTitle>
          <CardDescription>Connect your Slack workspace to TacoTime</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Connection status */}
          <div className="flex items-center gap-3 rounded-lg border border-amber-100 p-3">
            {settings.slackConnected ? (
              <>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100">
                  <Wifi className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-emerald-700">Connected</p>
                  <p className="text-xs text-emerald-500">
                    Slack workspace is linked and active
                  </p>
                </div>
                <Badge className="ml-auto bg-emerald-100 text-emerald-700 border-emerald-200">
                  Active
                </Badge>
              </>
            ) : (
              <>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100">
                  <WifiOff className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-amber-700">Not Connected</p>
                  <p className="text-xs text-amber-500">
                    Add your Slack credentials to connect
                  </p>
                </div>
                <Badge variant="outline" className="ml-auto">
                  Inactive
                </Badge>
              </>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="botToken">Bot Token</Label>
            <div className="relative">
              <Input
                id="botToken"
                type={showBotToken ? "text" : "password"}
                value={settings.slackBotToken}
                onChange={(e) =>
                  setSettings({ ...settings, slackBotToken: e.target.value })
                }
                placeholder="xoxb-..."
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-400 hover:text-amber-600"
                onClick={() => setShowBotToken(!showBotToken)}
              >
                {showBotToken ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="signingSecret">Signing Secret</Label>
            <div className="relative">
              <Input
                id="signingSecret"
                type={showSigningSecret ? "text" : "password"}
                value={settings.slackSigningSecret}
                onChange={(e) =>
                  setSettings({ ...settings, slackSigningSecret: e.target.value })
                }
                placeholder="Enter signing secret..."
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-400 hover:text-amber-600"
                onClick={() => setShowSigningSecret(!showSigningSecret)}
              >
                {showSigningSecret ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleTestConnection}
              disabled={testingConnection || !settings.slackBotToken}
            >
              {testingConnection ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {testingConnection ? "Testing..." : "Test Connection"}
            </Button>
            <a
              href="https://api.slack.com/apps"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-amber-600 underline-offset-4 hover:underline hover:text-amber-700"
            >
              Slack App Setup Guide →
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription className="text-red-500/80">
            These actions are irreversible. Please proceed with caution.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex flex-col gap-3 rounded-lg border border-red-100 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-red-800">Reset All Data</p>
                <p className="text-xs text-red-500">
                  Delete all tacos, transactions, and user stats. Users will remain.
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="gap-1.5 shrink-0"
                onClick={() => setResetDialog(true)}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Reset Data
              </Button>
            </div>

            <div className="flex flex-col gap-3 rounded-lg border border-amber-200 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-amber-800">Seed Demo Data</p>
                <p className="text-xs text-amber-500">
                  Populate the database with sample users, transactions, and rewards
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 shrink-0"
                onClick={handleSeedData}
                disabled={seedLoading}
              >
                {seedLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <DatabaseZap className="h-3.5 w-3.5" />
                )}
                {seedLoading ? "Seeding..." : "Seed Data"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reset Confirmation Dialog */}
      <Dialog open={resetDialog} onOpenChange={setResetDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Reset All Data
            </DialogTitle>
            <DialogDescription>
              This will permanently delete all taco transactions, reset user
              statistics, and clear all analytics data. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setResetDialog(false)}
              disabled={resetLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleResetData}
              disabled={resetLoading}
            >
              {resetLoading ? "Resetting..." : "Yes, Reset Everything"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
