import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, AlertCircle } from 'lucide-react';
import { DragDropZoneProps } from '../../types';

const DragDropZone: React.FC<DragDropZoneProps> = ({
  onFilesSelected,
  accept,
  maxFiles = 5,
  maxSize = 100 * 1024 * 1024, // 100MB default
  disabled = false,
  children,
}) => {
  const [rejectedFiles, setRejectedFiles] = useState<any[]>([]);

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: any[]) => {
      if (fileRejections.length > 0) {
        setRejectedFiles(fileRejections);
      } else {
        setRejectedFiles([]);
      }
      
      if (acceptedFiles.length > 0) {
        onFilesSelected(acceptedFiles);
      }
    },
    [onFilesSelected]
  );

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragReject,
  } = useDropzone({
    onDrop,
    accept: accept ? { [accept]: [] } : undefined,
    maxFiles,
    maxSize,
    disabled,
    multiple: maxFiles > 1,
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const clearRejectedFiles = () => {
    setRejectedFiles([]);
  };

  if (children) {
    return (
      <div {...getRootProps()} className="w-full">
        <input {...getInputProps()} />
        {children}
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Light Clean Drop Zone */}
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-200 cursor-pointer bg-white
          ${isDragActive && !isDragReject
            ? 'border-blue-500 bg-blue-50/50 shadow-md'
            : isDragReject
            ? 'border-red-500 bg-red-50/50 shadow-md'
            : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/80 shadow-sm'
          }
          ${disabled ? 'cursor-not-allowed opacity-50' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center space-y-3">
          <div className={`p-4 rounded-2xl transition-all ${
            isDragActive && !isDragReject
              ? 'bg-blue-100 text-blue-600 scale-110'
              : isDragReject
              ? 'bg-red-100 text-red-600'
              : 'bg-blue-50 text-blue-600'
          }`}>
            <Upload className="h-10 w-10" />
          </div>
          
          {isDragActive ? (
            isDragReject ? (
              <p className="text-red-600 font-semibold text-base">
                Some files are not supported or exceed {formatFileSize(maxSize)}
              </p>
            ) : (
              <p className="text-blue-600 font-bold text-lg">
                Drop your files now to upload...
              </p>
            )
          ) : (
            <div className="space-y-1">
              <p className="text-xl font-bold text-slate-800">
                Drag & drop files here, or <span className="text-blue-600 underline underline-offset-4 hover:text-blue-700">browse</span>
              </p>
              <p className="text-xs text-slate-500">
                Max <span className="text-slate-700 font-semibold">{maxFiles}</span> files • Up to <span className="text-slate-700 font-semibold">{formatFileSize(maxSize)}</span> per file
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Rejected Files Banner */}
      {rejectedFiles.length > 0 && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <h4 className="text-sm font-semibold text-red-800">
                Some files could not be added
              </h4>
            </div>
            <button
              onClick={clearRejectedFiles}
              className="text-red-500 hover:text-red-700 p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <div className="space-y-2">
            {rejectedFiles.map(({ file, errors }, index) => (
              <div key={index} className="text-xs bg-white p-2.5 rounded-lg border border-red-100 shadow-sm">
                <div className="flex items-center space-x-2">
                  <File className="h-4 w-4 text-red-500" />
                  <span className="font-semibold text-red-700">{file.name}</span>
                </div>
                <ul className="ml-6 mt-1 space-y-1">
                  {errors.map((error: any, errorIndex: number) => (
                    <li key={errorIndex} className="text-red-600">
                      • {error.message}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DragDropZone;