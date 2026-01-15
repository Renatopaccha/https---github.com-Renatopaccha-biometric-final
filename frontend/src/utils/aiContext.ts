import { SummaryStatRow } from '../types/stats';

/**
 * Generates an optimized context string from the summary statistics data.
 * Filters out irrelevant variables and formats the output for the AI.
 * 
 * Rules:
 * - Excludes variables with "id", "nº", "formulario", "código", "index" (case insensitive).
 * - Excludes variables with completeness < 10% or N < 5.
 * - Formats: "Variable: Media X, DE Y (Normal/No)" or "Variable: Prevalencia X%".
 */
export function getOptimizedTableContext(data: SummaryStatRow[], totalRows: number): string {
    if (!data || data.length === 0) return "No hay datos disponibles.";

    const sensitiveKeywords = ['id', 'nº', 'formulario', 'código', 'index', 'codigo'];

    const relevantRows = data.filter(row => {
        // 1. Filter by name keywords
        const lowerName = row.variable.toLowerCase();
        if (sensitiveKeywords.some(keyword => lowerName.includes(keyword))) {
            return false;
        }

        // 2. Filter by quality/completeness
        const completeness = (row.n / totalRows) * 100;
        if (completeness < 10 || row.n < 5) {
            return false;
        }

        return true;
    });

    if (relevantRows.length === 0) return "No hay variables relevantes para analizar (todas filtradas por ID o baja calidad).";

    let context = "Resumen Estadístico del Dataset (Variables Relevantes):\n";

    relevantRows.forEach(row => {
        context += `- ${row.variable}: `;

        if (row.is_binary) {
            const percentage = row.media ? (row.media * 100).toFixed(1) : '0.0';
            context += `Prevalencia ${percentage}%`;
        } else {
            const media = row.media?.toFixed(1) || '-';
            const de = row.desvio_estandar?.toFixed(1) || '-';
            const normality = row.is_normal ? 'Dist. Normal' : 'No Normal';
            context += `Media ${media}, DE ${de} (${normality})`;
        }
        context += '\n';
    });

    return context;
}
