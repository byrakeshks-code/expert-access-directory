'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Upload, Trash2, Copy, Edit2, FolderPlus, RefreshCw, Check, X, Image as ImageIcon,
  FileText, Film, Music, Archive, ChevronRight, Download, Eye,
} from 'lucide-react';
import { api } from '@/lib/api';

interface MediaFile {
  id?: string;
  name: string;
  path: string;
  bucket: string;
  url: string;
  metadata?: { size?: number; mimetype?: string };
  created_at?: string;
}

const BUCKETS = ['media', 'avatars', 'verification-docs'];

function formatSize(bytes?: number) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico'].includes(ext)) return ImageIcon;
  if (['mp4', 'webm', 'avi', 'mov'].includes(ext)) return Film;
  if (['mp3', 'wav', 'ogg'].includes(ext)) return Music;
  if (['zip', 'tar', 'gz', 'rar'].includes(ext)) return Archive;
  return FileText;
}

function isImage(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico'].includes(ext);
}

export default function MediaManagerPage() {
  const [bucket, setBucket] = useState('media');
  const [folder, setFolder] = useState('');
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<MediaFile | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ bucket });
      if (folder) params.set('folder', folder);
      const res = await api.get<any>(`/admin/media?${params}`);
      const list = Array.isArray(res) ? res : res.data || [];
      setFiles(list);
    } catch (err) {
      console.error('Failed to load media:', err);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [bucket, folder]);

  useEffect(() => {
    fetchFiles();
    setSelected(new Set());
  }, [fetchFiles]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    try {
      for (let i = 0; i < fileList.length; i++) {
        const formData = new FormData();
        formData.append('file', fileList[i]);
        formData.append('bucket', bucket);
        if (folder) formData.append('folder', folder);
        await api.upload('/admin/media/upload', formData);
      }
      fetchFiles();
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (paths: string[]) => {
    if (!confirm(`Delete ${paths.length} file(s)?`)) return;
    try {
      await api.delete('/admin/media', { bucket, paths });
      setSelected(new Set());
      fetchFiles();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleRename = async (file: MediaFile) => {
    if (!newName.trim() || newName === file.name) {
      setRenaming(null);
      return;
    }
    const dir = file.path.substring(0, file.path.lastIndexOf('/') + 1);
    const newPath = dir + newName.trim();
    try {
      await api.post('/admin/media/rename', {
        bucket: file.bucket,
        oldPath: file.path,
        newPath,
      });
      setRenaming(null);
      fetchFiles();
    } catch (err: any) {
      alert(`Rename failed: ${err.message}`);
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(null), 2000);
  };

  const toggleSelect = (path: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });
  };

  const breadcrumbs = folder ? folder.split('/').filter(Boolean) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Media Manager</h1>
          <p className="text-sm text-gray-500 mt-1">Upload, manage, and copy URLs for images and files</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchFiles}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleUpload}
            accept="image/*,video/*,.pdf,.doc,.docx"
          />
        </div>
      </div>

      {/* Bucket selector */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700">Bucket:</label>
        <div className="flex gap-2">
          {BUCKETS.map((b) => (
            <button
              key={b}
              onClick={() => { setBucket(b); setFolder(''); }}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                bucket === b
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-gray-500">
        <button
          onClick={() => setFolder('')}
          className="hover:text-blue-600 font-medium"
        >
          {bucket}
        </button>
        {breadcrumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1">
            <ChevronRight className="w-3 h-3" />
            <button
              onClick={() => setFolder(breadcrumbs.slice(0, i + 1).join('/'))}
              className="hover:text-blue-600"
            >
              {crumb}
            </button>
          </span>
        ))}
      </div>

      {/* Actions bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
          <span className="text-sm text-blue-700 font-medium">{selected.size} selected</span>
          <button
            onClick={() => handleDelete(Array.from(selected))}
            className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-sm text-gray-500 hover:text-gray-700 ml-auto"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* New folder */}
      {showNewFolder && (
        <div className="flex items-center gap-2">
          <input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Folder name"
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newFolderName.trim()) {
                setFolder(folder ? `${folder}/${newFolderName.trim()}` : newFolderName.trim());
                setShowNewFolder(false);
                setNewFolderName('');
              }
              if (e.key === 'Escape') { setShowNewFolder(false); setNewFolderName(''); }
            }}
          />
          <button onClick={() => { setShowNewFolder(false); setNewFolderName(''); }}>
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      )}

      {/* File grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-100 rounded-xl aspect-square" />
          ))}
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No files in this location</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-sm text-blue-600 hover:underline mt-2"
          >
            Upload your first file
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {/* New folder button */}
          <button
            onClick={() => setShowNewFolder(true)}
            className="flex flex-col items-center justify-center aspect-square rounded-xl border-2 border-dashed border-gray-300 text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
          >
            <FolderPlus className="w-8 h-8 mb-1" />
            <span className="text-xs">New Folder</span>
          </button>

          {files.map((file) => {
            const FileIcon = getFileIcon(file.name);
            const isSelected = selected.has(file.path);
            const isImg = isImage(file.name);

            return (
              <div
                key={file.path}
                className={`group relative rounded-xl border-2 transition-all cursor-pointer ${
                  isSelected ? 'border-blue-500 bg-blue-50' : 'border-transparent bg-gray-50 hover:border-gray-300'
                }`}
              >
                {/* Checkbox */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleSelect(file.path); }}
                  className={`absolute top-2 left-2 z-10 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                    isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300 bg-white opacity-0 group-hover:opacity-100'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </button>

                {/* Thumbnail / Icon */}
                <div
                  onClick={() => isImg ? setPreview(file) : copyUrl(file.url)}
                  className="aspect-square flex items-center justify-center p-2 overflow-hidden rounded-t-xl"
                >
                  {isImg ? (
                    <img
                      src={file.url}
                      alt={file.name}
                      className="w-full h-full object-cover rounded-lg"
                      loading="lazy"
                    />
                  ) : (
                    <FileIcon className="w-10 h-10 text-gray-400" />
                  )}
                </div>

                {/* File info */}
                <div className="px-2 pb-2">
                  {renaming === file.path ? (
                    <input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onBlur={() => handleRename(file)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename(file);
                        if (e.key === 'Escape') setRenaming(null);
                      }}
                      className="w-full text-xs border border-blue-400 rounded px-1 py-0.5 outline-none"
                      autoFocus
                    />
                  ) : (
                    <p className="text-xs text-gray-700 truncate font-medium" title={file.name}>
                      {file.name}
                    </p>
                  )}
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {formatSize(file.metadata?.size)}
                  </p>
                </div>

                {/* Actions overlay */}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); copyUrl(file.url); }}
                    className="p-1 bg-white rounded-md shadow-sm border text-gray-500 hover:text-blue-600"
                    title="Copy URL"
                  >
                    {copied === file.url ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setRenaming(file.path); setNewName(file.name); }}
                    className="p-1 bg-white rounded-md shadow-sm border text-gray-500 hover:text-yellow-600"
                    title="Rename"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete([file.path]); }}
                    className="p-1 bg-white rounded-md shadow-sm border text-gray-500 hover:text-red-600"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview modal */}
      {preview && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="text-sm font-medium text-gray-900 truncate">{preview.name}</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyUrl(preview.url)}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 px-2 py-1 rounded-md hover:bg-blue-50"
                >
                  {copied === preview.url ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  Copy URL
                </button>
                <a
                  href={preview.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-700 px-2 py-1 rounded-md hover:bg-gray-100"
                >
                  <Download className="w-3 h-3" /> Open
                </a>
                <button onClick={() => setPreview(null)} className="p-1 text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-4 flex items-center justify-center bg-gray-50" style={{ maxHeight: 'calc(90vh - 120px)' }}>
              <img src={preview.url} alt={preview.name} className="max-w-full max-h-full object-contain rounded-lg" />
            </div>
            <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-between">
              <input
                readOnly
                value={preview.url}
                className="flex-1 text-xs text-gray-500 bg-white border rounded-lg px-3 py-1.5 mr-2 truncate"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={() => copyUrl(preview.url)}
                className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 flex-shrink-0"
              >
                {copied === preview.url ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
