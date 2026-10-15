import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FallbackMarketDataProvider,
  parseAlphaVantageFxSeries,
  TwelveDataFxProvider,
  type CandleRequest,
  type CandleResponse,
  type MarketDataProvider,
} from './marketData.js';

class FailingProvider implements MarketDataProvider {
  readonly name = 'fail';

  async fetchCandles(request: CandleRequest): Promise<CandleResponse> {
    return {
      ok: false,
      provider: this.name,
      pair: request.pair,
      interval: request.interval,
      reason: 'not available',
    };
  }
}

class SuccessfulProvider implements MarketDataProvider {
  readonly name = 'success';

  async fetchCandles(request: CandleRequest): Promise<CandleResponse> {
    return {
      ok: true,
      provider: this.name,
      pair: request.pair,
      interval: request.interval,
      candles: [],
    };
  }
}

test('fallback provider uses first successful provider', async () => {
  const provider = new FallbackMarketDataProvider([
    new FailingProvider(),
    new SuccessfulProvider(),
  ]);
  const response = await provider.fetchCandles({
    pair: { base: 'EUR', quote: 'USD' },
    interval: '1min',
    limit: 30,
  });

  assert.equal(response.ok, true);
  assert.equal(response.provider, 'success');
});

test('fallback provider reports all provider failures', async () => {
  const provider = new FallbackMarketDataProvider([new FailingProvider()]);
  const response = await provider.fetchCandles({
    pair: { base: 'EUR', quote: 'USD' },
    interval: '1min',
    limit: 30,
  });

  assert.equal(response.ok, false);
  if (!response.ok) {
    assert.match(response.reason, /fail: not available/);
  }
});

test('twelve data provider reports missing key without network calls', async () => {
  const provider = new TwelveDataFxProvider('not_configured');
  const response = await provider.fetchCandles({
    pair: { base: 'EUR', quote: 'USD' },
    interval: '1min',
    limit: 30,
  });

  assert.equal(response.ok, false);
  if (!response.ok) {
    assert.match(response.reason, /TWELVE_DATA_API_KEY is not configured/);
  }
});

test('alpha vantage series parser sorts candles chronologically', () => {
  const candles = parseAlphaVantageFxSeries({
    '2026-09-12 12:01:00': {
      '1. open': '1.2',
      '2. high': '1.3',
      '3. low': '1.1',
      '4. close': '1.25',
    },
    '2026-09-12 12:00:00': {
      '1. open': '1.1',
      '2. high': '1.2',
      '3. low': '1.0',
      '4. close': '1.15',
    },
  });

  assert.equal(candles[0].timestamp.toISOString(), '2026-09-12T12:00:00.000Z');
  assert.equal(candles[1].timestamp.toISOString(), '2026-09-12T12:01:00.000Z');
});
