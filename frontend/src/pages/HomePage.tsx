import React, { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Link2, Shield, Clock, CheckCircle, Copy, Eye, Zap, Sparkles, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import DragDropZone from '../components/Upload/DragDropZone';
import apiService from '../services/api';
import { FileUploadState, UploadResponse } from '../types';

const HomePage: React.FC = () => {
  const { user } = useUser();
  const [uploadStates, setUploadStates] = useState<FileUploadState[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [expiresInHours, setExpiresInHours] = useState<number>(168);
  const [showTextNotes, setShowTextNotes] = useState(false);
  const [textContent, setTextContent] = useState('');

  const handleFilesSelected = async (selectedFiles: File[]) => {
    let files = selectedFiles;
    if (files.length > 5) {
      toast.error('Maximum 5 files allowed per upload request! Slicing to first 5 files.');
      files = files.slice(0, 5);
    }

    const newUploadStates: FileUploadState[] = files.map((file) => ({
      file,
      progress: { loaded: 0, total: file.size, percentage: 0 },
      status: 'pending',
    }));

    setUploadStates(newUploadStates);
    setIsUploading(true);

    // Upload files one by one
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        setUploadStates((prev) =>
          prev.map((state, index) =>
            index === i ? { ...state, status: 'uploading' } : state
          )
        );

        const response: UploadResponse = await apiService.uploadFile(
          file,
          {
            user_id: user?.id,
            text_content: textContent.trim() ? textContent : undefined,
            expires_in_hours: expiresInHours
          },
          (percentage) => {
            setUploadStates((prev) =>
              prev.map((state, index) =>
                index === i
                  ? {
                      ...state,
                      progress: {
                        ...state.progress,
                        percentage,
                      },
                    }
                  : state
              )
            );
          }
        );

        setUploadStates((prev) =>
          prev.map((state, index) =>
            index === i
              ? {
                  ...state,
                  status: 'completed',
                  result: {
                    file: response.file,
                    shareable_link: response.shareable_link,
                    can_preview: response.can_preview,
                  },
                }
              : state
          )
        );

        toast.success(`Uploaded ${file.name} successfully!`);
      } catch (error: any) {
        console.error(`Error uploading ${file.name}:`, error);
        setUploadStates((prev) =>
          prev.map((state, index) =>
            index === i
              ? {
                  ...state,
                  status: 'error',
                  error: error.message || 'Upload failed',
                }
              : state
          )
        );

        toast.error(`Failed to upload ${file.name}`);
      }
    }

    setTextContent('');
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

      setUploadStates((prev) => [completedState, ...prev]);
      setTextContent('');
      toast.success('Text note created & share link generated!');
    } catch (error: any) {
      console.error('Text note upload error:', error);
      toast.error(error.message || 'Failed to share text note');
    } finally {
      setIsUploading(false);
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
    <div className="relative bg-gradient-to-b from-[#f8fafc] via-[#f1f5f9]/50 to-[#ffffff] py-14 px-4 sm:px-6 lg:px-8 overflow-hidden min-h-screen">
      {/* Soft Ambient Light Glows */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-r from-blue-400/10 via-indigo-400/10 to-purple-400/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 max-w-5xl mx-auto">
        {/* Beautiful Light Hero Section */}
        <div className="text-center mb-14 animate-fade-in-up">
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-200/80 text-blue-700 text-xs font-bold uppercase tracking-wider mb-6 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Fast & Secure Encrypted Sharing</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-slate-900 leading-[1.15] mb-6 tracking-tight">
            Share Files & Notes <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Instantly & Securely
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto mb-8 leading-relaxed font-normal">
            Upload files, attach notes, and generate instant encrypted share links. <br className="hidden sm:inline" />
            Works seamlessly across all your devices. ⚡
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-semibold text-slate-700">
            <div className="flex items-center space-x-2 bg-white/90 backdrop-blur-md px-4 py-2.5 rounded-full border border-slate-200 shadow-sm">
              <Shield className="w-4 h-4 text-emerald-500" />
              <span>Secure SSL Encryption</span>
            </div>
            <div className="flex items-center space-x-2 bg-white/90 backdrop-blur-md px-4 py-2.5 rounded-full border border-slate-200 shadow-sm">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>Automated Cleanup</span>
            </div>
            <div className="flex items-center space-x-2 bg-white/90 backdrop-blur-md px-4 py-2.5 rounded-full border border-slate-200 shadow-sm">
              <Zap className="w-4 h-4 text-blue-600" />
              <span>Instant Share Links</span>
            </div>
          </div>
        </div>

        {/* Beautiful Light Upload Card Container */}
        <div className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-[0_20px_50px_-15px_rgba(0,0,0,0.06)] p-8 sm:p-12 mb-14 border border-slate-100 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
              <div className="text-center sm:text-left">
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-1 tracking-tight">Upload Files or Share Notes</h2>
                <p className="text-xs sm:text-sm text-slate-500">Drag & drop files, attach notes, or share text snippets directly</p>
              </div>

              <button
                onClick={() => setShowTextNotes(!showTextNotes)}
                className="flex items-center space-x-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                <FileText className="h-4 w-4" />
                <span>{showTextNotes ? 'Hide Text Notes' : '+ Add Text Note / Code'}</span>
              </button>
            </div>

            {/* Expandable Text Notes Input Area */}
            {showTextNotes && (
              <div className="mb-6 p-5 bg-slate-50 border border-slate-200 rounded-2xl animate-fade-in-up">
                <label className="flex items-center text-xs font-bold text-slate-800 mb-2">
                  <FileText className="w-4 h-4 text-blue-600 mr-2" />
                  <span>Text Notes / Code Snippets</span>
                </label>
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Type or paste text notes, instructions, or code snippets here. You can attach it to files or click 'Share Note Link Only' below..."
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
                      <Zap className="w-3.5 h-3.5" />
                      <span>Generate Share Link for Text Note Only</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Auto Expiry Customizer Bar */}
            <div className="mb-6 bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-inner">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-700">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>Set Auto Expiry Duration:</span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setExpiresInHours(1)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    expiresInHours === 1
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                      : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-100/80'
                  }`}
                >
                  ⚡ 1 Hour
                </button>
                <button
                  type="button"
                  onClick={() => setExpiresInHours(24)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    expiresInHours === 24
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                      : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-100/80'
                  }`}
                >
                  📅 24 Hours (1 Day)
                </button>
                <button
                  type="button"
                  onClick={() => setExpiresInHours(168)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    expiresInHours === 168
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                      : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-100/80'
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
                <div className="absolute inset-0 bg-white/95 backdrop-blur-md rounded-2xl flex items-center justify-center border border-blue-200 shadow-xl">
                  <div className="flex items-center space-x-4">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent"></div>
                    <div>
                      <p className="text-blue-600 font-extrabold text-sm">Uploading files securely...</p>
                      <p className="text-xs text-slate-500">Encrypting & generating your share link</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Upload Progress & Completed Files List */}
        {uploadStates.length > 0 && (
          <div className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] p-8 sm:p-10 mb-14 border border-slate-100 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.06)]">
            <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center">
              <CheckCircle className="w-5 h-5 text-emerald-500 mr-2.5" />
              <span>Upload Results & Share Links</span>
            </h3>

            <div className="space-y-4">
              {uploadStates.map((state, index) => (
                <div 
                  key={index}
                  className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-5 hover:border-blue-300 transition-colors shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 truncate text-sm">
                        {state.file.name}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Size: {getDisplaySize(state.file, state.result?.file)}
                      </p>

                      {/* Progress Bar */}
                      {state.status === 'uploading' && (
                        <div className="mt-3">
                          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div 
                              className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${state.progress.percentage}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-blue-600 font-bold mt-1 text-right">
                            {state.progress.percentage}%
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Result Share Actions */}
                    {state.status === 'completed' && state.result && (
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => copyToClipboard(state.result!.shareable_link)}
                          className="flex items-center space-x-1.5 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 rounded-xl text-xs font-bold transition-all shadow-sm"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Link</span>
                        </button>

                        <button
                          onClick={() => window.open(state.result!.shareable_link, '_blank')}
                          className="flex items-center space-x-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Page</span>
                        </button>
                      </div>
                    )}

                    {state.status === 'error' && (
                      <span className="text-xs text-red-600 font-semibold bg-red-50 px-3.5 py-2 rounded-xl border border-red-200">
                        ⚠️ {state.error || 'Upload failed'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3 Elevated Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-2xl p-4 w-fit mb-6 group-hover:scale-110 transition-transform">
              <Shield className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-2">Encrypted & Private</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-normal">
              Your files are stored securely with database encryption. Automated expiry guarantees maximum privacy protection. 🔒
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="bg-blue-50 text-blue-600 border border-blue-100 rounded-2xl p-4 w-fit mb-6 group-hover:scale-110 transition-transform">
              <Link2 className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-2">Instant Sharing</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-normal">
              Generate shareable URLs instantly. Works seamlessly across phones, laptops, tablets, and lab computers. 🌍
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="bg-purple-50 text-purple-600 border border-purple-100 rounded-2xl p-4 w-fit mb-6 group-hover:scale-110 transition-transform">
              <Clock className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-2">Auto Cleanup</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-normal">
              Customize expiry from 1 Hour to 7 Days. Files automatically delete themselves so nothing stays online longer than needed. ⏰
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;