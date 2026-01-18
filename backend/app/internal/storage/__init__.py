"""
Storage backend abstraction module.
Provides pluggable storage implementations for DataFrame session management.
"""

from app.internal.storage.backend import StorageBackend
from app.internal.storage.in_memory_backend import InMemoryBackend

__all__ = [
    "StorageBackend",
    "InMemoryBackend",
]
