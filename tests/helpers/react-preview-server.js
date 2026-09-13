const { access } = require("node:fs/promises");
const path = require("node:path");
const { spawn } = require("node:child_process");

const { reservePort, waitFor } = require("./planner-server");

const PROJECT_ROOT = path.resolve(__dirname, "../..");
const REACT_ROOT = path.join(PROJECT_ROOT, "frontend-react");
const VITE_ENTRY = path.join(REACT_ROOT, "node_modules/vite/bin/vite.js");

function waitForProcessExit(processHandle) {
  return new Promise(function (resolve) {
    if (processHandle.exitCode !== null) {
      resolve();
      return;
    }
    processHandle.once("exit", resolve);
  });
}

async function startReactPreviewServer(apiTarget) {
  try {
    await access(VITE_ENTRY);
  } catch {
    return null;
  }

  const port = await reservePort();
  const processHandle = spawn(process.execPath, [
    VITE_ENTRY,
    "--host",
    "127.0.0.1",
    "--port",
    String(port),
    "--strictPort"
  ], {
    cwd: REACT_ROOT,
    env: { ...process.env, VITE_PLANNER_API_TARGET: apiTarget },
    stdio: "ignore"
  });
  const url = `http://127.0.0.1:${port}`;

  try {
    await waitFor(async function () {
      const response = await fetch(url);
      return response.ok;
    }, 30_000);
  } catch (error) {
    processHandle.kill("SIGTERM");
    await waitForProcessExit(processHandle);
    throw error;
  }

  return {
    url,
    async close() {
      processHandle.kill("SIGTERM");
      await waitForProcessExit(processHandle);
    }
  };
}

module.exports = {
  startReactPreviewServer
};
