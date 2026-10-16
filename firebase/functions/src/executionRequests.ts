import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

import type { Firestore } from 'firebase-admin/firestore';

import {
  createDefaultTradingControlState,
  formatTradeDate,
  stateFromData,
  stateToData,
  type TradingAccountMode,
} from './tradingControl.js';

export type ExecutionRequestStatus =
  'queued' | 'claimed' | 'filled' | 'failed' | 'expired' | 'cancelled';

export type ExecutionRequest = {
  id: string;
  candidateId: string;
  telegramChatId: number;
  mode: TradingAccountMode;
  stake: number;
  asset: string;
  direction: 'BUY' | 'SELL';
  expiryMinutes: number;
  referencePrice: number;
  executeNotBefore: Date;
  expiresAt: Date;
  requestedAt: Date;
  status: ExecutionRequestStatus;
  signature: string;
};

export type QueueExecutionResult =
  | { outcome: 'queued'; request: ExecutionRequest }
  | { outcome: 'already_exists'; status: ExecutionRequestStatus }
  | { outcome: 'candidate_not_found' }
  | { outcome: 'candidate_not_accepted' }
  | { outcome: 'forbidden' }
  | { outcome: 'not_armed' }
  | { outcome: 'emergency_stopped' }
  | { outcome: 'real_locked' }
  | { outcome: 'expired' }
  | { outcome: 'busy' }
  | { outcome: 'daily_limit_reached' }
  | { outcome: 'invalid_candidate' };

export type ClaimedExecution = ExecutionRequest & {
  claimToken: string;
};

export type CompletionInput = {
  requestId: string;
  claimToken: string;
  success: boolean;
  brokerOrderId?: string;
  message: string;
  accountMode: string;
  platformAsset?: string;
  evidence?: string;
  executor: string;
  completedAt: Date;
};

export type CompletionResult =
  | {
      outcome: 'completed';
      telegramChatId: number;
      text: string;
    }
  | { outcome: 'not_found' | 'invalid_claim' | 'invalid_state' };

export class FirestoreExecutionRequestRepository {
  constructor(
    private readonly firestore: Firestore,
    private readonly signingSecret: string,
  ) {
    if (!signingSecret.trim()) {
      throw new Error('Execution signing secret is required.');
    }
  }

