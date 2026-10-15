import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createPresentedCandidate,
  InMemoryCandidateRepository,
  renderCandidateDecisionResult,
} from './candidateTracking.js';
import type { MarketScanResult } from './marketScanner.js';

const scanResult: MarketScanResult = {
  ok: true,
  provider: 'twelve_data',
  generatedAt: new Date('2026-10-15T12:00:00Z'),
  candidate: {
    pair: { base: 'EUR', quote: 'USD' },
    direction: 'BUY',
    signalStrength: 82,
    expiryMinutes: 2,
    latestCandleTime: new Date('2026-10-15T11:59:00Z'),
    reasons: ['EMA trend favors BUY.'],
  },
};

test('presented candidate stores entry and expiry timing without enabling execution', () => {
  const candidate = createPresentedCandidate(42, scanResult, 'candidate-123');

  assert.equal(candidate.asset, 'EUR/USD');
  assert.equal(candidate.provider, 'twelve_data');
  assert.equal(candidate.status, 'presented');
  assert.equal(candidate.entryWindowAt.toISOString(), '2026-10-15T12:01:00.000Z');
  assert.equal(candidate.expiresAt.toISOString(), '2026-10-15T12:03:00.000Z');
});

test('candidate decision is chat-bound and cannot be overwritten', async () => {
  const repository = new InMemoryCandidateRepository();
  const candidate = createPresentedCandidate(42, scanResult, 'candidate-123');
  await repository.savePresented(candidate);

  const forbidden = await repository.recordDecision({
    candidateId: candidate.id,
    telegramChatId: 7,
    decision: 'rejected',
    decidedAt: new Date('2026-10-15T12:01:30Z'),
  });
  assert.equal(forbidden.outcome, 'forbidden');

  const recorded = await repository.recordDecision({
    candidateId: candidate.id,
    telegramChatId: 42,
    decision: 'accepted',
    decidedAt: new Date('2026-10-15T12:01:30Z'),
  });
  assert.deepEqual(recorded, { outcome: 'recorded', decision: 'accepted' });

  const repeated = await repository.recordDecision({
    candidateId: candidate.id,
    telegramChatId: 42,
    decision: 'ignored',
    decidedAt: new Date('2026-10-15T12:02:00Z'),
  });
  assert.deepEqual(repeated, { outcome: 'already_decided', decision: 'accepted' });
  assert.equal(repository.get(candidate.id)?.status, 'accepted');
});

test('decision response states that PAT did not execute or verify a trade', () => {
  const message = renderCandidateDecisionResult(
    { outcome: 'recorded', decision: 'accepted' },
    'accepted',
  );

  assert.match(message, /Candidate decision recorded: Taken/);
  assert.match(message, /did not place or verify a trade/);
});
