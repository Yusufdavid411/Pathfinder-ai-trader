# PathFinder AI Trader
## Codex Master Build Guide

This document is the permanent engineering specification and development roadmap for **PathFinder AI Trader (PAT)**.

Codex must treat this document as the primary source of truth for the project.

Do not wait for a new prompt after every development stage.

After completing and verifying one stage:

1. Update `docs/BUILD_STATUS.md`.
2. Commit or prepare the completed work.
3. Continue to the next incomplete stage.
4. Run relevant tests before moving forward.
5. Fix failures before continuing.
6. Stop only when a genuine manual action, credential, external account configuration, or product decision is required.

Never delete working implementation merely because a newer stage is being added.

---

# 1. PRODUCT VISION

PathFinder AI Trader is a subscription-based AI-assisted trading platform.

It will initially work with **IQ Option DEMO accounts** but must use a broker-independent architecture so additional supported brokers can be introduced later without rewriting the trading intelligence.

The system must be usable from:

- Android/iOS mobile application
- Web browser
- Future desktop application if needed

The AI backend runs independently of the user interface.

The platform must support three trading modes:

### Signal Mode

The system analyzes markets and recommends opportunities.

The user manually decides whether to execute them.

### Semi-Automatic Mode

The system prepares an eligible trade.

The user explicitly approves or rejects it.

Only approved trades may be executed.

### Automatic Mode

The system may execute an eligible trade automatically only when:

- Automatic mode was explicitly enabled by the user.
- Subscription entitlement permits it.
- Broker connection is healthy.
- Account is eligible.
- Demo/live account restrictions permit execution.
- Market Quality requirement passes.
- Confidence requirement passes.
- Risk Engine approves.
- Capital Protection Mode approves.
- Kill switch is not active.
- Session limits have not been exceeded.

During development, automatic execution must remain **DEMO-ONLY**.

---

# 2. CORE PHILOSOPHY

PathFinder AI Trader does not exist to make as many trades as possible.

It exists to make disciplined decisions.

The system must consider **NO TRADE** a successful decision when market evidence is inadequate.

Core principles:

- Protect capital first.
- Never force trades.
- Patience is a valid strategy.
- Never chase losses.
- Never revenge trade.
- Evaluate market quality before considering a trade.
- Never fabricate confidence.
- Never hide uncertainty.
- Every recommendation must have evidence.
- Every decision must be explainable.
- Every outcome should become useful data.
- Learning must be evidence-based.
- Risk rules override opportunity.
- Users must always retain control.
- Automatic trading must have an emergency kill switch.

---

# 3. PERFORMANCE TARGET

A historical win rate of approximately **7 wins from 10 trades** may be treated as a research target.

It is NOT a guaranteed outcome.

Never:

- Hardcode a 70% win rate.
- Claim guaranteed profitability.
- Fabricate performance data.
- Display fake success rates.
- Describe model confidence as guaranteed probability.

The system must calculate actual:

- Win rate
- Loss rate
- Drawdown
- Profit/loss
- Strategy performance
- Market-condition performance
- Confidence calibration
- Session performance
- Historical sample size

All performance statistics must come from recorded data.

---

# 4. TECHNOLOGY STACK

Use:

## Mobile

Flutter + Dart

Recommended:

- Riverpod
- GoRouter
- Freezed/json_serializable where appropriate
- Firebase Flutter SDK

## Web

React

Vite

TypeScript

React Router

## Backend / AI

Python 3.12+

FastAPI

Pydantic

NumPy

Pandas

Scikit-learn

Add PyTorch or another ML framework only when justified by an implemented learning model.

## Backend Infrastructure

Firebase

Use:

- Firebase Authentication
- Cloud Firestore
- Firebase Storage
- Firebase Cloud Messaging
- Firebase Admin SDK
- Firebase App Check where appropriate
- Cloud Functions only where needed

Keep Firebase behind repository/service abstractions so storage can be replaced later.

---

# 5. MONOREPO

