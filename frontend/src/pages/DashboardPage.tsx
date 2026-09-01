import React, { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { FileText, Upload, Download, Link2, Copy, Eye, Trash2, LayoutDashboard, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import DragDropZone from '../components/Upload/DragDropZone';
import apiService from '../services/api';
import { FileUploadState, UploadResponse } from '../types';

const DashboardPage: React.FC = () => {
  const { user } = useUser();
  const [isUploading, setIsUploading] = useState(false);
  const [allUploadedFiles, setAllUploadedFiles] = useState<FileUploadState[]>([]);
  const [showTextNotes, setShowTextNotes] = useState(false);
  const [textContent, setTextContent] = useState('');
  const [expiresInHours, setExpiresInHours] = useState<number>(168);

  React.useEffect(() => {
    const fetchUserFiles = async () => {
      if (!user?.id) return;
      try {
        const response = await apiService.getUserFiles(1, 50, user.id);
        if (response.success && response.files) {
          const loadedStates: FileUploadState[] = response.files.map((fileMeta) => ({
            file: new File([], fileMeta.original_name),
            progress: { loaded: fileMeta.size_bytes, total: fileMeta.size_bytes, percentage: 100 },
            status: 'completed',
            result: {
              file: fileMeta,
              shareable_link: `${window.location.origin}/download/${fileMeta.custom_slug || fileMeta.id}`,
              can_preview: true
            }
          }));
          setAllUploadedFiles(loadedStates);
        }
      } catch (error) {
        console.error('Failed to fetch user files from Supabase:', error);
      }
    };

    fetchUserFiles();
  }, [user?.id]);

  const handleFilesSelected = async (selectedFiles: File[]) => {
    let files = selectedFiles;
    if (files.length > 5) {
      toast.error('Maximum 5 files allowed per upload request! Slicing to first 5 files.');
      files = files.slice(0, 5);
    }

    setIsUploading(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        const response: UploadResponse = await apiService.uploadFile(
          file,
          {
            user_id: user?.id,
            text_content: textContent.trim() ? textContent : undefined,
            expires_in_hours: expiresInHours
          }
        );

        const completedState: FileUploadState = {
          file,
          progress: { loaded: file.size, total: file.size, percentage: 100 },
          status: 'completed',
          result: {
            file: response.file,
            shareable_link: response.shareable_link,
            can_preview: response.can_preview,
          },
        };

        setAllUploadedFiles((prev) => [completedState, ...prev]);

        // Save local history
        const recentFiles = JSON.parse(localStorage.getItem('uploadedFilesHistory') || '[]');
        recentFiles.unshift({
          id: response.file.id,
          original_name: response.file.original_name,
          shareable_link: response.shareable_link,
          size_formatted: response.file.size_formatted,
          created_at: response.file.created_at
        });
        localStorage.setItem('uploadedFilesHistory', JSON.stringify(recentFiles.slice(0, 50)));

        toast.success(`Uploaded ${file.name} successfully!`);
      } catch (error: any) {
        console.error(`Error uploading ${file.name}:`, error);
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    setIsUploading(false);
  };

  const handleTextNoteOnlySubmit = async () => {
    if (!textContent.trim()) {
      toast.error('Please enter some text notes to share!');
      return;
    }

    setIsUploading(true);
    try {
      const response: UploadResponse = await apiService.uploadFile(
        null,
        {
          user_id: user?.id,
          text_content: textContent.trim(),
          expires_in_hours: expiresInHours
        }
      );

      const completedState: FileUploadState = {
        file: new File([], response.file.original_name),
        progress: { loaded: response.file.size_bytes, total: response.file.size_bytes, percentage: 100 },
        status: 'completed',
        result: {
          file: response.file,
          shareable_link: response.shareable_link,
          can_preview: response.can_preview,
        },
      };

      setAllUploadedFiles((prev) => [completedState, ...prev]);
      setTextContent('');

      // Save local history
      const recentFiles = JSON.parse(localStorage.getItem('uploadedFilesHistory') || '[]');
      recentFiles.unshift({
        id: response.file.id,
        original_name: response.file.original_name,
        shareable_link: response.shareable_link,
        size_formatted: response.file.size_formatted,
        created_at: response.file.created_at
      });
      localStorage.setItem('uploadedFilesHistory', JSON.stringify(recentFiles.slice(0, 50)));

      toast.success('Text note created & share link generated!');
    } catch (error: any) {
      console.error('Text note upload error:', error);
      toast.error(error.message || 'Failed to share text note');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteFile = async (fileId: string, fileName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${fileName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await apiService.deleteFile(fileId, user?.id);
      
      setAllUploadedFiles((prev) => prev.filter((item) => item.result?.file.id !== fileId));
      
      const recentFiles = JSON.parse(localStorage.getItem('uploadedFilesHistory') || '[]');
      const updatedHistory = recentFiles.filter((item: any) => item.id !== fileId);
      localStorage.setItem('uploadedFilesHistory', JSON.stringify(updatedHistory));

      toast.success(`Deleted "${fileName}" successfully!`);
    } catch (error: any) {
      console.error('Failed deleting file:', error);
      toast.error(error.error || error.message || 'Failed to delete file');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Link copied to clipboard!');
  };

  const getDisplaySize = (file: File, resultFile?: any) => {
    if (resultFile && resultFile.size_formatted) {
      return resultFile.size_formatted;
    }
    const bytes = file.size;
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* User Welcome Banner */}
        <div className="bg-white rounded-3xl p-8 mb-8 border border-slate-100 flex items-center justify-between shadow-xl">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-md">
              {user?.firstName ? user.firstName[0].toUpperCase() : '👤'}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                Welcome back, {user?.firstName || 'User'}!
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Manage your shared files, text notes, and analytics from your personal dashboard.
              </p>
            </div>
          </div>
        </div>

        {/* Dashboard Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-emerald-50 text-emerald-600 rounded-2xl p-3">
                <Upload className="h-6 w-6" />
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Uploads</p>
                <p className="text-3xl font-extrabold text-slate-900 mt-1">
                  {allUploadedFiles.length}
                </p>
              </div>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div className="bg-emerald-500 h-1.5 rounded-full" style={{width: `${Math.min(100, (allUploadedFiles.length / 10) * 100)}%`}}></div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-purple-50 text-purple-600 rounded-2xl p-3">
                <Download className="h-6 w-6" />
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Downloads</p>
                <p className="text-3xl font-extrabold text-slate-900 mt-1">
                  {allUploadedFiles.reduce((total, state) => total + (state.result?.file.download_count || 0), 0)}
                </p>
              </div>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div className="bg-purple-500 h-1.5 rounded-full" style={{width: `${Math.min(100, (allUploadedFiles.reduce((total, state) => total + (state.result?.file.download_count || 0), 0) / 50) * 100)}%`}}></div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-blue-50 text-blue-600 rounded-2xl p-3">
                <Link2 className="h-6 w-6" />
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Links</p>
                <p className="text-3xl font-extrabold text-slate-900 mt-1">
                  {allUploadedFiles.filter(state => state.result && !state.result.file.is_expired).length}
                </p>
              </div>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div className="bg-blue-500 h-1.5 rounded-full" style={{width: `${Math.min(100, (allUploadedFiles.filter(state => state.result && !state.result.file.is_expired).length / 10) * 100)}%`}}></div>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-3xl p-8 mb-8 border border-slate-100 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-3 mr-4 text-white shadow-md">
                <Upload className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Upload Files & Notes</h2>
                <p className="text-xs text-slate-500">Upload documents or add text notes under one share link</p>
              </div>
            </div>

            <button
              onClick={() => setShowTextNotes(!showTextNotes)}
              className="flex items-center space-x-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 rounded-xl text-xs font-bold transition-all"
            >
              <FileText className="h-4 w-4" />
              <span>{showTextNotes ? 'Hide Text Notes' : '+ Add Text Notes'}</span>
            </button>
          </div>

          {/* Expandable Text Notes Panel */}
          {showTextNotes && (
            <div className="mb-6 p-6 bg-slate-50 rounded-2xl border border-slate-200 animate-fade-in-up">
              <label className="flex items-center text-xs font-bold text-slate-800 mb-2">
                <FileText className="w-4 h-4 text-blue-600 mr-2" />
                <span>Text Notes / Code Snippets</span>
              </label>
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Paste notes, instructions, or code snippets to share together with your uploaded files, or click 'Share Note Link Only' below..."
                rows={4}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-xs text-slate-900 placeholder-slate-400 resize-y shadow-sm mb-3"
              />
              {textContent.trim() && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleTextNoteOnlySubmit}
                    disabled={isUploading}
                    className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Generate Share Link for Text Note Only</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Auto Expiry Customizer Bar */}
          <div className="mb-6 bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-700">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>Auto Expiry Timer:</span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setExpiresInHours(1)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  expiresInHours === 1
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                ⚡ 1 Hour
              </button>
              <button
                type="button"
                onClick={() => setExpiresInHours(24)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  expiresInHours === 24
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                📅 24 Hours (1 Day)
              </button>
              <button
                type="button"
                onClick={() => setExpiresInHours(168)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  expiresInHours === 168
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                🗓️ 7 Days (Max)
              </button>
            </div>
          </div>

          <div className="relative">
            <DragDropZone 
              onFilesSelected={handleFilesSelected}
              maxFiles={5}
              disabled={isUploading}
            />

            {isUploading && (
              <div className="absolute inset-0 bg-white/90 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-blue-200">
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
                  <span className="text-blue-600 font-semibold text-sm">Processing uploads...</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Uploaded Files Table List */}
        {allUploadedFiles.length > 0 && (
          <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
              <LayoutDashboard className="w-5 h-5 text-blue-600 mr-2.5" />
              <span>Your Uploaded Files & Pages</span>
            </h2>

            <div className="space-y-4">
              {allUploadedFiles.map((state, index) => (
                <div 
                  key={state.result?.file.id || index}
                  className="bg-slate-50 border border-slate-200 rounded-2xl p-5 hover:border-slate-300 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="font-semibold text-slate-900 text-sm truncate">
                        {state.file.name || state.result?.file.original_name}
                      </p>
                      {state.result?.file.text_content && (
                        <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-md font-medium border border-blue-200">
                          📝 Notes Attached
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1.5">
                      <span>Size: {getDisplaySize(state.file, state.result?.file)}</span>
                      <span>•</span>
                      <span>Downloads: <strong className="text-slate-800">{state.result?.file.download_count || 0}</strong></span>
                      <span>•</span>
                      <span>Uploaded: {state.result?.file.created_at ? new Date(state.result.file.created_at).toLocaleDateString() : 'Just now'}</span>
                    </div>
                  </div>

                  {state.result && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => copyToClipboard(state.result!.shareable_link)}
                        className="flex items-center space-x-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 rounded-xl text-xs font-semibold transition-all"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Link</span>
                      </button>

                      <button
                        onClick={() => window.open(state.result!.shareable_link, '_blank')}
                        className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>

                      <button
                        onClick={() => handleDeleteFile(state.result!.file.id, state.result!.file.original_name)}
                        className="flex items-center space-x-1 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-xs font-semibold transition-all"
                        title="Delete File"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;