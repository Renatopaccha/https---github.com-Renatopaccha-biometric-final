import { FileSpreadsheet, FileDown, Sparkles, MessageSquare } from 'lucide-react';

interface ActionToolbarProps {
  onExportExcel?: () => void;
  onExportPDF?: () => void;
  onAIInterpretation?: () => void;
  onContinueToChat?: () => void;
}

export function ActionToolbar({
  onExportExcel,
  onExportPDF,
  onAIInterpretation,
  onContinueToChat,
  isAnalyzing = false
}: ActionToolbarProps & { isAnalyzing?: boolean }) {
  return (
    <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-b from-white to-slate-50 border-t border-slate-200">
      {/* Left: Export Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={onExportExcel}
          className="px-4 py-2 bg-white border border-emerald-300 text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors flex items-center gap-2 text-sm shadow-sm"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Excel (.xlsx)</span>
        </button>
        <button
          onClick={onExportPDF}
          className="px-4 py-2 bg-white border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-2 text-sm shadow-sm"
        >
          <FileDown className="w-4 h-4" />
          <span>PDF Report</span>
        </button>
      </div>

      {/* Right: AI & Navigation */}
      <div className="flex items-center gap-3">
        <button
          onClick={onAIInterpretation}
          disabled={isAnalyzing}
          className="px-4 py-2 bg-gradient-to-r from-teal-600 to-blue-600 text-white rounded-lg hover:from-teal-700 hover:to-blue-700 transition-all flex items-center gap-2 text-sm shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isAnalyzing ? (
            // Spinner manual si no se importa Loader2, pero asumimos que el usuario quiere iconos lucide. 
            // Como no importé Loader2 arriba, agregaré la importación en el paso anterior o aquí si pudiera,
            // pero ActionsToolbar no tenía Loader2 importado. Usaré un svg simple o asumiré que Sparkles rota.
            // MEJOR: Usar la prop className con animate-spin si es el icono.
            <Sparkles className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          <span>{isAnalyzing ? 'Analizando...' : 'Interpretación por IA'}</span>
        </button>
        <button
          onClick={onContinueToChat}
          className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2 text-sm shadow-md"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Continuar al Chat</span>
        </button>
      </div>
    </div>
  );
}
