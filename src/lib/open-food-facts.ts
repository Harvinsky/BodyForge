import type { FoodItem } from "@/lib/food-types";

const OFF_SEARCH =
  "https://world.openfoodfacts.org/cgi/search.pl";
const USER_AGENT = "BodyForge/1.0 (personal fitness dashboard)";

interface OffProduct {
  code?: string;
  product_name?: string;
  brands?: string;
  nutriments?: Record<string, number | undefined>;
}

interface OffSearchResponse {
  products?: OffProduct[];
}

function kcalFromNutriments(n: Record<string, number | undefined>): number | null {
  const kcal =
    n["energy-kcal_100g"] ??
    n["energy-kcal"] ??
    n["energy-kcal_value"] ??
    (n["energy_100g"] != null && n["energy_100g"] > 50
      ? n["energy_100g"] / 4.184
      : undefined);

  if (kcal == null || !Number.isFinite(kcal) || kcal <= 0 || kcal > 900) {
    return null;
  }
  return Math.round(kcal);
}

function normalizeName(name: string, brand?: string): string {
  const base = name.trim();
  if (!brand?.trim()) return base;
  const b = brand.trim();
  if (base.toLowerCase().includes(b.toLowerCase())) return base;
  return `${base} (${b})`;
}

export async function searchOpenFoodFacts(
  query: string,
  pageSize = 24
): Promise<FoodItem[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const params = new URLSearchParams({
    search_terms: q,
    search_simple: "1",
    action: "process",
    json: "1",
    page_size: String(pageSize),
    fields: "code,product_name,brands,nutriments",
  });

  const response = await fetch(`${OFF_SEARCH}?${params}`, {
    headers: { "User-Agent": USER_AGENT },
    next: { revalidate: 3600 },
  });

  if (!response.ok) return [];

  const data = (await response.json()) as OffSearchResponse;
  const items: FoodItem[] = [];

  for (const product of data.products ?? []) {
    if (!product.code || !product.product_name?.trim()) continue;

    const kcalPer100 = kcalFromNutriments(product.nutriments ?? {});
    if (kcalPer100 == null) continue;

    const name = normalizeName(product.product_name, product.brands);

    items.push({
      id: `off-${product.code}`,
      name,
      kcalPer100,
      kcalPerPiece: null,
      unit: "g",
      category: "Open Food Facts",
      keywords: [q.toLowerCase(), product.brands ?? ""].filter(Boolean),
      source: "openfoodfacts",
      brand: product.brands,
    });
  }

  return items;
}
