import { isRecord } from "../../shared/is-record";

export interface PatternHistoryAction {
  id: string;
  label: string;
}

export interface PatternHistoryItem {
  actions: readonly PatternHistoryAction[];
  evidence: readonly string[];
  id: string;
  priority: number;
  sampleSize: number;
  summary: string;
  title: string;
}

export interface PatternHistoryGroup {
  items: readonly PatternHistoryItem[];
  mode: string;
  title: string;
}

export interface PatternHistoryModel {
  groups: readonly PatternHistoryGroup[];
  isEmpty: boolean;
  rangeLabel: string;
}

function nonEmptyText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function finiteNumber(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeActions(value: unknown): PatternHistoryAction[] {
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

function normalizeEvidence(value: unknown): string[] {
  return Array.isArray(value)
    ? value.flatMap((line) => {
      const text = nonEmptyText(line);
      return text === null ? [] : [text];
    })
    : [];
}

function normalizeItem(value: unknown): PatternHistoryItem | null {
  if (!isRecord(value)) {
    return null;
  }
  const id = nonEmptyText(value.id);
  const title = nonEmptyText(value.title);
  const summary = nonEmptyText(value.summary);
  const priority = finiteNumber(value.priority);
  const sampleSize = finiteNumber(value.sampleSize);
  if (id === null || title === null || summary === null || priority === null || sampleSize === null) {
    return null;
  }
  return {
    actions: normalizeActions(value.actions),
    evidence: normalizeEvidence(value.evidence),
    id,
    priority,
    sampleSize,
    summary,
    title
  };
}

function normalizeGroup(value: unknown): PatternHistoryGroup | null {
  if (!isRecord(value)) {
    return null;
  }
  const mode = nonEmptyText(value.mode);
  const title = nonEmptyText(value.title);
  const items = Array.isArray(value.items)
    ? value.items.flatMap((item) => {
      const normalized = normalizeItem(item);
      return normalized === null ? [] : [normalized];
    })
    : [];
  if (mode === null || title === null || items.length === 0) {
    return null;
  }
  return { items, mode, title };
}

export function emptyPatternHistoryModel(currentDateKey: string): PatternHistoryModel {
  return {
    groups: [],
    isEmpty: true,
    rangeLabel: `Last 14 days through ${currentDateKey}`
  };
}

export function buildPatternHistoryModel(value: unknown, currentDateKey: string): PatternHistoryModel {
  if (!isRecord(value)) {
    return emptyPatternHistoryModel(currentDateKey);
  }
  const groups = Array.isArray(value.groups)
    ? value.groups.flatMap((group) => {
      const normalized = normalizeGroup(group);
      return normalized === null ? [] : [normalized];
    })
    : [];
  if (groups.length === 0) {
    return emptyPatternHistoryModel(currentDateKey);
  }
  return {
    groups,
    isEmpty: false,
    rangeLabel: nonEmptyText(value.rangeLabel) ?? `Last 14 days through ${currentDateKey}`
  };
}
