import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { format, subDays } from "date-fns";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const daysParam = parseInt(searchParams.get("days") ?? "30", 10);
    const days = [30, 90].includes(daysParam) ? daysParam : 30;

    const userId = user.id;
    const endDate = format(new Date(), "yyyy-MM-dd");
    const startDate = format(subDays(new Date(), days - 1), "yyyy-MM-dd");

    const [calorieRes, hydrationRes, trainingRes] = await Promise.all([
      supabase
        .from("calorie_logs")
        .select("log_date, calories_kcal, kcal, calories")
        .eq("user_id", userId)
        .gte("log_date", startDate)
        .lte("log_date", endDate),
      supabase
        .from("hydration_logs")
        .select("log_date, amount_ml")
        .eq("user_id", userId)
        .gte("log_date", startDate)
        .lte("log_date", endDate),
      supabase
        .from("training_logs")
        .select("log_date, duration_minutes")
        .eq("user_id", userId)
        .gte("log_date", startDate)
        .lte("log_date", endDate),
    ]);

    // Build date range
    const dateArray: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      dateArray.push(format(subDays(new Date(), i), "yyyy-MM-dd"));
    }

    // Aggregate by date
    const calorieByDate = new Map<string, number>();
    for (const row of calorieRes.data ?? []) {
      const r = row as Record<string, unknown>;
      const date = r.log_date as string;
      const kcal = Number(r.calories_kcal ?? r.kcal ?? r.calories ?? 0);
      calorieByDate.set(date, (calorieByDate.get(date) ?? 0) + kcal);
    }

    const hydrationByDate = new Map<string, number>();
    for (const row of hydrationRes.data ?? []) {
      const r = row as Record<string, unknown>;
      const date = r.log_date as string;
      const ml = Number(r.amount_ml ?? 0);
      hydrationByDate.set(date, (hydrationByDate.get(date) ?? 0) + ml);
    }

    const trainingByDate = new Map<string, number>();
    for (const row of trainingRes.data ?? []) {
      const r = row as Record<string, unknown>;
      const date = r.log_date as string;
      const minutes = Number(r.duration_minutes ?? 0);
      trainingByDate.set(date, (trainingByDate.get(date) ?? 0) + minutes);
    }

    const result = {
      dates: dateArray,
      calories: dateArray.map((d) => calorieByDate.get(d) ?? 0),
      hydration_ml: dateArray.map((d) => hydrationByDate.get(d) ?? 0),
      training_minutes: dateArray.map((d) => trainingByDate.get(d) ?? 0),
    };

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
