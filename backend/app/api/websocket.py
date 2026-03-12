# ============================================================================
# NEXUS BACKEND — WebSocket Manager
# ============================================================================
# Manages WebSocket connections for real-time communication with the frontend.
#
# The WebSocket is the "nervous system" of Nexus — it pushes real-time
# updates to the frontend whenever agents do something:
# - Agent starts/stops working
# - Inter-agent messages
# - Approval requests
# - State updates (schedule changed, new content, etc.)
#
# Frontend connects to: ws://localhost:8000/ws/stream
#
# Usage from anywhere in the backend:
#   from app.api.websocket import manager
#   await manager.broadcast({"type": "agent_status", "data": {...}})
# ============================================================================

import json
from typing import Dict, List, Any
from datetime import datetime
from fastapi import WebSocket, WebSocketDisconnect


class ConnectionManager:
    """
    WebSocket connection manager.
    
    Handles multiple simultaneous frontend connections.
    Provides methods to:
    - Accept new connections
    - Remove disconnected clients
    - Broadcast messages to ALL connected clients
    - Send messages to a SPECIFIC client
    """

    def __init__(self):
        """Initialize with an empty list of active connections."""
        # List of currently connected WebSocket clients
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        """
        Accept a new WebSocket connection and add it to active connections.
        
        Args:
            websocket: The incoming WebSocket connection from a frontend client
        """
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"🔌 WebSocket connected. Active connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        """
        Remove a disconnected WebSocket from the active connections list.
        
        Args:
            websocket: The disconnected WebSocket client
        """
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        print(f"🔌 WebSocket disconnected. Active connections: {len(self.active_connections)}")

    async def broadcast(self, message: Dict[str, Any]):
        """
        Send a message to ALL connected WebSocket clients.
        
        This is the most common method — used to push agent activity,
        state updates, and approval requests to every connected frontend.
        
        Args:
            message: Dictionary to send as JSON. Should have a "type" field.
        """
        # Add timestamp if not present
        if "timestamp" not in message:
            message["timestamp"] = datetime.now().isoformat()

        # Convert to JSON string
        message_json = json.dumps(message, default=str)

        # Send to all connected clients, removing any that have disconnected
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message_json)
            except Exception:
                # Client disconnected — mark for removal
                disconnected.append(connection)

        # Clean up disconnected clients
        for conn in disconnected:
            self.disconnect(conn)

    async def send_to_client(self, websocket: WebSocket, message: Dict[str, Any]):
        """
        Send a message to a SPECIFIC WebSocket client.
        
        Used for client-specific responses (e.g., confirming their request).
        
        Args:
            websocket: The specific client to send to
            message: Dictionary to send as JSON
        """
        if "timestamp" not in message:
            message["timestamp"] = datetime.now().isoformat()

        try:
            await websocket.send_text(json.dumps(message, default=str))
        except Exception:
            self.disconnect(websocket)

    # ========================================================================
    # CONVENIENCE METHODS — Pre-formatted message types
    # ========================================================================
    # These create properly structured messages matching the WebSocket
    # protocol defined in doc4 (Section 4.7).
    # ========================================================================

    async def send_agent_status(self, agent: str, status: str, task: str = ""):
        """
        Broadcast an agent status update.
        
        Example: Agent starts working on a task.
        
        Args:
            agent: Agent name (chronos, hermes, apollo, athena)
            status: Current status (working, done, idle, error)
            task: Description of what the agent is doing
        """
        await self.broadcast({
            "type": "agent_status",
            "data": {
                "agent": agent,
                "status": status,
                "task": task,
            }
        })

    async def send_agent_complete(self, agent: str, result: Dict[str, Any]):
        """
        Broadcast that an agent completed its task.
        
        Args:
            agent: Agent name
            result: The agent's output/result data
        """
        await self.broadcast({
            "type": "agent_complete",
            "data": {
                "agent": agent,
                "result": result,
            }
        })

    async def send_agent_message(self, from_agent: str, to_agent: str, content: str):
        """
        Broadcast an inter-agent message (visible in activity panel).
        
        This is what makes the multi-agent system feel alive — the organizer
        can watch agents "talking" to each other.
        
        Args:
            from_agent: Sending agent name
            to_agent: Receiving agent name
            content: Message content
        """
        await self.broadcast({
            "type": "agent_message",
            "data": {
                "from": from_agent,
                "to": to_agent,
                "content": content,
            }
        })

    async def send_approval_request(self, items: List[Dict[str, Any]]):
        """
        Broadcast approval request(s) to the frontend.
        
        The frontend will display these as approval cards with
        Approve/Edit/Reject buttons.
        
        Args:
            items: List of approval item dicts
        """
        await self.broadcast({
            "type": "approval_request",
            "data": {
                "items": items,
            }
        })

    async def send_state_update(self, field: str, action: str, data: Any = None):
        """
        Broadcast a state update notification.
        
        Tells the frontend that a specific piece of state has changed
        so it can refresh the relevant UI component.
        
        Args:
            field: Which state field changed (schedule, participants, content, etc.)
            action: What happened (created, updated, deleted)
            data: Optional data payload
        """
        await self.broadcast({
            "type": "state_update",
            "data": {
                "field": field,
                "action": action,
                "data": data,
            }
        })

    async def send_error(self, agent: str, error: str, details: str = ""):
        """
        Broadcast an error message.
        
        Args:
            agent: Which agent encountered the error
            error: Error message
            details: Additional error details
        """
        await self.broadcast({
            "type": "error",
            "data": {
                "agent": agent,
                "error": error,
                "details": details,
            }
        })


# ============================================================================
# GLOBAL CONNECTION MANAGER INSTANCE
# ============================================================================
# Import this anywhere: from app.api.websocket import manager
# ============================================================================
manager = ConnectionManager()


# ============================================================================
# WEBSOCKET ENDPOINT HANDLER
# ============================================================================
# This function is mounted on the FastAPI app in main.py as:
#   app.websocket("/ws/stream")(websocket_endpoint)
#
# It keeps the WebSocket connection alive, listening for messages
# from the frontend (e.g., ping/pong, client requests).
# ============================================================================

async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint handler.
    
    Accepts the connection, then enters a loop listening for messages.
    If the client disconnects, cleans up the connection.
    
    Frontend connects to: ws://localhost:8000/ws/stream
    """
    # Accept the connection
    await manager.connect(websocket)

    try:
        # Keep the connection alive and listen for client messages
        while True:
            # Wait for a message from the frontend
            data = await websocket.receive_text()

            try:
                # Parse the incoming message
                message = json.loads(data)
                msg_type = message.get("type", "unknown")

                # Handle different message types from the frontend
                if msg_type == "ping":
                    # Simple keepalive — respond with pong
                    await manager.send_to_client(websocket, {"type": "pong"})

                elif msg_type == "subscribe":
                    # Client wants to subscribe to specific event updates
                    # (for future use — currently all clients get all updates)
                    await manager.send_to_client(websocket, {
                        "type": "subscribed",
                        "data": {"message": "Connected to Nexus real-time stream"}
                    })

                else:
                    # Unknown message type — log it
                    print(f"⚠️  Unknown WebSocket message type: {msg_type}")

            except json.JSONDecodeError:
                # Client sent invalid JSON
                await manager.send_to_client(websocket, {
                    "type": "error",
                    "data": {"error": "Invalid JSON message"}
                })

    except WebSocketDisconnect:
        # Client disconnected (closed browser tab, etc.)
        manager.disconnect(websocket)
