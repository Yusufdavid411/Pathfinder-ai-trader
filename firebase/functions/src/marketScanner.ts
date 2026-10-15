import {
  formatPair,
  type CurrencyPair,
  type MarketCandle,
  type MarketDataProvider,
} from './marketData.js';

export type CandidateDirection = 'BUY' | 'SELL' | 'WAIT';

export type TradeCandidate = {
  pair: CurrencyPair;
  direction: CandidateDirection;
  signalStrength: number;
  expiryMinutes: number;
  latestCandleTime: Date;
  reasons: string[];
};

export type MarketScanResult =
  | {
      ok: true;
      provider: string;
      generatedAt: Date;
      candidate: TradeCandidate;
    }
  | {
      ok: false;
      provider: string;
      generatedAt: Date;
      reason: string;
    };

export const defaultScanPairs: readonly CurrencyPair[] = [
  { base: 'EUR', quote: 'USD' },
  { base: 'GBP', quote: 'USD' },
  { base: 'USD', quote: 'JPY' },
  { base: 'AUD', quote: 'USD' },
  { base: 'EUR', quote: 'JPY' },
];

export async function scanMarket(provider: MarketDataProvider): Promise<MarketScanResult> {
  const generatedAt = new Date();
  const candidates: TradeCandidate[] = [];
  const errors: string[] = [];

  for (const pair of defaultScanPairs) {
    const response = await provider.fetchCandles({
      pair,
      interval: '1min',
      limit: 30,
    });

    if (!response.ok) {
      errors.push(`${formatPair(pair)}: ${response.reason}`);
      continue;
    }

    const candidate = analyzeCandles(response.candles, pair);
    if (candidate.direction !== 'WAIT') {
      candidates.push(candidate);
    }
  }

  if (candidates.length === 0) {
    return {
      ok: false,
      provider: provider.name,
      generatedAt,
      reason:
        errors.length > 0
          ? errors[0]
          : 'No market pair passed the minimum quality rules for a manual-review candidate.',
    };
  }

  const candidate = candidates.sort((left, right) => right.signalStrength - left.signalStrength)[0];

  return {
    ok: true,
    provider: provider.name,
    generatedAt,
    candidate,
  };
}

export function analyzeCandles(candles: MarketCandle[], pair: CurrencyPair): TradeCandidate {
  const closes = candles.map((candle) => candle.close);
  const latest = candles[candles.length - 1];
  const previous = candles[candles.length - 2];
  const emaFast = exponentialMovingAverage(closes, 5);
  const emaSlow = exponentialMovingAverage(closes, 14);
  const rsi = relativeStrengthIndex(closes, 14);
  const recentRange = averageRange(candles.slice(-10));
  const recentBody = Math.abs(latest.close - latest.open);
  const momentum = latest.close - previous.close;
  const trendThreshold = recentRange * 0.05;
  const momentumThreshold = recentRange * 0.1;

  const bullishScore = scoreDirection({
    trend: emaFast - emaSlow,
    momentum,
    trendThreshold,
    momentumThreshold,
    rsi,
    candleBodyRatio: recentRange === 0 ? 0 : recentBody / recentRange,
  });
  const bearishScore = scoreDirection({
    trend: emaSlow - emaFast,
    momentum: -momentum,
    trendThreshold,
    momentumThreshold,
    rsi: 100 - rsi,
    candleBodyRatio: recentRange === 0 ? 0 : recentBody / recentRange,
  });

  const direction: CandidateDirection =
    Math.max(bullishScore, bearishScore) < 65
      ? 'WAIT'
      : bullishScore >= bearishScore
        ? 'BUY'
        : 'SELL';
  const signalStrength =
    direction === 'BUY' ? bullishScore : direction === 'SELL' ? bearishScore : 0;

  return {
    pair,
    direction,
    signalStrength,
    expiryMinutes: 2,
    latestCandleTime: latest.timestamp,
    reasons: buildReasons(direction, emaFast, emaSlow, momentum, rsi, recentBody, recentRange),
  };
}

