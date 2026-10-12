// Pinned task-card contract. The computed styles, geometry, and rendered-image
// signature were captured from the standalone legacy page while it was still
// the live visual reference, so the production React route keeps protecting the
// same rendering without starting the legacy server.

function taskContract() {
  return `(() => {
    const root = document;
    const view = root.defaultView;
    const card = root.querySelector(".tasks-card");
    const rows = [...root.querySelectorAll(".task-card")];
    const pick = (element) => {
      const style = view.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        background: style.background,
        border: style.border,
        borderRadius: style.borderRadius,
        display: style.display,
        gap: style.gap,
        height: rect.height,
        padding: style.padding,
        width: rect.width
      };
    };
    return {
      card: pick(card),
      form: pick(root.getElementById("taskForm")),
      rows: rows.map((row) => ({
        text: row.textContent.replace(/\\s+/g, " ").trim(),
        visual: pick(row)
      }))
    };
  })()`;
}

function clipExpression() {
  return `(() => {
    const rect = document.querySelector(".tasks-card").getBoundingClientRect();
    return {
      x: rect.x + window.scrollX,
      y: rect.y + window.scrollY,
      width: rect.width,
      height: Math.min(rect.height, 680)
    };
  })()`;
}

function expectedTaskContract(mobile) {
  return mobile
    ? {
        card: {
          background: "rgba(255, 255, 255, 0.86) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "0px none rgb(23, 24, 32)",
          borderRadius: "18px",
          display: "block",
          gap: "normal",
          height: 712.859375,
          padding: "0px",
          width: 370
        },
        form: {
          background: "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "",
          borderRadius: "0px",
          display: "grid",
          gap: "10px",
          height: 55,
          padding: "10px 0px 0px",
          width: 338
        },
        rows: [
          {
            text: "09:30 Build the task boundaryTranscendenceHours1:15:00StartEnd×",
            visual: {
              background: "rgba(255, 255, 255, 0.72) none repeat scroll 0% 0% / auto padding-box border-box",
              border: "1px solid rgb(236, 236, 241)",
              borderRadius: "15px",
              display: "grid",
              gap: "6px 9px",
              height: 125.28125,
              padding: "8px 9px",
              width: 336
            }
          },
          {
            text: "Call the dentistOtherHours0:00StartEnd×",
            visual: {
              background: "rgba(255, 255, 255, 0.72) none repeat scroll 0% 0% / auto padding-box border-box",
              border: "1px solid rgb(236, 236, 241)",
              borderRadius: "15px",
              display: "grid",
              gap: "6px 9px",
              height: 125.28125,
              padding: "8px 9px",
              width: 336
            }
          }
        ]
      }
    : {
        card: {
          background: "rgba(255, 255, 255, 0.86) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "0px none rgb(23, 24, 32)",
          borderRadius: "18px",
          display: "block",
          gap: "normal",
          height: 557.109375,
          padding: "0px",
          width: 940
        },
        form: {
          background: "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "",
          borderRadius: "0px",
          display: "grid",
          gap: "10px",
          height: 55,
          padding: "10px 0px 0px",
          width: 892
        },
        rows: [
          {
            text: "09:30 Build the task boundaryTranscendenceHours1:15:00StartEnd×",
            visual: {
              background: "rgba(255, 255, 255, 0.72) none repeat scroll 0% 0% / auto padding-box border-box",
              border: "1px solid rgb(236, 236, 241)",
              borderRadius: "15px",
              display: "grid",
              gap: "12px",
              height: 71.28125,
              padding: "9px 12px",
              width: 890
            }
          },
          {
            text: "Call the dentistOtherHours0:00StartEnd×",
            visual: {
              background: "rgba(255, 255, 255, 0.72) none repeat scroll 0% 0% / auto padding-box border-box",
              border: "1px solid rgb(236, 236, 241)",
              borderRadius: "15px",
              display: "grid",
              gap: "12px",
              height: 71.28125,
              padding: "9px 12px",
              width: 890
            }
          }
        ]
      };
}

