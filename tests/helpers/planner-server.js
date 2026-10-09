const { mkdtemp, rm } = require("node:fs/promises");
const http = require("node:http");
const net = require("node:net");
const { tmpdir } = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

const PROJECT_ROOT = path.resolve(__dirname, "../..");
const DEFAULT_TIMEOUT_MS = 10_000;

function delay(milliseconds) {
  return new Promise(function (resolve) {
    setTimeout(resolve, milliseconds);
  });
}

function reservePort() {
  return new Promise(function (resolve, reject) {
    const socket = net.createServer();
    socket.once("error", reject);
    socket.listen(0, "127.0.0.1", function () {
      const address = socket.address();
      socket.close(function () {
        resolve(address.port);
      });
    });
  });
}

function requestJson(url) {
  return new Promise(function (resolve, reject) {
    const request = http.get(url, function (response) {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", function (chunk) {
        body += chunk;
      });
      response.on("end", function () {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`Request failed with status ${response.statusCode}: ${url}`));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
    });
    request.once("error", reject);
  });
}

async function waitFor(callback, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;

  while (Date.now() < deadline) {
    try {
      const result = await callback();
      if (result) {
        return result;
      }
    } catch (error) {
      lastError = error;
    }
    await delay(50);
  }

  if (lastError) {
    throw lastError;
  }
  throw new Error(`Condition was not met within ${timeoutMs}ms.`);
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

async function startPlannerServer(options = {}) {
  const frontendMode = options.frontendMode || "legacy";
  const port = await reservePort();
  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), "yuan-planner-e2e-"));
  const databasePath = path.join(temporaryDirectory, "planner.db");
  const processHandle = spawn(process.env.PYTHON_BIN || "python3", ["backend/app.py"], {
    cwd: PROJECT_ROOT,
    env: {
      ...process.env,
      YUAN_PLANNER_DB_PATH: databasePath,
      YUAN_PLANNER_FRONTEND_MODE: frontendMode,
      YUAN_PLANNER_HOST: "127.0.0.1",
      YUAN_PLANNER_PORT: String(port),
      YUAN_PLANNER_TELEGRAM_ENABLED: "0"
    },
    stdio: "ignore"
  });
  const url = `http://127.0.0.1:${port}`;

  try {
    await waitFor(async function () {
      const payload = await requestJson(`${url}/api/kv`);
      return payload && payload.data ? payload : null;
    });
  } catch (error) {
    processHandle.kill("SIGTERM");
    await waitForProcessExit(processHandle);
    await rm(temporaryDirectory, { recursive: true, force: true });
    throw error;
  }

  return {
    url,
    waitFor,
    async readPlannerData() {
      const payload = await requestJson(`${url}/api/kv`);
      return payload.data;
    },
    async close() {
      // SIGINT lets the local server stop its reminder thread cleanly.
      processHandle.kill("SIGINT");
      await waitForProcessExit(processHandle);
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  };
}

module.exports = {
  reservePort,
  waitFor,
  startPlannerServer
};
