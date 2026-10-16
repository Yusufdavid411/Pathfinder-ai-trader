export type BotCommand = {
  command: string;
  description: string;
};

export type IncomingTelegramMessage = {
  chatId: number;
  text: string;
  callbackQueryId?: string;
  callbackData?: string;
};

export type CandidateDecision = 'accepted' | 'ignored' | 'rejected';

export type CandidateDecisionAction = {
  candidateId: string;
  decision: CandidateDecision;
};

export type TradingControlAction =
  | { type: 'mode'; mode: 'DEMO' | 'REAL' }
  | { type: 'stake'; stake: number }
  | { type: 'arm' | 'disarm' | 'emergency_stop' | 'resume' | 'execution_status' };

export const supportedCommands: readonly BotCommand[] = [
  { command: 'start', description: 'Start PathFinder AI Trader' },
  { command: 'scan', description: 'Scan for candidate trade setups' },
  { command: 'status', description: 'Show current system status' },
  { command: 'help', description: 'Show available commands' },
  { command: 'watchlist', description: 'Show the current watchlist' },
  { command: 'market_status', description: 'Show market-reader status' },
  { command: 'risk', description: 'Show risk gate status' },
  { command: 'mode', description: 'Choose Demo or locked Real target' },
  { command: 'stake', description: 'Set demo stake, for example /stake 1' },
  { command: 'arm', description: 'Arm approval-based Demo execution' },
  { command: 'disarm', description: 'Disarm new execution requests' },
  { command: 'emergency_stop', description: 'Stop and disarm execution' },
  { command: 'resume', description: 'Clear the Demo emergency stop' },
  { command: 'execution_status', description: 'Show controls and bridge status' },
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
      { text: 'Trading Mode', callback_data: 'PAT_MODE' },
      { text: 'Execution Status', callback_data: 'PAT_EXECUTION_STATUS' },
    ],
    [
      { text: 'Arm Demo', callback_data: 'PAT_ARM' },
      { text: 'Disarm', callback_data: 'PAT_DISARM' },
    ],
    [{ text: 'EMERGENCY STOP', callback_data: 'PAT_EMERGENCY_STOP' }],
    [
      { text: 'Compliance', callback_data: 'PAT_COMPLIANCE' },
      { text: 'Help', callback_data: 'PAT_HELP' },
    ],
  ],
};

export function candidateDecisionKeyboard(candidateId: string): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        {
          text: 'Accept & Queue',
          callback_data: candidateDecisionCallbackData('accepted', candidateId),
        },
        {
          text: 'Ignored',
          callback_data: candidateDecisionCallbackData('ignored', candidateId),
        },
      ],
      [
        {
          text: 'Rejected',
          callback_data: candidateDecisionCallbackData('rejected', candidateId),
        },
      ],
    ],
  };
}

export const modeKeyboard: InlineKeyboardMarkup = {
  inline_keyboard: [
    [
      { text: 'Demo', callback_data: 'PAT_MODE:DEMO' },
      { text: 'Real (Locked)', callback_data: 'PAT_MODE:REAL' },
    ],
    [
      { text: 'Arm Demo', callback_data: 'PAT_ARM' },
      { text: 'Disarm', callback_data: 'PAT_DISARM' },
    ],
  ],
};

export const stakeKeyboard: InlineKeyboardMarkup = {
  inline_keyboard: [
    [
      { text: '$1', callback_data: 'PAT_STAKE:1' },
      { text: '$2', callback_data: 'PAT_STAKE:2' },
      { text: '$5', callback_data: 'PAT_STAKE:5' },
      { text: '$10', callback_data: 'PAT_STAKE:10' },
    ],
    [{ text: 'Show Status', callback_data: 'PAT_EXECUTION_STATUS' }],
  ],
};

export const executionControlKeyboard: InlineKeyboardMarkup = {
  inline_keyboard: [
    [
      { text: 'Arm Demo', callback_data: 'PAT_ARM' },
      { text: 'Disarm', callback_data: 'PAT_DISARM' },
    ],
    [
      { text: 'Reset Demo Stop', callback_data: 'PAT_RESUME' },
      { text: 'Status', callback_data: 'PAT_EXECUTION_STATUS' },
    ],
    [{ text: 'EMERGENCY STOP', callback_data: 'PAT_EMERGENCY_STOP' }],
  ],
};

export function candidateDecisionCallbackData(
  decision: CandidateDecision,
  candidateId: string,
): string {
  const callbackData = `PAT_SIGNAL:${decision}:${candidateId}`;
  if (callbackData.length > 64) {
    throw new Error('Telegram callback data must not exceed 64 bytes.');
  }

  return callbackData;
}

