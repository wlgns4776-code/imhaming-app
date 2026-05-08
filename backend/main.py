import asyncio
import os
import json
import httpx
from bs4 import BeautifulSoup
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict

app = FastAPI(title="Imhaming Music Sync API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.current_state: Dict = {
            "track": None,
            "lyrics": [],
            "currentLyricIndex": -1,
            "isPlaying": False
        }

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        # Send current state upon connection
        await websocket.send_json({"type": "SYNC_STATE", "payload": self.current_state})

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                pass

manager = ConnectionManager()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Handle state updates from the player controller
            if message.get("type") == "UPDATE_STATE":
                payload = message.get("payload", {})
                manager.current_state.update(payload)
                # Broadcast the updated state to all clients (including the overlay)
                await manager.broadcast({"type": "SYNC_STATE", "payload": manager.current_state})
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.get("/api/search")
async def search_music(q: str):
    """Search for music using Deezer API"""
    async with httpx.AsyncClient() as client:
        response = await client.get(f"https://api.deezer.com/search?q={q}")
        if response.status_code == 200:
            return response.json()
        raise HTTPException(status_code=response.status_code, detail="Failed to fetch music")

@app.get("/api/lyrics")
async def get_lyrics(artist: str, title: str):
    """
    Fetch lyrics. Since Genius API requires token and often doesn't give raw lyrics without scraping,
    we'll use a public API or a simple scraper logic. 
    Here using lyrics.ovh as a fallback public API.
    """
    async with httpx.AsyncClient() as client:
        # Fallback to public lyrics API
        try:
            res = await client.get(f"https://api.lyrics.ovh/v1/{artist}/{title}")
            if res.status_code == 200:
                data = res.json()
                lyrics_text = data.get("lyrics", "")
                # Clean up and split into lines
                lines = [line.strip() for line in lyrics_text.split('\n') if line.strip()]
                # Exclude the "Paroles de la chanson..." header if it exists
                if lines and "Paroles de la chanson" in lines[0]:
                    lines = lines[1:]
                return {"lyrics": lines}
        except Exception:
            pass
            
        return {"lyrics": ["가사를 찾을 수 없습니다.", "(수동으로 입력 가능합니다)"]}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
