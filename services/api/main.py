from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import ApiSettings
from repositories.user_profiles import InMemoryUserProfileRepository
from routers.health import router as health_router
from routers.me import router as me_router
from security.firebase_auth import FirebaseTokenVerifier


def create_app(
    *,
    settings: ApiSettings | None = None,
    token_verifier: FirebaseTokenVerifier | None = None,
    user_profile_repository: InMemoryUserProfileRepository | None = None,
) -> FastAPI:
    api_settings = settings or ApiSettings.from_environment()

    app = FastAPI(
        title="PathFinder API",
        version="0.1.0",
        description="Trusted backend boundary for PAT clients.",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=api_settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.state.token_verifier = token_verifier or FirebaseTokenVerifier(
        project_id=api_settings.firebase_project_id
    )
    app.state.user_profile_repository = (
        user_profile_repository or InMemoryUserProfileRepository()
    )

    app.include_router(health_router)
    app.include_router(me_router)

    return app


app = create_app()
