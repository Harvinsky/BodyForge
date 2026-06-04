"use client";

import { AppUserProvider } from "@/hooks/use-app-user";
import { BodyGoalProvider } from "@/hooks/use-body-goal";
import { ActivitySummaryProvider } from "@/hooks/use-activity-summary";
import { CalorieProvider } from "@/hooks/use-calories";
import { DailyTrackerProvider } from "@/hooks/use-daily-tracker";
import { HydrationProvider } from "@/hooks/use-hydration";
import { DayHistoryProvider } from "@/hooks/use-day-history";
import { NotificationProvider } from "@/providers/notification-provider";

export function DashboardProviders({ children }: { children: React.ReactNode }) {
  return (
    <AppUserProvider>
      <BodyGoalProvider>
        <DailyTrackerProvider>
          <CalorieProvider>
            <ActivitySummaryProvider>
              <HydrationProvider>
                <DayHistoryProvider>
                  <NotificationProvider>{children}</NotificationProvider>
                </DayHistoryProvider>
              </HydrationProvider>
            </ActivitySummaryProvider>
          </CalorieProvider>
        </DailyTrackerProvider>
      </BodyGoalProvider>
    </AppUserProvider>
  );
}
