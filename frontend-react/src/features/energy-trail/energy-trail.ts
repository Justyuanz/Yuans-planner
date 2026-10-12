import type { PlannerStore } from "../../api/planner-store";
import { energyTrailEntries, energyTrailPattern } from "./energy-trail-store";
import { humanDateFromKey } from "../../shared/planner-date";

export interface EnergyTrailItem {
  context: string;
  date: string;
  dateLabel: string;
  id: string;
  summary: string;
}

export interface EnergyTrailModel {
  items: readonly EnergyTrailItem[];
  patternText: string;
}

const ENERGY_LABELS: Readonly<Record<string, string>> = {
  empty: "Empty",
  low: "Low",
  okay: "Okay",
  good: "Good",
  strong: "Strong"
};
const FOCUS_LABELS: Readonly<Record<string, string>> = {
  foggy: "Foggy",
  wavy: "Wavy",
  steady: "Steady",
  clear: "Clear"
};
const EMPTY_PATTERN_TEXT =
  "Once a few rough days are logged, this will compare what tended to come before them.";


function trackerSummary(energy: string, focus: string): string {
  return [
    energy ? `Energy ${ENERGY_LABELS[energy] ?? energy}` : "",
    focus ? `Focus ${FOCUS_LABELS[focus] ?? focus}` : ""
  ].filter(Boolean).join(" · ") || "Check-in saved";
}

function oneDecimal(value: number): number {
  return Math.round((Number(value) || 0) * 10) / 10;
}

export function buildEnergyTrail(store: PlannerStore, today: Date): EnergyTrailModel {
  const pattern = energyTrailPattern(store, today);
  const patternText = pattern.lowEnergyDays >= 2
    ? `Low-energy check-ins have recently followed evenings averaging ${oneDecimal(pattern.lowEnergyPreviousEveningHours)}h, compared with ${oneDecimal(pattern.otherPreviousEveningHours)}h before steadier days.`
    : EMPTY_PATTERN_TEXT;

  return {
    items: energyTrailEntries(store).map((entry) => ({
      context: entry.context,
      date: entry.date,
      dateLabel: humanDateFromKey(entry.date),
      id: entry.id,
      summary: trackerSummary(entry.energy, entry.focus)
    })),
    patternText
  };
}
