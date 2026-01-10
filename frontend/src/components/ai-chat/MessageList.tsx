import { useEffect, useRef } from 'react';
import { ChatMessageBubble } from './ChatMessageBubble';
import { Loader2 } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
}

export function MessageList({ messages, isLoading = false }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            Asistente AI de Análisis
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed mb-4" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            Haz preguntas sobre tus datos biomédicos, sube archivos CSV o imágenes de gráficos para análisis, 
            o solicita ayuda con interpretación estadística.
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <span className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full text-xs font-medium" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              Análisis estadístico
            </span>
            <span className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full text-xs font-medium" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              Interpretación de resultados
            </span>
            <span className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full text-xs font-medium" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              Sugerencias de pruebas
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        {messages.map((message) => (
          <ChatMessageBubble key={message.id} message={message} />
        ))}

        {isLoading && (
          <div className="flex gap-4 mb-6 justify-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-sm">
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            </div>
            <div className="max-w-[70%]">
              <div className="rounded-2xl px-5 py-3.5 bg-white border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  <span className="text-xs text-slate-600 ml-2" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    Pensando...
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