Maintain approximately:

```text
Pathfinder-ai-trader/

apps/
    mobile/
    dashboard/

services/
    api/
    ai_engine/
    market_engine/
    broker_engine/
    risk_engine/
    learning_engine/
    subscription_engine/
    notification_engine/
    analytics_engine/
    replay_engine/

packages/
    shared/
    contracts/
    models/

firebase/

docs/

tests/
    unit/
    integration/
    simulated_markets/
    historical_data/
    replay_sessions/
    benchmark_results/

scripts/

.github/
    workflows/
```

Do not create unnecessary microservices simply because they appear above.

Closely coupled Python modules may remain within the same deployable backend while retaining logical service boundaries.

Prefer maintainability over architecture theatre.

---

# 6. DOMAIN ENTITIES

The system should support models representing:

- User
- UserSettings
- Subscription
- SubscriptionPlan
- Entitlement
- FeatureAccess
- Broker
- BrokerAccount
- MarketAsset
- MarketTick
- Candle
- TimeFrame
- MarketSnapshot
- MarketDNA
- MarketMemory
- MarketQuality
- AIObservation
- AIConfidence
- Signal
- Trade
- ShadowTrade
- RiskProfile
- TradingSession
- SessionAnalysis
- Strategy
- StrategyVersion
- LearningNote
- AIVersion
- ReplaySession
- ReplayTrade
- Notification
- DailyReport
- WeeklyReport
- AuditLog

Avoid maintaining three completely unrelated definitions of the same domain object.

Use backend API contracts/schema generation where practical.

---

# 7. FIREBASE DATA

Expected Firestore concepts include:

```text
users
subscriptions
subscription_plans
entitlements
broker_accounts
signals
trades
shadow_trades
market_snapshots
market_quality
market_memory
market_dna
strategies
strategy_versions
learning_notes
ai_observations
ai_confidence
risk_profiles
trading_sessions
session_analysis
daily_reports
weekly_reports
notifications
ai_versions
replay_sessions
replay_trades
audit_logs
settings
```

Avoid storing every raw market tick indefinitely in Firestore.

High-frequency raw market data requires deliberate retention/storage design.

Use Firestore primarily for structured application state, user data, analysis output and summarized trading data.

---

# 8. AUTHENTICATION

Support:

- Email/password
- Google Sign-In

Backend must verify Firebase ID tokens.

Never trust a UID supplied by a client without authentication verification.

Anonymous authentication should remain disabled unless deliberately enabled later.

---

# 9. SUBSCRIPTION SYSTEM

PathFinder AI Trader is subscription-based.

Never implement subscription access using only:

```text
isPremium = true
```

Use:

```text
User
 ↓
Subscription
 ↓
Entitlement
 ↓
Feature Access
```

Initial plans:

### FREE / TRIAL

Possible access:

- Basic market observation
- Limited Market Quality information
- Limited signals
- Limited history

### PREMIUM

Possible access:

- Full Market Quality
- AI signals
- Shadow Trading
- AI explanations
- AI Coach
- Advanced analytics
- Historical reports

### PRO

Possible access:

- Premium features
- Semi-Automatic Mode
- Automatic Mode when available
- Advanced risk controls
- Strategy Lab
- Multi-broker support
- Additional automation

Pricing must remain configuration-driven.

Possible subscription states:

- trialing
- active
- past_due
- paused
- cancelled
- expired

Potential entitlements:

```text
MARKET_OBSERVATION
MARKET_QUALITY
BASIC_SIGNALS
ADVANCED_SIGNALS
SHADOW_TRADING
AI_COACH
ADVANCED_ANALYTICS
STRATEGY_LAB
SEMI_AUTO_TRADING
AUTO_TRADING
MULTI_BROKER
```

Entitlement verification must happen on trusted backend infrastructure.

The client cannot grant itself paid access.

Payment provider integration will be added later.

Design it through an interface so providers such as Flutterwave or another suitable subscription processor can be implemented.

---

