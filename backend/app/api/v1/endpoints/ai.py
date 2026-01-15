"""
AI Assistant API endpoints.
Handles chat interactions with Google Gemini.
"""

from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
import json

from app.schemas.ai import ChatRequest, ChatResponse, ChatMessage
from app.services.ai_service import ai_service
from app.core.errors import BiometricException


router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat_with_ai(
    message: str = Form(..., description="User's message to the AI"),
    session_id: Optional[str] = Form(None, description="Optional session ID for context"),
    history: str = Form("[]", description="JSON string of conversation history"),
    files: List[UploadFile] = File(default=[], description="Optional file attachments")
) -> ChatResponse:
    """
    Chat with AI assistant with optional session context and file uploads.
    
    **Supported Files:**
    - Images: .png, .jpg, .jpeg (for analyzing charts/graphs)
    - Documents: .docx (for analyzing research documents)
    - Spreadsheets: .xlsx, .xls (for data analysis)
    
    **Context Injection:**
    If session_id is provided, the AI will have access to:
    - Column names and data types
    - Data preview (first 5 rows)
    - Basic descriptive statistics
    
    **Example Request (with curl):**
    ```bash
    curl -X POST "http://localhost:8000/api/v1/ai/chat" \\
      -F "message=¿Qué prueba estadística debo usar?" \\
      -F "session_id=your-session-id" \\
      -F "history=[]" \\
      -F "files=@chart.png"
    ```
    
    **Example Response:**
    ```json
    {
      "success": true,
      "response": "Basándome en tus datos...",
      "session_context_used": true,
      "files_processed": 1
    }
    ```
    """
    try:
        # Check if AI service is available
        if ai_service is None:
            raise HTTPException(
                status_code=503,
                detail="AI Assistant not configured. Please contact administrator to set GEMINI_API_KEY."
            )
        
        # Parse conversation history
        try:
            history_list = json.loads(history)
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=400,
                detail="Invalid history format. Must be valid JSON array."
            )
        
        # Validate history structure
        if not isinstance(history_list, list):
            raise HTTPException(
                status_code=400,
                detail="History must be an array of messages."
            )
        
        # Process uploaded files
        file_data = []
        if files:
            for file in files:
                # Read file content
                content = await file.read()
                file_data.append((content, file.filename or "unnamed_file"))
        
        # Call AI service
        result = await ai_service.chat(
            message=message,
            session_id=session_id,
            history=history_list,
            files=file_data if file_data else None
        )
        
        return ChatResponse(
            success=result["success"],
            response=result["response"],
            session_context_used=result["session_context_used"],
            files_processed=result["files_processed"],
            error=result.get("error")
        )
        
    except BiometricException as e:
        # Handle our custom exceptions
        return ChatResponse(
            success=False,
            response="Lo siento, no pude procesar tu solicitud.",
            session_context_used=False,
            files_processed=0,
            error=e.message
        )
    
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    
    except Exception as e:
        # Catch-all for unexpected errors
        return ChatResponse(
            success=False,
            response="Ocurrió un error inesperado. Por favor, intenta nuevamente.",
            session_context_used=False,
            files_processed=0,
            error=str(e)
        )


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