  async queueAcceptedCandidate(
    candidateId: string,
    telegramChatId: number,
    requestedAt: Date = new Date(),
  ): Promise<QueueExecutionResult> {
    const signalReference = this.firestore.collection('signals').doc(candidateId);
    const controlReference = this.firestore
      .collection('telegram_trading_controls')
      .doc(String(telegramChatId));
    const requestReference = this.firestore.collection('execution_requests').doc(candidateId);

    return this.firestore.runTransaction(async (transaction) => {
      const signalSnapshot = await transaction.get(signalReference);
      if (!signalSnapshot.exists) {
        return { outcome: 'candidate_not_found' };
      }

      const signal = signalSnapshot.data();
      if (signal?.telegram_chat_id !== telegramChatId) {
        return { outcome: 'forbidden' };
      }

      if (signal.status !== 'accepted') {
        return { outcome: 'candidate_not_accepted' };
      }

      const existingRequest = await transaction.get(requestReference);
      if (existingRequest.exists) {
        return {
          outcome: 'already_exists',
          status: requestStatus(existingRequest.data()?.status),
        };
      }

      const controlSnapshot = await transaction.get(controlReference);
      const control = controlSnapshot.exists
        ? stateFromData(telegramChatId, controlSnapshot.data(), requestedAt)
        : createDefaultTradingControlState(telegramChatId, requestedAt);

      if (control.mode === 'REAL') {
        return { outcome: 'real_locked' };
      }

      if (control.emergencyStop) {
        return { outcome: 'emergency_stopped' };
      }

      if (!control.armed) {
        return { outcome: 'not_armed' };
      }

      if (control.activeExecutionRequestId) {
        return { outcome: 'busy' };
      }

      const currentTradeDate = formatTradeDate(requestedAt);
      const tradesToday = control.tradeDate === currentTradeDate ? control.tradesToday : 0;
      if (tradesToday >= control.maxTradesPerDay) {
        return { outcome: 'daily_limit_reached' };
      }

      const executeNotBefore = dateFromValue(signal.entry_window_at);
      const expiresAt = dateFromValue(signal.expires_at);
      const asset = typeof signal.asset === 'string' ? signal.asset : null;
      const direction =
        signal.direction === 'BUY' || signal.direction === 'SELL' ? signal.direction : null;
      const expiryMinutes = integerNumber(signal.expiry_minutes);
      const referencePrice = finiteNumber(signal.reference_price);

      if (
        !executeNotBefore ||
        !expiresAt ||
        !asset ||
        !direction ||
        !expiryMinutes ||
        referencePrice === null
      ) {
        return { outcome: 'invalid_candidate' };
      }

      if (requestedAt.getTime() > expiresAt.getTime()) {
        return { outcome: 'expired' };
      }

      const unsigned: Omit<ExecutionRequest, 'signature'> = {
        id: candidateId,
        candidateId,
        telegramChatId,
        mode: control.mode,
        stake: control.stake,
        asset,
        direction,
        expiryMinutes,
        referencePrice,
        executeNotBefore,
        expiresAt,
        requestedAt,
        status: 'queued',
      };
      const request: ExecutionRequest = {
        ...unsigned,
        signature: signExecutionRequest(unsigned, this.signingSecret),
      };

      transaction.create(requestReference, executionRequestToData(request));
      transaction.update(signalReference, {
        execution_status: 'queued',
        execution_request_id: request.id,
        execution_mode: request.mode,
        execution_stake: request.stake,
      });
      transaction.set(
        controlReference,
        stateToData({
          ...control,
          tradeDate: currentTradeDate,
          tradesToday: tradesToday + 1,
          activeExecutionRequestId: request.id,
          updatedAt: requestedAt,
        }),
        { merge: true },
      );

      return { outcome: 'queued', request };
    });
  }

  async claimNext(bridgeId: string, now: Date = new Date()): Promise<ClaimedExecution | null> {
    await this.recoverStaleClaims(now);
    const queued = await this.firestore
      .collection('execution_requests')
      .where('status', '==', 'queued')
      .limit(20)
      .get();

    for (const document of queued.docs) {
      const claimed = await this.claimDocument(document.id, bridgeId, now);
      if (claimed) {
        await this.recordBridgeHeartbeat(bridgeId, now, claimed.id);
        return claimed;
      }
    }

    await this.recordBridgeHeartbeat(bridgeId, now, null);
    return null;
  }

  async complete(input: CompletionInput): Promise<CompletionResult> {
    const requestReference = this.firestore.collection('execution_requests').doc(input.requestId);

    return this.firestore.runTransaction(async (transaction) => {
      const requestSnapshot = await transaction.get(requestReference);
      if (!requestSnapshot.exists) {
        return { outcome: 'not_found' };
      }

      const data = requestSnapshot.data();
      if (data?.status !== 'claimed') {
        return { outcome: 'invalid_state' };
      }

      const expectedHash = typeof data.claim_token_hash === 'string' ? data.claim_token_hash : '';
      if (!safeSecretEqual(hashClaimToken(input.claimToken), expectedHash)) {
        return { outcome: 'invalid_claim' };
      }

      const telegramChatId = integerNumber(data.telegram_chat_id);
      const candidateId = typeof data.candidate_id === 'string' ? data.candidate_id : null;
      if (telegramChatId === null || !candidateId) {
        return { outcome: 'invalid_state' };
      }

      const practiceVerified = isVerifiedPracticeCompletion(input);
      const success = input.success && practiceVerified;
      const status: ExecutionRequestStatus = success ? 'filled' : 'failed';
      const safeMessage = (
        input.success && !practiceVerified
          ? 'Success rejected: IQ Option Practice mode was not verified.'
          : input.message
      ).slice(0, 500);
      transaction.update(requestReference, {
        status,
        broker: 'IQ_OPTION_PRACTICE_EXTENSION',
        broker_order_id: success ? (input.brokerOrderId?.slice(0, 100) ?? null) : null,
        execution_message: safeMessage,
        execution_evidence: input.evidence?.slice(0, 500) ?? null,
        platform_asset: input.platformAsset?.slice(0, 100) ?? null,
        account_mode_verified: practiceVerified ? 'PRACTICE' : 'UNVERIFIED',
        completed_at: input.completedAt,
        claim_token_hash: null,
        simulated: false,
        practice_order_placed: success,
        real_order_placed: false,
      });
      transaction.update(this.firestore.collection('signals').doc(candidateId), {
        execution_status: status,
        execution_completed_at: input.completedAt,
        broker_order_id: success ? (input.brokerOrderId?.slice(0, 100) ?? null) : null,
        practice_order_placed: success,
        real_order_placed: false,
      });
      transaction.set(
        this.firestore.collection('telegram_trading_controls').doc(String(telegramChatId)),
        {
          active_execution_request_id: null,
          updated_at: input.completedAt,
        },
        { merge: true },
      );

      return {
        outcome: 'completed',
        telegramChatId,
        text: renderCompletionMessage(
          data,
          success,
          success ? input.brokerOrderId : undefined,
          safeMessage,
          input.evidence,
        ),
      };
    });
  }

