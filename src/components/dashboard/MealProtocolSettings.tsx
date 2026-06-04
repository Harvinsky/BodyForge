"use client";

import { useEffect, useState } from "react";
import { FileText, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBodyGoal } from "@/hooks/use-body-goal";
import {
  DEFAULT_CUSTOM_MEAL_PROTOCOL,
  getBuiltInProtocol,
  MEAL_PROTOCOL_PRESETS,
  type CustomMealProtocol,
  type MealProtocolPresetId,
} from "@/lib/meal-protocol-config";
import { cn } from "@/lib/utils";
import { useI18n } from "@/providers/locale-provider";
import type { MessageKey } from "@/lib/i18n/types";

const PRESET_LABEL_KEYS: Record<MealProtocolPresetId, MessageKey> = {
  bodyforge: "protocolSettings.presetBodyforge",
  keto: "protocolSettings.presetKeto",
  vegetarian: "protocolSettings.presetVegetarian",
  girls: "protocolSettings.presetGirls",
  athlete: "protocolSettings.presetAthlete",
  custom: "protocolSettings.presetCustom",
};

function PresetChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-2 py-0.5 text-[10px] font-medium leading-tight transition-colors",
        active
          ? "border-primary bg-primary/15 text-foreground"
          : "border-primary/20 bg-transparent text-muted-foreground hover:border-primary/35 hover:text-foreground"
      )}
    >
      {label}
    </button>
  );
}

function SlotFieldsEditor({
  prefix,
  fields,
  onChange,
  showSide,
  showPurpose,
}: {
  prefix: string;
  fields: CustomMealProtocol["meal1"];
  onChange: (next: CustomMealProtocol["meal1"]) => void;
  showSide?: boolean;
  showPurpose?: boolean;
}) {
  const { t } = useI18n();
  const rows: {
    key: keyof CustomMealProtocol["meal1"];
    label: string;
    multiline?: boolean;
  }[] = [
    { key: "label", label: t("protocolSettings.fieldLabel") },
    {
      key: "composition",
      label: t("protocolSettings.fieldComposition"),
      multiline: true,
    },
    ...(showSide
      ? [
          {
            key: "side" as const,
            label: t("protocolSettings.fieldSide"),
            multiline: true,
          },
        ]
      : []),
    ...(showPurpose
      ? [
          {
            key: "purpose" as const,
            label: t("protocolSettings.fieldPurpose"),
            multiline: true,
          },
        ]
      : []),
    { key: "protocolTip", label: t("protocolSettings.fieldTip"), multiline: true },
    { key: "estimatedKcal", label: t("protocolSettings.fieldKcal") },
    {
      key: "realExamples",
      label: t("protocolSettings.fieldExamples"),
      multiline: true,
    },
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
              className="w-full rounded-md border border-primary/30 bg-background/60 px-2 py-1.5 text-xs"
            />
          ) : (
            <Input
              id={`${prefix}-${row.key}`}
              value={fields[row.key] ?? ""}
              onChange={(e) =>
                onChange({ ...fields, [row.key]: e.target.value })
              }
              className="h-8 border-primary/30 bg-background/60 text-xs"
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

  const [preset, setPreset] = useState<MealProtocolPresetId>(
    settings.mealProtocolMode
  );
  const [custom, setCustom] = useState<CustomMealProtocol>(
    settings.mealProtocolCustom ?? DEFAULT_CUSTOM_MEAL_PROTOCOL
  );

  useEffect(() => {
    setPreset(settings.mealProtocolMode);
    setCustom(settings.mealProtocolCustom ?? DEFAULT_CUSTOM_MEAL_PROTOCOL);
  }, [settings.mealProtocolMode, settings.mealProtocolCustom]);

  const selectPreset = (id: MealProtocolPresetId) => {
    setPreset(id);
    if (id === "custom") {
      if (!settings.mealProtocolCustom) {
        setCustom(DEFAULT_CUSTOM_MEAL_PROTOCOL);
      }
      return;
    }
    void updateSettings({
      mealProtocolMode: id,
      mealProtocolCustom: null,
    });
  };

  const saveCustom = () => {
    void updateSettings({
      mealProtocolMode: "custom",
      mealProtocolCustom: custom,
    });
  };

  const resetCustom = () => {
    setCustom(DEFAULT_CUSTOM_MEAL_PROTOCOL);
    void updateSettings({
      mealProtocolMode: "custom",
      mealProtocolCustom: DEFAULT_CUSTOM_MEAL_PROTOCOL,
    });
  };

  const loadPresetIntoCustom = (id: Exclude<MealProtocolPresetId, "bodyforge" | "custom">) => {
    setCustom(getBuiltInProtocol(id));
    setPreset("custom");
    void updateSettings({
      mealProtocolMode: "custom",
      mealProtocolCustom: getBuiltInProtocol(id),
    });
  };

  return (
    <details className="mt-4 rounded-lg border border-primary/20 bg-background/35">
      <summary className="cursor-pointer list-none px-3 py-2 marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-[#e8d5a3]">
          <FileText className="h-3.5 w-3.5 text-primary" />
          {t("protocolSettings.title")}
        </span>
      </summary>

      <div className="space-y-3 border-t border-primary/15 px-3 pb-3 pt-2">
        <p className="text-[11px] leading-snug text-muted-foreground">
          {t("protocolSettings.intro")}
        </p>

        <div className="flex flex-wrap gap-1">
          {MEAL_PROTOCOL_PRESETS.map((id) => (
            <PresetChip
              key={id}
              active={preset === id}
              label={t(PRESET_LABEL_KEYS[id])}
              onClick={() => selectPreset(id)}
            />
          ))}
        </div>

        {preset !== "custom" && preset !== "bodyforge" && (
          <p className="text-[10px] text-muted-foreground">
            {t("protocolSettings.presetActiveHint")}
            <button
              type="button"
              className="ml-1 underline decoration-primary/40 underline-offset-2 hover:text-foreground"
              onClick={() =>
                loadPresetIntoCustom(
                  preset as Exclude<MealProtocolPresetId, "bodyforge" | "custom">
                )
              }
            >
              {t("protocolSettings.editCopy")}
            </button>
          </p>
        )}

        {preset === "custom" && (
          <div className="space-y-3">
            <div className="rounded-md border border-dashed border-primary/20 p-2.5">
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

            <div className="rounded-md border border-dashed border-primary/20 p-2.5">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="font-mono text-[10px] uppercase tracking-wider text-primary">
                  {t("protocolSettings.snackSection")}
                </p>
                <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={custom.snack.enabled}
                    onChange={(e) =>
                      setCustom((c) => ({
                        ...c,
                        snack: { ...c.snack, enabled: e.target.checked },
                      }))
                    }
                    className="h-3 w-3 rounded border-primary/40"
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

            <div className="rounded-md border border-dashed border-primary/20 p-2.5">
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

            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={resetCustom}
                className="inline-flex items-center rounded-full border border-primary/25 px-2 py-0.5 text-[10px] text-muted-foreground hover:border-primary/40 hover:text-foreground"
              >
                <RotateCcw className="mr-1 h-3 w-3" />
                {t("protocolSettings.resetDefault")}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={saveCustom}
                className="rounded-full border border-primary bg-primary/15 px-2.5 py-0.5 text-[10px] font-medium text-foreground disabled:opacity-50"
              >
                {saving ? t("common.saving") : t("protocolSettings.save")}
              </button>
            </div>
          </div>
        )}
      </div>
    </details>
  );
}
