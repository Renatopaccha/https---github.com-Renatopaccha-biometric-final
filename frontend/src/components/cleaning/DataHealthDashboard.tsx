import { Activity, AlertTriangle, Database, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import type { DatasetHealthReport } from '../../types/api';
import { ColumnQualityCard } from './ColumnQualityCard';

interface DataHealthDashboardProps {
    report: DatasetHealthReport;
}

export function DataHealthDashboard({ report }: DataHealthDashboardProps) {
    const [isExpanded, setIsExpanded] = useState(true);

    // Calculate health score color
    const getHealthColor = (score: number) => {
        if (score >= 90) return 'text-green-600 bg-green-50 border-green-200';
        if (score >= 70) return 'text-amber-600 bg-amber-50 border-amber-200';
        return 'text-red-600 bg-red-50 border-red-200';
    };

    const healthColor = getHealthColor(report.overall_completeness);

    return (
        <div className="bg-white rounded-lg border border-gray-200 mb-4">
            {/* Header */}
            <div className="border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                            <Activity className="w-5 h-5 text-teal-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">Diagnóstico de Salud del Dataset</h3>
                            <p className="text-sm text-gray-600">Análisis inteligente de calidad de datos</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                    >
                        {isExpanded ? 'Contraer' : 'Expandir'}
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {isExpanded && (
                <div className="p-6">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        {/* Total Rows */}
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-lg p-4">
                            <div className="flex items-center gap-3 mb-2">
                                <Database className="w-5 h-5 text-blue-600" />
                                <span className="text-sm font-medium text-blue-900">Total Registros</span>
                            </div>
                            <div className="text-3xl font-bold text-blue-900">
                                {report.total_rows.toLocaleString()}
                            </div>
                            <div className="text-xs text-blue-700 mt-1">
                                {report.total_columns} columnas
                            </div>
                        </div>

                        {/* Overall Completeness */}
                        <div className={`border-2 rounded-lg p-4 ${healthColor}`}>
                            <div className="flex items-center gap-3 mb-2">
                                <Activity className="w-5 h-5" />
                                <span className="text-sm font-medium">Salud Global</span>
                            </div>
                            <div className="text-3xl font-bold">
                                {report.overall_completeness.toFixed(1)}%
                            </div>
                            <div className="w-full bg-white/50 rounded-full h-2 mt-2">
                                <div
                                    className={`h-2 rounded-full ${report.overall_completeness >= 90 ? 'bg-green-600' :
                                            report.overall_completeness >= 70 ? 'bg-amber-600' :
                                                'bg-red-600'
                                        }`}
                                    style={{ width: `${report.overall_completeness}%` }}
                                />
                            </div>
                        </div>

                        {/* Anomalies */}
                        <div className={`border-2 rounded-lg p-4 ${report.total_anomalies > 0
                                ? 'bg-red-50 border-red-200 text-red-900'
                                : 'bg-green-50 border-green-200 text-green-900'
                            }`}>
                            <div className="flex items-center gap-3 mb-2">
                                <AlertTriangle className="w-5 h-5" />
                                <span className="text-sm font-medium">Anomalías</span>
                            </div>
                            <div className="text-3xl font-bold">
                                {report.total_anomalies.toLocaleString()}
                            </div>
                            <div className="text-xs mt-1">
                                {report.total_anomalies > 0 ? 'Outliers (IQR)' : 'Sin outliers'}
                            </div>
                        </div>

                        {/* Duplicates & Inconsistencies */}
                        <div className={`border-2 rounded-lg p-4 ${(report.duplicate_rows + report.total_inconsistencies) > 0
                                ? 'bg-amber-50 border-amber-200 text-amber-900'
                                : 'bg-green-50 border-green-200 text-green-900'
                            }`}>
                            <div className="flex items-center gap-3 mb-2">
                                <Copy className="w-5 h-5" />
                                <span className="text-sm font-medium">Problemas</span>
                            </div>
                            <div className="text-3xl font-bold">
                                {(report.duplicate_rows + report.total_inconsistencies).toLocaleString()}
                            </div>
                            <div className="text-xs mt-1">
                                {report.duplicate_rows} duplicados, {report.total_inconsistencies} inconsistencias
                            </div>
                        </div>
                    </div>

                    {/* Column Quality Cards */}
                    <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <span className="w-1 h-4 bg-teal-600 rounded"></span>
                            Análisis por Columna ({Object.keys(report.columns).length} columnas)
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                            {Object.values(report.columns).map((column) => (
                                <ColumnQualityCard key={column.column_name} column={column} />
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
