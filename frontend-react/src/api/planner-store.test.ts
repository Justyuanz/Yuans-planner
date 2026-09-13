import { describe, expect, it } from "vitest";

import {
  decodePlannerStoreResponse,
  fetchPlannerStore,
  type PlannerFetch
} from "./planner-store";

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
