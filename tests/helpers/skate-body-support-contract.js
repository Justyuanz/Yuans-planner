// Pinned Skate Body support contract. The state, computed styles, geometry, and
// rendered-image signature were captured from the standalone legacy page while
// it was still the live visual reference, so the production React route keeps
// protecting the same rendering without starting the legacy server.

function bodySupportState() {
  return `(() => {
    const documentRoot = document;
    const type = documentRoot.getElementById("bodyWorkoutType");
    const minutes = documentRoot.getElementById("bodyWorkoutMinutes");
    const note = documentRoot.getElementById("bodyWorkoutName");
    return {
      button: documentRoot.querySelector("#bodyLogForm button").textContent.trim(),
      chips: [...documentRoot.querySelectorAll("#skateWeeklyMetrics .body-support-chip")].map((chip) => ({
        text: chip.textContent.trim(),
        title: chip.title
      })),
      form: {
        minutes: {
          inputMode: minutes.inputMode,
          max: minutes.max,
          min: minutes.min,
          placeholder: minutes.placeholder,
          step: minutes.step,
          type: minutes.type,
          value: minutes.value
        },
        note: {
          autocomplete: note.autocomplete,
          maxLength: note.maxLength,
          placeholder: note.placeholder,
          value: note.value
        },
        options: [...type.options].map((option) => ({ label: option.textContent, value: option.value })),
        type: type.value
      },
      heading: documentRoot.querySelector(".body-log-card h2").textContent.trim(),
      week: documentRoot.getElementById("skateWeekLabel").textContent.trim()
    };
  })()`;
}

function bodySupportVisualContract() {
  return `(() => {
    const documentRoot = document;
    const view = documentRoot.defaultView;
    const pick = (element) => {
      const rect = element.getBoundingClientRect();
      const style = view.getComputedStyle(element);
      const dimension = (value) => Math.round(value * 1000) / 1000;
      return {
        alignItems: style.alignItems,
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
        gridColumn: style.gridColumn,
        gridTemplateColumns: style.gridTemplateColumns,
        height: dimension(rect.height),
        marginTop: style.marginTop,
        padding: style.padding,
        width: dimension(rect.width)
      };
    };
    const card = documentRoot.querySelector(".body-log-card");
    const form = card.querySelector(".body-log-form");
    return {
      button: pick(form.querySelector("button")),
      card: pick(card),
      chip: pick(card.querySelector(".body-support-chip")),
      form: pick(form),
      metrics: pick(card.querySelector(".body-support-metrics")),
      minutes: pick(card.querySelector("#bodyWorkoutMinutes")),
      note: pick(card.querySelector("#bodyWorkoutName")),
      noteRow: pick(card.querySelector(".body-log-note")),
      panel: pick(card.querySelector(".panel-inner")),
      sectionHead: pick(card.querySelector(".section-head")),
      select: pick(card.querySelector("#bodyWorkoutType"))
    };
  })()`;
}

function prepareBodySupportScreenshot() {
  return `(() => {
    const documentRoot = document;
    documentRoot.documentElement.style.scrollBehavior = "auto";
    const mascot = documentRoot.querySelector(".mascot-card");
    if (mascot) mascot.style.visibility = "hidden";
    documentRoot.querySelector(".body-log-card").scrollIntoView({ block: "start" });
  })()`;
}

function cardClip() {
  return `(() => {
    const documentRoot = document;
    const rect = documentRoot.querySelector(".body-log-card").getBoundingClientRect();
    return {
      x: rect.x + documentRoot.defaultView.scrollX,
      y: rect.y + documentRoot.defaultView.scrollY,
      width: rect.width,
      height: rect.height
    };
  })()`;
}

// The production CSS minifier rewrites equivalent gradient syntax (a zero
// position loses its percent sign and `to right` becomes `90deg`), so the
// pinned values below use the built serialization.
function expectedSkateBodySupportState() {
  return {
    button: "Save body support",
    chips: [
      {
        text: "Gym2x45 min",
        title: "Leg day"
      },
      {
        text: "Other1x5 min",
        title: ""
      },
      {
        text: "Recovery1xLogged",
        title: ""
      }
    ],
    form: {
      minutes: {
        inputMode: "numeric",
        max: "600",
        min: "0",
        placeholder: "30",
        step: "5",
        type: "number",
        value: ""
      },
      note: {
        autocomplete: "off",
        maxLength: 80,
        placeholder: "Leg day, Yin yoga, ankle mobility...",
        value: ""
      },
      options: [
        {
          label: "Gym",
          value: "gym"
        },
        {
          label: "Judo",
          value: "judo"
        },
        {
          label: "Yoga",
          value: "yoga"
        },
        {
          label: "Stretch",
          value: "stretch"
        },
        {
          label: "Recovery",
          value: "recovery"
        },
        {
          label: "Walk",
          value: "walk"
        },
        {
          label: "Other",
          value: "other"
        }
      ],
      type: "gym"
    },
    heading: "Body support",
    week: "2026-W38"
  };
}

