'use client';

import React, { useCallback, useRef, useState } from 'react';
import { ImagePlus, Loader2, Link2, RefreshCw, Trash2, UploadCloud } from 'lucide-react';
import { uploadProductImage } from '@/lib/api';

interface ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}

const MAX_MB = 15;
const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

/**
 * Drag & drop / click-to-browse food image uploader with live preview.
 * Uploads to the backend immediately and returns the public URL via onChange.
 */
export const ImageUploader: React.FC<ImageUploaderProps> = ({ value, onChange, label = 'Dish Photo' }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');

  const handleFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      setError(null);
      if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
        setError('Sirf JPG, PNG, WEBP ya GIF image upload karein.');
        return;
      }
      if (file.size > MAX_MB * 1024 * 1024) {
        setError(`Image ${MAX_MB}MB se choti honi chahiye.`);
        return;
      }
      setIsUploading(true);
      try {
        const url = await uploadProductImage(file);
        onChange(url);
      } catch (e: any) {
        setError(e?.message || 'Upload failed.');
      } finally {
        setIsUploading(false);
        if (inputRef.current) inputRef.current.value = '';
      }
    },
    [onChange]
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="font-extrabold text-stone-700 block text-xs">{label}</label>
        <button
          type="button"
          onClick={() => setShowUrlInput((s) => !s)}
          className="text-[11px] font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 cursor-pointer"
        >
          <Link2 className="h-3 w-3" />
          {showUrlInput ? 'Upload file instead' : 'Paste image URL'}
        </button>
      </div>

      <input
        ref={inputRef}
        id="dish-image-file-input"
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {value ? (
        /* Preview */
        <div className="relative group rounded-2xl overflow-hidden border border-stone-200 bg-stone-100 aspect-[16/10] shadow-xs">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Dish preview" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0" />
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shadow-2xs backdrop-blur-sm">
              ✓ Image ready
            </span>
            <div className="flex gap-1.5">
              <button
                type="button"
                id="dish-image-replace-btn"
                onClick={() => inputRef.current?.click()}
                className="px-2.5 py-1 rounded-xl bg-white/90 hover:bg-white text-stone-900 text-[11px] font-bold shadow-xs flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="h-3 w-3" /> Replace
              </button>
              <button
                type="button"
                id="dish-image-remove-btn"
                onClick={() => onChange('')}
                className="px-2.5 py-1 rounded-xl bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold shadow-xs flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="h-3 w-3" /> Remove
              </button>
            </div>
          </div>
          {isUploading && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            </div>
          )}
        </div>
      ) : showUrlInput ? (
        <div className="flex gap-2">
          <input
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            placeholder="https://example.com/dish.jpg"
            className="flex-1 rounded-xl bg-stone-50 border border-stone-200 px-3 py-2 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
          <button
            type="button"
            onClick={() => urlDraft.trim() && onChange(urlDraft.trim())}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-bold shadow-xs cursor-pointer"
          >
            Use URL
          </button>
        </div>
      ) : (
        /* Drop zone */
        <button
          type="button"
          id="dish-image-dropzone"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          disabled={isUploading}
          className={`w-full aspect-[16/9] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
            isDragging
              ? 'border-amber-500 bg-amber-50/50 scale-[1.01]'
              : 'border-stone-300 bg-stone-50/60 hover:border-amber-500 hover:bg-amber-50/30'
          }`}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-8 w-8 text-amber-600 animate-spin" />
              <span className="text-xs font-bold text-stone-700">Uploading dish photo…</span>
            </>
          ) : (
            <>
              <div className="p-3 rounded-2xl bg-amber-100 text-amber-700 border border-amber-200 shadow-2xs">
                {isDragging ? <UploadCloud className="h-6 w-6" /> : <ImagePlus className="h-6 w-6" />}
              </div>
              <span className="text-xs font-extrabold text-stone-800">
                {isDragging ? 'Chhor dein — upload ho jayegi' : 'Click to upload or drag & drop photo'}
              </span>
              <span className="text-[11px] text-stone-400">JPG, PNG, WEBP, GIF (Max {MAX_MB}MB)</span>
            </>
          )}
        </button>
      )}

      {error && <p className="text-[11px] font-bold text-red-600">⚠️ {error}</p>}
    </div>
  );
};

export default ImageUploader;
