import os
import sys
import json
import uuid
import sqlite3
import datetime
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List

# Add workspace path for imports
sys.path.append(os.path.abspath("."))
from agent_orchestrator import run_adk_orchestration, RAG_AVAILABLE, ACTIVE_MODE

app = FastAPI(
    title="KathaGemma Multi-Agent Orchestration API",
    description="Unified Python backend serving persistent states and agent graph endpoints.",
    version="1.1.0"
)

# Enable CORS (Cross-Origin Resource Sharing)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows React frontend on local ports
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount the illustration images directory as static files
IMAGES_DIR = "./dataset/barkha_images"
if os.path.exists(IMAGES_DIR):
    app.mount("/images", StaticFiles(directory=IMAGES_DIR), name="images")
    print(f"Mounted illustration images directory '{IMAGES_DIR}' on /images")
else:
    print(f"Warning: Images directory '{IMAGES_DIR}' not found. Serving without static illustrations.")

# ─── SQLITE DATABASE PERSISTENCE LAYER ───────────────────────────────────────
DB_PATH = "./dataset/kathagemma_data.db"
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    # child profile table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS child (
        id TEXT PRIMARY KEY,
        name TEXT,
        age INTEGER,
        avatar TEXT,
        language TEXT,
        xp INTEGER DEFAULT 0,
        streak INTEGER DEFAULT 0,
        current_level INTEGER DEFAULT 1
    )
    """)
    # stories table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS story (
        id TEXT PRIMARY KEY,
        child_id TEXT,
        title TEXT,
        prompt TEXT,
        language TEXT,
        generated_story TEXT, -- JSON array of strings (chapters)
        choices TEXT,         -- JSON array of choices
        status TEXT DEFAULT 'STARTED',
        ui_action TEXT,
        expected_input TEXT,
        created_at TEXT
    )
    """)
    # Ensure columns exist for existing databases
    try:
        cursor.execute("ALTER TABLE story ADD COLUMN ui_action TEXT")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE story ADD COLUMN expected_input TEXT")
    except sqlite3.OperationalError:
        pass

    # voice history table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS voice_history (
        id TEXT PRIMARY KEY,
        child_id TEXT,
        transcript TEXT,
        ai_response TEXT,
        duration INTEGER,
        created_at TEXT
    )
    """)
    # achievements table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS achievement (
        id TEXT PRIMARY KEY,
        child_id TEXT,
        badge_name TEXT,
        description TEXT,
        icon TEXT,
        unlocked_at TEXT
    )
    """)
    conn.commit()
    conn.close()

init_db()

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def get_or_create_child(child_id: str):
    conn = get_db_connection()
    # Pre-populate 5 standard children profiles
    standard_children = [
        ("11111111-2222-3333-4444-555555555555", "Aarav", 5, "Panda", "English", 450, 6, 1),
        ("22222222-2222-3333-4444-555555555555", "Leo", 6, "Fox", "English", 350, 5, 1),
        ("33333333-2222-3333-4444-555555555555", "Meera", 5, "Elephant", "English", 120, 2, 1),
        ("44444444-2222-3333-4444-555555555555", "Raju", 7, "Parrot", "English", 580, 8, 2),
        ("55555555-2222-3333-4444-555555555555", "Mili", 6, "Panda", "English", 0, 0, 1)
    ]
    for cid, name, age, avatar, lang, xp, streak, lvl in standard_children:
        exists = conn.execute("SELECT 1 FROM child WHERE id = ?", (cid,)).fetchone()
        if not exists:
            conn.execute("""
            INSERT INTO child (id, name, age, avatar, language, xp, streak, current_level)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (cid, name, age, avatar, lang, xp, streak, lvl))
    conn.commit()

    child = conn.execute("SELECT * FROM child WHERE id = ?", (child_id,)).fetchone()
    if not child:
        conn.execute("""
        INSERT INTO child (id, name, age, avatar, language, xp, streak, current_level)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (child_id, "Aarav", 5, "Panda", "English", 450, 6, 1))
        conn.commit()
        child = conn.execute("SELECT * FROM child WHERE id = ?", (child_id,)).fetchone()
    conn.close()
    return dict(child)

