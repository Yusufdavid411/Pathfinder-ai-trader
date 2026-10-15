from fastapi import FastAPI

from routers.health import router as health_router

app = FastAPI(
    title="PathFinder AI Engine",
    version="0.1.0",
    description="Foundation shell only. No AI or trading logic is implemented.",
)

app.include_router(health_router)
