import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function escapeCSV(value: unknown): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function rowToCSV(row: Record<string, unknown>, columns: string[]): string {
  return columns.map((col) => escapeCSV(row[col])).join(",");
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;

    const [calorieRes, hydrationRes, trainingRes, dailyRes] = await Promise.all(
      [
        supabase
          .from("calorie_logs")
          .select("*")
          .eq("user_id", userId)
          .order("logged_at", { ascending: true }),
        supabase
          .from("hydration_logs")
          .select("*")
          .eq("user_id", userId)
          .order("logged_at", { ascending: true }),
        supabase
          .from("training_logs")
          .select("*")
          .eq("user_id", userId)
          .order("logged_at", { ascending: true }),
        supabase
          .from("daily_logs")
          .select("*")
          .eq("user_id", userId)
          .order("log_date", { ascending: true }),
      ]
    );

    const lines: string[] = [];
    lines.push(
      "type,id,user_id,log_date,logged_at,amount_ml,calories_kcal,food_name,duration_minutes,sport_type,notes,extra"
    );

    for (const row of calorieRes.data ?? []) {
      const r = row as Record<string, unknown>;
      lines.push(
        [
          "calorie",
          escapeCSV(r.id),
          escapeCSV(r.user_id),
          escapeCSV(r.log_date),
          escapeCSV(r.logged_at),
          "",
          escapeCSV(r.calories_kcal ?? r.kcal ?? r.calories),
          escapeCSV(r.food_name ?? r.name ?? r.description),
          "",
          "",
          escapeCSV(r.notes),
          "",
        ].join(",")
      );
    }

    for (const row of hydrationRes.data ?? []) {
      const r = row as Record<string, unknown>;
      lines.push(
        [
          "hydration",
          escapeCSV(r.id),
          escapeCSV(r.user_id),
          escapeCSV(r.log_date),
          escapeCSV(r.logged_at),
          escapeCSV(r.amount_ml),
          "",
          "",
          "",
          "",
          "",
          "",
        ].join(",")
      );
    }

    for (const row of trainingRes.data ?? []) {
      const r = row as Record<string, unknown>;
      lines.push(
        [
          "training",
          escapeCSV(r.id),
          escapeCSV(r.user_id),
          escapeCSV(r.log_date),
          escapeCSV(r.logged_at ?? r.created_at),
          "",
          escapeCSV(r.calories_burned),
          "",
          escapeCSV(r.duration_minutes),
          escapeCSV(r.sport_type ?? r.activity_type),
          escapeCSV(r.notes),
          "",
        ].join(",")
      );
    }

    for (const row of dailyRes.data ?? []) {
      const r = row as Record<string, unknown>;
      const extra = JSON.stringify({
        fasting_window: r.fasting_window,
        hydration_1l: r.hydration_1l,
        hydration_2l: r.hydration_2l,
        hydration_3l: r.hydration_3l,
        training_done: r.training_done,
      });
      lines.push(
        [
          "daily",
          escapeCSV(r.id),
          escapeCSV(r.user_id),
          escapeCSV(r.log_date),
          escapeCSV(r.updated_at ?? r.created_at),
          "",
          "",
          "",
          "",
          "",
          "",
          escapeCSV(extra),
        ].join(",")
      );
    }

    const csv = lines.join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="bodyforge-export.csv"',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
