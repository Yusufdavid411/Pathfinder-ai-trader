import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';

import {
  createPresentedCandidate,
  FirestoreCandidateRepository,
  renderCandidateDecisionResult,
  type CandidateRepository,
} from './candidateTracking.js';
import {
  FirestoreExecutionRequestRepository,
  renderQueueExecutionResult,
} from './executionRequests.js';
import {
  buildTelegramReply,
  candidateDecisionKeyboard,
  executionControlKeyboard,
  modeKeyboard,
  parseAllowedChatIds,
  parseCandidateDecisionCallbackData,
  parseTradingControlCallbackData,
  stakeKeyboard,
  type IncomingTelegramMessage,
  type TelegramBotReply,
} from './patCommands.js';
import {
  AlphaVantageFxProvider,
  FallbackMarketDataProvider,
  TwelveDataFxProvider,
} from './marketData.js';
import { renderMarketScanResult, scanMarket } from './marketScanner.js';
import {
  answerCallbackQuery,
  extractIncomingTelegramInteraction,
  sendTelegramMessage,
  syncTelegramCommands,
} from './telegram.js';
import {
  FirestoreTradingControlRepository,
  renderTradingControlState,
  type TradingControlRepository,
} from './tradingControl.js';

const telegramBotToken = defineSecret('TELEGRAM_BOT_TOKEN');
const telegramWebhookSecret = defineSecret('TELEGRAM_WEBHOOK_SECRET');
const telegramAllowedChatIds = defineSecret('TELEGRAM_ALLOWED_CHAT_IDS');
const alphaVantageApiKey = defineSecret('ALPHA_VANTAGE_API_KEY');
const twelveDataApiKey = defineSecret('TWELVE_DATA_API_KEY');
let candidateRepository: CandidateRepository | undefined;
let tradingControlRepository: TradingControlRepository | undefined;
let executionRepository: FirestoreExecutionRequestRepository | undefined;

export const telegramWebhook = onRequest(
  {
    region: 'us-central1',
    secrets: [
      telegramBotToken,
      telegramWebhookSecret,
      telegramAllowedChatIds,
      alphaVantageApiKey,
      twelveDataApiKey,
    ],
    timeoutSeconds: 30,
    memory: '256MiB',
  },
  async (request, response) => {
    if (request.method !== 'POST') {
      response.status(405).send('Method not allowed.');
      return;
    }

    const expectedSecret = telegramWebhookSecret.value().trim();
    const receivedSecret = request.header('x-telegram-bot-api-secret-token');
    if (!expectedSecret || receivedSecret !== expectedSecret) {
      response.status(401).send('Unauthorized.');
      return;
    }

    const incoming = extractIncomingTelegramInteraction(request.body);
    if (incoming === null) {
      response.status(204).send();
      return;
    }

    const allowedChatIds = parseAllowedChatIds(telegramAllowedChatIds.value().trim());
    const accessDenied = allowedChatIds.size > 0 && !allowedChatIds.has(incoming.chatId);
    const candidateDecision = incoming.callbackData
      ? parseCandidateDecisionCallbackData(incoming.callbackData)
      : null;
    let callbackAnswer = 'PAT received your request.';
    let reply = buildTelegramReply(incoming, allowedChatIds);

    if (!accessDenied && candidateDecision) {
      const decisionResult = await getCandidateRepository().recordDecision({
        candidateId: candidateDecision.candidateId,
        telegramChatId: incoming.chatId,
        decision: candidateDecision.decision,
        decidedAt: new Date(),
      });
      reply = {
        text: renderCandidateDecisionResult(decisionResult, candidateDecision.decision),
      };
      const acceptedDecision =
        candidateDecision.decision === 'accepted' &&
        (decisionResult.outcome === 'recorded' ||
          (decisionResult.outcome === 'already_decided' && decisionResult.decision === 'accepted'));

      if (acceptedDecision) {
        const queueResult = await getExecutionRepository().queueAcceptedCandidate(
          candidateDecision.candidateId,
          incoming.chatId,
          new Date(),
        );
        reply = {
          text: `${reply.text}\n\n${renderQueueExecutionResult(queueResult)}`,
          replyMarkup: executionControlKeyboard,
        };
        callbackAnswer =
          queueResult.outcome === 'queued' ? 'Demo request queued.' : 'Approval saved.';
      } else {
        callbackAnswer =
          decisionResult.outcome === 'recorded'
            ? 'Candidate decision saved.'
            : 'Decision unchanged.';
      }
    } else if (!accessDenied && incoming.text.trim().toLowerCase() === '/scan') {
      const scanResult = await scanMarket(
        new FallbackMarketDataProvider([
          new TwelveDataFxProvider(twelveDataApiKey.value()),
          new AlphaVantageFxProvider(alphaVantageApiKey.value()),
        ]),
      );
      reply = { text: renderMarketScanResult(scanResult) };

      if (scanResult.ok) {
        const presentedCandidate = createPresentedCandidate(incoming.chatId, scanResult);
        await getCandidateRepository().savePresented(presentedCandidate);
        reply.replyMarkup = candidateDecisionKeyboard(presentedCandidate.id);
      }
    } else if (!accessDenied) {
      const controlReply = await buildTradingControlReply(incoming);
      if (controlReply) {
        reply = controlReply;
        callbackAnswer = 'Trading controls updated.';
      }
    }

    if (incoming.callbackQueryId) {
      await answerCallbackQuery(telegramBotToken.value(), incoming.callbackQueryId, callbackAnswer);
    }

    await sendTelegramMessage(
      telegramBotToken.value(),
      incoming.chatId,
      reply.text,
      reply.replyMarkup,
    );
    response.status(200).send('ok');
  },
);

