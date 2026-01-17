import { useState, useRef, useCallback } from 'react';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_BASE_URL = `${BASE_URL}/api/v1`;

interface CorrelationPairData {
    r: number | null;
    p_value: number | null;
    n: number | null;
    is_significant: boolean;
}

interface CorrelationMatrixResult {
    method: string;
    variables: string[];
    matrix: { [var1: string]: { [var2: string]: CorrelationPairData } };
}

export interface CorrelationResponse {
    success: boolean;
    message: string;
    session_id: string;
    segments: string[];
    tables: { [segment: string]: { [method: string]: CorrelationMatrixResult } };
    segment_by: string | null;
    analyzed_columns: string[];
}

export interface CorrelationRequest {
    session_id: string;
    columns: string[];
    methods: string[];
    group_by?: string | null;
}

export const useCorrelations = () => {
    const [correlationData, setCorrelationData] = useState<CorrelationResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const calculateCorrelations = useCallback(async (
        sessionId: string,
        columns: string[],
        methods: string[],
        groupBy?: string | null
    ): Promise<CorrelationResponse | null> => {
        if (!sessionId || columns.length < 2) {
            console.warn('[useCorrelations] Invalid parameters:', { sessionId, columnsCount: columns.length });
            return null;
        }

        // Cancel previous request if exists (avoids race conditions)
        if (abortControllerRef.current) {
            console.log('[useCorrelations] Aborting previous request');
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        setLoading(true);
        setError(null);

        try {
            const payload: CorrelationRequest = {
                session_id: sessionId,
                columns: columns,
                methods: methods,
                group_by: groupBy === 'General' ? null : groupBy
            };

            console.log('[useCorrelations] 📡 Fetching correlations:', payload);

            const response = await fetch(`${API_BASE_URL}/stats/correlations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: abortControllerRef.current.signal
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `HTTP error ${response.status}`);
            }

            const data: CorrelationResponse = await response.json();
            console.log('[useCorrelations] ✅ Correlations received:', data);
            setCorrelationData(data);
            return data;

        } catch (err: any) {
            if (err.name === 'AbortError') {
                console.log('[useCorrelations] Request aborted');
                return null;
            }
            console.error('[useCorrelations] ❌ Error:', err);
            const errorMessage = err instanceof Error ? err.message : 'Error calculating correlations';
            setError(errorMessage);
            setCorrelationData(null);
            return null;

        } finally {
            setLoading(false);
        }
    }, []);

    return { correlationData, loading, error, calculateCorrelations };
};
