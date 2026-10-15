import assert from 'node:assert/strict';
import test from 'node:test';

import type { CandleRequest, CandleResponse, MarketDataProvider } from './marketData.js';
import { analyzeCandles, renderMarketScanResult, scanMarket } from './marketScanner.js';

class RisingMarketProvider implements MarketDataProvider {
  readonly name = 'rising_test_provider';

  async fetchCandles(request: CandleRequest): Promise<CandleResponse> {
    const start = Date.parse('2026-09-12T12:00:00Z');
    const candles = Array.from({ length: request.limit }, (_, index) => {
      const close = 1.1 + index * 0.0002;
      return {
        timestamp: new Date(start + index * 60_000),
        open: close - 0.00012,
        high: close + 0.00018,
        low: close - 0.00018,
        close,
      };
    });

    return {
      ok: true,
      provider: 'test',
      pair: request.pair,
      interval: request.interval,
      candles,
    };
  }
}

test('scanner returns a manual-review candidate from rising candle data', async () => {
  const result = await scanMarket(new RisingMarketProvider());

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.provider, 'test');
    assert.equal(result.candidate.direction, 'BUY');
    assert.ok(result.candidate.signalStrength >= 65);
  }
});

test('trade candidate rendering never claims execution', async () => {
  const result = await scanMarket(new RisingMarketProvider());
  const message = renderMarketScanResult(result);

  assert.match(message, /TRADE CANDIDATE - MANUAL REVIEW ONLY/);
  assert.match(message, /Execution: disabled/);
});

test('analyzer waits when candles have no clear setup', () => {
  const start = Date.parse('2026-09-12T12:00:00Z');
  const candles = Array.from({ length: 30 }, (_, index) => ({
    timestamp: new Date(start + index * 60_000),
    open: 1.1,
    high: 1.1001,
    low: 1.0999,
    close: 1.1,
  }));

  const candidate = analyzeCandles(candles, { base: 'EUR', quote: 'USD' });

  assert.equal(candidate.direction, 'WAIT');
});
