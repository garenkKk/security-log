"use client";

import { useEffect, useState } from "react";
import {
  BadgeCheck,
  Bike,
  Building,
  CalendarDays,
  Car,
  Check,
  Clock,
  Copy,
  Handshake,
  ListChecks,
  TriangleExclamationPoint,
  User,
  X,
} from "lucide-react";
import { SHIFT_OPTIONS, VEHICLE_LABELS } from "@/lib/constants";
import type { HotelInfo, ShiftRecord } from "@/lib/types";
import {
  buildWhatsAppText,
  copyToClipboard,
  emptyOverhandle,
  formatDateID,
  getOverhandleStatus,
  totalVehicles,
} from "@/lib/utils";

interface ShiftDetailModalProps {
  record: ShiftRecord | null;
  fallbackHotel: HotelInfo;
  onClose: () => void;
  onCopied: () => void;
}

export function ShiftDetailModal({
  record,
  fallbackHotel,
  onClose,
  onCopied,
}: ShiftDetailModalProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!record) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [record, onClose]);

  if (!record) return null;

  const hotelForRecord: HotelInfo = {
    name: record.hotelName || fallbackHotel.name,
    address: record.hotelAddress || fallbackHotel.address,
  };

  async function handleCopy() {
    if (!record) return;
    const text = buildWhatsAppText(hotelForRecord, record);
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      onCopied();
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const grandTotal = totalVehicles(record.vehicles);
  const ov = record.overhandle ?? emptyOverhandle();
  const ovStatus = getOverhandleStatus(ov);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-[1px] sm:items-center sm:p-4 print:hidden"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-modal-title"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-slate-900 px-5 py-4 text-white">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Detail Arsip Shift Keamanan
            </p>
            <h3 id="detail-modal-title" className="mt-0.5 text-base font-bold sm:text-lg">
              {formatDateID(record.dateISO)}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup detail shift"
            className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {(hotelForRecord.name || hotelForRecord.address) && (
            <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
              <Building className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />
              <div className="min-w-0 text-sm">
                <p className="font-bold text-slate-900">
                  {hotelForRecord.name || "Hotel"}
                </p>
                {hotelForRecord.address && (
                  <p className="text-xs text-slate-600">{hotelForRecord.address}</p>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <CalendarDays className="h-3.5 w-3.5" />
                <span>Shift</span>
              </div>
              <p className="mt-1 text-sm font-bold text-slate-900">
                {SHIFT_OPTIONS[record.shift].label}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <Clock className="h-3.5 w-3.5" />
                <span>Jam Shift</span>
              </div>
              <p className="mt-1 font-mono text-sm font-bold text-slate-900">
                {record.shiftHours || "-"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <User className="h-3.5 w-3.5" />
                <span>Petugas</span>
              </div>
              <p className="mt-1 text-sm font-bold text-slate-900">
                {record.officer.trim() || "-"}
              </p>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Rekap Kendaraan Parkir
              </h4>
              <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-xs font-bold text-white tabular-nums">
                Total: {grandTotal} unit
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                <Bike className="mx-auto h-4 w-4 text-slate-600" />
                <p className="mt-1 text-[11px] font-medium text-slate-600">
                  {VEHICLE_LABELS.motor}
                </p>
                <p className="mt-0.5 font-mono text-xl font-bold text-slate-900 tabular-nums">
                  {record.vehicles.motor}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                <Car className="mx-auto h-4 w-4 text-slate-600" />
                <p className="mt-1 text-[11px] font-medium text-slate-600">
                  {VEHICLE_LABELS.mobil}
                </p>
                <p className="mt-0.5 font-mono text-xl font-bold text-slate-900 tabular-nums">
                  {record.vehicles.mobil}
                </p>
              </div>
            </div>
          </div>

          {/* Status Serah Terima (Overhandle) */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Handshake className="h-4 w-4 text-slate-700" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Serah Terima Tugas (Overhandle)
                </h4>
              </div>
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                  ovStatus.complete
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                    : "border-rose-300 bg-rose-50 text-rose-800"
                }`}
              >
                {ovStatus.complete ? (
                  <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <TriangleExclamationPoint className="h-3.5 w-3.5 text-rose-600" />
                )}
                <span>{ovStatus.label}</span>
              </span>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs">
              <p className="mb-1 font-semibold uppercase tracking-wide text-slate-500">
                Komentar Overhandle (Shift Sebelumnya)
              </p>
              <p className="whitespace-pre-wrap leading-relaxed text-slate-800">
                {ov.comment.trim() || "- Tidak ada komentar overhandle -"}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <span className="text-slate-500">Menyerahkan: </span>
                <span className="font-bold text-slate-900">
                  {ov.handoverBy.signed
                    ? `${ov.handoverBy.name.trim() || record.officer.trim() || "Petugas"} (${ov.handoverBy.signedAt})`
                    : "BELUM TTD"}
                </span>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <span className="text-slate-500">Menerima: </span>
                <span className="font-bold text-slate-900">
                  {ov.receivedBy.signed
                    ? `${ov.receivedBy.name.trim() || "Petugas Baru"} (${ov.receivedBy.signedAt})`
                    : "BELUM TTD"}
                </span>
              </div>
            </div>

            {ov.photoDataUrl && (
              <div>
                <p className="mb-1 text-[11px] font-semibold text-slate-500">
                  Bukti Foto Serah Terima:
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ov.photoDataUrl}
                  alt="Bukti foto serah terima shift"
                  className="max-h-56 w-auto rounded-lg border border-slate-300 object-contain"
                />
              </div>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center gap-1.5">
              <ListChecks className="h-4 w-4 text-slate-700" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Log Kegiatan Shift ({record.activities.length})
              </h4>
            </div>
            {record.activities.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-center text-sm text-slate-500">
                Tidak ada kegiatan tercatat pada shift ini.
              </p>
            ) : (
              <ol className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
                {record.activities.map((item, idx) => (
                  <li key={item.id} className="flex items-start gap-3 px-4 py-3 text-sm">
                    <span className="flex h-6 min-w-[26px] shrink-0 items-center justify-center rounded-md bg-slate-100 px-1.5 font-mono text-xs font-bold text-slate-800 tabular-nums">
                      {idx + 1}
                    </span>
                    <span className="text-slate-800 leading-relaxed">{item.description}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3.5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-100"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-600" />
                <span>Tersalin</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span>Salin Format WhatsApp</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[42px] items-center justify-center rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
