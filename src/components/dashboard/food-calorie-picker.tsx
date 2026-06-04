"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Search, Trash2, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CalorieEntryInput } from "@/hooks/use-calories";
import {
  calculateFoodCalories,
  calculateFoodMacros,
  defaultQuantityFor,
  formatFoodLogLabel,
  formatKcalLabel,
  FOOD_DATABASE,
  getQuantityHint,
  type FoodItem,
  type FoodMacros,
} from "@/lib/food-database";
import {
  inferMealKeyFromBlocks,
} from "@/lib/meal-calorie-link";
import { mealKeyLabel } from "@/lib/i18n/calories-ui";
import type { MealBlock } from "@/lib/meal-plan-protocol";
import type { MealTaskKey } from "@/lib/meals";
import { useI18n } from "@/providers/locale-provider";
import { cn } from "@/lib/utils";

interface BasketItem {
  id: string;
  label: string;
  calories: number;
  macros: FoodMacros;
}

interface FoodCaloriePickerProps {
  mealBlocks: MealBlock[];
  disabled?: boolean;
  onAddEntry: (
    label: string,
    calories: number,
    mealKey: MealTaskKey,
    macros?: FoodMacros
  ) => void | Promise<void>;
  onAddMeal: (
    items: CalorieEntryInput[],
    mealKey: MealTaskKey
  ) => Promise<boolean>;
}

