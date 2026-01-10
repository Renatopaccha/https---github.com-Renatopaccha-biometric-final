import { Plus, MessageSquare, Trash2, Edit2 } from 'lucide-react';
import { useState } from 'react';

interface ChatSession {
  id: string;
  title: string;
  timestamp: string;
  model: string;
}

interface ChatSidebarProps {
  onNewChat: () => void;
  onSelectChat: (chatId: string) => void;
  activeChatId: string | null;
}

export function ChatSidebar({ onNewChat, onSelectChat, activeChatId }: ChatSidebarProps) {
  const [sessions] = useState<ChatSession[]>([
    {
      id: '1',
      title: 'Análisis de correlación IMC',
      timestamp: 'hace 2 horas',
      model: 'Gemini Pro'
    },
    {
      id: '2',
      title: 'Prueba de normalidad datos',
      timestamp: 'hace 5 horas',
      model: 'Gemini Pro'
    },
    {
      id: '3',
      title: 'Interpretación p-valores',
      timestamp: 'ayer',
      model: 'Gemini Pro'
    },
    {
      id: '4',
      title: 'Regresión lineal múltiple',
      timestamp: 'hace 2 días',
      model: 'Gemini Pro'
    },
    {
      id: '5',
      title: 'ANOVA variables categóricas',
      timestamp: 'hace 3 días',
      model: 'Gemini Pro'
    }
  ]);

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

        <div className="space-y-1">
          {sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => onSelectChat(session.id)}
              className={`group relative px-3 py-3 rounded-lg cursor-pointer transition-all ${
                activeChatId === session.id
                  ? 'bg-teal-50 border border-teal-200'
                  : 'hover:bg-slate-50 border border-transparent'
              }`}
            >
              <div className="flex items-start gap-2">
                <MessageSquare className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                  activeChatId === session.id ? 'text-teal-600' : 'text-slate-400'
                }`} />
                
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${
                    activeChatId === session.id ? 'text-teal-900' : 'text-slate-900'
                  }`} style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    {session.title}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    {session.timestamp}
                  </p>
                </div>
              </div>

              {/* Action Buttons - Show on Hover */}
              <div className="absolute right-2 top-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Handle rename
                  }}
                  className="p-1.5 hover:bg-slate-200 rounded text-slate-600"
                  title="Renombrar"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Handle delete
                  }}
                  className="p-1.5 hover:bg-red-100 rounded text-red-600"
                  title="Eliminar"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-200 bg-slate-50">
        <p className="text-xs text-slate-600 leading-relaxed" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
          <strong>{sessions.length}</strong> conversaciones guardadas
        </p>
      </div>
    </div>
  );
}
