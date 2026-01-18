import { Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { memo } from 'react';

interface ChatMessageBubbleProps {
  message: {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  };
}

// PERFORMANCE OPTIMIZATION: Extract ReactMarkdown components to constant
// to avoid recreating on every render
const MARKDOWN_COMPONENTS = {
  // Personalización para bloques de código y código en línea
  code({ node, inline, className, children, ...props }: any) {
    const match = /language-(\w+)/.exec(className || '');

    // CASO 1: Código en línea (ej: `variable`)
    if (inline) {
      return (
        <span
          className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded-md font-mono text-xs font-semibold border border-slate-200"
          {...props}
        >
          {children}
        </span>
      );
    }

    // CASO 2: Bloque de código completo (ej: ```python ... ```)
    return (
      <div className="relative my-4 rounded-lg border border-slate-200 bg-slate-50 p-4 font-mono text-sm text-slate-800 shadow-sm overflow-x-auto">
        {/* Opcional: Etiqueta del lenguaje si existe */}
        {match && (
          <div className="absolute top-0 right-0 px-2 py-1 text-[10px] uppercase text-slate-400 font-bold select-none">
            {match[1]}
          </div>
        )}
        <pre className="m-0 bg-transparent p-0">
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      </div>
    );
  },
  // Mejora opcional para listas y párrafos
  ul: ({ children }: any) => <ul className="list-disc pl-4 space-y-1 my-2">{children}</ul>,
  ol: ({ children }: any) => <ol className="list-decimal pl-4 space-y-1 my-2">{children}</ol>,
  p: ({ children }: any) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
  // Mantener estilos existentes para otros elementos
  strong: ({ children }: any) => (
    <strong className="font-bold text-slate-900">{children}</strong>
  ),
  table: ({ children }: any) => (
    <div className="overflow-x-auto my-3">
      <table className="min-w-full border-collapse border border-slate-300 text-xs">
        {children}
      </table>
    </div>
  ),
  th: ({ children }: any) => (
    <th className="border border-slate-300 px-3 py-2 bg-slate-100 text-left font-bold">
      {children}
    </th>
  ),
  td: ({ children }: any) => (
    <td className="border border-slate-300 px-3 py-2">
      {children}
    </td>
  ),
};

// PERFORMANCE OPTIMIZATION: Define font style constant to avoid recreating object
const FONT_STYLE = { fontFamily: 'Inter, system-ui, sans-serif' };

function ChatMessageBubbleComponent({ message }: ChatMessageBubbleProps) {
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
          className={`rounded-2xl px-5 py-3.5 shadow-sm ${isUser
            ? 'bg-gradient-to-br from-teal-500 to-teal-600 text-white'
            : 'bg-white border border-slate-200 text-slate-900'
            }`}
        >
          {isUser ? (
            <p className="text-sm leading-relaxed" style={FONT_STYLE}>
              {message.content}
            </p>
          ) : (
            <div className="prose prose-slate max-w-none text-sm dark:prose-invert break-words">
              <ReactMarkdown components={MARKDOWN_COMPONENTS}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Timestamp */}
        <p className={`text-xs text-slate-500 mt-1.5 ${isUser ? 'text-right' : 'text-left'}`} style={FONT_STYLE}>
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

// PERFORMANCE OPTIMIZATION: Wrap with React.memo to prevent unnecessary re-renders
export const ChatMessageBubble = memo(ChatMessageBubbleComponent);
