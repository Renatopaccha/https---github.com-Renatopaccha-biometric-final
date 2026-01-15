/**
 * AI Assistant API service.
 * Handles communication with backend AI endpoints using JSON with Base64 attachments.
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp?: string;
}

export interface FileAttachment {
    name: string;
    mime_type: string;
    data: string; // Base64
}

export interface ChatRequest {
    session_id?: string;
    chat_id?: string;
    message: string;
    history: ChatMessage[];
    attachments?: FileAttachment[];
    files?: File[]; // For internal use, will be converted to attachments
}

export interface ChatResponse {
    success: boolean;
    response: string;
    chat_id?: string;
    session_context_used: boolean;
    files_processed: number;
    error?: string;
}

export interface ChatSession {
    id: string;
    title: string;
    timestamp: string;
    message_count: number;
    model: string;
}

export interface ChatHistoryResponse {
    chat_id: string;
    title: string;
    messages: ChatMessage[];
    created_at: string;
    updated_at: string;
}

export interface AIHealthResponse {
    configured: boolean;
    model: string;
    max_file_size_mb: number;
    temperature: number;
    status: 'ready' | 'missing_api_key';
}

/**
 * Convert File to Base64 FileAttachment.
 */
async function fileToBase64(file: File): Promise<FileAttachment> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            // Remove data URL prefix (e.g., "data:image/png;base64,")
            const base64 = result.split(',')[1];
            resolve({
                name: file.name,
                mime_type: file.type || 'application/octet-stream',
                data: base64
            });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Send a chat message to the AI assistant with optional file attachments.
 */
export async function sendChatMessage(payload: ChatRequest): Promise<ChatResponse> {
    try {
        // Convert files to Base64 attachments if present
        let attachments: FileAttachment[] = [];
        if (payload.files && payload.files.length > 0) {
            attachments = await Promise.all(
                payload.files.map(file => fileToBase64(file))
            );
        }

        const response = await fetch(`${API_URL}/api/v1/ai/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                session_id: payload.session_id,
                chat_id: payload.chat_id,
                message: payload.message,
                history: payload.history,
                attachments: attachments.length > 0 ? attachments : []
            }),
            signal: AbortSignal.timeout(60000) // 60 second timeout for complex analyses
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
 * List all chat sessions for a given data session.
 */
export async function listChatSessions(sessionId: string): Promise<ChatSession[]> {
    try {
        const response = await fetch(`${API_URL}/api/v1/ai/chats/${sessionId}`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('List chats error:', error);
        return [];
    }
}

/**
 * Get full chat history for a specific chat.
 */
export async function getChatHistory(sessionId: string, chatId: string): Promise<ChatHistoryResponse | null> {
    try {
        const response = await fetch(`${API_URL}/api/v1/ai/chats/${sessionId}/${chatId}`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Get chat history error:', error);
        return null;
    }
}

/**
 * Delete a specific chat.
 */
export async function deleteChat(sessionId: string, chatId: string): Promise<boolean> {
    try {
        const response = await fetch(`${API_URL}/api/v1/ai/chats/${sessionId}/${chatId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return true;
    } catch (error) {
        console.error('Delete chat error:', error);
        return false;
    }
}

/**
 * Update chat title.
 */
export async function updateChatTitle(sessionId: string, chatId: string, title: string): Promise<boolean> {
    try {
        const response = await fetch(`${API_URL}/api/v1/ai/chats/${sessionId}/${chatId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return true;
    } catch (error) {
        console.error('Update chat title error:', error);
        return false;
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
