// Pinned Skate training plan contract. The state, computed styles, geometry,
// and rendered-image signature were captured from the standalone legacy page
// while it was still the live visual reference, so the production React route
// keeps protecting the same rendering without starting the legacy server.

function trainingPlanState() {
  return `(() => {
    const documentRoot = document;
    const cards = documentRoot.querySelectorAll("#skateCoachFlow .skate-plan-card");
    const text = (root, selector) => root?.querySelector(selector)?.textContent.trim() || "";
    const today = cards.item(0);
    const week = cards.item(1);
    return {
      heading: documentRoot.querySelector(".skate-session-card > .panel-inner > .section-head h2").textContent.trim(),
      subtitle: documentRoot.querySelector(".skate-session-card > .panel-inner > .section-head p").textContent.trim(),
      today: today ? {
        blocks: [...today.querySelectorAll(".skate-plan-block")].map((block) => ({
          label: text(block, "span"),
          value: text(block, "strong")
        })),
        description: text(today, ".skate-plan-head p"),
        kicker: text(today, ".skate-plan-kicker"),
        note: text(today, ".skate-plan-note"),
        title: text(today, ".skate-plan-head h3")
      } : null,
      week: week ? {
        description: text(week, ".skate-plan-head p"),
        kicker: text(week, ".skate-plan-kicker"),
        rows: [...week.querySelectorAll(".skate-plan-row")].map((row) => ({
          benchmark: text(row, ".skate-plan-pill"),
          className: row.className,
          detail: text(row, ".skate-plan-row-detail"),
          intensity: text(row, ".skate-plan-row-top em"),
          label: text(row, ".skate-plan-row-top span"),
          subtitle: text(row, ".skate-plan-row-copy"),
          title: text(row, ".skate-plan-row-top strong")
        })),
        title: text(week, ".skate-plan-head h3")
      } : null
    };
  })()`;
}

