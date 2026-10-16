import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canonicalExecutionRequest,
  isVerifiedPracticeCompletion,
  renderQueueExecutionResult,
  signExecutionRequest,
  verifyExecutionRequestSignature,
  type ExecutionRequest,
} from './executionRequests.js';

const unsignedRequest: Omit<ExecutionRequest, 'signature'> = {
  id: 'candidate-123',
  candidateId: 'candidate-123',
  telegramChatId: 42,
  mode: 'DEMO',
  stake: 1,
  asset: 'EUR/USD',
  direction: 'BUY',
  expiryMinutes: 2,
  referencePrice: 1.10234,
  executeNotBefore: new Date('2026-10-16T09:01:00Z'),
  expiresAt: new Date('2026-10-16T09:03:00Z'),
  requestedAt: new Date('2026-10-16T09:00:30Z'),
  status: 'queued',
};

test('execution request signature covers every execution-critical field', () => {
  const signature = signExecutionRequest(unsignedRequest, 'test-secret');
  const request = { ...unsignedRequest, signature };

  assert.equal(verifyExecutionRequestSignature(request, 'test-secret'), true);
  assert.equal(verifyExecutionRequestSignature({ ...request, stake: 10 }, 'test-secret'), false);
  assert.match(canonicalExecutionRequest(unsignedRequest), /EUR\/USD\|BUY\|2/);
});

test('queued execution message requires the IQ Option Practice connector', () => {
  const message = renderQueueExecutionResult({
    outcome: 'queued',
    request: {
      ...unsignedRequest,
      signature: signExecutionRequest(unsignedRequest, 'test-secret'),
    },
  });

  assert.match(message, /queued for the local IQ Option Practice connector/);
  assert.match(message, /success receipt requires proof/);
  assert.match(message, /Real-account trading: locked/);
});

test('locked and disarmed gate messages tell the user what to do', () => {
  assert.match(renderQueueExecutionResult({ outcome: 'not_armed' }), /Send \/arm/);
  assert.match(renderQueueExecutionResult({ outcome: 'real_locked' }), /no authorized IQ Option/);
});

test('completion proof rejects the old simulator and every Real-account result', () => {
  assert.equal(
    isVerifiedPracticeCompletion({
      accountMode: 'PRACTICE',
      executor: 'IQ_OPTION_PRACTICE_EXTENSION',
    }),
    true,
  );
  assert.equal(
    isVerifiedPracticeCompletion({ accountMode: 'PRACTICE', executor: 'PATHFINDER_DEMO_BRIDGE' }),
    false,
  );
  assert.equal(
    isVerifiedPracticeCompletion({
      accountMode: 'REAL',
      executor: 'IQ_OPTION_PRACTICE_EXTENSION',
    }),
    false,
  );
});
