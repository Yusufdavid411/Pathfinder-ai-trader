import { createUnavailableSnapshot, normalizeSnapshot } from "./normalized-market-data.js";

export const DEFAULT_SELECTORS = Object.freeze({
  asset: ['[data-test="instrument-name"]', '[data-testid="instrument-name"]'],
  price: ['[data-test="current-price"]', '[data-testid="current-price"]'],
  payout: ['[data-test="payout"]', '[data-testid="payout"]'],
  candleInterval: ['[data-test="candle-interval"]', '[data-testid="candle-interval"]'],
  expiry: ['[data-test="expiration"]', '[data-testid="expiration"]'],
  timestamp: [
    '[data-test="market-data-timestamp"]',
    '[data-testid="market-data-timestamp"]',
    '[data-test="quote-timestamp"]',
    '[data-testid="quote-timestamp"]',
  ],
  mode: ['[data-test="instrument-type"]', '[data-testid="instrument-type"]'],
});

const text = (element) => element?.getAttribute?.("datetime") || element?.textContent?.trim() || "";
const first = (root, selectors) => {
  for (const selector of selectors) {
    const value = root.querySelector(selector);
    if (value) return value;
  }
  return null;
};
const decimal = (value) => {
  const compact = value.replace(/\s/g, "").replace(",", ".");
  const match = compact.match(/^-?\d+(?:\.\d+)?(?:%)?$/);
  return match ? Number(compact.replace("%", "")) : null;
};
const duration = (value) => {
  const match = value.trim().match(/^(\d+)(s|m|h)$/i);
  if (!match) return null;
  return Number(match[1]) * ({ s: 1, m: 60, h: 3600 })[match[2].toLowerCase()];
};
const verifiedCollectorTimestamp = (value) => {
  const timestamp = value.trim();
  return timestamp && Number.isFinite(Date.parse(timestamp)) ? timestamp : "";
};

export class IqOptionTraderoomCollector {
  #lastFingerprint = "";
  #lastChangeAt = null;
  #snapshot = createUnavailableSnapshot();

  constructor({ root = document, selectors = DEFAULT_SELECTORS, staleAfterMs = 5000, logger = console } = {}) {
    this.root = root;
    this.selectors = selectors;
    this.staleAfterMs = staleAfterMs;
    this.logger = logger;
  }

  collect(now = Date.now()) {
    try {
      const asset = text(first(this.root, this.selectors.asset));
      const price = decimal(text(first(this.root, this.selectors.price)));
      const payout = decimal(text(first(this.root, this.selectors.payout)));
      const interval = duration(text(first(this.root, this.selectors.candleInterval)));
      const expiry = duration(text(first(this.root, this.selectors.expiry)));
      const timestamp = verifiedCollectorTimestamp(text(first(this.root, this.selectors.timestamp)));
      const modeText = text(first(this.root, this.selectors.mode)).toLowerCase();
      const marketType = /\botc\b/i.test(asset) ? "otc" : /\bnormal\b/i.test(asset) ? "normal" : "unknown";
      const tradingMode = /\bblitz\b/.test(modeText) ? "blitz" : /\bbinary\b/.test(modeText) ? "binary" : "unknown";
      const fingerprint = JSON.stringify([asset, price, timestamp]);
      const hasMarketData = Boolean(asset && price !== null);

      if (hasMarketData && fingerprint !== this.#lastFingerprint) {
        this.#lastFingerprint = fingerprint;
        this.#lastChangeAt = now;
      }
      const freshness = hasMarketData && this.#lastChangeAt !== null ? now - this.#lastChangeAt : null;
      const status = !hasMarketData ? "unavailable" : freshness !== null && freshness > this.staleAfterMs ? "stale" : "live";

      this.#snapshot = normalizeSnapshot({
        asset,
        market_type: marketType,
        trading_mode: tradingMode,
        price,
        payout_percent: payout,
        candle_interval_seconds: interval,
        expiry_seconds: expiry,
        timestamp,
        freshness_ms: freshness,
        status,
      }, now);
    } catch (error) {
      this.logger.error("[Pathfinder IQ Reader] DOM parsing failed", error);
      this.#snapshot = createUnavailableSnapshot();
    }
    return this.#snapshot;
  }
}
