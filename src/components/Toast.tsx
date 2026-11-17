"use client";

import { CircleCheck, Info, TriangleExclamationPoint, X } from "lucide-react";

export type ToastTone = "success" | "warning" | "info";

export interface ToastState {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastProps {
  toast: ToastState | null;
  onDismiss: () => void;
}

const TONE_STYLES: Record<ToastTone, string> = {
  success: "border-emerald-700/20 bg-slate-900 text-white",
  warning: "border-amber-500/40 bg-amber-950 text-amber-50",
  info: "border-slate-700 bg-slate-900 text-white",
};

export function Toast({ toast, onDismiss }: ToastProps) {
  if (!toast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 bottom-4 z-50 flex justify-center sm:inset-x-auto sm:right-6 sm:bottom-6 print:hidden"
    >
      <div
        className={`flex w-full max-w-md items-center gap-3 rounded-xl border px-4 py-3 shadow-lg ${TONE_STYLES[toast.tone]}`}
      >
        {toast.tone === "success" && (
          <CircleCheck className="h-5 w-5 shrink-0 text-emerald-400" aria-hidden="true" />
        )}
        {toast.tone === "warning" && (
          <TriangleExclamationPoint
            className="h-5 w-5 shrink-0 text-amber-400"
            aria-hidden="true"
          />
        )}
        {toast.tone === "info" && (
          <Info className="h-5 w-5 shrink-0 text-sky-400" aria-hidden="true" />
        )}
        <p className="flex-1 text-sm font-medium leading-snug">{toast.message}</p>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Tutup notifikasi"
          className="rounded-lg p-1 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
