"use client";

import { useState } from "react";
import {
  Upload,
  FileSpreadsheet,
  Loader2,
  Check,
  X,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Users,
  Tag,
  Gift,
  ShoppingBag,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/lib/auth-user";

interface ImportResults {
  usersCreated: number;
  tacosImported: number;
  tagsCreated: number;
  redemptionsImported: number;
  rewardsCreated: number;
  errors: string[];
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminImportPage() {
  const { user: currentUser } = useCurrentUser();
  const [tacoFile, setTacoFile] = useState<File | null>(null);
  const [redemptionFile, setRedemptionFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResults | null>(null);
  const [errorsExpanded, setErrorsExpanded] = useState(false);

  // Notifications
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleImport = async () => {
    if (!tacoFile && !redemptionFile) return;

    setImporting(true);
    setResults(null);

    try {
      const formData = new FormData();
      formData.append("teamId", currentUser?.teamId || "");
      if (tacoFile) formData.append("tacoFile", tacoFile);
      if (redemptionFile) formData.append("redemptionFile", redemptionFile);

      const res = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Import failed");
      }

      setResults(data.results);
      showNotification("success", "Import completed successfully");
    } catch (e) {
      showNotification(
        "error",
        e instanceof Error ? e.message : "Import failed"
      );
    } finally {
      setImporting(false);
    }
  };

  const hasFiles = tacoFile || redemptionFile;

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
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-amber-100 p-2.5">
          <Upload className="h-6 w-6 text-amber-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-amber-950">Import Data</h1>
          <p className="text-sm text-amber-600">
            Migrate your data from HeyTaco
          </p>
        </div>
      </div>

      {/* Info Card */}
      <Card className="border-amber-200/60">
        <CardContent className="flex items-start gap-3 p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100">
            <FileSpreadsheet className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-amber-900">
              How it works
            </p>
            <p className="mt-1 text-xs text-amber-600 leading-relaxed">
              Upload your exported HeyTaco Excel files to migrate users, taco
              transactions, tags, and redemption history. Both files are
              optional — you can import just tacos, just redemptions, or both.
              Users found in either file will be automatically created or
              updated.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* File Upload Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-amber-500" />
            Upload Files
          </CardTitle>
          <CardDescription>
            Select your exported HeyTaco data files
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Taco file input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-amber-950">
              Taco Data File
            </label>
            <div
              className={cn(
                "relative rounded-lg border-2 border-dashed p-4 transition-colors",
                tacoFile
                  ? "border-amber-300 bg-amber-50/50"
                  : "border-amber-200 hover:border-amber-300 hover:bg-amber-50/30"
              )}
            >
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="absolute inset-0 cursor-pointer opacity-0"
                onChange={(e) => setTacoFile(e.target.files?.[0] || null)}
              />
              {tacoFile ? (
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                    <FileSpreadsheet className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-amber-900 truncate">
                      {tacoFile.name}
                    </p>
                    <p className="text-xs text-amber-500">
                      {formatFileSize(tacoFile.size)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTacoFile(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 text-center">
                  <Upload className="h-5 w-5 text-amber-400" />
                  <p className="text-sm text-amber-600">
                    Click to select taco data file
                  </p>
                  <p className="text-xs text-amber-400">
                    .xlsx, .xls, or .csv
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Redemption file input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-amber-950">
              Redemption Data File
            </label>
            <div
              className={cn(
                "relative rounded-lg border-2 border-dashed p-4 transition-colors",
                redemptionFile
                  ? "border-amber-300 bg-amber-50/50"
                  : "border-amber-200 hover:border-amber-300 hover:bg-amber-50/30"
              )}
            >
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="absolute inset-0 cursor-pointer opacity-0"
                onChange={(e) =>
                  setRedemptionFile(e.target.files?.[0] || null)
                }
              />
              {redemptionFile ? (
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                    <FileSpreadsheet className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-amber-900 truncate">
                      {redemptionFile.name}
                    </p>
                    <p className="text-xs text-amber-500">
                      {formatFileSize(redemptionFile.size)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRedemptionFile(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 text-center">
                  <Upload className="h-5 w-5 text-amber-400" />
                  <p className="text-sm text-amber-600">
                    Click to select redemption data file
                  </p>
                  <p className="text-xs text-amber-400">
                    .xlsx, .xls, or .csv
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Import Button */}
          <Button
            className="w-full gap-2"
            size="lg"
            disabled={!hasFiles || importing}
            onClick={handleImport}
          >
            {importing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {importing ? "Importing..." : "Start Import"}
          </Button>
        </CardContent>
      </Card>

      {/* Results Card */}
      {results && (
        <Card className="border-emerald-200/60 animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-800">
              <Check className="h-5 w-5" />
              Import Complete
            </CardTitle>
            <CardDescription className="text-emerald-600">
              Your HeyTaco data has been imported successfully
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <div className="rounded-lg border border-amber-100 bg-amber-50/50 p-3 text-center">
                <Users className="mx-auto h-5 w-5 text-amber-500" />
                <p className="mt-1 text-2xl font-bold text-amber-900">
                  {results.usersCreated}
                </p>
                <p className="text-xs text-amber-600">Users</p>
              </div>
              <div className="rounded-lg border border-amber-100 bg-amber-50/50 p-3 text-center">
                <span className="mx-auto block text-lg">🌮</span>
                <p className="mt-1 text-2xl font-bold text-amber-900">
                  {results.tacosImported}
                </p>
                <p className="text-xs text-amber-600">Tacos</p>
              </div>
              <div className="rounded-lg border border-amber-100 bg-amber-50/50 p-3 text-center">
                <Tag className="mx-auto h-5 w-5 text-amber-500" />
                <p className="mt-1 text-2xl font-bold text-amber-900">
                  {results.tagsCreated}
                </p>
                <p className="text-xs text-amber-600">Tags</p>
              </div>
              <div className="rounded-lg border border-amber-100 bg-amber-50/50 p-3 text-center">
                <Gift className="mx-auto h-5 w-5 text-amber-500" />
                <p className="mt-1 text-2xl font-bold text-amber-900">
                  {results.rewardsCreated}
                </p>
                <p className="text-xs text-amber-600">Rewards</p>
              </div>
              <div className="rounded-lg border border-amber-100 bg-amber-50/50 p-3 text-center">
                <ShoppingBag className="mx-auto h-5 w-5 text-amber-500" />
                <p className="mt-1 text-2xl font-bold text-amber-900">
                  {results.redemptionsImported}
                </p>
                <p className="text-xs text-amber-600">Redemptions</p>
              </div>
            </div>

            {/* Errors section */}
            {results.errors.length > 0 && (
              <div className="mt-4">
                <button
                  className="flex w-full items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-left text-sm font-medium text-red-800 transition-colors hover:bg-red-100"
                  onClick={() => setErrorsExpanded(!errorsExpanded)}
                >
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>
                    {results.errors.length} warning
                    {results.errors.length !== 1 ? "s" : ""} during import
                  </span>
                  {errorsExpanded ? (
                    <ChevronUp className="ml-auto h-4 w-4" />
                  ) : (
                    <ChevronDown className="ml-auto h-4 w-4" />
                  )}
                </button>
                {errorsExpanded && (
                  <div className="mt-2 max-h-60 overflow-y-auto rounded-lg border border-red-100 bg-red-50/50 p-3">
                    <ul className="space-y-1">
                      {results.errors.map((err, i) => (
                        <li
                          key={i}
                          className="text-xs text-red-600 break-all"
                        >
                          {err}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
