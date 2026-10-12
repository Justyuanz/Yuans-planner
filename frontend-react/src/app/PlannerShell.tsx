import { useState, type ReactNode } from "react";

import type { PlannerStore } from "../api/planner-store";
import { BackupTools } from "./BackupTools";
import { navigateToPlannerView } from "./planner-navigation";
import { persistPlannerWrites } from "./planner-persistence";
import { PlannerMascot } from "../mascot/PlannerMascot";
import { humanDate, toDateKey } from "../shared/planner-date";

const VIEWS = [
  ["todayView", "Dashboard"],
  ["journalView", "Journal"],
  ["moneyView", "Money"],
  ["calendarView", "Calendar"],
  ["skateView", "Skate"],
  ["guitarView", "Guitar"]
] as const;

interface PlannerShellProps {
  activeView: string;
  children: ReactNode;
  store: PlannerStore;
  today: Date;
}


export function PlannerShell({ activeView, children, store, today }: PlannerShellProps) {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <main className="app">
      <aside className="sidebar" aria-label="Planner navigation">
        <nav className="tabs" aria-label="Planner views">
          {VIEWS.map(([viewId, label]) => (
            <button
              className={`tab-button${activeView === viewId ? " active" : ""}`}
              data-view-target={viewId}
              key={viewId}
              onClick={() => navigateToPlannerView(viewId, today)}
              type="button"
            >
              {label}
            </button>
          ))}
        </nav>
        <PlannerMascot
          chatOpen={chatOpen}
          onChatToggle={() => setChatOpen((open) => !open)}
          onPersist={persistPlannerWrites}
          store={store}
          today={today}
        />
      </aside>
      <div className="workspace">
        <header className="hero">
          <div>
            <h1>Yuan's Planner</h1>
            <p className="subtitle" id="todaySubtitle">A soft little map for the shape of your day.</p>
          </div>
          <div className="top-tools" aria-label="Dashboard tools">
            <div className="date-pill" id="dashboardDate">{humanDate(today)}</div>
            <button
              className="secondary-button top-ai-button"
              onClick={() => setChatOpen((open) => !open)}
              type="button"
            >
              Ask Sprouty
            </button>
            <BackupTools dateKey={toDateKey(today)} store={store} />
          </div>
        </header>
        {children}
      </div>
    </main>
  );
}