# ─── DATA MODELS FOR ENDPOINTS ───────────────────────────────────────────────

class TelemetryRequest(BaseModel):
    user_input: str
    vision_input: Optional[str] = ""
    session_id: str = "s1"
    user_id: str = "child_1"
    child_profile: Optional[Dict[str, Any]] = {
        "child_name": "Leo",
        "age": 6,
        "difficulty_profile": "standard",
        "language_framework": "English"
    }

class StoryStartRequest(BaseModel):
    childId: str
    language: str
    prompt: str

class StoryContinueRequest(BaseModel):
    storyId: str
    choice: str

class VoiceChatRequest(BaseModel):
    childId: str
    transcript: str
    language: str
    storyId: Optional[str] = None

class CameraMissionRequest(BaseModel):
    childId: str
    language: str

class CameraAnalyzeRequest(BaseModel):
    childId: str
    missionId: str
    imageUrl: str

# BASE_URL config for image endpoint rewrites
BASE_URL = os.environ.get("BASE_URL", "http://localhost:8000")

# Helper to rewrite local illustration paths to serving HTTP URLs
def rewrite_image_url(response_json: Dict[str, Any]) -> Dict[str, Any]:
    ui_params = response_json.get("ui_params", {})
    local_path = ui_params.get("illustration_image")
    if local_path and local_path != "None":
        normalized_path = local_path.replace("\\", "/")
        if "dataset/barkha_images/" in normalized_path:
            rel_path = normalized_path.split("dataset/barkha_images/")[1]
            response_json["ui_params"]["illustration_image"] = f"{BASE_URL}/images/{rel_path}"
    return response_json

# ─── API ROUTING ENDPOINTS ───────────────────────────────────────────────────

