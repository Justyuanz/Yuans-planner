import { useMemo, useState } from "react";

import type { PlannerStore } from "../../api/planner-store";
import { buildJournalArchive } from "./journal-archive";

interface JournalArchiveCardProps {
  onOpenJournalDate: (date: string) => void;
  selectedDate: string;
  store: PlannerStore;
}

export function JournalArchiveCard({
  onOpenJournalDate,
  selectedDate,
  store
}: JournalArchiveCardProps) {
  const [query, setQuery] = useState("");
  const model = useMemo(
    () => buildJournalArchive(store, selectedDate, query),
    [query, selectedDate, store]
  );

  return (
    <>
      <div className="section-head">
        <div>
          <h3>Old journals</h3>
          <p className="small-note">Come back to a date, a feeling, or a few remembered words.</p>
        </div>
      </div>

      <label className="form-row journal-search-row" htmlFor="journalSearch">
        <span>What are you trying to find?</span>
        <input
          autoComplete="off"
          id="journalSearch"
          maxLength={80}
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="Search by feeling, date, or phrase"
          value={query}
        />
      </label>

      <div className="journal-archive-list" id="journalArchiveList" aria-live="polite">
        {model.items.length === 0 ? (
          <p className="journal-empty-state">{model.emptyText}</p>
        ) : model.items.map((item, index) => (
          <button
            className={`journal-entry-card${item.active ? " active" : ""}`}
            key={`${item.id}:${index}`}
            onClick={() => onOpenJournalDate(item.date)}
            type="button"
          >
            <div className="journal-entry-card-head">
              <strong>{item.title}</strong>
              <span>{item.dateLabel}</span>
            </div>
            {item.meta && <p className="journal-entry-meta">{item.meta}</p>}
            <p className="journal-entry-preview">{item.preview}</p>
          </button>
        ))}
      </div>
    </>
  );
}

