"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

interface PhotoModalProps {
  src: string | null;
  caption?: string;
  onClose: () => void;
}

export function PhotoModal({ src, caption, onClose }: PhotoModalProps) {
  useEffect(() => {
    if (!src) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [src, onClose]);

  if (!src) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-[2px] print:hidden"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Pratinjau Foto Serah Terima"
    >
      <div
        className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 text-white">
          <p className="truncate text-sm font-semibold">
            {caption || "Foto Bukti Serah Terima (Overhandle)"}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup pratinjau foto"
            className="rounded-lg p-1 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex max-h-[75vh] items-center justify-center bg-black p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={caption || "Bukti Foto Serah Terima"}
            className="max-h-[70vh] w-auto rounded-lg object-contain"
          />
        </div>
      </div>
    </div>
  );
}
