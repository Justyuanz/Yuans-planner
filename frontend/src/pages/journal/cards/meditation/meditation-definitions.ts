export interface MeditationActiveTimer {
  dateKey: string;
  endsAt: number;
  id: string;
  minutes: number;
  startedAt: number;
}

export interface MeditationDocument {
  active: MeditationActiveTimer | null;
  source: Readonly<Record<string, unknown>>;
  sessions: readonly unknown[];
}

export const MEDITATION_STORAGE_KEY = "hivePlanner.meditation";
