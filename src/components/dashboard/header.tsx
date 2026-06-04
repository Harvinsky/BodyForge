"use client";

import Link from "next/link";
import { LogIn, LogOut, Moon, Sun } from "lucide-react";
import { DeerLogo } from "@/components/dashboard/deer-logo";
import { NotificationsBellMenu } from "@/components/dashboard/notifications-bell-menu";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { Progress } from "@/components/ui/progress";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { APP_NAME } from "@/lib/brand";
import {
  formatProgramDateRange,
  formatWeightGoalLine,
  getWeightProgressPercent,
  isBodyGoalConfigured,
} from "@/lib/body-goal";
import { useBodyGoal } from "@/hooks/use-body-goal";
import { useAppUser } from "@/hooks/use-app-user";
import { getGoalProgressPercent } from "@/lib/goal";
import { useI18n } from "@/providers/locale-provider";

export function DashboardHeader() {
  const { email, signOut } = useAppUser();
  const { settings } = useBodyGoal();
  const { theme, toggle: toggleTheme } = useTheme();
  const { t, locale } = useI18n();
  const configured = isBodyGoalConfigured(settings);
  const timePercent = getGoalProgressPercent(settings);
  const weightPercent = getWeightProgressPercent(settings);
  const programRange = formatProgramDateRange(
    settings,
    locale,
    t("goal.planUnset")
  );
  const weightLine = formatWeightGoalLine(settings, t("goal.setGoalInSection"));

  return (
    <header className="sticky top-0 z-40 border-b border-primary/30 bg-card/90 backdrop-blur-lg supports-[backdrop-filter]:bg-card/75"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="mx-auto w-full max-w-[1600px] px-4 py-3 sm:px-5 sm:py-4 lg:px-8">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <DeerLogo className="h-10 w-10 shrink-0 sm:h-12 sm:w-12" />
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold uppercase tracking-[0.12em] text-[#e8d5a3] sm:text-lg sm:tracking-[0.15em]">
                {APP_NAME}
              </h1>
              <p className="truncate text-[11px] text-muted-foreground sm:text-xs">
                {t("brand.tagline")}
              </p>
              <p className="mt-0.5 truncate font-mono text-[9px] uppercase tracking-wider text-primary sm:text-[10px]">
                {t("header.plan", { range: programRange })}
              </p>
              <p className="truncate font-mono text-[9px] text-muted-foreground sm:text-[10px]">
                {weightLine}
              </p>
            </div>
          </div>

          {isSupabaseConfigured() &&
            (email ? (
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="max-w-[140px] truncate text-[10px] text-muted-foreground sm:max-w-[200px] sm:text-xs">
                  {email}
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleTheme}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                  >
                    {theme === "dark" ? (
                      <Sun className="h-3.5 w-3.5" />
                    ) : (
                      <Moon className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <NotificationsBellMenu />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void signOut()}
                    className="h-8 border-primary/40 px-2.5 text-[10px] sm:text-xs"
                  >
                    <LogOut className="h-3 w-3" />
                    <span className="sr-only sm:not-sr-only sm:ml-1">
                      {t("common.signOut")}
                    </span>
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                asChild
                className="h-8 shrink-0 border-primary/40"
              >
                <Link href="/login">
                  <LogIn className="h-3 w-3" />
                  {t("common.signIn")}
                </Link>
              </Button>
            ))}
        </div>

        {configured && (
          <div className="mt-3 grid w-full gap-2 sm:grid-cols-2 sm:gap-3">
            <div>
              <div className="mb-1 flex justify-between gap-2 text-[10px] uppercase tracking-wider">
                <span className="min-w-0 truncate text-muted-foreground">
                  {t("header.period", { range: programRange })}
                </span>
                <span className="shrink-0 text-[#e8d5a3]">{timePercent}%</span>
              </div>
              <Progress value={timePercent} className="h-2 bg-secondary" />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-[10px] uppercase tracking-wider">
                <span className="text-muted-foreground">
                  {t("header.weightToGoal")}
                </span>
                <span className="text-[#e8d5a3]">{weightPercent}%</span>
              </div>
              <Progress value={weightPercent} className="h-2 bg-secondary" />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
