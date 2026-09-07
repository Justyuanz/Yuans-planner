(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.YuanMindCore = factory();
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function minutes(value) {
    var number = Number(value);
    return Number.isFinite(number) ? Math.max(0, Math.min(1440, number)) : 0;
  }
  function localDate(stamp) {
    var date = new Date(stamp);
    if (!Number.isFinite(date.getTime())) return "";
    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
  }
  function sessionHours(sessions, start, end) {
    return (Array.isArray(sessions) ? sessions : []).reduce(function (sum, session) {
      if (!session || session.trackedInTask || !session.finishedAt) return sum;
      var date = session.dateKey || localDate(session.finishedAt);
      var hours = Number(session.durationHours);
      return date && (!start || date >= start) && (!end || date <= end) && Number.isFinite(hours)
        ? sum + Math.max(0, hours) : sum;
    }, 0);
  }
  function finishMeditation(state, now) {
    if (!state.active || now < state.active.endsAt) return state;
    var active = state.active;
    return { active: null, sessions: (state.sessions || []).concat({
      id: active.id, dateKey: active.dateKey, startedAt: new Date(active.startedAt).toISOString(),
      finishedAt: new Date(active.endsAt).toISOString(), durationHours: active.minutes / 60
    }) };
  }
  return { minutes: minutes, sessionHours: sessionHours, finishMeditation: finishMeditation };
}));
