import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import type { ColumnQuality } from '../../types/api';

interface ColumnQualityCardProps {
    column: ColumnQuality;
}

export function ColumnQualityCard({ column }: ColumnQualityCardProps) {
    // Status colors and icons
    const statusConfig = {
        critical: {
            bg: 'bg-red-50',
            border: 'border-red-300',
            badge: 'bg-red-600',
            text: 'text-red-700',
            icon: AlertCircle,
            label: 'Crítico'
        },
        warning: {
            bg: 'bg-amber-50',
            border: 'border-amber-300',
            badge: 'bg-amber-500',
            text: 'text-amber-700',
            icon: AlertTriangle,
            label: 'Advertencia'
        },
        info: {
            bg: 'bg-blue-50',
            border: 'border-blue-300',
            badge: 'bg-blue-500',
            text: 'text-blue-700',
            icon: Info,
            label: 'Info'
        },
        ok: {
            bg: 'bg-green-50',
            border: 'border-green-300',
            badge: 'bg-green-600',
            text: 'text-green-700',
            icon: CheckCircle,
            label: 'OK'
        }
    };

    const config = statusConfig[column.status];
    const StatusIcon = config.icon;

    return (
        <div className={`rounded-lg border-2 ${config.border} ${config.bg} p-4 transition-all hover:shadow-md`}>
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                    <h4 className="font-medium text-gray-900 text-sm">{column.column_name}</h4>
                    <p className="text-xs text-gray-600 mt-0.5">{column.data_type}</p>
                </div>
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${config.badge} text-white text-xs font-medium`}>
                    <StatusIcon className="w-3 h-3" />
                    <span>{config.label}</span>
                </div>
            </div>

            {/* Completeness Bar */}
            <div className="mb-3">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>Completitud</span>
                    <span className="font-medium">{column.completeness.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                        className={`h-2 rounded-full transition-all ${column.completeness >= 90 ? 'bg-green-500' :
                                column.completeness >= 70 ? 'bg-amber-500' :
                                    'bg-red-500'
                            }`}
                        style={{ width: `${column.completeness}%` }}
                    />
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                <div className="bg-white/60 rounded px-2 py-1.5">
                    <div className="text-gray-500">Únicos</div>
                    <div className="font-medium text-gray-900">{column.unique_count.toLocaleString()}</div>
                </div>
                <div className="bg-white/60 rounded px-2 py-1.5">
                    <div className="text-gray-500">Nulos</div>
                    <div className="font-medium text-red-600">{column.missing_count.toLocaleString()}</div>
                </div>
            </div>

            {/* Numeric Range */}
            {column.min_value !== null && column.min_value !== undefined && (
                <div className="bg-white/60 rounded px-2 py-1.5 mb-2 text-xs">
                    <div className="text-gray-500 mb-0.5">Rango</div>
                    <div className="font-medium text-gray-900">
                        {column.min_value.toFixed(2)} → {column.max_value?.toFixed(2)}
                    </div>
                </div>
            )}

            {/* Issues */}
            {column.outlier_count > 0 && (
                <div className={`flex items-center gap-1.5 text-xs ${config.text} mb-2`}>
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{column.outlier_count} outliers detectados</span>
                </div>
            )}

            {column.inconsistency_count > 0 && (
                <div className={`flex items-center gap-1.5 text-xs ${config.text} mb-2`}>
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{column.inconsistency_count} inconsistencias de tipo</span>
                </div>
            )}

            {/* Suggestion */}
            <div className="pt-2 border-t border-gray-200">
                <p className={`text-xs ${config.text} font-medium`}>
                    💡 {column.suggestion}
                </p>
            </div>
        </div>
    );
}
