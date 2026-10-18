const assert = require("node:assert/strict");
const test = require("node:test");

const { startBrowserPlanner } = require("./helpers/browser-planner");

// Export and import are the user's only way to move their planner between
// machines, and losing a key here loses real data. The decode rules have unit
// tests; what had no coverage was the two buttons in the shell actually being
// wired to them, so this drives the real controls on the production build.

const TEST_DATE = "2026-11-13";
const TASK_KEY = `hivePlanner.dailyTasks.${TEST_DATE}`;
const JOURNAL_KEY = "hivePlanner.journalEntries";
const TRANSIENT_KEY = "hivePlanner.guitar.currentSession";
// The server refuses any key outside the hivePlanner. prefix, so a foreign key
// cannot reach the store and the export-side filter for one is unreachable
// here; it is covered by the unit tests. On import the payload is an arbitrary
// file, so that side is reachable and is asserted below.
const FOREIGN_KEY = "somethingElse.notOurs";

const SEEDED = [
  [TASK_KEY, [{
    id: "backup-task-1",
    label: "Exported task",
    activity: "guitar",
    hours: 0.5,
    timerSeconds: 1800,
    timerStartedAt: null,
    done: false,
    createdAt: "2026-11-13T08:00:00.000Z",
    scheduledTime: "08:00"
  }]],
  [JOURNAL_KEY, { [TEST_DATE]: { text: "A quiet day.", mood: "calm" } }],
  // Deliberately excluded from a backup: a half-finished session is machine
  // state, not something to restore onto another machine.
  [TRANSIENT_KEY, { startedAt: "2026-11-13T09:00:00.000Z" }],
];

async function putStoredValue(serverUrl, key, value) {
  const response = await fetch(`${serverUrl}/api/kv`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value: JSON.stringify(value) })
  });
  assert.equal(response.ok, true);
}

// Clicks the real Export button with the download intercepted, and returns the
// text the browser would have written to the file.
function captureExportedBackup() {
  return `(async () => {
    const originalCreate = URL.createObjectURL;
    const originalClick = HTMLAnchorElement.prototype.click;
    let captured = null;
    let fileName = "";
    URL.createObjectURL = (blob) => { captured = blob; return "blob:captured"; };
    HTMLAnchorElement.prototype.click = function () { fileName = this.download; };
    try {
      Array.from(document.querySelectorAll(".backup-utility button"))
        .find((button) => button.textContent.trim() === "Export backup")
        .click();
      return { fileName, text: captured === null ? null : await captured.text() };
    } finally {
      URL.createObjectURL = originalCreate;
      HTMLAnchorElement.prototype.click = originalClick;
    }
  })()`;
}

// Drives the real file input the Import label points at.
function importBackupFile(text) {
  return `(() => {
    const input = document.getElementById("importData");
    const transfer = new DataTransfer();
    transfer.items.add(new File([${JSON.stringify(text)}], "backup.json", { type: "application/json" }));
    input.files = transfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  })()`;
}

const BACKUP_STATUS = `document.getElementById("backupStatus").textContent.trim()`;

test("backup export and import move the planner's own data and nothing else", async function (t) {
  const planner = await startBrowserPlanner(t);
  if (!planner) return;

  for (const [key, value] of SEEDED) {
    await putStoredValue(planner.server.url, key, value);
  }

  const pageUrl = `${planner.server.url}/?date=${TEST_DATE}`;
  await planner.browser.setViewport(1280, 720);
  await planner.browser.open(pageUrl);
  await planner.browser.waitForExpression(
    `Boolean(document.documentElement.dataset.plannerReady === "true" && document.querySelector(".backup-utility"))`
  );

  const exported = await planner.browser.evaluate(captureExportedBackup());
  assert.equal(exported.fileName, `yuan-planner-backup-${TEST_DATE}.json`);
  assert.notEqual(exported.text, null, "the Export button produced no file");

  const payload = JSON.parse(exported.text);
  assert.deepEqual({
    app: payload.app,
    storage: payload.storage,
    version: payload.version
  }, {
    app: "Yuan's Planner",
    storage: "sqlite",
    version: 2
  });
  assert.ok(Date.parse(payload.exportedAt) > 0, "exportedAt is not a timestamp");

  // The app fills task defaults when it loads, so the export carries the
  // normalized task. Every seeded field must survive the round trip untouched.
  const exportedTask = JSON.parse(payload.data[TASK_KEY])[0];
  assert.deepEqual(
    Object.fromEntries(Object.keys(SEEDED[0][1][0]).map((key) => [key, exportedTask[key]])),
    SEEDED[0][1][0]
  );
  assert.deepEqual(JSON.parse(payload.data[JOURNAL_KEY]), SEEDED[1][1]);
  assert.equal(TRANSIENT_KEY in payload.data, false, "the transient session key was exported");
  assert.equal(
    Object.keys(payload.data).every((key) => key.startsWith("hivePlanner.")),
    true,
    `the export carried foreign keys: ${Object.keys(payload.data).join(", ")}`
  );

  await planner.browser.waitForExpression(`${BACKUP_STATUS} === "Backup exported."`);

  // Import a different backup over the top, including one key the decoder must
  // reject because its value is not a string.
  const restored = {
    app: "Yuan's Planner",
    version: 2,
    data: {
      [TASK_KEY]: JSON.stringify([{ ...SEEDED[0][1][0], label: "Restored task", done: true }]),
      [JOURNAL_KEY]: JSON.stringify({ [TEST_DATE]: { text: "Restored entry.", mood: "steady" } }),
      "hivePlanner.notAString": { nested: true },
      [FOREIGN_KEY]: JSON.stringify({ keep: "out" })
    }
  };
  await planner.browser.evaluate(importBackupFile(JSON.stringify(restored)));
  await planner.browser.waitForExpression(`${BACKUP_STATUS} === "Imported 2 saved items."`);

  // The import must reach SQLite, not just the page.
  const stored = await planner.server.waitFor(async function () {
    const data = await planner.server.readPlannerData();
    const tasks = JSON.parse(data[TASK_KEY] || "[]");
    return tasks[0] && tasks[0].label === "Restored task" ? data : null;
  });
  assert.equal(JSON.parse(stored[TASK_KEY])[0].done, true);
  assert.deepEqual(JSON.parse(stored[JOURNAL_KEY]), { [TEST_DATE]: { text: "Restored entry.", mood: "steady" } });
  assert.equal("hivePlanner.notAString" in stored, false, "a non-string value was imported");
  assert.equal(stored[FOREIGN_KEY], undefined, "a foreign key was imported");

  // And it must survive a reload, which is what makes it a restore rather than
  // a screen update.
  await planner.browser.reload();
  await planner.browser.waitForExpression(
    `Boolean(document.documentElement.dataset.plannerReady === "true" && document.querySelector(".task-title"))`
  );
  const labels = await planner.browser.evaluate(
    `Array.from(document.querySelectorAll(".task-title")).map((node) => node.textContent.trim())`
  );
  assert.equal(
    labels.some((label) => label.includes("Restored task")),
    true,
    `the restored task did not render: ${JSON.stringify(labels)}`
  );

  // A file that is not a backup must be refused without destroying anything.
  await planner.browser.evaluate(importBackupFile("this is not json"));
  await planner.browser.waitForExpression(`${BACKUP_STATUS} === "That backup file could not be read."`);
  const afterBadImport = await planner.server.readPlannerData();
  assert.deepEqual(afterBadImport[TASK_KEY], stored[TASK_KEY], "a bad import changed stored tasks");

  assert.deepEqual(await planner.browser.errors(), []);
});
