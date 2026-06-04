export const DAILY_TRAINING_GOAL_MIN = 60;

/** kcal na kg telesnej hmotnosti za hodinu (MET-like odhad) */
export const DEFAULT_TRAINING_BURN_RATE = 6;

export type TrainingPreset = {
  id: string;
  label: string;
  activity: string;
  minutes: number;
  /** kcal / kg / hod */
  burnRate: number;
};

export const TRAINING_PRESETS: TrainingPreset[] = [
  {
    id: "swim",
    label: "Plávanie · 60 min",
    activity: "Plávanie",
    minutes: 60,
    burnRate: 8,
  },
  {
    id: "run",
    label: "Beh · 45 min",
    activity: "Beh",
    minutes: 45,
    burnRate: 10,
  },
  {
    id: "bike",
    label: "Bicykel · 60 min",
    activity: "Bicykel",
    minutes: 60,
    burnRate: 7,
  },
  {
    id: "gym",
    label: "Posilňovňa · 60 min",
    activity: "Posilňovňa",
    minutes: 60,
    burnRate: 6,
  },
];

/** Doplnkové aliasy pre vlastné názvy a fuzzy match */
export const TRAINING_ACTIVITY_BURN_RATES: Record<string, number> = {
  plávanie: 8,
  plavanie: 8,
  swim: 8,
  swimming: 8,
  beh: 10,
  running: 10,
  run: 10,
  bicykel: 7,
  bike: 7,
  cycling: 7,
  cyklistika: 7,
  posilňovňa: 6,
  posilnovna: 6,
  posilka: 6,
  gym: 6,
  silový: 6,
  box: 9,
  boxovanie: 9,
  yoga: 3.5,
  jóga: 3.5,
  chôdza: 4,
  chodza: 4,
  walk: 4,
  turistika: 5,
  hike: 5,
};

export function trainingBurnRateForActivity(activity: string): number {
  const key = activity.trim().toLowerCase();
  if (!key) return DEFAULT_TRAINING_BURN_RATE;

  if (TRAINING_ACTIVITY_BURN_RATES[key] != null) {
    return TRAINING_ACTIVITY_BURN_RATES[key];
  }

  const preset = TRAINING_PRESETS.find(
    (p) => p.activity.toLowerCase() === key
  );
  if (preset) return preset.burnRate;

  for (const [name, rate] of Object.entries(TRAINING_ACTIVITY_BURN_RATES)) {
    if (key.includes(name) || name.includes(key)) {
      return rate;
    }
  }

  for (const preset of TRAINING_PRESETS) {
    const presetKey = preset.activity.toLowerCase();
    if (key.includes(presetKey) || presetKey.includes(key)) {
      return preset.burnRate;
    }
  }

  return DEFAULT_TRAINING_BURN_RATE;
}

export function formatTrainingDuration(totalMinutes: number): string {
  if (totalMinutes <= 0) return "0 min";
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

export function parseDurationInput(hours: string, minutes: string): number {
  const h = Math.max(0, Number(hours) || 0);
  const m = Math.max(0, Number(minutes) || 0);
  return h * 60 + m;
}

export const TRAINING_BURN_LEGEND = TRAINING_PRESETS.map((p) => ({
  activity: p.activity,
  rate: p.burnRate,
}));
