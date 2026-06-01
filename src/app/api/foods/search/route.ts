import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";
import {
  mergeFoodResults,
  searchFoods,
  type FoodItem,
} from "@/lib/food-database";
import { searchOpenFoodFacts } from "@/lib/open-food-facts";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    const local = searchFoods(q, q ? 40 : 25);
    return NextResponse.json({
      items: local,
      source: "local",
    });
  }

  const local = searchFoods(q, 15);
  let remote: FoodItem[] = [];

  try {
    remote = await searchOpenFoodFacts(q, 28);
  } catch {
    remote = [];
  }

  return NextResponse.json({
    items: mergeFoodResults(local, remote, 50),
    source: remote.length > 0 ? "mixed" : "local",
  });
}