  async getBridgeStatus(): Promise<{
    online: boolean;
    lastSeenAt: Date | null;
    bridgeId: string | null;
  }> {
    const snapshot = await this.firestore.collection('system_runtime').doc('broker_bridge').get();
    const lastSeenAt = dateFromValue(snapshot.data()?.last_seen_at);
    return {
      online: lastSeenAt !== null && Date.now() - lastSeenAt.getTime() <= 30_000,
      lastSeenAt,
      bridgeId: typeof snapshot.data()?.bridge_id === 'string' ? snapshot.data()?.bridge_id : null,
    };
  }

  private async claimDocument(
    requestId: string,
    bridgeId: string,
    now: Date,
  ): Promise<ClaimedExecution | null> {
    const requestReference = this.firestore.collection('execution_requests').doc(requestId);

    return this.firestore.runTransaction(async (transaction) => {
      const requestSnapshot = await transaction.get(requestReference);
      if (!requestSnapshot.exists || requestSnapshot.data()?.status !== 'queued') {
        return null;
      }

      const request = executionRequestFromData(requestSnapshot.data());
      if (!request || request.mode !== 'DEMO') {
        return null;
      }

      const controlReference = this.firestore
        .collection('telegram_trading_controls')
        .doc(String(request.telegramChatId));
      const controlSnapshot = await transaction.get(controlReference);
      const control = controlSnapshot.exists
        ? stateFromData(request.telegramChatId, controlSnapshot.data(), now)
        : createDefaultTradingControlState(request.telegramChatId, now);

      if (!control.armed || control.emergencyStop || control.mode !== 'DEMO') {
        transaction.update(requestReference, {
          status: 'cancelled',
          completed_at: now,
          execution_message: 'Trading controls changed before bridge execution.',
          real_order_placed: false,
        });
        transaction.set(
          controlReference,
          { active_execution_request_id: null, updated_at: now },
          { merge: true },
        );
        return null;
      }

      if (now.getTime() < request.executeNotBefore.getTime()) {
        return null;
      }

      if (now.getTime() > request.expiresAt.getTime()) {
        transaction.update(requestReference, {
          status: 'expired',
          completed_at: now,
          execution_message: 'Candidate expired before bridge execution.',
          real_order_placed: false,
        });
        transaction.set(
          controlReference,
          { active_execution_request_id: null, updated_at: now },
          { merge: true },
        );
        return null;
      }

      const claimToken = randomUUID();
      transaction.update(requestReference, {
        status: 'claimed',
        claimed_at: now,
        claimed_by: bridgeId.slice(0, 100),
        claim_token_hash: hashClaimToken(claimToken),
      });

      return { ...request, status: 'claimed', claimToken };
    });
  }

