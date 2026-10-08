import type { KeyboardEvent } from "react";

import type { PlannerStore } from "../../api/planner-store";
import {
  buildCalendarMonth,
  dateFromKey,
  type CalendarMonthCell
} from "./calendar-month";

interface MonthlyCalendarCardProps {
  cursorDate: string;
  onEditEvent: (eventId: string, date: string) => void;
  onSelectDate: (date: string) => void;
  onShiftMonth: (amount: number) => void;
  selectedDate: string;
  store: PlannerStore;
  today: Date;
}

function activateCell(event: KeyboardEvent<HTMLDivElement>, cell: CalendarMonthCell, onSelectDate: (date: string) => void): void {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  onSelectDate(cell.date);
}

export function MonthlyCalendarCard({
  cursorDate,
  onEditEvent,
  onSelectDate,
  onShiftMonth,
  selectedDate,
  store,
  today
}: MonthlyCalendarCardProps) {
  const model = buildCalendarMonth(store, dateFromKey(cursorDate), selectedDate, today);
  return (
    <>
      <div className="calendar-toolbar">
        <div className="section-head calendar-section-head">
          <h2>Monthly calendar</h2>
          <p className="small-note" id="currentMonthLabel">{model.label}</p>
        </div>
        <div className="month-controls" aria-label="Month controls">
          <button className="icon-button" id="prevMonth" aria-label="Previous month" onClick={() => onShiftMonth(-1)} type="button">‹</button>
          <button className="icon-button" id="nextMonth" aria-label="Next month" onClick={() => onShiftMonth(1)} type="button">›</button>
        </div>
      </div>
      <div className="calendar-grid" id="calendarGrid" aria-label="Monthly calendar">
        {model.weekdays.map((weekday) => <div className="weekday" key={weekday}>{weekday}</div>)}
        {model.cells.map((cell) => (
          <div
            aria-label={cell.ariaLabel}
            className={cell.className}
            key={cell.date}
            onClick={() => onSelectDate(cell.date)}
            onKeyDown={(event) => activateCell(event, cell, onSelectDate)}
            role="button"
            tabIndex={0}
          >
            <div className="day-number">
              {cell.dayNumber}
              {cell.today && <span className="today-mark" aria-label="Today" />}
            </div>
            <div className="event-pills">
              {cell.pills.map((pill, index) => (
                <button
                  className={`event-pill ${pill.categoryClass}`}
                  key={`${pill.eventId}:${index}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onEditEvent(pill.eventId, pill.date);
                  }}
                  title={pill.title}
                  type="button"
                >
                  {pill.startLabel && <span className="event-pill-start">{pill.startLabel}</span>}
                  <span className="event-pill-name">{pill.label}</span>
                </button>
              ))}
              {cell.moreCount > 0 && <span className="event-pill more-pill">+{cell.moreCount} more</span>}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
