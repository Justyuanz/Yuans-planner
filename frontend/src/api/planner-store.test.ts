import { describe, expect, it } from "vitest";

import {
  applyPlannerStorageChange,
  decodePlannerStoreResponse,
  fetchPlannerStore,
  mergePlannerHydrationSources,
  putPlannerStoreValue,
  type PlannerFetch
} from "./planner-store";

describe("mergePlannerHydrationSources", () => {
  it("keeps server values and backfills only missing Planner keys", () => {
    const result = mergePlannerHydrationSources({
      "hivePlanner.events": "server-events",
      "server.metadata": "preserve"
    }, {
      "hivePlanner.dailyTasks.2026-09-12": "browser-tasks",
      "hivePlanner.events": "browser-events",
      "other.application": "ignore"
    });

    expect(result).toEqual({
      serverBackfills: [{
        key: "hivePlanner.dailyTasks.2026-09-12",
        value: "browser-tasks"
      }],
      store: {
        "hivePlanner.dailyTasks.2026-09-12": "browser-tasks",
        "hivePlanner.events": "server-events",
        "server.metadata": "preserve"
      }
    });
  });

  it("ignores malformed sources and non-string browser values", () => {
    expect(mergePlannerHydrationSources([], null)).toEqual({
      serverBackfills: [],
      store: {}
    });
    expect(mergePlannerHydrationSources({}, {
      "hivePlanner.invalid": [],
      "hivePlanner.valid": "[]",
      "notPlanner.valid": "value"
    })).toEqual({
      serverBackfills: [{ key: "hivePlanner.valid", value: "[]" }],
      store: { "hivePlanner.valid": "[]" }
    });
  });
});

describe("applyPlannerStorageChange", () => {
  it("merges and removes planner keys written by the legacy frame", () => {
    const initial = {
      "hivePlanner.weeklyGoals": "{}",
      "hivePlanner.dailyTasks.2026-09-13": "[]"
    };

    const updated = applyPlannerStorageChange(
      initial,
      "hivePlanner.dailyTasks.2026-09-13",
      '[{"hours":2}]'
    );
    expect(updated).toEqual({
      ...initial,
      "hivePlanner.dailyTasks.2026-09-13": '[{"hours":2}]'
    });
    expect(applyPlannerStorageChange(updated, "hivePlanner.weeklyGoals", null)).toEqual({
      "hivePlanner.dailyTasks.2026-09-13": '[{"hours":2}]'
    });
  });

  it("ignores unrelated browser-storage changes", () => {
    const store = { "hivePlanner.weeklyGoals": "{}" };

    expect(applyPlannerStorageChange(store, "other.key", "changed")).toBe(store);
    expect(applyPlannerStorageChange(store, null, null)).toBe(store);
  });
});

describe("decodePlannerStoreResponse", () => {
  it("preserves every string value, including unknown compatibility keys", () => {
    const decoded = decodePlannerStoreResponse({
      data: {
        "hivePlanner.weeklyGoals": '{"study":"Finish the decoder"}',
        "hivePlanner.future.unknown": '{"preserve":true}'
      }
    });

    expect(decoded).toEqual({
      "hivePlanner.weeklyGoals": '{"study":"Finish the decoder"}',
      "hivePlanner.future.unknown": '{"preserve":true}'
    });
  });

  it.each([
    null,
    {},
    { data: [] },
    { data: { "hivePlanner.weeklyGoals": {} } }
  ])("rejects a malformed API payload: %j", (payload) => {
    expect(() => decodePlannerStoreResponse(payload)).toThrow("Invalid planner data response");
  });
});

describe("fetchPlannerStore", () => {
  it("reads the existing endpoint without caching or writing", async () => {
    const requests: { cache: RequestCache | undefined; input: RequestInfo | URL }[] = [];
    const plannerFetch: PlannerFetch = (input, init) => {
      requests.push({ cache: init?.cache, input });
      return Promise.resolve(
        new Response('{"data":{"hivePlanner.weeklyGoals":"{}"}}', {
          headers: { "Content-Type": "application/json" },
          status: 200
        })
      );
    };

    await expect(fetchPlannerStore(plannerFetch)).resolves.toEqual({
      "hivePlanner.weeklyGoals": "{}"
    });
    expect(requests).toEqual([{ cache: "no-store", input: "/api/kv" }]);
  });

  it("reports an unsuccessful API response", async () => {
    const plannerFetch: PlannerFetch = () =>
      Promise.resolve(new Response(null, { status: 503 }));

    await expect(fetchPlannerStore(plannerFetch)).rejects.toThrow(
      "Planner data request failed with status 503"
    );
  });
});

describe("putPlannerStoreValue", () => {
  it("writes one string value through the existing endpoint", async () => {
    const requests: { body: BodyInit | null | undefined; method: string | undefined }[] = [];
    const plannerFetch: PlannerFetch = (_input, init) => {
      requests.push({ body: init?.body, method: init?.method });
      return Promise.resolve(new Response('{"ok":true}', { status: 200 }));
    };

    await putPlannerStoreValue("hivePlanner.weeklyGoals", '{"study":"Updated"}', plannerFetch);

    expect(requests).toEqual([{
      body: '{"key":"hivePlanner.weeklyGoals","value":"{\\"study\\":\\"Updated\\"}"}',
      method: "PUT"
    }]);
  });

  it("reports an unsuccessful write", async () => {
    const plannerFetch: PlannerFetch = () =>
      Promise.resolve(new Response(null, { status: 503 }));

    await expect(
      putPlannerStoreValue("hivePlanner.weeklyGoals", "{}", plannerFetch)
    ).rejects.toThrow("Planner data write failed with status 503");
  });
});
