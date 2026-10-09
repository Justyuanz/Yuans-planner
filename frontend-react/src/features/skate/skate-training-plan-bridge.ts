import { isSkateIntensity, type SkateIntensity } from "./skate-intensity";

export interface SkateTrainingPlanBlock {
  label: string;
  value: string;
}

export interface SkateTrainingPlanRow {
  benchmark: string;
  current: boolean;
  detail: string;
  intensity: SkateIntensity;
  intensityLabel: string;
  label: string;
  preview: boolean;
  subtitle: string;
  title: string;
}

export interface SkateTrainingPlanState {
  emptyMessage: string;
  today: {
    blocks: SkateTrainingPlanBlock[];
    description: string;
    kicker: string;
    note: string;
    title: string;
  } | null;
  week: {
    description: string;
    kicker: string;
    rows: SkateTrainingPlanRow[];
    title: string;
  } | null;
}

function text(root: ParentNode, selector: string): string {
  return root.querySelector(selector)?.textContent?.trim() ?? "";
}

function intensityFromRow(row: Element): SkateIntensity {
  const className = [...row.classList].find((name) => name.startsWith("intensity-"));
  const value = className?.slice("intensity-".length);
  return isSkateIntensity(value) ? value : "yellow";
}

export function skateTrainingPlanStateFromRoot(root: ParentNode | null): SkateTrainingPlanState | null {
  if (root === null) return null;
  const stack = root.querySelector(".skate-plan-stack");
  if (stack === null) return null;
  const emptyMessage = text(stack, ".body-support-empty");
  if (emptyMessage) return { emptyMessage, today: null, week: null };

  const cards = stack.querySelectorAll(".skate-plan-card");
  const todayCard = cards.item(0);
  const weekCard = cards.item(1);
  if (todayCard === null || weekCard === null) return null;

  return {
    emptyMessage: "",
    today: {
      blocks: [...todayCard.querySelectorAll(".skate-plan-block")].map((block) => ({
        label: text(block, "span"),
        value: text(block, "strong")
      })),
      description: text(todayCard, ".skate-plan-head p"),
      kicker: text(todayCard, ".skate-plan-kicker"),
      note: text(todayCard, ".skate-plan-note"),
      title: text(todayCard, ".skate-plan-head h3")
    },
    week: {
      description: text(weekCard, ".skate-plan-head p"),
      kicker: text(weekCard, ".skate-plan-kicker"),
      rows: [...weekCard.querySelectorAll(".skate-plan-row")].map((row) => ({
        benchmark: text(row, ".skate-plan-pill"),
        current: row.classList.contains("is-current"),
        detail: text(row, ".skate-plan-row-detail"),
        intensity: intensityFromRow(row),
        intensityLabel: text(row, ".skate-plan-row-top em"),
        label: text(row, ".skate-plan-row-top span"),
        preview: row.classList.contains("is-preview"),
        subtitle: text(row, ".skate-plan-row-copy"),
        title: text(row, ".skate-plan-row-top strong")
      })),
      title: text(weekCard, ".skate-plan-head h3")
    }
  };
}
