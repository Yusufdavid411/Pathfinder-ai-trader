# PathFinder AI Trader

PathFinder AI Trader (PAT) is a safety-first, modular trading-analysis platform.
The current product uses Telegram as its first control surface and keeps all
broker execution disabled.

## Current Capabilities

- Firebase-hosted Telegram webhook and command menu.
- Live FX candle retrieval through Twelve Data with Alpha Vantage fallback.
- Explainable, manual-review market candidates based on EMA, RSI, momentum,
  and candle-quality rules.
- Trusted FastAPI authentication/profile boundary and Firebase adapters.
- React/Vite dashboard and Flutter application shells.
- Read-only IQ Option traderoom DOM reader with a local debug panel. It does
  not read credentials, inspect private traffic, or place trades.

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
  browser/              Read-only IQ Option browser reader
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
.venv\Scripts\python.exe -m pytest services\api\tests services\notification_engine\tests
```

Build the read-only browser extension bundle:

```bash
npm run build:extension
```

## Safety Boundary

- Trade candidates are for manual review and are not financial advice.
- IQ Option and other broker execution remain disabled.
- The IQ Option reader only observes explicitly visible page values.
- Secrets belong in ignored local environment files or Firebase Secret Manager.
