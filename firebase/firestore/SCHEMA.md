# Firestore Schema Foundation

Initial Stage 2 collection:

## `users/{uid}`

- `uid` - Firebase Auth UID. Must match the document ID.
- `email` - Email from verified Firebase token claims.
- `display_name` - User-editable display name.
- `photo_url` - User-editable profile image URL.
- `created_at` - Profile creation timestamp.
- `updated_at` - Last profile update timestamp.

Additional collections from the master guide will be introduced in later stages.
