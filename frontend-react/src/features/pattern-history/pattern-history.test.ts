import { describe, expect, it } from "vitest";

import { buildPatternHistoryModel, emptyPatternHistoryModel } from "./pattern-history";

describe("buildPatternHistoryModel", () => {
  it("normalizes the grouped legacy history model", () => {
    expect(buildPatternHistoryModel({
      isEmpty: false,
      rangeLabel: "Last 14 days through 2026-09-14",
      groups: [{
        mode: "reality",
        title: "Reality checks",
        items: [{
          id: "task_overpacking",
          title: "Today may be holding more tasks than you usually finish.",
          summary: "You planned 4 tasks today, while your recent completion average is 1 tasks.",
          priority: 90,
          sampleSize: 4,
          actions: [
            { id: "focus_today_tasks", label: "Focus today's tasks" },
            { id: "review_planned_hours", label: "Review planned hours" }
          ],
          evidence: [
            "Today's plan holds 4 tasks.",
            "Recent completion average is 1 tasks/day."
          ]
        }]
      }]
    }, "2026-09-14")).toEqual({
      isEmpty: false,
      rangeLabel: "Last 14 days through 2026-09-14",
      groups: [{
        mode: "reality",
        title: "Reality checks",
        items: [{
          id: "task_overpacking",
          title: "Today may be holding more tasks than you usually finish.",
          summary: "You planned 4 tasks today, while your recent completion average is 1 tasks.",
          priority: 90,
          sampleSize: 4,
          actions: [
            { id: "focus_today_tasks", label: "Focus today's tasks" },
            { id: "review_planned_hours", label: "Review planned hours" }
          ],
          evidence: [
            "Today's plan holds 4 tasks.",
            "Recent completion average is 1 tasks/day."
          ]
        }]
      }]
    });
  });

  it("uses the legacy empty copy when there are no valid groups", () => {
    expect(buildPatternHistoryModel({
      isEmpty: false,
      rangeLabel: "",
      groups: [
        null,
        { mode: "reality", title: "Reality checks", items: [{ title: "Missing fields" }] }
      ]
    }, "2026-09-14")).toEqual(emptyPatternHistoryModel("2026-09-14"));
  });

  it("drops malformed optional actions and evidence without losing a valid item", () => {
    expect(buildPatternHistoryModel({
      rangeLabel: "Last 14 days through 2026-09-14",
      groups: [{
        mode: "focus",
        title: "Focus friction",
        items: [{
          id: "vague_task_friction",
          title: "A few open tasks still look too vague to start cleanly.",
          summary: "Some tasks need clearer labels.",
          priority: "80",
          sampleSize: "5",
          actions: [{ id: "make_one_task_concrete", label: "Make one task concrete" }, { id: "" }],
          evidence: ["0 open tasks still look broad.", "", 42]
        }]
      }]
    }, "2026-09-14")).toEqual({
      isEmpty: false,
      rangeLabel: "Last 14 days through 2026-09-14",
      groups: [{
        mode: "focus",
        title: "Focus friction",
        items: [{
          id: "vague_task_friction",
          title: "A few open tasks still look too vague to start cleanly.",
          summary: "Some tasks need clearer labels.",
          priority: 80,
          sampleSize: 5,
          actions: [{ id: "make_one_task_concrete", label: "Make one task concrete" }],
          evidence: ["0 open tasks still look broad."]
        }]
      }]
    });
  });
});
