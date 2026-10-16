const ACCOUNT_SELECTORS = [
  '[data-test*="balance"]',
  '[data-testid*="balance"]',
  '[data-test*="account-type"]',
  '[data-testid*="account-type"]',
  '[aria-label*="account" i]',
  '[class*="balance-info"]',
  '[class*="balance__"]',
];

const ASSET_SELECTORS = [
  '[data-test="instrument-name"]',
  '[data-testid="instrument-name"]',
  '[data-test*="active-instrument"]',
  '[data-testid*="active-instrument"]',
  '[class*="instrument-name"]',
  '[class*="active-asset"]',
];

const AMOUNT_SELECTORS = [
  'input[data-test*="amount"]',
  'input[data-testid*="amount"]',
  'input[data-test*="investment"]',
  'input[data-testid*="investment"]',
  'input[name*="amount" i]',
  'input[name*="investment" i]',
  '[data-test*="amount"] input',
  '[data-testid*="amount"] input',
  '[class*="investment"] input',
];

const EXPIRY_SELECTORS = [
  '[data-test*="expir"]',
  '[data-testid*="expir"]',
  '[data-test*="duration"]',
  '[data-testid*="duration"]',
  '[class*="expiration"]',
  '[class*="expiry"]',
];

const HIGHER_SELECTORS = [
  '[data-test*="higher"]',
  '[data-testid*="higher"]',
  '[data-test*="call"]',
  '[data-testid*="call"]',
  'button[class*="higher"]',
  'button[class*="call"]',
];

const LOWER_SELECTORS = [
  '[data-test*="lower"]',
  '[data-testid*="lower"]',
  '[data-test*="put"]',
  '[data-testid*="put"]',
  'button[class*="lower"]',
  'button[class*="put"]',
];

const POSITION_SELECTORS = [
  '[data-test*="open-position"]',
  '[data-testid*="open-position"]',
  '[data-test*="position-item"]',
  '[data-testid*="position-item"]',
  '[class*="position-item"]',
  '[class*="deal-item"]',
];

const NOTICE_SELECTORS = [
  '[role="alert"]',
  '[data-test*="toast"]',
  '[data-testid*="toast"]',
  '[data-test*="notification"]',
  '[data-testid*="notification"]',
  '[class*="toast"]',
  '[class*="notification"]',
];

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const elementText = (element) =>
  [
    element?.textContent,
    element?.getAttribute?.('aria-label'),
    element?.getAttribute?.('title'),
    element?.getAttribute?.('value'),
  ]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

const visible = (element) => {
  if (!element || element.disabled || element.getAttribute?.('aria-disabled') === 'true') return false;
  if (typeof element.getBoundingClientRect !== 'function') return true;
  const rectangle = element.getBoundingClientRect();
  const style = globalThis.getComputedStyle?.(element);
  return (
    rectangle.width > 0 &&
    rectangle.height > 0 &&
    style?.display !== 'none' &&
    style?.visibility !== 'hidden' &&
    Number(style?.opacity ?? 1) !== 0
  );
};

const queryVisible = (root, selectors) => {
  const matches = [];
  const seen = new Set();
  for (const selector of selectors) {
    for (const element of root.querySelectorAll?.(selector) ?? []) {
      if (!seen.has(element) && visible(element)) {
        seen.add(element);
        matches.push(element);
      }
    }
  }
  return matches;
};

const normalizedAsset = (value) =>
  String(value ?? '')
    .toUpperCase()
    .replace(/\(OTC\)/g, 'OTC')
    .replace(/[^A-Z0-9]/g, '');

const accountEvidence = (root) => {
  const values = queryVisible(root, ACCOUNT_SELECTORS)
    .map(elementText)
    .filter(Boolean)
    .slice(0, 20);
  const practice = values.filter((value) => /\b(practice|demo|virtual)\b/i.test(value));
  const real = values.filter((value) => /\b(real|live)\s*(account|balance)?\b/i.test(value));

  if (practice.length > 0 && real.length === 0) {
    return { mode: 'PRACTICE', evidence: practice[0] };
  }
  if (real.length > 0) {
    return { mode: 'REAL', evidence: real[0] };
  }
  return { mode: 'UNVERIFIED', evidence: values[0] ?? '' };
};

const currentAsset = (root) => {
  const values = queryVisible(root, ASSET_SELECTORS).map(elementText).filter(Boolean);
  return values[0] ?? '';
};

const semanticButton = (root, selectors, labelPattern) => {
  const explicit = queryVisible(root, selectors).find((element) => labelPattern.test(elementText(element)));
  if (explicit) return explicit;
  return queryVisible(root, ['button', '[role="button"]']).find((element) => {
    const value = elementText(element);
    return value.length <= 50 && labelPattern.test(value);
  });
};

