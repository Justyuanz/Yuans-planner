import { isRecord } from "@/shared/is-record";

export interface DashboardInsightAction {
  id: string;
  label: string;
}

export interface DashboardInsightModel {
  actions: readonly DashboardInsightAction[];
  modeText: string;
  title: string;
  why: string;
}

const QUIET_MODEL: DashboardInsightModel = {
  actions: [],
  modeText: "quiet mode",
  title: "No strong pattern needs attention yet.",
  why: "This space will surface patterns when your recent planner data shows something clear, but right now nothing looks urgent or obviously off-track."
};

function nonEmptyText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function normalizeActions(value: unknown): DashboardInsightAction[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((candidate) => {
    if (!isRecord(candidate)) {
      return [];
    }
    const id = nonEmptyText(candidate.id);
    const label = nonEmptyText(candidate.label);
    return id === null || label === null ? [] : [{ id, label }];
  }).slice(0, 2);
}

export function buildDashboardInsightModel(value: unknown): DashboardInsightModel {
  if (!isRecord(value)) {
    return QUIET_MODEL;
  }
  const mode = nonEmptyText(value.mode);
  const title = nonEmptyText(value.title);
  const why = nonEmptyText(value.why);
  const sampleSize = Number(value.sampleSize);
  if (mode === null || title === null || why === null || !Number.isFinite(sampleSize)) {
    return QUIET_MODEL;
  }
  return {
    actions: normalizeActions(value.actions),
    modeText: `${mode} · ${sampleSize} days`,
    title,
    why
  };
}

