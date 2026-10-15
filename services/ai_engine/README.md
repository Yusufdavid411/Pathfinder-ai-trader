# AI Engine

Python 3.12 FastAPI shell for the future PathFinder AI Engine.

## Scope

This service contains folder boundaries and placeholder modules only.

No AI inference, AI training, market analysis, trading decisions, or broker logic is implemented.

## Structure

- `core` - application configuration and lifecycle boundaries.
- `engines` - future engine orchestration boundaries.
- `models` - service-local data contracts.
- `routers` - FastAPI route modules.
- `services` - service adapters and use-case services.
- `database` - future persistence adapters.
- `utils` - utility functions.
- `tests` - future service tests.

## Setup

```bash
python -m venv .venv
pip install -e ".[dev]"
uvicorn main:app --reload
```
