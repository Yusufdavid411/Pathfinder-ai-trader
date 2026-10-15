# PAT API Service

Trusted FastAPI backend boundary for PathFinder AI Trader.

## Stage 2 Scope

This service implements the authentication and Firebase foundation that can be safely built without live credentials:

- Firebase ID token verification interface.
- Firebase Admin verifier adapter.
- Authenticated `/v1/me` user profile route.
- User profile repository interface.
- In-memory repository for tests.
- Firestore repository adapter boundary.

Live Firebase initialization requires real Firebase project credentials and Google OAuth configuration.

## Local Setup

```bash
python -m venv .venv
pip install -e ".[dev]"
pytest
```

## Security Notes

- Clients must send Firebase ID tokens as `Authorization: Bearer <token>`.
- The backend verifies tokens and never trusts a client-supplied UID.
- Firestore writes must go through trusted repository boundaries.
