"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Download,
  History,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useDayHistory } from "@/hooks/use-day-history";
import { useDailyTracker } from "@/hooks/use-daily-tracker";
import {
  CURRENT_PROGRAM_ID,
  CUSTOM_RANGE_ID,
  type ProgramPeriod,
} from "@/lib/program-periods";
import { isHabitDone } from "@/lib/habits";
import { cn } from "@/lib/utils";
import type { DayHistoryRecord } from "@/lib/day-history";
import { exportDayHistoryCsv } from "@/lib/export-day-history-csv";
import { bcp47Tag } from "@/lib/i18n/detect";
import { useI18n } from "@/providers/locale-provider";

function HabitDot({
  ok,
  label,
  doneLabel,
  notDoneLabel,
}: {
  ok: boolean;
  label: string;
  doneLabel: string;
  notDoneLabel: string;
}) {
  return (
    <span
      title={label}
      className={cn(
        "inline-block h-2 w-2 rounded-full",
        ok ? "bg-emerald-500" : "bg-muted-foreground/30"
      )}
      aria-label={`${label}: ${ok ? doneLabel : notDoneLabel}`}
    />
  );
}

function DayHistoryRow({
  day,
  expanded,
  onToggle,
  onDelete,
  onLogForDate,
  deleting,
}: {
  day: DayHistoryRecord;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onLogForDate: (date: string) => void;
  deleting: boolean;
}) {
  const { t } = useI18n();
  const kcalTone =
    day.tasks.is_fasting_day && day.totalCalories > 0
      ? "text-amber-400"
      : day.calorieStatus.overTarget
        ? "text-rose-400"
        : day.totalCalories > 0
          ? "text-foreground"
          : "text-muted-foreground";

  return (
    <>
      <tr
        className={cn(
          "border-t border-primary/15 transition-colors hover:bg-primary/5",
          day.isToday && "bg-primary/5",
          !day.hasAnyData && "opacity-60"
        )}
      >
        <td className="py-2.5 pl-2 pr-1">
          <button
            type="button"
            onClick={onToggle}
            className="flex items-center gap-1 text-left font-mono text-[11px] sm:text-xs"
            aria-expanded={expanded}
          >
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            )}
            <span className={day.isToday ? "text-primary" : "text-foreground"}>
              {day.isToday ? `${t("common.today")} · ` : ""}
              {day.dateLabel}
            </span>
          </button>
        </td>
        <td className="px-1 py-2.5 text-center font-mono text-[11px] tabular-nums">
          {day.hasAnyData ? `${day.completion}%` : "—"}
        </td>
        <td className="hidden px-1 py-2.5 sm:table-cell">
          <div className="flex justify-center gap-1.5">
            <HabitDot
              ok={isHabitDone(day.tasks, "fasting")}
              label="16:8"
              doneLabel={t("history.habitDone")}
              notDoneLabel={t("history.habitNotDone")}
            />
            <HabitDot
              ok={isHabitDone(day.tasks, "water")}
              label={t("history.waterShort")}
              doneLabel={t("history.habitDone")}
              notDoneLabel={t("history.habitNotDone")}
            />
            <HabitDot
              ok={isHabitDone(day.tasks, "training")}
              label={t("history.trainingShort")}
              doneLabel={t("history.habitDone")}
              notDoneLabel={t("history.habitNotDone")}
            />
          </div>
        </td>
        <td className={cn("px-1 py-2.5 font-mono text-[11px]", kcalTone)}>
          {day.totalCalories > 0
            ? `${day.totalCalories} kcal`
            : day.tasks.is_fasting_day
              ? t("history.fastingShort")
              : "—"}
        </td>
        <td className="px-1 py-2.5 font-mono text-[11px] text-[#7dd3fc]">
          {day.waterLabel}
        </td>
        <td className="hidden max-w-[140px] truncate px-1 py-2.5 font-mono text-[10px] text-muted-foreground md:table-cell lg:max-w-[200px]">
          {day.trainingSummary}
        </td>
        <td className="hidden max-w-[180px] truncate px-1 py-2.5 font-mono text-[10px] text-muted-foreground lg:table-cell xl:max-w-[260px]">
          {day.mealsSummary}
        </td>
        <td className="py-2.5 pr-2 pl-1 text-right">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={deleting}
            onClick={onDelete}
            className="h-7 w-7 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
            aria-label={t("history.deleteDayAria", { date: day.dateLabel })}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </td>
      </tr>
      {expanded && (
        <tr className="border-t border-primary/10 bg-background/40">
          <td colSpan={8} className="px-3 py-3 sm:px-4">
            <DayHistoryDetail day={day} onLogForDate={onLogForDate} />
          </td>
        </tr>
      )}
    </>
  );
}