function getCandidateRepository(): CandidateRepository {
  if (!candidateRepository) {
    if (getApps().length === 0) {
      initializeApp();
    }

    candidateRepository = new FirestoreCandidateRepository(getFirestore());
  }

  return candidateRepository;
}

function getTradingControlRepository(): TradingControlRepository {
  if (!tradingControlRepository) {
    tradingControlRepository = new FirestoreTradingControlRepository(getFirestoreInstance());
  }

  return tradingControlRepository;
}

function getExecutionRepository(): FirestoreExecutionRequestRepository {
  if (!executionRepository) {
    executionRepository = new FirestoreExecutionRequestRepository(
      getFirestoreInstance(),
      telegramWebhookSecret.value().trim(),
    );
  }

  return executionRepository;
}

function getFirestoreInstance() {
  if (getApps().length === 0) {
    initializeApp();
  }

  return getFirestore();
}

async function buildTradingControlReply(
  incoming: IncomingTelegramMessage,
): Promise<TelegramBotReply | null> {
  const repository = getTradingControlRepository();
  const callbackAction = incoming.callbackData
    ? parseTradingControlCallbackData(incoming.callbackData)
    : null;
  const rawCommand = incoming.text.trim();
  const command = rawCommand.toLowerCase();
  const now = new Date();

  if (callbackAction?.type === 'mode') {
    const state = await repository.setMode(incoming.chatId, callbackAction.mode, now);
    return {
      text: [
        `Trading target changed to ${state.mode}.`,
        state.mode === 'REAL'
          ? 'Real remains locked and cannot be armed.'
          : 'Changing mode disarmed execution. Review the stake, then send /arm.',
        '',
        renderTradingControlState(state),
      ].join('\n'),
      replyMarkup: state.mode === 'DEMO' ? stakeKeyboard : modeKeyboard,
    };
  }

  if (callbackAction?.type === 'stake') {
    return updateStake(incoming.chatId, callbackAction.stake, now);
  }

  if (callbackAction?.type === 'arm' || command === '/arm') {
    const result = await repository.arm(incoming.chatId, now);
    if (result.outcome === 'real_locked') {
      return {
        text: `Real execution was not armed.\n\n${renderTradingControlState(result.state)}`,
        replyMarkup: modeKeyboard,
      };
    }

    if (result.outcome === 'emergency_stopped') {
      return {
        text: `Emergency stop is active. Send /resume before arming Demo.\n\n${renderTradingControlState(result.state)}`,
        replyMarkup: executionControlKeyboard,
      };
    }

    return {
      text: `Demo execution is armed. Every candidate still requires Accept.\n\n${renderTradingControlState(result.state)}`,
      replyMarkup: executionControlKeyboard,
    };
  }

  if (callbackAction?.type === 'disarm' || command === '/disarm') {
    const state = await repository.disarm(incoming.chatId, now);
    return {
      text: `New execution requests are disarmed.\n\n${renderTradingControlState(state)}`,
      replyMarkup: executionControlKeyboard,
    };
  }

  if (callbackAction?.type === 'emergency_stop' || command === '/emergency_stop') {
    const state = await repository.emergencyStop(incoming.chatId, now);
    return {
      text: [
        'EMERGENCY STOP ACTIVATED.',
        'New bridge claims are blocked and execution is disarmed.',
        'Send /resume only after reviewing the account and pending requests.',
        '',
        renderTradingControlState(state),
      ].join('\n'),
      replyMarkup: executionControlKeyboard,
    };
  }

  if (callbackAction?.type === 'resume' || command === '/resume') {
    const state = await repository.resumeDemo(incoming.chatId, now);
    return {
      text: [
        'Demo emergency stop cleared.',
        'Execution remains disarmed. Review mode and stake, then send /arm.',
        '',
        renderTradingControlState(state),
      ].join('\n'),
      replyMarkup: executionControlKeyboard,
    };
  }

  if (command === '/mode' || callbackAction?.type === 'execution_status') {
    const state = await repository.getState(incoming.chatId, now);
    const bridge = await getExecutionRepository().getBridgeStatus();
    return {
      text: [
        renderTradingControlState(state),
        '',
        `Local Demo bridge: ${bridge.online ? 'ONLINE' : 'OFFLINE'}`,
        `Bridge last seen: ${bridge.lastSeenAt?.toISOString() ?? 'never'}`,
        'Real IQ Option execution: LOCKED.',
      ].join('\n'),
      replyMarkup: command === '/mode' ? modeKeyboard : executionControlKeyboard,
    };
  }

  if (command === '/execution_status' || command === '/risk' || command === '/status') {
    const state = await repository.getState(incoming.chatId, now);
    const bridge = await getExecutionRepository().getBridgeStatus();
    const prefix = buildTelegramReply(incoming, new Set()).text;
    return {
      text: [
        prefix,
        '',
        renderTradingControlState(state),
        `Local Demo bridge: ${bridge.online ? 'ONLINE' : 'OFFLINE'}`,
        `Bridge last seen: ${bridge.lastSeenAt?.toISOString() ?? 'never'}`,
      ].join('\n'),
      replyMarkup: executionControlKeyboard,
    };
  }

  if (command === '/stake') {
    const state = await repository.getState(incoming.chatId, now);
    return {
      text: [
        `Current Demo stake: $${state.stake.toFixed(2)}.`,
        `Allowed range: $1.00 to $${state.maxStake.toFixed(2)}.`,
        'Changing the stake automatically disarms execution.',
        'Choose a button or send /stake followed by an amount.',
      ].join('\n'),
      replyMarkup: stakeKeyboard,
    };
  }

  const stakeMatch = /^\/stake(?:@[a-z0-9_]+)?\s+([0-9]+(?:\.[0-9]{1,2})?)$/i.exec(rawCommand);
  if (stakeMatch) {
    return updateStake(incoming.chatId, Number.parseFloat(stakeMatch[1]), now);
  }

  return null;
}

