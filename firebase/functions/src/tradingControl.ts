import type { Firestore } from 'firebase-admin/firestore';

export type TradingAccountMode = 'DEMO' | 'REAL';

export type TradingControlState = {
  telegramChatId: number;
  mode: TradingAccountMode;
  stake: number;
  armed: boolean;
  emergencyStop: boolean;
  realExecutionUnlocked: boolean;
  maxStake: number;
  maxTradesPerDay: number;
  tradesToday: number;
  tradeDate: string;
  activeExecutionRequestId: string | null;
  updatedAt: Date;
};

export type ArmResult =
  | { outcome: 'armed'; state: TradingControlState }
  | { outcome: 'real_locked'; state: TradingControlState }
  | { outcome: 'emergency_stopped'; state: TradingControlState };

export type StakeResult =
  | { outcome: 'updated'; state: TradingControlState }
  | { outcome: 'invalid_stake'; state: TradingControlState };

export interface TradingControlRepository {
  getState(telegramChatId: number, now?: Date): Promise<TradingControlState>;
  setMode(
    telegramChatId: number,
    mode: TradingAccountMode,
    now?: Date,
  ): Promise<TradingControlState>;
  setStake(telegramChatId: number, stake: number, now?: Date): Promise<StakeResult>;
  arm(telegramChatId: number, now?: Date): Promise<ArmResult>;
  disarm(telegramChatId: number, now?: Date): Promise<TradingControlState>;
  emergencyStop(telegramChatId: number, now?: Date): Promise<TradingControlState>;
  resumeDemo(telegramChatId: number, now?: Date): Promise<TradingControlState>;
}

export function createDefaultTradingControlState(
  telegramChatId: number,
  now: Date = new Date(),
): TradingControlState {
  return {
    telegramChatId,
    mode: 'DEMO',
    stake: 1,
    armed: false,
    emergencyStop: false,
    realExecutionUnlocked: false,
    maxStake: 10,
    maxTradesPerDay: 10,
    tradesToday: 0,
    tradeDate: formatTradeDate(now),
    activeExecutionRequestId: null,
    updatedAt: now,
  };
}

export function renderTradingControlState(state: TradingControlState): string {
  const executionLabel =
    state.mode === 'REAL'
      ? 'LOCKED - an authorized IQ Option execution method is not configured.'
      : state.emergencyStop
        ? 'STOPPED by emergency control.'
        : state.armed
          ? 'ARMED for verified IQ Option Practice orders.'
          : 'DISARMED.';

  return [
    'PAT Trading Controls',
    `Account target: ${state.mode}`,
    `Stake: $${state.stake.toFixed(2)}`,
    `Execution: ${executionLabel}`,
    `Trades today: ${state.tradesToday}/${state.maxTradesPerDay}`,
    `Maximum demo stake: $${state.maxStake.toFixed(2)}`,
    `Active request: ${state.activeExecutionRequestId ?? 'none'}`,
    'A scan never places a trade. An armed Demo account still requires Accept.',
  ].join('\n');
}

export class InMemoryTradingControlRepository implements TradingControlRepository {
  private readonly states = new Map<number, TradingControlState>();

  async getState(telegramChatId: number, now: Date = new Date()): Promise<TradingControlState> {
    const existing = this.states.get(telegramChatId);
    const state = normalizeTradingDay(
      existing ?? createDefaultTradingControlState(telegramChatId, now),
      now,
    );
    this.states.set(telegramChatId, state);
    return cloneState(state);
  }

  async setMode(
    telegramChatId: number,
    mode: TradingAccountMode,
    now: Date = new Date(),
  ): Promise<TradingControlState> {
    const state = await this.getState(telegramChatId, now);
    const next = { ...state, mode, armed: false, updatedAt: now };
    this.states.set(telegramChatId, next);
    return cloneState(next);
  }

  async setStake(
    telegramChatId: number,
    stake: number,
    now: Date = new Date(),
  ): Promise<StakeResult> {
    const state = await this.getState(telegramChatId, now);
    if (!isValidStake(stake, state.maxStake)) {
      return { outcome: 'invalid_stake', state };
    }

    const next = { ...state, stake: roundCurrency(stake), armed: false, updatedAt: now };
    this.states.set(telegramChatId, next);
    return { outcome: 'updated', state: cloneState(next) };
  }

