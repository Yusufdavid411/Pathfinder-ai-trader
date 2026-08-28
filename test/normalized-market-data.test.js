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

test("adapter exposes only its most recent normalized snapshot", () => {
  const adapter = new IqOptionMarketDataAdapter();
  const value = adapter.ingest({ asset: "EUR/USD (OTC)", market_type: "otc", price: 1.2, status: "live" });
  assert.deepEqual(adapter.getSnapshot(), value);
  assert.equal(value.broker, "iq_option");
});
