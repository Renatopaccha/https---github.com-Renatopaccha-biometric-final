import { useState, useCallback } from 'react';
import { sendChatMessage, ChatMessage as APIChatMessage, ChatResponse } from '../api/ai';
import { useDataContext } from '../context/DataContext';

// Extended message type with ID for UI
interface ChatMessage extends APIChatMessage {
    id: string;
}

interface UseAIChatReturn {
    messages: ChatMessage[];
    isLoading: boolean;
    error: string | null;
    sendMessage: (content: string, files?: File[]) => Promise<void>;
    clearChat: () => void;
    retryLastMessage: () => Promise<void>;
}

/**
 * Custom hook for managing AI chat interactions.
 * 
 * Features:
 * - Automatic session context injection from DataContext
 * - Optimistic UI updates
 * - Error handling and retry logic
 * - Message history management
 * 
 * @example
 * const { messages, isLoading, sendMessage, clearChat } = useAIChat();
 */
export function useAIChat(): UseAIChatReturn {
    const { sessionId } = useDataContext();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUserMessage, setLastUserMessage] = useState<{
        content: string;
        files?: File[];
    } | null>(null);

    const sendMessage = useCallback(async (content: string, files?: File[]) => {
        if (!content.trim() && (!files || files.length === 0)) {
            return;
        }

        // Store for retry functionality
        setLastUserMessage({ content, files });
        setError(null);

        // Create user message
        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: files && files.length > 0
                ? `${content}\n\n📎 Archivos adjuntos: ${files.map(f => f.name).join(', ')}`
                : content,
            timestamp: new Date().toISOString()
        };

        // Optimistic update - add user message immediately
        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);

        try {
            // Prepare history without IDs for API (APIchatMessage format)
            const historyForAPI: APIChatMessage[] = messages.map(msg => ({
                role: msg.role,
                content: msg.content,
                timestamp: msg.timestamp
            }));

            // Call API with session context
            const response: ChatResponse = await sendChatMessage({
                message: content,
                session_id: sessionId || undefined,
                history: historyForAPI,
                files: files
            });

            if (response.success) {
                // Add AI response to messages
                const aiMessage: ChatMessage = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: response.response,
                    timestamp: new Date().toISOString()
                };

                setMessages(prev => [...prev, aiMessage]);

                // Log context usage for debugging
                if (response.session_context_used) {
                    console.log('✅ AI used session context from dataset');
                }
                if (response.files_processed > 0) {
                    console.log(`✅ Processed ${response.files_processed} file(s)`);
                }
            } else {
                // API returned error
                setError(response.error || 'Error desconocido');

                // Add error message from API
                const errorMessage: ChatMessage = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: response.response,
                    timestamp: new Date().toISOString()
                };

                setMessages(prev => [...prev, errorMessage]);
            }
        } catch (err) {
            // Network or unexpected error
            const errorMsg = err instanceof Error ? err.message : 'Error de conexión';
            setError(errorMsg);

            // Add generic error message
            const errorMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: '❌ No se pudo procesar tu mensaje. Por favor, verifica tu conexión e intenta nuevamente.',
                timestamp: new Date().toISOString()
            };

            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    }, [sessionId, messages]);

    const retryLastMessage = useCallback(async () => {
        if (!lastUserMessage) {
            return;
        }

        // Remove last user and assistant messages (the failed attempt)
        setMessages(prev => prev.slice(0, -2));

        // Retry with same content
        await sendMessage(lastUserMessage.content, lastUserMessage.files);
    }, [lastUserMessage, sendMessage]);

    const clearChat = useCallback(() => {
        setMessages([]);
        setError(null);
        setLastUserMessage(null);
    }, []);

    return {
        messages,
        isLoading,
        error,
        sendMessage,
        clearChat,
        retryLastMessage
    };
}
