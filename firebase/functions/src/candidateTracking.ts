import { randomUUID } from 'node:crypto';

import type { Firestore } from 'firebase-admin/firestore';

import type { CandidateDecision } from './patCommands.js';
import type { MarketScanResult } from './marketScanner.js';

export type CandidateStatus = 'presented' | CandidateDecision;

type StoredCandidate = Omit<PresentedCandidate, 'status'> & {
  status: CandidateStatus;
  decidedAt?: Date;
};

export type PresentedCandidate = {
  id: string;
  telegramChatId: number;
  provider: string;
  asset: string;
  direction: 'BUY' | 'SELL';
  signalStrength: number;
  expiryMinutes: number;
  generatedAt: Date;
  entryWindowAt: Date;
  expiresAt: Date;
  latestCandleAt: Date;
  referencePrice: number;
  reasons: string[];
  status: 'presented';
};

export type CandidateDecisionInput = {
  candidateId: string;
  telegramChatId: number;
  decision: CandidateDecision;
  decidedAt: Date;
};

export type CandidateDecisionResult =
  | { outcome: 'recorded'; decision: CandidateDecision }
  | { outcome: 'not_found' }
  | { outcome: 'forbidden' }
  | { outcome: 'already_decided'; decision: CandidateDecision }
  | { outcome: 'invalid_state' };

export interface CandidateRepository {
  savePresented(candidate: PresentedCandidate): Promise<void>;
  recordDecision(input: CandidateDecisionInput): Promise<CandidateDecisionResult>;
}

export function createPresentedCandidate(
  telegramChatId: number,
  scanResult: MarketScanResult,
  id: string = randomUUID(),
): PresentedCandidate {
  if (!scanResult.ok || scanResult.candidate.direction === 'WAIT') {
    throw new Error('Only successful directional scan results can be presented.');
  }

  const entryWindowAt = new Date(scanResult.generatedAt.getTime() + 60_000);
  const expiresAt = new Date(entryWindowAt.getTime() + scanResult.candidate.expiryMinutes * 60_000);

  return {
    id,
    telegramChatId,
    provider: scanResult.provider,
    asset: `${scanResult.candidate.pair.base}/${scanResult.candidate.pair.quote}`,
    direction: scanResult.candidate.direction,
    signalStrength: scanResult.candidate.signalStrength,
    expiryMinutes: scanResult.candidate.expiryMinutes,
    generatedAt: scanResult.generatedAt,
    entryWindowAt,
    expiresAt,
    latestCandleAt: scanResult.candidate.latestCandleTime,
    referencePrice: scanResult.candidate.latestClose,
    reasons: [...scanResult.candidate.reasons],
    status: 'presented',
  };
}

export function renderCandidateDecisionResult(
  result: CandidateDecisionResult,
  requestedDecision: CandidateDecision,
): string {
  if (result.outcome === 'recorded') {
    const nextMessage =
      result.decision === 'accepted'
        ? 'Approval saved. PAT is checking the execution gates.'
        : 'Shadow outcome tracking: marked for resolution.';

    return [
      `Candidate decision recorded: ${candidateDecisionLabel(result.decision)}.`,
      nextMessage,
      result.decision === 'accepted'
        ? 'A trade is not considered placed until an execution receipt is returned.'
        : 'No execution request was created.',
    ].join('\n');
  }

  if (result.outcome === 'already_decided') {
    return [
      `This candidate was already marked ${candidateDecisionLabel(result.decision)}.`,
      'The earlier decision was kept.',
      'Execution: disabled.',
    ].join('\n');
  }

  if (result.outcome === 'not_found' || result.outcome === 'forbidden') {
    return [
      'Candidate decision was not recorded.',
      'The candidate was not found for this Telegram chat.',
      'Run /scan to request a new candidate.',
    ].join('\n');
  }

  return [
    `Candidate decision was not recorded as ${candidateDecisionLabel(requestedDecision)}.`,
    'The candidate is no longer in a decision-ready state.',
    'Execution: disabled.',
  ].join('\n');
}

export class InMemoryCandidateRepository implements CandidateRepository {
  private readonly candidates = new Map<string, StoredCandidate>();

  async savePresented(candidate: PresentedCandidate): Promise<void> {
    if (this.candidates.has(candidate.id)) {
      throw new Error(`Candidate ${candidate.id} already exists.`);
    }

    this.candidates.set(candidate.id, { ...candidate, reasons: [...candidate.reasons] });
  }

  async recordDecision(input: CandidateDecisionInput): Promise<CandidateDecisionResult> {
    const candidate = this.candidates.get(input.candidateId);
    if (!candidate) {
      return { outcome: 'not_found' };
    }

    if (candidate.telegramChatId !== input.telegramChatId) {
      return { outcome: 'forbidden' };
    }

    if (candidate.status !== 'presented') {
      return { outcome: 'already_decided', decision: candidate.status };
    }

    candidate.status = input.decision;
    candidate.decidedAt = input.decidedAt;
    return { outcome: 'recorded', decision: input.decision };
  }

  get(candidateId: string): StoredCandidate | undefined {
    return this.candidates.get(candidateId);
  }
}

export class FirestoreCandidateRepository implements CandidateRepository {
  constructor(private readonly firestore: Firestore) {}

  async savePresented(candidate: PresentedCandidate): Promise<void> {
    await this.firestore.collection('signals').doc(candidate.id).create({
      id: candidate.id,
      source: 'telegram_scan',
      telegram_chat_id: candidate.telegramChatId,
      provider: candidate.provider,
      asset: candidate.asset,
      direction: candidate.direction,
      signal_strength: candidate.signalStrength,
      expiry_minutes: candidate.expiryMinutes,
      generated_at: candidate.generatedAt,
      entry_window_at: candidate.entryWindowAt,
      expires_at: candidate.expiresAt,
      latest_candle_at: candidate.latestCandleAt,
      reference_price: candidate.referencePrice,
      reasons: candidate.reasons,
      status: candidate.status,
      decision_at: null,
      outcome_status: 'pending',
      shadow_tracking_required: false,
      execution_enabled: false,
      execution_status: 'not_requested',
      real_order_placed: false,
    });
  }

  async recordDecision(input: CandidateDecisionInput): Promise<CandidateDecisionResult> {
    const reference = this.firestore.collection('signals').doc(input.candidateId);

    return this.firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists) {
        return { outcome: 'not_found' };
      }

      const data = snapshot.data();
      if (data?.telegram_chat_id !== input.telegramChatId) {
        return { outcome: 'forbidden' };
      }

      if (data.status !== 'presented') {
        if (isCandidateDecision(data.status)) {
          return { outcome: 'already_decided', decision: data.status };
        }

        return { outcome: 'invalid_state' };
      }

      transaction.update(reference, {
        status: input.decision,
        decision_at: input.decidedAt,
        shadow_tracking_required: input.decision !== 'accepted',
      });

      return { outcome: 'recorded', decision: input.decision };
    });
  }
}

function isCandidateDecision(value: unknown): value is CandidateDecision {
  return value === 'accepted' || value === 'ignored' || value === 'rejected';
}

function candidateDecisionLabel(decision: CandidateDecision): string {
  if (decision === 'accepted') {
    return 'Taken';
  }

  return decision.charAt(0).toUpperCase() + decision.slice(1);
}
