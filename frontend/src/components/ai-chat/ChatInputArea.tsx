import { Send, Paperclip, X, File, Image as ImageIcon } from 'lucide-react';
import { useState, useRef, KeyboardEvent } from 'react';

interface ChatInputAreaProps {
  onSendMessage: (message: string, files?: File[]) => void;
  disabled?: boolean;
}

export function ChatInputArea({ onSendMessage, disabled = false }: ChatInputAreaProps) {
  const [message, setMessage] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (message.trim() || attachedFiles.length > 0) {
      onSendMessage(message.trim(), attachedFiles.length > 0 ? attachedFiles : undefined);
      setMessage('');
      setAttachedFiles([]);
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setAttachedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    // Auto-resize textarea
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <ImageIcon className="w-4 h-4" />;
    }
    return <File className="w-4 h-4" />;
  };

  return (
    <div className="bg-white border-t border-slate-200 p-4 shadow-lg">
      <div className="max-w-4xl mx-auto">
        {/* Attached Files Preview */}
        {attachedFiles.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {attachedFiles.map((file, index) => (
              <div
                key={index}
                className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-sm"
              >
                <div className="text-slate-600">
                  {getFileIcon(file)}
                </div>
                <span className="text-slate-900 max-w-[200px] truncate" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                  {file.name}
                </span>
                <button
                  onClick={() => removeFile(index)}
                  className="text-slate-500 hover:text-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input Container */}
        <div className="flex items-end gap-2">
          {/* File Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="flex-shrink-0 p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Adjuntar archivo (CSV, Excel, imágenes)"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".csv,.xlsx,.xls,image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Text Input */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              placeholder="Escribe tu pregunta o describe el análisis que necesitas..."
              className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ 
                fontFamily: 'Inter, system-ui, sans-serif',
                minHeight: '52px',
                maxHeight: '150px'
              }}
              rows={1}
            />
            
            {/* Character Count Hint */}
            {message.length > 0 && (
              <div className="absolute bottom-2 right-3 text-xs text-slate-400" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                {message.length}
              </div>
            )}
          </div>

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={disabled || (!message.trim() && attachedFiles.length === 0)}
            className="flex-shrink-0 p-3 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white rounded-lg transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-400"
            title="Enviar mensaje (Enter)"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        {/* Help Text */}
        <div className="mt-2 flex items-center justify-between text-xs text-slate-500" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
          <span>
            Presiona <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-slate-700 font-mono">Enter</kbd> para enviar, 
            <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-slate-700 font-mono ml-1">Shift + Enter</kbd> para nueva línea
          </span>
          <span className="text-slate-400">
            Archivos soportados: CSV, Excel, imágenes
          </span>
        </div>
      </div>
    </div>
  );
}
