import { CheckCircle2 } from 'lucide-react';

export function StatusBar() {
  return (
    <div className="h-12 bg-white border-t border-gray-200 px-6 flex items-center justify-between text-sm">
      <div className="flex items-center gap-6 text-gray-600">
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Filas:</span>
          <span className="text-gray-900">150</span>
        </div>
        <div className="w-px h-4 bg-gray-300"></div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Columnas:</span>
          <span className="text-gray-900">12</span>
        </div>
        <div className="w-px h-4 bg-gray-300"></div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Estado:</span>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-teal-600" />
            <span className="text-teal-700">Listo</span>
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-500">
        Última modificación: Hoy, 14:32
      </div>
    </div>
  );
}
