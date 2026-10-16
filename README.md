# PathFinder AI Trader

PathFinder AI Trader (PAT) is a safety-first, modular trading-analysis platform.
The current product uses Telegram as its first control surface. It supports
approval-based execution in a logged-in IQ Option Practice account while
keeping real-money execution locked.

## Current Capabilities

- Firebase-hosted Telegram webhook and command menu.
- Live FX candle retrieval through Twelve Data with Alpha Vantage fallback.
- Explainable, manual-review market candidates based on EMA, RSI, momentum,
  and candle-quality rules.
- Firestore-backed Telegram candidate decisions and per-chat Demo controls for
  account target, stake, arming, disarming, and emergency stop.
- Signed execution queue, localhost bridge, and Chrome extension that place an
  individually approved order in IQ Option Practice and return verified
  platform evidence to Telegram.
- Trusted FastAPI authentication/profile boundary and Firebase adapters.
- React/Vite dashboard and Flutter application shells.
- IQ Option Practice connector with a local readiness/debug panel. It never
  reads credentials, private traffic, cookies, or session tokens.

See [the current build status](docs/BUILD_STATUS.md),
[the Telegram-first product plan](docs/TELEGRAM_FIRST_PRODUCT_PLAN.md), and
[the IQ Option reader guide](docs/iq-option-market-data-reader-v1.md) for the
implemented boundaries and next milestones.

## Repository Layout

```text
pathfinder-ai-trader/
  apps/                 Flutter and React/Vite clients
  services/             API, AI, broker, learning, and notification services
  firebase/             Cloud Functions, Firestore, Auth, and Storage setup
  packages/             Shared TypeScript contracts and utilities
  browser/              IQ Option Practice browser connector
  broker_engine/        IQ Option snapshot adapter
  market_engine/        Market-data provider interface
  docs/                 Architecture, plans, status, and setup guides
  scripts/              Build and operational scripts
  test/ and tests/      JavaScript and platform test suites
```

## Local Checks

Install Node dependencies:

```bash
npm install
```

Run the principal JavaScript and TypeScript checks:

```bash
npm run format:check
npm run lint
npm test
npm run test:functions
npm run build:dashboard
```

Run the Python suites with the repository virtual environment on Windows:

```powershell
.venv\Scripts\python.exe -m pytest services\api\tests services\notification_engine\tests services\broker_engine\tests
```

Build the browser extension bundle:

```bash
npm run build:extension
```

## Test with the real IQ Option Practice account

Build and load `browser/iq-option-reader` as an unpacked Chrome extension. Sign
in to IQ Option yourself, choose **Practice**, open the traderoom, and confirm
the Pathfinder panel says `READY`. Then start the local bridge:

```powershell
powershell.exe -ExecutionPolicy Bypass -File scripts\start_demo_bridge.ps1
```

In Telegram, send `/mode` and choose Demo, then `/stake 1`, `/arm`, and
`/scan`. Press **Accept & Queue** only when the live scanner produces a genuine
candidate. Use `/execution_status` to confirm that the bridge is online and
`/emergency_stop` to stop new execution claims.

## Safety Boundary

- Trade candidates are for manual review and are not financial advice.
- A success receipt represents an IQ Option Practice order, not a local fake.
- IQ Option has no public supported order API for this flow, so the connector
  uses visible traderoom controls and fails closed if they change.
- Real-account execution is hard-locked in the extension, local bridge, and
  cloud completion gate.
- Secrets belong in ignored local environment files or Firebase Secret Manager.