  async arm(telegramChatId: number, now: Date = new Date()): Promise<ArmResult> {
    const state = await this.getState(telegramChatId, now);
    if (state.mode === 'REAL' && !state.realExecutionUnlocked) {
      return { outcome: 'real_locked', state };
    }

    if (state.emergencyStop) {
      return { outcome: 'emergency_stopped', state };
    }

    const next = { ...state, armed: true, updatedAt: now };
    this.states.set(telegramChatId, next);
    return { outcome: 'armed', state: cloneState(next) };
  }

  async disarm(telegramChatId: number, now: Date = new Date()): Promise<TradingControlState> {
    return this.update(telegramChatId, now, { armed: false });
  }

  async emergencyStop(
    telegramChatId: number,
    now: Date = new Date(),
  ): Promise<TradingControlState> {
    return this.update(telegramChatId, now, { armed: false, emergencyStop: true });
  }

  async resumeDemo(telegramChatId: number, now: Date = new Date()): Promise<TradingControlState> {
    return this.update(telegramChatId, now, { armed: false, emergencyStop: false });
  }

  private async update(
    telegramChatId: number,
    now: Date,
    changes: Partial<TradingControlState>,
  ): Promise<TradingControlState> {
    const state = await this.getState(telegramChatId, now);
    const next = { ...state, ...changes, updatedAt: now };
    this.states.set(telegramChatId, next);
    return cloneState(next);
  }
}

export class FirestoreTradingControlRepository implements TradingControlRepository {
  constructor(private readonly firestore: Firestore) {}

  async getState(telegramChatId: number, now: Date = new Date()): Promise<TradingControlState> {
    const reference = this.reference(telegramChatId);
    const snapshot = await reference.get();
    const state = snapshot.exists
      ? stateFromData(telegramChatId, snapshot.data(), now)
      : createDefaultTradingControlState(telegramChatId, now);
    const normalized = normalizeTradingDay(state, now);

    if (!snapshot.exists || normalized.tradeDate !== state.tradeDate) {
      await reference.set(stateToData(normalized), { merge: true });
    }

    return normalized;
  }

  async setMode(
    telegramChatId: number,
    mode: TradingAccountMode,
    now: Date = new Date(),
  ): Promise<TradingControlState> {
    return this.update(telegramChatId, now, (state) => ({
      ...state,
      mode,
      armed: false,
      updatedAt: now,
    }));
  }

  async setStake(
    telegramChatId: number,
    stake: number,
    now: Date = new Date(),
  ): Promise<StakeResult> {
    const reference = this.reference(telegramChatId);
    return this.firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reference);
      const state = normalizeTradingDay(
        snapshot.exists
          ? stateFromData(telegramChatId, snapshot.data(), now)
          : createDefaultTradingControlState(telegramChatId, now),
        now,
      );

      if (!isValidStake(stake, state.maxStake)) {
        return { outcome: 'invalid_stake', state };
      }

