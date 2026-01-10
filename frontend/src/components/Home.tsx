import { Zap, Target, Eye, Plus } from 'lucide-react';

export function Home() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-lg p-8 text-white">
        <div className="max-w-3xl">
          <h1 className="text-3xl mb-3">Bienvenido a Biometric, Dr. Castro</h1>
          <p className="text-teal-50 text-lg mb-6">
            Su asistente inteligente para el análisis de datos clínicos.
          </p>
          <button className="px-6 py-3 bg-white text-teal-700 rounded-md hover:bg-teal-50 transition-colors flex items-center gap-2">
            <Plus className="w-5 h-5" />
            <span>Nuevo Proyecto</span>
          </button>
        </div>
      </div>

      {/* Value Proposition Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Speed */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="w-12 h-12 bg-teal-50 rounded-lg flex items-center justify-center mb-4">
            <Zap className="w-6 h-6 text-teal-600" />
          </div>
          <h3 className="text-gray-900 mb-2">Agilidad en el Proceso</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Transforme datos brutos en insights clínicos en segundos, eliminando la limpieza manual.
          </p>
        </div>

        {/* Card 2: Precision */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="w-12 h-12 bg-teal-50 rounded-lg flex items-center justify-center mb-4">
            <Target className="w-6 h-6 text-teal-600" />
          </div>
          <h3 className="text-gray-900 mb-2">Rigor Científico</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Algoritmos validados para garantizar la reproducibilidad de su investigación.
          </p>
        </div>

        {/* Card 3: UI/UX */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="w-12 h-12 bg-teal-50 rounded-lg flex items-center justify-center mb-4">
            <Eye className="w-6 h-6 text-teal-600" />
          </div>
          <h3 className="text-gray-900 mb-2">Enfoque Visual</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Diseñado para investigadores, no solo para programadores.
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-gray-900 mb-4">Acciones Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
            <div className="text-sm text-gray-900 mb-1">Cargar Nuevo Dataset</div>
            <div className="text-xs text-gray-500">Importar archivo CSV o Excel</div>
          </button>
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
            <div className="text-sm text-gray-900 mb-1">Continuar Proyecto Reciente</div>
            <div className="text-xs text-gray-500">estudio_glucosa_2024.csv</div>
          </button>
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
            <div className="text-sm text-gray-900 mb-1">Ver Análisis Guardados</div>
            <div className="text-xs text-gray-500">3 análisis disponibles</div>
          </button>
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
            <div className="text-sm text-gray-900 mb-1">Explorar Plantillas</div>
            <div className="text-xs text-gray-500">Datasets de ejemplo</div>
          </button>
        </div>
      </div>

      {/* Inspirational Quote */}
      <div className="bg-gradient-to-r from-gray-50 to-teal-50/30 rounded-lg border border-gray-200 p-8">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xl text-gray-700 italic mb-3">
            "La estadística es la gramática de la ciencia."
          </p>
          <p className="text-sm text-gray-600">
            — Karl Pearson
          </p>
        </div>
      </div>
    </div>
  );
}
