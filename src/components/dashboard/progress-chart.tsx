"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useDailyTracker } from "@/hooks/use-daily-tracker";

export function ProgressChart() {
  const { progressHistory, loading } = useDailyTracker();

  const average =
    progressHistory.length > 0
      ? Math.round(
          progressHistory.reduce((sum, d) => sum + d.completion, 0) /
            progressHistory.length
        )
      : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Konzistencia</CardTitle>
            <CardDescription className="mt-1">
              Posledných 7 dní — % splnených úloh
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="font-mono text-2xl font-bold tabular-nums">
              {average}%
            </p>
            <p className="font-mono text-xs text-muted-foreground">priemer</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="font-mono text-sm text-muted-foreground">
            Načítavam graf...
          </p>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={progressHistory} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#404040"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#888", fontSize: 12, fontFamily: "monospace" }}
                  axisLine={{ stroke: "#404040" }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: "#888", fontSize: 12, fontFamily: "monospace" }}
                  axisLine={{ stroke: "#404040" }}
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    background: "#1a1a1a",
                    border: "1px solid #404040",
                    borderRadius: 0,
                    fontFamily: "monospace",
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "#e8e8e8" }}
                  formatter={(value, _name, props) => {
                    const num = typeof value === "number" ? value : 0;
                    const payload = props?.payload as { completed?: number; total?: number };
                    return [
                      `${num}% (${payload?.completed ?? 0}/${payload?.total ?? 0})`,
                      "Splnenie",
                    ];
                  }}
                />
                <Bar
                  dataKey="completion"
                  fill="#a0a0a0"
                  radius={0}
                  maxBarSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
