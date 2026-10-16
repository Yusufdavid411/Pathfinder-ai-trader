import assert from 'node:assert/strict';
import test from 'node:test';

import { InMemoryTradingControlRepository, renderTradingControlState } from './tradingControl.js';

test('trading controls default to disarmed Demo with a one-dollar stake', async () => {
  const repository = new InMemoryTradingControlRepository();
  const state = await repository.getState(42, new Date('2026-10-16T09:00:00Z'));

  assert.equal(state.mode, 'DEMO');
  assert.equal(state.stake, 1);
  assert.equal(state.armed, false);
  assert.equal(state.realExecutionUnlocked, false);
});

test('changing mode or stake disarms execution and Real cannot be armed', async () => {
  const repository = new InMemoryTradingControlRepository();
  const now = new Date('2026-10-16T09:00:00Z');

  assert.equal((await repository.arm(42, now)).outcome, 'armed');
  const changedStake = await repository.setStake(42, 5, now);
  assert.equal(changedStake.outcome, 'updated');
  assert.equal(changedStake.state.armed, false);

  const real = await repository.setMode(42, 'REAL', now);
  assert.equal(real.armed, false);
  assert.equal((await repository.arm(42, now)).outcome, 'real_locked');
});

test('emergency stop requires an explicit reset and re-arm', async () => {
  const repository = new InMemoryTradingControlRepository();
  const now = new Date('2026-10-16T09:00:00Z');

  await repository.arm(42, now);
  const stopped = await repository.emergencyStop(42, now);
  assert.equal(stopped.armed, false);
  assert.equal(stopped.emergencyStop, true);
  assert.equal((await repository.arm(42, now)).outcome, 'emergency_stopped');

  const resumed = await repository.resumeDemo(42, now);
  assert.equal(resumed.emergencyStop, false);
  assert.equal(resumed.armed, false);
});

test('stake validation rejects values outside the configured demo cap', async () => {
  const repository = new InMemoryTradingControlRepository();

  assert.equal((await repository.setStake(42, 0)).outcome, 'invalid_stake');
  assert.equal((await repository.setStake(42, 11)).outcome, 'invalid_stake');
  assert.equal((await repository.setStake(42, 2.5)).outcome, 'updated');
});

test('rendered state is explicit about the locked Real target', async () => {
  const repository = new InMemoryTradingControlRepository();
  const state = await repository.setMode(42, 'REAL');
  const message = renderTradingControlState(state);

  assert.match(message, /Account target: REAL/);
  assert.match(message, /LOCKED/);
});