async function updateStake(chatId: number, stake: number, now: Date): Promise<TelegramBotReply> {
  const result = await getTradingControlRepository().setStake(chatId, stake, now);
  if (result.outcome === 'invalid_stake') {
    return {
      text: `Stake was not changed. Enter $1.00 to $${result.state.maxStake.toFixed(2)}.`,
      replyMarkup: stakeKeyboard,
    };
  }

  return {
    text: [
      `Demo stake changed to $${result.state.stake.toFixed(2)}.`,
      'Execution was disarmed because a risk setting changed.',
      'Send /arm after reviewing the settings.',
    ].join('\n'),
    replyMarkup: executionControlKeyboard,
  };
}

export const syncTelegramCommandMenu = onRequest(
  {
    region: 'us-central1',
    secrets: [telegramBotToken, telegramWebhookSecret],
    timeoutSeconds: 30,
    memory: '256MiB',
  },
  async (request, response) => {
    const expectedSecret = telegramWebhookSecret.value().trim();
    const receivedSecret = request.header('x-pat-admin-secret');

    if (!expectedSecret || receivedSecret !== expectedSecret) {
      response.status(401).send('Unauthorized.');
      return;
    }

    await syncTelegramCommands(telegramBotToken.value());
    console.info('Telegram command menu synced from Firebase.');
    response.status(200).send('Telegram command menu synced.');
  },
);

