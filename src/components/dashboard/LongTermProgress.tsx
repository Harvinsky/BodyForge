"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CardContent, CardTitle } from "@/components/ui/card";
import { useAppUser } from "@/hooks/use-app-user";
import { useTheme } from "@/hooks/use-theme";
import { useI18n } from "@/providers/locale-provider";
import { cn } from "@/lib/utils";
import { TrendingUp } from "lucide-react";
import { APP_MODULE_PREFIX } from "@/lib/brand";

interface HistoryData {
  dates: string[];
  calories: number[];
  hydration_ml: number[];
  training_minutes: number[];
}

interface ChartPoint {
  date: string;
  calories: number;
  hydrationL: number;
  trainingMin: number;
}

type DayRange = 30 | 90;

function formatDateShort(iso: string): string {
  const [, month, day] = iso.split("-");
  return `${day}.${month}`;
}

export function LongTermProgress() {
  const { userId } = useAppUser();
  const { theme } = useTheme();
  const { t } = useI18n();
  const isLight = theme === "light";
  const chartGrid = isLight ? "rgba(28, 21, 16, 0.08)" : "rgba(255,255,255,0.06)";
  const chartTick = isLight ? "#5c5244" : "#9a9a9a";
  const tooltipStyle = isLight
    ? {
        background: "#ffffff",
        border: "1px solid #c9a22788",
        borderRadius: 6,
        fontFamily: "monospace",
        fontSize: 11,
        color: "#1a140e",
      }
    : {
        background: "#1a1a1a",
        border: "1px solid #c9a22766",
        borderRadius: 6,
        fontFamily: "monospace",
        fontSize: 11,
      };
  const tooltipLabelStyle = isLight
    ? { color: "#5c4208" }
    : { color: "#e8d5a3" };
  const [range, setRange] = useState<DayRange>(30);
  const [data, setData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(
    async (days: DayRange) => {
      if (!userId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/history?days=${days}`);
        if (!res.ok) throw new Error("Failed to fetch history");
        const json = (await res.json()) as HistoryData;
        const points: ChartPoint[] = json.dates.map((date, i) => ({
          date: formatDateShort(date),
          calories: json.calories[i] ?? 0,
          hydrationL: Math.round(((json.hydration_ml[i] ?? 0) / 1000) * 10) / 10,
          trainingMin: json.training_minutes[i] ?? 0,
        }));
        setData(points);
      } catch {
        setError(t("errors.generic"));
      } finally {
        setLoading(false);
      }
    },
    [userId, t]
  );

  useEffect(() => {
    void fetchData(range);
  }, [range, fetchData]);

  const tickInterval = range === 90 ? 6 : 2;

  return (
    <details className="group harvin-panel overflow-hidden rounded-xl border border-primary/25">
      <summary className="cursor-pointer list-none border-b border-primary/20 px-4 py-3.5 sm:px-5 sm:py-4 marker:content-none [&::-webkit-details-marker]:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-primary/50 bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-muted-foreground">
                {APP_MODULE_PREFIX} · {t("progress.modulePrefix")}
              </p>
              <CardTitle className="text-title mt-1 font-mono text-base uppercase tracking-widest">
                {t("progress.title")}
              </CardTitle>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div
              className="flex gap-1"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              {([30, 90] as DayRange[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setRange(d);
                  }}
                  className={cn(
                    "border px-3 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors",
                    range === d
                      ? "border-primary bg-primary/20 text-primary"
                      : "border-primary/30 text-muted-foreground hover:border-primary/60 hover:text-foreground"
                  )}
                >
                  {d === 30 ? t("progress.30days") : t("progress.90days")}
                </button>
              ))}
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground group-open:hidden">
              {t("common.expand")}
            </span>
            <span className="hidden font-mono text-[10px] uppercase tracking-wider text-muted-foreground group-open:inline">
              {t("common.collapse")}
            </span>
          </div>
        </div>
      </summary>

      <CardContent className="space-y-6 border-t border-primary/15 p-4 sm:p-6">
        {loading && (
          <p className="py-4 text-center font-mono text-sm text-muted-foreground">
            {t("common.loading")}
          </p>
        )}
        {error && !loading && (
          <p className="font-mono text-sm text-destructive">{error}</p>
        )}
        {!loading && !error && data.length > 0 && (
          <>
            <div>
              <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {t("progress.caloriesLabel")}
              </p>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 9, fontFamily: "monospace", fill: chartTick }}
                    interval={tickInterval}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fontFamily: "monospace", fill: chartTick }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={tooltipLabelStyle}
                    formatter={(value) => {
                      const n = typeof value === "number" ? value : 0;
                      return [`${n} kcal`, t("progress.caloriesLabel")];
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="calories"
                    stroke="#c9a227"
                    strokeWidth={1.5}
                    dot={false}
                    activeDot={{ r: 3, fill: "#c9a227" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div>
              <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {t("progress.hydrationLabel")}
              </p>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 9, fontFamily: "monospace", fill: chartTick }}
                    interval={tickInterval}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fontFamily: "monospace", fill: chartTick }}
                    axisLine={false}
                    tickLine={false}
                    unit="L"
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={tooltipLabelStyle}
                    formatter={(value) => {
                      const n = typeof value === "number" ? value : 0;
                      return [`${n} L`, t("progress.hydrationLabel")];
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="hydrationL"
                    stroke="#38bdf8"
                    strokeWidth={1.5}
                    dot={false}
                    activeDot={{ r: 3, fill: "#38bdf8" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div>
              <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {t("progress.trainingLabel")}
              </p>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 9, fontFamily: "monospace", fill: chartTick }}
                    interval={tickInterval}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fontFamily: "monospace", fill: chartTick }}
                    axisLine={false}
                    tickLine={false}
                    unit="m"
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={tooltipLabelStyle}
                    formatter={(value) => {
                      const n = typeof value === "number" ? value : 0;
                      return [`${n} min`, t("progress.trainingLabel")];
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="trainingMin"
                    stroke="#34d399"
                    strokeWidth={1.5}
                    dot={false}
                    activeDot={{ r: 3, fill: "#34d399" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
        {!loading && !error && data.length === 0 && userId && (
          <p className="py-4 text-center font-mono text-sm text-muted-foreground">
            {t("progress.noData")}
          </p>
        )}
        {!userId && (
          <p className="py-4 text-center font-mono text-sm text-muted-foreground">
            {t("progress.signInRequired")}
          </p>
        )}
      </CardContent>
    </details>
  );
}
