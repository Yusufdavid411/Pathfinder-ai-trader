export type CurrencyPair = {
  base: string;
  quote: string;
};

export type MarketCandle = {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type CandleRequest = {
  pair: CurrencyPair;
  interval: '1min' | '5min';
  limit: number;
};

export type CandleResponse =
  | {
      ok: true;
      provider: string;
      pair: CurrencyPair;
      interval: CandleRequest['interval'];
      candles: MarketCandle[];
    }
  | {
      ok: false;
      provider: string;
      pair: CurrencyPair;
      interval: CandleRequest['interval'];
      reason: string;
    };

export interface MarketDataProvider {
  readonly name: string;
  fetchCandles(request: CandleRequest): Promise<CandleResponse>;
}

type AlphaVantageFxSeries = Record<
  string,
  {
    '1. open'?: string;
    '2. high'?: string;
    '3. low'?: string;
    '4. close'?: string;
  }
>;

type AlphaVantageFxResponse = {
  Information?: string;
  Note?: string;
  'Error Message'?: string;
  'Time Series FX (1min)'?: AlphaVantageFxSeries;
  'Time Series FX (5min)'?: AlphaVantageFxSeries;
};

export class AlphaVantageFxProvider implements MarketDataProvider {
  readonly name = 'alpha_vantage';

  private readonly apiKey: string | undefined;

  constructor(apiKey: string | undefined) {
    const cleanKey = apiKey?.trim();
    this.apiKey = cleanKey && cleanKey !== 'not_configured' ? cleanKey : undefined;
  }

  async fetchCandles(request: CandleRequest): Promise<CandleResponse> {
    if (!this.apiKey) {
      return {
        ok: false,
        provider: this.name,
        pair: request.pair,
        interval: request.interval,
        reason: 'ALPHA_VANTAGE_API_KEY is not configured.',
      };
    }

    const url = new URL('https://www.alphavantage.co/query');
    url.searchParams.set('function', 'FX_INTRADAY');
    url.searchParams.set('from_symbol', request.pair.base);
    url.searchParams.set('to_symbol', request.pair.quote);
    url.searchParams.set('interval', request.interval);
    url.searchParams.set('outputsize', 'compact');
    url.searchParams.set('apikey', this.apiKey);

    const response = await fetch(url);
    if (!response.ok) {
      return {
        ok: false,
        provider: this.name,
        pair: request.pair,
        interval: request.interval,
        reason: `Alpha Vantage returned HTTP ${response.status}.`,
      };
    }

    const data = (await response.json()) as AlphaVantageFxResponse;
    const warning = data.Information ?? data.Note ?? data['Error Message'];
    if (warning) {
      return {
        ok: false,
        provider: this.name,
        pair: request.pair,
        interval: request.interval,
        reason: warning,
      };
    }

    const series = data[`Time Series FX (${request.interval})`];
    if (!series) {
      return {
        ok: false,
        provider: this.name,
        pair: request.pair,
        interval: request.interval,
        reason: 'Alpha Vantage response did not include FX candle data.',
      };
    }

    const candles = parseAlphaVantageFxSeries(series).slice(-request.limit);
    if (candles.length < request.limit) {
      return {
        ok: false,
        provider: this.name,
        pair: request.pair,
        interval: request.interval,
        reason: `Only ${candles.length} candles were available; ${request.limit} required.`,
      };
    }

    return {
      ok: true,
      provider: this.name,
      pair: request.pair,
      interval: request.interval,
      candles,
    };
  }
}

type TwelveDataTimeSeriesValue = {
  datetime?: string;
  open?: string;
  high?: string;
  low?: string;
  close?: string;
};

type TwelveDataTimeSeriesResponse = {
  status?: string;
  message?: string;
  values?: TwelveDataTimeSeriesValue[];
};

export class TwelveDataFxProvider implements MarketDataProvider {
  readonly name = 'twelve_data';

  private readonly apiKey: string | undefined;

  constructor(apiKey: string | undefined) {
    const cleanKey = apiKey?.trim();
    this.apiKey = cleanKey && cleanKey !== 'not_configured' ? cleanKey : undefined;
  }

  async fetchCandles(request: CandleRequest): Promise<CandleResponse> {
    if (!this.apiKey) {
      return {
        ok: false,
        provider: this.name,
        pair: request.pair,
        interval: request.interval,
        reason: 'TWELVE_DATA_API_KEY is not configured.',
      };
    }

    const url = new URL('https://api.twelvedata.com/time_series');
    url.searchParams.set('symbol', formatPair(request.pair));
    url.searchParams.set('interval', request.interval);
    url.searchParams.set('outputsize', String(request.limit));
    url.searchParams.set('apikey', this.apiKey);

    const response = await fetch(url);
    if (!response.ok) {
      return {
        ok: false,
        provider: this.name,
        pair: request.pair,
        interval: request.interval,
        reason: `Twelve Data returned HTTP ${response.status}.`,
      };
    }

    const data = (await response.json()) as TwelveDataTimeSeriesResponse;
    if (data.status === 'error') {
      return {
        ok: false,
        provider: this.name,
        pair: request.pair,
        interval: request.interval,
        reason: data.message ?? 'Twelve Data returned an error.',
      };
    }

    const candles = parseTwelveDataValues(data.values ?? []).slice(-request.limit);
    if (candles.length < request.limit) {
      return {
        ok: false,
        provider: this.name,
        pair: request.pair,
        interval: request.interval,
        reason: `Only ${candles.length} candles were available; ${request.limit} required.`,
      };
    }

    return {
      ok: true,
      provider: this.name,
      pair: request.pair,
      interval: request.interval,
      candles,
    };
  }
}

export class FallbackMarketDataProvider implements MarketDataProvider {
  readonly name = 'fallback_market_data';

  constructor(private readonly providers: readonly MarketDataProvider[]) {}

  async fetchCandles(request: CandleRequest): Promise<CandleResponse> {
    const failures: string[] = [];

    for (const provider of this.providers) {
      const response = await provider.fetchCandles(request);
      if (response.ok) {
        return response;
      }

      failures.push(`${response.provider}: ${response.reason}`);
    }

    return {
      ok: false,
      provider: this.name,
      pair: request.pair,
      interval: request.interval,
      reason: failures.join(' | '),
    };
  }
}

export function parseAlphaVantageFxSeries(series: AlphaVantageFxSeries): MarketCandle[] {
  return Object.entries(series)
    .map(([timestamp, candle]) => ({
      timestamp: new Date(`${timestamp.replace(' ', 'T')}Z`),
      open: Number.parseFloat(candle['1. open'] ?? ''),
      high: Number.parseFloat(candle['2. high'] ?? ''),
      low: Number.parseFloat(candle['3. low'] ?? ''),
      close: Number.parseFloat(candle['4. close'] ?? ''),
    }))
    .filter(
      (candle) =>
        !Number.isNaN(candle.timestamp.getTime()) &&
        Number.isFinite(candle.open) &&
        Number.isFinite(candle.high) &&
        Number.isFinite(candle.low) &&
        Number.isFinite(candle.close),
    )
    .sort((left, right) => left.timestamp.getTime() - right.timestamp.getTime());
}

export function formatPair(pair: CurrencyPair): string {
  return `${pair.base}/${pair.quote}`;
}

function parseTwelveDataValues(values: TwelveDataTimeSeriesValue[]): MarketCandle[] {
  return values
    .map((value) => ({
      timestamp: parseTwelveDataTimestamp(value.datetime),
      open: Number.parseFloat(value.open ?? ''),
      high: Number.parseFloat(value.high ?? ''),
      low: Number.parseFloat(value.low ?? ''),
      close: Number.parseFloat(value.close ?? ''),
    }))
    .filter(
      (candle) =>
        !Number.isNaN(candle.timestamp.getTime()) &&
        Number.isFinite(candle.open) &&
        Number.isFinite(candle.high) &&
        Number.isFinite(candle.low) &&
        Number.isFinite(candle.close),
    )
    .sort((left, right) => left.timestamp.getTime() - right.timestamp.getTime());
}

function parseTwelveDataTimestamp(value: string | undefined): Date {
  if (!value) {
    return new Date(Number.NaN);
  }

  return new Date(`${value.replace(' ', 'T')}Z`);
}
