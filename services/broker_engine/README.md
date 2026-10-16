# IQ Option Practice Execution Bridge

This local service connects Telegram approvals to the browser extension running
inside the logged-in IQ Option traderoom. It is not a simulator: a successful
receipt means the extension verified **Practice** mode and detected IQ Option
evidence of a newly opened position.

## Safety boundary

- Only signed `DEMO` commands with a `$1-$10` stake are accepted.
- The cloud queue cannot be claimed until a fresh Practice-tab heartbeat exists.
- The extension rechecks Practice mode immediately before clicking Higher/Lower.
- A Real or unverified account is fail-closed. Real execution is hard-locked.
- Passwords, OTPs, cookies, and session tokens stay in the user's browser.
- IQ Option does not publish a supported order API for this flow. The connector
  uses visible traderoom controls, so a traderoom redesign can require selector
  updates. Unknown controls cause a failure, not a guessed click.

## Start and check

From the repository root on Windows:

```powershell
powershell.exe -ExecutionPolicy Bypass -File scripts\start_demo_bridge.ps1
powershell.exe -ExecutionPolicy Bypass -File scripts\demo_bridge_status.ps1
```

The service binds only to `127.0.0.1:8765`. The ignored root `.env.local` file
supplies the Firebase bridge signing secret; it is never sent to the extension.

Stop it with:

```powershell
powershell.exe -ExecutionPolicy Bypass -File scripts\stop_demo_bridge.ps1
```

## Browser and Telegram test

1. Build the extension with `npm run build:extension`.
2. In Chrome, open `chrome://extensions`, enable Developer mode, choose **Load
   unpacked**, and select `browser/iq-option-reader`.
3. Sign in to IQ Option yourself, select the **Practice** account, and open the
   traderoom. The Pathfinder panel must say `READY` and show `PRACTICE`.
4. Start the local bridge. In Telegram use `/mode` → Demo, `/stake 1`, `/arm`,
   then `/scan`.
5. Press **Accept & Queue** on a current candidate. A success message is sent
   only after IQ Option exposes a success notice or a new open-position row.

If the receipt says the click was sent but could not be verified, inspect IQ
Option before retrying; the bridge deliberately avoids claiming uncertain
orders as successful.
