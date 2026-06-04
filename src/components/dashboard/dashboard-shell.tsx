"use client";

import { useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/header";
import { WeeklyProgress } from "@/components/dashboard/weekly-progress";
import { CalendarEvents } from "@/components/dashboard/calendar-events";
import { StatsSidebar } from "@/components/dashboard/stats-sidebar";
import { DayHistoryPanel } from "@/components/dashboard/DayHistoryPanel";
import { LongTermProgress } from "@/components/dashboard/LongTermProgress";
import { ProtocolModules } from "@/components/dashboard/ProtocolModules";
import { BodyGoalPanel } from "@/components/dashboard/BodyGoalPanel";
import { DailyTracker } from "@/components/dashboard/daily-tracker";
import { DashboardProviders } from "@/providers/dashboard-providers";
import { useAppUser } from "@/hooks/use-app-user";
import { useI18n } from "@/providers/locale-provider";
import { cn } from "@/lib/utils";

function DashboardFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell min-h-screen w-full overflow-x-clip bg-background">
      {children}
    </div>
  );
}

function DashboardContent() {
  const { authReady, email, signOut } = useAppUser();
  const { t } = useI18n();
  const [weeklyOpen, setWeeklyOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (!window.confirm(t("common.deleteAccountConfirm"))) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/account/delete", { method: "DELETE" });
      if (!res.ok) throw new Error();
      await signOut();
    } catch {
      alert(t("common.deleteAccountError"));
      setDeleting(false);
    }
  };

  if (!authReady) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <p className="font-mono text-sm uppercase tracking-widest text-muted-foreground">
          {t("shell.loading")}
        </p>
      </div>
    );
  }

  return (
    <DashboardFrame>
      <DashboardHeader />
      <main className="mx-auto w-full max-w-[1600px] px-4 py-4 pb-[max(2rem,env(safe-area-inset-bottom,0px))] sm:py-6 lg:px-8">
        <div className="grid w-full min-w-0 gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_260px] xl:grid-cols-[minmax(0,1fr)_280px] lg:gap-6">
          <div className="order-2 min-w-0 space-y-5 sm:space-y-6 lg:order-1">
            <details className="group overflow-hidden rounded-xl border border-primary/25 bg-card/40 open:pb-0">
              <summary className="cursor-pointer list-none px-4 py-3.5 font-mono text-sm uppercase tracking-widest text-[#e8d5a3] marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-2">
                  {t("shell.goalSection")}
                  <span className="text-[10px] text-muted-foreground group-open:hidden">
                    {t("common.expand")}
                  </span>
                  <span className="hidden text-[10px] text-muted-foreground group-open:inline">
                    {t("common.collapse")}
                  </span>
                </span>
              </summary>
              <BodyGoalPanel />
            </details>
            <DailyTracker />
            {/* Weekly progress + calendar — collapsible on mobile/tablet, always visible on desktop */}
            <div className={cn(
              "overflow-hidden rounded-xl border border-primary/25 bg-card/40 lg:rounded-none lg:border-0 lg:bg-transparent",
              weeklyOpen ? "pb-4 lg:pb-0" : "lg:pb-0"
            )}>
              {/* Toggle header — hidden on desktop */}
              <button
                type="button"
                onClick={() => setWeeklyOpen((v) => !v)}
                className="flex w-full items-center justify-between gap-2 px-4 py-3.5 font-mono text-sm uppercase tracking-widest text-[#e8d5a3] lg:hidden"
              >
                {t("shell.weeklySection")}
                <span className="text-[10px] text-muted-foreground">
                  {weeklyOpen ? t("common.collapse") : t("common.expand")}
                </span>
              </button>
              {/* Content — always shown on desktop, toggle-controlled on mobile */}
              <div className={cn(
                "lg:block",
                weeklyOpen ? "block" : "hidden"
              )}>
                <div className="px-4 lg:px-0">
                  <div className="grid min-w-0 gap-5 sm:gap-6 xl:grid-cols-2">
                    <WeeklyProgress />
                    <CalendarEvents />
                  </div>
                </div>
              </div>
            </div>
            <ProtocolModules />
            <DayHistoryPanel />
            <LongTermProgress />
            {authReady && email && (
              <div className="flex items-center justify-between pt-2">
                <a
                  href="/api/export"
                  download="bodyforge-export.csv"
                  className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50 hover:text-primary transition-colors"
                >
                  <Download className="h-3 w-3" />
                  {t("common.exportData")}
                </a>
                <button
                  type="button"
                  onClick={() => void handleDeleteAccount()}
                  disabled={deleting}
                  className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                  {t("common.deleteAccount")}
                </button>
              </div>
            )}
          </div>
          <div className="order-1 w-full min-w-0 max-lg:pt-0 lg:order-2 lg:sticky lg:top-[5.5rem] lg:self-start">
            <StatsSidebar />
          </div>
        </div>
      </main>
    </DashboardFrame>
  );
}

export function DashboardShell() {
  return (
    <DashboardProviders>
      <DashboardContent />
    </DashboardProviders>
  );
}
