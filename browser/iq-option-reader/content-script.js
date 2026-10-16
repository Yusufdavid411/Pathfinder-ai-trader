import { IqOptionTraderoomCollector } from "./collector.js";
import { DebugPanel } from "./debug-panel.js";
import { executePracticeOrder, inspectPracticeTraderoom } from "./practice-executor.js";

const collector = new IqOptionTraderoomCollector();
const panel = new DebugPanel();
let activeToken = null;
let stopped = false;

const bridgeMessage = (message) =>
  new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      const runtimeError = chrome.runtime.lastError;
      if (runtimeError) {
        reject(new Error(runtimeError.message));
        return;
      }
      if (!response?.ok) {
        reject(new Error(response?.error ?? "Local bridge is unavailable."));
        return;
      }
      resolve(response.data);
    });
  });

const updatePanel = (connection = {}) =>
  panel.render({
    market: collector.collect(),
    practice: inspectPracticeTraderoom(),
    connector: connection,
  });

const connectorLoop = async () => {
  if (stopped) return;
  const practice = inspectPracticeTraderoom();
  try {
    await bridgeMessage({
      type: "PAT_BRIDGE_HEARTBEAT",
      payload: {
        account_mode: practice.account_mode,
        account_evidence: practice.account_evidence,
        asset: practice.asset,
        ready: practice.ready,
        page_url: location.href,
        extension_version: chrome.runtime.getManifest().version,
      },
    });

    const pending = await bridgeMessage({ type: "PAT_BRIDGE_NEXT" });
    if (pending?.token && pending?.command && pending.token !== activeToken) {
      activeToken = pending.token;
      updatePanel({ online: true, status: "executing", request_id: pending.command.id });
      const result = await executePracticeOrder(pending.command);
      await bridgeMessage({
        type: "PAT_BRIDGE_COMPLETE",
        token: pending.token,
        payload: result,
      });
      activeToken = null;
      updatePanel({ online: true, status: result.success ? "verified" : "failed", message: result.message });
    } else {
      updatePanel({ online: true, status: practice.ready ? "ready" : "not_ready" });
    }
  } catch (error) {
    updatePanel({
      online: false,
      status: "bridge_offline",
      message: error instanceof Error ? error.message : String(error),
    });
  } finally {
    setTimeout(connectorLoop, activeToken ? 250 : 1000);
  }
};

connectorLoop();
window.addEventListener("beforeunload", () => {
  stopped = true;
});
