import { Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ChatMessageBubbleProps {
  message: {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  };
}

export function ChatMessageBubble({ message }: ChatMessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-4 mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {/* AI Avatar (left side for AI messages) */}
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-sm">
          <Bot className="w-5 h-5 text-white" />
        </div>
      )}

      {/* Message Content */}
      <div className={`max-w-[70%] ${isUser ? 'order-first' : ''}`}>
        {/* Message Bubble */}
        <div
          className={`rounded-2xl px-5 py-3.5 shadow-sm ${
            isUser
              ? 'bg-gradient-to-br from-teal-500 to-teal-600 text-white'
              : 'bg-white border border-slate-200 text-slate-900'
          }`}
        >
          {isUser ? (
            <p className="text-sm leading-relaxed" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              {message.content}
            </p>
          ) : (
            <div className="prose prose-sm max-w-none prose-slate">
              <ReactMarkdown
                components={{
                  p: ({ children }) => (
                    <p className="text-sm leading-relaxed mb-3 last:mb-0" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                      {children}
                    </p>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside text-sm space-y-1 my-2" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-inside text-sm space-y-1 my-2" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                      {children}
                    </ol>
                  ),
                  code: ({ children, className }) => {
                    const isInline = !className;
                    return isInline ? (
                      <code className="px-1.5 py-0.5 bg-slate-100 rounded text-xs text-purple-700" style={{ fontFamily: 'IBM Plex Mono, JetBrains Mono, monospace' }}>
                        {children}
                      </code>
                    ) : (
                      <code className="block p-3 bg-slate-900 rounded-lg text-xs text-green-400 overflow-x-auto my-2" style={{ fontFamily: 'IBM Plex Mono, JetBrains Mono, monospace' }}>
                        {children}
                      </code>
                    );
                  },
                  strong: ({ children }) => (
                    <strong className="font-bold text-slate-900">{children}</strong>
                  ),
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-3">
                      <table className="min-w-full border-collapse border border-slate-300 text-xs">
                        {children}
                      </table>
                    </div>
                  ),
                  th: ({ children }) => (
                    <th className="border border-slate-300 px-3 py-2 bg-slate-100 text-left font-bold" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="border border-slate-300 px-3 py-2" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                      {children}
                    </td>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Timestamp */}
        <p className={`text-xs text-slate-500 mt-1.5 ${isUser ? 'text-right' : 'text-left'}`} style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
          {message.timestamp}
        </p>
      </div>

      {/* User Avatar (right side for user messages) */}
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center shadow-sm">
          <User className="w-5 h-5 text-white" />
        </div>
      )}
    </div>
  );
}
