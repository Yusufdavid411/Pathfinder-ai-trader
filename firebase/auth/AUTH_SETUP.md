# Firebase Authentication Setup

Stage 2 requires Firebase Authentication to be configured manually in the Firebase Console before live auth can work.

Enable:

- Email/password.
- Google Sign-In.

Keep anonymous authentication disabled unless a later product decision explicitly enables it.

Backend API calls must use Firebase ID tokens from signed-in users. The API verifies those tokens server-side.
