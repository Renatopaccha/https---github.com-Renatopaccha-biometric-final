import { useState, useCallback } from 'react';

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

export function useCorrelations() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [correlationData, setCorrelationData] = useState<CorrelationResponse | null>(null);

    const calculateCorrelations = useCallback(async (
        sessionId: string,
        columns: string[],
        methods: string[],
        groupBy?: string | null
    ): Promise<CorrelationResponse | null> => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/stats/correlations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: sessionId,
                    columns,
                    methods,
                    group_by: groupBy || null
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `HTTP error ${response.status}`);
            }

            const data = await response.json();
            setCorrelationData(data);
            return data;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error calculating correlations';
            setError(errorMessage);
            setCorrelationData(null); // Reset data on error to prevent inconsistent states
            console.error('Correlation calculation error:', err);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        calculateCorrelations,
        loading,
        error,
        correlationData
    };
}
