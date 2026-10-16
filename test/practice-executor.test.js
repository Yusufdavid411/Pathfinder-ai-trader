import test from "node:test";
import assert from "node:assert/strict";

import {
  executePracticeOrder,
  inspectPracticeTraderoom,
} from "../browser/iq-option-reader/practice-executor.js";

const element = (text, attributes = {}) => ({
  textContent: text,
  disabled: false,
  getAttribute(name) {
    return attributes[name] ?? null;
  },
});

const rootWith = ({ account = "Practice Account $10,000", asset = "EUR/USD" } = {}) => {
  const values = new Map([
    ['[data-test*="balance"]', [element(account)]],
    ['[data-test="instrument-name"]', [element(asset)]],
    ['input[data-test*="amount"]', [element("", { value: "1.00" })]],
    ['[data-test*="higher"]', [element("Higher")]],
    ['[data-test*="lower"]', [element("Lower")]],
    ['[data-test*="expir"]', [element("2 min")]],
  ]);
  return {
    querySelectorAll(selector) {
      return values.get(selector) ?? [];
    },
  };
};

const command = (changes = {}) => ({
  id: "candidate-123",
  mode: "DEMO",
  stake: 1,
  asset: "EUR/USD",
  direction: "BUY",
  expiry_minutes: 2,
  execute_not_before: new Date(Date.now() - 1_000).toISOString(),
  expires_at: new Date(Date.now() + 60_000).toISOString(),
  ...changes,
});

test("connector becomes ready only with visible Practice controls", () => {
  const state = inspectPracticeTraderoom(rootWith());

  assert.equal(state.account_mode, "PRACTICE");
  assert.equal(state.asset, "EUR/USD");
  assert.equal(state.ready, true);
  assert.equal(state.real_execution_enabled, false);
});

test("visible Real account is detected and never ready", () => {
  const state = inspectPracticeTraderoom(rootWith({ account: "Real Account $250" }));

  assert.equal(state.account_mode, "REAL");
  assert.equal(state.ready, false);
});

test("execution fails closed before clicking when Real is visible", async () => {
  const receipt = await executePracticeOrder(command(), rootWith({ account: "Real Account $250" }));

  assert.equal(receipt.success, false);
  assert.equal(receipt.account_mode, "REAL");
  assert.match(receipt.message, /blocked/);
});

test("expired Telegram commands fail before any platform action", async () => {
  const receipt = await executePracticeOrder(
    command({ expires_at: new Date(Date.now() - 1_000).toISOString() }),
    rootWith(),
  );

  assert.equal(receipt.success, false);
  assert.match(receipt.message, /expired/);
});
