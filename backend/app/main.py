# ============================================================================
# NEXUS BACKEND — FastAPI Application Entry Point
# ============================================================================
# This is the main file that creates and configures the FastAPI app.
#
# Run the server with:
#   cd newbackend
#   uvicorn app.main:app --reload --port 8000
#
# Then open: http://localhost:8000/docs  (Swagger UI)
# ============================================================================

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings


# ============================================================================
# LIFESPAN — Startup & Shutdown Logic
# ============================================================================
# FastAPI's "lifespan" is a modern way to run code when the server starts
# and when it shuts down. We use it to:
# 1. Create the data/ directory for SQLite
# 2. Initialize the database tables
# 3. Initialize the in-memory state manager
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Runs on server startup (before 'yield') and shutdown (after 'yield').
    """
    # ---- STARTUP ----
    print("🚀 Nexus Backend starting up...")

    # Create the data/ directory if it doesn't exist (for SQLite DB file)
    os.makedirs("data", exist_ok=True)
    print("📁 Data directory ready")

    # Initialize the database (create tables if they don't exist)
    from app.database import init_db
    await init_db()
    print("🗄️  Database initialized")

    # Initialize the in-memory state manager
    from app.state.state_manager import state_manager
    state_manager.initialize()
    print("🧠 State manager initialized")
    
    # Auto-load the most recent active event into state
    from app.database import get_db
    try:
        db = await get_db()
        cursor = await db.execute("SELECT * FROM events WHERE status != 'completed' ORDER BY created_at DESC LIMIT 1")
        row = await cursor.fetchone()
        if row:
            event = dict(row)
            state_manager.set_event(event)
            print(f"🔄 Auto-loaded latest active event: {event.get('name')}")
            
            # Load full context for the event
            from app.repository import get_participants, get_sessions, get_content_queue, get_approvals, get_agent_logs
            
            participants = await get_participants(event["id"])
            state_manager.set_participants(participants)
            
            schedule = await get_sessions(event["id"])
            state_manager.set_schedule(schedule)
            
            content = await get_content_queue(event["id"])
            state_manager.set_content_queue(content)
            
            approvals = await get_approvals(event["id"])
            for acc in approvals:
                state_manager.add_approval(acc)
                
            logs = await get_agent_logs(event["id"], limit=50)
            # Logs are prepended in memory, so we add them in reverse order to keep correct chronological sequence
            for log in reversed(logs):
                state_manager.add_activity({"agent": log["agent"], "action": log["action"], "details": log["details"], "timestamp": log["created_at"]})
                
            print(f"📊 Loaded {len(participants)} participants, {len(schedule)} sessions, {len(content)} content items, {len(approvals)} approvals")
    except Exception as e:
        print(f"⚠️ Failed to auto-load event on startup: {e}")

    print("✅ Nexus Backend is ready!")
    print(f"📖 API docs: http://localhost:{settings.PORT}/docs")

    # ---- Hand control to the running server ----
    yield

    # ---- SHUTDOWN ----
    print("👋 Nexus Backend shutting down...")
    # Close database connections
    from app.database import close_db
    await close_db()
    print("🗄️  Database connections closed")
    print("✅ Shutdown complete")


# ============================================================================
# CREATE THE FASTAPI APP
# ============================================================================

app = FastAPI(
    title="Nexus — Event Intelligence Platform",
    description=(
        "AI-powered event command center where autonomous specialist agents "
        "collaborate in real-time to handle event logistics. "
        "Built with FastAPI + LangGraph."
    ),
    version="1.0.0",
    lifespan=lifespan,
)


# ============================================================================
# CORS MIDDLEWARE
# ============================================================================
# Cross-Origin Resource Sharing — allows the React frontend (running on
# a different port, e.g. localhost:5173) to make API calls to this backend.
# Without this, the browser would block all frontend→backend requests.
# ============================================================================

app.add_middleware(
    CORSMiddleware,
    # Which origins (frontend URLs) are allowed to call this API
    allow_origins=settings.cors_origins_list,
    # Allow cookies and auth headers to be sent
    allow_credentials=True,
    # Allow all HTTP methods (GET, POST, PUT, DELETE, etc.)
    allow_methods=["*"],
    # Allow all headers (Content-Type, Authorization, etc.)
    allow_headers=["*"],
)


# ============================================================================
# MOUNT API ROUTERS
# ============================================================================
# Each router handles a specific resource/feature.
# They are all prefixed with /api so the frontend has a clean base URL.
# We import them here and mount them onto the main app.
# ============================================================================

from app.api.routes.events import router as events_router
from app.api.routes.upload import router as upload_router
from app.api.routes.agents import router as agents_router
from app.api.routes.schedule import router as schedule_router
from app.api.routes.content import router as content_router
from app.api.routes.approvals import router as approvals_router
from app.api.routes.activity import router as activity_router
from app.api.routes.dashboard import router as dashboard_router
from app.api.routes.mail import router as mail_router

# Mount all REST API routers under /api prefix
app.include_router(events_router, prefix="/api", tags=["Events"])
app.include_router(upload_router, prefix="/api", tags=["Upload"])
app.include_router(agents_router, prefix="/api", tags=["Agents"])
app.include_router(schedule_router, prefix="/api", tags=["Schedule"])
app.include_router(content_router, prefix="/api", tags=["Content"])
app.include_router(approvals_router, prefix="/api", tags=["Approvals"])
app.include_router(activity_router, prefix="/api", tags=["Activity"])
app.include_router(dashboard_router, prefix="/api", tags=["Dashboard"])
app.include_router(mail_router, prefix="/api", tags=["Mail"])


# ============================================================================
# WEBSOCKET ENDPOINT
# ============================================================================
# The WebSocket endpoint is mounted directly on the app (not on a router)
# because FastAPI handles WebSocket routes slightly differently.
# Frontend connects to: ws://localhost:8000/ws/stream
# ============================================================================

from app.api.websocket import websocket_endpoint

app.websocket("/ws/stream")(websocket_endpoint)


# ============================================================================
# HEALTH CHECK ENDPOINT
# ============================================================================
# Simple endpoint to verify the server is running.
# Visit: http://localhost:8000/health
# ============================================================================

@app.get("/health", tags=["Health"])
async def health_check():
    """
    Health check endpoint.
    Returns 200 OK if the server is running.
    Useful for monitoring and load balancer health probes.
    """
    return {
        "status": "healthy",
        "service": "nexus-backend",
        "version": "1.0.0",
    }