  private async recoverStaleClaims(now: Date): Promise<void> {
    const claimed = await this.firestore
      .collection('execution_requests')
      .where('status', '==', 'claimed')
      .limit(20)
      .get();

    for (const document of claimed.docs) {
      const claimedAt = dateFromValue(document.data().claimed_at);
      if (claimedAt && now.getTime() - claimedAt.getTime() <= 60_000) {
        continue;
      }

      await document.ref.update({
        status: 'queued',
        claimed_at: null,
        claimed_by: null,
        claim_token_hash: null,
      });
    }
  }

  private async recordBridgeHeartbeat(
    bridgeId: string,
    now: Date,
    activeRequestId: string | null,
  ): Promise<void> {
    await this.firestore
      .collection('system_runtime')
      .doc('broker_bridge')
      .set(
        {
          bridge_id: bridgeId.slice(0, 100),
          mode: 'IQ_OPTION_PRACTICE_EXTENSION',
          last_seen_at: now,
          active_request_id: activeRequestId,
          real_execution_enabled: false,
        },
        { merge: true },
      );
  }
}

export function signExecutionRequest(
  request: Omit<ExecutionRequest, 'signature'>,
  secret: string,
): string {
  return createHmac('sha256', secret).update(canonicalExecutionRequest(request)).digest('hex');
}

export function verifyExecutionRequestSignature(
  request: ExecutionRequest,
  secret: string,
): boolean {
  const expected = signExecutionRequest(request, secret);
  return safeSecretEqual(expected, request.signature);
}

export function isVerifiedPracticeCompletion(
  input: Pick<CompletionInput, 'accountMode' | 'executor'>,
): boolean {
  return input.accountMode === 'PRACTICE' && input.executor === 'IQ_OPTION_PRACTICE_EXTENSION';
}

export function canonicalExecutionRequest(request: Omit<ExecutionRequest, 'signature'>): string {
  return [
    request.id,
    request.candidateId,
    String(request.telegramChatId),
    request.mode,
    request.stake.toFixed(2),
    request.asset,
    request.direction,
    String(request.expiryMinutes),
    request.referencePrice.toString(),
    request.executeNotBefore.toISOString(),
    request.expiresAt.toISOString(),
    request.requestedAt.toISOString(),
  ].join('|');
}

export function renderQueueExecutionResult(result: QueueExecutionResult): string {
  if (result.outcome === 'queued') {
    return [
      'Trade approval accepted.',
      `Mode: ${result.request.mode}`,
      `Stake: $${result.request.stake.toFixed(2)}`,
      `Asset: ${result.request.asset}`,
      `Direction: ${result.request.direction}`,
      `Expiry: ${result.request.expiryMinutes} minutes`,
      `Bridge window: ${result.request.executeNotBefore.toISOString()} to ${result.request.expiresAt.toISOString()}`,
      'Status: queued for the local IQ Option Practice connector.',
      'A success receipt requires proof of a new IQ Option Practice position.',
      'Real-account trading: locked.',
    ].join('\n');
  }

  const messages: Record<Exclude<QueueExecutionResult['outcome'], 'queued'>, string> = {
    already_exists: `This candidate already has an execution request (${result.outcome === 'already_exists' ? result.status : 'unknown'}).`,
    candidate_not_found: 'The candidate no longer exists.',
    candidate_not_accepted: 'The candidate is not approved for execution.',
    forbidden: 'This candidate belongs to another Telegram chat.',
    not_armed: 'Demo execution is disarmed. Send /arm, then press Accept again before expiry.',
    emergency_stopped:
      'Execution is blocked by the emergency stop. Send /resume, review settings, then /arm.',
    real_locked:
      'Real execution is locked because no authorized IQ Option order API is configured.',
    expired: 'The candidate expired before it could be queued.',
    busy: 'Another approved trade is still active. Wait for its receipt or use /emergency_stop.',
    daily_limit_reached: 'The daily demo-trade limit has been reached.',
    invalid_candidate:
      'The candidate is missing verified execution fields and was rejected safely.',
  };

  return messages[result.outcome];
}

