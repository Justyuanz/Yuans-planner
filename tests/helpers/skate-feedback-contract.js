// Pinned Skate feedback dialog contract. The state, computed styles, geometry,
// and rendered-image signature were captured from the standalone legacy page
// while it was still the live visual reference, so the production React route
// keeps protecting the same rendering without starting the legacy server.

function feedbackState() {
  return `(() => {
    const documentRoot = document;
    const dialog = documentRoot.getElementById("skateFeedbackDialog");
    const form = documentRoot.getElementById("skateFeedbackForm");
    return {
      cancel: documentRoot.getElementById("cancelSkateFeedback").textContent.trim(),
      confidence: [...documentRoot.querySelectorAll('input[name="confidence"]')].map((input) => ({
        checked: input.checked,
        text: input.nextElementSibling.textContent.trim(),
        type: input.type,
        value: input.value
      })),
      date: documentRoot.getElementById("skateSessionDate").value,
      dialogClass: dialog.className,
      duration: {
        inputMode: documentRoot.getElementById("skateDurationMinutes").inputMode,
        max: documentRoot.getElementById("skateDurationMinutes").max,
        min: documentRoot.getElementById("skateDurationMinutes").min,
        placeholder: documentRoot.getElementById("skateDurationMinutes").placeholder,
        step: documentRoot.getElementById("skateDurationMinutes").step,
        value: documentRoot.getElementById("skateDurationMinutes").value
      },
      formClass: form.className,
      heading: form.querySelector("h2").textContent.trim(),
      improvedMaxLength: documentRoot.getElementById("skateImprovedNote").maxLength,
      intensities: [...documentRoot.querySelectorAll("#skateFeedbackIntensity button")].map((button) => ({
        active: button.classList.contains("active"),
        intensity: button.dataset.intensity,
        pressed: button.getAttribute("aria-pressed"),
        text: button.textContent.trim(),
        type: button.type
      })),
      nextMaxLength: documentRoot.getElementById("skateNextFocusNote").maxLength,
      progress: [...documentRoot.querySelectorAll('input[name="progressToday"]')].map((input) => ({
        checked: input.checked,
        text: input.nextElementSibling.textContent.trim(),
        type: input.type,
        value: input.value
      })),
      save: form.querySelector('button[type="submit"]').textContent.trim(),
      subtitle: form.querySelector(".section-head p").textContent.trim()
    };
  })()`;
}

function feedbackVisualContract() {
  return `(() => {
    const documentRoot = document;
    const view = documentRoot.defaultView;
    const pick = (element) => {
      const rect = element.getBoundingClientRect();
      const style = view.getComputedStyle(element);
      const dimension = (value) => Math.round(value * 1000) / 1000;
      return {
        background: style.background,
        border: style.border,
        borderRadius: style.borderRadius,
        boxShadow: style.boxShadow,
        color: style.color,
        display: style.display,
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        gap: style.gap,
        height: dimension(rect.height),
        padding: style.padding,
        width: dimension(rect.width)
      };
    };
    const dialog = documentRoot.getElementById("skateFeedbackDialog");
    const form = documentRoot.getElementById("skateFeedbackForm");
    return {
      dialog: pick(dialog),
      duration: pick(documentRoot.getElementById("skateDurationMinutes")),
      form: pick(form),
      intensity: pick(documentRoot.querySelector("#skateFeedbackIntensity button")),
      note: pick(documentRoot.getElementById("skateImprovedNote")),
      save: pick(form.querySelector('.primary-button')),
      scale: pick(documentRoot.querySelector(".scale-option span")),
      scales: pick(documentRoot.querySelector(".scale-options"))
    };
  })()`;
}

function dialogClip() {
  return `(() => {
    const documentRoot = document;
    const rect = documentRoot.getElementById("skateFeedbackDialog").getBoundingClientRect();
    const viewportWidth = documentRoot.defaultView.innerWidth;
    const viewportHeight = documentRoot.defaultView.innerHeight;
    const x = Math.max(0, rect.x);
    const y = Math.max(0, rect.y);
    return {
      x,
      y,
      width: Math.min(rect.width, viewportWidth - x),
      height: Math.min(rect.height, viewportHeight - y)
    };
  })()`;
}

