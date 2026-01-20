import { FileSpreadsheet, FileDown, Sparkles, MessageSquare, Loader2 } from 'lucide-react';

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
  isAnalyzing = false,
  isNavigating = false
}: ActionToolbarProps & { isAnalyzing?: boolean; isNavigating?: boolean }) {
  return (
    <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-b from-white to-slate-50 border-t border-slate-200">
      {/* Left: Export Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={onExportExcel}
          disabled={!onExportExcel}
          title={!onExportExcel ? 'Exportación a Excel no disponible' : 'Exportar a Excel'}
          className="px-4 py-2 bg-white border border-emerald-300 text-emerald-700 rounded-lg transition-colors flex items-center gap-2 text-sm shadow-sm hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Excel (.xlsx)</span>
        </button>
        <button
          onClick={onExportPDF}
          disabled={!onExportPDF}
          title={!onExportPDF ? 'Exportación a PDF no disponible' : 'Exportar reporte PDF'}
          className="px-4 py-2 bg-white border border-red-300 text-red-700 rounded-lg transition-colors flex items-center gap-2 text-sm shadow-sm hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
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
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          <span>{isAnalyzing ? 'Analizando...' : 'Interpretación por IA'}</span>
        </button>
        <button
          onClick={onContinueToChat}
          disabled={isNavigating}
          className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2 text-sm shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isNavigating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <MessageSquare className="w-4 h-4" />
          )}
          <span>{isNavigating ? 'Preparando...' : 'Continuar al Chat'}</span>
        </button>
      </div>
    </div>
  );
}
