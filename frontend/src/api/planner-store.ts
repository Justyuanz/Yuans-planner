import { isRecord } from "../shared/is-record";

export type PlannerStore = Readonly<Record<string, string>>;

export interface PlannerStoreWrite {
  key: string;
  value: string;
}

export interface PlannerStoreHydration {
  serverBackfills: PlannerStoreWrite[];
  store: PlannerStore;
}

export type PlannerFetch = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;

const INVALID_RESPONSE_MESSAGE = "Invalid planner data response";

function stringRecord(value: unknown): Record<string, string> {
  if (!isRecord(value)) {
    return {};
  }
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => (
    typeof entry[1] === "string"
  )));
}

export function mergePlannerHydrationSources(
  serverValues: unknown,
  browserValues: unknown
): PlannerStoreHydration {
  const store: Record<string, string> = { ...stringRecord(serverValues) };
  const serverBackfills: PlannerStoreWrite[] = [];

  Object.entries(stringRecord(browserValues)).forEach(([key, value]) => {
    if (!key.startsWith("hivePlanner.") || store[key] !== undefined) {
      return;
    }
    store[key] = value;
    serverBackfills.push({ key, value });
  });

  return { serverBackfills, store };
}

export function readPlannerBrowserStore(
  storage: Pick<Storage, "getItem" | "key" | "length">
): PlannerStore {
  const store: Record<string, string> = {};
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key?.startsWith("hivePlanner.")) {
      continue;
    }
    const value = storage.getItem(key);
    if (value !== null) {
      store[key] = value;
    }
  }
  return store;
}

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
