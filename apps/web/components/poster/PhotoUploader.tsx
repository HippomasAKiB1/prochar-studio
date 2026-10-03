"use client";

import { useRef, useState } from "react";
import { UploadSimple, X, ArrowLeft, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Spinner, useToast } from "@/components/ui";
import { toBanglaNumber } from "@/lib/format";

export interface UploadedPhoto {
  url: string;
  publicId: string;
  width?: number;
  height?: number;
}

export interface PhotoUploaderProps {
  photos: UploadedPhoto[];
  onChange: (photos: UploadedPhoto[]) => void;
  error?: string;
  maxFiles?: number;
}

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export function PhotoUploader({
  photos,
  onChange,
  error,
  maxFiles = 3,
}: PhotoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const toast = useToast();

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const remainingSlots = maxFiles - photos.length;
    if (remainingSlots <= 0) {
      toast(`সর্বোচ্চ ${toBanglaNumber(maxFiles)}টি ছবি যোগ করা যাবে।`, "error");
      return;
    }

    const filesToUpload = Array.from(fileList).slice(0, remainingSlots);

    // Validate size & type
    for (const f of filesToUpload) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
        toast(`"${f.name}" ফাইলটি সমর্থিত নয়। কেবল JPEG, PNG বা WebP দিন।`, "error");
        return;
      }
      if (f.size > MAX_SIZE) {
        toast(`"${f.name}" ফাইলটির আকার ৫MB এর বেশি।`, "error");
        return;
      }
    }

    const formData = new FormData();
    for (const f of filesToUpload) {
      formData.append("photos", f);
    }

    setUploading(true);
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        const msg = errJson?.message || "ছবি আপলোড করতে ব্যর্থ হয়েছে।";
        toast(msg, "error");
        return;
      }

      const data = await res.json();
      if (data.photos && Array.isArray(data.photos)) {
        const newPhotos = [...photos, ...data.photos].slice(0, maxFiles);
        onChange(newPhotos);
        toast("ছবি সফলভাবে আপলোড হয়েছে", "success");
      }
    } catch {
      toast("নেটওয়ার্ক সমস্যার কারণে ছবি আপলোড করা যায়নি।", "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = (index: number) => {
    const updated = photos.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleMove = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= photos.length) return;
    const updated = [...photos];
    const temp = updated[index];
    updated[index] = updated[target];
    updated[target] = temp;
    onChange(updated);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={maxFiles > 1}
        className="sr-only"
        onChange={(e) => handleFiles(e.target.files)}
        disabled={uploading || photos.length >= maxFiles}
      />

      {/* When no photos are uploaded yet: large empty drop zone */}
      {photos.length === 0 && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-ink rounded bg-paper-hi hover:bg-paper focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-mustard min-h-[140px] transition-colors"
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Spinner label="আপলোড হচ্ছে..." />
              <span className="font-body text-sm font-semibold text-ink">ছবি আপলোড হচ্ছে...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="w-10 h-10 border-2 border-ink rounded flex items-center justify-center bg-paper text-ink">
                <UploadSimple size={22} weight="bold" />
              </div>
              <span className="font-display font-bold text-lg text-ink">+ ছবি দিন</span>
              <span className="font-body text-xs text-ink/75">
                সর্বোচ্চ ৩টি JPEG/PNG/WebP, প্রতিটি ৫MB পর্যন্ত
              </span>
            </div>
          )}
        </button>
      )}

      {/* When photos exist: contact-sheet row of thumbnails */}
      {photos.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            {photos.map((photo, idx) => (
              <div
                key={photo.publicId}
                className="relative border-2 border-ink rounded bg-paper-hi p-2 shadow-hard flex flex-col items-center"
              >
                {/* Number Badge */}
                <div className="absolute top-1 left-1 z-10 w-6 h-6 border-2 border-ink rounded bg-mustard font-display font-extrabold text-xs flex items-center justify-center text-ink">
                  {toBanglaNumber(idx + 1)}
                </div>

                {/* Remove Button */}
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  aria-label={`ছবি ${toBanglaNumber(idx + 1)} মুছুন`}
                  className="absolute top-1 right-1 z-10 w-6 h-6 border-2 border-ink rounded bg-press-red text-paper-hi flex items-center justify-center hover:bg-press-red-deep focus-visible:outline-none focus-visible:ring-[2px] focus-visible:ring-mustard"
                >
                  <X size={14} weight="bold" />
                </button>

                {/* Image Thumbnail */}
                <div className="w-full aspect-[3/4] border border-ink bg-paper overflow-hidden mt-6 mb-2">
                  <img
                    src={photo.url}
                    alt={`পোস্টারের ছবি ${toBanglaNumber(idx + 1)}`}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Reorder Buttons */}
                <div className="flex items-center gap-1 w-full justify-between pt-1 border-t border-ink/30">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => handleMove(idx, -1)}
                    aria-label="বামে নিন"
                    className="flex-1 py-1 flex items-center justify-center border border-ink rounded text-ink bg-paper hover:bg-lime-wash disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <ArrowLeft size={14} weight="bold" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === photos.length - 1}
                    onClick={() => handleMove(idx, 1)}
                    aria-label="ডানে নিন"
                    className="flex-1 py-1 flex items-center justify-center border border-ink rounded text-ink bg-paper hover:bg-lime-wash disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <ArrowRight size={14} weight="bold" />
                  </button>
                </div>
              </div>
            ))}

            {/* Add More Button if less than maxFiles */}
            {photos.length < maxFiles && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="border-2 border-dashed border-ink rounded bg-paper-hi hover:bg-paper flex flex-col items-center justify-center p-4 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-mustard min-h-[140px]"
              >
                {uploading ? (
                  <Spinner label="আপলোড হচ্ছে..." />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-center">
                    <span className="font-display font-extrabold text-2xl text-ink">+</span>
                    <span className="font-body text-xs font-semibold text-ink">আরও ছবি</span>
                  </div>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Error message */}
      {error && <p className="font-body text-sm font-semibold text-press-red-deep">{error}</p>}
    </div>
  );
}
