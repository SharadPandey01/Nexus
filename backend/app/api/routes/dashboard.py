import json
import datetime
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

from app.repository import get_all_events
from app.state.state_manager import state_manager

router = APIRouter()

@router.get("/dashboard")
async def get_dashboard_data():
    """
    Returns high-level overview data for the active event.
    """
    # 1. First, check if there's an active event in the state manager
    event = state_manager.get_event()
    
    # 2. If not, fetch the most recent event from the database
    if not event:
        events = await get_all_events()
        if events:
            event = events[0]
        else:
            return None # Frontend will fallback
            
    # Parse config_json if it exists (DB stores as string, state manager might store as dict)
    config = event.get("config_json", "{}")
    if isinstance(config, str):
        try:
            config = json.loads(config)
        except:
            config = {}
            
    # Also handle state manager format which might just put it under 'config'
    if not config and "config" in event:
        config = event["config"]
        
    # Fetch real session metrics if event exists
    sessions = []
    if event.get("id"):
        from app.repository import get_sessions
        try:
            sessions = await get_sessions(event.get("id"))
        except:
            pass
            
    unique_speakers = len(set(s.get("speaker") for s in sessions if s.get("speaker") and s.get("speaker") != "—"))
    
    # Calculate days if missing from config
    days = config.get("duration_days")
    start_date, end_date = event.get("start_date"), event.get("end_date")
    if not days and start_date and end_date:
        try:
            d1 = datetime.datetime.fromisoformat(start_date.replace("Z", "+00:00"))
            d2 = datetime.datetime.fromisoformat(end_date.replace("Z", "+00:00"))
            days = max(1, (d2 - d1).days + 1)
        except:
            days = 1

    return {
        "id": event.get("id"),
        "name": event.get("name", "Unnamed Event"),
        "venue": event.get("location", "TBD"),
        "days": days or 1,
        "attendees": config.get("expected_attendees", 0),
        "sessions": len(sessions),
        "speakers": unique_speakers,
        "status": event.get("status", "planning"),
        "start_date": start_date,
        "end_date": end_date
    }

@router.get("/finance")
async def get_finance_data():
    """
    Returns the cached financial overview from Fortuna without invoking the LLM.
    """
    data = state_manager.get_finance_data()
    return {"status": "success", "finance_output": data}

@router.get("/insights")
async def get_insights_data():
    """
    Returns AI-generated insights based on the active event data.
    """
    event = state_manager.get_event()
    if not event:
        events = await get_all_events()
        if events:
            event = events[0]
        else:
            return []
            
    config = event.get("config_json", "{}")
    if isinstance(config, str):
        try:
            config = json.loads(config)
        except:
            config = {}
            
    if not config and "config" in event:
        config = event["config"]

    try:
        target_attendees = int(config.get("expected_attendees", 0) or 0)
    except:
        target_attendees = 0
    
    insights = []
    
    if target_attendees > 0:
        insights.append({
            "id": "ins-1",
            "type": "info",
            "title": "Registration Target",
            "desc": f"Your target is {target_attendees} attendees based on your prompt.",
            "action": "View Marketing Plan"
        })
        
    themes = config.get("themes", [])
    if themes and isinstance(themes, list):
        themes_str = ", ".join(str(t) for t in themes if t)
        if themes_str:
            insights.append({
                "id": "ins-2",
            "type": "success",
            "title": "Detected Themes",
            "desc": f"Our content generation will focus heavily on: {themes_str}",
            "action": ""
        })
        
    return insights
