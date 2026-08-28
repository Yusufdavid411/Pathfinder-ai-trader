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
