"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useDailyTracker } from "@/hooks/use-daily-tracker";
import { isHabitDone } from "@/lib/habits";

interface StatusCardProps {
  title: string;
  time: string;
  status: "Splnené" | "Pripravené" | "Čaká";
}

function StatusCard({ title, time, status }: StatusCardProps) {
  const done = status === "Splnené";
  return (
    <Card className="flex-1 min-w-[200px]">
      <CardContent className="p-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {title}{" "}
          <span className="text-primary">({time})</span>
        </p>
        <p
          className={`mt-2 text-sm font-medium ${
            done ? "text-[#e8d5a3]" : "text-muted-foreground"
          }`}
        >
          {status}
        </p>
      </CardContent>
    </Card>
  );
}

export function StatusStrip() {
  const { tasks } = useDailyTracker();

  const waterDone = isHabitDone(tasks, "water");
  const fastingDone = isHabitDone(tasks, "fasting");
  const vacuumDone = isHabitDone(tasks, "vacuum");

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <StatusCard
        title="Posledný pohár"
        time="19:00"
        status={waterDone ? "Splnené" : "Pripravené"}
      />
      <StatusCard
        title="Posledné jedlo"
        time="19:00"
        status={fastingDone ? "Splnené" : "Pripravené"}
      />
      <StatusCard
        title="Vacuum ráno"
        time="07:30"
        status={vacuumDone ? "Splnené" : "Čaká"}
      />
    </div>
  );
}