# 10. BROKER ARCHITECTURE

Never allow the AI Engine to directly depend on IQ Option.

Required conceptual flow:

```text
AI / Decision System
        ↓
Trading Orchestrator
        ↓
Risk Gate
        ↓
Broker Interface
        ↓
IQ Option Adapter
```

Define broker capabilities such as:

- connect
- disconnect
- connection health
- get account
- get balance
- get assets
- get candles
- get prices/ticks
- place eligible trade
- query trade result
- retrieve history

IQ Option must be implemented as an adapter.

Other brokers must be addable later.

Do not store broker passwords in Firestore.

Use secure secret handling.

Never commit account credentials.

---

# 11. MARKET DATA ENGINE

Create standardized broker-independent market data.

Support:

- ticks
- OHLC candles
- timestamps
- asset metadata
- timeframe
- market sessions
- feed status

Potential timeframes:

- 1s
- 5s
- 10s
- 15s
- 30s
- 1m
- 2m
- 5m
- 10m
- 15m
- 30m
- 1h
- 4h
- 1d

Validate:

- missing prices
- invalid timestamps
- duplicates
- out-of-order data
- malformed candles
- stale feeds

Consumers must not need to know whether market data came from:

- simulator
- replay
- IQ Option
- future broker

---

# 12. MARKET SIMULATOR

Maintain a simulator so the complete intelligence stack can operate without a live broker.

Support:

- synthetic ticks
- synthetic candles
- historical replay
- real-time playback
- accelerated playback
- pause
- resume
- restart
- stop

Suggested speeds:

- 1x
- 2x
- 5x
- 10x
- 50x
- 100x

Simulation results must never be mixed with real trading results.

---

# 13. OBSERVER ENGINE

The Observer Engine consumes market data.

It produces facts, not trades.

Track:

- current price
- previous price
- change
- rolling highs/lows
- higher highs
- higher lows
- lower highs
- lower lows
- equal highs/lows
- bullish/bearish/sideways tendency
- momentum
- acceleration/deceleration
- volatility
- noise
- structure
- session
- relevant support/resistance context

Never output BUY or SELL from Observer.

---

# 14. MARKET DNA

Create a structured description of current market behaviour.

Possible attributes:

- bullish
- bearish
- ranging
- trending
- calm
- volatile
- noisy
- clean
- weak
- strong
- breakout
- reversal
- continuation
- uncertain

Every eligible signal/trade should capture Market DNA so performance can later be compared against market environments.

---

# 15. MARKET QUALITY ENGINE

This engine answers:

> Is this market currently worth considering?

Generate a score from 0–100.

Possible components:

- trend strength
- momentum
- volatility suitability
- structure clarity
- support/resistance quality
- price stability
- market noise
- historical similarity
- session quality
- liquidity when reliable data exists
- signal agreement

Weights must be configurable.

Return:

- overall score
- grade
- component scores
- explanation
- timestamp
- market state

Possible non-directional states:

- OBSERVE
- WATCH
- READY

Never BUY or SELL.

---

# 16. CONFIDENCE ENGINE

Confidence is separate from Market Quality.

Market Quality asks:

> Is this environment good?

Confidence asks:

> How certain is the system about its analysis?

Confidence must:

- Provide component evidence.
- Include uncertainty.
- Consider sample size.
- Avoid false precision.
- Be calibrated against historical outcomes.

A displayed 90% confidence must not be interpreted as a guaranteed 90% win probability.

Build confidence calibration later using observed outcomes.

---

# 17. STRATEGY LAB

Strategies must be modular.

Potential initial research strategies:

- trend following
- momentum
- breakout
- reversal
- mean reversion
- price action
- support/resistance continuation

Do not assume any one strategy is profitable.

Strategy Lab must allow:

- enable
- disable
- simulate
- backtest
- compare
- rank
- version
- retire
- promote after validation

Live strategy changes must be versioned.

---

# 18. RISK ENGINE

Risk has veto power over every trade.