export function renderMarketScanResult(result: MarketScanResult): string {
  if (!result.ok) {
    return [
      'PAT Market Scan',
      'Live scan: not ready.',
      `Provider: ${result.provider}`,
      `Reason: ${result.reason}`,
      'Next action: add a verified live market-data API key.',
      'Execution: disabled. No trade was placed.',
    ].join('\n');
  }

  const { candidate } = result;
  const entryTime = new Date(result.generatedAt.getTime() + 60_000);
  const martingaleOne = new Date(entryTime.getTime() + 2 * 60_000);
  const martingaleTwo = new Date(entryTime.getTime() + 4 * 60_000);
  const martingaleThree = new Date(entryTime.getTime() + 6 * 60_000);

  return [
    'PathFinder AI Trader',
    'TRADE CANDIDATE - MANUAL REVIEW ONLY',
    '',
    `${formatPair(candidate.pair)} (Live FX)`,
    `Expiry: ${candidate.expiryMinutes} minutes`,
    `Entry Window: ${formatTime(entryTime)}`,
    `Direction: ${candidate.direction}`,
    `Signal Strength: ${candidate.signalStrength}%`,
    `Latest Candle: ${candidate.latestCandleTime.toISOString()}`,
    '',
    'Reasons:',
    ...candidate.reasons.map((reason) => `- ${reason}`),
    '',
    'Recovery Levels:',
    `Level 1 -> ${formatTime(martingaleOne)} (tracking only)`,
    `Level 2 -> ${formatTime(martingaleTwo)} (tracking only)`,
    `Level 3 -> ${formatTime(martingaleThree)} (tracking only)`,
    '',
    'Execution: disabled. This is not financial advice.',
  ].join('\n');
}

function exponentialMovingAverage(values: number[], period: number): number {
  const multiplier = 2 / (period + 1);
  const seed = values.slice(0, period).reduce((total, value) => total + value, 0) / period;

  return values
    .slice(period)
    .reduce((ema, value) => value * multiplier + ema * (1 - multiplier), seed);
}

function relativeStrengthIndex(values: number[], period: number): number {
  const changes = values.slice(1).map((value, index) => value - values[index]);
  const recent = changes.slice(-period);
  const gains =
    recent.filter((change) => change > 0).reduce((total, value) => total + value, 0) / period;
  const losses =
    Math.abs(recent.filter((change) => change < 0).reduce((total, value) => total + value, 0)) /
    period;

  if (losses === 0) {
    return 100;
  }

  const relativeStrength = gains / losses;
  return 100 - 100 / (1 + relativeStrength);
}

function averageRange(candles: MarketCandle[]): number {
  return (
    candles.map((candle) => candle.high - candle.low).reduce((total, value) => total + value, 0) /
    candles.length
  );
}

function scoreDirection(input: {
  trend: number;
  momentum: number;
  trendThreshold: number;
  momentumThreshold: number;
  rsi: number;
  candleBodyRatio: number;
}): number {
  let score = 50;

  if (input.trend > input.trendThreshold) {
    score += 18;
  }

  if (input.momentum > input.momentumThreshold) {
    score += 12;
  }

  if (input.rsi >= 52 && input.rsi <= 72) {
    score += 12;
  }

  if (input.candleBodyRatio >= 0.35) {
    score += 8;
  }

  return Math.min(95, Math.max(0, Math.round(score)));
}

function buildReasons(
  direction: CandidateDirection,
  emaFast: number,
  emaSlow: number,
  momentum: number,
  rsi: number,
  recentBody: number,
  recentRange: number,
): string[] {
  if (direction === 'WAIT') {
    return ['No clean setup passed the minimum PAT threshold.'];
  }

  return [
    `EMA trend favors ${direction}.`,
    `Latest candle momentum is ${momentum >= 0 ? 'positive' : 'negative'}.`,
    `RSI is ${Math.round(rsi)}, inside scanner review range.`,
    `Latest body/range quality is ${recentRange === 0 ? 0 : Math.round((recentBody / recentRange) * 100)}%.`,
    `Fast EMA ${emaFast.toFixed(5)} vs slow EMA ${emaSlow.toFixed(5)}.`,
  ];
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Africa/Lagos',
  }).format(date);
}
