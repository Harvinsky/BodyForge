"use client";

import Link from "next/link";
import { LogIn, LogOut } from "lucide-react";
import { DeerLogo } from "@/components/dashboard/deer-logo";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import { formatGoalDateLabel, getWeightProgressPercent } from "@/lib/body-goal";
import { useBodyGoal } from "@/hooks/use-body-goal";
import { useAppUser } from "@/hooks/use-app-user";
import { getGoalProgressPercent } from "@/lib/goal";

export function DashboardHeader() {
  const { email, signOut } = useAppUser();
  const { settings } = useBodyGoal();
  const timePercent = getGoalProgressPercent(settings);
  const weightPercent = getWeightProgressPercent(settings);

  const weightLine =
    settings.currentWeightKg != null
      ? `${settings.startWeightKg} → ${settings.currentWeightKg} → ${settings.goalWeightKg} kg`
      : `${settings.startWeightKg} → ${settings.goalWeightKg} kg`;

  return (
    <header className="border-b border-primary/30 bg-card/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <div className="flex items-center gap-4">
          <DeerLogo className="h-12 w-12 shrink-0" />
          <div>
            <h1 className="text-lg font-semibold uppercase tracking-[0.15em] text-[#e8d5a3] sm:text-xl">
              {APP_NAME}
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground">{APP_TAGLINE}</p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-primary">
              {weightLine}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:min-w-[300px] sm:items-end">
          <div className="w-full space-y-2 sm:max-w-xs">
            <div>
              <div className="mb-1 flex justify-between text-[10px] uppercase tracking-wider">
                <span className="text-muted-foreground">
                  Čas · {formatGoalDateLabel(settings.goalDate)}
                </span>
                <span className="text-[#e8d5a3]">{timePercent}%</span>
              </div>
              <Progress value={timePercent} className="h-1.5 bg-secondary" />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-[10px] uppercase tracking-wider">
                <span className="text-muted-foreground">Váha k cieľu</span>
                <span className="text-[#e8d5a3]">{weightPercent}%</span>
              </div>
              <Progress value={weightPercent} className="h-1.5 bg-secondary" />
            </div>
          </div>

          {isSupabaseConfigured() &&
            (email ? (
              <div className="flex items-center gap-2">
                <span className="max-w-[180px] truncate text-xs text-muted-foreground">
                  {email}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void signOut()}
                  className="border-primary/40 text-xs"
                >
                  <LogOut className="h-3 w-3" />
                  Odhlásiť
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                asChild
                className="border-primary/40"
              >
                <Link href="/login">
                  <LogIn className="h-3 w-3" />
                  Prihlásiť sa
                </Link>
              </Button>
            ))}
        </div>
      </div>
    </header>
  );
}
