"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  HYDRATION_QUICK_AMOUNTS,
  parseManualMlInput,
} from "@/lib/hydration";
import { useI18n } from "@/providers/locale-provider";

interface HydrationControlsProps {
  onAdd: (ml: number) => void | Promise<boolean>;
  disabled?: boolean;
  compact?: boolean;
  error?: string | null;
}

async function runAdd(
  onAdd: HydrationControlsProps["onAdd"],
  ml: number
): Promise<boolean> {
  const result = await onAdd(ml);
  return result !== false;
}

export function HydrationControls({
  onAdd,
  disabled = false,
  compact = false,
  error = null,
}: HydrationControlsProps) {
  const { t } = useI18n();
  const [manual, setManual] = useState("");
  const [pending, setPending] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);

  const handleQuickAdd = async (ml: number) => {
    setInputError(null);
    setPending(true);
    try {
      const ok = await runAdd(onAdd, ml);
      if (!ok) setInputError(t("hydration.addFailed"));
    } finally {
      setPending(false);
    }
  };

  const handleManualAdd = async () => {
    const ml = parseManualMlInput(manual);
    if (ml == null) {
      setInputError(t("hydration.invalidAmount"));
      return;
    }
    setInputError(null);
    setPending(true);
    try {
      const ok = await runAdd(onAdd, ml);
      if (ok) setManual("");
      else setInputError(t("hydration.addFailed"));
    } finally {
      setPending(false);
    }
  };

  const busy = disabled || pending;

  return (
    <div className="space-y-2">
      <div
        className={
          compact
            ? "flex flex-wrap gap-2"
            : "flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
        }
      >
        <div className="flex flex-wrap gap-2">
          {HYDRATION_QUICK_AMOUNTS.map((ml) => (
            <Button
              key={ml}
              type="button"
              variant="outline"
              size={compact ? "sm" : "default"}
              disabled={busy}
              onClick={() => void handleQuickAdd(ml)}
              className="border-[#38bdf8]/40 font-mono text-xs uppercase tracking-wider hover:bg-[#38bdf8]/10 hover:text-[#7dd3fc]"
            >
              +{ml >= 1000 ? `${ml / 1000}L` : `${ml}ml`}
            </Button>
          ))}
        </div>

        {!compact && (
          <div className="flex flex-1 flex-wrap gap-2 sm:min-w-[240px]">
            <Input
              type="text"
              inputMode="decimal"
              placeholder={t("hydration.inputPlaceholder")}
              value={manual}
              onChange={(e) => {
                setManual(e.target.value);
                setInputError(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && void handleManualAdd()}
              disabled={busy}
              className="max-w-[200px] border-[#38bdf8]/30 bg-background/60 font-mono text-sm"
            />
            <Button
              type="button"
              disabled={busy}
              onClick={() => void handleManualAdd()}
              className="bg-[#0e7490] font-mono text-xs uppercase tracking-wider text-white hover:bg-[#38bdf8]"
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("hydration.logButton")
              )}
            </Button>
          </div>
        )}
      </div>
      {(inputError || error) && (
        <p className="text-xs text-amber-200/90">
          {inputError ?? error}
        </p>
      )}
    </div>
  );
}
