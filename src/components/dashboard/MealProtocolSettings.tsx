"use client";

import { useEffect, useState } from "react";
import { FileText, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBodyGoal } from "@/hooks/use-body-goal";
import {
  DEFAULT_CUSTOM_MEAL_PROTOCOL,
  type CustomMealProtocol,
  type CustomMealSlotFields,
  type MealProtocolMode,
} from "@/lib/meal-protocol-config";
import { useI18n } from "@/providers/locale-provider";

function SlotFieldsEditor({
  prefix,
  fields,
  onChange,
  showSide,
  showPurpose,
}: {
  prefix: string;
  fields: CustomMealSlotFields;
  onChange: (next: CustomMealSlotFields) => void;
  showSide?: boolean;
  showPurpose?: boolean;
}) {
  const { t } = useI18n();
  const rows: { key: keyof CustomMealSlotFields; label: string; multiline?: boolean }[] = [
    { key: "label", label: t("protocolSettings.fieldLabel") },
    { key: "composition", label: t("protocolSettings.fieldComposition"), multiline: true },
    ...(showSide
      ? [{ key: "side" as const, label: t("protocolSettings.fieldSide"), multiline: true }]
      : []),
    ...(showPurpose
      ? [{ key: "purpose" as const, label: t("protocolSettings.fieldPurpose"), multiline: true }]
      : []),
    { key: "protocolTip", label: t("protocolSettings.fieldTip"), multiline: true },
    { key: "estimatedKcal", label: t("protocolSettings.fieldKcal") },
    { key: "realExamples", label: t("protocolSettings.fieldExamples"), multiline: true },
    { key: "logHint", label: t("protocolSettings.fieldLogHint"), multiline: true },
  ];

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={`${prefix}-${row.key}`} className="space-y-1">
          <Label
            htmlFor={`${prefix}-${row.key}`}
            className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
          >
            {row.label}
          </Label>
          {row.multiline ? (
            <textarea
              id={`${prefix}-${row.key}`}
              value={fields[row.key] ?? ""}
              onChange={(e) =>
                onChange({ ...fields, [row.key]: e.target.value })
              }
              rows={2}
              className="w-full rounded-md border border-primary/30 bg-background/60 px-3 py-2 text-sm"
            />
          ) : (
            <Input
              id={`${prefix}-${row.key}`}
              value={fields[row.key] ?? ""}
              onChange={(e) =>
                onChange({ ...fields, [row.key]: e.target.value })
              }
              className="border-primary/30 bg-background/60 text-sm"
            />
          )}
        </div>
      ))}
    </div>
  );
}

export function MealProtocolSettings() {
  const { settings, saving, updateSettings } = useBodyGoal();
  const { t } = useI18n();

  const [mode, setMode] = useState<MealProtocolMode>(settings.mealProtocolMode);
  const [custom, setCustom] = useState<CustomMealProtocol>(
    settings.mealProtocolCustom ?? DEFAULT_CUSTOM_MEAL_PROTOCOL
  );

  useEffect(() => {
    setMode(settings.mealProtocolMode);
    setCustom(settings.mealProtocolCustom ?? DEFAULT_CUSTOM_MEAL_PROTOCOL);
  }, [settings.mealProtocolMode, settings.mealProtocolCustom]);

  const save = () => {
    void updateSettings({
      mealProtocolMode: mode,
      mealProtocolCustom: mode === "custom" ? custom : null,
    });
  };

  const resetCustom = () => {
    setCustom(DEFAULT_CUSTOM_MEAL_PROTOCOL);
    if (mode === "custom") {
      void updateSettings({
        mealProtocolMode: "custom",
        mealProtocolCustom: DEFAULT_CUSTOM_MEAL_PROTOCOL,
      });
    }
  };

  return (
    <details className="mt-4 rounded-lg border border-primary/20 bg-background/35">
      <summary className="cursor-pointer list-none px-3 py-3 marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-[#e8d5a3]">
          <FileText className="h-4 w-4 text-primary" />
          {t("protocolSettings.title")}
        </span>
      </summary>

      <div className="space-y-4 border-t border-primary/15 px-3 pb-4 pt-3">
        <p className="text-xs text-muted-foreground">
          {t("protocolSettings.intro")}
        </p>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={mode === "bodyforge" ? "default" : "outline"}
            className="text-xs"
            onClick={() => setMode("bodyforge")}
          >
            {t("protocolSettings.modeBodyforge")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "custom" ? "default" : "outline"}
            className="text-xs"
            onClick={() => {
              setMode("custom");
              if (!settings.mealProtocolCustom) {
                setCustom(DEFAULT_CUSTOM_MEAL_PROTOCOL);
              }
            }}
          >
            {t("protocolSettings.modeCustom")}
          </Button>
        </div>

        {mode === "custom" && (
          <div className="space-y-5">
            <div className="rounded-md border border-dashed border-primary/25 p-3">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-primary">
                {t("protocolSettings.meal1Section")}
              </p>
              <SlotFieldsEditor
                prefix="meal1"
                fields={custom.meal1}
                onChange={(meal1) => setCustom((c) => ({ ...c, meal1 }))}
                showSide
              />
            </div>

            <div className="rounded-md border border-dashed border-primary/25 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="font-mono text-[10px] uppercase tracking-wider text-primary">
                  {t("protocolSettings.snackSection")}
                </p>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={custom.snack.enabled}
                    onChange={(e) =>
                      setCustom((c) => ({
                        ...c,
                        snack: { ...c.snack, enabled: e.target.checked },
                      }))
                    }
                    className="rounded border-primary/40"
                  />
                  {t("protocolSettings.snackEnabled")}
                </label>
              </div>
              {custom.snack.enabled && (
                <SlotFieldsEditor
                  prefix="snack"
                  fields={custom.snack}
                  onChange={(snack) =>
                    setCustom((c) => ({
                      ...c,
                      snack: { ...c.snack, ...snack, enabled: c.snack.enabled },
                    }))
                  }
                  showPurpose
                />
              )}
            </div>

            <div className="rounded-md border border-dashed border-primary/25 p-3">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-primary">
                {t("protocolSettings.meal2Section")}
              </p>
              <SlotFieldsEditor
                prefix="meal2"
                fields={custom.meal2}
                onChange={(meal2) => setCustom((c) => ({ ...c, meal2 }))}
                showSide
              />
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={resetCustom}
            >
              <RotateCcw className="mr-1 h-3.5 w-3.5" />
              {t("protocolSettings.resetDefault")}
            </Button>
          </div>
        )}

        <Button
          type="button"
          size="sm"
          disabled={saving}
          onClick={save}
          className="font-mono text-xs uppercase tracking-wider"
        >
          {saving ? t("common.saving") : t("protocolSettings.save")}
        </Button>
      </div>
    </details>
  );
}
