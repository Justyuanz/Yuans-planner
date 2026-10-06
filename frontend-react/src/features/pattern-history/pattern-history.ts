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

export function emptyPatternHistoryModel(currentDateKey: string): PatternHistoryModel {
  return {
    groups: [],
    isEmpty: true,
    rangeLabel: `Last 14 days through ${currentDateKey}`
  };
}
