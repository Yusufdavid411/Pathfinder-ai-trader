const BRIDGE_BASE_URL = 'http://127.0.0.1:8765';

const allowedSender = (sender) => {
  try {
    const url = new URL(sender.url ?? '');
    return url.protocol === 'https:' && (url.hostname === 'iqoption.com' || url.hostname.endsWith('.iqoption.com'));
  } catch {
    return false;
  }
};

const bridgeFetch = async (path, options = {}) => {
  const response = await fetch(`${BRIDGE_BASE_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
  });
  if (response.status === 204) return null;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? `Local bridge returned HTTP ${response.status}.`);
  return body;
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!allowedSender(sender)) {
    sendResponse({ ok: false, error: 'Messages are accepted only from an IQ Option HTTPS tab.' });
    return false;
  }

  const operation = (async () => {
    if (message?.type === 'PAT_BRIDGE_HEARTBEAT') {
      return bridgeFetch('/v1/extension/heartbeat', {
        method: 'POST',
        body: JSON.stringify(message.payload),
      });
    }
    if (message?.type === 'PAT_BRIDGE_NEXT') {
      return bridgeFetch('/v1/executions/pending');
    }
    if (message?.type === 'PAT_BRIDGE_COMPLETE') {
      return bridgeFetch(`/v1/executions/${encodeURIComponent(message.token)}/complete`, {
        method: 'POST',
        body: JSON.stringify(message.payload),
      });
    }
    throw new Error('Unknown Pathfinder bridge message.');
  })();

  operation.then(
    (data) => sendResponse({ ok: true, data }),
    (error) => sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) }),
  );
  return true;
});
