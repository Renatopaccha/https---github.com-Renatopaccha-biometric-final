import { useState, useMemo, useEffect } from 'react';
import { Search, CheckSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { useDataCleaning } from '../../hooks/useDataCleaning';

interface ColumnManagerDialogProps {
    isOpen: boolean;
    onClose: () => void;
    columns: string[];
    sessionId: string;
    onSuccess: () => void;
}

export function ColumnManagerDialog({
    isOpen,
    onClose,
    columns = [],
    sessionId,
    onSuccess
}: ColumnManagerDialogProps) {
    const { filterColumns, isLoading } = useDataCleaning();

    // Estado inicial
    const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');

    // Sincronizar estado cuando se abre el modal
    useEffect(() => {
        if (isOpen && columns.length > 0) {
            // Por defecto seleccionamos todas las columnas existentes
            setSelectedColumns(new Set(columns));
        }
    }, [isOpen, columns]);

    // Filtrar columnas basado en búsqueda
    const filteredColumns = useMemo(() => {
        if (!columns) return [];
        if (!searchTerm.trim()) return columns;
        const lowerSearch = searchTerm.toLowerCase();
        return columns.filter(col => col.toLowerCase().includes(lowerSearch));
    }, [columns, searchTerm]);

    // Toggle columna individual
    const toggleColumn = (column: string) => {
        const newSelected = new Set(selectedColumns);
        if (newSelected.has(column)) {
            newSelected.delete(column);
        } else {
            newSelected.add(column);
        }
        setSelectedColumns(newSelected);
    };

    // Toggle seleccionar todo
    const toggleAll = () => {
        const allFilteredSelected = filteredColumns.length > 0 && filteredColumns.every(col => selectedColumns.has(col));
        const newSelected = new Set(selectedColumns);

        if (allFilteredSelected) {
            filteredColumns.forEach(col => newSelected.delete(col));
        } else {
            filteredColumns.forEach(col => newSelected.add(col));
        }

        setSelectedColumns(newSelected);
    };

    const handleApply = async () => {
        if (selectedColumns.size === 0) {
            alert('Debes mantener al menos una columna');
            return;
        }

        const result = await filterColumns({
            session_id: sessionId,
            columns_to_keep: Array.from(selectedColumns)
        });

        if (result && result.success) {
            onSuccess();
        }
    };

    const allFilteredSelected = filteredColumns.length > 0 &&
        filteredColumns.every(col => selectedColumns.has(col));

    // Si no está abierto, no renderizamos nada
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden m-4">

                {/* Header */}
                <div className="p-6 pb-4 border-b flex justify-between items-start bg-white">
                    <div>
                        <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-900">
                            <CheckSquare className="w-5 h-5 text-teal-600" />
                            Gestionar Columnas
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Desmarca las columnas que deseas eliminar de la base de datos.
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-hidden flex flex-col p-6 py-4 bg-gray-50/30">
                    {/* Buscador */}
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Buscar variable..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 bg-white"
                        />
                    </div>

                    {/* Barra de Selección Total */}
                    <div className="flex items-center justify-between px-3 py-2 bg-white rounded-md border border-gray-200 mb-2 shadow-sm">
                        <div className="flex items-center gap-2">
                            <Checkbox
                                checked={allFilteredSelected}
                                onCheckedChange={toggleAll}
                                id="select-all"
                            />
                            <label
                                htmlFor="select-all"
                                className="text-sm font-medium cursor-pointer text-gray-700 select-none"
                            >
                                {allFilteredSelected ? 'Deseleccionar Todo' : 'Seleccionar Todo'}
                            </label>
                        </div>
                        <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">
                            {selectedColumns.size} / {columns.length} activas
                        </span>
                    </div>

                    {/* Lista de Columnas */}
                    <ScrollArea className="flex-1 border rounded-md bg-white">
                        <div className="p-2 space-y-1">
                            {filteredColumns.length > 0 ? (
                                filteredColumns.map((column) => {
                                    const isSelected = selectedColumns.has(column);
                                    return (
                                        <div
                                            key={column}
                                            onClick={() => toggleColumn(column)}
                                            className={`flex items-center gap-3 p-2.5 rounded-md transition-all cursor-pointer border select-none ${isSelected
                                                    ? 'bg-teal-50 border-teal-100'
                                                    : 'hover:bg-gray-50 border-transparent'
                                                }`}
                                        >
                                            <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={() => toggleColumn(column)}
                                                className="data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600"
                                            />
                                            <span className={`text-sm flex-1 truncate ${isSelected ? 'font-medium text-teal-900' : 'text-gray-600'}`}>
                                                {column}
                                            </span>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-10 text-gray-400 flex flex-col items-center gap-2">
                                    <Search className="w-8 h-8 opacity-20" />
                                    <p>No se encontraron columnas</p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>

                {/* Footer */}
                <div className="p-6 pt-4 border-t bg-gray-50 flex justify-end gap-3">
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleApply}
                        disabled={isLoading || selectedColumns.size === 0}
                        className="bg-teal-600 hover:bg-teal-700 text-white min-w-[140px] shadow-sm"
                    >
                        {isLoading ? 'Aplicando...' : `Guardar Cambios`}
                    </Button>
                </div>
            </div>
        </div>
    );
}
