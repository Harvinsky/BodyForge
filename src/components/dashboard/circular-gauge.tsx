"use client";

import { cn } from "@/lib/utils";

const VARIANT_STROKE = {
  gold: "#c9a227",
  cyan: "#38bdf8",
  emerald: "#34d399",
} as const;

const VARIANT_TEXT = {
  gold: "text-[#e8d5a3]",
  cyan: "text-[#7dd3fc]",
  emerald: "text-[#6ee7b7]",
} as const;

export type CircularGaugeVariant = keyof typeof VARIANT_STROKE;

interface CircularGaugeProps {
  value: number;
  label: string;
  size?: number;
  variant?: CircularGaugeVariant;
  center?: "percent" | "text";
  centerText?: string;
  sublabel?: string;
}

export function CircularGauge({
  value,
  label,
  size = 130,
  variant = "gold",
  center = "percent",
  centerText,
  sublabel,
}: CircularGaugeProps) {
  const stroke = 7;
  const radius = (size - stroke * 2) / 2 - 4;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, value));
  const offset = circumference - (clamped / 100) * circumference;
  const accent = VARIANT_STROKE[variant];

  return (
    <div className="flex flex-col items-center gap-1.5">
      <p className="harvin-panel-title text-center leading-tight">{label}</p>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="#2a2a2a"
            strokeWidth={stroke}
          />
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={accent}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
        <span
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center font-semibold tabular-nums",
            center === "text" ? "text-lg" : "text-2xl",
            VARIANT_TEXT[variant]
          )}
        >
          {center === "text" ? (
            centerText ?? "—"
          ) : (
            <>{Math.round(clamped)}%</>
          )}
        </span>
      </div>
      {sublabel && (
        <p className="text-center font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
          {sublabel}
        </p>
      )}
    </div>
  );
}
