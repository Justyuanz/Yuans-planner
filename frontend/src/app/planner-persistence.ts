import { putPlannerStoreValue, type PlannerStoreWrite } from "../api/planner-store";

export type PlannerStoreWriter = (key: string, value: string) => Promise<void>;

// Every server write joins one queue. Each edit persists a whole document, so
// two overlapping edits both send a full snapshot: without serialization the
// earlier snapshot can finish last and silently discard the newer edit. Running
// the queue in issue order keeps the newest edit authoritative and still lets a
// trailing audit entry land after the state it records.
let pendingWrites: Promise<void> = Promise.resolve();

export function queuePlannerServerWrites(
  writes: readonly PlannerStoreWrite[],
  write: PlannerStoreWriter = putPlannerStoreValue
): Promise<void> {
  pendingWrites = pendingWrites.then(async () => {
    for (const { key, value } of writes) {
      try {
        await write(key, value);
      } catch {
        // One failed write must not stall every write queued behind it.
      }
    }
  });
  return pendingWrites;
}

export function persistPlannerWrites(writes: readonly PlannerStoreWrite[]): void {
  writes.forEach(({ key, value }) => {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // SQLite persistence remains available when browser storage is blocked.
    }
    window.dispatchEvent(new StorageEvent("storage", { key, newValue: value }));
  });
  void queuePlannerServerWrites(writes);
}
