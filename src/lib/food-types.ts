export type FoodUnit = "ks" | "g" | "ml";
export type FoodSource = "local" | "openfoodfacts";

export interface FoodItem {
  id: string;
  name: string;
  kcalPer100: number | null;
  kcalPerPiece: number | null;
  unit: FoodUnit;
  category: string;
  keywords: string[];
  source?: FoodSource;
  brand?: string;
}
