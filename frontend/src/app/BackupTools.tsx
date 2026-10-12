import { useRef, useState, type ChangeEvent } from "react";

import type { PlannerStore } from "../api/planner-store";
import { decodeImportedPlannerData, selectBackupData } from "./backup-data";

interface BackupToolsProps {
  dateKey: string;
  store: PlannerStore;
}

export function BackupTools({ dateKey, store }: BackupToolsProps) {
  const [status, setStatus] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function exportBackup(): void {
    const payload = JSON.stringify({
      app: "Yuan's Planner",
      data: selectBackupData(store),
      exportedAt: new Date().toISOString(),
      storage: "sqlite",
      version: 2
    }, null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `yuan-planner-backup-${dateKey}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setStatus("Backup exported.");
  }

  async function importBackup(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    try {
      const data = decodeImportedPlannerData(JSON.parse(await file.text()));
      const response = await fetch("/api/import", {
        body: JSON.stringify({ data }),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      });
      if (!response.ok) throw new Error("Import failed");
      Object.entries(data).forEach(([key, value]) => {
        window.localStorage.setItem(key, value);
        window.dispatchEvent(new StorageEvent("storage", { key, newValue: value }));
      });
      setStatus(`Imported ${Object.keys(data).length} saved items.`);
    } catch {
      setStatus("That backup file could not be read.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="backup-utility" aria-label="Backup tools">
      <span>Your data lives on this planner</span>
      <button className="secondary-button" onClick={exportBackup} type="button">Export backup</button>
      <label className="secondary-button import-label" htmlFor="importData">Import backup</label>
      <input
        accept="application/json"
        className="backup-import"
        id="importData"
        onChange={(event) => void importBackup(event)}
        ref={inputRef}
        type="file"
      />
      <span className="hint" id="backupStatus">{status}</span>
    </div>
  );
}
