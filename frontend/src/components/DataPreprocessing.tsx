import { useState } from 'react';
import { useDataContext } from '../context/DataContext';
import { FileUploadZone } from './FileUploadZone';
import { DataTable } from './DataTable';
import { StatusBar } from './StatusBar';
import { SheetSelectionModal } from './SheetSelectionModal';
import type { UploadResponse, SheetPreview } from '../types/api';

export function DataPreprocessing() {
  const { sessionId, setSessionId, setColumns } = useDataContext();

  // State for multi-sheet Excel selection
  const [showSheetSelection, setShowSheetSelection] = useState(false);
  const [tempId, setTempId] = useState<string | null>(null);
  const [sheets, setSheets] = useState<SheetPreview[]>([]);
  const [filename, setFilename] = useState<string>('');

  const handleUploadSuccess = (response: UploadResponse) => {
    if (response.status === 'ready') {
      // Scenario 1: CSV or single-sheet Excel - go directly to table
      setSessionId(response.session_id);

      // ✅ CRUCIAL: Guardamos las columnas del Excel en el contexto global
      if (response.metadata?.column_names) {
        setColumns(response.metadata.column_names);
        console.log('[DataPreprocessing] Columns saved:', response.metadata.column_names);
      }

      console.log('[DataPreprocessing] File uploaded successfully:', response.filename);
    } else if (response.status === 'selection_required') {
      // Scenario 2: Multi-sheet Excel - show selection modal
      setTempId(response.temp_id);
      setSheets(response.sheets);
      setFilename(response.filename);
      setShowSheetSelection(true);
      console.log(`[DataPreprocessing] File has ${response.total_sheets} sheets, showing selection modal`);
    }
  };

  const handleSheetConfirm = (newSessionId: string, columns?: string[]) => {
    // Modal already handled the API call - just update state with the session ID
    console.log('[DataPreprocessing] Sheet selection confirmed, session ID:', newSessionId);

    setSessionId(newSessionId);

    // ✅ CRUCIAL: Guardamos las columnas si vienen del modal
    if (columns && columns.length > 0) {
      setColumns(columns);
      console.log('[DataPreprocessing] Columns saved from sheet selection:', columns);
    }

    setShowSheetSelection(false);

    // Clear temporary state
    setTempId(null);
    setSheets([]);
    setFilename('');
  };

  const handleSheetCancel = () => {
    // User cancelled sheet selection - reset to upload state
    console.log('[DataPreprocessing] Sheet selection cancelled');

    setShowSheetSelection(false);
    setTempId(null);
    setSheets([]);
    setFilename('');
  };

  const handleReset = () => {
    if (window.confirm("¿Quieres cargar otro archivo? Se perderán los cambios actuales no guardados.")) {
      console.log('[DataPreprocessing] Resetting session - returning to upload');
      setSessionId(null); // This clears the context and returns to UploadZone
      setTempId(null);
      setFilename('');
      setSheets([]);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 p-6 space-y-4">
        {!sessionId ? (
          <FileUploadZone onUploadSuccess={handleUploadSuccess} />
        ) : (
          <DataTable sessionId={sessionId} onReset={handleReset} />
        )}
      </div>

      <StatusBar />

      {/* Sheet Selection Modal */}
      {showSheetSelection && tempId && (
        <SheetSelectionModal
          sheets={sheets}
          filename={filename}
          tempId={tempId}
          onConfirm={handleSheetConfirm}
          onCancel={handleSheetCancel}
        />
      )}
    </div>
  );
}
