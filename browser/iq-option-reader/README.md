# Pathfinder IQ Option Practice Connector

This Manifest V3 Chromium extension runs only on IQ Option HTTPS pages. It
connects to the local bridge at `127.0.0.1:8765` and handles one signed,
Telegram-approved Practice order at a time.

The extension verifies visible Practice-account evidence, current asset,
investment amount, expiry, and Higher/Lower controls. It blocks Real or
unverified modes. After an approved click it reports success only when IQ Option
shows a new open-position row or a positive platform notification.

It does not read passwords, OTPs, cookies, local storage, WebSocket traffic, or
private APIs. The only extra host permission is the loopback bridge URL.

## Load it in Chrome

```powershell
npm run build:extension
```

Then open `chrome://extensions`, enable Developer mode, choose **Load unpacked**,
and select this directory. Reload it after rebuilding.

Sign in on IQ Option manually and select **Practice**. The bottom-right panel
shows detected account mode, asset, control readiness, bridge connection, and
the active execution state. Do not arm Telegram until it says `READY`.
