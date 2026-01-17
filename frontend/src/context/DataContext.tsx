import { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import type { DatasetHealthReport, DataRow } from '../types/api';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api/v1';

interface DataContextType {
    sessionId: string | null;
    setSessionId: (id: string | null) => void;
    data: DataRow[];
    setData: (data: DataRow[]) => void;
    columns: string[];
    setColumns: (columns: string[]) => void;  // ✅ NUEVO: Exponemos setColumns
    totalRows: number;
    healthReport: DatasetHealthReport | null;
    isLoading: boolean;
    error: string | null;
    refreshData: (skip?: number, limit?: number) => Promise<void>;
    refreshHealthReport: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
    const [sessionId, setSessionIdState] = useState<string | null>(null);
    const [data, setData] = useState<DataRow[]>([]);
    const [columns, setColumns] = useState<string[]>([]);
    const [totalRows, setTotalRows] = useState<number>(0);
    const [healthReport, setHealthReport] = useState<DatasetHealthReport | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Helper to persist session ID - memoized to prevent unnecessary re-renders
    const setSessionId = useCallback((id: string | null) => {
        setSessionIdState(id);
        if (id) {
            localStorage.setItem('biometric_session_id', id);
        } else {
            localStorage.removeItem('biometric_session_id');
            // Reset state on logout/clear
            setData([]);
            setColumns([]);
            setTotalRows(0);
            setHealthReport(null);
        }
    }, []);

    // Restore session on mount
    useEffect(() => {
        const savedSession = localStorage.getItem('biometric_session_id');
        if (savedSession) {
            setSessionIdState(savedSession);
        }
    }, []);

    const refreshData = useCallback(async (skip = 0, limit = 50) => {
        if (!sessionId) return;

        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(
                `${API_BASE_URL}/data?session_id=${sessionId}&skip=${skip}&limit=${limit}`
            );

            // AUTO-RECUPERACIÓN: Si la sesión no existe (404), reiniciar app
            if (response.status === 404) {
                console.warn("Sesión expirada o no encontrada (404). Reiniciando...");
                setSessionId(null);
                return;
            }

            // AUTO-RECUPERACIÓN: Si la sesión no existe (404), reiniciar app
            if (response.status === 404) {
                console.warn("Sesión expirada o no encontrada (404). Reiniciando...");
                setSessionId(null);
                return;
            }

            if (!response.ok) {
                throw new Error('Error al cargar datos');
            }

            const result = await response.json();
            setData(result.data || []);
            setColumns(result.columns || []);
            setTotalRows(result.total_rows || 0);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconocido');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [sessionId]);

    const refreshHealthReport = useCallback(async () => {
        if (!sessionId) return;

        try {
            const response = await fetch(
                `${API_BASE_URL}/cleaning/quality?session_id=${sessionId}`
            );

            // AUTO-RECUPERACIÓN: Si la sesión no existe (404), reiniciar app
            if (response.status === 404) {
                console.warn("Sesión expirada o no encontrada (404). Reiniciando...");
                setSessionId(null);
                return;
            }

            if (response.ok) {
                const result = await response.json();
                setHealthReport(result.report);
            }
        } catch (err) {
            console.error('Error fetching health report:', err);
        }
    }, [sessionId]);

    // Initial fetch when session is set (optional, or let components trigger it)
    // For now, we won't auto-fetch indiscriminately to avoid double fetching with pagination logic,
    // but if session is restored, we might want to fetch initial state.
    // We'll let the consumer (DataTable) trigger the specific fetch with pagination parameters.

    // Memoize context value to prevent unnecessary re-renders
    const contextValue = useMemo(() => ({
        sessionId,
        setSessionId,
        data,
        setData,
        columns,
        setColumns,
        totalRows,
        healthReport,
        isLoading,
        error,
        refreshData,
        refreshHealthReport
    }), [
        sessionId,
        setSessionId,
        data,
        columns,
        totalRows,
        healthReport,
        isLoading,
        error,
        refreshData,
        refreshHealthReport
    ]);

    return (
        <DataContext.Provider value={contextValue}>
            {children}
        </DataContext.Provider>
    );
}

export function useDataContext() {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useDataContext must be used within a DataProvider');
    }
    return context;
}
