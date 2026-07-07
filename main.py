# WaveBox API server
# FastAPI backend — track data, login, and the web player.

import json
import re
import secrets
from pathlib import Path

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from passlib.context import CryptContext
from pydantic import BaseModel

app = FastAPI(title="WaveBox")
pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

BASE = Path(__file__).parent
DATA_DIR = BASE / "data"
USERS_PATH = DATA_DIR / "users.json"
TRACKS_PATH = BASE / "tracks.json"
USERNAME_RE = re.compile(r"^[a-zA-Z0-9_]{3,20}$")

DATA_DIR.mkdir(exist_ok=True)

# In-memory sessions: token -> username (fine for local demo).
sessions = {}


class LoginBody(BaseModel):
    username: str
    password: str


class RegisterBody(BaseModel):
    username: str
    password: str
    display_name: str | None = None


def load_json(path, default):
    if not path.exists():
        return default
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def load_users():
    users = load_json(USERS_PATH, {})
    if not users:
        users = {
            "demo": {
                "display_name": "Demo User",
                "password_hash": pwd.hash("demo123"),
            }
        }
        save_json(USERS_PATH, users)
    return users


def verify_user(username, password):
    record = USERS.get(username)
    if not record or not pwd.verify(password, record["password_hash"]):
        return None
    return record["display_name"]


USERS = load_users()

with open(TRACKS_PATH, encoding="utf-8") as f:
    TRACKS = json.load(f)


def find_track(track_id):
    """Look up one track by id. Returns None if it is not there."""
    for track in TRACKS:
        if track["id"] == track_id:
            return track
    return None


def get_token(authorization: str | None = Header(default=None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="not logged in")
    token = authorization[7:].strip()
    username = sessions.get(token)
    if not username:
        raise HTTPException(status_code=401, detail="session expired")
    return token


def get_current_user(token: str = Depends(get_token)):
    return sessions[token]


@app.get("/api/health")
def health():
    """Quick check that the server is running."""
    return {"ok": True, "tracks": len(TRACKS)}


@app.post("/api/auth/register")
def register(body: RegisterBody):
    username = body.username.strip().lower()
    password = body.password
    display_name = (body.display_name or username).strip()[:32]

    if not USERNAME_RE.match(username):
        raise HTTPException(status_code=400, detail="username must be 3-20 letters, numbers, or underscores")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="password must be at least 6 characters")
    if username in USERS:
        raise HTTPException(status_code=409, detail="username already taken")

    USERS[username] = {
        "display_name": display_name or username,
        "password_hash": pwd.hash(password),
    }
    save_json(USERS_PATH, USERS)

    token = secrets.token_urlsafe(32)
    sessions[token] = username

    return {
        "ok": True,
        "token": token,
        "username": username,
        "display_name": USERS[username]["display_name"],
    }


@app.post("/api/auth/login")
def login(body: LoginBody):
    username = body.username.strip().lower()
    password = body.password

    display_name = verify_user(username, password)
    if not display_name:
        raise HTTPException(status_code=401, detail="invalid username or password")

    token = secrets.token_urlsafe(32)
    sessions[token] = username

    return {
        "ok": True,
        "token": token,
        "username": username,
        "display_name": display_name,
    }


@app.post("/api/auth/logout")
def logout(token: str = Depends(get_token)):
    sessions.pop(token, None)
    return {"ok": True}


@app.get("/api/auth/me")
def me(username: str = Depends(get_current_user)):
    record = USERS.get(username, {})
    return {
        "ok": True,
        "username": username,
        "display_name": record.get("display_name", username),
    }


@app.get("/api/tracks")
def list_tracks(username: str = Depends(get_current_user)):
    """Send back every track — requires login."""
    return TRACKS


@app.get("/api/tracks/{track_id}")
def get_track(track_id: int, username: str = Depends(get_current_user)):
    """Send back one track, or an error object if the id is wrong."""
    track = find_track(track_id)
    if track:
        return track
    return {"error": "track not found"}


app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/login")
def login_page():
    """Login / register page."""
    return FileResponse("static/login.html")


@app.get("/")
def root():
    """Album library page."""
    return FileResponse("static/index.html")


@app.get("/player")
def player_page():
    """Full player page."""
    return FileResponse("static/player.html")
