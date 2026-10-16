# Firebase

Firebase project configuration for `pathfinder-ai-trader`.

- Cloud Functions host the Telegram webhook, command-menu sync, and protected
  Demo bridge endpoints.
- Firestore stores backend-owned candidates, trading controls, signed execution
  requests, and bridge heartbeat state.
- Firestore rules deny all client access to the trading collections.
- Telegram and market-provider credentials are stored in Firebase Secret
  Manager, never in source control.

Deploy from the repository root:

```powershell
firebase.cmd deploy --only functions,firestore:rules --project pathfinder-ai-trader --force
```

Real IQ Option execution is not enabled by this deployment.