function expectedSkateBodySupportVisual(mobile) {
  return mobile
    ? {
        button: {
          alignItems: "normal",
          background: "rgb(236, 235, 255) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "0px none rgb(113, 107, 255)",
          borderRadius: "12px",
          boxShadow: "none",
          color: "rgb(113, 107, 255)",
          display: "block",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "510",
          gap: "normal",
          gridColumn: "auto",
          gridTemplateColumns: "none",
          height: 42,
          marginTop: "0px",
          padding: "9px 15px",
          width: 169.156
        },
        card: {
          alignItems: "normal",
          background: "rgba(255, 255, 255, 0.86) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "0px none rgb(23, 24, 32)",
          borderRadius: "18px",
          boxShadow: "rgba(40, 40, 55, 0.055) 0px 14px 36px 0px",
          color: "rgb(23, 24, 32)",
          display: "block",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "410",
          gap: "normal",
          gridColumn: "body",
          gridTemplateColumns: "none",
          height: 432.281,
          marginTop: "0px",
          padding: "0px",
          width: 370
        },
        chip: {
          alignItems: "center",
          background: "rgba(255, 255, 255, 0.62) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "1px solid rgba(185, 206, 240, 0.46)",
          borderRadius: "999px",
          boxShadow: "none",
          color: "rgb(90, 98, 118)",
          display: "flex",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "13.12px",
          fontWeight: "410",
          gap: "8px",
          gridColumn: "auto",
          gridTemplateColumns: "none",
          height: 30,
          marginTop: "0px",
          padding: "6px 10px",
          width: 122.875
        },
        form: {
          alignItems: "end",
          background: "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "0px none rgb(23, 24, 32)",
          borderRadius: "0px",
          boxShadow: "none",
          color: "rgb(23, 24, 32)",
          display: "grid",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "410",
          gap: "10px",
          gridColumn: "auto",
          gridTemplateColumns: "338px",
          height: 281.094,
          marginTop: "0px",
          padding: "0px",
          width: 338
        },
        metrics: {
          alignItems: "normal",
          background: "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "0px none rgb(23, 24, 32)",
          borderRadius: "0px",
          boxShadow: "none",
          color: "rgb(23, 24, 32)",
          display: "flex",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "410",
          gap: "8px",
          gridColumn: "auto",
          gridTemplateColumns: "none",
          height: 68,
          marginTop: "14px",
          padding: "0px",
          width: 338
        },
        minutes: {
          alignItems: "normal",
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
          gridColumn: "auto",
          gridTemplateColumns: "none",
          height: 42,
          marginTop: "0px",
          padding: "9px 12px",
          width: 338
        },
        note: {
          alignItems: "normal",
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
          gridColumn: "auto",
          gridTemplateColumns: "none",
          height: 42,
          marginTop: "0px",
          padding: "9px 12px",
          width: 338
        },
        noteRow: {
          alignItems: "normal",
          background: "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "0px none rgb(23, 24, 32)",
          borderRadius: "0px",
          boxShadow: "none",
          color: "rgb(23, 24, 32)",
          display: "grid",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "410",
          gap: "8px",
          gridColumn: "1 / -1",
          gridTemplateColumns: "338px",
          height: 69.031,
          marginTop: "0px",
          padding: "0px",
          width: 338
        },
        panel: {
          alignItems: "normal",
          background: "radial-gradient(circle at 100% 0px, rgba(185, 238, 238, 0.18), rgba(0, 0, 0, 0) 34%) repeat scroll 0% 0% / auto padding-box border-box, rgba(0, 0, 0, 0) linear-gradient(135deg, rgba(255, 255, 255, 0.56), rgba(247, 251, 255, 0.7), rgba(255, 250, 243, 0.6)) repeat scroll 0% 0% / auto padding-box border-box",
          border: "0px none rgb(23, 24, 32)",
          borderRadius: "18px",
          boxShadow: "none",
          color: "rgb(23, 24, 32)",
          display: "block",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "410",
          gap: "normal",
          gridColumn: "auto",
          gridTemplateColumns: "none",
          height: 432.281,
          marginTop: "0px",
          padding: "16px",
          width: 370
        },
        sectionHead: {
          alignItems: "flex-start",
          background: "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "0px none rgb(23, 24, 32)",
          borderRadius: "0px",
          boxShadow: "none",
          color: "rgb(23, 24, 32)",
          display: "flex",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "410",
          gap: "12px",
          gridColumn: "auto",
          gridTemplateColumns: "none",
          height: 23.188,
          marginTop: "0px",
          padding: "0px",
          width: 338
        },
        select: {
          alignItems: "center",
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
          gridColumn: "auto",
          gridTemplateColumns: "none",
          height: 44,
          marginTop: "0px",
          padding: "9px 12px",
          width: 338
        }
      }
    : {
        button: {
          alignItems: "normal",
          background: "rgb(236, 235, 255) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "0px none rgb(113, 107, 255)",
          borderRadius: "12px",
          boxShadow: "none",
          color: "rgb(113, 107, 255)",
          display: "block",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "510",
          gap: "normal",
          gridColumn: "auto",
          gridTemplateColumns: "none",
          height: 42,
          marginTop: "0px",
          padding: "9px 15px",
          width: 169.156
        },
        card: {
          alignItems: "normal",
          background: "rgba(255, 255, 255, 0.86) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "0px none rgb(23, 24, 32)",
          borderRadius: "18px",
          boxShadow: "rgba(40, 40, 55, 0.055) 0px 14px 36px 0px",
          color: "rgb(23, 24, 32)",
          display: "block",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "410",
          gap: "normal",
          gridColumn: "body",
          gridTemplateColumns: "none",
          height: 338.688,
          marginTop: "0px",
          padding: "0px",
          width: 940
        },
        chip: {
          alignItems: "center",
          background: "rgba(255, 255, 255, 0.62) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "1px solid rgba(185, 206, 240, 0.46)",
          borderRadius: "999px",
          boxShadow: "none",
          color: "rgb(90, 98, 118)",
          display: "flex",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "13.12px",
          fontWeight: "410",
          gap: "8px",
          gridColumn: "auto",
          gridTemplateColumns: "none",
          height: 30,
          marginTop: "0px",
          padding: "6px 10px",
          width: 122.875
        },
        form: {
          alignItems: "end",
          background: "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "0px none rgb(23, 24, 32)",
          borderRadius: "0px",
          boxShadow: "none",
          color: "rgb(23, 24, 32)",
          display: "grid",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "410",
          gap: "10px",
          gridColumn: "auto",
          gridTemplateColumns: "290.656px 290.672px 290.656px",
          height: 202.063,
          marginTop: "0px",
          padding: "0px",
          width: 892
        },
        metrics: {
          alignItems: "normal",
          background: "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "0px none rgb(23, 24, 32)",
          borderRadius: "0px",
          boxShadow: "none",
          color: "rgb(23, 24, 32)",
          display: "flex",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "410",
          gap: "8px",
          gridColumn: "auto",
          gridTemplateColumns: "none",
          height: 30,
          marginTop: "14px",
          padding: "0px",
          width: 892
        },
        minutes: {
          alignItems: "normal",
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
          gridColumn: "auto",
          gridTemplateColumns: "none",
          height: 42,
          marginTop: "0px",
          padding: "9px 12px",
          width: 290.672
        },
        note: {
          alignItems: "normal",
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
          gridColumn: "auto",
          gridTemplateColumns: "none",
          height: 42,
          marginTop: "0px",
          padding: "9px 12px",
          width: 891.984
        },
        noteRow: {
          alignItems: "normal",
          background: "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "0px none rgb(23, 24, 32)",
          borderRadius: "0px",
          boxShadow: "none",
          color: "rgb(23, 24, 32)",
          display: "grid",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "410",
          gap: "8px",
          gridColumn: "1 / -1",
          gridTemplateColumns: "891.984px",
          height: 69.031,
          marginTop: "0px",
          padding: "0px",
          width: 891.984
        },
        panel: {
          alignItems: "normal",
          background: "radial-gradient(circle at 100% 0px, rgba(185, 238, 238, 0.18), rgba(0, 0, 0, 0) 34%) repeat scroll 0% 0% / auto padding-box border-box, rgba(0, 0, 0, 0) linear-gradient(135deg, rgba(255, 255, 255, 0.56), rgba(247, 251, 255, 0.7), rgba(255, 250, 243, 0.6)) repeat scroll 0% 0% / auto padding-box border-box",
          border: "0px none rgb(23, 24, 32)",
          borderRadius: "18px",
          boxShadow: "none",
          color: "rgb(23, 24, 32)",
          display: "block",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "410",
          gap: "normal",
          gridColumn: "auto",
          gridTemplateColumns: "none",
          height: 338.688,
          marginTop: "0px",
          padding: "24px",
          width: 940
        },
        sectionHead: {
          alignItems: "flex-start",
          background: "rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "0px none rgb(23, 24, 32)",
          borderRadius: "0px",
          boxShadow: "none",
          color: "rgb(23, 24, 32)",
          display: "flex",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "410",
          gap: "12px",
          gridColumn: "auto",
          gridTemplateColumns: "none",
          height: 30.625,
          marginTop: "0px",
          padding: "0px",
          width: 892
        },
        select: {
          alignItems: "center",
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
          gridColumn: "auto",
          gridTemplateColumns: "none",
          height: 44,
          marginTop: "0px",
          padding: "9px 12px",
          width: 290.656
        }
      };
}

