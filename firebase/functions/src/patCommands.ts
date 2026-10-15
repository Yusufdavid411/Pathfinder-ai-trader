export type BotCommand = {
  command: string;
  description: string;
};

export type IncomingTelegramMessage = {
  chatId: number;
  text: string;
  callbackQueryId?: string;
};

export const supportedCommands: readonly BotCommand[] = [
  { command: 'start', description: 'Start PathFinder AI Trader' },
  { command: 'scan', description: 'Scan for candidate trade setups' },
  { command: 'status', description: 'Show current system status' },
  { command: 'help', description: 'Show available commands' },
  { command: 'watchlist', description: 'Show the current watchlist' },
  { command: 'market_status', description: 'Show market-reader status' },
  { command: 'risk', description: 'Show risk gate status' },
  { command: 'mode', description: 'Show current trading mode' },
  { command: 'compliance', description: 'Show execution compliance gate' },
  { command: 'signals', description: 'Show signal engine status' },
];

const defaultWatchlist = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'EUR/JPY'];

export type InlineKeyboardButton = {
  text: string;
  callback_data: string;
};

export type InlineKeyboardMarkup = {
  inline_keyboard: InlineKeyboardButton[][];
};

export type TelegramBotReply = {
  text: string;
  replyMarkup?: InlineKeyboardMarkup;
};

export const mainMenuKeyboard: InlineKeyboardMarkup = {
  inline_keyboard: [
    [
      { text: 'Scan Trades', callback_data: 'PAT_SCAN' },
      { text: 'Status', callback_data: 'PAT_STATUS' },
    ],
    [
      { text: 'Watchlist', callback_data: 'PAT_WATCHLIST' },
      { text: 'Risk Gate', callback_data: 'PAT_RISK' },
    ],
    [
      { text: 'Compliance', callback_data: 'PAT_COMPLIANCE' },
      { text: 'Help', callback_data: 'PAT_HELP' },
    ],
  ],
};

export function commandMenuText(): string {
  return [
    'Available commands:',
    ...supportedCommands.map((botCommand) => `/${botCommand.command} - ${botCommand.description}`),
  ].join('\n');
}

export function callbackDataToCommand(data: string): string | null {
  const actions: Record<string, string> = {
    PAT_SCAN: '/scan',
    PAT_STATUS: '/status',
    PAT_WATCHLIST: '/watchlist',
    PAT_RISK: '/risk',
    PAT_MODE: '/mode',
    PAT_COMPLIANCE: '/compliance',
    PAT_HELP: '/help',
  };

  return actions[data] ?? null;
}

export function parseAllowedChatIds(rawValue: string | undefined): ReadonlySet<number> {
  if (!rawValue || rawValue.trim() === '*' || rawValue.trim().toLowerCase() === 'public') {
    return new Set();
  }

  return new Set(
    rawValue
      .split(',')
      .map((value) => Number.parseInt(value.trim(), 10))
      .filter((value) => Number.isInteger(value)),
  );
}

export function respondToTelegramMessage(
  incoming: IncomingTelegramMessage,
  allowedChatIds: ReadonlySet<number>,
): string {
  if (allowedChatIds.size > 0 && !allowedChatIds.has(incoming.chatId)) {
    return 'Access denied. This PAT bot is private.';
  }

  const command = incoming.text.trim().toLowerCase();

  if (command === '/start') {
    return [
      'Welcome to PathFinder AI Trader.',
      'Telegram is the first PAT control surface for alerts, manual review, and shadow-trading updates.',
      'IQ Option auto-execution is disabled.',
      'Send /help to see what I can do.',
    ].join('\n');
  }

  if (command === '/status') {
    return [
      'PAT status: cloud webhook mode.',
      'Telegram webhook: online through Firebase when deployed.',
      'Market reading: foundation pending.',
      'Signals: not enabled yet.',
      'IQ Option execution: disabled by compliance gate.',
    ].join('\n');
  }

  if (command === '/scan') {
    return [
      'PAT Market Scan',
      'Scanner button: connected.',
      'Live market data: not connected yet.',
      'Trade recommendation: unavailable until a verified data provider, market-quality checks, confidence scoring, and risk gates are active.',
      'PAT will not fabricate BUY/SELL signals or guaranteed results.',
      'Next build target: connect a compliant market-data provider, then generate manual-review candidate signals.',
    ].join('\n');
  }

  if (command === '/help') {
    return commandMenuText();
  }

  if (command === '/watchlist') {
    return [
      'PAT Watchlist',
      ...defaultWatchlist.map((asset) => `- ${asset}`),
      'Market data is not connected yet.',
    ].join('\n');
  }

  if (command === '/market_status') {
    return [
      'Market Reader Status',
      'Data source: not connected yet.',
      'Observer Engine: pending Stage 6.',
      'Market Quality: pending Stage 8.',
      'Current action: build market data foundation next.',
    ].join('\n');
  }

  if (command === '/risk') {
    return [
      'Risk Gate Status',
      'Execution allowed: no.',
      'Auto mode: off.',
      'Capital protection: enforced by design.',
      'Full Risk Engine: pending Stage 11.',
    ].join('\n');
  }

  if (command === '/mode') {
    return [
      'Trading Mode',
      'Current mode: Signal/manual-review only.',
      'Semi-automatic: unavailable.',
      'Automatic: unavailable.',
      'IQ Option execution: disabled.',
    ].join('\n');
  }

  if (command === '/compliance') {
    return [
      'Compliance Gate',
      'IQ Option auto-execution is disabled.',
      'PAT will not log in to IQ Option, click trade buttons, or use unofficial execution paths.',
      'Broker execution requires a compliant adapter, completed risk controls, audit logs, and explicit user opt-in.',
    ].join('\n');
  }

  if (command === '/signals') {
    return [
      'Signal Engine Status',
      'Signals: not enabled yet.',
      'Reason: market data, observer, quality, confidence, and risk layers must be built first.',
      'PAT will never fabricate signals or guaranteed results.',
    ].join('\n');
  }

  return 'Command not recognized. Send /help to see available commands.';
}

export function buildTelegramReply(
  incoming: IncomingTelegramMessage,
  allowedChatIds: ReadonlySet<number>,
): TelegramBotReply {
  const text = respondToTelegramMessage(incoming, allowedChatIds);
  const command = incoming.text.trim().toLowerCase();

  if (command === '/start' || command === '/help' || command === '/status' || command === '/scan') {
    return { text, replyMarkup: mainMenuKeyboard };
  }

  return { text };
}
