const test = require("node:test");
const assert = require("node:assert/strict");
const patternHistory = require("../frontend/js/pattern-history.js");

test("buildPatternHistoryModel groups insights by mode and includes a visible range label", function () {
  const model = patternHistory.buildPatternHistoryModel({
    currentDateKey: "2026-08-06",
    lookbackDays: 14,
    metrics: {
      morningOverrun: {
        sampleSize: 6,
        plannedAverage: 1.2,
        actualAverage: 2.8
      }
    },
    insights: [
      {
        id: "morning_overrun",
        mode: "reality",
        priority: 95,
        title: "Your mornings are usually taking longer than planned.",
        why: "Across 6 recent days, morning blocks averaged 1.2h planned and 2.8h in practice.",
        actions: [],
        sampleSize: 6
      }
    ]
  });

  assert.equal(model.isEmpty, false);
  assert.match(model.rangeLabel, /Last 14 days through 2026-08-06/);
  assert.equal(model.groups[0].mode, "reality");
  assert.equal(model.groups[0].items[0].evidence.length >= 1, true);
});

test("buildPatternHistoryModel stays empty when there are no insights", function () {
  const model = patternHistory.buildPatternHistoryModel({
    currentDateKey: "2026-08-06",
    lookbackDays: 14,
    metrics: {},
    insights: []
  });

  assert.equal(model.isEmpty, true);
  assert.equal(model.groups.length, 0);
});