function DayHistoryDetail({ day, onLogForDate }: { day: DayHistoryRecord; onLogForDate: (date: string) => void }) {
  const { t, locale } = useI18n();
  const numberLocale = bcp47Tag(locale);
  const today = format(new Date(), "yyyy-MM-dd");
  const isToday = day.date === today;

  const LogForDateButton = !isToday && (
    <button
      type="button"
      onClick={() => onLogForDate(day.date)}
      className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-primary hover:text-primary/80 underline decoration-dotted"
    >
      {t("history.logForDate")}
    </button>
  );

  if (!day.hasAnyData) {
    return (
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-xs text-muted-foreground">
          {t("history.noRecords")}
        </p>
        {LogForDateButton}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {LogForDateButton}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <section>
        <p className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {t("history.detailFood", { kcal: day.totalCalories })}
        </p>
        {day.mealGroups.length === 0 ? (
          <p className="font-mono text-xs text-muted-foreground">—</p>
        ) : (
          <ul className="space-y-1.5">
            {day.mealGroups.map((g) => (
              <li key={g.label} className="font-mono text-[11px]">
                <span className="text-[#e8d5a3]">{g.label}</span>
                <span className="text-muted-foreground"> · {g.total} kcal</span>
                <ul className="mt-0.5 pl-2 text-muted-foreground">
                  {g.items.map((item) => (
                    <li key={item.id}>
                      {item.label} ({item.calories})
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <p className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {t("history.detailWater", { label: day.waterLabel })}
        </p>
        {day.hydrationEntries.length === 0 ? (
          <p className="font-mono text-xs text-muted-foreground">—</p>
        ) : (
          <ul className="font-mono text-[11px] text-muted-foreground">
            {day.hydrationEntries.map((h, i) => (
              <li key={`${h.logged_at}-${i}`}>
                +{h.amount_ml} ml ·{" "}
                {format(new Date(h.logged_at), "HH:mm")}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <p className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {t("history.detailTraining", { kcal: day.burnedKcal })}
        </p>
        {day.trainingSessions.length === 0 ? (
          <p className="font-mono text-xs text-muted-foreground">
            {t("history.noTraining")}
            {day.steps > 0
              ? ` · ${t("history.stepsSuffix", {
                  count: day.steps.toLocaleString(numberLocale),
                })}`
              : ""}
          </p>
        ) : (
          <ul className="font-mono text-[11px] text-muted-foreground">
            {day.trainingSessions.map((s, i) => (
              <li key={`${s.activity}-${i}`}>
                {s.activity} · {s.duration_minutes} min
              </li>
            ))}
            {day.steps > 0 && (
              <li>
                {t("history.stepsLine", {
                  count: day.steps.toLocaleString(numberLocale),
                })}
              </li>
            )}
          </ul>
        )}
      </section>
      </div>
    </div>
  );
}

function ArchiveChipBar({
  archives,
  selectedId,
  onSelect,
}: {
  archives: ProgramPeriod[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const { t } = useI18n();

  if (archives.length === 0) {
    return (
      <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
        {t("history.archiveEmpty")}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {archives.map((period) => {
        const active = selectedId === period.id;
        return (
          <button
            key={period.id}
            type="button"
            onClick={() => onSelect(period.id)}
            className={cn(
              "max-w-[220px] truncate rounded border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide transition-colors",
              active
                ? "border-emerald-400 bg-emerald-500/30 text-emerald-100 shadow-[0_0_12px_rgba(52,211,153,0.25)]"
                : "border-emerald-500/45 bg-emerald-500/10 text-emerald-200/95 hover:bg-emerald-500/20"
            )}
            title={period.label}
          >
            {period.label}
          </button>
        );
      })}
    </div>
  );
}

export function DayHistoryPanel() {
  const {
    days,
    loading,
    error,
    periods,
    selectedPeriodId,
    customStart,
    customEnd,
    activePeriod,
    daysWithData,
    totalDaysInRange,
    setSelectedPeriodId,
    setCustomStart,
    setCustomEnd,
    refresh,
    canArchiveCurrentProgram,
    archiveCurrentProgram,
    deleteDay,
    deleteVisibleRange,
    deleteArchivedPeriod,
  } = useDayHistory();
  const { setLogDate } = useDailyTracker();
  const { t } = useI18n();

  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [archiveLabel, setArchiveLabel] = useState("");
  const [archiving, setArchiving] = useState(false);
  const [archiveFeedback, setArchiveFeedback] = useState<{
    type: "ok" | "error";
    message: string;
  } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const archivedOnly = useMemo(
    () => periods.filter((p) => !p.isVirtual),
    [periods]
  );

  const toggleExpanded = (date: string) => {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  const handleArchive = async () => {
    if (archiving || !canArchiveCurrentProgram) return;

    const label =
      archiveLabel.trim() ||
      t("history.programDefault", {
        date: format(new Date(), "d.M.yyyy"),
      });
    setArchiving(true);
    setArchiveFeedback(null);
    const result = await archiveCurrentProgram(label);
    setArchiving(false);

    if (result.ok) {
      setArchiveLabel("");
      setArchiveFeedback({
        type: "ok",
        message: result.synced
          ? t("history.archiveSaved", { label: result.label })
          : t("history.archiveSavedLocal", { label: result.label }),
      });
      return;
    }

    if (result.reason === "no_program") {
      setArchiveFeedback({
        type: "error",
        message: t("history.archiveNeedProgram"),
      });
    }
  };

  const handleDeleteDay = async (dateStr: string, dateLabel: string) => {
    if (
      !window.confirm(
        t("history.confirmDeleteDay", { date: dateLabel })
      )
    ) {
      return;
    }
    setDeletingId(dateStr);
    await deleteDay(dateStr);
    setDeletingId(null);
  };

  const handleDeleteRange = async () => {
    if (!activePeriod) return;
    if (
      !window.confirm(
        t("history.confirmDeleteRange", { label: activePeriod.label })
      )
    ) {
      return;
    }
    setBusy(true);
    await deleteVisibleRange();
    setBusy(false);
  };

  const handleDeletePeriod = async (periodId: string, label: string) => {
    const deleteData = window.confirm(
      t("history.confirmDeleteArchive", { label })
    );
    if (!deleteData) {
      setBusy(true);
      await deleteArchivedPeriod(periodId, false);
      setBusy(false);
      return;
    }

    const alsoDeleteData = window.confirm(
      t("history.confirmDeleteArchiveData")
    );

    setBusy(true);
    await deleteArchivedPeriod(periodId, alsoDeleteData);
    setBusy(false);
  };

  const handleExportCsv = () => {
    if (!activePeriod || days.length === 0) return;
    exportDayHistoryCsv(
      days,
      activePeriod.label,
      activePeriod.startDate,
      activePeriod.endDate
    );
  };

  return (
    <details className="group overflow-hidden rounded-xl border border-primary/20 bg-card/30">
      <summary className="cursor-pointer list-none px-4 py-3.5 marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 font-mono text-sm uppercase tracking-widest text-muted-foreground">
            <History className="h-4 w-4 shrink-0" />
            {t("history.title")}
          </span>
          <span className="text-[10px] text-muted-foreground group-open:hidden">
            {t("common.expand")}
          </span>
          <span className="hidden text-[10px] text-muted-foreground group-open:inline">
            {t("common.collapse")}
          </span>
        </span>
        <p className="mt-1 font-mono text-[10px] text-muted-foreground/80">
          {t("history.subtitle")}
        </p>
      </summary>

      <div className="space-y-4 border-t border-primary/15 px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <Label
              htmlFor="history-period"
              className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
            >
              {t("history.period")}
            </Label>
            <select
              id="history-period"
              value={selectedPeriodId}
              onChange={(e) => setSelectedPeriodId(e.target.value)}
              className="w-full max-w-md border border-primary/25 bg-background/60 px-3 py-2 font-mono text-xs"
            >
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
              <option value={CUSTOM_RANGE_ID}>{t("history.customRange")}</option>
            </select>

            {selectedPeriodId === CUSTOM_RANGE_ID && (
              <div className="flex flex-wrap items-end gap-2 pt-1">
                <div>
                  <Label className="text-[10px] text-muted-foreground">{t("history.from")}</Label>
                  <Input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="h-9 w-[140px] font-mono text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">{t("history.to")}</Label>
                  <Input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="h-9 w-[140px] font-mono text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading || days.length === 0}
              onClick={handleExportCsv}
              className="font-mono text-[10px] uppercase"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              {t("history.csv")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => void refresh()}
              className="font-mono text-[10px] uppercase"
            >
              <RefreshCw
                className={cn("mr-1.5 h-3.5 w-3.5", loading && "animate-spin")}
              />
              {t("common.refresh")}
            </Button>
          </div>
        </div>

        <div className="space-y-3 rounded-lg border border-dashed border-primary/20 bg-background/30 p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {t("history.archiveSave")}
              </Label>
              <Input
                value={archiveLabel}
                onChange={(e) => setArchiveLabel(e.target.value)}
                placeholder={t("history.archivePlaceholder")}
                disabled={archiving || !canArchiveCurrentProgram}
                className="mt-1 font-mono text-xs"
              />
              {!canArchiveCurrentProgram && (
                <p className="mt-1.5 font-mono text-[10px] leading-relaxed text-amber-200/90">
                  {t("history.archiveNeedProgram")}
                </p>
              )}
            </div>
            <Button
              type="button"
              size="sm"
              disabled={archiving || !canArchiveCurrentProgram}
              onClick={() => void handleArchive()}
              className="shrink-0 font-mono text-[10px] uppercase"
            >
              {archiving ? t("common.saving") : t("history.archiveBtn")}
            </Button>
          </div>

          {archiveFeedback && (
            <p
              className={cn(
                "font-mono text-[10px] leading-relaxed",
                archiveFeedback.type === "ok"
                  ? "text-emerald-200/95"
                  : "text-destructive"
              )}
              role="status"
            >
              {archiveFeedback.message}
            </p>
          )}

          <div className="border-t border-primary/10 pt-3">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-emerald-200/80">
              {t("history.savedArchives")}
            </p>
            <ArchiveChipBar
              archives={archivedOnly}
              selectedId={selectedPeriodId}
              onSelect={setSelectedPeriodId}
            />
          </div>
        </div>

        {activePeriod && (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="font-mono text-[10px]">
              {t("history.daysWithData", {
                count: daysWithData,
                total: totalDaysInRange,
              })}
            </Badge>
            {activePeriod.dailyCalorieTarget != null && (
              <Badge variant="outline" className="font-mono text-[10px]">
                {t("history.goalKcal", {
                  kcal: activePeriod.dailyCalorieTarget,
                })}
              </Badge>
            )}
          </div>
        )}

        {error && (
          <p className="font-mono text-xs text-destructive">{error}</p>
        )}

        <div className="app-scroll-x max-h-[min(70vh,520px)] overflow-auto rounded-lg border border-primary/15">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead className="sticky top-0 z-[1] bg-card/95 backdrop-blur-sm">
              <tr className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="py-2 pl-2 pr-1">{t("history.day")}</th>
                <th className="px-1 py-2 text-center">%</th>
                <th className="hidden px-1 py-2 text-center sm:table-cell">
                  {t("history.habits")}
                </th>
                <th className="px-1 py-2">{t("history.kcal")}</th>
                <th className="px-1 py-2">{t("history.water")}</th>
                <th className="hidden px-1 py-2 md:table-cell">{t("history.training")}</th>
                <th className="hidden px-1 py-2 lg:table-cell">{t("history.food")}</th>
                <th className="py-2 pr-2 pl-1 text-right" aria-label={t("history.actions")} />
              </tr>
            </thead>
            <tbody>
              {loading && days.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-8 text-center font-mono text-xs text-muted-foreground"
                  >
                    {t("history.loading")}
                  </td>
                </tr>
              ) : days.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-8 text-center font-mono text-xs text-muted-foreground"
                  >
                    {t("history.empty")}
                  </td>
                </tr>
              ) : (
                days.map((day) => (
                  <DayHistoryRow
                    key={day.date}
                    day={day}
                    expanded={expandedDates.has(day.date)}
                    onToggle={() => toggleExpanded(day.date)}
                    onDelete={() =>
                      void handleDeleteDay(day.date, day.dateLabel)
                    }
                    onLogForDate={(date) => {
                      setLogDate(date);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    deleting={deletingId === day.date || busy}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-primary/10 pt-3">
          <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
            {t("history.csvHint")}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            {archivedOnly.length > 0 && (
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {t("history.archives")}:
                </span>
                <ArchiveChipBar
                  archives={archivedOnly}
                  selectedId={selectedPeriodId}
                  onSelect={setSelectedPeriodId}
                />
              </div>
            )}
            <div className="flex flex-wrap gap-2 sm:ml-auto">
              {selectedPeriodId !== CURRENT_PROGRAM_ID &&
                !selectedPeriodId.startsWith(CUSTOM_RANGE_ID) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => {
                      const p = archivedOnly.find(
                        (x) => x.id === selectedPeriodId
                      );
                      if (p) void handleDeletePeriod(p.id, p.label);
                    }}
                    className="font-mono text-[10px] uppercase text-muted-foreground"
                  >
                    {t("history.deleteArchive")}
                  </Button>
                )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy || days.length === 0}
                onClick={() => void handleDeleteRange()}
                className="font-mono text-[10px] uppercase text-destructive hover:bg-destructive/10"
              >
                {t("history.deleteRange")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </details>
  );
}