      const next = {
        ...state,
        stake: roundCurrency(stake),
        armed: false,
        updatedAt: now,
      };
      transaction.set(reference, stateToData(next), { merge: true });
      return { outcome: 'updated', state: next };
    });
  }

  async arm(telegramChatId: number, now: Date = new Date()): Promise<ArmResult> {
    const reference = this.reference(telegramChatId);
    return this.firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reference);
      const state = normalizeTradingDay(
        snapshot.exists
          ? stateFromData(telegramChatId, snapshot.data(), now)
          : createDefaultTradingControlState(telegramChatId, now),
        now,
      );

      if (state.mode === 'REAL' && !state.realExecutionUnlocked) {
        transaction.set(reference, stateToData({ ...state, armed: false }), { merge: true });
        return { outcome: 'real_locked', state: { ...state, armed: false } };
      }

      if (state.emergencyStop) {
        return { outcome: 'emergency_stopped', state };
      }

      const next = { ...state, armed: true, updatedAt: now };
      transaction.set(reference, stateToData(next), { merge: true });
      return { outcome: 'armed', state: next };
    });
  }

  async disarm(telegramChatId: number, now: Date = new Date()): Promise<TradingControlState> {
    return this.update(telegramChatId, now, (state) => ({
      ...state,
      armed: false,
      updatedAt: now,
    }));
  }

  async emergencyStop(
    telegramChatId: number,
    now: Date = new Date(),
  ): Promise<TradingControlState> {
    return this.update(telegramChatId, now, (state) => ({
      ...state,
      armed: false,
      emergencyStop: true,
      updatedAt: now,
    }));
  }

  async resumeDemo(telegramChatId: number, now: Date = new Date()): Promise<TradingControlState> {
    return this.update(telegramChatId, now, (state) => ({
      ...state,
      armed: false,
      emergencyStop: false,
      updatedAt: now,
    }));
  }

  private reference(telegramChatId: number) {
    return this.firestore.collection('telegram_trading_controls').doc(String(telegramChatId));
  }

  private async update(
    telegramChatId: number,
    now: Date,
    updater: (state: TradingControlState) => TradingControlState,
  ): Promise<TradingControlState> {
    const reference = this.reference(telegramChatId);
    return this.firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reference);
      const state = normalizeTradingDay(
        snapshot.exists
          ? stateFromData(telegramChatId, snapshot.data(), now)
          : createDefaultTradingControlState(telegramChatId, now),
        now,
      );
      const next = updater(state);
      transaction.set(reference, stateToData(next), { merge: true });
      return next;
    });
  }
}

export function stateFromData(
  telegramChatId: number,
  data: FirebaseFirestore.DocumentData | undefined,
  now: Date = new Date(),
): TradingControlState {
  const defaults = createDefaultTradingControlState(telegramChatId, now);
  const mode = data?.mode === 'REAL' ? 'REAL' : 'DEMO';

  return {
    telegramChatId,
    mode,
    stake: finiteNumber(data?.stake, defaults.stake),
    armed: data?.armed === true,
    emergencyStop: data?.emergency_stop === true,
    realExecutionUnlocked: data?.real_execution_unlocked === true,
    maxStake: finiteNumber(data?.max_stake, defaults.maxStake),
    maxTradesPerDay: integerNumber(data?.max_trades_per_day, defaults.maxTradesPerDay),
    tradesToday: integerNumber(data?.trades_today, defaults.tradesToday),
    tradeDate: typeof data?.trade_date === 'string' ? data.trade_date : defaults.tradeDate,
    activeExecutionRequestId:
      typeof data?.active_execution_request_id === 'string'
        ? data.active_execution_request_id
        : null,
    updatedAt: dateFromValue(data?.updated_at) ?? now,
  };
}

export function stateToData(state: TradingControlState): FirebaseFirestore.DocumentData {
  return {
    telegram_chat_id: state.telegramChatId,
    mode: state.mode,
    stake: state.stake,
    armed: state.armed,
    emergency_stop: state.emergencyStop,
    real_execution_unlocked: state.realExecutionUnlocked,
    max_stake: state.maxStake,
    max_trades_per_day: state.maxTradesPerDay,
    trades_today: state.tradesToday,
    trade_date: state.tradeDate,
    active_execution_request_id: state.activeExecutionRequestId,
    updated_at: state.updatedAt,
  };
}

export function formatTradeDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function normalizeTradingDay(state: TradingControlState, now: Date): TradingControlState {
  const tradeDate = formatTradeDate(now);
  if (state.tradeDate === tradeDate) {
    return state;
  }

  return { ...state, tradeDate, tradesToday: 0, updatedAt: now };
}

function isValidStake(stake: number, maxStake: number): boolean {
  return Number.isFinite(stake) && stake >= 1 && stake <= maxStake;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function integerNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isInteger(value) ? value : fallback;
}

function dateFromValue(value: unknown): Date | null {
  if (value instanceof Date) {
    return value;
  }

  if (value && typeof value === 'object' && 'toDate' in value) {
    const toDate = (value as { toDate?: unknown }).toDate;
    if (typeof toDate === 'function') {
      return toDate.call(value) as Date;
    }
  }

  return null;
}

function cloneState(state: TradingControlState): TradingControlState {
  return { ...state, updatedAt: new Date(state.updatedAt) };
}
