"""
AI Assistant API endpoints.
Handles chat interactions with Google Gemini with persistent storage.
"""

from typing import List, Optional
from fastapi import APIRouter, HTTPException

from app.schemas.ai import (
    ChatRequest, 
    ChatResponse, 
    ChatSession,
    ChatHistoryResponse,
    UpdateChatTitleRequest
)
from app.services.ai_service import ai_service
from app.internal.chat_manager import chat_manager
from app.core.errors import BiometricException


router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat_with_ai(request: ChatRequest) -> ChatResponse:
    """
    Chat with AI assistant using JSON with Base64 attachments.
    
    **Supported Files (Base64 encoded):**
    - Images: .png, .jpg, .jpeg
    - Documents: .docx, .pdf
    - Data: .xlsx, .xls, .csv
    
    **Context Injection:**
    If session_id is provided, the AI will have access to the active DataFrame.
    
    **Chat Persistence:**
    If chat_id is provided, messages will be saved to that conversation.
    If chat_id is omitted, a new chat will be created.
    
    **Example Request:**
    ```json
    {
      "session_id": "abc-123",
      "chat_id": "chat-456",
      "message": "¿Qué prueba estadística debo usar?",
      "history": [],
      "attachments": [
        {
          "name": "data.png",
          "mime_type": "image/png",
          "data": "base64string..."
        }
      ]
    }
    ```
    """
    try:
        # Check if AI service is available
        if ai_service is None:
            raise HTTPException(
                status_code=503,
                detail="AI Assistant not configured. Please set GEMINI_API_KEY."
            )
        
        # Get or create chat if session_id provided
        chat_id = None
        if request.session_id:
            chat_id = chat_manager.get_or_create_chat(
                request.session_id, 
                request.chat_id
            )
        
        # Log attachment info
        if request.attachments:
            print(f"[DEBUG] Received {len(request.attachments)} attachment(s):")
            for att in request.attachments:
                print(f"  - {att.name} ({att.mime_type}), Base64 size: {len(att.data)} chars")
        
        # Call AI service
        result = await ai_service.chat(
            message=request.message,
            session_id=request.session_id,
            history=request.history,
            attachments=request.attachments if request.attachments else None
        )
        
        # Save messages to chat history if we have a chat_id
        if chat_id and request.session_id:
            try:
                # Save user message
                chat_manager.save_message(
                    request.session_id,
                    chat_id,
                    "user",
                    request.message
                )
                
                # Save AI response
                chat_manager.save_message(
                    request.session_id,
                    chat_id,
                    "assistant",
                    result["response"]
                )
                
                # Auto-generate title from first message if it's a new chat
                if not request.chat_id and len(request.history) == 0:
                    # Extract first few words as title
                    title = request.message[:50]
                    if len(request.message) > 50:
                        title += "..."
                    chat_manager.update_chat_title(request.session_id, chat_id, title)
                    
            except Exception as e:
                print(f"[WARN] Failed to save chat history: {e}")
        
        return ChatResponse(
            success=result["success"],
            response=result["response"],
            chat_id=chat_id,
            session_context_used=result["session_context_used"],
            files_processed=result["files_processed"],
            error=result.get("error")
        )
        
    except BiometricException as e:
        # Return file processing errors to user
        print(f"[ERROR] BiometricException in chat endpoint: {e.message}")
        return ChatResponse(
            success=False,
            response=e.message,  # Return the specific error message
            session_context_used=False,
            files_processed=0,
            error=e.message
        )
    
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    
    except Exception as e:
        # Catch-all for unexpected errors
        print(f"[ERROR] Unexpected error in chat endpoint: {e}")
        return ChatResponse(
            success=False,
            response="Ocurrió un error inesperado. Por favor, intenta nuevamente.",
            session_context_used=False,
            files_processed=0,
            error=str(e)
        )


@router.get("/chats/{session_id}", response_model=List[ChatSession])
async def list_chat_sessions(session_id: str):
    """
    List all chat sessions for a given data session.
    
    Args:
        session_id: Data session ID
        
    Returns:
        List of chat session metadata
    """
    try:
        chats = chat_manager.list_chats(session_id)
        return chats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/chats/{session_id}/{chat_id}", response_model=ChatHistoryResponse)
async def get_chat_history(session_id: str, chat_id: str):
    """
    Get full message history for a specific chat.
    
    Args:
        session_id: Data session ID
        chat_id: Chat ID
        
    Returns:
        Chat metadata and full message history
    """
    try:
        messages = chat_manager.get_chat_history(session_id, chat_id)
        
        # Get chat metadata from index
        chats = chat_manager.list_chats(session_id)
        chat_meta = next((c for c in chats if c["id"] == chat_id), None)
        
        if not chat_meta:
            raise HTTPException(status_code=404, detail=f"Chat {chat_id} not found")
        
        return ChatHistoryResponse(
            chat_id=chat_id,
            title=chat_meta["title"],
            messages=messages,
            created_at=chat_meta["timestamp"],
            updated_at=chat_meta["timestamp"]
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/chats/{session_id}/{chat_id}")
async def delete_chat_session(session_id: str, chat_id: str):
    """
    Delete a specific chat session.
    
    Args:
        session_id: Data session ID
        chat_id: Chat ID
        
    Returns:
        Success message
    """
    try:
        deleted = chat_manager.delete_chat(session_id, chat_id)
        if not deleted:
            raise HTTPException(status_code=404, detail=f"Chat {chat_id} not found")
        return {"success": True, "message": "Chat deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/chats/{session_id}/{chat_id}")
async def update_chat_title(
    session_id: str, 
    chat_id: str, 
    body: UpdateChatTitleRequest
):
    """
    Update chat title.
    
    Args:
        session_id: Data session ID
        chat_id: Chat ID
        body: Request body with new title
        
    Returns:
        Success message
    """
    try:
        chat_manager.update_chat_title(session_id, chat_id, body.title)
        return {"success": True, "message": "Title updated successfully"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/interpret-table")
async def interpret_smart_table(
    payload: dict
):
    """
    Recibe el objeto de estadísticas (JSON) y devuelve la interpretación IA.
    
    Payload esperado: { "stats": {...}, "segment": "General" }
    
    Returns:
        Interpretación narrativa en formato Markdown
    """
    try:
        # Check if AI service is available
        if ai_service is None:
            raise HTTPException(
                status_code=503,
                detail="AI Assistant not configured. Please set GEMINI_API_KEY."
            )
        
        stats = payload.get("stats")
        segment = payload.get("segment", "General")
        
        if not stats:
            raise HTTPException(status_code=400, detail="No se enviaron estadísticas")

        # Llamamos al método que interpreta las estadísticas
        interpretation = await ai_service.interpret_statistics(stats, segment)
        
        return {"interpretation": interpretation}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health", tags=["Health"])
async def ai_health_check():
    """
    Check if AI service is properly configured.
    
    Returns:
        Configuration status and model information
    """
    from app.core.config import settings
    
    return {
        "configured": bool(settings.gemini_api_key),
        "model": settings.gemini_model,
        "max_file_size_mb": settings.max_ai_file_size_mb,
        "temperature": settings.ai_temperature,
        "status": "ready" if settings.gemini_api_key else "missing_api_key"
    }