const amountInput = (root) => queryVisible(root, AMOUNT_SELECTORS)[0] ?? null;

const expiryText = (root) =>
  queryVisible(root, EXPIRY_SELECTORS)
    .map(elementText)
    .find((value) => /(?:\d+\s*(?:m|min|minute)|\d{1,2}:\d{2})/i.test(value)) ?? '';

const higherButton = (root) => semanticButton(root, HIGHER_SELECTORS, /^(higher|call|buy|up)(\s|$)/i);
const lowerButton = (root) => semanticButton(root, LOWER_SELECTORS, /^(lower|put|sell|down)(\s|$)/i);

export function inspectPracticeTraderoom(root = document) {
  const account = accountEvidence(root);
  const asset = currentAsset(root);
  const amount = amountInput(root);
  const higher = higherButton(root);
  const lower = lowerButton(root);
  return Object.freeze({
    account_mode: account.mode,
    account_evidence: account.evidence,
    asset,
    amount_control_found: Boolean(amount),
    direction_controls_found: Boolean(higher && lower),
    expiry: expiryText(root),
    ready: account.mode === 'PRACTICE' && Boolean(asset && amount && higher && lower),
    real_execution_enabled: false,
  });
}

const setInputValue = (input, value) => {
  const prototype = Object.getPrototypeOf(input);
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
  if (setter) setter.call(input, value);
  else input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.blur?.();
};

const numericValue = (value) => {
  const match = String(value ?? '').replace(',', '.').match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
};

const ensureAmount = async (root, stake) => {
  const input = amountInput(root);
  if (!input) throw new Error('IQ Option investment amount control was not found.');
  input.focus?.();
  setInputValue(input, Number(stake).toFixed(2));
  await sleep(150);
  if (numericValue(input.value ?? elementText(input)) !== Number(stake)) {
    throw new Error('IQ Option did not accept the requested Practice stake.');
  }
};

const expiryMatches = (value, minutes) => {
  const text = String(value ?? '').toLowerCase();
  const minuteValue = text.match(/(\d+)\s*(?:m|min|minute)/)?.[1];
  if (Number(minuteValue) === minutes) return true;
  const clock = text.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!clock) return false;
  const seconds = clock[3]
    ? Number(clock[1]) * 3600 + Number(clock[2]) * 60 + Number(clock[3])
    : Number(clock[1]) * 60 + Number(clock[2]);
  return Math.abs(seconds - minutes * 60) <= 2;
};

const ensureExpiry = async (root, minutes) => {
  if (expiryMatches(expiryText(root), minutes)) return;
  const control = queryVisible(root, EXPIRY_SELECTORS)[0];
  control?.click?.();
  await sleep(250);
  const options = queryVisible(root, ['[role="option"]', '[role="menuitem"]', 'button', '[data-test*="expir"]']);
  const option = options.find((element) => expiryMatches(elementText(element), minutes));
  if (!option) {
    throw new Error(`Set IQ Option expiry to ${minutes} minute(s); Pathfinder could not verify that value.`);
  }
  option.click();
  await sleep(250);
  if (!expiryMatches(expiryText(root), minutes)) {
    throw new Error('IQ Option expiry could not be verified after selection.');
  }
};

const ensureAsset = async (root, requestedAsset) => {
  const requested = normalizedAsset(requestedAsset);
  if (normalizedAsset(currentAsset(root)) === requested) return;
  const opener = queryVisible(root, ASSET_SELECTORS)[0];
  opener?.click?.();
  await sleep(300);
  const choices = queryVisible(root, [
    '[role="option"]',
    '[role="menuitem"]',
    '[data-test*="instrument"]',
    '[data-testid*="instrument"]',
    '[class*="instrument-item"]',
  ]);
  const choice = choices.find((element) => normalizedAsset(elementText(element)) === requested);
  if (!choice) {
    throw new Error(`Open ${requestedAsset} in IQ Option before accepting this Telegram trade.`);
  }
  choice.click();
  await sleep(400);
  if (normalizedAsset(currentAsset(root)) !== requested) {
    throw new Error(`IQ Option did not switch to ${requestedAsset}; no order was sent.`);
  }
};

const positionSnapshot = (root) => ({
  count: queryVisible(root, POSITION_SELECTORS).length,
  notices: queryVisible(root, NOTICE_SELECTORS).map(elementText).filter(Boolean),
});

