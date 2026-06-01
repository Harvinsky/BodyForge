"use client";

import { AppUserProvider } from "@/hooks/use-app-user";
import { BodyGoalProvider } from "@/hooks/use-body-goal";
import { CalorieProvider } from "@/hooks/use-calories";
import { DailyTrackerProvider } from "@/hooks/use-daily-tracker";
import { HydrationProvider } from "@/hooks/use-hydration";
import { NotificationProvider } from "@/providers/notification-provider";

export function DashboardProviders({ children }: { children: React.ReactNode }) {
  return (
    <AppUserProvider>
      <DailyTrackerProvider>
        <BodyGoalProvider>
          <CalorieProvider>
            <HydrationProvider>
              <NotificationProvider>{children}</NotificationProvider>
            </HydrationProvider>
          </CalorieProvider>
        </BodyGoalProvider>
      </DailyTrackerProvider>
    </AppUserProvider>
  );
}