function trainingPlanVisualContract() {
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
        gridTemplateColumns: style.gridTemplateColumns,
        height: dimension(rect.height),
        lineHeight: style.lineHeight,
        padding: style.padding,
        width: dimension(rect.width)
      };
    };
    const card = documentRoot.querySelector(".skate-session-card");
    return {
      card: pick(card),
      firstBlock: pick(card.querySelector(".skate-plan-block")),
      firstRow: pick(card.querySelector(".skate-plan-row")),
      firstRowTop: pick(card.querySelector(".skate-plan-row-top")),
      flow: pick(card.querySelector(".skate-coach-flow")),
      grid: pick(card.querySelector(".skate-plan-grid")),
      panel: pick(card.querySelector(".panel-inner")),
      stack: pick(card.querySelector(".skate-plan-stack")),
      today: pick(card.querySelector(".skate-plan-today")),
      week: pick(card.querySelectorAll(".skate-plan-card").item(1))
    };
  })()`;
}

function prepareTrainingPlanScreenshot() {
  return `(() => {
    const documentRoot = document;
    documentRoot.documentElement.style.scrollBehavior = "auto";
    const mascot = documentRoot.querySelector(".mascot-card");
    if (mascot) mascot.style.visibility = "hidden";
    documentRoot.querySelector(".skate-session-card").scrollIntoView({ block: "start" });
  })()`;
}

function cardClip() {
  return `(() => {
    const documentRoot = document;
    const rect = documentRoot.querySelector(".skate-session-card").getBoundingClientRect();
    return {
      x: rect.x + documentRoot.defaultView.scrollX,
      y: rect.y + documentRoot.defaultView.scrollY,
      width: rect.width,
      height: Math.min(rect.height, documentRoot.defaultView.innerHeight)
    };
  })()`;
}

// The production CSS minifier rewrites equivalent gradient syntax (a zero
// position loses its percent sign and `to right` becomes `90deg`), so the
// pinned values below use the built serialization.
function expectedSkateTrainingPlanState() {
  return {
    heading: "Training plan",
    subtitle: "The actual program for today and this week, straight from your checked-in plan.",
    today: {
      blocks: [
        {
          label: "30-min SkateIQ",
          value: "Walking Snakes 5 min; Single Leg Snakes 5 min; Deconstructed 90-degree Tic Tacs 5 min; controlled turns to 30 min."
        },
        {
          label: "Flow / fun",
          value: "Choose one direction today."
        },
        {
          label: "Default intensity",
          value: "Yellow · 10-20 focused attempts"
        }
      ],
      description: "Balance Blueprint · Week 3",
      kicker: "Day 15",
      note: "Day 15 benchmark",
      title: "Benchmark first, then 180."
    },
    week: {
      description: "Current training week from your checked-in plan. Rest days: Sunday.",
      kicker: "Week 3 / 21",
      rows: [
        {
          benchmark: "Day 15 benchmark",
          className: "skate-plan-row intensity-yellow is-current",
          detail: "Choose one direction today.",
          intensity: "Yellow",
          label: "Day 15",
          subtitle: "Walking Snakes 5 min; Single Leg Snakes 5 min; Deconstructed 90-degree Tic Tacs 5 min; controlled turns to 30 min.",
          title: "Benchmark first, then 180."
        },
        {
          benchmark: "",
          className: "skate-plan-row intensity-green",
          detail: "Thoughtful small sets.",
          intensity: "Green",
          label: "Day 16",
          subtitle: "Alternating Hippy Jumps 50; Alternating Nose Lift 50; Tail Scrape 20; rest as needed.",
          title: "Shove-it."
        },
        {
          benchmark: "",
          className: "skate-plan-row intensity-yellow",
          detail: "No trick obligation.",
          intensity: "Yellow",
          label: "Day 17",
          subtitle: "Full Swing Push 5 min; Short Nose Manuals 30; BS Manual 360 15.",
          title: "Bowl flow / free skate."
        },
        {
          benchmark: "",
          className: "skate-plan-row intensity-blue",
          detail: "Transition focus.",
          intensity: "Blue",
          label: "Day 18",
          subtitle: "Walking Snakes 5 min; Single Leg Snakes 5 min; Deconstructed 90-degree Tic Tacs 5 min; controlled turns to 30 min.",
          title: "Rock and roll."
        },
        {
          benchmark: "",
          className: "skate-plan-row intensity-yellow",
          detail: "Stay patient.",
          intensity: "Yellow",
          label: "Day 19",
          subtitle: "Alternating Hippy Jumps 50; Alternating Nose Lift 50; Tail Scrape 20; rest as needed.",
          title: "180 - choose the other or weaker direction."
        },
        {
          benchmark: "",
          className: "skate-plan-row intensity-yellow",
          detail: "Choose one.",
          intensity: "Yellow",
          label: "Day 20",
          subtitle: "Full Swing Push 5 min; Short Nose Manuals 30; BS Manual 360 15.",
          title: "Shove-it or axle-stall preparation."
        },
        {
          benchmark: "",
          className: "skate-plan-row intensity-blue",
          detail: "Wallride play only if it feels inviting.",
          intensity: "Blue",
          label: "Day 21",
          subtitle: "Recovery SkateIQ: 30 min easy board control only.",
          title: "Recovery / fun skate."
        }
      ],
      title: "Dynamic balance with 180s and shove-it still moving."
    }
  };
}

function expectedSkateTrainingPlanVisual(mobile) {
  return mobile
    ? {
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
          gridTemplateColumns: "none",
          height: 2249.391,
          lineHeight: "23.2px",
          padding: "0px",
          width: 370
        },
        firstBlock: {
          alignItems: "normal",
          background: "rgba(255, 255, 255, 0.7) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "1px solid rgba(185, 206, 240, 0.28)",
          borderRadius: "16px",
          boxShadow: "none",
          color: "rgb(23, 24, 32)",
          display: "grid",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "410",
          gap: "7px",
          gridTemplateColumns: "270px",
          height: 114.313,
          lineHeight: "23.2px",
          padding: "13px 14px",
          width: 300
        },
        firstRow: {
          alignItems: "normal",
          background: "rgba(255, 255, 255, 0.62) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "1px solid rgba(106, 201, 194, 0.42)",
          borderRadius: "18px",
          boxShadow: "rgba(106, 201, 194, 0.16) 0px 0px 0px 1px inset",
          color: "rgb(23, 24, 32)",
          display: "grid",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "410",
          gap: "8px",
          gridTemplateColumns: "268px",
          height: 243.453,
          lineHeight: "23.2px",
          padding: "14px 15px",
          width: 300
        },
        firstRowTop: {
          alignItems: "center",
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
          gridTemplateColumns: "268px",
          height: 75.391,
          lineHeight: "23.2px",
          padding: "0px",
          width: 268
        },
        flow: {
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
          gap: "10px",
          gridTemplateColumns: "338px",
          height: 2117.828,
          lineHeight: "23.2px",
          padding: "0px",
          width: 338
        },
        grid: {
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
          gap: "10px",
          gridTemplateColumns: "300px",
          height: 281.313,
          lineHeight: "23.2px",
          padding: "0px",
          width: 300
        },
        panel: {
          alignItems: "normal",
          background: "radial-gradient(circle at 4% 0px, rgba(245, 202, 221, 0.2), rgba(0, 0, 0, 0) 36%) repeat scroll 0% 0% / auto padding-box border-box, rgba(0, 0, 0, 0) linear-gradient(135deg, rgba(255, 255, 255, 0.5), rgba(227, 251, 250, 0.16), rgba(255, 249, 204, 0.12)) repeat scroll 0% 0% / auto padding-box border-box",
          border: "0px none rgb(23, 24, 32)",
          borderRadius: "18px",
          boxShadow: "none",
          color: "rgb(23, 24, 32)",
          display: "grid",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "410",
          gap: "12px",
          gridTemplateColumns: "338px",
          height: 2249.391,
          lineHeight: "23.2px",
          padding: "16px",
          width: 370
        },
        stack: {
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
          gap: "16px",
          gridTemplateColumns: "338px",
          height: 2117.828,
          lineHeight: "23.2px",
          padding: "0px",
          width: 338
        },
        today: {
          alignItems: "normal",
          background: "radial-gradient(circle at 100% 0px, rgba(227, 251, 250, 0.3), rgba(0, 0, 0, 0) 34%) repeat scroll 0% 0% / auto padding-box border-box, rgba(255, 255, 255, 0.72) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "1px solid rgba(185, 206, 240, 0.32)",
          borderRadius: "22px",
          boxShadow: "none",
          color: "rgb(23, 24, 32)",
          display: "grid",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "410",
          gap: "14px",
          gridTemplateColumns: "300px",
          height: 441.188,
          lineHeight: "23.2px",
          padding: "16px 18px",
          width: 338
        },
        week: {
          alignItems: "normal",
          background: "rgba(255, 255, 255, 0.68) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "1px solid rgba(185, 206, 240, 0.32)",
          borderRadius: "22px",
          boxShadow: "none",
          color: "rgb(23, 24, 32)",
          display: "grid",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "410",
          gap: "14px",
          gridTemplateColumns: "300px",
          height: 1660.641,
          lineHeight: "23.2px",
          padding: "16px 18px",
          width: 338
        }
      }
    : {
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
          gridTemplateColumns: "none",
          height: 1395.563,
          lineHeight: "23.2px",
          padding: "0px",
          width: 940
        },
        firstBlock: {
          alignItems: "normal",
          background: "rgba(255, 255, 255, 0.7) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "1px solid rgba(185, 206, 240, 0.28)",
          borderRadius: "16px",
          boxShadow: "none",
          color: "rgb(23, 24, 32)",
          display: "grid",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "410",
          gap: "7px",
          gridTemplateColumns: "248px",
          height: 134.719,
          lineHeight: "23.2px",
          padding: "13px 14px",
          width: 278
        },
        firstRow: {
          alignItems: "normal",
          background: "rgba(255, 255, 255, 0.62) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "1px solid rgba(106, 201, 194, 0.42)",
          borderRadius: "18px",
          boxShadow: "rgba(106, 201, 194, 0.16) 0px 0px 0px 1px inset",
          color: "rgb(23, 24, 32)",
          display: "grid",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "410",
          gap: "8px",
          gridTemplateColumns: "822px",
          height: 145.047,
          lineHeight: "23.2px",
          padding: "14px 15px",
          width: 854
        },
        firstRowTop: {
          alignItems: "center",
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
          gridTemplateColumns: "43.1094px 720.781px 38.1094px",
          height: 19.203,
          lineHeight: "23.2px",
          padding: "0px",
          width: 822
        },
        flow: {
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
          gap: "10px",
          gridTemplateColumns: "892px",
          height: 1284.938,
          lineHeight: "23.2px",
          padding: "0px",
          width: 892
        },
        grid: {
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
          gap: "10px",
          gridTemplateColumns: "278px 278px 278px",
          height: 134.719,
          lineHeight: "23.2px",
          padding: "0px",
          width: 854
        },
        panel: {
          alignItems: "normal",
          background: "radial-gradient(circle at 4% 0px, rgba(245, 202, 221, 0.2), rgba(0, 0, 0, 0) 36%) repeat scroll 0% 0% / auto padding-box border-box, rgba(0, 0, 0, 0) linear-gradient(135deg, rgba(255, 255, 255, 0.5), rgba(227, 251, 250, 0.16), rgba(255, 249, 204, 0.12)) repeat scroll 0% 0% / auto padding-box border-box",
          border: "0px none rgb(23, 24, 32)",
          borderRadius: "18px",
          boxShadow: "none",
          color: "rgb(23, 24, 32)",
          display: "grid",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "410",
          gap: "14px",
          gridTemplateColumns: "892px",
          height: 1395.563,
          lineHeight: "23.2px",
          padding: "24px",
          width: 940
        },
        stack: {
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
          gap: "16px",
          gridTemplateColumns: "892px",
          height: 1284.938,
          lineHeight: "23.2px",
          padding: "0px",
          width: 892
        },
        today: {
          alignItems: "normal",
          background: "radial-gradient(circle at 100% 0px, rgba(227, 251, 250, 0.3), rgba(0, 0, 0, 0) 34%) repeat scroll 0% 0% / auto padding-box border-box, rgba(255, 255, 255, 0.72) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "1px solid rgba(185, 206, 240, 0.32)",
          borderRadius: "22px",
          boxShadow: "none",
          color: "rgb(23, 24, 32)",
          display: "grid",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "410",
          gap: "14px",
          gridTemplateColumns: "854px",
          height: 294.594,
          lineHeight: "23.2px",
          padding: "16px 18px",
          width: 892
        },
        week: {
          alignItems: "normal",
          background: "rgba(255, 255, 255, 0.68) none repeat scroll 0% 0% / auto padding-box border-box",
          border: "1px solid rgba(185, 206, 240, 0.32)",
          borderRadius: "22px",
          boxShadow: "none",
          color: "rgb(23, 24, 32)",
          display: "grid",
          fontFamily: "ui-rounded, \"SF Pro Rounded\", Nunito, \"Avenir Next\", -apple-system, \"system-ui\", \"Segoe UI\", system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: "410",
          gap: "14px",
          gridTemplateColumns: "854px",
          height: 974.344,
          lineHeight: "23.2px",
          padding: "16px 18px",
          width: 892
        }
      };
}

// Coarse 8x8 RGB tiles of the rendered card. This keeps screen-level visual
// coverage without storing a legacy PNG or re-rendering the legacy page.
const DESKTOP_SCREENSHOT_TILES = [
  [237, 230, 233], [242, 236, 239], [251, 247, 249], [247, 244, 246],
  [247, 246, 247], [246, 247, 248], [246, 247, 249], [246, 248, 249],
  [241, 240, 242], [241, 240, 242], [254, 253, 254], [254, 254, 254],
  [254, 254, 254], [253, 255, 254], [250, 254, 254], [248, 253, 254],
  [242, 241, 243], [237, 236, 238], [248, 247, 249], [252, 252, 252],
  [254, 254, 254], [250, 251, 251], [251, 253, 253], [251, 254, 254],
  [242, 241, 243], [242, 241, 243], [251, 250, 251], [246, 246, 247],
  [250, 251, 251], [250, 251, 251], [246, 247, 248], [250, 252, 253],
  [248, 249, 249], [252, 252, 253], [253, 253, 254], [253, 253, 254],
  [253, 254, 255], [253, 254, 255], [252, 253, 254], [251, 253, 253],
  [242, 242, 243], [231, 233, 234], [236, 238, 239], [243, 244, 245],
  [253, 254, 254], [253, 254, 254], [253, 254, 254], [250, 251, 250],
  [245, 245, 242], [240, 240, 237], [248, 249, 249], [249, 249, 250],
  [249, 249, 250], [249, 250, 250], [250, 251, 251], [253, 254, 254],
  [247, 248, 248], [243, 245, 245], [247, 248, 249], [248, 249, 250],
  [248, 249, 250], [253, 253, 254], [254, 254, 254], [250, 252, 251]
];

const MOBILE_SCREENSHOT_TILES = [
  [236, 228, 232], [238, 230, 233], [241, 234, 238], [238, 231, 235],
  [238, 232, 235], [244, 238, 241], [244, 239, 242], [250, 244, 247],
  [247, 244, 246], [237, 237, 239], [242, 240, 242], [242, 241, 243],
  [244, 244, 245], [251, 252, 253], [249, 252, 253], [250, 250, 252],
  [253, 250, 252], [232, 232, 234], [229, 229, 231], [235, 234, 236],
  [235, 234, 236], [236, 236, 238], [242, 242, 243], [252, 251, 253],
  [253, 251, 253], [243, 242, 244], [246, 245, 247], [246, 245, 247],
  [246, 246, 247], [253, 253, 254], [254, 254, 254], [253, 252, 253],
  [252, 251, 252], [241, 240, 242], [243, 243, 244], [246, 246, 247],
  [247, 247, 248], [249, 249, 250], [254, 254, 254], [252, 252, 253],
  [247, 247, 249], [237, 239, 241], [240, 241, 243], [245, 245, 247],
  [246, 246, 247], [247, 247, 248], [246, 247, 248], [251, 251, 252],
  [248, 248, 249], [236, 237, 238], [238, 239, 240], [243, 244, 245],
  [248, 249, 250], [248, 249, 250], [248, 249, 250], [252, 253, 254],
  [251, 253, 253], [234, 234, 232], [241, 242, 243], [243, 243, 244],
  [244, 244, 245], [250, 250, 251], [250, 250, 251], [251, 253, 254]
];

function expectedSkateTrainingPlanScreenshot(mobile) {
  return mobile
    ? { height: 844, tiles: MOBILE_SCREENSHOT_TILES, width: 370 }
    : { height: 720, tiles: DESKTOP_SCREENSHOT_TILES, width: 940 };
}

// Before the season starts the card previews Day 1 with no week rows, and the
// shipped manual progression still selects Day 60 on a post-streak date.
function expectedPreSeasonTrainingPlanState() {
  return {
    heading: "Training plan",
    subtitle: "The actual program for today and this week, straight from your checked-in plan.",
    today: {
      blocks: [
        {
          label: "30-min SkateIQ",
          value: "Heel Toe Press 3x1 min; Board Shifts 3x15; Walking (static) 2x2 min; easy roll to 30 min."
        },
        {
          label: "Flow / fun",
          value: "A few comfortable ollies are enough."
        },
        {
          label: "Default intensity",
          value: "Blue · 0-5 focused attempts"
        }
      ],
      description: "Balance Blueprint · Week 1",
      kicker: "Day 1",
      note: "Day 1 benchmark",
      title: "Easy ride + baseline video only if you feel okay."
    },
    week: {
      description: "Previewing the program before Saturday, August 29, 2026.",
      kicker: "Week 1 / 21",
      rows: [],
      title: "Board feel first. No heroic Day 1 needed."
    }
  };
}

function expectedPostStreakTrainingPlanState() {
  return {
    heading: "Training plan",
    subtitle: "The actual program for today and this week, straight from your checked-in plan.",
    today: {
      blocks: [
        {
          label: "30-min SkateIQ",
          value: "Final 30-min review: Full Swing Push 5 min; Snakes 5 min; Tic Tacs 5 min; micro-manuals 5 min; easy switch 5 min; gentle carving 5 min."
        },
        {
          label: "Flow / fun",
          value: "Same baseline first, then favorite improvements and one fun line."
        },
        {
          label: "Default intensity",
          value: "Yellow · 10-20 focused attempts"
        }
      ],
      description: "Essentials · Week 9",
      kicker: "Day 60",
      note: "Day 60 benchmark",
      title: "Day 60 benchmark."
    },
    week: {
      description: "Current training week from your checked-in plan. Rest days: Sunday and Saturday.",
      kicker: "Week 9 / 21",
      rows: [
        {
          benchmark: "",
          className: "skate-plan-row intensity-yellow",
          detail: "Stay technical.",
          intensity: "Yellow",
          label: "Day 57",
          subtitle: "Essentials W3D3: Manual 5 min; Deconstructed Moonwalk 5 min; Manuals 10; Switch Throwdown 20.",
          title: "180 - choose one direction today."
        },
        {
          benchmark: "",
          className: "skate-plan-row intensity-blue",
          detail: "Thoughtful small sets.",
          intensity: "Blue",
          label: "Day 58",
          subtitle: "Recovery SkateIQ: 30 min easy board control only.",
          title: "Shove-it."
        },
        {
          benchmark: "",
          className: "skate-plan-row intensity-yellow",
          detail: "No trick obligation.",
          intensity: "Yellow",
          label: "Day 59",
          subtitle: "Essentials W3D4: Full Swing Push 3x1 min; Deconstructed Tic Tacs 5 min; Short Manuals 20; Bunny Hops 3x20.",
          title: "Bowl flow / free skate."
        },
        {
          benchmark: "Day 60 benchmark",
          className: "skate-plan-row intensity-yellow is-current",
          detail: "Same baseline first, then favorite improvements and one fun line.",
          intensity: "Yellow",
          label: "Day 60",
          subtitle: "Final 30-min review: Full Swing Push 5 min; Snakes 5 min; Tic Tacs 5 min; micro-manuals 5 min; easy switch 5 min; gentle carving 5 min.",
          title: "Day 60 benchmark."
        }
      ],
      title: "Finish the daily streak without cramming."
    }
  };
}

module.exports = {
  expectedPostStreakTrainingPlanState,
  expectedPreSeasonTrainingPlanState,
  cardClip,
  expectedSkateTrainingPlanScreenshot,
  expectedSkateTrainingPlanState,
  expectedSkateTrainingPlanVisual,
  prepareTrainingPlanScreenshot,
  trainingPlanState,
  trainingPlanVisualContract
};
