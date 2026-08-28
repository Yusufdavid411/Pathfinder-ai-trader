const MARKET_TYPES = new Set(["normal", "otc", "unknown"]);
const TRADING_MODES = new Set(["binary", "blitz", "unknown"]);
const STATUSES = new Set(["live", "stale", "unavailable"]);

export const IQ_OPTION_SOURCE = "iq_option_traderoom";

export function createUnavailableSnapshot() {
  return Object.freeze({
    broker: "iq_option",
    asset: "",
    market_type: "unknown",
    trading_mode: "unknown",
    price: null,
    payout_percent: null,
    candle_interval_seconds: null,
    expiry_seconds: null,
    timestamp: "",
    source: IQ_OPTION_SOURCE,
    freshness_ms: null,
    status: "unavailable",
  });
}

const finiteOrNull = (value) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;
const nonNegativeOrNull = (value) => {
  const number = finiteOrNull(value);
  return number !== null && number >= 0 ? number : null;
};

/** Drop unexpected/unverified values rather than coercing or guessing them. */
export function normalizeSnapshot(candidate = {}, receivedAt = Date.now()) {
  const timestamp = typeof candidate.timestamp === "string" ? candidate.timestamp : "";
  const freshness = nonNegativeOrNull(candidate.freshness_ms);
  const status = STATUSES.has(candidate.status) ? candidate.status : "unavailable";

  return Object.freeze({
    broker: "iq_option",
    asset: typeof candidate.asset === "string" ? candidate.asset.trim() : "",
    market_type: MARKET_TYPES.has(candidate.market_type) ? candidate.market_type : "unknown",
    trading_mode: TRADING_MODES.has(candidate.trading_mode) ? candidate.trading_mode : "unknown",
    price: finiteOrNull(candidate.price),
    payout_percent: nonNegativeOrNull(candidate.payout_percent),
    candle_interval_seconds: nonNegativeOrNull(candidate.candle_interval_seconds),
    expiry_seconds: nonNegativeOrNull(candidate.expiry_seconds),
    timestamp,
    source: IQ_OPTION_SOURCE,
    freshness_ms: freshness === null && timestamp ? Math.max(0, receivedAt - Date.parse(timestamp)) || 0 : freshness,
    status,
  });
}
