from dataclasses import dataclass
import os


@dataclass(frozen=True)
class ApiSettings:
    firebase_project_id: str | None
    allowed_origins: list[str]

    @classmethod
    def from_environment(cls) -> "ApiSettings":
        raw_origins = os.getenv("PAT_API_ALLOWED_ORIGINS", "http://localhost:5173")
        allowed_origins = [
            origin.strip() for origin in raw_origins.split(",") if origin.strip()
        ]

        return cls(
            firebase_project_id=os.getenv("FIREBASE_PROJECT_ID"),
            allowed_origins=allowed_origins,
        )