// The dialog needs one paint before it is measured or captured.
function settleDialog() {
  return "new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))";
}

// The production CSS minifier rewrites equivalent gradient syntax (a zero
// position loses its percent sign and `to right` becomes `90deg`), so the
// pinned values below use the built serialization. The dialog's own background
// shorthand is minified the same way, which makes Chrome serialize its
// background position as `0px 0px` instead of `0% 0%`; with no background image
// to position, the two are the same rendering.
function expectedSkateFeedbackState() {
  return {
    cancel: "Not now",
    confidence: [
      {
        checked: false,
        text: "1 scared",
        type: "radio",
        value: "1"
      },
      {
        checked: false,
        text: "2 hesitant",
        type: "radio",
        value: "2"
      },
      {
        checked: true,
        text: "3 normal",
        type: "radio",
        value: "3"
      },
      {
        checked: false,
        text: "4 confident",
        type: "radio",
        value: "4"
      },
      {
        checked: false,
        text: "5 very free",
        type: "radio",
        value: "5"
      }
    ],
    date: "2026-09-14",
    dialogClass: "feedback-dialog",
    duration: {
      inputMode: "numeric",
      max: "600",
      min: "1",
      placeholder: "45",
      step: "1",
      value: "45"
    },
    formClass: "feedback-panel",
    heading: "Quick check-in",
    improvedMaxLength: 220,
    intensities: [
      {
        active: false,
        intensity: "blue",
        pressed: "false",
        text: "Blue",
        type: "button"
      },
      {
        active: false,
        intensity: "yellow",
        pressed: "false",
        text: "Yellow",
        type: "button"
      },
      {
        active: true,
        intensity: "green",
        pressed: "true",
        text: "Green",
        type: "button"
      }
    ],
    nextMaxLength: 220,
    progress: [
      {
        checked: false,
        text: "1 stuck",
        type: "radio",
        value: "1"
      },
      {
        checked: false,
        text: "2 small win",
        type: "radio",
        value: "2"
      },
      {
        checked: true,
        text: "3 moving",
        type: "radio",
        value: "3"
      },
      {
        checked: false,
        text: "4 solid",
        type: "radio",
        value: "4"
      },
      {
        checked: false,
        text: "5 breakthrough",
        type: "radio",
        value: "5"
      }
    ],
    save: "Save session",
    subtitle: "Capture what changed, not a diary entry."
  };
}

