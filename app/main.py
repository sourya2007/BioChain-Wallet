import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.routes import router
from app.core.config import settings


app = FastAPI(title=settings.app_name, version=settings.app_version)
app.include_router(router, prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
FRONTEND_DIST_DIR = BASE_DIR.parent / "frontend" / "dist"
IS_VERCEL = bool(os.environ.get("VERCEL"))
WEB_DIR = STATIC_DIR if IS_VERCEL else (FRONTEND_DIST_DIR if FRONTEND_DIST_DIR.exists() else STATIC_DIR)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
app.mount("/assets", StaticFiles(directory=WEB_DIR / "assets", check_dir=False), name="assets")


@app.get("/")
def root_frontend() -> FileResponse:
    return FileResponse(WEB_DIR / "index.html")


@app.get("/health")
def healthcheck():
    return {"status": "ok", "service": settings.app_name, "version": settings.app_version}


@app.get("/frontend", include_in_schema=False)
def frontend() -> FileResponse:
    return FileResponse(WEB_DIR / "index.html")
