/**
 * Table1 Component - Renders comparative statistics table (Tabla 1)
 * Displays group comparisons with dynamic columns based on grouping variable
 */

import type { Table1Row } from '../types/stats';

interface Table1Props {
  data: Table1Row[];
}

export function Table1({ data }: Table1Props) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white border rounded-lg p-6 text-center text-gray-500">
        No hay datos disponibles para mostrar
      </div>
    );
  }

  // Extract unique group column names from first row
  const groupColumns = Object.keys(data[0].groups);

  return (
    <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b bg-gray-50">
        <h3 className="font-medium text-gray-900">Tabla 1 - Comparación entre Grupos</h3>
        <p className="text-sm text-gray-500 mt-1">
          Estadísticas descriptivas y tests de comparación
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Variable / Característica
              </th>
              {groupColumns.map((groupCol) => (
                <th
                  key={groupCol}
                  className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider"
                >
                  {groupCol}
                </th>
              ))}
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                P-Valor
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                Test Estadístico
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row, idx) => {
              const isIndented = row.variable.startsWith('   ');
              const isHeader = row.variable.startsWith('**');

              return (
                <tr
                  key={idx}
                  className={`
                    ${isHeader ? 'bg-gray-50 font-semibold' : ''}
                    ${row.is_significant ? 'bg-yellow-50' : ''}
                    hover:bg-gray-50 transition-colors
                  `}
                >
                  <td
                    className={`px-6 py-4 text-sm text-gray-900 ${isIndented ? 'pl-12 text-gray-600' : ''
                      } ${isHeader ? 'font-semibold' : ''}`}
                  >
                    {row.variable.replace(/\*\*/g, '')}
                  </td>

                  {groupColumns.map((groupCol) => (
                    <td
                      key={groupCol}
                      className="px-6 py-4 text-sm text-center text-gray-900"
                    >
                      {row.groups[groupCol] || '-'}
                    </td>
                  ))}

                  <td
                    className={`px-6 py-4 text-sm text-center font-medium ${row.is_significant
                        ? 'text-red-600'
                        : 'text-gray-900'
                      }`}
                  >
                    {row.p_value || '-'}
                    {row.is_significant && ' *'}
                  </td>

                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    {row.test_used || '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="px-6 py-4 bg-gray-50 border-t">
        <div className="flex items-center gap-6 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-50 border border-yellow-200 rounded"></div>
            <span>* Estadísticamente significativo (p &lt; 0.05)</span>
          </div>
          <div>
            <strong>Formato:</strong> Media ± Desviación Estándar | Mediana (IQR)
          </div>
        </div>
      </div>
    </div>
  );
}
