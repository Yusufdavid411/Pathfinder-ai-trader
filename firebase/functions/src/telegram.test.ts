import assert from 'node:assert/strict';
import test from 'node:test';

import { extractIncomingTelegramInteraction } from './telegram.js';

test('candidate callback keeps its original data for secure decision processing', () => {
  const callbackData = 'PAT_SIGNAL:ignored:26d5039e-90e7-4d2f-8ca1-3f40d1812083';
  const interaction = extractIncomingTelegramInteraction({
    callback_query: {
      id: 'callback-1',
      data: callbackData,
      message: { chat: { id: 42 } },
    },
  });

  assert.deepEqual(interaction, {
    chatId: 42,
    text: '/candidate_decision',
    callbackQueryId: 'callback-1',
    callbackData,
  });
});

test('unknown callback data is ignored', () => {
  const interaction = extractIncomingTelegramInteraction({
    callback_query: {
      id: 'callback-1',
      data: 'UNTRUSTED_ACTION',
      message: { chat: { id: 42 } },
    },
  });

  assert.equal(interaction, null);
});
