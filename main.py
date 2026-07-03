# WaveBox API server
# Simple FastAPI backend that serves track data and the web player.

import json
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="WaveBox")

# Load the tracks once when the server starts.
# I kept them in a JSON file so I can add songs without editing Python code.
TRACKS_PATH = Path(__file__).parent / "tracks.json"
with open(TRACKS_PATH, encoding="utf-8") as f:
    TRACKS = json.load(f)


def find_track(track_id):
    """Look up one track by id. Returns None if it is not there."""
    for track in TRACKS:
        if track["id"] == track_id:
            return track
    return None


@app.get("/api/health")
def health():
    """Quick check that the server is running."""
    return {"ok": True, "tracks": len(TRACKS)}


@app.get("/api/tracks")
def list_tracks():
    """Send back every track in tracks.json."""
    return TRACKS


@app.get("/api/tracks/{track_id}")
def get_track(track_id: int):
    """Send back one track, or a 404 style error if the id is wrong."""
    track = find_track(track_id)
    if track:
        return track
    return {"error": "track not found"}


# Serve the CSS and JS files from the static folder.
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
def root():
    """Open the main page when someone visits the site root."""
    return FileResponse("static/index.html")