// Coarse 8x8 RGB tiles of the rendered card. This keeps screen-level visual
// coverage without storing a legacy PNG or re-rendering the legacy page.
const DESKTOP_SCREENSHOT_TILES = [
  [233, 233, 234], [238, 238, 240], [252, 253, 255], [251, 252, 255],
  [250, 251, 255], [248, 251, 254], [245, 250, 252], [233, 239, 241],
  [234, 234, 235], [242, 242, 244], [249, 250, 252], [249, 250, 253],
  [250, 251, 255], [249, 251, 254], [246, 250, 252], [243, 249, 250],
  [248, 248, 248], [253, 254, 255], [249, 251, 252], [251, 253, 254],
  [251, 253, 255], [249, 251, 253], [247, 250, 251], [245, 249, 250],
  [250, 250, 252], [252, 253, 255], [251, 252, 255], [250, 252, 255],
  [250, 251, 254], [250, 251, 253], [248, 250, 251], [246, 250, 249],
  [245, 245, 246], [241, 242, 243], [247, 248, 249], [252, 253, 255],
  [252, 253, 254], [253, 254, 254], [252, 253, 254], [251, 252, 252],
  [237, 236, 255], [240, 240, 255], [250, 252, 255], [249, 251, 255],
  [250, 251, 254], [251, 251, 253], [251, 251, 251], [250, 250, 249],
  [244, 244, 254], [244, 245, 253], [249, 251, 254], [249, 251, 254],
  [251, 251, 253], [252, 251, 252], [252, 251, 250], [252, 251, 249],
  [244, 245, 248], [242, 244, 247], [239, 241, 244], [245, 246, 249],
  [251, 251, 253], [252, 251, 251], [253, 251, 250], [254, 251, 248]
];

