import { CORE_FOODS } from "@/lib/foods-core";
export type { FoodItem, FoodSource, FoodUnit } from "@/lib/food-types";
import type { FoodItem } from "@/lib/food-types";

/** Lokálna databáza (~80+ položiek) + doplnenie z API pri vyhľadávaní. */
export const FOOD_DATABASE: FoodItem[] = CORE_FOODS.map((f) => ({
  ...f,
  source: "local" as const,
}));

const byId = new Map(FOOD_DATABASE.map((f) => [f.id, f]));

export function searchFoods(query: string, limit = 40): FoodItem[] {
  const q = query.trim().toLowerCase();
  const pool = q
    ? FOOD_DATABASE.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.keywords.some((k) => k.includes(q)) ||
          f.category.toLowerCase().includes(q)
      )
    : FOOD_DATABASE;

  return pool.slice(0, limit);
}

export function getFoodById(id: string): FoodItem | undefined {
  return byId.get(id);
}

export function mergeFoodResults(
  local: FoodItem[],
  remote: FoodItem[],
  limit = 50
): FoodItem[] {
  const seen = new Set<string>();
  const out: FoodItem[] = [];

  for (const item of [...local, ...remote]) {
    const key = item.name.toLowerCase().slice(0, 80);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= limit) break;
  }

  return out;
}

export function calculateFoodCalories(
  food: FoodItem,
  quantity: number
): number {
  if (quantity <= 0) return 0;

  if (food.unit === "ks" && food.kcalPerPiece != null) {
    return Math.round(food.kcalPerPiece * quantity);
  }

  if ((food.unit === "g" || food.unit === "ml") && food.kcalPer100 != null) {
    return Math.round((food.kcalPer100 * quantity) / 100);
  }

  return 0;
}

export interface FoodMacros {
  protein: number | null;
  fat: number | null;
  carbs: number | null;
}

export function calculateFoodMacros(food: FoodItem, quantity: number): FoodMacros {
  if (quantity <= 0) return { protein: null, fat: null, carbs: null };

  const round1 = (v: number) => Math.round(v * 10) / 10;

  if (food.unit === "ks") {
    const p = food.proteinPerPiece != null ? round1(food.proteinPerPiece * quantity) : null;
    const f = food.fatPerPiece != null ? round1(food.fatPerPiece * quantity) : null;
    const c = food.carbsPerPiece != null ? round1(food.carbsPerPiece * quantity) : null;
    return { protein: p, fat: f, carbs: c };
  }

  const p = food.proteinPer100 != null ? round1((food.proteinPer100 * quantity) / 100) : null;
  const f = food.fatPer100 != null ? round1((food.fatPer100 * quantity) / 100) : null;
  const c = food.carbsPer100 != null ? round1((food.carbsPer100 * quantity) / 100) : null;
  return { protein: p, fat: f, carbs: c };
}

export function formatFoodLogLabel(food: FoodItem, quantity: number): string {
  if (food.unit === "ks") {
    return `${quantity}× ${food.name}`;
  }
  return `${food.name} ${quantity} ${food.unit}`;
}

export function formatKcalLabel(food: FoodItem): string {
  if (food.kcalPerPiece != null) {
    return `${food.kcalPerPiece} kcal/ks`;
  }
  if (food.kcalPer100 != null) {
    return `${food.kcalPer100} kcal/100${food.unit}`;
  }
  return "—";
}

export function getQuantityHint(food: FoodItem): string {
  switch (food.unit) {
    case "ks":
      return "Počet kusov";
    case "g":
      return "Gramy";
    case "ml":
      return "Mililitre";
  }
}

export function defaultQuantityFor(food: FoodItem): string {
  return food.unit === "ks" ? "1" : "100";
}