Implement:

- maximum risk per trade
- maximum daily loss
- maximum weekly loss
- maximum consecutive losses
- maximum trades/session
- maximum simultaneous exposure
- cooldown after losses
- abnormal volatility pause
- minimum Market Quality
- minimum Confidence
- emergency stop
- automatic trading kill switch
- Capital Protection Mode

No downstream component may bypass the Risk Engine.

---

# 19. CAPITAL PROTECTION MODE

Capital preservation takes priority over trading frequency.

Possible reasons for pause:

- daily loss threshold reached
- weekly drawdown reached
- repeated losses
- degraded market quality
- unexpected broker behaviour
- unstable connection
- abnormal volatility
- corrupted/stale market data
- model uncertainty
- system health problem

Capital Protection Mode must explain why trading was paused.

---

# 20. DECISION ENGINE

The Decision Engine combines:

- observations
- Market DNA
- Market Quality
- strategy evidence
- confidence
- historical similarity
- risk state

Possible decisions:

- NO_TRADE
- WAIT
- WATCH
- SIGNAL_CANDIDATE

Directional signals should only be generated after sufficient evidence.

Every decision must contain reasons.

Never trade merely because the market is open.

---

# 21. OPPORTUNITY RANKING

When multiple assets produce eligible opportunities:

Do not automatically choose the first one.

Rank candidates by relevant factors such as:

- Market Quality
- calibrated confidence
- strategy evidence
- risk suitability
- recent setup performance

Allow no opportunity to be selected if none passes thresholds.

---

# 22. SIGNAL ENGINE

A Signal should include:

- asset
- direction
- generated time
- expiry/window where applicable
- Market Quality
- Confidence
- strategy
- supporting evidence
- risk state
- explanation
- signal status

Potential statuses:

- generated
- presented
- accepted
- rejected
- ignored
- expired
- executed
- shadowed
- resolved

Signals are not guaranteed winners.

---

# 23. SHADOW TRADING

This is mandatory.

When a signal is presented but not executed:

Create a Shadow Trade.

Track what would have happened.

Store:

- original signal
- hypothetical entry
- direction
- timing
- expiry
- Market Quality
- Confidence
- Market DNA
- strategy
- simulated result
- would-have-won/lost
- hypothetical return

Shadow trades must remain clearly separated from real executions.

They feed learning and analytics.

---

# 24. TRADE OUTCOME TRACKING

The platform must determine whether:

- real trade won
- real trade lost
- shadow trade would have won
- shadow trade would have lost
- signal expired without execution
- trade result is unknown

Never silently drop unresolved signals.

---

# 25. LEARNING ENGINE

The Learning Engine learns from:

- wins
- losses
- shadow wins
- shadow losses
- rejected signals
- ignored signals
- market conditions
- strategy performance
- sessions
- confidence calibration
- false positives
- missed opportunities

Learning must NOT immediately rewrite live strategy parameters after every trade.

Use:

```text
Observation
   ↓
Evidence
   ↓
Learning Note
   ↓
Candidate Improvement
   ↓
Simulation / Backtest
   ↓
Validation
   ↓
New Strategy Version
   ↓
Possible Promotion
```

Maintain rollback capability.

---

# 26. MARKET MEMORY

Market Memory remembers historical contexts.

It should help answer questions like:

- Have we encountered a similar setup before?
- How did similar setups perform?
- Which strategy worked best?
- What was Market Quality?
- Which sessions were strongest?
- Were previous confidence estimates calibrated?

Do not let Market Memory become uncontrolled raw-data storage.

Store useful features and references.

---

# 27. AI VERSIONING

Track AI/model/configuration versions.

Record:

- version
- creation time
- configuration
- training/evaluation information
- benchmark result
- deployed status

A new version performing worse must be rejectable/rollbackable.

---

# 28. REPLAY ENGINE

Allow historical market conditions to be replayed through the same engines used by live/demo operation.

Use it for:

- debugging
- strategy evaluation
- AI evaluation
- trade replay
- signal review
- missed opportunities
- regression testing

Replay must never call a real broker execution endpoint.

---

# 29. AI COACH

AI Coach does not trade.

It explains.

Possible outputs:

- why a signal was generated
- why no trade was recommended
- why risk blocked a trade
- session summary
- missed opportunity analysis
- strategy strengths/weaknesses
- confidence calibration insights

It should help the user understand the system.

---

# 30. REPORTING

Support:

### Session Report

- markets observed
- signals generated
- trades executed
- shadow trades
- wins
- losses
- win rate
- drawdown
- best/worst strategy
- Market DNA performance

### Daily Report

Aggregate session performance.

### Weekly Report

Identify broader evidence and trends.

Always differentiate:

- real trading
- simulated trading
- shadow trading
- replay/backtesting

---

# 31. MOBILE APPLICATION

Flutter app should eventually contain:

- Splash
- Authentication
- Onboarding
- Subscription
- Home dashboard
- Market scanner
- Signal view
- Signal explanation
- Market Quality
- Broker connections
- Trade history
- Shadow trades
- Reports
- AI Coach
- Risk settings
- Trading mode
- Notifications
- Profile
- Emergency Stop

Mobile should work as the primary interface for users who trade from phones.

---

# 32. WEB DASHBOARD

React dashboard should support:

- account overview
- subscription
- analytics
- signal history
- trade history
- shadow-trade comparison
- Market Quality
- AI explanations
- session reports
- strategy performance
- broker status
- risk configuration
- AI version/evaluation information where appropriate

---

# 33. NOTIFICATIONS

Potential notifications:

- high-quality market detected
- signal generated
- approval requested
- signal expired
- trade opened
- trade closed
- trade won/lost
- shadow result available
- Capital Protection activated
- broker disconnected
- subscription expiring
- daily report ready

Never send misleading profit claims.

---

# 34. SECURITY

Never commit:

- passwords
- broker credentials
- payment secrets
- Firebase service-account JSON
- API secrets
- private keys
- session tokens

Use environment variables and secret managers.

Create `.env.example`.

Ensure `.env` is ignored.

Apply Firestore security rules.

Verify Firebase tokens server-side.

Implement authorization separately from authentication.

Sensitive trading actions require trusted backend verification.

Add audit logging for important actions.

---

# 35. AUDIT LOGGING

Audit important events such as:

- login
- subscription changes
- entitlement changes
- broker connection
- trading-mode change
- Auto Mode enable/disable
- trade approval
- trade execution
- emergency stop
- risk rejection
- strategy/version change

Audit records should be append-oriented.

---

# 36. TESTING

Maintain:

- unit tests
- integration tests
- simulator tests
- replay tests
- API tests
- entitlement tests
- risk tests
- strategy tests
- regression tests

Before any automatic broker execution is enabled, verify:

- Risk Engine cannot be bypassed.
- Auto Mode defaults to OFF.
- Demo mode works.
- Emergency Stop works.
- Trade-size limits work.
- Invalid data blocks decisions.
- Broker disconnect blocks execution.

---

# 37. CI

GitHub Actions should eventually run:

- Python lint/tests
- Flutter analysis/tests
- TypeScript lint/tests/build
- security checks where appropriate

Do not require paid infrastructure unnecessarily.

---

# 38. DEVELOPMENT STAGES

Codex should follow these stages.

Mark each in `docs/BUILD_STATUS.md`.

## Stage 1 — Product Foundation

- Monorepo
- Flutter shell
- React shell
- FastAPI
- shared architecture
- tests/lint
- CI
- docs
- backend health check

## Stage 2 — Authentication + Firebase

- Firebase integration
- auth
- token verification
- Firestore repositories
- security foundation
- user profile

## Stage 3 — Subscription + Entitlements

- plans
- subscriptions
- entitlements
- feature gate
- trial handling
- backend authorization
- subscription UI foundation

Do not integrate payment provider until credentials/provider are chosen.