export function FoodCaloriePicker({
  mealBlocks,
  disabled,
  onAddEntry,
  onAddMeal,
}: FoodCaloriePickerProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodItem[]>([]);
  const [selected, setSelected] = useState<FoodItem>(FOOD_DATABASE[0]);
  const [quantity, setQuantity] = useState(
    defaultQuantityFor(FOOD_DATABASE[0])
  );
  const [mealKey, setMealKey] = useState<MealTaskKey>(() =>
    inferMealKeyFromBlocks(mealBlocks)
  );
  const [basket, setBasket] = useState<BasketItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);


  const qty = Math.max(0, Number(quantity.replace(",", ".")) || 0);
  const previewKcal = calculateFoodCalories(selected, qty);
  const previewMacros = calculateFoodMacros(selected, qty);
  const basketTotal = basket.reduce((s, i) => s + i.calories, 0);

  const mealOptions = useMemo(
    () =>
      mealBlocks.map((b) => ({
        key: b.taskKey,
        time: b.time,
        label: mealKeyLabel(b.taskKey, t),
      })),
    [mealBlocks, t]
  );

  useEffect(() => {
    setMealKey(inferMealKeyFromBlocks(mealBlocks));
  }, [mealBlocks]);

  const runSearch = useCallback(async (term: string) => {
    setSearching(true);
    setSearchError(null);
    try {
      const params = new URLSearchParams({ q: term });
      const res = await fetch(`/api/foods/search?${params}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as { items?: FoodItem[] };
      const items = data.items ?? [];
      setResults(
        items.length > 0 ? items.slice(0, 20) : FOOD_DATABASE.slice(0, 16)
      );
      if (items.length === 0 && term.length >= 2) {
        setSearchError(t("calories.searchEmpty"));
      }
    } catch {
      setSearchError(t("calories.searchFailed"));
    } finally {
      setSearching(false);
    }
  }, [t]);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      setSearchError(null);
      return;
    }
    // Show local results immediately for instant feedback
    const localHits = FOOD_DATABASE.filter(
      (f) =>
        f.name.toLowerCase().includes(term.toLowerCase()) ||
        f.keywords.some((k) => k.includes(term.toLowerCase()))
    ).slice(0, 16);
    if (localHits.length > 0) setResults(localHits);

    // Then fetch remote with short debounce
    const timer = setTimeout(() => {
      void runSearch(term);
    }, 150);
    return () => clearTimeout(timer);
  }, [query, runSearch]);

  const pickFood = (food: FoodItem) => {
    setSelected(food);
    setQuantity(defaultQuantityFor(food));

  };

  const addToBasket = () => {
    if (previewKcal <= 0) return;
    const label = formatFoodLogLabel(selected, qty);
    setBasket((prev) => [
      ...prev,
      { id: crypto.randomUUID(), label, calories: previewKcal, macros: previewMacros },
    ]);
    setQuantity(defaultQuantityFor(selected));
  };

  const removeFromBasket = (id: string) => {
    setBasket((prev) => prev.filter((i) => i.id !== id));
  };

  const saveBasket = async () => {
    if (basket.length === 0) return;
    const ok = await onAddMeal(
      basket.map((i) => ({
        label: i.label,
        calories: i.calories,
        protein_g: i.macros.protein ?? undefined,
        fat_g: i.macros.fat ?? undefined,
        carbs_g: i.macros.carbs ?? undefined,
      })),
      mealKey
    );
    if (ok) setBasket([]);
  };

  return (
    <div className="space-y-3 rounded-md border border-primary/25 bg-background/30 p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-widest text-primary">
          {t("calories.addFood")}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {t("calories.addFoodHint")}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {mealOptions.map((opt) => (
          <button
            key={opt.key}
            type="button"
            disabled={disabled}
            onClick={() => setMealKey(opt.key)}
            className={cn(
              "rounded border px-2 py-1 font-mono text-[10px] uppercase tracking-wide transition-colors",
              mealKey === opt.key
                ? "border-primary/60 bg-primary/20 text-[#e8d5a3]"
                : "border-primary/20 bg-background/50 text-muted-foreground hover:border-primary/40"
            )}
          >
            {opt.label}
            <span className="ml-1 opacity-70">{opt.time}</span>
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder={t("calories.searchPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={disabled}
          className="h-9 border-primary/30 bg-background/60 pl-8 font-mono text-sm"
        />
        {searching && (
          <Loader2 className="absolute right-2 top-2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
        )}
      </div>

      {searchError && (
        <p className="text-[11px] text-muted-foreground">{searchError}</p>
      )}

      {results.length === 0 ? (
        <div className="flex items-center justify-center rounded border border-dashed border-primary/20 py-5 text-center">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {query.trim().length > 0
              ? t("calories.searchEmpty")
              : t("calories.searchPrompt")}
          </p>
        </div>
      ) : (
        <div className="grid max-h-36 grid-cols-1 gap-px overflow-y-auto border border-primary/15 sm:grid-cols-2">
          {results.map((f) => (
            <button
              key={f.id}
              type="button"
              disabled={disabled}
              onClick={() => pickFood(f)}
              className={cn(
                "flex items-center justify-between gap-1 px-2 py-1.5 text-left text-xs transition-colors hover:bg-primary/10",
                f.id === selected.id && "bg-primary/15 text-[#e8d5a3]"
              )}
            >
              <span className="min-w-0 truncate">{f.name}</span>
              <span className="shrink-0 font-mono text-[9px] text-muted-foreground">
                {formatKcalLabel(f)}
              </span>
            </button>
          ))}
        </div>
      )}

      {results.length > 0 && selected.portionHints && selected.portionHints.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.portionHints.map((h) => (
            <button
              key={h.label}
              type="button"
              disabled={disabled}
              onClick={() => setQuantity(String(h.qty))}
              className={cn(
                "rounded border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide transition-colors",
                quantity === String(h.qty)
                  ? "border-primary/60 bg-primary/20 text-[#e8d5a3]"
                  : "border-primary/20 bg-background/40 text-muted-foreground hover:border-primary/40 hover:text-foreground"
              )}
            >
              {h.label}
            </button>
          ))}
        </div>
      )}

      {results.length > 0 && (
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-0.5">
            <Label className="font-mono text-[9px] uppercase tracking-wider">
              {getQuantityHint(selected)}
            </Label>
            <Input
              type="number"
              min={0}
              step={selected.unit === "ks" ? 1 : 10}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addToBasket()}
              disabled={disabled}
              className="h-8 w-24 border-primary/30 bg-background/60 font-mono text-sm"
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="font-mono text-xs text-[#e8d5a3]">
              = <span className="text-primary">{previewKcal}</span> kcal
            </p>
            {(previewMacros.protein != null || previewMacros.fat != null || previewMacros.carbs != null) && (
              <p className="font-mono text-[9px] text-muted-foreground">
                {[
                  previewMacros.protein != null && `P ${previewMacros.protein}g`,
                  previewMacros.fat != null && `F ${previewMacros.fat}g`,
                  previewMacros.carbs != null && `C ${previewMacros.carbs}g`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
          </div>
          <Button
            type="button"
            size="sm"
            disabled={disabled || previewKcal <= 0}
            onClick={addToBasket}
            className="h-8 font-mono text-[10px] uppercase"
          >
            <Plus className="mr-1 h-3 w-3" />
            {t("calories.addToBasket")}
          </Button>
        </div>
      )}

      {basket.length > 0 && (
        <div className="space-y-2 border border-primary/20 bg-background/40 p-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-[#e8d5a3]">
              <UtensilsCrossed className="h-3 w-3" />
              {mealKeyLabel(mealKey, t)} · {t("calories.basket")}
            </p>
            <span className="font-mono text-xs text-primary">
              {basketTotal} kcal
            </span>
          </div>
          <ul className="space-y-1">
            {basket.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <span className="min-w-0 flex-1 truncate text-foreground/90">
                  {item.label}
                </span>
                <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                  {item.calories} kcal
                  {item.macros.protein != null && (
                    <span className="ml-1 text-emerald-400/80">· P{item.macros.protein}g</span>
                  )}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={disabled}
                  onClick={() => removeFromBasket(item.id)}
                  className="h-6 w-6 shrink-0 text-muted-foreground"
                  aria-label={t("calories.removeFromBasket")}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </li>
            ))}
          </ul>
          <Button
            type="button"
            disabled={disabled}
            onClick={() => void saveBasket()}
            className="w-full font-mono text-[10px] uppercase tracking-wider"
          >
            {t("calories.saveMeal", {
              meal: mealKeyLabel(mealKey, t).toLowerCase(),
              kcal: basketTotal,
            })}
          </Button>
        </div>
      )}

      {results.length > 0 && (
        <p className="text-[11px] leading-snug text-muted-foreground">
          {t("calories.foodTip")}
        </p>
      )}
    </div>
  );
}