@app.post("/api/orchestrate")
def orchestrate_turn(request: TelemetryRequest):
    """Backwards compatible endpoint for the dashboard view."""
    try:
        result = run_adk_orchestration(
            user_input=request.user_input,
            vision_input=request.vision_input,
            session_id=request.session_id,
            user_id=request.user_id,
            child_profile=request.child_profile
        )
        response_json = rewrite_image_url(result["response"])
        return {
            "response": response_json,
            "session_state": result["state"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ─── STORY ENDPOINTS ─────────────────────────────────────────────────────────

@app.post("/api/story/start")
def start_story(request: StoryStartRequest):
    try:
        story_id = str(uuid.uuid4())
        # Warmup profile check
        child = get_or_create_child(request.childId)
        child_name = child.get("name", "Leo")
        child_age = child.get("age", 6)
        
        # Run orchestrator to begin
        result = run_adk_orchestration(
            user_input=request.prompt,
            vision_input="",
            session_id=story_id,
            user_id=request.childId,
            child_profile={
                "child_name": child_name,
                "age": child_age,
                "difficulty_profile": "standard",
                "language_framework": request.language
            }
        )
        
        response_json = rewrite_image_url(result["response"])
        spoken = response_json.get("spoken_text", "Once upon a time in a magical land...")
        book_title = result.get("state", {}).get("current_story", "Sparky's Magic Forest")
        if book_title == "None" or not book_title:
            book_title = "Sparky's Magic Forest"
            
        raw_choices = response_json.get("ui_params", {}).get("choices", [])
        if not raw_choices:
            raw_choices = ["Look for footprints", "Follow the glowing butterfly", "Ask Sparky the fox"]
            
        choices = [{"id": f"choice_{idx}", "text": val} for idx, val in enumerate(raw_choices)]
        
        # Store in SQLite
        conn = get_db_connection()
        conn.execute("""
        INSERT INTO story (id, child_id, title, prompt, language, generated_story, choices, status, ui_action, expected_input, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            story_id,
            request.childId,
            book_title,
            request.prompt,
            request.language,
            json.dumps([spoken]),
            json.dumps(choices),
            "STARTED",
            response_json.get("ui_action"),
            response_json.get("expected_input"),
            datetime.datetime.now().isoformat()
        ))
        conn.commit()
        conn.close()
        
        return {
            "success": True,
            "data": {
                "storyId": story_id,
                "title": book_title,
                "story": [spoken],
                "choices": choices,
                "uiAction": response_json.get("ui_action"),
                "expectedInput": response_json.get("expected_input"),
                "createdAt": datetime.datetime.now().isoformat()
            }
        }
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/story/continue")
def continue_story(request: StoryContinueRequest):
    try:
        conn = get_db_connection()
        story = conn.execute("SELECT * FROM story WHERE id = ?", (request.storyId,)).fetchone()
        if not story:
            raise HTTPException(status_code=404, detail="Story not found")
        story = dict(story)
        
        chapters = json.loads(story["generated_story"])
        
        # Run orchestrator to progress
        child = get_or_create_child(story["child_id"])
        child_name = child.get("name", "Leo")
        child_age = child.get("age", 6)
        
        result = run_adk_orchestration(
            user_input=request.choice,
            vision_input="",
            session_id=request.storyId,
            user_id=story["child_id"],
            child_profile={
                "child_name": child_name,
                "age": child_age,
                "difficulty_profile": "standard",
                "language_framework": story["language"]
            }
        )
        
        response_json = rewrite_image_url(result["response"])
        spoken = response_json.get("spoken_text", "The adventure continues...")
        
        # Check if completed
        chapters.append(spoken)
        status = "STARTED"
        next_choices = []
        
        if len(chapters) >= 5:
            status = "COMPLETED"
            # Add completion XP and badge
            conn.execute("UPDATE child SET xp = xp + 100 WHERE id = ?", (story["child_id"],))
            conn.execute("""
            INSERT INTO achievement (id, child_id, badge_name, description, icon, unlocked_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """, (str(uuid.uuid4()), story["child_id"], "Book Worm", f"Completed reading '{story['title']}'", "book", datetime.datetime.now().isoformat()))
        else:
            raw_choices = response_json.get("ui_params", {}).get("choices", [])
            if not raw_choices:
                raw_choices = ["Go deeper into the cave", "Rest near the river", "Continue walking"]
            next_choices = [{"id": f"choice_{idx}", "text": val} for idx, val in enumerate(raw_choices)]
            
        conn.execute("""
        UPDATE story 
        SET generated_story = ?, choices = ?, status = ?, ui_action = ?, expected_input = ?
        WHERE id = ?
        """, (
            json.dumps(chapters),
            json.dumps(next_choices),
            status,
            response_json.get("ui_action"),
            response_json.get("expected_input"),
            request.storyId
        ))
        conn.commit()
        conn.close()
        
        return {
            "success": True,
            "data": {
                "id": request.storyId,
                "title": story["title"],
                "prompt": story["prompt"],
                "language": story["language"],
                "generatedStory": chapters,
                "choices": next_choices if status != "COMPLETED" else [],
                "uiAction": response_json.get("ui_action"),
                "expectedInput": response_json.get("expected_input"),
                "difficulty": "EASY",
                "status": status,
                "createdAt": story["created_at"]
            }
        }
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/story/{storyId}")
def get_story(storyId: str):
    conn = get_db_connection()
    story = conn.execute("SELECT * FROM story WHERE id = ?", (storyId,)).fetchone()
    conn.close()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    story = dict(story)
    return {
        "success": True,
        "data": {
            "id": story["id"],
            "childId": story["child_id"],
            "title": story["title"],
            "prompt": story["prompt"],
            "language": story["language"],
            "generatedStory": json.loads(story["generated_story"]),
            "choices": json.loads(story["choices"]),
            "uiAction": story.get("ui_action"),
            "expectedInput": story.get("expected_input"),
            "difficulty": "EASY",
            "status": story["status"],
            "createdAt": story["created_at"]
        }
    }

@app.get("/api/story/child/{childId}")
def get_child_stories(childId: str):
    conn = get_db_connection()
    stories = conn.execute("SELECT * FROM story WHERE child_id = ? ORDER BY created_at DESC", (childId,)).fetchall()
    conn.close()
    data = []
    for s in stories:
        s = dict(s)
        data.append({
            "id": s["id"],
            "childId": s["child_id"],
            "title": s["title"],
            "prompt": s["prompt"],
            "language": s["language"],
            "generatedStory": json.loads(s["generated_story"]),
            "choices": json.loads(s["choices"]),
            "difficulty": "EASY",
            "status": s["status"],
            "createdAt": s["created_at"]
        })
    return {
        "success": True,
        "data": data
    }

@app.get("/api/story/child/{childId}/profile")
def get_child_profile(childId: str):
    child = get_or_create_child(childId)
    conn = get_db_connection()
    achievements = conn.execute("SELECT * FROM achievement WHERE child_id = ?", (childId,)).fetchall()
    stories_count = conn.execute("SELECT COUNT(*) FROM story WHERE child_id = ?", (childId,)).fetchone()[0]
    conn.close()
    
    return {
        "success": True,
        "data": {
            "name": child["name"],
            "age": child["age"],
            "avatar": child["avatar"],
            "xp": child["xp"],
            "streak": child["streak"],
            "currentLevel": child["current_level"],
            "achievements": [
                {
                    "id": a["id"],
                    "childId": a["child_id"],
                    "badgeName": a["badge_name"],
                    "description": a["description"],
                    "icon": a["icon"],
                    "unlockedAt": a["unlocked_at"]
                }
                for a in achievements
            ],
            "storiesCount": stories_count
        }
    }

@app.post("/api/story/child/{childId}/reset")
def reset_child_progress(childId: str):
    conn = get_db_connection()
    conn.execute("DELETE FROM story WHERE child_id = ?", (childId,))
    conn.execute("DELETE FROM voice_history WHERE child_id = ?", (childId,))
    conn.execute("DELETE FROM achievement WHERE child_id = ?", (childId,))
    conn.execute("UPDATE child SET xp = 0, streak = 0, current_level = 1 WHERE id = ?", (childId,))
    conn.commit()
    conn.close()
    return get_child_profile(childId)

@app.delete("/api/story/{storyId}")
def delete_story(storyId: str):
    conn = get_db_connection()
    conn.execute("DELETE FROM story WHERE id = ?", (storyId,))
    conn.commit()
    conn.close()
    return {"success": True}

# ─── VOICE ENDPOINTS ─────────────────────────────────────────────────────────

@app.post("/api/voice/chat")
def voice_chat(request: VoiceChatRequest):
    try:
        # Run orchestrator
        child = get_or_create_child(request.childId)
        child_name = child.get("name", "Leo")
        child_age = child.get("age", 6)
        
        result = run_adk_orchestration(
            user_input=request.transcript,
            vision_input="",
            session_id=request.storyId or "voice_chat_session",
            user_id=request.childId,
            child_profile={
                "child_name": child_name,
                "age": child_age,
                "difficulty_profile": "standard",
                "language_framework": request.language
            }
        )
        response_json = result["response"]
        reply = response_json.get("spoken_text", "That sounds like a fun adventure!")
        
        # Save voice log
        conn = get_db_connection()
        conn.execute("""
        INSERT INTO voice_history (id, child_id, transcript, ai_response, duration, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """, (
            str(uuid.uuid4()),
            request.childId,
            request.transcript,
            reply,
            max(2, len(request.transcript) // 5),
            datetime.datetime.now().isoformat()
        ))
        conn.commit()
        conn.close()
        
        return {
            "success": True,
            "reply": reply,
            "timestamp": datetime.datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/voice/history/{childId}")
def get_voice_history(childId: str):
    conn = get_db_connection()
    logs = conn.execute("SELECT * FROM voice_history WHERE child_id = ? ORDER BY created_at DESC", (childId,)).fetchall()
    conn.close()
    return {
        "success": True,
        "data": [dict(l) for l in logs]
    }

@app.delete("/api/voice/history/{childId}")
def delete_voice_history(childId: str):
    conn = get_db_connection()
    conn.execute("DELETE FROM voice_history WHERE child_id = ?", (childId,))
    conn.commit()
    conn.close()
    return {"success": True}

# ─── CAMERA / SENSOR ENDPOINTS ───────────────────────────────────────────────

@app.post("/api/camera/mission")
def get_camera_mission(request: CameraMissionRequest):
    return {
        "success": True,
        "mission": {
            "title": "Color Spotter!",
            "instruction": "Katha spotted a green forest leaf in the story! Can you find something green (e.g. leaf, block) in your room and show it to the camera?",
            "targetColor": "green",
            "targetObject": "green leaf"
        }
    }

@app.post("/api/camera/analyze")
def camera_analyze(request: CameraAnalyzeRequest):
    target = request.missionId
    matched = True
    confidence = 0.92
    reward_xp = 50
    badge = "Nature Spotter"
    explanation = f"Great spot! That is indeed a {target}!"
    
    # Verify if active Gemini vision is present to run check
    if ACTIVE_MODE and "," in request.imageUrl:
        try:
            from langchain_core.messages import HumanMessage
            from langchain_google_genai import ChatGoogleGenerativeAI
            vision_llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", google_api_key=os.environ.get("GEMINI_API_KEY"))
            message = HumanMessage(
                content=[
                    {"type": "text", "text": f"Is there a '{target}' visible in this picture? Answer only YES or NO."},
                    {"type": "image_url", "image_url": request.imageUrl}
                ]
            )
            res = vision_llm.invoke([message])
            matched = "YES" in res.content.upper()
            if not matched:
                confidence = 0.30
                reward_xp = 10
                badge = None
                explanation = f"Hmm, that doesn't look like a {target}. Try showing it closer to the camera!"
        except Exception as e:
            print(f"Gemini Vision check failed: {e}")
            
    # Update XP and achievements in SQLite
    conn = get_db_connection()
    if matched:
        conn.execute("UPDATE child SET xp = xp + ? WHERE id = ?", (reward_xp, request.childId))
        if badge:
            conn.execute("""
            INSERT INTO achievement (id, child_id, badge_name, description, icon, unlocked_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """, (str(uuid.uuid4()), request.childId, badge, f"Showed a {target} to the camera", "camera", datetime.datetime.now().isoformat()))
    conn.commit()
    conn.close()
    
    return {
        "success": True,
        "matched": matched,
        "confidence": confidence,
        "rewardXP": reward_xp,
        "badge": badge,
        "explanation": explanation
    }

@app.get("/api/camera/history/{childId}")
def get_completed_missions(childId: str):
    conn = get_db_connection()
    achievements = conn.execute("SELECT * FROM achievement WHERE child_id = ? AND icon = 'camera'", (childId,)).fetchall()
    conn.close()
    return {
        "success": True,
        "data": [
            {
                "id": a["id"],
                "badgeName": a["badge_name"],
                "description": a["description"],
                "icon": a["icon"],
                "unlockedAt": a["unlocked_at"]
            }
            for a in achievements
        ]
    }

# ─── FRONTEND STATIC SERVING MOUNTS ──────────────────────────────────────────
REACT_DIST_DIR = "./KathaGemmaUI/frontend/dist"
if os.path.exists(REACT_DIST_DIR):
    app.mount("/", StaticFiles(directory=REACT_DIST_DIR, html=True), name="react_frontend")
    print(f"Mounted built React frontend from '{REACT_DIST_DIR}' on /")
else:
    @app.get("/", response_class=HTMLResponse)
    def read_root():
        index_path = os.path.join("frontend", "index.html")
        if os.path.exists(index_path):
            with open(index_path, "r", encoding="utf-8") as f:
                return HTMLResponse(content=f.read())
        return HTMLResponse(content="<h1>KathaGemma API is online!</h1>")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
