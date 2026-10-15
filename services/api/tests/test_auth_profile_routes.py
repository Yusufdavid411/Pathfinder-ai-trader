from fastapi.testclient import TestClient

from main import create_app
from models.auth import AuthenticatedUser
from repositories.user_profiles import InMemoryUserProfileRepository
from security.firebase_auth import TokenVerificationError


class FakeTokenVerifier:
    def verify(self, token: str) -> AuthenticatedUser:
        if token != "valid-token":
            raise TokenVerificationError("bad token")

        return AuthenticatedUser(
            uid="user_123",
            email="trader@example.com",
            display_name="Demo Trader",
            photo_url="https://example.com/avatar.png",
        )


def create_client() -> TestClient:
    app = create_app(
        token_verifier=FakeTokenVerifier(),
        user_profile_repository=InMemoryUserProfileRepository(),
    )
    return TestClient(app)


def test_profile_requires_bearer_token() -> None:
    client = create_client()

    response = client.get("/v1/me")

    assert response.status_code == 401
    assert response.json()["detail"] == "Bearer token is required."


def test_profile_rejects_invalid_token() -> None:
    client = create_client()

    response = client.get(
        "/v1/me",
        headers={"Authorization": "Bearer invalid-token"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid authentication token."


def test_profile_is_created_from_verified_token_claims() -> None:
    client = create_client()

    response = client.get(
        "/v1/me",
        headers={"Authorization": "Bearer valid-token"},
    )

    assert response.status_code == 200
    assert response.json()["uid"] == "user_123"
    assert response.json()["email"] == "trader@example.com"
    assert response.json()["display_name"] == "Demo Trader"


def test_profile_update_cannot_spoof_uid_or_email() -> None:
    client = create_client()

    response = client.patch(
        "/v1/me",
        headers={"Authorization": "Bearer valid-token"},
        json={
            "uid": "attacker",
            "email": "attacker@example.com",
            "display_name": "Updated Name",
            "photo_url": "https://example.com/updated.png",
        },
    )

    body = response.json()

    assert response.status_code == 200
    assert body["uid"] == "user_123"
    assert body["email"] == "trader@example.com"
    assert body["display_name"] == "Updated Name"
    assert body["photo_url"] == "https://example.com/updated.png"
