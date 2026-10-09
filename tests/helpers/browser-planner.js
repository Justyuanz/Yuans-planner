const { findChromeExecutable, startChromeSession } = require("./chrome-cdp");
const { startPlannerServer } = require("./planner-server");

async function startBrowserPlanner(context, options = {}) {
  const chromeExecutable = await findChromeExecutable();
  if (!chromeExecutable) {
    context.skip("Chrome or Chromium is required for browser smoke tests.");
    return null;
  }
  if (typeof WebSocket !== "function") {
    context.skip("A Node.js runtime with WebSocket support is required for browser smoke tests.");
    return null;
  }

  const server = await startPlannerServer(options);
  context.after(async function () {
    await server.close();
  });

  const browser = await startChromeSession(chromeExecutable);
  context.after(async function () {
    await browser.close();
  });

  return { browser, server };
}

module.exports = {
  startBrowserPlanner
};
