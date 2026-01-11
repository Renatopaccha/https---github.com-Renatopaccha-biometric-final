import { useState } from 'react';
import type {
    QualityReportResponse,
    NullHandlingRequest,
    NullHandlingResponse,
    DuplicateRemovalRequest,
    DuplicateRemovalResponse,
    RowDeletionRequest,
    RowDeletionResponse,
    SimulationRequest,
    SimulationResponse,
    UndoRequest,
    UndoResponse,
    ColumnFilterRequest,
    ColumnFilterResponse,
    EmptyRowsResponse
} from '../types/api';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_BASE_URL = `${BASE_URL}/api/v1`;

export function useDataCleaning() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchQualityReport = async (sessionId: string): Promise<QualityReportResponse | null> => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(
                `${API_BASE_URL}/cleaning/quality?session_id=${sessionId}`
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al obtener reporte de calidad');
            }

            const data: QualityReportResponse = await response.json();
            return data;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
            setError(errorMessage);
            console.error('Quality report error:', err);
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    const cleanNulls = async (
        request: NullHandlingRequest
    ): Promise<NullHandlingResponse | null> => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/cleaning/nulls`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al limpiar valores nulos');
            }

            const data: NullHandlingResponse = await response.json();
            return data;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
            setError(errorMessage);
            console.error('Clean nulls error:', err);
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    const simulateNullCleaning = async (
        request: SimulationRequest
    ): Promise<SimulationResponse | null> => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/cleaning/nulls/simulate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al simular limpieza');
            }

            const data: SimulationResponse = await response.json();
            return data;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
            setError(errorMessage);
            console.error('Simulation error:', err);
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    const removeDuplicates = async (
        request: DuplicateRemovalRequest
    ): Promise<DuplicateRemovalResponse | null> => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/cleaning/duplicates`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al eliminar duplicados');
            }

            const data: DuplicateRemovalResponse = await response.json();
            return data;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
            setError(errorMessage);
            console.error('Remove duplicates error:', err);
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    const deleteRows = async (
        request: RowDeletionRequest
    ): Promise<RowDeletionResponse | null> => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/cleaning/delete-rows`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al eliminar filas');
            }

            const data: RowDeletionResponse = await response.json();
            return data;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
            setError(errorMessage);
            console.error('Delete rows error:', err);
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    const undoLastChange = async (sessionId: string): Promise<boolean> => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/cleaning/undo`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ session_id: sessionId }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al deshacer cambio');
            }

            const data: UndoResponse = await response.json();
            return data.success;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
            setError(errorMessage);
            console.error('Undo error:', err);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const filterColumns = async (
        request: ColumnFilterRequest
    ): Promise<ColumnFilterResponse | null> => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/cleaning/filter-columns`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al filtrar columnas');
            }

            const data: ColumnFilterResponse = await response.json();
            return data;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
            setError(errorMessage);
            console.error('Filter columns error:', err);
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    const checkEmptyRows = async (sessionId: string): Promise<EmptyRowsResponse | null> => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(
                `${API_BASE_URL}/cleaning/empty-rows?session_id=${sessionId}`
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al detectar filas vacías');
            }

            const data: EmptyRowsResponse = await response.json();
            return data;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
            setError(errorMessage);
            console.error('Check empty rows error:', err);
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    const downloadDataset = async (sessionId: string, filename: string): Promise<boolean> => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(
                `${API_BASE_URL}/export/dataset/${sessionId}`
            );

            if (!response.ok) {
                throw new Error('Error al descargar el dataset');
            }

            // Convert response to blob
            const blob = await response.blob();

            // Create temporary URL and download
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${filename}_clean.xlsx`;
            document.body.appendChild(link);
            link.click();

            // Clean up
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            return true;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
            setError(errorMessage);
            console.error('Download dataset error:', err);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const downloadAuditReport = async (sessionId: string): Promise<boolean> => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(
                `${API_BASE_URL}/export/audit-report/${sessionId}`
            );

            if (!response.ok) {
                throw new Error('Error al descargar el reporte de auditoría');
            }

            // Convert response to blob
            const blob = await response.blob();

            // Generate filename with timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const filename = `reporte_auditoria_${timestamp}.txt`;

            // Create temporary URL and download
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();

            // Clean up
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            return true;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
            setError(errorMessage);
            console.error('Download audit report error:', err);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    return {
        isLoading,
        error,
        fetchQualityReport,
        cleanNulls,
        simulateNullCleaning,
        removeDuplicates,
        deleteRows,
        undoLastChange,
        filterColumns,
        checkEmptyRows,
        downloadDataset,
        downloadAuditReport,
    };
}
