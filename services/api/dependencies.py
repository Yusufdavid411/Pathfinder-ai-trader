from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from models.auth import AuthenticatedUser
from repositories.user_profiles import UserProfileRepository
from security.firebase_auth import TokenVerificationError, TokenVerifier

bearer_scheme = HTTPBearer(auto_error=False)


def get_token_verifier(request: Request) -> TokenVerifier:
    return request.app.state.token_verifier


def get_user_profile_repository(request: Request) -> UserProfileRepository:
    return request.app.state.user_profile_repository


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    verifier: Annotated[TokenVerifier, Depends(get_token_verifier)],
) -> AuthenticatedUser:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bearer token is required.",
        )

    try:
        return verifier.verify(credentials.credentials)
    except TokenVerificationError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
        ) from exc
