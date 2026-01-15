"""
Pydantic schemas for AI Assistant endpoints.
Defines request/response models for chat interactions.
"""

from typing import List, Literal, Optional
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    """Single chat message in conversation history."""
    role: Literal["user", "assistant"]
    content: str
    timestamp: Optional[str] = None


class ChatRequest(BaseModel):
    """Request model for chat endpoint."""
    session_id: Optional[str] = Field(
        None,
        description="Session ID to retrieve DataFrame context"
    )
    message: str = Field(
        ...,
        min_length=1,
        description="User's message to the AI assistant"
    )
    history: List[ChatMessage] = Field(
        default_factory=list,
        description="Previous conversation history"
    )


class ChatResponse(BaseModel):
    """Response model for chat endpoint."""
    success: bool
    response: str = Field(
        ...,
        description="AI assistant's response"
    )
    session_context_used: bool = Field(
        default=False,
        description="Whether session DataFrame context was injected"
    )
    files_processed: int = Field(
        default=0,
        description="Number of uploaded files processed"
    )
    error: Optional[str] = Field(
        default=None,
        description="Error message if any"
    )
