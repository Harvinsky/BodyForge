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
  /** Protein per 100 g/ml. For piece items use proteinPerPiece instead. */
  proteinPer100?: number | null;
  proteinPerPiece?: number | null;
  fatPer100?: number | null;
  fatPerPiece?: number | null;
  carbsPer100?: number | null;
  carbsPerPiece?: number | null;
  /** Quick portion presets shown as tap-to-fill buttons in the picker. */
  portionHints?: { label: string; qty: number }[];
}
