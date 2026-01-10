import { X, Loader2, Beaker, CheckCircle2, AlertTriangle, TrendingDown } from 'lucide-react';
import { useState } from 'react';
import { useDataCleaning } from '../../hooks/useDataCleaning';
import type { ColumnQuality, NullHandlingMethod, SimulationResponse } from '../../types/api';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface MissingDataSidebarProps {
    sessionId: string;
    columnsWithNulls: ColumnQuality[];
    onClose: () => void;
    onApply: () => void;
}

export function MissingDataSidebar({
    sessionId,
    columnsWithNulls,
    onClose,
    onApply
}: MissingDataSidebarProps) {
    const { simulateNullCleaning, cleanNulls, isLoading } = useDataCleaning();

    const [selectedColumn, setSelectedColumn] = useState('');
    const [selectedMethod, setSelectedMethod] = useState<NullHandlingMethod>('mean');
    const [fillValue, setFillValue] = useState('');
    const [simulationResult, setSimulationResult] = useState<SimulationResponse | null>(null);
    const [simulationError, setSimulationError] = useState<string | null>(null);

    const handleSimulate = async () => {
        if (!selectedColumn) {
            setSimulationError('Por favor selecciona una columna');
            return;
        }

        setSimulationError(null);

        const result = await simulateNullCleaning({
            session_id: sessionId,
            column: selectedColumn,
            method: selectedMethod,
            fill_value: fillValue || undefined
        });

        if (result) {
            setSimulationResult(result);
        } else {
            setSimulationError('Error al simular la limpieza');
        }
    };

    const handleApplyCleaning = async () => {
        if (!selectedColumn) return;

        const result = await cleanNulls({
            session_id: sessionId,
            column: selectedColumn,
            method: selectedMethod,
            fill_value: fillValue || undefined
        });

        if (result) {
            setSimulationResult(null);
            setSelectedColumn('');
            setFillValue('');
            onApply();
        }
    };

    const requiresFillValue = selectedMethod === 'constant' || selectedMethod === 'custom_value';

    return (
        <div className="w-80 border-l border-gray-200 bg-gray-50 flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Beaker className="w-5 h-5 text-teal-600" />
                    Gestionar Nulos
                </h3>
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4 flex-1 overflow-y-auto">
                {/* Column Selection */}
                <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Columna</Label>
                    <Select value={selectedColumn} onValueChange={setSelectedColumn}>
                        <SelectTrigger className="bg-white">
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
                        <p className="text-xs text-green-600 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            ¡Tus datos están completos!
                        </p>
                    )}
                </div>

                {/* Method Selection */}
                <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Método de Imputación</Label>
                    <Select value={selectedMethod} onValueChange={(val) => setSelectedMethod(val as NullHandlingMethod)}>
                        <SelectTrigger className="bg-white">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="mean">Media (numérico)</SelectItem>
                            <SelectItem value="median">Mediana (numérico)</SelectItem>
                            <SelectItem value="mode">Moda (más frecuente)</SelectItem>
                            <SelectItem value="ffill">Forward Fill (time-series)</SelectItem>
                            <SelectItem value="bfill">Backward Fill (time-series)</SelectItem>
                            <SelectItem value="custom_value">Valor Personalizado</SelectItem>
                            <SelectItem value="date_interpolation">Interpolación (fechas)</SelectItem>
                            <SelectItem value="drop">Eliminar Filas</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Fill Value Input (conditional) */}
                {requiresFillValue && (
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Valor de Relleno</Label>
                        <Input
                            type="text"
                            value={fillValue}
                            onChange={(e) => setFillValue(e.target.value)}
                            placeholder="Ingresa el valor..."
                            className="bg-white"
                        />
                        <p className="text-xs text-gray-500">
                            Acepta texto, números enteros o decimales
                        </p>
                    </div>
                )}

                {/* Simulate Button */}
                <div className="pt-2">
                    <Button
                        onClick={handleSimulate}
                        disabled={isLoading || !selectedColumn || (requiresFillValue && !fillValue)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Simulando...
                            </>
                        ) : (
                            <>
                                <Beaker className="w-4 h-4" />
                                🧪 Simular Impacto
                            </>
                        )}
                    </Button>
                </div>

                {/* Simulation Error */}
                {simulationError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                        {simulationError}
                    </div>
                )}

                {/* Simulation Results */}
                {simulationResult && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                        {/* Impact Card */}
                        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                                <AlertTriangle className="w-4 h-4 text-amber-500" />
                                Impacto Estimado
                            </div>

                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Filas afectadas:</span>
                                    <span className="font-semibold text-gray-900">
                                        {simulationResult.rows_affected}
                                    </span>
                                </div>

                                {simulationResult.information_loss_percent > 0 && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">Pérdida de datos:</span>
                                        <span className="font-semibold text-red-600 flex items-center gap-1">
                                            <TrendingDown className="w-3 h-3" />
                                            {simulationResult.information_loss_percent.toFixed(1)}%
                                        </span>
                                    </div>
                                )}

                                {simulationResult.distribution_change && (
                                    <div className="pt-2 border-t border-gray-100">
                                        <p className="text-xs text-gray-500 mb-2">Cambio estadístico:</p>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div>
                                                <span className="text-gray-500">Media:</span>
                                                <div className="font-mono">
                                                    <span className="text-gray-400">
                                                        {simulationResult.distribution_change.mean_before?.toFixed(2)}
                                                    </span>
                                                    {' → '}
                                                    <span className="text-teal-600 font-semibold">
                                                        {simulationResult.distribution_change.mean_after?.toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-gray-500">Desv. Est.:</span>
                                                <div className="font-mono">
                                                    <span className="text-gray-400">
                                                        {simulationResult.distribution_change.std_before?.toFixed(2)}
                                                    </span>
                                                    {' → '}
                                                    <span className="text-teal-600 font-semibold">
                                                        {simulationResult.distribution_change.std_after?.toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Preview Table */}
                        {simulationResult.sample_preview.length > 0 && (
                            <div className="bg-white border border-gray-200 rounded-lg p-4">
                                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                                    Vista Previa (primeras {simulationResult.sample_preview.length} filas)
                                </h4>
                                <div className="space-y-2">
                                    {simulationResult.sample_preview.map((preview, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs"
                                        >
                                            <div className="flex-1">
                                                <span className="text-gray-500">Fila {preview.row_index + 1}:</span>
                                            </div>
                                            <div className="flex items-center gap-2 flex-1">
                                                <span className="font-mono text-gray-400 line-through">
                                                    {preview.value_before === null ? 'null' : String(preview.value_before)}
                                                </span>
                                                <span className="text-gray-400">→</span>
                                                <span className="font-mono text-teal-600 font-semibold">
                                                    {preview.value_after === null ? 'null' : String(preview.value_after)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Apply Button */}
                        <Button
                            onClick={handleApplyCleaning}
                            disabled={isLoading}
                            className="w-full bg-teal-600 hover:bg-teal-700 text-white gap-2"
                        >
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <CheckCircle2 className="w-4 h-4" />
                            )}
                            ✅ Aplicar Limpieza
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
