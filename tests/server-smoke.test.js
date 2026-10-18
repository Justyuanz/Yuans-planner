const assert = require("node:assert/strict");
const test = require("node:test");
const { readdir } = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");

const { startPlannerServer } = require("./helpers/planner-server");

// Everything else in tests/ drives a real Chrome and asserts pixel geometry
// captured on macOS, so it cannot run honestly on a Linux CI runner. This file
// needs no browser: it checks that the built bundle is actually served, that
// the storage and backup endpoints work, and that the retired legacy routes
// stay gone. It is what CI runs in place of the browser suite.

const ROUTES = ["/", "/calendar", "/journal", "/money", "/skate", "/guitar"];
const TEST_DATE = "2026-10-12";

async function get(url) {
  const response = await fetch(url);
  return { body: await response.text(), status: response.status };
}

// fetch() normalizes "../" out of a path before sending it, so a traversal
// attempt never reaches the server. This sends the raw path untouched.
function rawGet(origin, rawPath) {
  const { hostname, port } = new URL(origin);
  return new Promise((resolve, reject) => {
    const request = http.get({ hostname, port, path: rawPath }, (response) => {
      response.resume();
      response.on("end", () => resolve(response.statusCode));
    });
    request.once("error", reject);
  });
}

test("the server delivers the built application", async function () {
  const server = await startPlannerServer();
  try {
    for (const route of ROUTES) {
      const page = await get(`${server.url}${route}?date=${TEST_DATE}`);
      assert.equal(page.status, 200, `${route} did not return 200`);
      assert.match(page.body, /<div id="root"><\/div>/, `${route} did not return the React shell`);
      assert.match(page.body, /\/assets\/index-[A-Za-z0-9_-]+\.js/, `${route} did not reference a built bundle`);
    }

    // The hashed assets the shell points at must actually exist.
    const assets = await readdir(path.resolve(__dirname, "../frontend/dist/assets"));
    for (const asset of assets) {
      assert.equal((await get(`${server.url}/assets/${asset}`)).status, 200, `${asset} was not served`);
    }

    // An unknown client path falls through to the shell, so refreshing a
    // deep link does not 404.
    assert.equal((await get(`${server.url}/some/client/route`)).status, 200);
  } finally {
    await server.close();
  }
});

test("storage, export and import round-trip through the API", async function () {
  const server = await startPlannerServer();
  try {
    const put = await fetch(`${server.url}/api/kv`, {
      body: JSON.stringify({ key: "hivePlanner.weeklyGoals", value: JSON.stringify({ study: "ship it" }) }),
      headers: { "Content-Type": "application/json" },
      method: "PUT"
    });
    assert.equal(put.status, 200);

    const stored = await server.readPlannerData();
    assert.equal(stored["hivePlanner.weeklyGoals"], JSON.stringify({ study: "ship it" }));

    const exported = await (await fetch(`${server.url}/api/export`)).json();
    assert.equal(exported.data["hivePlanner.weeklyGoals"], JSON.stringify({ study: "ship it" }));

    const imported = await fetch(`${server.url}/api/import`, {
      body: JSON.stringify({ data: { "hivePlanner.weeklyGoals": JSON.stringify({ study: "restored" }) } }),
      headers: { "Content-Type": "application/json" },
      method: "POST"
    });
    assert.equal(imported.status, 200);
    assert.equal(
      (await server.readPlannerData())["hivePlanner.weeklyGoals"],
      JSON.stringify({ study: "restored" })
    );

    // Keys outside the planner's own prefix are refused.
    const foreign = await fetch(`${server.url}/api/kv`, {
      body: JSON.stringify({ key: "somethingElse.notOurs", value: "{}" }),
      headers: { "Content-Type": "application/json" },
      method: "PUT"
    });
    assert.equal(foreign.ok, false);
  } finally {
    await server.close();
  }
});

test("data written through the API outlives a server restart", async function () {
  const server = await startPlannerServer();
  try {
    await fetch(`${server.url}/api/kv`, {
      body: JSON.stringify({ key: "hivePlanner.journal.entries", value: JSON.stringify([{ id: "a" }]) }),
      headers: { "Content-Type": "application/json" },
      method: "PUT"
    });
    const before = await server.readPlannerData();

    await server.restart();

    assert.deepEqual(await server.readPlannerData(), before);
  } finally {
    await server.close();
  }
});

test("the retired legacy surface stays gone", async function () {
  const server = await startPlannerServer();
  try {
    for (const route of ["/js/app.js", "/css/styles.css", "/legacy/index.html"]) {
      const response = await get(`${server.url}${route}`);
      // A client path falls back to the shell; a legacy asset path must not.
      assert.notEqual(response.status, 200, `${route} is still being served`);
    }
    // The server refuses to resolve outside the built bundle.
    for (const traversal of [
      "/%2e%2e/%2e%2e/backend/app.py",
      "/assets/%2e%2e/%2e%2e/backend/app.py",
      "/../backend/app.py"
    ]) {
      assert.equal(await rawGet(server.url, traversal), 403, `${traversal} was not refused`);
    }
    assert.equal((await get(`${server.url}/api/nope`)).status, 404);
  } finally {
    await server.close();
  }
});