function expectedSkateFeedbackVisual(mobile) {
  return mobile
    ? {
        dialog: {
          background: "rgba(0, 0, 0, 0) none repeat scroll 0px 0px / auto padding-box border-box",
          border: "1px solid rgba(126, 116, 255, 0.28)",
          borderRadius: "18px",
          boxShadow: "rgba(114, 99, 135, 0.22) 0px 28px 80px 0px",
          color: "rgb(0, 0, 0)",
          display: "block",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "410",
          gap: "normal",
          height: 806,
          padding: "0px",
          width: 352
        },
        duration: {
          background: "rgba(255, 255, 255, 0.72) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "1px solid rgb(139, 134, 255)",
          borderRadius: "15px",
          boxShadow: "rgba(126, 121, 255, 0.14) 0px 0px 0px 4px",
          color: "rgb(45, 47, 43)",
          display: "block",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "430",
          gap: "normal",
          height: 42,
          padding: "9px 12px",
          width: 314
        },
        form: {
          background: "radial-gradient(circle at 0px 0px, rgba(245, 202, 221, 0.2), rgba(0, 0, 0, 0) 34%) repeat scroll 0% 0% / auto padding-box border-box, rgba(255, 255, 255, 0.94) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "0px none rgb(0, 0, 0)",
          borderRadius: "18px",
          boxShadow: "none",
          color: "rgb(0, 0, 0)",
          display: "grid",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "410",
          gap: "14px",
          height: 1203.438,
          padding: "18px",
          width: 350
        },
        intensity: {
          background: "rgba(255, 255, 255, 0.78) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "1px solid rgba(185, 206, 240, 0.46)",
          borderRadius: "999px",
          boxShadow: "none",
          color: "rgb(81, 96, 114)",
          display: "block",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "550",
          gap: "normal",
          height: 38,
          padding: "1px 6px",
          width: 90.656
        },
        note: {
          background: "rgba(255, 255, 255, 0.72) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "1px solid rgba(185, 206, 240, 0.46)",
          borderRadius: "15px",
          boxShadow: "none",
          color: "rgb(45, 47, 43)",
          display: "block",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "430",
          gap: "normal",
          height: 60,
          padding: "9px 12px",
          width: 314
        },
        save: {
          background: "rgb(240, 246, 211) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "0px none rgb(102, 118, 67)",
          borderRadius: "12px",
          boxShadow: "none",
          color: "rgb(102, 118, 67)",
          display: "block",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "510",
          gap: "normal",
          height: 42,
          padding: "9px 15px",
          width: 123.234
        },
        scale: {
          background: "rgba(255, 255, 255, 0.72) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "1px solid rgba(224, 219, 209, 0.72)",
          borderRadius: "999px",
          boxShadow: "none",
          color: "rgb(118, 118, 129)",
          display: "grid",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "12.48px",
          fontWeight: "510",
          gap: "normal",
          height: 36,
          padding: "6px",
          width: 288
        },
        scales: {
          background: "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "0px none rgb(0, 0, 0)",
          borderRadius: "0px",
          boxShadow: "none",
          color: "rgb(0, 0, 0)",
          display: "grid",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "410",
          gap: "6px",
          height: 204,
          padding: "0px",
          width: 288
        }
      }
    : {
        dialog: {
          background: "rgba(0, 0, 0, 0) none repeat scroll 0px 0px / auto padding-box border-box",
          border: "1px solid rgba(126, 116, 255, 0.28)",
          borderRadius: "18px",
          boxShadow: "rgba(114, 99, 135, 0.22) 0px 28px 80px 0px",
          color: "rgb(0, 0, 0)",
          display: "block",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "410",
          gap: "normal",
          height: 842.5,
          padding: "0px",
          width: 680
        },
        duration: {
          background: "rgba(255, 255, 255, 0.72) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "1px solid rgb(139, 134, 255)",
          borderRadius: "15px",
          boxShadow: "rgba(126, 121, 255, 0.14) 0px 0px 0px 4px",
          color: "rgb(45, 47, 43)",
          display: "block",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "430",
          gap: "normal",
          height: 42,
          padding: "9px 12px",
          width: 630
        },
        form: {
          background: "radial-gradient(circle at 0px 0px, rgba(245, 202, 221, 0.2), rgba(0, 0, 0, 0) 34%) repeat scroll 0% 0% / auto padding-box border-box, rgba(255, 255, 255, 0.94) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "0px none rgb(0, 0, 0)",
          borderRadius: "18px",
          boxShadow: "none",
          color: "rgb(0, 0, 0)",
          display: "grid",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "410",
          gap: "14px",
          height: 840.5,
          padding: "24px",
          width: 678
        },
        intensity: {
          background: "rgba(255, 255, 255, 0.78) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "1px solid rgba(185, 206, 240, 0.46)",
          borderRadius: "999px",
          boxShadow: "none",
          color: "rgb(81, 96, 114)",
          display: "block",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "550",
          gap: "normal",
          height: 38,
          padding: "1px 6px",
          width: 196
        },
        note: {
          background: "rgba(255, 255, 255, 0.72) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "1px solid rgba(185, 206, 240, 0.46)",
          borderRadius: "15px",
          boxShadow: "none",
          color: "rgb(45, 47, 43)",
          display: "block",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "430",
          gap: "normal",
          height: 60,
          padding: "9px 12px",
          width: 630
        },
        save: {
          background: "rgb(240, 246, 211) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "0px none rgb(102, 118, 67)",
          borderRadius: "12px",
          boxShadow: "none",
          color: "rgb(102, 118, 67)",
          display: "block",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "510",
          gap: "normal",
          height: 42,
          padding: "9px 15px",
          width: 123.234
        },
        scale: {
          background: "rgba(255, 255, 255, 0.72) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "1px solid rgba(224, 219, 209, 0.72)",
          borderRadius: "999px",
          boxShadow: "none",
          color: "rgb(118, 118, 129)",
          display: "grid",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "12.48px",
          fontWeight: "510",
          gap: "normal",
          height: 36,
          padding: "6px",
          width: 116
        },
        scales: {
          background: "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "0px none rgb(0, 0, 0)",
          borderRadius: "0px",
          boxShadow: "none",
          color: "rgb(0, 0, 0)",
          display: "grid",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "410",
          gap: "6px",
          height: 36,
          padding: "0px",
          width: 604
        }
      };
}

