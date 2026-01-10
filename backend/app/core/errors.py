"""
Custom exception classes and error handlers for the application.
Provides centralized error handling with standardized responses.
"""

from typing import Any, Dict
from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse


class BiometricException(Exception):
    """Base exception class for Biometric application."""
    
    def __init__(self, message: str, status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class SessionNotFoundException(BiometricException):
    """Raised when a session ID is not found."""
    
    def __init__(self, session_id: str):
        super().__init__(
            message=f"Session '{session_id}' not found or expired",
            status_code=status.HTTP_404_NOT_FOUND
        )


class InvalidColumnError(BiometricException):
    """Raised when specified column does not exist or is invalid."""
    
    def __init__(self, column_name: str, available_columns: list):
        super().__init__(
            message=f"Column '{column_name}' not found. Available columns: {available_columns}",
            status_code=status.HTTP_400_BAD_REQUEST
        )


class NonNumericColumnError(BiometricException):
    """Raised when a numeric operation is attempted on non-numeric column."""
    
    def __init__(self, column_name: str):
        super().__init__(
            message=f"Column '{column_name}' is not numeric. Statistical operations require numeric data.",
            status_code=status.HTTP_400_BAD_REQUEST
        )


class FileProcessingError(BiometricException):
    """Raised when file processing fails."""
    
    def __init__(self, filename: str, reason: str):
        super().__init__(
            message=f"Failed to process file '{filename}': {reason}",
            status_code=status.HTTP_400_BAD_REQUEST
        )


async def biometric_exception_handler(request: Request, exc: BiometricException) -> JSONResponse:
    """
    Global handler for BiometricException and its subclasses.
    
    Args:
        request: The incoming request
        exc: The raised exception
        
    Returns:
        JSONResponse with error details
    """
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.__class__.__name__,
            "message": exc.message,
            "path": str(request.url),
        }
    )


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """
    Custom handler for HTTPException to maintain consistent error format.
    
    Args:
        request: The incoming request
        exc: The raised HTTPException
        
    Returns:
        JSONResponse with error details
    """
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": "HTTPException",
            "message": exc.detail,
            "path": str(request.url),
        }
    )


async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Catch-all handler for unexpected exceptions.
    
    Args:
        request: The incoming request
        exc: The raised exception
        
    Returns:
        JSONResponse with generic error message
    """
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "InternalServerError",
            "message": "An unexpected error occurred. Please try again later.",
            "path": str(request.url),
        }
    )
