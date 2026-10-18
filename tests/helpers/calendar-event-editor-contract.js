const FONT_FAMILY = 'ui-rounded, "SF Pro Rounded", Nunito, "Avenir Next", -apple-system, "system-ui", "Segoe UI", system-ui, sans-serif';

function expectedEditorState() {
  return {
    category: "Study/school",
    date: "2026-09-14",
    effort: "standard",
    end: "",
    events: [
      {
        actions: ["Move or shorten", "Remove"],
        className: "selected-event transcendence-block",
        note: "Finish the bridge",
        tag: "Transcendence",
        title: "09:00–10:30 · 1h 30m  Deep work"
      },
      {
        actions: ["Move or shorten", "Remove"],
        className: "selected-event chores-block",
        note: "",
        tag: "Chores/groceries",
        title: "12:00 · Reminder  Lunch reminder"
      }
    ],
    formHint: "Selected: 2026-09-14",
    heading: "Mon Sep 14",
    loadPreview: "Add a valid start and end time to see this activity's load.",
    note: "",
    pickerHidden: true,
    reminderOnly: false,
    saveLabel: "Save activity",
    start: "",
    status: "1.5 / 7 load hours planned · 5.5 left.",
    title: ""
  };
}

function visualBox(overrides) {
  return {
    background: "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box",
    border: "0px none rgb(23, 24, 32)",
    borderRadius: "0px",
    color: "rgb(23, 24, 32)",
    display: "block",
    fontFamily: FONT_FAMILY,
    fontSize: "16px",
    fontWeight: "410",
    gap: "normal",
    height: 0,
    padding: "0px",
    width: 0,
    ...overrides
  };
}

function expectedEditorVisual(mobile) {
  const contentWidth = mobile ? 316 : 854;
  return {
    card: visualBox({
      background: "rgba(0, 0, 0, 0) none repeat scroll 0px 0px / auto padding-box border-box",
      borderRadius: "18px",
      height: mobile ? 1244.625 : 1101.797,
      width: contentWidth
    }),
    event: visualBox({
      background: "rgba(0, 0, 0, 0) linear-gradient(rgba(244, 248, 255, 0.96), rgba(229, 238, 252, 0.9)) repeat scroll 0% 0% / auto padding-box border-box",
      border: "1px solid rgba(185, 206, 240, 0.75)",
      borderRadius: "14px",
      color: "rgb(113, 141, 185)",
      display: "grid",
      gap: mobile ? "5px" : "6px 8px",
      height: mobile ? 131.719 : 107.531,
      padding: mobile ? "8px" : "9px 10px",
      width: mobile ? 316 : 850
    }),
    form: visualBox({
      display: "grid",
      gap: "8px",
      height: mobile ? 779.875 : 758.547,
      width: contentWidth
    }),
    input: visualBox({
      background: "rgba(255, 255, 255, 0.72) none repeat scroll 0% 0% / auto padding-box border-box",
      border: "1px solid rgba(185, 206, 240, 0.46)",
      borderRadius: "15px",
      color: "rgb(45, 47, 43)",
      fontWeight: "430",
      height: 42,
      padding: "9px 12px",
      width: contentWidth
    }),
    panel: visualBox({
      background: "rgba(0, 0, 0, 0) none repeat scroll 0px 0px / auto padding-box border-box",
      border: "",
      display: "grid",
      gap: "12px",
      height: mobile ? 1244.625 : 1101.797,
      padding: "20px 0px 0px",
      width: contentWidth
    }),
    preview: visualBox({
      background: "rgba(0, 0, 0, 0) linear-gradient(110deg, rgba(234, 250, 248, 0.72), rgba(255, 252, 232, 0.68)) repeat scroll 0% 0% / auto padding-box border-box",
      border: "1px solid rgba(157, 212, 204, 0.52)",
      borderRadius: "14px",
      color: "rgb(83, 125, 121)",
      fontSize: "14.72px",
      height: mobile ? 66.656 : 45.328,
      padding: "11px 13px",
      width: contentWidth
    }),
    status: visualBox({
      border: "0px none rgb(118, 118, 129)",
      color: "rgb(118, 118, 129)",
      fontWeight: "450",
      height: 23.188,
      width: 260.625
    })
  };
}

module.exports = { expectedEditorState, expectedEditorVisual };
