"use client";

import { DashboardHeader } from "@/components/dashboard/header";
import { WeeklyProgress } from "@/components/dashboard/weekly-progress";
import { CalendarEvents } from "@/components/dashboard/calendar-events";
import { StatsSidebar } from "@/components/dashboard/stats-sidebar";
import { StatusStrip } from "@/components/dashboard/status-strip";
import { ProtocolModules } from "@/components/dashboard/ProtocolModules";
import { BodyGoalPanel } from "@/components/dashboard/BodyGoalPanel";
import { DailyTracker } from "@/components/dashboard/daily-tracker";
import { DashboardProviders } from "@/providers/dashboard-providers";
import { useHydration } from "@/hooks/use-hydration";
import { useAppUser } from "@/hooks/use-app-user";
import { cn } from "@/lib/utils";

function DashboardFrame({ children }: { children: React.ReactNode }) {
  const { optimized } = useHydration();
  return (
    <div
      className={cn(
        "min-h-screen transition-all duration-700",
        optimized &&
          "bg-[radial-gradient(ellipse_80%_40%_at_50%_0%,rgba(56,189,248,0.12),transparent)]"
      )}
    >
      {optimized && (
        <div className="sticky top-0 z-50 border-b border-[#34d399]/30 bg-[#0a1628]/90 px-4 py-2 text-center backdrop-blur-sm">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.4em] text-[#6ee7b7]">
            System Optimized
          </p>
        </div>
      )}
      {children}
    </div>
  );
}

function DashboardContent() {
  const { authReady } = useAppUser();

  if (!authReady) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <p className="font-mono text-sm uppercase tracking-widest text-muted-foreground">
          Načítavam BodyForge…
        </p>
      </div>
    );
  }

  return (
    <DashboardFrame>
      <DashboardHeader />
      <main className="mx-auto max-w-[1600px] px-4 py-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_240px] xl:grid-cols-[1fr_280px]">
          <div className="order-2 space-y-6 lg:order-1">
            <DailyTracker />
            <div className="grid gap-6 xl:grid-cols-2">
              <WeeklyProgress />
              <CalendarEvents />
            </div>
            <details className="group border border-primary/25 bg-background/30 open:pb-4">
              <summary className="cursor-pointer list-none px-4 py-3 font-mono text-sm uppercase tracking-widest text-[#e8d5a3] marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-2">
                  Môj cieľ · váha a kalórie
                  <span className="text-[10px] text-muted-foreground group-open:hidden">
                    Rozbaliť
                  </span>
                  <span className="hidden text-[10px] text-muted-foreground group-open:inline">
                    Zbaliť
                  </span>
                </span>
              </summary>
              <BodyGoalPanel />
            </details>
            <ProtocolModules />
            <StatusStrip />
          </div>
          <div className="order-1 lg:order-2">
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