## Stage 4 — Market Data

- standardized models
- validation
- candle/tick flow
- cache
- sessions/timeframes

## Stage 5 — Market Simulator + Replay Foundation

- simulated data
- historical playback
- deterministic testing

## Stage 6 — Observer Engine

Implement real observation logic.

## Stage 7 — Market Analyzer + Market DNA

Implement structured interpretation.

## Stage 8 — Market Quality Engine

Implement configurable 0–100 scoring.

## Stage 9 — Confidence Engine

Implement confidence model and calibration architecture.

## Stage 10 — Strategy Lab

Implement initial strategies and strategy comparison.

## Stage 11 — Risk + Capital Protection

Implement complete pre-trade gating.

## Stage 12 — Decision + Signal Engine

Generate explainable candidate signals.

## Stage 13 — Shadow Trading

Automatically track ignored/rejected eligible signals.

## Stage 14 — Analytics + Reporting

Real vs shadow vs simulation analytics.

## Stage 15 — Learning + Market Memory

Evidence-based learning pipeline.

## Stage 16 — AI Coach

Explain decisions and performance.

## Stage 17 — IQ Option DEMO Adapter

Research current integration method before implementation.

Implement through broker abstraction.

Never commit credentials.

DEMO ONLY.

## Stage 18 — Semi-Automatic Demo Trading

User approval required.

Risk gate required.

## Stage 19 — Automatic Demo Trading

Explicit opt-in.

Kill switch.

Risk controls.

Extensive logging.

## Stage 20 — Mobile Product Completion

Complete primary user experience.

## Stage 21 — Web Dashboard Completion

Complete administration/analytics experience.

## Stage 22 — Subscription Payments

Integrate selected provider securely.

Verify payments server-side.

## Stage 23 — Full System Evaluation

Simulator + replay + demo testing.

Measure actual results.

## Stage 24 — Production Hardening

Security

performance

monitoring

deployment

compliance review

documentation

---

# 39. BUILD STATUS DOCUMENT

Create:

`docs/BUILD_STATUS.md`

Format:

```text
Current Stage:
Status:

Completed:
- ...

Tests:
- ...

Known Issues:
- ...

Manual Actions Required:
- ...

Next Stage:
- ...
```

Update it after every major implementation.

---

# 40. CODEX AUTONOMOUS WORK RULE

Whenever Codex is asked to continue building:

1. Read this document.
2. Read `BUILD_STATUS.md`.
3. Inspect existing repository code.
4. Determine the next incomplete stage.
5. Do not rebuild completed working components unnecessarily.
6. Implement that stage.
7. Run tests/builds.
8. Fix errors.
9. Update documentation.
10. Update `BUILD_STATUS.md`.
11. Continue to the next stage if no external dependency blocks progress.

Codex should not ask the user to choose between minor implementation details that can be resolved using standard engineering judgment.

Ask only when the decision materially changes the product or requires credentials/account actions.

---

# 41. MANUAL BLOCKERS

Codex should stop and clearly report when it requires things such as:

- Firebase project credentials
- Google OAuth configuration
- payment-provider account
- payment keys
- IQ Option DEMO authentication
- domain
- signing certificates
- App Store/Play Store credentials
- legal/compliance decision

Do not fabricate credentials.

---

# 42. DEFINITION OF DONE

A development stage is not complete simply because files exist.

It is complete when:

- implementation exists
- relevant tests exist
- tests pass where environment permits
- code builds where environment permits
- documentation reflects reality
- no known critical errors remain
- `BUILD_STATUS.md` is updated

---

# 43. FINAL ENGINEERING RULE

Prefer a smaller amount of **working, tested code** over a huge amount of incomplete scaffolding.

Do not repeatedly create placeholder architecture instead of implementing features.

Once foundations are established, subsequent stages must increasingly contain executable implementation.

PathFinder AI Trader should always remain:

**Observable → Explainable → Testable → Risk-Controlled → Evidence-Driven.**