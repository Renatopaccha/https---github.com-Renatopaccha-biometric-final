import { Upload, FileSpreadsheet } from 'lucide-react';
import { useState, useRef } from 'react';
import type { UploadResponse } from '../types/api';

interface FileUploadZoneProps {
  onUploadSuccess: (response: UploadResponse) => void;
}

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_BASE_URL = `${BASE_URL}/api/v1`;

export function FileUploadZone({ onUploadSuccess }: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al subir el archivo');
      }

      const data: UploadResponse = await response.json();

      // Pass the complete response to parent
      // Parent will decide what to do based on status ('ready' or 'selection_required')
      onUploadSuccess(data);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al subir archivo';
      setError(errorMessage);
      console.error('Upload error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (file: File | undefined) => {
    if (!file) return;

    // Validate file extension
    const validExtensions = ['.csv', '.xlsx', '.xls'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!validExtensions.includes(fileExtension)) {
      setError(`Formato no válido. Use: ${validExtensions.join(', ')}`);
      return;
    }

    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024; // 50MB in bytes
    if (file.size > maxSize) {
      setError('El archivo excede el tamaño máximo de 50MB');
      return;
    }

    uploadFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    handleFileSelect(file);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-8">
      <div
        className={`border-2 border-dashed rounded-lg p-16 text-center transition-all ${isDragging
          ? 'border-teal-500 bg-teal-50'
          : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center gap-4">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${isUploading ? 'bg-teal-100' : 'bg-teal-50'
            }`}>
            <Upload className={`w-7 h-7 text-teal-600 ${isUploading ? 'animate-pulse' : ''
              }`} />
          </div>

          <div>
            <h3 className="text-gray-900 mb-1">
              {isUploading ? 'Subiendo archivo...' : 'Importar Dataset'}
            </h3>
            <p className="text-sm text-gray-600">
              {isUploading
                ? 'Por favor espera mientras procesamos tu archivo'
                : 'Arrastra y suelta tu archivo aquí o haz clic para seleccionar'
              }
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileInputChange}
            className="hidden"
            disabled={isUploading}
          />

          <button
            onClick={handleButtonClick}
            disabled={isUploading}
            className={`px-5 py-2.5 rounded-md transition-colors text-sm ${isUploading
              ? 'bg-gray-400 text-white cursor-not-allowed'
              : 'bg-teal-600 text-white hover:bg-teal-700'
              }`}
          >
            {isUploading ? 'Procesando...' : 'Seleccionar Archivo'}
          </button>

          {error && (
            <div className="mt-2 px-4 py-2 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
            <div className="flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4" />
              <span>Formatos: .csv, .xlsx, .xls</span>
            </div>
            <span>•</span>
            <span>Tamaño máximo: 50MB</span>
          </div>
        </div>
      </div>
    </div>
  );
}
