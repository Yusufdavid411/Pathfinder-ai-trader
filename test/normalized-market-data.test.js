import test from "node:test";
import assert from "node:assert/strict";
import { createUnavailableSnapshot, normalizeSnapshot } from "../browser/iq-option-reader/normalized-market-data.js";
import { IqOptionMarketDataAdapter } from "../broker_engine/iq_option/market-data-adapter.js";

test("unavailable snapshot is safe and read-only", () => {
  const value = createUnavailableSnapshot();
  assert.equal(value.status, "unavailable");
  assert.equal(value.price, null);
  assert.equal(value.market_type, "unknown");
  assert.ok(Object.isFrozen(value));
});

test("normalization rejects guesses and coercion", () => {
  const value = normalizeSnapshot({ price: "1.23", market_type: "weekend", trading_mode: "turbo", status: "maybe" });
  assert.equal(value.price, null);
  assert.equal(value.market_type, "unknown");
  assert.equal(value.trading_mode, "unknown");
  assert.equal(value.status, "unavailable");
});

test("normalization requires market data before reporting live status", () => {
  const value = normalizeSnapshot({ timestamp: "2026-01-01T00:00:00Z", freshness_ms: 0, status: "live" });
  assert.equal(value.timestamp, "2026-01-01T00:00:00Z");
  assert.equal(value.freshness_ms, null);
  assert.equal(value.status, "unavailable");
});

test("normalization rejects malformed timestamps", () => {
  const value = normalizeSnapshot({ asset: "EUR/USD", price: 1.2, timestamp: "soon", freshness_ms: 0, status: "live" });
  assert.equal(value.timestamp, "");
  assert.equal(value.freshness_ms, null);
  assert.equal(value.status, "unavailable");
});

test("normalization derives freshness only from verified market timestamps", () => {
  const value = normalizeSnapshot({
    asset: "EUR/USD",
    price: 1.2,
    timestamp: "2026-01-01T00:00:00Z",
    status: "live",
  }, Date.parse("2026-01-01T00:00:02Z"));

  assert.equal(value.freshness_ms, 2000);
  assert.equal(value.status, "live");
});

test("adapter exposes only its most recent normalized snapshot", () => {
  const adapter = new IqOptionMarketDataAdapter();
  const value = adapter.ingest({ asset: "EUR/USD (OTC)", market_type: "otc", price: 1.2, status: "live" });
  assert.deepEqual(adapter.getSnapshot(), value);
  assert.equal(value.broker, "iq_option");
});