const orderIdentifier = (root) => {
  const elements = queryVisible(root, [...NOTICE_SELECTORS, ...POSITION_SELECTORS]);
  for (const element of elements) {
    for (const name of ['data-order-id', 'data-position-id', 'data-deal-id']) {
      const value = element.getAttribute?.(name);
      if (value) return value.slice(0, 100);
    }
  }
  return null;
};

const waitForPlatformReceipt = async (root, before, timeoutMilliseconds = 10_000) => {
  const deadline = Date.now() + timeoutMilliseconds;
  while (Date.now() < deadline) {
    await sleep(250);
    const after = positionSnapshot(root);
    const positiveNotice = after.notices.find(
      (value) =>
        !before.notices.includes(value) &&
        /\b(success|opened|placed|purchased|executed|position created|deal created)\b/i.test(value),
    );
    if (positiveNotice || after.count > before.count) {
      return {
        verified: true,
        evidence: (positiveNotice ?? 'A new open-position row appeared in IQ Option.').slice(0, 300),
        order_id: orderIdentifier(root),
      };
    }
  }
  return { verified: false, evidence: '', order_id: null };
};

const clickConfirmationIfPresent = async (root) => {
  await sleep(300);
  const dialogs = queryVisible(root, ['[role="dialog"]', '[data-test*="confirm"]', '[class*="modal"]']);
  for (const dialog of dialogs) {
    if (/\b(real|live)\s*(account|balance)?\b/i.test(elementText(dialog))) {
      throw new Error('IQ Option displayed a Real-account confirmation; execution was blocked.');
    }
    const confirmation = semanticButton(
      dialog,
      ['button[type="submit"]', '[data-test*="confirm"]', '[data-testid*="confirm"]'],
      /^(confirm|place|open|trade|continue)(\s|$)/i,
    );
    if (confirmation) {
      confirmation.click();
      return true;
    }
  }
  return false;
};

const validateCommand = (command, now = Date.now()) => {
  if (command?.mode !== 'DEMO') throw new Error('Only Demo commands are supported.');
  if (!['BUY', 'SELL'].includes(command.direction)) throw new Error('Invalid trade direction.');
  if (!Number.isFinite(command.stake) || command.stake < 1 || command.stake > 10) {
    throw new Error('Practice stake is outside the $1-$10 safety range.');
  }
  if (!Number.isInteger(command.expiry_minutes) || command.expiry_minutes < 1 || command.expiry_minutes > 15) {
    throw new Error('Practice expiry is outside the supported range.');
  }
  if (now < Date.parse(command.execute_not_before)) throw new Error('The execution window has not opened.');
  if (now > Date.parse(command.expires_at)) throw new Error('The Telegram trade candidate has expired.');
};

export async function executePracticeOrder(command, root = document) {
  try {
    validateCommand(command);
    let inspection = inspectPracticeTraderoom(root);
    if (inspection.account_mode !== 'PRACTICE') {
      throw new Error(
        inspection.account_mode === 'REAL'
          ? 'IQ Option Real account detected. Pathfinder blocked the order.'
          : 'IQ Option Practice account could not be verified. No order was sent.',
      );
    }

    await ensureAsset(root, command.asset);
    await ensureAmount(root, command.stake);
    await ensureExpiry(root, command.expiry_minutes);
    inspection = inspectPracticeTraderoom(root);
    if (inspection.account_mode !== 'PRACTICE') {
      throw new Error('Practice-account proof disappeared before execution. No order was sent.');
    }
    if (normalizedAsset(inspection.asset) !== normalizedAsset(command.asset)) {
      throw new Error('The visible IQ Option asset changed before execution. No order was sent.');
    }

    const action = command.direction === 'BUY' ? higherButton(root) : lowerButton(root);
    if (!action) throw new Error('The IQ Option direction control was not found.');
    const before = positionSnapshot(root);
    action.click();
    await clickConfirmationIfPresent(root);
    const receipt = await waitForPlatformReceipt(root, before);
    if (!receipt.verified) {
      throw new Error(
        'IQ Option received the click, but Pathfinder could not verify an opened Practice position. Inspect the Practice account before retrying.',
      );
    }

    return {
      success: true,
      broker_order_id: receipt.order_id,
      message: 'IQ Option confirmed a new Practice position.',
      evidence: receipt.evidence,
      account_mode: 'PRACTICE',
      platform_asset: currentAsset(root),
    };
  } catch (error) {
    const inspection = inspectPracticeTraderoom(root);
    return {
      success: false,
      broker_order_id: null,
      message: error instanceof Error ? error.message : 'Unknown IQ Option execution failure.',
      evidence: inspection.account_evidence,
      account_mode: inspection.account_mode,
      platform_asset: inspection.asset,
    };
  }
}
