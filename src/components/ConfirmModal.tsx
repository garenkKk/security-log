"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  Eye,
  EyeOff,
  LoaderCircle,
  Lock,
  Trash,
  TriangleExclamationPoint,
} from "lucide-react";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  busy?: boolean;
  requirePin?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function getAuthorizationPin(): string {
  const configured = process.env.NEXT_PUBLIC_ADMIN_PIN?.trim();
  return configured && configured.length > 0 ? configured : "1234";
}

function ConfirmModalDialog({
  title,
  description,
  confirmLabel = "Ya, Hapus",
  busy = false,
  requirePin = true,
  onConfirm,
  onCancel,
}: Omit<ConfirmModalProps, "open">) {
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState("");

  const expectedPin = getAuthorizationPin();
  const numericOnlyPin = /^\d+$/.test(expectedPin);

  useEffect(() => {
    if (busy) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [busy, onCancel]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;

    if (requirePin) {
      const entered = pin.trim();
      if (!entered) {
        setPinError("Masukkan PIN otorisasi Danru / HOD terlebih dahulu.");
        return;
      }
      if (entered !== expectedPin) {
        setPinError("PIN otorisasi salah. Hubungi Danru / HOD Security untuk izin hapus.");
        return;
      }
    }

    setPinError("");
    onConfirm();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[1px] print:hidden"
      onClick={() => {
        if (!busy) onCancel();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
            <TriangleExclamationPoint className="h-5 w-5" />
          </div>
          <div>
            <h3 id="confirm-modal-title" className="text-base font-bold text-slate-900">
              {title}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">{description}</p>
          </div>
        </div>

        {requirePin && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            <label
              htmlFor="admin-auth-pin"
              className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-700"
            >
              <Lock className="h-3.5 w-3.5 text-slate-600" aria-hidden="true" />
              <span>PIN Otorisasi Danru / HOD</span>
            </label>

            <div className="relative">
              <input
                id="admin-auth-pin"
                type={showPin ? "text" : "password"}
                inputMode={numericOnlyPin ? "numeric" : "text"}
                autoComplete="off"
                autoFocus
                disabled={busy}
                maxLength={24}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  if (pinError) setPinError("");
                }}
                placeholder="Masukkan PIN Danru / HOD"
                aria-invalid={Boolean(pinError)}
                className={`h-11 w-full rounded-xl border bg-white pr-11 pl-3.5 font-mono text-sm font-semibold tracking-widest text-slate-900 placeholder:font-sans placeholder:tracking-normal placeholder:font-normal placeholder:text-slate-400 focus:outline-none ${
                  pinError
                    ? "border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/15"
                    : "border-slate-300 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPin((prev) => !prev)}
                disabled={busy}
                aria-label={showPin ? "Sembunyikan PIN" : "Tampilkan PIN"}
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-xl text-slate-500 transition-colors hover:text-slate-900"
              >
                {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {pinError ? (
              <p className="mt-1.5 text-xs font-semibold text-rose-700" role="alert">
                {pinError}
              </p>
            ) : (
              <p className="mt-1.5 text-[11px] text-slate-500">
                Hanya Danru / HOD Security yang berwenang menghapus arsip laporan shift.
              </p>
            )}
          </div>
        )}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={busy || (requirePin && pin.trim().length === 0)}
            className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-55"
          >
            {busy ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                <span>Menghapus...</span>
              </>
            ) : (
              <>
                <Trash className="h-4 w-4" />
                <span>{confirmLabel}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export function ConfirmModal({ open, ...rest }: ConfirmModalProps) {
  if (!open) return null;
  return <ConfirmModalDialog {...rest} />;
}
