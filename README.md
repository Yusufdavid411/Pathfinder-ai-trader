# PathFinder AI Trader

PathFinder AI Trader (PAT) is a production-grade foundation for a modular AI-powered trading platform.

This repository is intentionally foundation-only. It does not contain trading decisions, AI models, broker integrations, or executable trading behavior.

## Monorepo Layout

```text
pathfinder-ai-trader/
  apps/
    mobile/
    dashboard/
  services/
    ai_engine/
    broker_engine/
    learning_engine/
  packages/
    shared/
    models/
    utils/
  firebase/
  docs/
  scripts/
  tests/
  .github/
```

## Current Stage

The current stage establishes:

- Clean Architecture boundaries.
- Flutter mobile/desktop shell with Riverpod and GoRouter dependencies.
- React + Vite + TypeScript dashboard shell with React Router.
- Python 3.12 FastAPI service shell for the future AI Engine.
- Firebase folder layout without Firebase initialization.
- Shared package boundaries for future cross-platform models, constants, helpers, and types.
- Formatting, linting, and CI placeholders.

## Getting Started

Install the required toolchains first:

- Flutter stable SDK.
- Node.js and npm.
- Python 3.12.
- Firebase CLI, when Firebase initialization begins.

Then install web dependencies:

```bash
npm install
```

Run the dashboard:

```bash
npm run dev:dashboard
```

Run the Flutter app after installing Flutter:

```bash
cd apps/mobile
flutter pub get
flutter run
```

Run the AI Engine shell after installing Python 3.12:

```bash
cd services/ai_engine
python -m venv .venv
pip install -e ".[dev]"
uvicorn main:app --reload
```

## Guardrails

- Do not add trading logic at this stage.
- Do not add AI inference or training logic at this stage.
- Do not connect to IQ Option or any broker at this stage.
- Do not initialize Firebase until environment ownership and project settings are confirmed.
