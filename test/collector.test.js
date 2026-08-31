import test from "node:test";
import assert from "node:assert/strict";
import { IqOptionTraderoomCollector } from "../browser/iq-option-reader/collector.js";

const fakeRoot = (values) => ({
  querySelector(selector) {
    const value = values[selector];
    return value === undefined ? null : { textContent: value, getAttribute: () => null };
  },
});
const selectors = { asset: ["asset"], price: ["price"], payout: ["payout"], candleInterval: ["interval"], expiry: ["expiry"], timestamp: ["time"], mode: ["mode"] };

test("collector parses only explicit DOM values and detects staleness", () => {
  const root = fakeRoot({ asset: "EUR/USD (OTC)", price: "1.0842", payout: "87%", interval: "5m", expiry: "30s", time: "2026-01-01T00:00:00Z", mode: "Binary" });
  const collector = new IqOptionTraderoomCollector({ root, selectors, staleAfterMs: 1000 });
  const live = collector.collect(100);
  assert.equal(live.market_type, "otc");
  assert.equal(live.trading_mode, "binary");
  assert.equal(live.candle_interval_seconds, 300);
  assert.equal(live.status, "live");
  assert.equal(collector.collect(1101).status, "stale");
});

test("collector leaves ambiguous and malformed fields unknown", () => {
  const root = fakeRoot({ asset: "EUR/USD", price: "Price 1.2", payout: "--", mode: "Turbo" });
  const value = new IqOptionTraderoomCollector({ root, selectors }).collect(100);
  assert.equal(value.market_type, "unknown");
  assert.equal(value.trading_mode, "unknown");
  assert.equal(value.price, null);
  assert.equal(value.payout_percent, null);
});

test("collector ignores changing non-quote fields for freshness", () => {
  const values = { asset: "EUR/USD", price: "1.0842", payout: "87%", interval: "5m", expiry: "30s", mode: "Binary" };
  const collector = new IqOptionTraderoomCollector({ root: fakeRoot(values), selectors, staleAfterMs: 1000 });

  assert.equal(collector.collect(100).status, "live");

  values.payout = "88%";
  values.interval = "1m";
  values.expiry = "29s";

  const stale = collector.collect(1201);
  assert.equal(stale.freshness_ms, 1101);
  assert.equal(stale.status, "stale");

  values.price = "1.0843";
  const fresh = collector.collect(1300);
  assert.equal(fresh.freshness_ms, 0);
  assert.equal(fresh.status, "live");
});

test("collector requires real market data before reporting availability", () => {
  const root = fakeRoot({ time: "2026-01-01T00:00:00Z" });
  const value = new IqOptionTraderoomCollector({ root, selectors }).collect(100);

  assert.equal(value.timestamp, "2026-01-01T00:00:00Z");
  assert.equal(value.freshness_ms, null);
  assert.equal(value.status, "unavailable");
});

test("collector rejects malformed timestamps", () => {
  const root = fakeRoot({ time: "not-a-timestamp" });
  const value = new IqOptionTraderoomCollector({ root, selectors }).collect(100);

  assert.equal(value.timestamp, "");
  assert.equal(value.freshness_ms, null);
  assert.equal(value.status, "unavailable");
});
