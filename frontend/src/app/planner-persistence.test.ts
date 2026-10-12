import { describe, expect, it } from "vitest";

import { queuePlannerServerWrites } from "./planner-persistence";
import type { PlannerStoreWrite } from "../api/planner-store";

// The browser-storage mirror and same-window storage event that
// persistPlannerWrites also performs are covered by the browser tests, since
// this unit suite runs without a DOM.
const JOURNAL_KEY = "hivePlanner.journal.entries";

function entry(minutes: number): PlannerStoreWrite {
  return { key: JOURNAL_KEY, value: JSON.stringify({ durationMinutes: minutes }) };
}

/** Records write order and only finishes a write when it is released. */
function controllableWriter() {
  const started: string[] = [];
  const completed: string[] = [];
  const pending: (() => void)[] = [];

  async function write(_key: string, value: string): Promise<void> {
    started.push(value);
    await new Promise<void>((resolve) => {
      pending.push(() => {
        completed.push(value);
        resolve();
      });
    });
  }

  function release(index: number): void {
    const finish = pending[index];
    if (!finish) {
      throw new Error(`No write is waiting at position ${index}`);
    }
    finish();
  }

  // Lets the queue advance to the next write before asserting on it.
  async function settle(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  }

  return { completed, release, settle, started, write };
}

describe("queuePlannerServerWrites", () => {
  it("keeps the newest edit authoritative when an earlier write finishes late", async () => {
    // Each edit persists a whole snapshot, so the first still carries the
    // pre-edit value. Before the queue existed, this slow first write could
    // finish last and discard the newer edit.
    const writer = controllableWriter();
    const first = queuePlannerServerWrites([entry(15)], writer.write);
    const second = queuePlannerServerWrites([entry(25)], writer.write);

    await writer.settle();
    expect(writer.started).toEqual([entry(15).value]);

    writer.release(0);
    await first;
    await writer.settle();
    writer.release(1);
    await second;

    expect(writer.completed).toEqual([entry(15).value, entry(25).value]);
  });

  it("preserves order inside one batch so an audit entry lands after its state", async () => {
    const writer = controllableWriter();
    const settled = queuePlannerServerWrites([
      { key: "hivePlanner.dailyTasks.2026-09-14", value: "restored-state" },
      { key: "hivePlanner.activityLog", value: "audit-entry" }
    ], writer.write);

    await writer.settle();
    expect(writer.started).toEqual(["restored-state"]);

    writer.release(0);
    await writer.settle();
    writer.release(1);
    await settled;

    expect(writer.completed).toEqual(["restored-state", "audit-entry"]);
  });

  it("continues the queue after a failed write", async () => {
    const completed: string[] = [];
    function failing(_key: string, value: string): Promise<void> {
      if (value === "doomed") {
        return Promise.reject(new Error("write failed"));
      }
      completed.push(value);
      return Promise.resolve();
    }

    await queuePlannerServerWrites([{ key: JOURNAL_KEY, value: "doomed" }], failing);
    await queuePlannerServerWrites([{ key: JOURNAL_KEY, value: "later" }], failing);

    expect(completed).toEqual(["later"]);
  });
});