function executionRequestToData(request: ExecutionRequest): FirebaseFirestore.DocumentData {
  return {
    id: request.id,
    candidate_id: request.candidateId,
    telegram_chat_id: request.telegramChatId,
    mode: request.mode,
    stake: request.stake,
    asset: request.asset,
    direction: request.direction,
    expiry_minutes: request.expiryMinutes,
    reference_price: request.referencePrice,
    execute_not_before: request.executeNotBefore,
    expires_at: request.expiresAt,
    requested_at: request.requestedAt,
    status: request.status,
    signature: request.signature,
    executor: 'IQ_OPTION_PRACTICE_EXTENSION',
    simulated: false,
    practice_order_placed: false,
    real_order_allowed: false,
    real_order_placed: false,
    claimed_at: null,
    claimed_by: null,
    claim_token_hash: null,
    completed_at: null,
  };
}

function executionRequestFromData(
  data: FirebaseFirestore.DocumentData | undefined,
): ExecutionRequest | null {
  const id = typeof data?.id === 'string' ? data.id : null;
  const candidateId = typeof data?.candidate_id === 'string' ? data.candidate_id : null;
  const telegramChatId = integerNumber(data?.telegram_chat_id);
  const mode = data?.mode === 'DEMO' || data?.mode === 'REAL' ? data.mode : null;
  const stake = finiteNumber(data?.stake);
  const asset = typeof data?.asset === 'string' ? data.asset : null;
  const direction = data?.direction === 'BUY' || data?.direction === 'SELL' ? data.direction : null;
  const expiryMinutes = integerNumber(data?.expiry_minutes);
  const referencePrice = finiteNumber(data?.reference_price);
  const executeNotBefore = dateFromValue(data?.execute_not_before);
  const expiresAt = dateFromValue(data?.expires_at);
  const requestedAt = dateFromValue(data?.requested_at);
  const signature = typeof data?.signature === 'string' ? data.signature : null;

  if (
    !id ||
    !candidateId ||
    telegramChatId === null ||
    !mode ||
    stake === null ||
    !asset ||
    !direction ||
    expiryMinutes === null ||
    referencePrice === null ||
    !executeNotBefore ||
    !expiresAt ||
    !requestedAt ||
    !signature
  ) {
    return null;
  }

  return {
    id,
    candidateId,
    telegramChatId,
    mode,
    stake,
    asset,
    direction,
    expiryMinutes,
    referencePrice,
    executeNotBefore,
    expiresAt,
    requestedAt,
    status: requestStatus(data?.status),
    signature,
  };
}

function renderCompletionMessage(
  requestData: FirebaseFirestore.DocumentData | undefined,
  success: boolean,
  brokerOrderId: string | undefined,
  message: string,
  evidence: string | undefined,
): string {
  return [
    success ? 'IQ Option Practice Trade Receipt' : 'IQ Option Practice Trade Failed',
    `Asset: ${String(requestData?.asset ?? 'unknown')}`,
    `Direction: ${String(requestData?.direction ?? 'unknown')}`,
    `Stake: $${finiteNumber(requestData?.stake)?.toFixed(2) ?? 'unknown'}`,
    `Order ID: ${brokerOrderId ?? 'none'}`,
    `Result: ${message}`,
    `Platform evidence: ${evidence?.slice(0, 300) || 'none'}`,
    `IQ Option Practice order placed: ${success ? 'yes' : 'no'}.`,
    'IQ Option Real order placed: no.',
  ].join('\n');
}

function requestStatus(value: unknown): ExecutionRequestStatus {
  if (
    value === 'queued' ||
    value === 'claimed' ||
    value === 'filled' ||
    value === 'failed' ||
    value === 'expired' ||
    value === 'cancelled'
  ) {
    return value;
  }

  return 'failed';
}

function hashClaimToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function safeSecretEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function dateFromValue(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (value && typeof value === 'object' && 'toDate' in value) {
    const toDate = (value as { toDate?: unknown }).toDate;
    if (typeof toDate === 'function') {
      const date = toDate.call(value) as Date;
      return Number.isNaN(date.getTime()) ? null : date;
    }
  }

  return null;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function integerNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) ? value : null;
}
