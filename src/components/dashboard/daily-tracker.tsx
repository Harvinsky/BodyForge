"use client";

import {
  Clock,
  Droplets,
  Moon,
  Sun,
  UtensilsCrossed,
  Wind,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useDailyTracker } from "@/hooks/use-daily-tracker";
import type { DailyTaskKey } from "@/lib/types";

interface TaskItemProps {
  id: DailyTaskKey;
  label: string;
  description: string;
  icon: React.ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

function TaskItem({
  id,
  label,
  description,
  icon,
  checked,
  onCheckedChange,
}: TaskItemProps) {
  return (
    <div className="flex items-start gap-4 border border-border/60 bg-background/40 p-4 transition-colors hover:border-border">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        className="mt-0.5"
      />
      <div className="flex flex-1 items-start gap-3">
        <div className="mt-0.5 text-muted-foreground">{icon}</div>
        <div className="space-y-1">
          <Label
            htmlFor={id}
            className="cursor-pointer font-mono text-sm uppercase tracking-wide"
          >
            {label}
          </Label>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}

export function DailyTracker() {
  const {
    tasks,
    toggleTask,
    completion,
    completedCount,
    totalTasks,
    loading,
    syncing,
  } = useDailyTracker();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Daily Tracker</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-mono text-sm text-muted-foreground">
            Načítavam dnešný log...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>Daily Tracker</CardTitle>
            <CardDescription className="mt-1">
              Dnešná konzistencia protokolu
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="font-mono text-2xl font-bold tabular-nums">
              {completion}%
            </p>
            <p className="font-mono text-xs text-muted-foreground">
              {completedCount}/{totalTasks} úloh
              {syncing && " · sync..."}
            </p>
          </div>
        </div>
        <Progress value={completion} className="mt-4 h-1.5" />
      </CardHeader>
      <CardContent className="space-y-3">
        <TaskItem
          id="fasting_window"
          label="16:8 Okno"
          description="Jedenie len medzi 12:00 – 19:00"
          icon={<UtensilsCrossed className="h-4 w-4" />}
          checked={tasks.fasting_window}
          onCheckedChange={(v) => toggleTask("fasting_window", v)}
        />
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <Droplets className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
              Hydratácia — 3L
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <TaskItem
              id="hydration_1l"
              label="1L"
              description="Prvá fľaša"
              icon={<Droplets className="h-4 w-4" />}
              checked={tasks.hydration_1l}
              onCheckedChange={(v) => toggleTask("hydration_1l", v)}
            />
            <TaskItem
              id="hydration_2l"
              label="2L"
              description="Druhá fľaša"
              icon={<Droplets className="h-4 w-4" />}
              checked={tasks.hydration_2l}
              onCheckedChange={(v) => toggleTask("hydration_2l", v)}
            />
            <TaskItem
              id="hydration_3l"
              label="3L"
              description="Cieľ splnený"
              icon={<Droplets className="h-4 w-4" />}
              checked={tasks.hydration_3l}
              onCheckedChange={(v) => toggleTask("hydration_3l", v)}
            />
          </div>
        </div>
        <TaskItem
          id="morning_vacuum"
          label="Ranné Vákuum"
          description="Brucho vtiahnuté, dýchanie, aktivácia jadra"
          icon={<Wind className="h-4 w-4" />}
          checked={tasks.morning_vacuum}
          onCheckedChange={(v) => toggleTask("morning_vacuum", v)}
        />
        <TaskItem
          id="evening_tech_off"
          label="Večerné Vypnutie"
          description="Technológie off po 21:00 — spánková hygiena"
          icon={<Moon className="h-4 w-4" />}
          checked={tasks.evening_tech_off}
          onCheckedChange={(v) => toggleTask("evening_tech_off", v)}
        />
        <div className="industrial-divider mt-4" />
        <div className="flex items-center gap-2 pt-2 font-mono text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>Fasting: 19:00 → 12:00</span>
          <Sun className="ml-auto h-3 w-3" />
        </div>
      </CardContent>
    </Card>
  );
}
