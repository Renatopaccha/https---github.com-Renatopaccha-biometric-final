import { useState, useCallback, useEffect, useRef } from 'react';
import {
    sendChatMessage,
    listChatSessions,
    getChatHistory,
    deleteChat as deleteChatAPI,
    ChatMessage as APIChatMessage,
    ChatResponse,
    ChatSession
} from '../api/ai';
import { useDataContext } from '../context/DataContext';

// Extended message type with ID for UI
interface ChatMessage extends APIChatMessage {
    id: string;
}

interface UseAIChatReturn {
    messages: ChatMessage[];
    chatId: string | null;
    chatSessions: ChatSession[];
    isLoading: boolean;
    error: string | null;
    sendMessage: (content: string, files?: File[]) => Promise<void>;
    clearChat: () => void;
    retryLastMessage: () => Promise<void>;
    loadChatHistory: (chatId: string) => Promise<void>;
    loadChatSessions: () => Promise<void>;
    startNewChat: () => void;
    deleteChatSession: (chatId: string) => Promise<void>;
}

/**
 * Custom hook for managing AI chat interactions with persistence.
 * 
 * Features:
 * - Automatic session context injection from DataContext
 * - Chat persistence and history loading
 * - Optimistic UI updates
 * - Error handling and retry logic
 * - Message history management
 * 
 * @example
 * const { messages, chatSessions, sendMessage, loadChatHistory } = useAIChat();
 */
export function useAIChat(): UseAIChatReturn {
    const { sessionId: dataSessionId } = useDataContext();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [chatId, setChatId] = useState<string | null>(null);
    const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUserMessage, setLastUserMessage] = useState<{
        content: string;
        files?: File[];
    } | null>(null);

    // Generate or retrieve a chat session ID (works even without data session)
    const [chatSessionId, setChatSessionId] = useState<string | null>(() => {
        // Priority: data session > stored chat session
        if (typeof window !== 'undefined') {
            return localStorage.getItem('biometric_chat_session_id');
        }
        return null;
    });

    // Effective session ID: prefer data session, fallback to chat-only session
    const sessionId = dataSessionId || chatSessionId;

    // Generate chat session ID if needed
    useEffect(() => {
        if (!sessionId && typeof window !== 'undefined') {
            const newChatSessionId = crypto.randomUUID();
            localStorage.setItem('biometric_chat_session_id', newChatSessionId);
            setChatSessionId(newChatSessionId);
            console.log('[useAIChat] Generated new chat session:', newChatSessionId);
        }
    }, [sessionId]);

    // Use ref to avoid recreating sendMessage on every message change (performance optimization)
    const messagesRef = useRef<ChatMessage[]>(messages);
    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    const loadChatSessions = useCallback(async () => {
        if (!sessionId) {
            setChatSessions([]);
            return;
        }

        try {
            const sessions = await listChatSessions(sessionId);
            setChatSessions(sessions);
        } catch (err) {
            console.error('Failed to load chat sessions:', err);
        }
    }, [sessionId]);

    // Auto-load chat sessions when sessionId changes
    useEffect(() => {
        loadChatSessions();
    }, [loadChatSessions]);

    const loadChatHistory = useCallback(async (targetChatId: string) => {
        if (!sessionId) return;

        try {
            const history = await getChatHistory(sessionId, targetChatId);
            if (history) {
                // Convert to UI format with IDs
                const messagesWithIds: ChatMessage[] = history.messages.map((msg, index) => ({
                    ...msg,
                    id: `${targetChatId}-${index}`
                }));

                setMessages(messagesWithIds);
                setChatId(targetChatId);
                setError(null);
            }
        } catch (err) {
            console.error('Failed to load chat history:', err);
            setError('No se pudo cargar el historial del chat');
        }
    }, [sessionId]);

    const startNewChat = useCallback(() => {
        setMessages([]);
        setChatId(null);
        setError(null);
        setLastUserMessage(null);
    }, []);

    const deleteChatSession = useCallback(async (targetChatId: string) => {
        if (!sessionId) return;

        try {
            const success = await deleteChatAPI(sessionId, targetChatId);
            if (success) {
                // Remove from local state
                setChatSessions(prev => prev.filter(s => s.id !== targetChatId));

                // If we deleted the active chat, start a new one
                if (chatId === targetChatId) {
                    startNewChat();
                }
            }
        } catch (err) {
            console.error('Failed to delete chat:', err);
        }
    }, [sessionId, chatId, startNewChat]);

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
            // Prepare history without IDs for API (APIChatMessage format)
            // Use ref to avoid dependency on messages array
            const historyForAPI: APIChatMessage[] = messagesRef.current.map(msg => ({
                role: msg.role,
                content: msg.content,
                timestamp: msg.timestamp
            }));

            // Call API with session context, chat_id, and files
            const response: ChatResponse = await sendChatMessage({
                message: content,
                session_id: sessionId || undefined,
                chat_id: chatId || undefined,
                history: historyForAPI,
                files: files
            });

            if (response.success) {
                // Update chat_id if this was a new chat
                if (response.chat_id && !chatId) {
                    setChatId(response.chat_id);
                }

                // Add AI response to messages
                const aiMessage: ChatMessage = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: response.response,
                    timestamp: new Date().toISOString()
                };

                setMessages(prev => [...prev, aiMessage]);

                // Reload chat sessions to update message counts
                if (sessionId) {
                    loadChatSessions();
                }

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

            // Determine error type and provide context-aware message
            let userFriendlyMessage = '❌ No se pudo procesar tu mensaje. Por favor, verifica tu conexión e intenta nuevamente.';

            if (err instanceof Error) {
                // Timeout error
                if (err.name === 'TimeoutError' || err.message.includes('timeout') || err.message.includes('aborted')) {
                    userFriendlyMessage = '⏱️ La IA está tomando más tiempo de lo esperado. Intenta reformular tu pregunta o dividirla en partes más pequeñas.';
                }
                // Network error
                else if (err.message.includes('fetch') || err.message.includes('network') || err.message.includes('conexión')) {
                    userFriendlyMessage = '🌐 Error de conexión. Por favor, verifica tu conexión a internet e intenta nuevamente.';
                }
            }

            // Add context-aware error message
            const errorMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: userFriendlyMessage,
                timestamp: new Date().toISOString()
            };

            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    }, [sessionId, chatId, loadChatSessions]);

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
        setChatId(null);
        setError(null);
        setLastUserMessage(null);
    }, []);

    return {
        messages,
        chatId,
        chatSessions,
        isLoading,
        error,
        sendMessage,
        clearChat,
        retryLastMessage,
        loadChatHistory,
        loadChatSessions,
        startNewChat,
        deleteChatSession
    };
}
