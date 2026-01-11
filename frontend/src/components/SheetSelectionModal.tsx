import { X, Check, Database, AlertCircle } from 'lucide-react';
import { useState, useRef } from 'react';

interface SheetPreview {
    sheet_name: string;
    rows: number;
    columns: number;
    column_names: string[];
    preview_data: Array<Record<string, any>>;
    missing_count: number;
    is_suggested: boolean;
    score: number;
}

interface SheetSelectionModalProps {
    sheets: SheetPreview[];
    filename: string;
    tempId: string;
    onConfirm: (sessionId: string, columns?: string[]) => void; // ✅ Ahora también pasa columns
    onCancel: () => void;
}

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_BASE_URL = `${BASE_URL}/api/v1`;

export function SheetSelectionModal({
    sheets,
    filename,
    tempId,
    onConfirm,
    onCancel
}: SheetSelectionModalProps) {
    const [selectedSheets, setSelectedSheets] = useState<string[]>(() => {
        // Pre-select the suggested sheet
        const suggested = sheets.find(s => s.is_suggested);
        return suggested ? [suggested.sheet_name] : [];
    });
    const [mergeSheets, setMergeSheets] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Ref to prevent duplicate submissions (persists across re-renders)
    const isSubmittingRef = useRef(false);

    const toggleSheet = (sheetName: string) => {
        setSelectedSheets(prev =>
            prev.includes(sheetName)
                ? prev.filter(name => name !== sheetName)
                : [...prev, sheetName]
        );
    };

    const handleConfirm = async () => {
        // Guard: Prevent duplicate submissions
        if (isSubmittingRef.current) {
            console.log('[SheetSelectionModal] Duplicate submission blocked');
            return;
        }

        // Immediately mark as submitting (before any async operations)
        isSubmittingRef.current = true;

        if (selectedSheets.length === 0) {
            setError('Debes seleccionar al menos una pestaña');
            isSubmittingRef.current = false; // Reset on validation error
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            console.log('[SheetSelectionModal] Submitting sheet selection:', {
                temp_id: tempId,
                selected_sheets: selectedSheets,
                merge: mergeSheets && selectedSheets.length > 1
            });

            const response = await fetch(`${API_BASE_URL}/upload/select-sheets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    temp_id: tempId,
                    selected_sheets: selectedSheets,
                    merge: mergeSheets && selectedSheets.length > 1
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || errorData.message || 'Error al procesar las pestañas');
            }

            const data = await response.json();

            console.log('[SheetSelectionModal] Sheet selection successful:', data);

            if (data.session_id) {
                // Success! Pass session_id AND columns to parent
                const columns = data.metadata?.column_names || [];
                onConfirm(data.session_id, columns);
                // DO NOT reset isSubmittingRef.current here - prevent re-submission while closing
            } else {
                throw new Error('No se recibió session_id del servidor');
            }
        } catch (err) {
            // Only reset ref on error so user can retry
            isSubmittingRef.current = false;

            const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
            setError(errorMessage);
            console.error('[SheetSelectionModal] Sheet selection error:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="border-b border-gray-200 p-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">Seleccionar Pestañas</h2>
                        <p className="text-sm text-gray-600 mt-1">
                            El archivo <strong>{filename}</strong> contiene {sheets.length} pestañas.
                            Selecciona las que deseas importar.
                        </p>
                    </div>
                    <button
                        onClick={onCancel}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        disabled={isSubmitting}
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {sheets.map((sheet) => {
                            const isSelected = selectedSheets.includes(sheet.sheet_name);

                            return (
                                <div
                                    key={sheet.sheet_name}
                                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${isSelected
                                        ? 'border-teal-500 bg-teal-50'
                                        : 'border-gray-200 hover:border-gray-300 bg-white'
                                        }`}
                                    onClick={() => toggleSheet(sheet.sheet_name)}
                                >
                                    {/* Sheet Header */}
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <Database className="w-5 h-5 text-teal-600" />
                                            <h3 className="font-medium text-gray-900">{sheet.sheet_name}</h3>
                                            {sheet.is_suggested && (
                                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                                                    Recomendada
                                                </span>
                                            )}
                                        </div>
                                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected ? 'border-teal-500 bg-teal-500' : 'border-gray-300'
                                            }`}>
                                            {isSelected && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                    </div>

                                    {/* Sheet Stats */}
                                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                                        <span>{sheet.rows.toLocaleString()} filas</span>
                                        <span>•</span>
                                        <span>{sheet.columns} columnas</span>
                                        {sheet.missing_count > 0 && (
                                            <>
                                                <span>•</span>
                                                <span className="text-amber-600">{sheet.missing_count} nulos</span>
                                            </>
                                        )}
                                    </div>

                                    {/* Preview Table */}
                                    {sheet.preview_data && sheet.preview_data.length > 0 && (
                                        <div className="border border-gray-200 rounded overflow-x-auto">
                                            <table className="w-full text-xs">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        {sheet.column_names.slice(0, 4).map((col) => (
                                                            <th key={col} className="px-2 py-1.5 text-left text-gray-600 font-medium">
                                                                {col}
                                                            </th>
                                                        ))}
                                                        {sheet.column_names.length > 4 && (
                                                            <th className="px-2 py-1.5 text-left text-gray-400">...</th>
                                                        )}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {sheet.preview_data.slice(0, 3).map((row, idx) => (
                                                        <tr key={idx} className="border-t border-gray-100">
                                                            {sheet.column_names.slice(0, 4).map((col) => (
                                                                <td key={col} className="px-2 py-1.5 text-gray-700">
                                                                    {row[col] !== null && row[col] !== undefined
                                                                        ? String(row[col]).substring(0, 20)
                                                                        : <span className="text-red-600">NULL</span>
                                                                    }
                                                                </td>
                                                            ))}
                                                            {sheet.column_names.length > 4 && (
                                                                <td className="px-2 py-1.5 text-gray-400">...</td>
                                                            )}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 p-6 bg-gray-50">
                    {selectedSheets.length > 1 && (
                        <div className="mb-4 flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="merge"
                                checked={mergeSheets}
                                onChange={(e) => setMergeSheets(e.target.checked)}
                                className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                            />
                            <label htmlFor="merge" className="text-sm text-gray-700 cursor-pointer">
                                Combinar pestañas seleccionadas (concatenar verticalmente)
                            </label>
                        </div>
                    )}

                    {error && (
                        <div className="mb-4 flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-md">
                            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                            <span className="text-sm text-red-700">{error}</span>
                        </div>
                    )}

                    <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600">
                            {selectedSheets.length} pestaña{selectedSheets.length !== 1 && 's'} seleccionada{selectedSheets.length !== 1 && 's'}
                        </p>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={onCancel}
                                disabled={isSubmitting}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={isSubmitting || selectedSheets.length === 0}
                                className={`px-5 py-2 rounded-md transition-colors text-white ${isSubmitting || selectedSheets.length === 0
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-teal-600 hover:bg-teal-700'
                                    }`}
                            >
                                {isSubmitting ? 'Procesando...' : 'Confirmar Selección'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
