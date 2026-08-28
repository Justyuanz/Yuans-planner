const test = require("node:test");
const assert = require("node:assert/strict");
const mascotRag = require("../frontend/js/mascot-rag.js");

test("classifyQuestion routes key ADHD-support prompts", function () {
  assert.equal(mascotRag.classifyQuestion("Why do my mornings run late?"), "morning");
  assert.equal(mascotRag.classifyQuestion("What am I spending too much money on?"), "money");
  assert.equal(mascotRag.classifyQuestion("What pattern do you notice about me?"), "patterns");
});

test("suggestedPrompts become more action-oriented", function () {
  assert.match(mascotRag.suggestedPrompts("okay")[0], /slipping|move|one thing|broken/i);
  assert.match(mascotRag.suggestedPrompts("tired")[0], /tired|cut today/i);
});

test("suggestedPrompts supports good-energy days too", function () {
  assert.match(mascotRag.suggestedPrompts("good")[0], /good energy|highest-value|progress/i);
});

test("buildRetrieverContext includes top insight and grounded metric snippets", function () {
  const snippets = mascotRag.buildRetrieverContext({
    insights: [
      {
        title: "Your mornings are taking longer than planned.",
        why: "Recent mornings averaged 1.1h planned and 2.8h in practice."
      }
    ],
    metrics: {
      morningOverrun: {
        sampleSize: 5,
        plannedAverage: 1.1,
        actualAverage: 2.8,
        averageOverrun: 1.7
      },
      dailyTaskAverages: {
        sampleSize: 6,
        plannedAverage: 5,
        completedAverage: 3
      },
      moneySummary: {
        available: true,
        availableWeekLabel: "-$12",
        flexibleRemainingLabel: "$84"
      }
    },
    journalEntries: [
      { date: "2026-08-05", title: "Heavy day", content: "Morning got away from me again." }
    ]
  });

  assert.equal(snippets[0].id, "top-insight");
  assert.ok(snippets.some(function (snippet) { return snippet.id === "morning-overrun"; }));
  assert.ok(snippets.some(function (snippet) { return snippet.id === "money"; }));
  assert.ok(snippets.some(function (snippet) { return snippet.id === "journal-0"; }));
});

test("answerMascotQuestion uses evidence-backed morning guidance", function () {
  const response = mascotRag.answerMascotQuestion("Why do my mornings run late?", {
    insights: [
      {
        title: "Your mornings are taking longer than planned.",
        why: "Recent mornings averaged 1h planned and 3h in practice.",
        actions: [{ id: "review_planned_hours", label: "Adjust the morning block" }]
      }
    ],
    metrics: {
      morningOverrun: {
        sampleSize: 6,
        plannedAverage: 1,
        actualAverage: 3,
        averageOverrun: 2
      }
    },
    journalEntries: []
  });

  assert.equal(response.intent, "morning");
  assert.match(response.answer, /3h|1h|morning/i);
  assert.ok(response.evidence.length >= 1);
});

test("answerMascotQuestion falls back safely when context is thin", function () {
  const response = mascotRag.answerMascotQuestion("hello?", {
    insights: [],
    metrics: {},
    journalEntries: []
  });

  assert.equal(typeof response.answer, "string");
  assert.ok(Array.isArray(response.evidence));
});

test("buildRetrieverContext hides vague-task evidence when no broad tasks are open", function () {
  const snippets = mascotRag.buildRetrieverContext({
    metrics: {
      vagueTaskFriction: {
        sampleSize: 5,
        vagueOpenCount: 0,
        vagueCompletionRate: 0.2,
        specificCompletionRate: 0.8
      }
    },
    todayTasks: [
      { label: "09 Review notes", hours: 0.5, done: false }
    ]
  });

  assert.equal(snippets.some(function (snippet) { return snippet.id === "vague-task"; }), false);
});

test("answerMascotQuestion suggests a concrete next task when one exists", function () {
  const response = mascotRag.answerMascotQuestion("What should I do next?", {
    insights: [],
    metrics: {},
    todayTasks: [
      { label: "11 Send invoice", hours: 0.25, done: false },
      { label: "Study C++", hours: 1.5, done: false }
    ],
    journalEntries: []
  });

  assert.equal(response.intent, "next_step");
  assert.match(response.answer, /Send invoice/);
});

test("answerMascotQuestion names a moved task when asking about mornings", function () {
  const response = mascotRag.answerMascotQuestion("Why do my mornings run late?", {
    insights: [],
    metrics: {},
    todayTasks: [],
    journalEntries: [],
    activityLog: [
      {
        action: "task_updated",
        entityType: "task",
        entityId: "task-1",
        field: "label",
        dateKey: "2026-08-05",
        before: "09 Morning routine",
        after: "11 Morning routine"
      }
    ]
  });

  assert.equal(response.intent, "morning");
  assert.match(response.answer, /Morning routine/);
  assert.match(response.answer, /09:00/);
  assert.match(response.answer, /11:00/);
});

test("answerMascotQuestion can name a task to move to tomorrow", function () {
  const response = mascotRag.answerMascotQuestion("Which task should I move to tomorrow?", {
    insights: [],
    metrics: {},
    journalEntries: [],
    todayTasks: [
      { label: "09 Send invoice", hours: 0.25, done: false },
      { label: "20 Clean kitchen", hours: 0.5, done: false }
    ]
  });

  assert.equal(response.intent, "move_task");
  assert.match(response.answer, /Clean kitchen/);
});

test("answerMascotQuestion can name a task to break down", function () {
  const response = mascotRag.answerMascotQuestion("Which task needs to be broken down?", {
    insights: [],
    metrics: {},
    journalEntries: [],
    todayTasks: [
      { label: "Study C++", hours: 1.5, done: false }
    ]
  });

  assert.equal(response.intent, "breakdown");
  assert.match(response.answer, /Study C\+\+/);
});
