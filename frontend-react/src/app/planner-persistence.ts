import { putPlannerStoreValue, type PlannerStoreWrite } from "../api/planner-store";

async function persistServerWrites(writes: readonly PlannerStoreWrite[]): Promise<void> {
  // Preserve write order so a final audit entry cannot become visible before its restored state.
  for (const { key, value } of writes) {
    await putPlannerStoreValue(key, value);
  }
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
  void persistServerWrites(writes).catch(() => undefined);
}
