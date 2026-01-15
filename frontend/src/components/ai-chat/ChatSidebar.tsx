import { Plus, MessageSquare, Trash2 } from 'lucide-react';
import { ChatSession } from '../api/ai';

interface ChatSidebarProps {
  sessions: ChatSession[];
  onNewChat: () => void;
  onSelectChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
  activeChatId: string | null;
}

export function ChatSidebar({
  sessions,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  activeChatId
}: ChatSidebarProps) {
  const handleDelete = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('¿Estás seguro de que deseas eliminar esta conversación?')) {
      onDeleteChat(chatId);
    }
  };

  // Format timestamp to relative time
  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'ahora mismo';
      if (diffMins < 60) return `hace ${diffMins} min`;
      if (diffHours < 24) return `hace ${diffHours}h`;
      if (diffDays === 1) return 'ayer';
      if (diffDays < 7) return `hace ${diffDays} días`;
      return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
    } catch {
      return timestamp;
    }
  };

  return (
    <div className="w-full h-full bg-white border-r border-slate-200 flex flex-col">
      {/* New Chat Button */}
      <div className="p-4 border-b border-slate-200">
        <button
          onClick={onNewChat}
          className="w-full px-4 py-3 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
          style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
        >
          <Plus className="w-5 h-5" />
          Nuevo Chat
        </button>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="mb-2 px-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            Historial
          </h3>
        </div>

        {sessions.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <MessageSquare className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-sm text-slate-500" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              No hay conversaciones aún
            </p>
            <p className="text-xs text-slate-400 mt-1" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              Crea una nueva para empezar
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => onSelectChat(session.id)}
                className={`group relative px-3 py-3 rounded-lg cursor-pointer transition-all ${activeChatId === session.id
                    ? 'bg-teal-50 border border-teal-200'
                    : 'hover:bg-slate-50 border border-transparent'
                  }`}
              >
                <div className="flex items-start gap-2">
                  <MessageSquare className={`w-4 h-4 mt-0.5 flex-shrink-0 ${activeChatId === session.id ? 'text-teal-600' : 'text-slate-400'
                    }`} />

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${activeChatId === session.id ? 'text-teal-900' : 'text-slate-900'
                      }`} style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                      {session.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-slate-500" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                        {formatTimestamp(session.timestamp)}
                      </p>
                      {session.message_count > 0 && (
                        <>
                          <span className="text-xs text-slate-300">•</span>
                          <p className="text-xs text-slate-500" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                            {session.message_count} {session.message_count === 1 ? 'mensaje' : 'mensajes'}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Delete Button - Show on Hover */}
                <div className="absolute right-2 top-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => handleDelete(session.id, e)}
                    className="p-1.5 hover:bg-red-100 rounded text-red-600"
                    title="Eliminar conversación"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-200 bg-slate-50">
        <p className="text-xs text-slate-600 leading-relaxed" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
          {sessions.length === 0 ? (
            'Sin conversaciones guardadas'
          ) : (
            <>
              <strong>{sessions.length}</strong> {sessions.length === 1 ? 'conversación guardada' : 'conversaciones guardadas'}
            </>
          )}
        </p>
      </div>
    </div>
  );
}