const MOBILE_SCREENSHOT_TILES = [
  [236, 235, 236], [231, 230, 232], [228, 228, 230], [251, 251, 253],
  [250, 252, 254], [246, 251, 254], [233, 239, 242], [233, 241, 244],
  [243, 243, 244], [239, 240, 241], [252, 253, 254], [252, 253, 255],
  [251, 253, 255], [249, 252, 254], [247, 252, 254], [243, 249, 251],
  [247, 247, 249], [248, 249, 251], [252, 253, 255], [251, 252, 255],
  [251, 252, 255], [250, 252, 254], [249, 251, 254], [248, 251, 253],
  [247, 248, 250], [252, 253, 254], [252, 253, 255], [252, 253, 255],
  [251, 253, 255], [251, 253, 254], [252, 253, 254], [251, 252, 253],
  [242, 243, 245], [242, 243, 245], [243, 244, 246], [241, 243, 245],
  [242, 243, 245], [242, 243, 244], [252, 253, 254], [252, 252, 252],
  [241, 242, 255], [232, 232, 255], [231, 231, 255], [235, 235, 254],
  [251, 252, 253], [251, 251, 253], [252, 252, 252], [253, 251, 251],
  [241, 242, 247], [240, 242, 248], [242, 243, 250], [238, 238, 244],
  [244, 245, 247], [248, 248, 249], [253, 251, 251], [254, 251, 250],
  [242, 243, 247], [239, 240, 243], [242, 244, 247], [246, 246, 248],
  [252, 251, 251], [253, 251, 250], [254, 251, 250], [254, 251, 248]
];

function expectedSkateBodySupportScreenshot(mobile) {
  return mobile
    ? { height: 432, tiles: MOBILE_SCREENSHOT_TILES, width: 370 }
    : { height: 338, tiles: DESKTOP_SCREENSHOT_TILES, width: 940 };
}

module.exports = {
  bodySupportState,
  bodySupportVisualContract,
  cardClip,
  expectedSkateBodySupportScreenshot,
  expectedSkateBodySupportState,
  expectedSkateBodySupportVisual,
  prepareBodySupportScreenshot
};
