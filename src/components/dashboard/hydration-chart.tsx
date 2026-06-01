"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  HYDRATION_ACCENT,
  mlToLiters,
  type HourlyChartPoint,
} from "@/lib/hydration";

interface HydrationChartProps {
  chartData: HourlyChartPoint[];
  loading?: boolean;
  height?: number;
  emptyMessage?: string;
}

export function HydrationChart({
  chartData,
  loading = false,
  height = 224,
  emptyMessage = "Žiadne záznamy — pridaj prvú dávku vody",
}: HydrationChartProps) {
  const barData = chartData.filter((d) => d.ml > 0);

  if (loading) {
    return (
      <p className="font-mono text-sm text-muted-foreground">
        Načítavam palivomer…
      </p>
    );
  }

  if (barData.length === 0) {
    return (
      <p className="border border-dashed border-[#38bdf8]/20 py-8 text-center font-mono text-xs text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={barData}
          margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#2a2a2a"
            vertical={false}
          />
          <XAxis
            dataKey="hour"
            tick={{ fill: "#888", fontSize: 10, fontFamily: "monospace" }}
            axisLine={{ stroke: "#404040" }}
            tickLine={false}
          />
          <YAxis
            yAxisId="ml"
            tick={{ fill: "#888", fontSize: 10, fontFamily: "monospace" }}
            axisLine={{ stroke: "#404040" }}
            tickLine={false}
            tickFormatter={(v) => `${v}ml`}
          />
          <YAxis
            yAxisId="cum"
            orientation="right"
            tick={{ fill: "#38bdf8", fontSize: 10, fontFamily: "monospace" }}
            axisLine={{ stroke: "#0e7490" }}
            tickLine={false}
            tickFormatter={(v) => `${(Number(v) / 1000).toFixed(1)}L`}
          />
          <Tooltip
            contentStyle={{
              background: "#121212",
              border: "1px solid #38bdf855",
              borderRadius: 0,
              fontFamily: "monospace",
              fontSize: 11,
            }}
            formatter={(value, name) => {
              const n = typeof value === "number" ? value : 0;
              if (name === "cumulative")
                return [`${mlToLiters(n)} L`, "Kumulatívne"];
              return [`${n} ml`, "Dávka"];
            }}
          />
          <Bar
            yAxisId="ml"
            dataKey="ml"
            fill="#0e7490"
            stroke={HYDRATION_ACCENT}
            strokeWidth={1}
            maxBarSize={32}
            radius={0}
          />
          <Line
            yAxisId="cum"
            type="monotone"
            dataKey="cumulative"
            stroke={HYDRATION_ACCENT}
            strokeWidth={2}
            dot={{ fill: HYDRATION_ACCENT, r: 3 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
