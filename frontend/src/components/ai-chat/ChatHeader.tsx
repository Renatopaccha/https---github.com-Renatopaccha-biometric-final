import { ChevronDown, Sparkles } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface ChatHeaderProps {
  chatTitle: string;
  selectedModel: string;
  onModelChange: (model: string) => void;
}

const AI_MODELS = [
  { id: 'gemini-pro', name: 'Gemini Pro', description: 'Rápido y versátil' },
  { id: 'gemini-pro-vision', name: 'Gemini Pro Vision', description: 'Análisis de imágenes' },
  { id: 'gemini-ultra', name: 'Gemini Ultra', description: 'Máximo rendimiento' }
];

export function ChatHeader({ chatTitle, selectedModel, onModelChange }: ChatHeaderProps) {
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowModelDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentModel = AI_MODELS.find(m => m.id === selectedModel) || AI_MODELS[0];

  return (
    <div className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
      <div className="flex items-center justify-between">
        {/* Chat Title */}
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-gradient-to-b from-teal-500 to-teal-600 rounded-full"></div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            {chatTitle}
          </h1>
        </div>

        {/* Model Selector */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowModelDropdown(!showModelDropdown)}
            className="px-4 py-2.5 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg hover:from-purple-100 hover:to-indigo-100 transition-all flex items-center gap-3 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <div className="text-left">
                <p className="text-sm font-bold text-purple-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                  {currentModel.name}
                </p>
                <p className="text-xs text-purple-700" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                  {currentModel.description}
                </p>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-purple-600" />
          </button>

          {showModelDropdown && (
            <div className="absolute top-full right-0 mt-2 w-72 bg-white border border-slate-300 rounded-lg shadow-xl z-20 overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                  Seleccionar Modelo de IA
                </p>
              </div>
              
              {AI_MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => {
                    onModelChange(model.id);
                    setShowModelDropdown(false);
                  }}
                  className={`w-full text-left px-4 py-3 hover:bg-purple-50 transition-colors border-b border-slate-100 last:border-b-0 ${
                    selectedModel === model.id ? 'bg-purple-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Sparkles className={`w-4 h-4 mt-0.5 ${
                      selectedModel === model.id ? 'text-purple-600' : 'text-slate-400'
                    }`} />
                    <div className="flex-1">
                      <p className={`text-sm font-bold ${
                        selectedModel === model.id ? 'text-purple-900' : 'text-slate-900'
                      }`} style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                        {model.name}
                      </p>
                      <p className="text-xs text-slate-600 mt-0.5" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                        {model.description}
                      </p>
                    </div>
                    {selectedModel === model.id && (
                      <div className="w-2 h-2 bg-purple-600 rounded-full mt-1.5"></div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
