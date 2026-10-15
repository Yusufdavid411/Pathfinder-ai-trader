import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildTelegramReply,
  callbackDataToCommand,
  commandMenuText,
  parseAllowedChatIds,
  respondToTelegramMessage,
} from './patCommands.js';

test('status command keeps execution disabled in cloud webhook mode', () => {
  const response = respondToTelegramMessage({ chatId: 42, text: '/status' }, new Set([42]));

  assert.match(response, /cloud webhook mode/);
  assert.match(response, /IQ Option execution: disabled by compliance gate/);
});

test('help command lists PAT commands', () => {
  const response = commandMenuText();

  assert.match(response, /\/scan - Scan for candidate trade setups/);
  assert.match(response, /\/watchlist - Show the current watchlist/);
  assert.match(response, /\/market_status - Show market-reader status/);
  assert.match(response, /\/signals - Show signal engine status/);
});

test('scan command refuses to fabricate signals without market data', () => {
  const response = respondToTelegramMessage({ chatId: 42, text: '/scan' }, new Set([42]));

  assert.match(response, /Scanner button: connected/);
  assert.match(response, /Live market data: not connected yet/);
  assert.match(response, /PAT will not fabricate BUY\/SELL signals/);
});

test('start reply includes inline scanner buttons', () => {
  const response = buildTelegramReply({ chatId: 42, text: '/start' }, new Set([42]));

  assert.ok(response.replyMarkup);
  assert.equal(response.replyMarkup.inline_keyboard[0][0].text, 'Scan Trades');
  assert.equal(response.replyMarkup.inline_keyboard[0][0].callback_data, 'PAT_SCAN');
});

test('callback data maps to PAT commands', () => {
  assert.equal(callbackDataToCommand('PAT_SCAN'), '/scan');
  assert.equal(callbackDataToCommand('PAT_STATUS'), '/status');
  assert.equal(callbackDataToCommand('UNKNOWN'), null);
});

test('private bot rejects unknown chat IDs', () => {
  const response = respondToTelegramMessage({ chatId: 7, text: '/start' }, new Set([42]));

  assert.equal(response, 'Access denied. This PAT bot is private.');
});

test('allowed chat ID parser ignores invalid values', () => {
  const allowedChatIds = parseAllowedChatIds('42, nope, 99');

  assert.equal(allowedChatIds.has(42), true);
  assert.equal(allowedChatIds.has(99), true);
  assert.equal(allowedChatIds.size, 2);
});

test('public access marker allows any chat ID', () => {
  const allowedChatIds = parseAllowedChatIds('*');

  assert.equal(allowedChatIds.size, 0);
});