// Coarse 8x8 RGB tiles of the rendered task card. This keeps screen-level
// visual coverage without storing a legacy PNG or re-rendering the legacy page.
const DESKTOP_SCREENSHOT_TILES = [
  [234, 233, 235], [240, 239, 240], [254, 253, 254], [254, 253, 254],
  [253, 253, 253], [253, 253, 253], [248, 247, 248], [248, 247, 248],
  [234, 242, 244], [236, 245, 246], [243, 251, 248], [244, 250, 245],
  [245, 250, 243], [247, 250, 239], [245, 247, 237], [241, 243, 242],
  [244, 243, 245], [243, 241, 246], [248, 247, 247], [254, 253, 253],
  [255, 254, 254], [255, 254, 254], [255, 254, 254], [254, 253, 253],
  [237, 246, 247], [233, 243, 243], [237, 245, 242], [245, 251, 245],
  [246, 250, 242], [247, 250, 239], [242, 246, 239], [245, 247, 240],
  [242, 245, 247], [231, 235, 235], [238, 243, 241], [248, 252, 249],
  [248, 251, 247], [247, 249, 243], [247, 248, 245], [251, 250, 242],
  [249, 247, 249], [246, 245, 248], [252, 252, 253], [251, 253, 254],
  [250, 253, 253], [248, 250, 249], [247, 248, 249], [252, 250, 245],
  [247, 245, 246], [250, 248, 250], [252, 253, 253], [252, 253, 253],
  [252, 253, 253], [250, 250, 250], [245, 245, 250], [251, 248, 243],
  [248, 247, 249], [246, 245, 247], [248, 247, 249], [253, 252, 254],
  [245, 244, 246], [252, 251, 253], [250, 250, 251], [245, 244, 254]
];

const MOBILE_SCREENSHOT_TILES = [
  [238, 239, 241], [229, 232, 234], [226, 229, 229], [247, 249, 248],
  [244, 245, 243], [240, 241, 243], [240, 240, 242], [247, 246, 245],
  [246, 248, 249], [236, 239, 240], [237, 239, 239], [243, 245, 243],
  [251, 252, 249], [247, 248, 249], [246, 247, 248], [251, 251, 249],
  [252, 251, 251], [243, 242, 242], [243, 242, 253], [250, 249, 252],
  [252, 251, 250], [249, 248, 248], [255, 254, 254], [254, 253, 253],
  [238, 248, 249], [225, 240, 239], [225, 239, 235], [226, 239, 232],
  [231, 241, 230], [233, 241, 224], [238, 244, 221], [248, 249, 233],
  [251, 251, 252], [237, 239, 241], [232, 235, 236], [236, 239, 238],
  [237, 239, 237], [237, 240, 236], [248, 249, 244], [251, 250, 247],
  [253, 251, 253], [246, 246, 247], [252, 252, 253], [251, 253, 254],
  [247, 249, 249], [241, 241, 253], [249, 246, 237], [252, 251, 247],
  [248, 250, 249], [242, 240, 242], [243, 243, 245], [246, 248, 249],
  [252, 253, 253], [250, 251, 253], [253, 252, 248], [252, 251, 249],
  [253, 252, 253], [248, 248, 249], [250, 250, 251], [248, 248, 249],
  [249, 249, 250], [238, 237, 247], [244, 240, 242], [247, 245, 250]
];

function expectedTaskScreenshot(mobile) {
  return mobile
    ? { height: 680, tiles: MOBILE_SCREENSHOT_TILES, width: 370 }
    : { height: 557, tiles: DESKTOP_SCREENSHOT_TILES, width: 940 };
}

module.exports = {
  clipExpression,
  expectedTaskContract,
  expectedTaskScreenshot,
  taskContract
};

