const { access, mkdtemp, readFile, rm } = require("node:fs/promises");
const { constants } = require("node:fs");
const { tmpdir } = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

const { createProtocolConnection } = require("./chrome-protocol");

const DEFAULT_TIMEOUT_MS = 10_000;
const CHROME_CANDIDATES = [
  process.env.CHROME_BIN,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser"
].filter(Boolean);

function browserTestUrl(url) {
  const parsed = new URL(url);
  if (parsed.pathname === "/"
    && parsed.searchParams.has("date")
    && !parsed.searchParams.has("live")) {
    parsed.searchParams.set("preview", "1");
  }
  return parsed.href;
}

function delay(milliseconds) {
  return new Promise(function (resolve) {
    setTimeout(resolve, milliseconds);
  });
}

async function findChromeExecutable() {
  for (const candidate of CHROME_CANDIDATES) {
    try {
      await access(candidate, constants.X_OK);
      return candidate;
    } catch (error) {
      // Keep checking common platform paths when a candidate is unavailable.
    }
  }
  return null;
}

function waitForProcessExit(processHandle) {
  return new Promise(function (resolve) {
    if (processHandle.exitCode !== null) {
      resolve();
      return;
    }
    processHandle.once("exit", resolve);
  });
}

async function readDevToolsUrl(userDataDirectory, processHandle) {
  const activePortPath = path.join(userDataDirectory, "DevToolsActivePort");
  const deadline = Date.now() + DEFAULT_TIMEOUT_MS;

  while (Date.now() < deadline) {
    if (processHandle.exitCode !== null) {
      throw new Error("Chrome exited before its debugging endpoint was ready.");
    }
    try {
      const [port, browserPath] = (await readFile(activePortPath, "utf8")).trim().split("\n");
      if (port && browserPath) {
        return `ws://127.0.0.1:${port}${browserPath}`;
      }
    } catch (error) {
      // Chrome creates this file only after the local endpoint is ready.
    }
    await delay(50);
  }

  throw new Error("Chrome debugging endpoint did not start in time.");
}

function connectWebSocket(url) {
  return new Promise(function (resolve, reject) {
    const socket = new WebSocket(url);
    socket.addEventListener("open", function () {
      resolve(socket);
    }, { once: true });
    socket.addEventListener("error", function () {
      reject(new Error("Could not connect to Chrome's debugging endpoint."));
    }, { once: true });
  });
}

async function startChromeSession(executable) {
  if (typeof WebSocket !== "function") {
    throw new Error("This browser smoke test requires a Node.js runtime with WebSocket support.");
  }

  const userDataDirectory = await mkdtemp(path.join(tmpdir(), "yuan-planner-chrome-"));
  const processHandle = spawn(executable, [
    "--headless=new",
    "--remote-debugging-address=127.0.0.1",
    "--remote-debugging-port=0",
    `--user-data-dir=${userDataDirectory}`,
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-default-apps",
    "--disable-extensions",
    "--disable-sync",
    "--metrics-recording-only",
    "--no-first-run",
    "--no-sandbox"
  ], {
    stdio: "ignore"
  });
  let socket = null;

  try {
    const devToolsUrl = await readDevToolsUrl(userDataDirectory, processHandle);
    socket = await connectWebSocket(devToolsUrl);
    const protocol = createProtocolConnection(socket);
    const target = await protocol.send("Target.createTarget", { url: "about:blank" });
    const attachment = await protocol.send("Target.attachToTarget", {
      targetId: target.targetId,
      flatten: true
    });
    const sessionId = attachment.sessionId;
    await Promise.all([
      protocol.send("Page.enable", {}, sessionId),
      protocol.send("Runtime.enable", {}, sessionId),
      protocol.send("Log.enable", {}, sessionId)
    ]);

    async function waitForPageLoad(command, params) {
      const loaded = protocol.waitForEvent("Page.loadEventFired", sessionId);
      await protocol.send(command, params, sessionId);
      await loaded;
    }

    async function evaluate(expression) {
      const response = await protocol.send("Runtime.evaluate", {
        expression,
        awaitPromise: true,
        returnByValue: true
      }, sessionId);
      if (response.exceptionDetails) {
        const details = response.exceptionDetails;
        throw new Error(details.exception && details.exception.description || details.text);
      }
      return response.result && response.result.value;
    }

    return {
      errors: protocol.errors,
      evaluate,
      async setViewport(width, height, mobile = false) {
        await protocol.send("Emulation.setDeviceMetricsOverride", {
          deviceScaleFactor: 1,
          height,
          mobile,
          width
        }, sessionId);
      },
      async captureScreenshot(clipExpression) {
        const clip = clipExpression ? await evaluate(clipExpression) : undefined;
        const response = await protocol.send("Page.captureScreenshot", {
          captureBeyondViewport: false,
          format: "png",
          fromSurface: true,
          ...(clip ? { clip: { ...clip, scale: 1 } } : {})
        }, sessionId);
        return response.data;
      },
      async open(url) {
        // Existing visual contracts use fixed Dashboard dates. Mark those as
        // intentional previews while live-date regression tests opt out.
        await waitForPageLoad("Page.navigate", { url: browserTestUrl(url) });
      },
      async reload() {
        await waitForPageLoad("Page.reload", { ignoreCache: true });
      },
      async waitForExpression(expression, timeoutMs = DEFAULT_TIMEOUT_MS) {
        const deadline = Date.now() + timeoutMs;
        let lastError = null;
        while (Date.now() < deadline) {
          try {
            if (await evaluate(expression)) {
              return;
            }
            lastError = null;
          } catch (error) {
            // Navigation can briefly detach an iframe document while it reloads.
            lastError = error;
          }
          await delay(50);
        }
        const errorDetail = lastError ? ` Last evaluation error: ${lastError.message}` : "";
        throw new Error(
          `Browser expression was not true within ${timeoutMs}ms: ${expression}.${errorDetail}`
        );
      },
      async close() {
        socket.close();
        processHandle.kill("SIGTERM");
        await waitForProcessExit(processHandle);
        await rm(userDataDirectory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
      }
    };
  } catch (error) {
    if (socket) {
      socket.close();
    }
    processHandle.kill("SIGTERM");
    await waitForProcessExit(processHandle);
    await rm(userDataDirectory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    throw error;
  }
}

module.exports = {
  findChromeExecutable,
  startChromeSession
};