export function parseCandidateDecisionCallbackData(
  callbackData: string,
): CandidateDecisionAction | null {
  const match = /^PAT_SIGNAL:(accepted|ignored|rejected):([A-Za-z0-9_-]{8,40})$/.exec(callbackData);
  if (!match) {
    return null;
  }

  return {
    decision: match[1] as CandidateDecision,
    candidateId: match[2],
  };
}

export function parseTradingControlCallbackData(callbackData: string): TradingControlAction | null {
  const mode = /^PAT_MODE:(DEMO|REAL)$/.exec(callbackData);
  if (mode) {
    return { type: 'mode', mode: mode[1] as 'DEMO' | 'REAL' };
  }

  const stake = /^PAT_STAKE:(1|2|5|10)$/.exec(callbackData);
  if (stake) {
    return { type: 'stake', stake: Number.parseInt(stake[1], 10) };
  }

  const actions: Record<
    string,
    'arm' | 'disarm' | 'emergency_stop' | 'resume' | 'execution_status'
  > = {
    PAT_ARM: 'arm',
    PAT_DISARM: 'disarm',
    PAT_EMERGENCY_STOP: 'emergency_stop',
    PAT_RESUME: 'resume',
    PAT_EXECUTION_STATUS: 'execution_status',
  };
  const type = actions[callbackData];
  return type ? { type } : null;
}

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

  if (actions[data]) {
    return actions[data];
  }

  const tradingAction = parseTradingControlCallbackData(data);
  if (tradingAction) {
    if (tradingAction.type === 'mode') {
      return '/mode_selection';
    }

    if (tradingAction.type === 'stake') {
      return '/stake_selection';
    }

    return `/${tradingAction.type}`;
  }

  return parseCandidateDecisionCallbackData(data) ? '/candidate_decision' : null;
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
      'Telegram is the PAT control surface for scans, approvals, Demo execution, and results.',
      'Demo execution requires /mode, /stake, /arm, and an explicit Accept.',
      'Real IQ Option execution is locked until an authorized integration exists.',
      'Send /help to see what I can do.',
    ].join('\n');
  }

  if (command === '/status') {
    return [
      'PAT status: cloud webhook mode.',
      'Telegram webhook: online through Firebase when deployed.',
      'Market reading: live provider chain configured.',
      'Scanner: approval-required candidates enabled.',
      'Candidate decisions: Taken, Ignored, and Rejected tracking enabled.',
      'Outcome resolution: pending.',
      'Pathfinder Demo bridge: use /execution_status.',
      'Real IQ Option execution: locked by compliance gate.',
    ].join('\n');
  }

  if (command === '/scan') {
    return [
      'PAT Market Scan',
      'Scanner button: connected.',
      'Live market data: requested through the configured provider chain.',
      'Eligible results are stored for manual decision and outcome tracking.',
      'PAT will not fabricate BUY/SELL signals or guaranteed results.',
      'A scan cannot execute. Use Demo + /arm + Accept to queue a simulated bridge order.',
    ].join('\n');
  }

  if (command === '/help') {
    return commandMenuText();
  }

  if (command === '/watchlist') {
    return [
      'PAT Watchlist',
      ...defaultWatchlist.map((asset) => `- ${asset}`),
      'The cloud scanner checks these pairs through the configured provider chain.',
    ].join('\n');
  }

  if (command === '/market_status') {
    return [
      'Market Reader Status',
      'Primary data source: Twelve Data FX candles.',
      'Fallback data source: Alpha Vantage when the endpoint is available.',
      'Observer Engine: pending Stage 6.',
      'Market Quality: pending Stage 8.',
      'Execution: disabled.',
    ].join('\n');
  }

  if (command === '/risk') {
    return [
      'Risk Gate Status',
      'Demo execution requires an explicit Accept for every candidate.',
      'One active request and ten demo trades per day maximum.',
      'Stake is capped at $10 in the current Demo release.',
      'No Martingale or recovery staking.',
      'Real execution remains locked.',
    ].join('\n');
  }

  if (command === '/mode') {
    return [
      'Trading Mode',
      'Choose Demo or view the locked Real target.',
      'Demo still requires /arm and Accept for every trade.',
      'Use /execution_status to see the active state.',
    ].join('\n');
  }

  if (command === '/compliance') {
    return [
      'Compliance Gate',
      'Pathfinder never stores an IQ Option password, OTP, cookie, or session token.',
      'The current local bridge executes only a Pathfinder simulation.',
      'Real IQ Option execution requires written authorization and an approved integration method.',
    ].join('\n');
  }

  if (command === '/signals') {
    return [
      'Signal Engine Status',
      'Approval-required scanner candidates: enabled.',
      'Candidate decision tracking: enabled.',
      'Outcome resolution and calibrated confidence: pending.',
      'PAT will never fabricate signals or guaranteed results.',
      'Pathfinder Demo bridge: available when armed.',
      'Real IQ Option execution: locked.',
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
