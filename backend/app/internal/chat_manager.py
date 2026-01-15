"""
ChatManager: Persistent storage for AI chat conversations.
Manages chat sessions tied to data sessions with disk-based storage.

Storage Structure:
    - storage/sessions/{session_id}/chats/index.json - List of chats
    - storage/sessions/{session_id}/chats/{chat_id}.json - Chat messages
"""

import json
import uuid
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional
import threading

from app.core.errors import SessionNotFoundException


class ChatManager:
    """
    Manager for AI chat conversations with persistent storage.
    
    Each data session can have multiple chat conversations.
    Chats are stored as JSON files within the session directory.
    """
    
    _instance: Optional["ChatManager"] = None
    _lock: threading.Lock = threading.Lock()
    
    def __new__(cls) -> "ChatManager":
        """Ensure only one instance exists (Singleton pattern)."""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialize()
        return cls._instance
    
    def _initialize(self) -> None:
        """Initialize the chat manager."""
        # Get storage directory from DataManager structure
        backend_dir = Path(__file__).parent.parent.parent.resolve()
        self._storage_dir = backend_dir / "storage" / "sessions"
        self._chat_lock = threading.Lock()
        
        print(f"[DEBUG] ChatManager initialized")
    
    def _get_chats_dir(self, session_id: str) -> Path:
        """Get chats directory for a session."""
        return self._storage_dir / session_id / "chats"
    
    def _get_chat_index_path(self, session_id: str) -> Path:
        """Get path to chat index file."""
        return self._get_chats_dir(session_id) / "index.json"
    
    def _get_chat_path(self, session_id: str, chat_id: str) -> Path:
        """Get path to specific chat file."""
        return self._get_chats_dir(session_id) / f"{chat_id}.json"
    
    def _ensure_chats_dir(self, session_id: str) -> None:
        """Ensure chats directory exists."""
        chats_dir = self._get_chats_dir(session_id)
        chats_dir.mkdir(parents=True, exist_ok=True)
    
    def _load_index(self, session_id: str) -> List[Dict]:
        """Load chat index for a session."""
        index_path = self._get_chat_index_path(session_id)
        
        if not index_path.exists():
            return []
        
        with open(index_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def _save_index(self, session_id: str, index: List[Dict]) -> None:
        """Save chat index for a session."""
        self._ensure_chats_dir(session_id)
        index_path = self._get_chat_index_path(session_id)
        
        with open(index_path, 'w', encoding='utf-8') as f:
            json.dump(index, f, indent=2, ensure_ascii=False)
    
    def create_chat(self, session_id: str, title: Optional[str] = None) -> str:
        """
        Create a new chat session.
        
        Args:
            session_id: Parent data session ID
            title: Optional chat title (auto-generated if not provided)
            
        Returns:
            str: New chat ID
        """
        chat_id = str(uuid.uuid4())
        timestamp = datetime.now().isoformat()
        
        # Generate default title if not provided
        if not title:
            title = f"Nueva conversación"
        
        print(f"[DEBUG] Creating chat {chat_id} for session {session_id}")
        
        with self._chat_lock:
            # Initialize chat data
            chat_data = {
                "id": chat_id,
                "session_id": session_id,
                "title": title,
                "created_at": timestamp,
                "updated_at": timestamp,
                "messages": [],
                "model": "gemini-2.5-flash"
            }
            
            # Save chat file
            self._ensure_chats_dir(session_id)
            chat_path = self._get_chat_path(session_id, chat_id)
            
            with open(chat_path, 'w', encoding='utf-8') as f:
                json.dump(chat_data, f, indent=2, ensure_ascii=False)
            
            # Update index
            index = self._load_index(session_id)
            index.append({
                "id": chat_id,
                "title": title,
                "timestamp": timestamp,
                "message_count": 0,
                "model": "gemini-2.5-flash"
            })
            self._save_index(session_id, index)
        
        print(f"[DEBUG] ✓ Chat created: {chat_id}")
        return chat_id
    
    def save_message(
        self, 
        session_id: str, 
        chat_id: str, 
        role: str, 
        content: str
    ) -> None:
        """
        Save a message to a chat.
        
        Args:
            session_id: Parent data session ID
            chat_id: Chat ID
            role: Message role ('user' or 'assistant')
            content: Message content
        """
        print(f"[DEBUG] Saving message to chat {chat_id}")
        
        with self._chat_lock:
            chat_path = self._get_chat_path(session_id, chat_id)
            
            if not chat_path.exists():
                raise ValueError(f"Chat {chat_id} not found")
            
            # Load chat
            with open(chat_path, 'r', encoding='utf-8') as f:
                chat_data = json.load(f)
            
            # Add message
            message = {
                "role": role,
                "content": content,
                "timestamp": datetime.now().isoformat()
            }
            chat_data["messages"].append(message)
            chat_data["updated_at"] = datetime.now().isoformat()
            
            # Save chat
            with open(chat_path, 'w', encoding='utf-8') as f:
                json.dump(chat_data, f, indent=2, ensure_ascii=False)
            
            # Update index message count
            index = self._load_index(session_id)
            for chat_entry in index:
                if chat_entry["id"] == chat_id:
                    chat_entry["message_count"] = len(chat_data["messages"])
                    chat_entry["timestamp"] = chat_data["updated_at"]
                    break
            self._save_index(session_id, index)
    
    def get_chat_history(self, session_id: str, chat_id: str) -> List[Dict]:
        """
        Get full message history for a chat.
        
        Args:
            session_id: Parent data session ID
            chat_id: Chat ID
            
        Returns:
            List[Dict]: List of messages
        """
        chat_path = self._get_chat_path(session_id, chat_id)
        
        if not chat_path.exists():
            raise ValueError(f"Chat {chat_id} not found")
        
        with open(chat_path, 'r', encoding='utf-8') as f:
            chat_data = json.load(f)
        
        return chat_data.get("messages", [])
    
    def list_chats(self, session_id: str) -> List[Dict]:
        """
        List all chats for a session.
        
        Args:
            session_id: Parent data session ID
            
        Returns:
            List[Dict]: List of chat metadata
        """
        return self._load_index(session_id)
    
    def delete_chat(self, session_id: str, chat_id: str) -> bool:
        """
        Delete a chat.
        
        Args:
            session_id: Parent data session ID
            chat_id: Chat ID
            
        Returns:
            bool: True if deleted, False if not found
        """
        print(f"[DEBUG] Deleting chat {chat_id}")
        
        with self._chat_lock:
            chat_path = self._get_chat_path(session_id, chat_id)
            
            if not chat_path.exists():
                return False
            
            # Delete chat file
            chat_path.unlink()
            
            # Update index
            index = self._load_index(session_id)
            index = [chat for chat in index if chat["id"] != chat_id]
            self._save_index(session_id, index)
        
        print(f"[DEBUG] ✓ Chat deleted: {chat_id}")
        return True
    
    def update_chat_title(self, session_id: str, chat_id: str, new_title: str) -> None:
        """
        Update chat title.
        
        Args:
            session_id: Parent data session ID
            chat_id: Chat ID
            new_title: New title
        """
        print(f"[DEBUG] Updating title for chat {chat_id}")
        
        with self._chat_lock:
            chat_path = self._get_chat_path(session_id, chat_id)
            
            if not chat_path.exists():
                raise ValueError(f"Chat {chat_id} not found")
            
            # Update chat file
            with open(chat_path, 'r', encoding='utf-8') as f:
                chat_data = json.load(f)
            
            chat_data["title"] = new_title
            chat_data["updated_at"] = datetime.now().isoformat()
            
            with open(chat_path, 'w', encoding='utf-8') as f:
                json.dump(chat_data, f, indent=2, ensure_ascii=False)
            
            # Update index
            index = self._load_index(session_id)
            for chat_entry in index:
                if chat_entry["id"] == chat_id:
                    chat_entry["title"] = new_title
                    break
            self._save_index(session_id, index)
    
    def get_or_create_chat(self, session_id: str, chat_id: Optional[str] = None) -> str:
        """
        Get existing chat or create new one if chat_id is None.
        
        Args:
            session_id: Parent data session ID
            chat_id: Optional existing chat ID
            
        Returns:
            str: Chat ID (existing or new)
        """
        if chat_id:
            # Verify chat exists
            chat_path = self._get_chat_path(session_id, chat_id)
            if chat_path.exists():
                return chat_id
            else:
                print(f"[WARN] Chat {chat_id} not found, creating new chat")
        
        # Create new chat
        return self.create_chat(session_id)


# Global singleton instance
chat_manager = ChatManager()
