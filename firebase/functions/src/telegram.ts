import {
  callbackDataToCommand,
  supportedCommands,
  type BotCommand,
  type IncomingTelegramMessage,
  type InlineKeyboardMarkup,
} from './patCommands.js';

type TelegramUpdate = {
  message?: {
    chat?: {
      id?: unknown;
    };
    text?: unknown;
  };
  callback_query?: {
    id?: unknown;
    data?: unknown;
    message?: {
      chat?: {
        id?: unknown;
      };
    };
  };
};

export function extractIncomingTelegramMessage(
  update: TelegramUpdate,
): IncomingTelegramMessage | null {
  const chatId = update.message?.chat?.id;
  const text = update.message?.text;

  if (typeof chatId !== 'number' || typeof text !== 'string') {
    return null;
  }

  return { chatId, text };
}

export function extractIncomingTelegramInteraction(
  update: TelegramUpdate,
): IncomingTelegramMessage | null {
  const message = extractIncomingTelegramMessage(update);
  if (message !== null) {
    return message;
  }

  const callbackQueryId = update.callback_query?.id;
  const callbackData = update.callback_query?.data;
  const chatId = update.callback_query?.message?.chat?.id;

  if (
    typeof callbackQueryId !== 'string' ||
    typeof callbackData !== 'string' ||
    typeof chatId !== 'number'
  ) {
    return null;
  }

  const command = callbackDataToCommand(callbackData);
  if (command === null) {
    return null;
  }

  return { chatId, text: command, callbackQueryId, callbackData };
}

export async function sendTelegramMessage(
  botToken: string,
  chatId: number,
  text: string,
  replyMarkup?: InlineKeyboardMarkup,
): Promise<void> {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    }),
  });

  if (!response.ok) {
    throw new Error(`Telegram sendMessage failed with ${response.status}.`);
  }
}

export async function answerCallbackQuery(
  botToken: string,
  callbackQueryId: string,
  text = 'PAT received your request.',
): Promise<void> {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text,
      show_alert: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Telegram answerCallbackQuery failed with ${response.status}.`);
  }
}

export async function syncTelegramCommands(
  botToken: string,
  commands: readonly BotCommand[] = supportedCommands,
): Promise<void> {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/setMyCommands`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ commands }),
  });

  if (!response.ok) {
    throw new Error(`Telegram setMyCommands failed with ${response.status}.`);
  }
}
