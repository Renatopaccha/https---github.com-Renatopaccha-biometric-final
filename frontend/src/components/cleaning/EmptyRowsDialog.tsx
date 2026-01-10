import { useState, useEffect } from 'react';
import { Eraser, AlertTriangle, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDataCleaning } from '../../hooks/useDataCleaning';
import type { EmptyRowsResponse } from '../../types/api';

interface EmptyRowsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    sessionId: string;
    onSuccess: () => void;
}

export function EmptyRowsDialog({
    isOpen,
    onClose,
    sessionId,
    onSuccess
}: EmptyRowsDialogProps) {
    const { checkEmptyRows, deleteRows, isLoading } = useDataCleaning();

    const [emptyRowsData, setEmptyRowsData] = useState<EmptyRowsResponse | null>(null);
    const [isDetecting, setIsDetecting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Auto-detect empty rows when dialog opens
    useEffect(() => {
        if (isOpen && sessionId) {
            detectEmptyRows();
        } else {
            // Reset state when closing
            setEmptyRowsData(null);
        }
    }, [isOpen, sessionId]);

    const detectEmptyRows = async () => {
        setIsDetecting(true);
        const result = await checkEmptyRows(sessionId);
        setEmptyRowsData(result);
        setIsDetecting(false);
    };

    const handleConfirmDelete = async () => {
        if (!emptyRowsData || emptyRowsData.total_empty === 0) return;

        setIsDeleting(true);
        const result = await deleteRows({
            session_id: sessionId,
            row_indices: emptyRowsData.empty_row_indices
        });

        setIsDeleting(false);
        if (result && result.success) {
            onSuccess();
            onClose();
        }
    };

    // If not open, don't render
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden m-4">

                {/* Header */}
                <div className="p-6 pb-4 border-b flex justify-between items-start bg-white">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-red-100 rounded-lg">
                            <Eraser className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">
                                Detectar Filas Vacías
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">
                                Revisa y elimina filas completamente vacías
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-hidden flex flex-col p-6 bg-gray-50/30">
                    {isDetecting ? (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center">
                                <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-3" />
                                <p className="text-sm text-gray-600">Analizando dataset...</p>
                            </div>
                        </div>
                    ) : emptyRowsData ? (
                        <>
                            {emptyRowsData.total_empty === 0 ? (
                                <div className="flex-1 flex items-center justify-center">
                                    <div className="text-center max-w-md">
                                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                            ¡Dataset Limpio!
                                        </h3>
                                        <p className="text-sm text-gray-600">
                                            No se detectaron filas completamente vacías en tu dataset.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Info Alert */}
                                    <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-md flex gap-3">
                                        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <h4 className="font-medium text-amber-900 mb-1">
                                                Se detectaron {emptyRowsData.total_empty} fila{emptyRowsData.total_empty !== 1 ? 's' : ''} vacía{emptyRowsData.total_empty !== 1 ? 's' : ''}
                                            </h4>
                                            <p className="text-sm text-amber-700">
                                                Revisa la lista abajo antes de confirmar la eliminación.
                                                Todas las columnas están vacías en estas filas.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Empty Rows Preview */}
                                    <div className="flex-1 overflow-hidden">
                                        <h3 className="text-sm font-semibold text-gray-700 mb-2">
                                            Vista previa (hasta 10 filas):
                                        </h3>
                                        <ScrollArea className="h-full border rounded-md bg-white">
                                            <div className="p-3">
                                                {emptyRowsData.preview.length > 0 ? (
                                                    <div className="space-y-2">
                                                        {emptyRowsData.preview.map((row, idx) => {
                                                            const rowIndex = row.__row_index__ ?? idx;
                                                            return (
                                                                <div
                                                                    key={idx}
                                                                    className="p-3 border border-red-100 bg-red-50/50 rounded-md"
                                                                >
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <span className="px-2 py-0.5 bg-red-600 text-white text-xs font-mono rounded">
                                                                            Fila {rowIndex}
                                                                        </span>
                                                                        <span className="text-xs text-red-600 font-medium">
                                                                            Todas las columnas vacías
                                                                        </span>
                                                                    </div>
                                                                    <div className="grid grid-cols-3 gap-2 text-xs">
                                                                        {Object.entries(row)
                                                                            .filter(([key]) => key !== '__row_index__')
                                                                            .slice(0, 6)
                                                                            .map(([key, value]) => (
                                                                                <div key={key} className="flex gap-1">
                                                                                    <span className="font-mono text-gray-500">{key}:</span>
                                                                                    <span className="text-gray-400 italic">null</span>
                                                                                </div>
                                                                            ))
                                                                        }
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-gray-500 text-center py-4">
                                                        No hay vista previa disponible
                                                    </p>
                                                )}
                                            </div>
                                        </ScrollArea>
                                    </div>
                                </>
                            )}
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            <p className="text-sm text-gray-500">Error al detectar filas vacías</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 pt-4 border-t bg-gray-50 flex justify-end gap-3">
                    <Button variant="outline" onClick={onClose} disabled={isDeleting}>
                        {emptyRowsData?.total_empty === 0 ? 'Cerrar' : 'Cancelar'}
                    </Button>

                    {emptyRowsData && emptyRowsData.total_empty > 0 && (
                        <Button
                            onClick={handleConfirmDelete}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700 text-white min-w-[160px]"
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Eliminando...
                                </>
                            ) : (
                                <>
                                    <Eraser className="w-4 h-4 mr-2" />
                                    Eliminar {emptyRowsData.total_empty} Fila{emptyRowsData.total_empty !== 1 ? 's' : ''}
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
