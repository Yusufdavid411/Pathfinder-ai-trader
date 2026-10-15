from typing import Protocol

from models.auth import AuthenticatedUser


class TokenVerificationError(Exception):
    """Raised when an ID token cannot be verified."""


class TokenVerifier(Protocol):
    def verify(self, token: str) -> AuthenticatedUser:
        """Verify an ID token and return the authenticated user."""


class FirebaseTokenVerifier:
    def __init__(self, project_id: str | None = None) -> None:
        self._project_id = project_id
        self._initialized = False

    def verify(self, token: str) -> AuthenticatedUser:
        if not token:
            raise TokenVerificationError("Missing Firebase ID token.")

        try:
            self._ensure_initialized()
            from firebase_admin import auth

            decoded = auth.verify_id_token(token, check_revoked=True)
        except Exception as exc:
            raise TokenVerificationError("Invalid Firebase ID token.") from exc

        uid = decoded.get("uid")
        if not uid:
            raise TokenVerificationError("Firebase token did not contain a UID.")

        return AuthenticatedUser(
            uid=uid,
            email=decoded.get("email"),
            display_name=decoded.get("name"),
            photo_url=decoded.get("picture"),
        )

    def _ensure_initialized(self) -> None:
        if self._initialized:
            return

        import firebase_admin

        if not firebase_admin._apps:
            options = {"projectId": self._project_id} if self._project_id else None
            firebase_admin.initialize_app(options=options)

        self._initialized = True