export const bridgeClaimExecution = onRequest(
  {
    region: 'us-central1',
    secrets: [telegramWebhookSecret],
    timeoutSeconds: 30,
    memory: '256MiB',
  },
  async (request, response) => {
    if (request.method !== 'POST') {
      response.status(405).json({ error: 'method_not_allowed' });
      return;
    }

    if (request.header('x-pat-bridge-secret') !== telegramWebhookSecret.value().trim()) {
      response.status(401).json({ error: 'unauthorized' });
      return;
    }

    const bridgeId =
      typeof request.body?.bridge_id === 'string'
        ? request.body.bridge_id
        : 'pathfinder-local-demo';
    const claimed = await getExecutionRepository().claimNext(bridgeId, new Date());
    if (!claimed) {
      response.status(204).send();
      return;
    }

    response.status(200).json({
      request: {
        id: claimed.id,
        candidate_id: claimed.candidateId,
        telegram_chat_id: claimed.telegramChatId,
        mode: claimed.mode,
        stake: claimed.stake,
        asset: claimed.asset,
        direction: claimed.direction,
        expiry_minutes: claimed.expiryMinutes,
        reference_price: claimed.referencePrice,
        execute_not_before: claimed.executeNotBefore.toISOString(),
        expires_at: claimed.expiresAt.toISOString(),
        requested_at: claimed.requestedAt.toISOString(),
        status: claimed.status,
        signature: claimed.signature,
      },
      claim_token: claimed.claimToken,
    });
  },
);

export const bridgeCompleteExecution = onRequest(
  {
    region: 'us-central1',
    secrets: [telegramBotToken, telegramWebhookSecret],
    timeoutSeconds: 30,
    memory: '256MiB',
  },
  async (request, response) => {
    if (request.method !== 'POST') {
      response.status(405).json({ error: 'method_not_allowed' });
      return;
    }

    if (request.header('x-pat-bridge-secret') !== telegramWebhookSecret.value().trim()) {
      response.status(401).json({ error: 'unauthorized' });
      return;
    }

    if (
      typeof request.body?.request_id !== 'string' ||
      typeof request.body?.claim_token !== 'string' ||
      typeof request.body?.success !== 'boolean' ||
      typeof request.body?.message !== 'string'
    ) {
      response.status(400).json({ error: 'invalid_completion' });
      return;
    }

    const result = await getExecutionRepository().complete({
      requestId: request.body.request_id,
      claimToken: request.body.claim_token,
      success: request.body.success,
      brokerOrderId:
        typeof request.body?.broker_order_id === 'string'
          ? request.body.broker_order_id
          : undefined,
      message: request.body.message,
      completedAt: new Date(),
    });

    if (result.outcome !== 'completed') {
      response.status(result.outcome === 'not_found' ? 404 : 409).json({ error: result.outcome });
      return;
    }

    await sendTelegramMessage(telegramBotToken.value(), result.telegramChatId, result.text);
    response.status(200).json({ status: 'completed' });
  },
);
