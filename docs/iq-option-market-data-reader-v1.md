# IQ Option Market Data Reader V1

## What was added and where it fits

V1 establishes this deliberately disconnected path:

`IQ Option traderoom DOM → browser collector → normalized snapshot → local debug panel`

The browser package owns collection and the normalized contract. The broker
adapter can later receive snapshots and presents the existing provider interface
to the Market Engine. No transport to that adapter exists yet, and neither the AI
Engine nor an execution component is connected.

## Security and privacy boundary

The collector only calls DOM APIs on the visible traderoom page. It does not read
cookies or browser storage, inspect network/WebSocket traffic, capture credentials
or OTPs, reverse-engineer authentication, bypass security, or expose any trading,
payment, deposit, or withdrawal action. The manifest declares no extension API
permissions; its content-script scope is limited to IQ Option HTTPS pages. It
does not persist or transmit data. Parsing failures produce null/`unknown` values
and a clean console error rather than inferred data.

## Desktop testing

1. Run `npm test` and `npm run lint` from the repository root.
2. Run `npm run build:extension`, open Chromium's extension developer mode, and
   load `browser/iq-option-reader` as an unpacked extension. The committed bundle
   is ready to use; rebuilding keeps it synchronized after source changes.
3. Open the IQ Option traderoom and compare every non-null panel field with the
   visible UI. Treat any mismatch as a parser defect. Values absent from the DOM
   must remain null/`unknown`.

## Android phone testing

1. Clone or copy this repository to the phone (Termux is suitable) and run
   `npm test` to verify normalization and parsing independently of IQ Option.
2. Use an Android Chromium-derived browser that explicitly supports developer
   extensions or a userscript manager. Android Chrome itself does **not** provide
   an unpacked-extension installation UI.
3. Run `npm run build:extension`, then load the `browser/iq-option-reader` folder
   through the browser's extension developer mode. Do not grant extra permissions.
4. Sign in normally on IQ Option (the reader never handles the sign-in), open the
   traderoom, and compare the bottom-right Pathfinder panel against the visible
   asset, price, payout, interval, mode, and expiry controls. Leave the page open
   to confirm `live` becomes `stale` when visible source values stop changing and
   `unavailable` when supported DOM values are absent.

## Current limitations and next milestone

IQ Option can change its DOM, and V1 intentionally recognizes only conservative
`data-test`/`data-testid` hooks. Market type is only recognized when its visible
asset label explicitly says OTC or Normal. Trading mode likewise requires an
explicit Binary or Blitz label. The timer parser accepts only simple `s`, `m`, or
`h` labels. Candle/OHLC data is **not claimed or collected** because no safe DOM
source has been verified. Static values can make freshness conservative.

Next, manually validate and document stable visible selectors on supported
traderoom versions, add fixture-based tests for those verified DOM shapes, and
add an explicit local-only message transport to the broker adapter. Security
review must precede that transport; AI and trade execution remain out of scope.
