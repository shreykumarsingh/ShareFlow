
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { Download, Eye, Lock, AlertCircle, FileText, Image, Video, Copy, ShieldCheck, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../services/api';
import { FileMetadata } from '../types';

const DownloadPage: React.FC = () => {
  const { user } = useUser();
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

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDeleteFile = async () => {
    setIsDeleting(true);
    const targetId = file?.id || id!;
    const removeFromStorage = () => {
      const savedHistory = JSON.parse(localStorage.getItem('recent_uploads') || '[]');
      localStorage.setItem('recent_uploads', JSON.stringify(savedHistory.filter((item: any) => item.id !== targetId)));

      const recentFiles = JSON.parse(localStorage.getItem('uploadedFilesHistory') || '[]');
      localStorage.setItem('uploadedFilesHistory', JSON.stringify(recentFiles.filter((item: any) => item.id !== targetId)));
    };

    try {
      await apiService.deleteFile(targetId, user?.id);
      removeFromStorage();
      toast.success(`Deleted "${file?.original_name || 'File'}" successfully!`, { duration: 5000 });
      setTimeout(() => {
        window.location.href = '/';
      }, 2500);
    } catch (error: any) {
      console.error('Delete error:', error);
      const errMessage = error.error || error.message || '';
      if (error.status === 404 || errMessage.includes('404') || errMessage.toLowerCase().includes('not found')) {
        removeFromStorage();
        toast.success(`File was already deleted.`, { duration: 5000 });
        setTimeout(() => {
          window.location.href = '/';
        }, 2500);
      } else {
        toast.error(errMessage || 'Failed to delete file', { duration: 5000 });
      }
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
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

                  {(!file?.is_edit_locked || (user?.id && file?.user_id === user?.id)) && (
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-6 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center space-x-2 transition-all shadow-sm"
                      title="Delete File"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Delete File</span>
                    </button>
                  )}
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

      {/* Modern Custom Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-100 shadow-2xl space-y-6">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-extrabold text-slate-900">Delete Shared File?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Are you sure you want to permanently delete <strong className="text-slate-800">"{file?.original_name || 'this file'}"</strong>? Access to this share link will be revoked.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteFile}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-md disabled:opacity-50 flex items-center justify-center space-x-1.5"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Yes, Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DownloadPage;