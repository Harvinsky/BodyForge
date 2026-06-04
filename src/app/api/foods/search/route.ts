import { NextResponse, type NextRequest } from "next/server";
import { requireApiUser } from "@/lib/security/api-auth";
import {
  mergeFoodResults,
  searchFoods,
  type FoodItem,
} from "@/lib/food-database";
import { searchOpenFoodFacts } from "@/lib/open-food-facts";

export const dynamic = "force-dynamic";

const MAX_QUERY_LENGTH = 100;

export async function GET(request: NextRequest) {
  // Require authenticated user — prevents unauthenticated abuse of this proxy
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;

  const raw = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  // Cap query length to prevent excessively large requests
  const q = raw.slice(0, MAX_QUERY_LENGTH);

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
