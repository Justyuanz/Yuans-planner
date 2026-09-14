import { isRecord } from "../shared/is-record";

export type PlannerStore = Readonly<Record<string, string>>;

export interface PlannerStoreWrite {
  key: string;
  value: string;
}

export type PlannerFetch = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;

const INVALID_RESPONSE_MESSAGE = "Invalid planner data response";

export function applyPlannerStorageChange(
  store: PlannerStore,
  key: string | null,
  newValue: string | null
): PlannerStore {
  if (!key?.startsWith("hivePlanner.")) {
    return store;
  }
  if (newValue === null) {
    const updatedStore = { ...store };
    delete updatedStore[key];
    return updatedStore;
  }
  return { ...store, [key]: newValue };
}

export function decodePlannerStoreResponse(payload: unknown): PlannerStore {
  if (!isRecord(payload) || !isRecord(payload.data)) {
    throw new Error(INVALID_RESPONSE_MESSAGE);
  }

  const entries = Object.entries(payload.data).map(([key, value]) => {
    if (typeof value !== "string") {
      throw new Error(INVALID_RESPONSE_MESSAGE);
    }
    return [key, value] as const;
  });

  return Object.fromEntries(entries);
}

export async function fetchPlannerStore(
  plannerFetch: PlannerFetch = fetch
): Promise<PlannerStore> {
  const response = await plannerFetch("/api/kv", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Planner data request failed with status ${response.status}`);
  }

  const payload: unknown = await response.json();
  return decodePlannerStoreResponse(payload);
}

export async function putPlannerStoreValue(
  key: string,
  value: string,
  plannerFetch: PlannerFetch = fetch
): Promise<void> {
  const response = await plannerFetch("/api/kv", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value })
  });
  if (!response.ok) {
    throw new Error(`Planner data write failed with status ${response.status}`);
  }
}
