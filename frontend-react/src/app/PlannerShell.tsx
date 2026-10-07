import { useState, type ReactNode } from "react";

import type { PlannerStore } from "../api/planner-store";
import { formatPlannerDate } from "../features/life-pie/life-pie-store";
import { BackupTools } from "./BackupTools";
import { PlannerMascot } from "./PlannerMascot";

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

function humanDate(date: Date): string {
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${weekdays[date.getDay()]} ${months[date.getMonth()]} ${date.getDate()}`;
}

function navigateTo(viewId: string, today: Date): void {
  const url = new URL(window.location.href);
  url.searchParams.set("date", formatPlannerDate(today));
  url.searchParams.set("view", viewId);
  window.location.assign(url);
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
              onClick={() => navigateTo(viewId, today)}
              type="button"
            >
              {label}
            </button>
          ))}
        </nav>
        <PlannerMascot
          chatOpen={chatOpen}
          onChatToggle={() => setChatOpen((open) => !open)}
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
            <BackupTools dateKey={formatPlannerDate(today)} store={store} />
          </div>
        </header>
        {children}
      </div>
    </main>
  );
}
