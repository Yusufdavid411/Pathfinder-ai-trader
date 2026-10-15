# Architecture

PAT follows Clean Architecture principles. The repository separates user interfaces, services, shared contracts, platform infrastructure, and future test suites.

## Architectural Layers

## Apps

User-facing applications live under `apps/`.

- `apps/mobile` contains the Flutter shell.
- `apps/dashboard` contains the React + Vite dashboard shell.

Apps should depend on stable contracts, shared models, and service APIs. They should not own trading, AI, broker, or learning logic.

## Services

Backend and domain-capability services live under `services/`.

- `services/ai_engine` is reserved for the Python FastAPI AI service.
- `services/broker_engine` is reserved for broker abstraction and integration boundaries.
- `services/learning_engine` is reserved for future learning workflows.

Services should expose APIs and contracts without leaking implementation details to apps.

## Packages

Shared reusable code lives under `packages/`.

- `packages/shared` contains common constants, helpers, and types.
- `packages/models` contains shared model contracts.
- `packages/utils` contains platform-agnostic utilities.

## Firebase

Firebase files live under `firebase/`. This directory is prepared but not initialized.

## Dependency Direction

Dependencies should point inward:

```text
apps -> packages
apps -> service clients
services -> packages
infrastructure -> services
```

Business rules should not depend on framework-specific code.
