import { ChatSidebar } from './ai-chat/ChatSidebar';
import { ChatHeader } from './ai-chat/ChatHeader';
import { MessageList } from './ai-chat/MessageList';
import { ChatInputArea } from './ai-chat/ChatInputArea';
import { useAIChat } from '../hooks/useAIChat';
import { useDataContext } from '../context/DataContext';
import { useState } from 'react';

export function AIAssistant() {
  const { sessionId } = useDataContext();
  const { messages, isLoading, sendMessage, clearChat } = useAIChat();

  const [activeChatId, setActiveChatId] = useState<string | null>('1');
  const [selectedModel, setSelectedModel] = useState('gemini-1.5-flash');
  const [chatTitle, setChatTitle] = useState('Nuevo Chat');

  const handleNewChat = () => {
    clearChat();
    setActiveChatId(null);
    setChatTitle('Nuevo Chat');
  };

  const handleSelectChat = (chatId: string) => {
    setActiveChatId(chatId);
    // In a real app, you would load the chat history from storage
    setChatTitle('Chat anterior');
  };

  const handleSendMessage = async (content: string, files?: File[]) => {
    await sendMessage(content, files);

    // Update title on first message if it's a new chat
    if (messages.length === 0 && chatTitle === 'Nuevo Chat') {
      // Extract first few words for title
      const titleText = content.split(' ').slice(0, 5).join(' ');
      setChatTitle(titleText.length < content.length ? `${titleText}...` : titleText);
    }
  };

  return (
    <div className="h-full flex bg-slate-50">
      {/* Left Sidebar - 25% width */}
      <div className="w-1/4 min-w-[280px] max-w-[400px]">
        <ChatSidebar
          onNewChat={handleNewChat}
          onSelectChat={handleSelectChat}
          activeChatId={activeChatId}
        />
      </div>

      {/* Main Chat Area - 75% width */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <ChatHeader
          chatTitle={chatTitle}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
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
