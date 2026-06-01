"use client";

import { Gauge } from "lucide-react";
import { HYDRATION_ACCENT } from "@/lib/hydration";
import { cn } from "@/lib/utils";

interface HydrationGaugeProps {
  percent: number;
  liters: string;
  optimized: boolean;
  size?: number;
  compact?: boolean;
}

export function HydrationGauge({
  percent,
  liters,
  optimized,
  size = 160,
  compact = false,
}: HydrationGaugeProps) {
  const stroke = compact ? 8 : 10;
  const radius = (size - stroke * 2) / 2 - 4;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, percent) / 100) * circumference;
  const accent = optimized ? "#34d399" : HYDRATION_ACCENT;

  return (
    <div className="relative flex flex-col items-center">
      <div
        className={cn(
          "relative",
          optimized && "drop-shadow-[0_0_24px_rgba(52,211,153,0.45)]"
        )}
        style={{ width: size, height: size }}
      >
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <circle
            cx={cx}
            cy={cy}
            r={radius + 6}
            fill="none"
            stroke="#1a1a1a"
            strokeWidth={2}
          />
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="#252525"
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
          {[0, 25, 50, 75].map((tick) => {
            const angle = (tick / 100) * 360 - 90;
            const rad = (angle * Math.PI) / 180;
            const x1 = cx + (radius - 4) * Math.cos(rad);
            const y1 = cy + (radius - 4) * Math.sin(rad);
            const x2 = cx + (radius + 2) * Math.cos(rad);
            const y2 = cy + (radius + 2) * Math.sin(rad);
            return (
              <line
                key={tick}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#404040"
                strokeWidth={1}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Gauge
            className={cn("mb-1 text-[#38bdf8]", compact ? "h-3 w-3" : "h-4 w-4")}
            style={{ color: accent }}
            aria-hidden
          />
          <span
            className={cn(
              "font-bold tabular-nums",
              compact ? "font-mono text-2xl" : "font-mono text-3xl"
            )}
            style={{ color: accent }}
          >
            {liters}L
          </span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            / 4.0L
          </span>
        </div>
      </div>
      {!compact && (
        <p className="mt-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Palivomer · {percent}%
        </p>
      )}
    </div>
  );
}
