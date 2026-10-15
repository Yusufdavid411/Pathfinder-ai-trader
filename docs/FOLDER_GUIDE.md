# Folder Guide

This guide explains the purpose of each foundation folder in the PAT monorepo.

## Root

- `.github` - GitHub platform automation and workflow configuration.
- `.github/workflows` - CI workflow definitions.
- `apps` - User-facing applications.
- `docs` - Long-form documentation, design notes, and decision records.
- `firebase` - Firebase project structure prepared before initialization.
- `packages` - Shared framework-agnostic packages.
- `scripts` - Future repository automation scripts.
- `services` - Backend and domain-capability services.
- `tests` - Repository-level test suites.

## Apps

- `apps/mobile` - Flutter mobile and desktop application shell.
- `apps/mobile/lib` - Flutter source code.
- `apps/mobile/lib/config` - Mobile configuration placeholders.
- `apps/mobile/lib/core` - App-level routing and core wiring.
- `apps/mobile/lib/features` - Feature-first mobile modules.
- `apps/mobile/lib/features/auth` - Authentication feature placeholder.
- `apps/mobile/lib/features/dashboard` - Dashboard feature placeholder.
- `apps/mobile/lib/features/settings` - Settings feature placeholder.
- `apps/mobile/lib/features/splash` - Splash feature placeholder.
- `apps/mobile/lib/services` - Future mobile service clients and adapters.
- `apps/mobile/lib/shared` - Mobile-only shared primitives.
- `apps/mobile/lib/theme` - Flutter theme configuration.
- `apps/mobile/lib/widgets` - Reusable Flutter widgets.
- `apps/mobile/test` - Mobile test suite placeholder.
- `apps/dashboard` - React + Vite + TypeScript dashboard shell.
- `apps/dashboard/src` - Dashboard source code.
- `apps/dashboard/src/assets` - Static dashboard assets.
- `apps/dashboard/src/components` - Reusable dashboard components.
- `apps/dashboard/src/contexts` - React context providers.
- `apps/dashboard/src/hooks` - Dashboard React hooks.
- `apps/dashboard/src/models` - Dashboard-specific TypeScript models.
- `apps/dashboard/src/pages` - Routed dashboard pages.
- `apps/dashboard/src/services` - Future dashboard API clients and adapters.
- `apps/dashboard/src/styles` - Dashboard stylesheets.

## Services

- `services/api` - Trusted FastAPI backend for auth, profiles, and app APIs.
- `services/ai_engine` - Python 3.12 FastAPI AI Engine shell.
- `services/ai_engine/core` - AI Engine configuration and lifecycle boundaries.
- `services/ai_engine/database` - Future persistence adapters.
- `services/ai_engine/engines` - Future engine orchestration boundaries.
- `services/ai_engine/models` - AI Engine service-local data contracts.
- `services/ai_engine/routers` - FastAPI router modules.
- `services/ai_engine/services` - Future AI Engine service adapters.
- `services/ai_engine/tests` - AI Engine test suite placeholder.
- `services/ai_engine/utils` - AI Engine utility helpers.
- `services/broker_engine` - Future broker abstraction boundary.
- `services/broker_engine/core` - Future broker core abstractions.
- `services/broker_engine/models` - Future broker model contracts.
- `services/broker_engine/services` - Future broker service adapters.
- `services/broker_engine/tests` - Broker Engine test suite placeholder.
- `services/learning_engine` - Future learning workflow boundary.
- `services/learning_engine/core` - Future learning core abstractions.
- `services/learning_engine/models` - Future learning model contracts.
- `services/learning_engine/services` - Future learning service adapters.
- `services/learning_engine/tests` - Learning Engine test suite placeholder.
- `services/notification_engine` - Notification and Telegram channel boundary.

## Packages

- `packages/shared` - Shared constants, helpers, and types.
- `packages/contracts` - Shared API and domain contracts.
- `packages/shared/src` - Shared package source.
- `packages/shared/src/constants` - Cross-platform constants.
- `packages/shared/src/helpers` - Framework-agnostic helper functions.
- `packages/shared/src/types` - Shared TypeScript utility types.
- `packages/models` - Shared model contracts.
- `packages/models/src` - Shared model package source.
- `packages/utils` - Shared utility package.
- `packages/utils/src` - Shared utility package source.

## Firebase

- `firebase/auth` - Future Firebase Authentication setup notes and files.
- `firebase/firestore` - Future Firestore schema, rules, and indexes.
- `firebase/storage` - Future Firebase Storage layout and rules.
- `firebase/messaging` - Future Cloud Messaging setup and contracts.
- `firebase/functions` - Future Cloud Functions source and deployment configuration.