// Coarse 8x8 RGB tiles of the rendered card. This keeps screen-level visual
// coverage without storing a legacy PNG or re-rendering the legacy page.
const DESKTOP_SCREENSHOT_TILES = [
  [233, 225, 230], [231, 225, 229], [246, 242, 244], [251, 249, 250],
  [247, 247, 248], [246, 246, 247], [246, 246, 247], [246, 246, 248],
  [242, 238, 243], [247, 245, 250], [249, 248, 252], [249, 249, 253],
  [249, 249, 253], [249, 249, 253], [249, 249, 253], [247, 247, 251],
  [242, 241, 242], [238, 238, 239], [253, 252, 253], [250, 251, 251],
  [251, 251, 252], [246, 250, 247], [240, 247, 241], [246, 249, 247],
  [243, 243, 244], [239, 239, 240], [248, 248, 248], [248, 248, 247],
  [249, 249, 249], [251, 252, 251], [250, 252, 250], [250, 251, 251],
  [245, 245, 246], [243, 243, 244], [249, 249, 249], [247, 249, 239],
  [247, 249, 239], [249, 249, 249], [250, 250, 250], [250, 250, 251],
  [245, 245, 246], [242, 242, 243], [246, 245, 246], [245, 246, 241],
  [246, 247, 242], [251, 251, 251], [250, 250, 251], [250, 250, 251],
  [246, 245, 247], [245, 245, 245], [244, 244, 245], [248, 248, 248],
  [248, 248, 248], [248, 248, 248], [251, 251, 252], [251, 251, 253],
  [244, 246, 237], [244, 246, 237], [242, 241, 254], [251, 251, 253],
  [251, 251, 253], [251, 251, 253], [251, 251, 253], [249, 249, 252]
];

const MOBILE_SCREENSHOT_TILES = [
  [231, 224, 230], [228, 221, 226], [245, 239, 243], [239, 234, 238],
  [240, 236, 240], [245, 242, 245], [245, 243, 245], [239, 238, 240],
  [239, 235, 242], [238, 235, 241], [245, 241, 247], [246, 243, 249],
  [249, 246, 251], [249, 247, 252], [249, 247, 252], [240, 239, 244],
  [244, 242, 244], [233, 232, 233], [237, 236, 237], [246, 246, 247],
  [252, 251, 253], [251, 251, 251], [248, 249, 248], [240, 240, 242],
  [248, 247, 249], [237, 237, 239], [243, 243, 244], [243, 244, 245],
  [245, 245, 246], [238, 244, 239], [237, 244, 238], [242, 243, 243],
  [248, 248, 249], [242, 242, 242], [245, 244, 245], [243, 243, 244],
  [250, 250, 250], [253, 253, 253], [253, 253, 253], [244, 243, 245],
  [250, 250, 249], [248, 251, 238], [248, 251, 238], [240, 242, 230],
  [238, 241, 228], [248, 251, 238], [248, 251, 238], [247, 248, 246],
  [247, 247, 248], [243, 243, 243], [244, 243, 244], [248, 248, 248],
  [250, 249, 250], [253, 253, 253], [253, 253, 253], [251, 250, 252],
  [249, 249, 249], [251, 252, 248], [251, 252, 249], [246, 247, 244],
  [246, 246, 243], [251, 252, 249], [251, 252, 249], [249, 249, 250]
];

function expectedSkateFeedbackScreenshot(mobile) {
  return mobile
    ? { height: 806, tiles: MOBILE_SCREENSHOT_TILES, width: 352 }
    : { height: 842, tiles: DESKTOP_SCREENSHOT_TILES, width: 680 };
}

module.exports = {
  dialogClip,
  expectedSkateFeedbackScreenshot,
  expectedSkateFeedbackState,
  expectedSkateFeedbackVisual,
  feedbackState,
  feedbackVisualContract,
  settleDialog
};
