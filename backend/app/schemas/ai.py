"""
Pydantic schemas for AI Assistant endpoints.
Defines request/response models for chat interactions with file attachment support.
"""

from typing import List, Literal, Optional
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    """Single chat message in conversation history."""
    role: Literal["user", "assistant"]
    content: str
    timestamp: Optional[str] = None


class FileAttachment(BaseModel):
    """File attachment in Base64 format."""
    name: str = Field(..., description="Original filename")
    mime_type: str = Field(..., description="MIME type (e.g., 'image/png')")
    data: str = Field(..., description="Base64-encoded file content")


class ChatRequest(BaseModel):
    """Request model for chat endpoint."""
    session_id: Optional[str] = Field(
        None,
        description="Session ID to retrieve DataFrame context"
    )
    chat_id: Optional[str] = Field(
        None,
        description="Chat ID for conversation continuity"
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
    attachments: List[FileAttachment] = Field(
        default_factory=list,
        description="File attachments in Base64 format"
    )


class ChatResponse(BaseModel):
    """Response model for chat endpoint."""
    success: bool
    response: str = Field(
        ...,
        description="AI assistant's response"
    )
    chat_id: Optional[str] = Field(
        None,
        description="Chat ID for this conversation"
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


class ChatSession(BaseModel):
    """Chat session metadata."""
    id: str
    title: str
    timestamp: str
    message_count: int
    model: str = "gemini-2.5-flash"


class ChatHistoryResponse(BaseModel):
    """Response for chat history endpoint."""
    chat_id: str
    title: str
    messages: List[ChatMessage]
    created_at: str
    updated_at: str


class UpdateChatTitleRequest(BaseModel):
    """Request to update chat title."""
    title: str = Field(..., min_length=1, max_length=200)

