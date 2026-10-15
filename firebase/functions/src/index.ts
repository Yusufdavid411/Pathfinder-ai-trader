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
  buildTelegramReply,
  candidateDecisionKeyboard,
  parseAllowedChatIds,
  parseCandidateDecisionCallbackData,
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

const telegramBotToken = defineSecret('TELEGRAM_BOT_TOKEN');
const telegramWebhookSecret = defineSecret('TELEGRAM_WEBHOOK_SECRET');
const telegramAllowedChatIds = defineSecret('TELEGRAM_ALLOWED_CHAT_IDS');
const alphaVantageApiKey = defineSecret('ALPHA_VANTAGE_API_KEY');
const twelveDataApiKey = defineSecret('TWELVE_DATA_API_KEY');
let candidateRepository: CandidateRepository | undefined;

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
      callbackAnswer =
        decisionResult.outcome === 'recorded' ? 'Candidate decision saved.' : 'Decision unchanged.';
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
