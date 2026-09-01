import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Download, Eye, Lock, AlertCircle, FileText, Image, Video, Copy, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../services/api';
import { FileMetadata } from '../types';

const DownloadPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [file, setFile] = useState<FileMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadFileInfo();
    }
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadFileInfo = async () => {
    try {
      setLoading(true);
      const data = await apiService.getFileInfo(id!);
      
      if (data.file) {
        setFile(data.file);
        setNeedsPassword(data.file.is_password_protected);
      } else {
        throw new Error('Failed to load file information');
      }
    } catch (error: any) {
      setError(error.error || error.message || 'Failed to load file information');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const blob = await apiService.downloadFile(id!, password || undefined);
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file?.original_name || 'downloaded-file');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('✅ File downloaded successfully!');
      setDownloading(false);
    } catch (error: any) {
      toast.error('Download failed');
      setDownloading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await apiService.getFileInfo(id!, password);
      setFile(response.file);
      setNeedsPassword(false);
      toast.success('Password correct!');
    } catch (error: any) {
      toast.error(error.error || 'Invalid password');
    }
  };

  const copyTextNotes = () => {
    if (file?.text_content) {
      navigator.clipboard.writeText(file.text_content);
      toast.success('Notes copied to clipboard!');
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="h-16 w-16 text-blue-500" />;
    if (mimeType.startsWith('video/')) return <Video className="h-16 w-16 text-purple-500" />;
    return <FileText className="h-16 w-16 text-slate-500" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full p-8 rounded-3xl text-center border border-red-100 shadow-xl">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">File Not Found</h1>
          <p className="text-xs text-slate-600 mb-6">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-3xl w-full">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
          {needsPassword ? (
            <div className="p-10 text-center">
              <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-amber-500 border border-amber-200">
                <Lock className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Password Protected Page</h2>
              <p className="text-xs text-slate-600 mb-6">Enter password to view shared notes and download files.</p>
              
              <form onSubmit={handlePasswordSubmit} className="max-w-sm mx-auto">
                <div className="mb-4">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 text-sm text-slate-900 placeholder-slate-400"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white px-4 py-3 rounded-xl font-bold text-sm shadow-md transition-all"
                >
                  Unlock Page
                </button>
              </form>
            </div>
          ) : file ? (
            <>
              {/* Edit Lock Banner */}
              {file.is_edit_locked && (
                <div className="bg-purple-50 border-b border-purple-100 px-6 py-3 flex items-center justify-between text-xs text-purple-800 font-medium">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="h-4 w-4 text-purple-600" />
                    <span>Read-Only Mode: Visitors can view, copy, and download content but cannot edit or delete.</span>
                  </div>
                </div>
              )}

              <div className="p-8 sm:p-10">
                {/* Header Info */}
                <div className="text-center mb-8">
                  <div className="inline-flex p-4 rounded-2xl bg-slate-50 border border-slate-100 mb-4 shadow-sm">
                    {getFileIcon(file.mime_type)}
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
                    {file.original_name}
                  </h1>
                  <p className="text-xs text-slate-500">
                    {file.size_formatted} • Uploaded {new Date(file.created_at).toLocaleDateString()}
                  </p>
                </div>

                {/* Attached Text Notes Section */}
                {file.text_content && (
                  <div className="mb-8 bg-blue-50/60 p-6 rounded-2xl border border-blue-100">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
                        <FileText className="h-4 w-4 text-blue-600 mr-2" />
                        Attached Notes & Instructions
                      </h3>
                      <button
                        onClick={copyTextNotes}
                        className="flex items-center space-x-1 text-xs bg-white hover:bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors font-medium shadow-sm"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Notes</span>
                      </button>
                    </div>
                    <pre className="bg-white p-4 rounded-xl text-xs text-slate-800 font-mono whitespace-pre-wrap leading-relaxed border border-blue-100 max-h-80 overflow-y-auto shadow-inner">
                      {file.text_content}
                    </pre>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <button
                    onClick={handleDownload}
                    disabled={downloading}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center space-x-2 shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    <Download className="h-4 w-4" />
                    <span>{downloading ? 'Downloading...' : 'Download File'}</span>
                  </button>

                  <button
                    onClick={() => {
                      const previewUrl = apiService.getPreviewUrl(id!, password || undefined);
                      window.open(previewUrl, '_blank');
                      toast.success('Preview opened in new tab');
                    }}
                    className="bg-slate-800 hover:bg-slate-900 text-white px-8 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center space-x-2 border border-slate-700 transition-all"
                  >
                    <Eye className="h-4 w-4" />
                    <span>Preview File</span>
                  </button>
                </div>

                {file.expires_at && (
                  <p className="text-center text-xs text-slate-400 mt-6">
                    ⏰ Auto Expiry: {new Date(file.expires_at).toLocaleString()}
                  </p>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default DownloadPage;