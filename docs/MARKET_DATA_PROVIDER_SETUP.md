# Market Data Provider Setup

PAT's Telegram scanner is wired to a market-data provider interface and an Alpha
Vantage FX intraday adapter.

## Current Providers

- Primary provider slot: Twelve Data
- Primary endpoint family: `time_series`
- Primary Firebase secret: `TWELVE_DATA_API_KEY`
- Secondary provider slot: Alpha Vantage
- Secondary endpoint family: `FX_INTRADAY`
- Secondary Firebase secret: `ALPHA_VANTAGE_API_KEY`

## Current Provider Status

- Alpha Vantage key is stored in Firebase Secret Manager.
- Alpha Vantage returned that `FX_INTRADAY` is a premium endpoint for this key.
- Twelve Data key is stored in Firebase Secret Manager.
- Twelve Data returned 30 live EUR/USD 1-minute candles during verification.
- Firebase webhook has been redeployed with the latest Twelve Data secret
  version.

## Required Manual Step

No manual provider setup is currently required for Twelve Data. Alternative:
upgrade Alpha Vantage so `FX_INTRADAY` is unlocked:

```text
https://www.alphavantage.co/support/#api-key
```

Then update Firebase Secret Manager:

```powershell
"your-api-key" | firebase.cmd functions:secrets:set ALPHA_VANTAGE_API_KEY --project pathfinder-ai-trader
firebase.cmd deploy --only functions --project pathfinder-ai-trader --force
```

Do not commit the API key to Git.

## Scanner Behavior

After the API key is active, `/scan` will:

- Pull live FX intraday candles.
- Evaluate the configured currency pairs.
- Rank candidate setups by signal strength.
- Return a Telegram manual-review trade card.
- Keep direct Real-account execution disabled; accepted candidates may enter
  the signed IQ Option Practice connector queue only when the local extension
  reports a verified Practice tab.

The scanner must not claim guaranteed accuracy. It can produce candidate trade
ideas only from real market data and only for manual review.
