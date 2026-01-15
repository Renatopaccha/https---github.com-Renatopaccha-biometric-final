import { ChatSidebar } from './ai-chat/ChatSidebar';
import { ChatHeader } from './ai-chat/ChatHeader';
import { MessageList } from './ai-chat/MessageList';
import { ChatInputArea } from './ai-chat/ChatInputArea';
import { useAIChat } from '../hooks/useAIChat';
import { useDataContext } from '../context/DataContext';

export function AIAssistant() {
  const { sessionId } = useDataContext();
  const {
    messages,
    chatId,
    chatSessions,
    isLoading,
    sendMessage,
    loadChatHistory,
    startNewChat,
    deleteChatSession
  } = useAIChat();

  const handleNewChat = () => {
    startNewChat();
  };

  const handleSelectChat = (targetChatId: string) => {
    loadChatHistory(targetChatId);
  };

  const handleDeleteChat = (targetChatId: string) => {
    deleteChatSession(targetChatId);
  };

  const handleSendMessage = async (content: string, files?: File[]) => {
    await sendMessage(content, files);
  };

  // Determine chat title
  const chatTitle = chatSessions.find(s => s.id === chatId)?.title || 'Nuevo Chat';
  const selectedModel = 'gemini-2.5-flash';

  return (
    <div className="h-full flex bg-slate-50">
      {/* Left Sidebar - 25% width */}
      <div className="w-1/4 min-w-[280px] max-w-[400px]">
        <ChatSidebar
          sessions={chatSessions}
          onNewChat={handleNewChat}
          onSelectChat={handleSelectChat}
          onDeleteChat={handleDeleteChat}
          activeChatId={chatId}
        />
      </div>

      {/* Main Chat Area - 75% width */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <ChatHeader
          chatTitle={chatTitle}
          selectedModel={selectedModel}
          onModelChange={() => { }} // Model is fixed for now
        />

        {/* Session Context Indicator */}
        {sessionId && (
          <div className="px-6 py-2 bg-blue-50 border-b border-blue-200">
            <div className="max-w-4xl mx-auto flex items-center gap-2 text-sm text-blue-800">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                <strong>Contexto activo:</strong> La IA puede ver tus datos cargados y responder preguntas específicas sobre ellos.
              </span>
            </div>
          </div>
        )}

        {/* Messages */}
        <MessageList messages={messages} isLoading={isLoading} />

        {/* Input */}
        <ChatInputArea onSendMessage={handleSendMessage} disabled={isLoading} />
      </div>
    </div>
  );
}
