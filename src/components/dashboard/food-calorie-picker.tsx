"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  calculateFoodCalories,
  defaultQuantityFor,
  formatFoodLogLabel,
  formatKcalLabel,
  FOOD_DATABASE,
  getQuantityHint,
  type FoodItem,
} from "@/lib/food-database";

interface FoodCaloriePickerProps {
  onAdd: (label: string, calories: number) => void | Promise<void>;
  disabled?: boolean;
}

export function FoodCaloriePicker({ onAdd, disabled }: FoodCaloriePickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodItem[]>(
    FOOD_DATABASE.slice(0, 25)
  );
  const [selected, setSelected] = useState<FoodItem>(FOOD_DATABASE[0]);
  const [quantity, setQuantity] = useState(
    defaultQuantityFor(FOOD_DATABASE[0])
  );
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const qty = Math.max(0, Number(quantity.replace(",", ".")) || 0);
  const previewKcal = calculateFoodCalories(selected, qty);

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
      setResults(items.length > 0 ? items : []);
      if (items.length === 0 && term.length >= 2) {
        setSearchError("Nič nenájdené — skús iný názov alebo značku.");
      }
    } catch {
      setSearchError("Vyhľadávanie zlyhalo — skontroluj internet.");
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const term = query.trim();
    const timer = setTimeout(() => {
      void runSearch(term);
    }, 350);
    return () => clearTimeout(timer);
  }, [query, runSearch]);

  const pickFood = (food: FoodItem) => {
    setSelected(food);
    setQuantity(defaultQuantityFor(food));
  };

  const handleAdd = () => {
    if (previewKcal <= 0) return;
    void onAdd(formatFoodLogLabel(selected, qty), previewKcal);
    setQuantity(defaultQuantityFor(selected));
  };

  return (
    <div className="space-y-3 border border-primary/25 bg-background/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-widest text-primary">
          Kalorická tabuľka
        </p>
        <p className="text-[10px] text-muted-foreground">
          {FOOD_DATABASE.length}+ lokálne · Open Food Facts pri hľadaní
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Hľadať potravu (min. 2 znaky pre celú databázu)…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={disabled}
          className="border-primary/30 bg-background/60 pl-9 font-mono text-sm"
        />
        {searching && (
          <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {searchError && (
        <p className="text-xs text-muted-foreground">{searchError}</p>
      )}

      <div className="max-h-52 overflow-y-auto border border-primary/15">
        {results.length === 0 && !searching ? (
          <p className="px-3 py-4 text-center text-xs text-muted-foreground">
            Zadaj názov potraviny
          </p>
        ) : (
          results.map((f) => (
            <button
              key={f.id}
              type="button"
              disabled={disabled}
              onClick={() => pickFood(f)}
              className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-primary/10 ${
                f.id === selected.id ? "bg-primary/15 text-[#e8d5a3]" : ""
              }`}
            >
              <span className="min-w-0 flex-1 truncate">{f.name}</span>
              <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                {formatKcalLabel(f)}
                {f.source === "openfoodfacts" ? " · OFF" : ""}
              </span>
            </button>
          ))
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="font-mono text-[10px] uppercase tracking-wider">
            {getQuantityHint(selected)}
          </Label>
          <Input
            type="number"
            min={0}
            step={selected.unit === "ks" ? 1 : 10}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            disabled={disabled}
            className="w-28 border-primary/30 bg-background/60 font-mono"
          />
        </div>
        <div className="min-w-[120px] font-mono text-sm text-[#e8d5a3]">
          = <span className="text-primary">{previewKcal}</span> kcal
        </div>
        <Button
          type="button"
          disabled={disabled || previewKcal <= 0}
          onClick={handleAdd}
          className="font-mono text-xs uppercase tracking-wider"
        >
          Pridať do dňa
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Vybrané: <strong className="text-foreground">{selected.name}</strong>
        {qty > 0 && ` · ${formatFoodLogLabel(selected, qty)}`}
        {selected.source === "openfoodfacts" &&
          " · údaje z Open Food Facts (orientačné)"}
      </p>
    </div>
  );
}
