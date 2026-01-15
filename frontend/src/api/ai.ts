/**
 * AI Assistant API service.
 * Handles communication with backend AI endpoints.
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp?: string;
}

export interface ChatRequest {
    session_id?: string;
    message: string;
    history: ChatMessage[];
    files?: File[];
}

export interface ChatResponse {
    success: boolean;
    response: string;
    session_context_used: boolean;
    files_processed: number;
    error?: string;
}

export interface AIHealthResponse {
    configured: boolean;
    model: string;
    max_file_size_mb: number;
    temperature: number;
    status: 'ready' | 'missing_api_key';
}

/**
 * Send a chat message to the AI assistant with optional file attachments.
 */
export async function sendChatMessage(payload: ChatRequest): Promise<ChatResponse> {
    try {
        const formData = new FormData();

        formData.append('message', payload.message);

        if (payload.session_id) {
            formData.append('session_id', payload.session_id);
        }

        // Convert history to JSON string
        formData.append('history', JSON.stringify(payload.history));

        // Attach files if present
        if (payload.files && payload.files.length > 0) {
            payload.files.forEach((file) => {
                formData.append('files', file);
            });
        }

        const response = await fetch(`${API_URL}/api/v1/ai/chat`, {
            method: 'POST',
            body: formData,
            // Don't set Content-Type header - browser will set it with boundary for multipart/form-data
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(errorData.detail || `HTTP ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('AI chat error:', error);

        return {
            success: false,
            response: 'No se pudo conectar con el asistente AI. Verifica tu conexión.',
            session_context_used: false,
            files_processed: 0,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Check AI service health and configuration status.
 */
export async function checkAIHealth(): Promise<AIHealthResponse> {
    try {
        const response = await fetch(`${API_URL}/api/v1/ai/health`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('AI health check error:', error);

        return {
            configured: false,
            model: 'unknown',
            max_file_size_mb: 20,
            temperature: 0.7,
            status: 'missing_api_key'
        };
    }
}
