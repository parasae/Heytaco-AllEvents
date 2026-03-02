"use client";

import { useState, useCallback } from "react";
import { Sidebar } from "@/components/shared/sidebar";
import { Header } from "@/components/shared/header";
import { GiveTacoDialog } from "@/components/shared/give-taco-dialog";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [giveTacoOpen, setGiveTacoOpen] = useState(false);

  const handleMenuToggle = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const handleSidebarClose = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  const handleGiveTaco = useCallback(() => {
    setGiveTacoOpen(true);
  }, []);

  return (
    <div className="min-h-dvh bg-background">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={handleSidebarClose} />

      {/* Main area - offset by sidebar on desktop */}
      <div className="lg:pl-[260px] transition-[padding] duration-300">
        {/* Header */}
        <Header onMenuToggle={handleMenuToggle} onGiveTaco={handleGiveTaco} />

        {/* Main content */}
        <main className="p-4 lg:p-6 max-w-7xl mx-auto animate-fade-in">
          {children}
        </main>
      </div>

      {/* Give Taco Dialog */}
      <GiveTacoDialog open={giveTacoOpen} onOpenChange={setGiveTacoOpen} />
    </div>
  );
}
