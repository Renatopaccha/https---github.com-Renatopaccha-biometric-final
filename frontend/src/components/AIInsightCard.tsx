import { Sparkles, AlertCircle, CheckCircle2, TrendingUp } from 'lucide-react';

export function AIInsightCard() {
  return (
    <div className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-lg border border-teal-200 sticky top-0">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-gray-900">Interpretación IA</h3>
        </div>

        <div className="space-y-4">
          {/* Main Summary */}
          <div className="bg-white rounded-lg p-4 border border-teal-100">
            <p className="text-sm text-gray-700 leading-relaxed">
              El análisis revela diferencias significativas entre grupos en las variables <strong>Glucosa</strong> (p &lt; 0.001) y <strong>Presión Arterial</strong> (p = 0.012), sugiriendo efectos del tratamiento sobre estos biomarcadores.
            </p>
          </div>

          {/* Key Findings */}
          <div className="space-y-3">
            <div className="text-xs text-gray-600 mb-2">Hallazgos Principales</div>
            
            <div className="flex items-start gap-3 bg-white rounded-lg p-3 border border-green-100">
              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm text-gray-900 mb-1">Homogeneidad Basal</div>
                <p className="text-xs text-gray-600">
                  La distribución de edad (p = 0.621) e IMC (p = 0.093) es similar entre grupos, confirmando una asignación aleatoria adecuada
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-white rounded-lg p-3 border border-red-100">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm text-gray-900 mb-1">Outliers Detectados</div>
                <p className="text-xs text-gray-600">
                  Se identificaron 3 valores atípicos en Glucosa que podrían requerir análisis de sensibilidad
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-white rounded-lg p-3 border border-blue-100">
              <TrendingUp className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm text-gray-900 mb-1">Tendencia Observable</div>
                <p className="text-xs text-gray-600">
                  El IMC muestra una tendencia marginal (p = 0.093) que podría alcanzar significancia con mayor muestra
                </p>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-white rounded-lg p-4 border border-teal-100">
            <div className="text-sm text-gray-900 mb-2">Recomendaciones</div>
            <ul className="text-xs text-gray-600 space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-teal-600 flex-shrink-0">•</span>
                <span>Verificar pruebas de normalidad para variables continuas</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal-600 flex-shrink-0">•</span>
                <span>Considerar análisis multivariado ajustando por covariables</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal-600 flex-shrink-0">•</span>
                <span>Evaluar poder estadístico para diferencias no significativas</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-teal-200">
          <p className="text-xs text-gray-500 italic">
            Análisis generado automáticamente. Verificar con criterio estadístico profesional.
          </p>
        </div>
      </div>
    </div>
  );
}
