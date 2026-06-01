"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  HYDRATION_QUICK_AMOUNTS,
  parseManualMlInput,
} from "@/lib/hydration";

interface HydrationControlsProps {
  onAdd: (ml: number) => void | Promise<void>;
  disabled?: boolean;
  compact?: boolean;
}

export function HydrationControls({
  onAdd,
  disabled = false,
  compact = false,
}: HydrationControlsProps) {
  const [manual, setManual] = useState("");
  const [pending, setPending] = useState(false);

  const handleManualAdd = async () => {
    const ml = parseManualMlInput(manual);
    if (ml == null) return;
    setPending(true);
    await onAdd(ml);
    setManual("");
    setPending(false);
  };

  const busy = disabled || pending;

  return (
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
            onClick={() => void onAdd(ml)}
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
            placeholder="ml alebo 0.5 (=500ml)"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
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
              "Zapísať"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
