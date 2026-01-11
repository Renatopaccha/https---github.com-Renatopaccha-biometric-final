import { Activity, Droplets, Copy, X, Loader2, Trash2, Undo2, Settings, Columns, Eraser, RefreshCcw, FileSpreadsheet, FileText } from 'lucide-react';
import { useState } from 'react';
import { useDataContext } from '../../context/DataContext';
import { useDataCleaning } from '../../hooks/useDataCleaning';
import { ColumnManagerDialog } from './ColumnManagerDialog';
import { EmptyRowsDialog } from './EmptyRowsDialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_BASE_URL = `${BASE_URL}/api/v1`;

interface CleaningToolbarProps {
    sessionId: string;
    onDiagnosticToggle: () => void;
    showDiagnostic: boolean;
    onCleaningComplete: () => void;
    selectedCount?: number;
    onDelete?: () => void;
    onUndo?: () => void;
    onReset?: () => void;
}

export function CleaningToolbar({
    sessionId,
    onDiagnosticToggle,
    showDiagnostic,
    onCleaningComplete,
    selectedCount = 0,
    onDelete,
    onUndo,
    onReset
}: CleaningToolbarProps) {
    const { columns, filename } = useDataContext();
    const { downloadDataset, downloadAuditReport, isLoading } = useDataCleaning();
    const [showNullDialog, setShowNullDialog] = useState(false);
    const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showColumnManager, setShowColumnManager] = useState(false);
    const [showEmptyRowsDialog, setShowEmptyRowsDialog] = useState(false);

    const handleDownloadDataset = async () => {
        const success = await downloadDataset(sessionId, filename || 'dataset');
        if (success) {
            console.log('Dataset downloaded successfully');
        }
    };

    const handleDownloadAuditReport = async () => {
        const success = await downloadAuditReport(sessionId);
        if (success) {
            console.log('Audit report downloaded successfully');
        }
    };

    return (
        <div className="border-b border-gray-200 p-4">
            <div className="flex items-center justify-between gap-4">
                {/* Left side: Reset button */}
                <div className="flex items-center gap-2">
                    {onReset && (
                        <button
                            onClick={onReset}
                            className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm text-gray-600"
                            title="Cargar otro archivo o seleccionar otra hoja"
                        >
                            <RefreshCcw className="w-4 h-4" />
                            📂 Cambiar Archivo/Hoja
                        </button>
                    )}
                </div>

                {/* Center/Right: Cleaning actions */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={onDiagnosticToggle}
                        className={`px-4 py-2 rounded-md transition-all flex items-center gap-2 text-sm font-medium ${showDiagnostic
                            ? 'bg-teal-600 text-white shadow-md'
                            : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        <Activity className="w-4 h-4" />
                        {showDiagnostic ? 'Ocultar Diagnóstico' : 'Ver Diagnóstico'}
                    </button>

                    {onUndo && (
                        <button
                            onClick={onUndo}
                            className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm text-gray-700"
                            title="Deshacer último cambio"
                        >
                            <Undo2 className="w-4 h-4" />
                            Deshacer
                        </button>
                    )}

                    <button
                        onClick={() => setShowColumnManager(true)}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm text-gray-700"
                        title="Gestionar columnas del dataset"
                    >
                        <Columns className="w-4 h-4" />
                        Gestionar Columnas
                    </button>

                    <button
                        onClick={() => setShowEmptyRowsDialog(true)}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm text-gray-700"
                        title="Detectar y eliminar filas vacías"
                    >
                        <Eraser className="w-4 h-4" />
                        Filas Vacías
                    </button>

                    <button
                        onClick={() => setShowNullDialog(true)}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm text-gray-700"
                    >
                        <Droplets className="w-4 h-4" />
                        Limpiar Nulos
                    </button>

                    <button
                        onClick={() => setShowDuplicateDialog(true)}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm text-gray-700"
                    >
                        <Copy className="w-4 h-4" />
                        Eliminar Duplicados
                    </button>

                    {selectedCount > 0 && onDelete && (
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded-md hover:bg-red-100 transition-colors flex items-center gap-2 text-sm font-medium animate-in fade-in"
                        >
                            <Trash2 className="w-4 h-4" />
                            Eliminar ({selectedCount})
                        </button>
                    )}


                    {/* Direct Download Buttons with Visual Feedback */}
                    <button
                        onClick={handleDownloadDataset}
                        disabled={isLoading}
                        className={`px-5 py-2.5 rounded-md transition-all flex items-center gap-2 text-sm font-semibold shadow-sm ${isLoading
                            ? 'bg-teal-400 text-white cursor-not-allowed'
                            : 'bg-teal-600 text-white hover:bg-teal-700 hover:shadow-md'
                            }`}
                        title="Descargar dataset limpio en formato Excel"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Generando...
                            </>
                        ) : (
                            <>
                                <FileSpreadsheet className="w-4 h-4" />
                                📥 Descargar Excel Final
                            </>
                        )}
                    </button>

                    <button
                        onClick={handleDownloadAuditReport}
                        disabled={isLoading}
                        className={`px-4 py-2 rounded-md transition-colors flex items-center gap-2 text-sm font-medium border ${isLoading
                            ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                        title="Descargar reporte de auditoría con histórico de cambios"
                    >
                        <FileText className="w-4 h-4" />
                        📄 Reporte de Auditoría
                    </button>

                </div>
            </div>

            {/* Column Manager Dialog */}
            <ColumnManagerDialog
                isOpen={showColumnManager}
                onClose={() => setShowColumnManager(false)}
                columns={columns}
                sessionId={sessionId}
                onSuccess={() => {
                    setShowColumnManager(false);
                    onCleaningComplete();
                }}
            />

            {/* Empty Rows Dialog */}
            <EmptyRowsDialog
                isOpen={showEmptyRowsDialog}
                onClose={() => setShowEmptyRowsDialog(false)}
                sessionId={sessionId}
                onSuccess={() => {
                    setShowEmptyRowsDialog(false);
                    onCleaningComplete();
                }}
            />

            {/* Null Cleaning Dialog */}
            {showNullDialog && (
                <NullCleaningDialog
                    sessionId={sessionId}
                    onClose={() => setShowNullDialog(false)}
                    onSuccess={() => {
                        setShowNullDialog(false);
                        onCleaningComplete();
                    }}
                />
            )}

            {/* Duplicate Removal Dialog */}
            {showDuplicateDialog && (
                <DuplicateRemovalDialog
                    sessionId={sessionId}
                    onClose={() => setShowDuplicateDialog(false)}
                    onSuccess={() => {
                        setShowDuplicateDialog(false);
                        onCleaningComplete();
                    }}
                />
            )}

            {/* Manual Deletion Confirmation */}
            <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            ¿Estás seguro de eliminar estas filas? La acción no se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                setShowDeleteConfirm(false);
                                if (onDelete) onDelete();
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            Eliminar Filas
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

// Null Cleaning Dialog Component
function NullCleaningDialog({
    sessionId,
    onClose,
    onSuccess,
}: {
    sessionId: string;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const { healthReport } = useDataContext();
    const [column, setColumn] = useState('');
    const [method, setMethod] = useState<'drop' | 'mean' | 'median' | 'mode'>('mean');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Filter columns that actually have missing values
    const columnsWithNulls = healthReport
        ? Object.values(healthReport.columns).filter(col => col.missing_count > 0)
        : [];

    const handleSubmit = async () => {
        if (!column) {
            alert('Por favor selecciona una columna');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch(`${API_BASE_URL}/cleaning/nulls`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId, column, method }),
            });

            if (response.ok) {
                onSuccess();
            } else {
                const error = await response.json();
                alert(error.message || 'Error al limpiar nulos');
            }
        } catch (error) {
            alert('Error de conexión');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Limpiar Valores Nulos</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Columna</Label>
                        <Select value={column} onValueChange={setColumn}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecciona una columna" />
                            </SelectTrigger>
                            <SelectContent>
                                {columnsWithNulls.length > 0 ? (
                                    columnsWithNulls.map((col) => (
                                        <SelectItem key={col.column_name} value={col.column_name}>
                                            {col.column_name} ({col.missing_count} nulos)
                                        </SelectItem>
                                    ))
                                ) : (
                                    <div className="p-2 text-sm text-gray-500 text-center">
                                        No hay columnas con valores nulos
                                    </div>
                                )}
                            </SelectContent>
                        </Select>
                        {columnsWithNulls.length === 0 && (
                            <p className="text-xs text-green-600">¡Tus datos están completos! No se encontraron valores nulos.</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>Método</Label>
                        <Select value={method} onValueChange={(val) => setMethod(val as any)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecciona método" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="mean">Media (numérico)</SelectItem>
                                <SelectItem value="median">Mediana (numérico)</SelectItem>
                                <SelectItem value="mode">Moda (más frecuente)</SelectItem>
                                <SelectItem value="drop">Eliminar filas</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex items-center gap-3 mt-6">
                    <Button variant="outline" onClick={onClose} className="flex-1">
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !column}
                        className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
                    >
                        {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        Aplicar
                    </Button>
                </div>
            </div>
        </div>
    );
}

// Duplicate Removal Dialog Component
function DuplicateRemovalDialog({
    sessionId,
    onClose,
    onSuccess,
}: {
    sessionId: string;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const response = await fetch(`${API_BASE_URL}/cleaning/duplicates`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId, keep: 'first' }),
            });

            if (response.ok) {
                const result = await response.json();
                alert(`¡Éxito! Se eliminaron ${result.duplicates_removed} filas duplicadas`);
                onSuccess();
            } else {
                const error = await response.json();
                alert(error.message || 'Error al eliminar duplicados');
            }
        } catch (error) {
            alert('Error de conexión');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Eliminar Duplicados</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <p className="text-sm text-gray-600 mb-6">
                    Se eliminarán todas las filas duplicadas del dataset, manteniendo la primera ocurrencia.
                </p>

                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={onClose} className="flex-1">
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                    >
                        {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        Confirmar
                    </Button>
                </div>
            </div>
        </div>
    );
}
