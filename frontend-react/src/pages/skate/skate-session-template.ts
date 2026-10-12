import { isRecord } from "@/shared/is-record";

export interface SkateWarmupItem {
  id: string;
  name: string;
  target: string;
}

export interface SkateWarmupGroup {
  items: SkateWarmupItem[];
  title: string;
}

export interface SkateCoachTemplate {
  focusSuggestions: {
    flat: string[];
    transition: string[];
  };
  roadmapChains: string[][];
  skillBuilder: {
    reminder: string;
    switchItems: string[];
    wallRide: string;
  };
  warmupGroups: SkateWarmupGroup[];
}

const DEFAULT_TEMPLATE: SkateCoachTemplate = {
  warmupGroups: [
    {
      title: "Flat",
      items: [
        { id: "flat-reverts", name: "Reverts (all directions)", target: "" },
        { id: "flat-ollie", name: "Ollie", target: "x10" },
        { id: "flat-fakie-ollie", name: "Fakie Ollie", target: "x10" }
      ]
    },
    {
      title: "Street",
      items: [
        { id: "street-curb-on", name: "Ollie onto curb", target: "x5" },
        { id: "street-obstacle", name: "Ollie over obstacle", target: "x5" },
        { id: "street-bank", name: "Ollie on bank", target: "x5" },
        { id: "street-drop", name: "Drop off curb", target: "x5" }
      ]
    },
    {
      title: "Transition",
      items: [
        { id: "transition-dropin", name: "Drop in", target: "x3-5" },
        { id: "transition-bowl", name: "Bowl laps", target: "5 min" },
        { id: "transition-fakie", name: "Ride up transition to fakie", target: "x10" },
        { id: "transition-rock-fakie", name: "Rock to Fakie", target: "x10" }
      ]
    }
  ],
  focusSuggestions: {
    flat: ["Shove-it", "Frontside 180", "Half Cab"],
    transition: ["Axle Stall", "Axle Drop", "Wall Ride"]
  },
  skillBuilder: {
    switchItems: ["Push switch", "Ride switch", "Switch kickturns"],
    reminder: "Finish with a few Fakie Ollies.",
    wallRide: "Only a few attempts. Focus on getting comfortable touching the wall and riding away. Not landing."
  },
  roadmapChains: [
    ["Rock to Fakie", "Axle Stall", "Axle Drop", "Rock & Roll"],
    ["Reverts", "Fakie Ollie", "Half Cab"],
    ["Switch Push", "Switch Ride", "Switch Ollie"]
  ]
};

function textList(value: unknown, fallback: readonly string[]): string[] {
  if (!Array.isArray(value) || value.length === 0) return [...fallback];
  const values = value.map((item) => String(item ?? "").trim()).filter(Boolean);
  return values.length > 0 ? values : [...fallback];
}

function warmupItem(value: unknown, fallback: SkateWarmupItem): SkateWarmupItem {
  const item = isRecord(value) ? value : {};
  return {
    id: typeof item.id === "string" && item.id ? item.id : fallback.id,
    name: typeof item.name === "string" && item.name.trim() ? item.name.trim() : fallback.name,
    target: typeof item.target === "string" ? item.target.trim() : fallback.target
  };
}

function warmupGroup(value: unknown, fallback: SkateWarmupGroup, index: number): SkateWarmupGroup {
  const group = isRecord(value) ? value : {};
  const items = Array.isArray(group.items) ? group.items : fallback.items;
  return {
    title: typeof group.title === "string" && group.title.trim() ? group.title.trim() : fallback.title,
    items: items.map((item, itemIndex) => warmupItem(item, fallback.items[itemIndex] ?? {
      id: `warmup-${fallback.title.toLowerCase()}-${index}-${itemIndex}`,
      name: "Warm-up",
      target: ""
    })).filter((item) => Boolean(item.name))
  };
}

function roadmapChains(value: unknown): string[][] {
  if (!Array.isArray(value) || value.length === 0) {
    return DEFAULT_TEMPLATE.roadmapChains.map((chain) => [...chain]);
  }
  const chains = value.map((candidate, index) => {
    const fallback = DEFAULT_TEMPLATE.roadmapChains[index] ?? DEFAULT_TEMPLATE.roadmapChains[0]!;
    return textList(candidate, fallback);
  }).filter((chain) => chain.length > 0);
  return chains.length > 0 ? chains : DEFAULT_TEMPLATE.roadmapChains.map((chain) => [...chain]);
}

function parseTemplate(rawValue: string | undefined): unknown {
  if (rawValue === undefined) return null;
  try {
    const parsed: unknown = JSON.parse(rawValue);
    return parsed;
  } catch {
    return null;
  }
}

export function decodeSkateCoachTemplate(rawValue: string | undefined): SkateCoachTemplate {
  const value = parseTemplate(rawValue);
  const template = isRecord(value) ? value : {};
  const rawGroups = Array.isArray(template.warmupGroups)
    ? template.warmupGroups : DEFAULT_TEMPLATE.warmupGroups;
  const groups = rawGroups.map((group, index) => warmupGroup(
    group,
    DEFAULT_TEMPLATE.warmupGroups[index] ?? DEFAULT_TEMPLATE.warmupGroups[0]!,
    index
  )).filter((group) => group.items.length > 0);
  const focus = isRecord(template.focusSuggestions) ? template.focusSuggestions : {};
  const skill = isRecord(template.skillBuilder) ? template.skillBuilder : {};
  return {
    warmupGroups: groups.length > 0 ? groups : DEFAULT_TEMPLATE.warmupGroups,
    focusSuggestions: {
      flat: textList(focus.flat, DEFAULT_TEMPLATE.focusSuggestions.flat),
      transition: textList(focus.transition, DEFAULT_TEMPLATE.focusSuggestions.transition)
    },
    skillBuilder: {
      switchItems: textList(skill.switchItems, DEFAULT_TEMPLATE.skillBuilder.switchItems),
      reminder: typeof skill.reminder === "string" && skill.reminder.trim()
        ? skill.reminder.trim() : DEFAULT_TEMPLATE.skillBuilder.reminder,
      wallRide: typeof skill.wallRide === "string" && skill.wallRide.trim()
        ? skill.wallRide.trim() : DEFAULT_TEMPLATE.skillBuilder.wallRide
    },
    roadmapChains: roadmapChains(template.roadmapChains)
  };
}
