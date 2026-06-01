"use client";

import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CalorieLogEntry } from "@/lib/calories";

interface CalorieLogListProps {
  logs: CalorieLogEntry[];
  onRemove: (id: string) => void;
  disabled?: boolean;
}

export function CalorieLogList({
  logs,
  onRemove,
  disabled = false,
}: CalorieLogListProps) {
  const sorted = [...logs].sort(
    (a, b) =>
      new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime()
  );

  if (sorted.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        Dnešný príjem · odstrániť
      </p>
      <ul className="max-h-48 space-y-1.5 overflow-y-auto">
        {sorted.map((log) => (
          <li
            key={log.id}
            className="flex items-center justify-between gap-2 border border-primary/20 bg-background/50 px-3 py-2"
          >
            <div className="min-w-0 font-mono text-xs">
              <span className="text-[#e8d5a3]">{log.label}</span>
              <span className="mx-2 text-muted-foreground">·</span>
              <span className="text-primary">{log.calories} kcal</span>
              <span className="mx-2 text-muted-foreground">·</span>
              <span className="text-muted-foreground">
                {format(new Date(log.logged_at), "HH:mm", { locale: sk })}
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled}
              onClick={() => onRemove(log.id)}
              className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
              aria-label={`Odstrániť ${log.label}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
