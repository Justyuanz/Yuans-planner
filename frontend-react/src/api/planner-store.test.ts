import { describe, expect, it } from "vitest";

import {
  decodePlannerStoreResponse,
  fetchPlannerStore,
  putPlannerStoreValue,
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
