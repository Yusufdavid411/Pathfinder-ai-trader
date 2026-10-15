# Contributing

## Principles

- Keep changes modular.
- Respect Clean Architecture boundaries.
- Add documentation when creating new modules.
- Do not add trading, AI, or broker logic during the foundation stage.
- Prefer small, reviewable changes.

## Local Quality Checks

Web:

```bash
npm run lint
npm run format:check
```

Flutter:

```bash
cd apps/mobile
flutter analyze
```

Python:

```bash
cd services/ai_engine
black --check .
isort --check-only .
```

## Branching

Use feature branches for implementation work. Keep main releasable.
