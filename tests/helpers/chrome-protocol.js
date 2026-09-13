const DEFAULT_TIMEOUT_MS = 10_000;

function createProtocolConnection(socket) {
  const pendingCommands = new Map();
  const eventWaiters = new Map();
  const browserErrors = [];
  let nextCommandId = 1;

  function rejectPendingCommands(error) {
    pendingCommands.forEach(function (pending) {
      pending.reject(error);
    });
    pendingCommands.clear();
  }

  function settleEventWaiters(message) {
    const waiters = eventWaiters.get(message.method) || [];
    const remaining = [];
    waiters.forEach(function (waiter) {
      if (!waiter.sessionId || waiter.sessionId === message.sessionId) {
        clearTimeout(waiter.timeoutId);
        waiter.resolve(message.params || {});
      } else {
        remaining.push(waiter);
      }
    });
    eventWaiters.set(message.method, remaining);
  }

  function recordBrowserError(message) {
    if (message.method === "Runtime.exceptionThrown") {
      const details = message.params && message.params.exceptionDetails;
      const description = details && details.exception && details.exception.description;
      browserErrors.push(description || (details && details.text) || "Uncaught browser exception");
    }
    if (message.method === "Runtime.consoleAPICalled" && message.params && message.params.type === "error") {
      const values = (message.params.args || []).map(function (argument) {
        return argument.value || argument.description || "";
      });
      browserErrors.push(values.join(" ").trim() || "Browser console error");
    }
    if (message.method === "Log.entryAdded" && message.params && message.params.entry.level === "error") {
      browserErrors.push(message.params.entry.text);
    }
  }

  function handleMessage(message) {
    if (message.id) {
      const pending = pendingCommands.get(message.id);
      if (!pending) {
        return;
      }
      pendingCommands.delete(message.id);
      if (message.error) {
        pending.reject(new Error(message.error.message));
      } else {
        pending.resolve(message.result || {});
      }
      return;
    }
    recordBrowserError(message);
    settleEventWaiters(message);
  }

  socket.addEventListener("message", function (event) {
    handleMessage(JSON.parse(String(event.data)));
  });
  socket.addEventListener("close", function () {
    rejectPendingCommands(new Error("Chrome closed before the browser command completed."));
  });

  function send(method, params = {}, sessionId = undefined) {
    const id = nextCommandId;
    nextCommandId += 1;
    const message = { id, method, params };
    if (sessionId) {
      message.sessionId = sessionId;
    }
    const result = new Promise(function (resolve, reject) {
      const timeoutId = setTimeout(function () {
        pendingCommands.delete(id);
        reject(new Error(`Browser command ${method} did not finish within ${DEFAULT_TIMEOUT_MS}ms.`));
      }, DEFAULT_TIMEOUT_MS);
      pendingCommands.set(id, {
        resolve(value) {
          clearTimeout(timeoutId);
          resolve(value);
        },
        reject(error) {
          clearTimeout(timeoutId);
          reject(error);
        }
      });
    });
    socket.send(JSON.stringify(message));
    return result;
  }

  function waitForEvent(method, sessionId, timeoutMs = DEFAULT_TIMEOUT_MS) {
    return new Promise(function (resolve, reject) {
      const waiters = eventWaiters.get(method) || [];
      const timeoutId = setTimeout(function () {
        const current = eventWaiters.get(method) || [];
        eventWaiters.set(method, current.filter(function (waiter) {
          return waiter.resolve !== resolve;
        }));
        reject(new Error(`Browser event ${method} did not arrive within ${timeoutMs}ms.`));
      }, timeoutMs);
      waiters.push({ resolve, sessionId, timeoutId });
      eventWaiters.set(method, waiters);
    });
  }

  return {
    errors() {
      return browserErrors.slice();
    },
    send,
    waitForEvent
  };
}

module.exports = {
  createProtocolConnection
};
