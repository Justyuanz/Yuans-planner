// Pinned direct Journal page contract. The state, geometry, and rendered-image
// signature were captured from the standalone legacy page while it was still
// the live visual reference, so the production React route keeps protecting the
// same screen without starting the legacy server.

function journalPageState() {
  return `(() => ({
    activeTab: document.querySelector(".tab-button.active")?.textContent.trim(),
    activeView: document.querySelector(".view.active")?.id,
    archiveCount: document.querySelectorAll("#journalArchiveList .journal-entry-card").length,
    content: document.getElementById("journalContent")?.value,
    date: document.getElementById("journalDate")?.value,
    dateLabel: document.getElementById("journalDateLabel")?.textContent.trim(),
    energy: document.querySelector("#journalEnergyOptions .is-active")?.dataset.energyState || "",
    focus: document.querySelector("#journalFocusOptions .is-active")?.dataset.focusState || "",
    iframeCount: document.querySelectorAll("iframe").length,
    meditation: document.getElementById("meditationStatus")?.textContent.trim(),
    minutes: document.getElementById("journalMinutes")?.value,
    title: document.getElementById("journalTitle")?.value
  }))()`;
}

function journalPageGeometry() {
  return `(() => {
    const rect = (selector) => {
      const value = document.querySelector(selector).getBoundingClientRect();
      return { height: value.height, width: value.width, x: value.x, y: value.y };
    };
    return {
      archive: rect(".journal-archive-card"),
      editor: rect(".journal-editor-card"),
      journalPage: rect(".journal-page"),
      meditation: rect(".meditation-card"),
      paper: rect(".journal-paper"),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
    };
  })()`;
}

function editorClip() {
  return `(() => {
    const rect = document.querySelector(".journal-editor-card").getBoundingClientRect();
    return { height: rect.height, width: rect.width, x: rect.x, y: rect.y };
  })()`;
}

function expectedJournalPageState() {
  return {
    activeTab: "Journal",
    activeView: "journalView",
    archiveCount: 2,
    content: "I felt calm.\nThen I took a walk.",
    date: "2026-09-14",
    dateLabel: "Mon, September 14, 2026",
    energy: "good",
    focus: "clear",
    iframeCount: 0,
    meditation: "30 min saved for Mon Sep 14.",
    minutes: "15",
    title: "Soft start"
  };
}

function expectedJournalPageGeometry(mobile) {
  return mobile
    ? {
          archive: {
            height: 415.03125,
            width: 370,
            x: 10,
            y: 1848.21875
          },
          editor: {
            height: 1549.96875,
            width: 370,
            x: 10,
            y: 276.25
          },
          journalPage: {
            height: 2009,
            width: 370,
            x: 10,
            y: 254.25
          },
          meditation: {
            height: 272.34375,
            width: 338,
            x: 26,
            y: 419.4375
          },
          overflow: false,
          paper: {
            height: 1078.4375,
            width: 338,
            x: 26,
            y: 731.78125
          }
        }
    : {
          archive: {
            height: 415.90625,
            width: 940,
            x: 275,
            y: 1658.5625
          },
          editor: {
            height: 1418.09375,
            width: 940,
            x: 275,
            y: 218.46875
          },
          journalPage: {
            height: 1856,
            width: 940,
            x: 275,
            y: 218.46875
          },
          meditation: {
            height: 196.578125,
            width: 892,
            x: 299,
            y: 319.28125
          },
          overflow: false,
          paper: {
            height: 1056.703125,
            width: 892,
            x: 299,
            y: 555.859375
          }
        };
}

// Coarse 8x8 RGB tiles of the rendered editor card. This keeps screen-level
// visual coverage without storing a legacy PNG or re-rendering the legacy page.
const DESKTOP_SCREENSHOT_TILES = [
  [240, 239, 241], [241, 240, 242], [251, 249, 250], [252, 250, 251],
  [252, 249, 250], [248, 246, 249], [246, 244, 247], [249, 245, 246],
  [248, 245, 248], [245, 243, 245], [244, 243, 247], [249, 248, 250],
  [250, 249, 249], [249, 249, 248], [249, 247, 247], [249, 247, 246],
  [245, 238, 237], [243, 237, 235], [247, 241, 239], [250, 244, 242],
  [252, 246, 244], [252, 244, 243], [251, 234, 238], [249, 229, 236],
  [243, 220, 233], [243, 220, 233], [243, 220, 233], [243, 220, 233],
  [243, 220, 233], [243, 220, 233], [243, 220, 233], [243, 220, 233],
  [243, 220, 233], [243, 220, 233], [243, 220, 233], [243, 220, 233],
  [243, 220, 233], [243, 220, 233], [243, 220, 233], [243, 220, 233],
  [243, 220, 233], [243, 220, 233], [243, 220, 233], [243, 220, 233],
  [243, 220, 233], [243, 220, 233], [243, 220, 233], [243, 220, 233],
  [243, 220, 233], [243, 220, 233], [243, 220, 233], [243, 220, 233],
  [243, 220, 233], [243, 220, 233], [243, 220, 233], [243, 220, 233],
  [243, 220, 233], [243, 220, 233], [243, 220, 233], [243, 220, 233],
  [243, 220, 233], [243, 220, 233], [243, 220, 233], [243, 220, 233]
];

const MOBILE_SCREENSHOT_TILES = [
  [245, 241, 244], [236, 232, 235], [238, 234, 237], [242, 239, 243],
  [244, 241, 247], [242, 239, 248], [248, 245, 251], [247, 242, 247],
  [248, 246, 250], [235, 234, 245], [243, 242, 246], [245, 246, 247],
  [240, 241, 243], [240, 242, 242], [245, 247, 246], [249, 248, 248],
  [249, 245, 244], [242, 237, 237], [242, 238, 237], [243, 237, 237],
  [246, 237, 239], [250, 238, 241], [250, 234, 240], [250, 237, 241],
  [243, 220, 233], [243, 220, 233], [243, 220, 233], [243, 220, 233],
  [243, 220, 233], [243, 220, 233], [243, 220, 233], [243, 220, 233],
  [243, 220, 233], [243, 220, 233], [243, 220, 233], [243, 220, 233],
  [243, 220, 233], [243, 220, 233], [243, 220, 233], [243, 220, 233],
  [243, 220, 233], [243, 220, 233], [243, 220, 233], [243, 220, 233],
  [243, 220, 233], [243, 220, 233], [243, 220, 233], [243, 220, 233],
  [243, 220, 233], [243, 220, 233], [243, 220, 233], [243, 220, 233],
  [243, 220, 233], [243, 220, 233], [243, 220, 233], [243, 220, 233],
  [243, 220, 233], [243, 220, 233], [243, 220, 233], [243, 220, 233],
  [243, 220, 233], [243, 220, 233], [243, 220, 233], [243, 220, 233]
];

function expectedJournalPageScreenshot(mobile) {
  return mobile
    ? { height: 1549, tiles: MOBILE_SCREENSHOT_TILES, width: 370 }
    : { height: 1418, tiles: DESKTOP_SCREENSHOT_TILES, width: 940 };
}

module.exports = {
  editorClip,
  expectedJournalPageGeometry,
  expectedJournalPageScreenshot,
  expectedJournalPageState,
  journalPageGeometry,
  journalPageState
};
