"use client";

import { useRef, useState, type ChangeEvent } from "react";
import {
  BadgeCheck,
  Camera,
  Check,
  Clock,
  Eye,
  Handshake,
  Trash,
  TriangleExclamationPoint,
  UserCheck,
} from "lucide-react";
import { OVERHANDLE_COMMENT_MAX_LENGTH } from "@/lib/constants";
import type { OverhandleInfo } from "@/lib/types";
import { compressImageToDataUrl, getOverhandleStatus, nowHHMM } from "@/lib/utils";
import type { ToastTone } from "./Toast";

interface OverhandleSectionProps {
  overhandle: OverhandleInfo;
  activeOfficer: string;
  onChange: (updater: (prev: OverhandleInfo) => OverhandleInfo) => void;
  onPreviewPhoto: (src: string, caption: string) => void;
  onNotify: (message: string, tone?: ToastTone) => void;
}

export function OverhandleSection({
  overhandle,
  activeOfficer,
  onChange,
  onPreviewPhoto,
  onNotify,
}: OverhandleSectionProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [compressing, setCompressing] = useState(false);

  const status = getOverhandleStatus(overhandle);
  const photoSizeKB = overhandle.photoDataUrl
    ? Math.max(1, Math.round((overhandle.photoDataUrl.length * 3) / 4 / 1024))
    : 0;

  function handleCommentChange(value: string) {
    onChange((prev) => ({
      ...prev,
      comment: value.slice(0, OVERHANDLE_COMMENT_MAX_LENGTH),
    }));
  }

  async function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setCompressing(true);
    try {
      const result = await compressImageToDataUrl(file, 600, 0.7);
      onChange((prev) => ({
        ...prev,
        photoDataUrl: result.dataUrl,
      }));
      onNotify(
        `Foto bukti berhasil dikompres (${result.width}x${result.height}px, ~${result.sizeKB} KB).`,
        "success",
      );
    } catch {
      onNotify("Gagal memproses foto. Pastikan file berupa gambar yang valid.", "warning");
    } finally {
      setCompressing(false);
    }
  }

  function handleToggleHandoverSigned(checked: boolean) {
    const time = checked ? nowHHMM() : "";
    onChange((prev) => ({
      ...prev,
      handoverBy: {
        ...prev.handoverBy,
        signed: checked,
        signedAt: time,
      },
    }));
  }

  function handleToggleReceivedSigned(checked: boolean) {
    const time = checked ? nowHHMM() : "";
    onChange((prev) => ({
      ...prev,
      receivedBy: {
        ...prev.receivedBy,
        signed: checked,
        signedAt: time,
      },
    }));
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-800">
            <Handshake className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 sm:text-base">
              Serah Terima Tugas (Overhandle)
            </h2>
            <p className="text-xs text-slate-500">
              Komentar serah terima dari shift sebelumnya, bukti foto, dan tanda tangan digital 2 pihak
            </p>
          </div>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${
            status.complete
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : "border-rose-300 bg-rose-50 text-rose-800"
          }`}
        >
          {status.complete ? (
            <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
          ) : (
            <TriangleExclamationPoint className="h-3.5 w-3.5 shrink-0 text-rose-600" />
          )}
          <span>{status.complete ? "OVERHANDLE LENGKAP" : "BELUM OVERHANDLE"}</span>
        </span>
      </div>

      <div className="space-y-5">
        {/* A. Kolom Komentar Overhandle (Kustom dari Shift Sebelumnya) */}
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <label
              htmlFor="overhandle-comment"
              className="text-xs font-semibold uppercase tracking-wide text-slate-600"
            >
              Komentar / Catatan Overhandle (Dari Shift Sebelumnya)
            </label>
            <span
              className={`font-mono text-[11px] font-semibold tabular-nums ${
                overhandle.comment.length >= OVERHANDLE_COMMENT_MAX_LENGTH
                  ? "text-rose-600"
                  : "text-slate-500"
              }`}
            >
              {overhandle.comment.length} / {OVERHANDLE_COMMENT_MAX_LENGTH} huruf
            </span>
          </div>
          <textarea
            id="overhandle-comment"
            rows={4}
            maxLength={OVERHANDLE_COMMENT_MAX_LENGTH}
            value={overhandle.comment}
            onChange={(e) => handleCommentChange(e.target.value)}
            placeholder="Tulis catatan serah terima kustom dari shift sebelumnya (misalnya: kondisi kunci/HT, titipan barang tamu, pesan khusus untuk shift berikutnya)..."
            className="w-full resize-y rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 focus:outline-none"
          />
        </div>

        {/* B. Bukti Foto Serah Terima */}
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Bukti Foto Serah Terima
            </p>
            <span className="text-[11px] font-medium text-slate-500">
              Kompresi otomatis maks. lebar 600px (JPEG 0.7)
            </span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoChange}
            className="hidden"
            aria-label="Unggah atau ambil foto bukti serah terima"
          />

          {!overhandle.photoDataUrl ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={compressing}
              className="flex min-h-[64px] w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-100 disabled:opacity-60"
            >
              <Camera className="h-5 w-5 text-slate-700" aria-hidden="true" />
              <span className="text-sm font-bold">
                {compressing
                  ? "Mengompres foto..."
                  : "Ambil Foto Kamera / Pilih dari Galeri"}
              </span>
              <span className="text-xs text-slate-500">
                Dokumentasi kondisi pos, HT, kunci, atau personel overhandle
              </span>
            </button>
          ) : (
            <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() =>
                  onPreviewPhoto(
                    overhandle.photoDataUrl,
                    "Foto Bukti Serah Terima Shift Aktif",
                  )
                }
                className="group relative h-28 w-full shrink-0 overflow-hidden rounded-lg border border-slate-300 bg-white sm:w-40"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={overhandle.photoDataUrl}
                  alt="Pratinjau foto bukti serah terima"
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
                <span className="absolute right-1.5 bottom-1.5 inline-flex items-center gap-1 rounded-md bg-slate-900/80 px-2 py-0.5 text-[10px] font-semibold text-white">
                  <Eye className="h-3 w-3" />
                  Perbesar
                </span>
              </button>

              <div className="flex flex-1 flex-col justify-between gap-2">
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                    <Check className="h-3.5 w-3.5" />
                    Foto Bukti Terlampir
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    Ukuran tersimpan di browser: <span className="font-mono font-semibold">~{photoSizeKB} KB</span> (JPEG terkompresi)
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={compressing}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-800 hover:bg-slate-100"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    <span>{compressing ? "Memproses..." : "Ganti Foto"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onChange((prev) => ({ ...prev, photoDataUrl: "" }))
                    }
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-bold text-rose-700 hover:bg-rose-100"
                  >
                    <Trash className="h-3.5 w-3.5" />
                    <span>Hapus Foto</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* C. Checklist Tanda Tangan Digital 2 Pihak */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
            Checklist Tanda Tangan Digital 2 Pihak
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Pihak 1: Shift Lama */}
            <div
              className={`rounded-xl border p-3.5 transition-colors ${
                overhandle.handoverBy.signed
                  ? "border-emerald-300 bg-emerald-50/50"
                  : "border-slate-200 bg-slate-50/70"
              }`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <UserCheck className="h-4 w-4 text-slate-700" />
                  1. Petugas Menyerahkan (Shift Lama)
                </span>
                {activeOfficer.trim() && !overhandle.handoverBy.name.trim() && (
                  <button
                    type="button"
                    onClick={() =>
                      onChange((prev) => ({
                        ...prev,
                        handoverBy: {
                          ...prev.handoverBy,
                          name: activeOfficer.trim(),
                        },
                      }))
                    }
                    className="rounded px-1.5 py-0.5 text-[11px] font-semibold text-slate-600 underline hover:bg-slate-200/70"
                  >
                    Samakan Petugas
                  </button>
                )}
              </div>

              <input
                type="text"
                value={overhandle.handoverBy.name}
                onChange={(e) =>
                  onChange((prev) => ({
                    ...prev,
                    handoverBy: {
                      ...prev.handoverBy,
                      name: e.target.value,
                    },
                  }))
                }
                placeholder="Nama Petugas Shift Lama"
                className="mb-2.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none"
              />

              <label className="flex min-h-[44px] cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2">
                <input
                  type="checkbox"
                  checked={overhandle.handoverBy.signed}
                  onChange={(e) => handleToggleHandoverSigned(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-emerald-700"
                />
                <div className="min-w-0 flex-1">
                  <span className="block text-xs font-bold text-slate-900">
                    Ditandatangani oleh Petugas Menyerahkan (Shift Lama)
                  </span>
                  {overhandle.handoverBy.signed ? (
                    <span className="mt-1 inline-flex items-center gap-1 font-mono text-[11px] font-bold text-emerald-700">
                      <Clock className="h-3 w-3" />
                      TTD Digital tercatat pukul {overhandle.handoverBy.signedAt}
                    </span>
                  ) : (
                    <span className="mt-1 block text-[11px] text-rose-600 font-medium">
                      Belum ditandatangani
                    </span>
                  )}
                </div>
              </label>
            </div>

            {/* Pihak 2: Shift Baru */}
            <div
              className={`rounded-xl border p-3.5 transition-colors ${
                overhandle.receivedBy.signed
                  ? "border-emerald-300 bg-emerald-50/50"
                  : "border-slate-200 bg-slate-50/70"
              }`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <UserCheck className="h-4 w-4 text-slate-700" />
                  2. Petugas Menerima (Shift Baru)
                </span>
              </div>

              <input
                type="text"
                value={overhandle.receivedBy.name}
                onChange={(e) =>
                  onChange((prev) => ({
                    ...prev,
                    receivedBy: {
                      ...prev.receivedBy,
                      name: e.target.value,
                    },
                  }))
                }
                placeholder="Nama Petugas Penerima (Shift Baru)"
                className="mb-2.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none"
              />

              <label className="flex min-h-[44px] cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2">
                <input
                  type="checkbox"
                  checked={overhandle.receivedBy.signed}
                  onChange={(e) => handleToggleReceivedSigned(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-emerald-700"
                />
                <div className="min-w-0 flex-1">
                  <span className="block text-xs font-bold text-slate-900">
                    Ditandatangani oleh Petugas Menerima (Shift Baru)
                  </span>
                  {overhandle.receivedBy.signed ? (
                    <span className="mt-1 inline-flex items-center gap-1 font-mono text-[11px] font-bold text-emerald-700">
                      <Clock className="h-3 w-3" />
                      TTD Digital tercatat pukul {overhandle.receivedBy.signedAt}
                    </span>
                  ) : (
                    <span className="mt-1 block text-[11px] text-rose-600 font-medium">
                      Belum ditandatangani
                    </span>
                  )}
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Status Otomatis Overhandle Banner */}
        <div
          className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
            status.complete
              ? "border-emerald-300 bg-emerald-50 text-emerald-900"
              : "border-rose-300 bg-rose-50 text-rose-900"
          }`}
        >
          {status.complete ? (
            <BadgeCheck className="h-5 w-5 shrink-0 text-emerald-600" />
          ) : (
            <TriangleExclamationPoint className="h-5 w-5 shrink-0 text-rose-600" />
          )}
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider opacity-75">
              Status Otomatis Overhandle
            </p>
            <p className="text-sm font-extrabold leading-snug">{status.label}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
