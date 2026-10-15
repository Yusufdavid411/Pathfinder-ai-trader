# Firestore

This folder defines PAT's Firestore schema, indexes, and client security rules.

Current backend-owned collections include Telegram scanner candidates under
`signals/{signalId}`. Direct client access to signal documents is denied; the
Firebase Admin-backed webhook is the only current writer.

See `SCHEMA.md` for fields and lifecycle states.
