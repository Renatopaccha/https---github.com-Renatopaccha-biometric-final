import { Upload, FileSpreadsheet, Database, Filter, Download } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function DataExplorer() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Explorador de Datos</h2>
          <p className="text-gray-500">Gestiona, limpia y visualiza tus datasets.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Database className="mr-2 h-4 w-4" />
            Conectar SQL
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Upload className="mr-2 h-4 w-4" />
            Importar CSV/Excel
          </Button>
        </div>
      </div>

      {/* Área vacía de estado inicial */}
      <Card className="border-dashed border-2">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-16 w-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
            <FileSpreadsheet className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No hay datos cargados</h3>
          <p className="text-gray-500 max-w-sm mb-6">
            Sube un archivo Excel o CSV para comenzar a realizar análisis estadísticos, limpieza de datos y modelado.
          </p>
          <Button>Seleccionar Archivo</Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Variables Detectadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Observaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Celdas Vacías</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0%</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}