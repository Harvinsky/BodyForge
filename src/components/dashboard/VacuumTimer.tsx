"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Loader2, Wind } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDailyTracker } from "@/hooks/use-daily-tracker";
import { isHabitDone } from "@/lib/habits";
import { APP_MODULE_PREFIX } from "@/lib/brand";
import {
  VACUUM_DURATION_SEC,
  VACUUM_PROTOCOL_STEPS,
  VACUUM_PROTOCOL_SUBTITLE,
  VACUUM_PROTOCOL_TITLE,
} from "@/lib/vacuum-protocol";
import { cn } from "@/lib/utils";

type TimerPhase = "idle" | "running" | "complete";

function playCompletionChime(): void {
  if (typeof window === "undefined") return;

  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 523.25;
    gain.gain.value = 0.0001;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    osc.start(t);
    osc.stop(t + 0.5);
    osc.onended = () => void ctx.close();
  } catch {
    // Audio blocked or unavailable — visual flash only
  }
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface VacuumTimerProps {
  embedded?: boolean;
}

export function VacuumTimer({ embedded = false }: VacuumTimerProps) {
  const { tasks, toggleHabit, syncing } = useDailyTracker();
  const [phase, setPhase] = useState<TimerPhase>("idle");
  const [secondsLeft, setSecondsLeft] = useState(VACUUM_DURATION_SEC);
  const [flash, setFlash] = useState(false);
  const [saving, setSaving] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const alreadyDone = isHabitDone(tasks, "vacuum");
  const progress =
    phase === "idle"
      ? 0
      : ((VACUUM_DURATION_SEC - secondsLeft) / VACUUM_DURATION_SEC) * 100;

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const onTimerFinished = useCallback(() => {
    clearTimer();
    setPhase("complete");
    setSecondsLeft(0);
    playCompletionChime();
    setFlash(true);
    window.setTimeout(() => setFlash(false), 1200);
  }, [clearTimer]);

  const startProtocol = () => {
    if (phase === "running" || alreadyDone) return;

    clearTimer();
    setSecondsLeft(VACUUM_DURATION_SEC);
    setPhase("running");
    setFlash(false);

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          onTimerFinished();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const markComplete = async () => {
    if (alreadyDone || saving) return;
    if (phase !== "complete") return;

    setSaving(true);
    await toggleHabit("vacuum", true);
    setSaving(false);
  };

  const resetTimer = () => {
    clearTimer();
    setPhase("idle");
    setSecondsLeft(VACUUM_DURATION_SEC);
    setFlash(false);
  };

  const canStart = phase === "idle" && !alreadyDone;
  const canComplete = phase === "complete" && !alreadyDone;

  return (
    <Card
      className={cn(
        "overflow-hidden transition-shadow duration-300",
        embedded ? "border-0 bg-transparent shadow-none" : "harvin-panel",
        flash && "ring-2 ring-primary shadow-[0_0_32px_rgba(201,162,39,0.35)]"
      )}
    >
      <CardHeader className="border-b border-primary/20 pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-primary/40 bg-background/80">
              <Wind className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-muted-foreground">
                {APP_MODULE_PREFIX}
              </p>
              <CardTitle className="mt-1 font-mono text-base uppercase tracking-widest text-[#e8d5a3]">
                {VACUUM_PROTOCOL_TITLE}
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                {VACUUM_PROTOCOL_SUBTITLE}
              </p>
            </div>
          </div>
          {alreadyDone && (
            <span className="inline-flex items-center gap-1.5 self-start border border-primary/50 bg-primary/10 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-[#e8d5a3]">
              <Check className="h-3.5 w-3.5 text-primary" />
              Dnes splnené
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[1fr_minmax(220px,280px)] lg:gap-8">
        <ol className="space-y-3">
          {VACUUM_PROTOCOL_STEPS.map((item) => (
            <li
              key={item.step}
              className="flex gap-3 border-l-2 border-primary/25 pl-3 sm:gap-4 sm:pl-4"
            >
              <span className="font-mono text-xs font-semibold text-primary">
                {item.step}
              </span>
              <div className="min-w-0">
                <p className="font-mono text-xs font-semibold uppercase tracking-wider text-[#e8d5a3]">
                  {item.title}
                </p>
                <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                  {item.body}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <div className="flex flex-col items-center justify-center gap-4 rounded-md border border-primary/25 bg-background/40 p-4 sm:p-6">
          <div
            className={cn(
              "relative flex h-36 w-36 items-center justify-center sm:h-40 sm:w-40",
              flash && "animate-pulse"
            )}
            aria-live="polite"
            aria-label="Časovač vákuového protokolu"
          >
            <svg
              className="absolute inset-0 -rotate-90"
              viewBox="0 0 100 100"
              aria-hidden
            >
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="#2a2a2a"
                strokeWidth="6"
              />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="#c9a227"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 42}
                strokeDashoffset={
                  2 * Math.PI * 42 * (1 - Math.min(100, progress) / 100)
                }
                className="transition-[stroke-dashoffset] duration-1000 ease-linear"
              />
            </svg>
            <span
              className={cn(
                "font-mono text-4xl font-bold tabular-nums tracking-tight sm:text-5xl",
                phase === "complete" ? "text-[#e8d5a3]" : "text-foreground",
                flash && "text-primary"
              )}
            >
              {formatCountdown(secondsLeft)}
            </span>
          </div>

          <p className="text-center font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            {phase === "idle" && "Pripravený na spustenie"}
            {phase === "running" && "Protokol aktívny — drž vákuum"}
            {phase === "complete" && !alreadyDone && "Protokol dokončený"}
            {alreadyDone && "Záznam v progrese"}
          </p>

          <div className="flex w-full max-w-xs flex-col gap-2">
            <Button
              type="button"
              size="lg"
              className="w-full font-mono text-xs uppercase tracking-[0.2em]"
              onClick={startProtocol}
              disabled={!canStart}
            >
              {phase === "running" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Beží protokol…
                </>
              ) : (
                "Spustiť protokol"
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full font-mono text-xs uppercase tracking-[0.2em]"
              onClick={markComplete}
              disabled={!canComplete || saving || syncing}
            >
              {saving || syncing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Ukladám…
                </>
              ) : (
                "Splnené"
              )}
            </Button>

            {phase !== "idle" && !alreadyDone && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
                onClick={resetTimer}
                disabled={phase === "running"}
              >
                Resetovať
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
