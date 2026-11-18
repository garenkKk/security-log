"use client";

import { useState, type FormEvent } from "react";
import {
  Archive,
  Bike,
  Building,
  CalendarDays,
  Car,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Clock,
  Copy,
  FileText,
  ListChecks,
  LoaderCircle,
  MapPin,
  Minus,
  Moon,
  Plus,
  Printer,
  RotateCcw,
  Sun,
  Sunset,
  Trash,
  User,
} from "lucide-react";
import { SHIFT_OPTIONS, VEHICLE_LABELS } from "@/lib/constants";
import type { ActiveShift, HotelInfo, ShiftKey, VehicleCount } from "@/lib/types";
import {
  buildShiftDocHtml,
  buildWhatsAppText,
  copyToClipboard,
  downloadTextFile,
  emptyOverhandle,
  formatDateID,
  getOverhandleStatus,
  slugify,
  todayISO,
  totalVehicles,
  uid,
} from "@/lib/utils";
import { OverhandleSection } from "./OverhandleSection";
import type { ToastTone } from "./Toast";

interface ActiveShiftTabProps {
  hotel: HotelInfo;
  onUpdateHotel: (next: HotelInfo) => void;
  shift: ActiveShift;
  onUpdateShift: (updater: (prev: ActiveShift) => ActiveShift) => void;
  onArchiveAndReset: () => void;
  isSavingShift: boolean;
  isCloudEnabled: boolean;
  onPreviewPhoto: (src: string, caption: string) => void;
  onNotify: (message: string, tone?: ToastTone) => void;
}

const SHIFT_KEYS: ShiftKey[] = ["pagi", "siang", "malam"];

function ShiftIcon({ shiftKey, active }: { shiftKey: ShiftKey; active: boolean }) {
  const cls = `h-4 w-4 shrink-0 ${active ? "text-amber-300" : "text-slate-500"}`;
  if (shiftKey === "pagi") return <Sun className={cls} aria-hidden="true" />;
  if (shiftKey === "siang") return <Sunset className={cls} aria-hidden="true" />;
  return <Moon className={cls} aria-hidden="true" />;
}

const VEHICLE_ITEMS: {
  key: keyof VehicleCount;
  label: string;
  hint: string;
  icon: "motor" | "mobil";
}[] = [
  { key: "motor", label: VEHICLE_LABELS.motor, hint: "Roda 2 / Ojek / Kurir", icon: "motor" },
  { key: "mobil", label: VEHICLE_LABELS.mobil, hint: "Tamu / Sedan / MPV / SUV", icon: "mobil" },
];

export function ActiveShiftTab({
  hotel,
  onUpdateHotel,
  shift,
  onUpdateShift,
  onArchiveAndReset,
  isSavingShift,
  isCloudEnabled,
  onPreviewPhoto,
  onNotify,
}: ActiveShiftTabProps) {
  const [activityDesc, setActivityDesc] = useState("");
  const [copiedWA, setCopiedWA] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const nextActivityNumber = shift.activities.length + 1;

  const totalVeh = totalVehicles(shift.vehicles);
  const today = todayISO();
  const defaultHoursForShift = SHIFT_OPTIONS[shift.shift].hours;
  const waText = buildWhatsAppText(hotel, shift);

  function handleSelectShift(key: ShiftKey) {
    onUpdateShift((prev) => ({
      ...prev,
      shift: key,
      shiftHours: SHIFT_OPTIONS[key].hours,
    }));
  }

  function stepVehicle(key: keyof VehicleCount, delta: number) {
    onUpdateShift((prev) => ({
      ...prev,
      vehicles: {
        ...prev.vehicles,
        [key]: Math.max(0, prev.vehicles[key] + delta),
      },
    }));
  }

  function setVehicleValue(key: keyof VehicleCount, raw: string) {
    const cleaned = raw.replace(/\D/g, "");
    const num = cleaned === "" ? 0 : Math.min(99999, Number.parseInt(cleaned, 10));
    onUpdateShift((prev) => ({
      ...prev,
      vehicles: {
        ...prev.vehicles,
        [key]: Number.isNaN(num) ? 0 : Math.max(0, num),
      },
    }));
  }

  function handleAddActivity(e: FormEvent) {
    e.preventDefault();
    const desc = activityDesc.trim();
    if (!desc) {
      onNotify("Isi uraian kegiatan terlebih dahulu sebelum menambahkan.", "warning");
      return;
    }
    onUpdateShift((prev) => ({
      ...prev,
      activities: [
        ...prev.activities,
        {
          id: uid(),
          description: desc,
        },
      ],
    }));
    setActivityDesc("");
  }

  function handleDeleteActivity(id: string) {
    onUpdateShift((prev) => ({
      ...prev,
      activities: prev.activities.filter((a) => a.id !== id),
    }));
  }

  async function handleCopyWA() {
    const ok = await copyToClipboard(waText);
    if (ok) {
      setCopiedWA(true);
      onNotify("Laporan format WhatsApp berhasil disalin ke clipboard.", "success");
      setTimeout(() => setCopiedWA(false), 2200);
    } else {
      setShowPreview(true);
      onNotify(
        "Clipboard otomatis diblokir browser. Silakan salin manual dari pratinjau di bawah.",
        "warning",
      );
    }
  }

  function handlePrintShiftPDF() {
    window.print();
  }

  function handleDownloadShiftDoc() {
    const html = buildShiftDocHtml(hotel, shift);
    const filename = `security-log_Shift_${slugify(hotel.name)}_${shift.dateISO}_${SHIFT_OPTIONS[shift.shift].short}.doc`;
    downloadTextFile(html, filename, "application/msword;charset=utf-8");
    onNotify(`Dokumen laporan shift berhasil diunduh (${filename}).`, "success");
  }

  const ov = shift.overhandle ?? emptyOverhandle();
  const ovStatus = getOverhandleStatus(ov);
  const handoverDisplayName =
    ov.handoverBy.name.trim() || shift.officer.trim() || "Petugas Shift Lama";
  const receivedDisplayName = ov.receivedBy.name.trim() || "Petugas Shift Baru";
  const diserahkanPrintName = ov.handoverBy.name.trim() || shift.officer.trim();
  const diterimaPrintName = ov.receivedBy.name.trim();

  return (
    <div>
      <div className="space-y-4 sm:space-y-5 print:hidden">
      {/* 1. Kop & Identitas Hotel */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-800">
              <Building className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 sm:text-base">
                Kop &amp; Identitas Hotel
              </h2>
              <p className="text-xs text-slate-500">
                Digunakan untuk laporan WhatsApp, ekspor Excel (.xlsx), DOC, dan cetak PDF
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
            <Check className="h-3 w-3" aria-hidden="true" />
            {isCloudEnabled ? "Tersimpan di Cloud" : "Tersimpan Permanen"}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="hotel-name"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600"
            >
              Nama Hotel / Properti
            </label>
            <div className="relative">
              <Building
                className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                id="hotel-name"
                type="text"
                value={hotel.name}
                onChange={(e) => onUpdateHotel({ ...hotel, name: e.target.value })}
                placeholder="Contoh: Grand Horizon Hotel"
                className="h-11 w-full rounded-xl border border-slate-300 bg-white pr-3.5 pl-10 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="hotel-address"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600"
            >
              Alamat Hotel
            </label>
            <div className="relative">
              <MapPin
                className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                id="hotel-address"
                type="text"
                value={hotel.address}
                onChange={(e) => onUpdateHotel({ ...hotel, address: e.target.value })}
                placeholder="Contoh: Jl. Sudirman No. 88, Jakarta"
                className="h-11 w-full rounded-xl border border-slate-300 bg-white pr-3.5 pl-10 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2. Metadata Shift */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-6">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-800">
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 sm:text-base">
              Metadata Shift
            </h2>
            <p className="text-xs text-slate-500">
              Tanggal, pilihan shift jaga, jam operasional, dan petugas bertugas
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Hari & Tanggal */}
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label
                htmlFor="shift-date"
                className="text-xs font-semibold uppercase tracking-wide text-slate-600"
              >
                Hari &amp; Tanggal Shift
              </label>
              {shift.dateISO !== today && (
                <button
                  type="button"
                  onClick={() =>
                    onUpdateShift((prev) => ({ ...prev, dateISO: today }))
                  }
                  className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  <RotateCcw className="h-3 w-3" />
                  Set Hari Ini
                </button>
              )}
            </div>

            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
              <div className="flex min-h-[46px] flex-1 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2">
                <span className="text-sm font-bold text-slate-900">
                  {formatDateID(shift.dateISO)}
                </span>
                <span className="rounded-md bg-white px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-500 border border-slate-200">
                  {shift.dateISO}
                </span>
              </div>
              <input
                id="shift-date"
                type="date"
                value={shift.dateISO}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) {
                    onUpdateShift((prev) => ({ ...prev, dateISO: val }));
                  }
                }}
                aria-label="Pilih tanggal shift"
                className="h-[46px] w-full rounded-xl border border-slate-300 bg-white px-3.5 font-mono text-sm font-semibold text-slate-900 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 focus:outline-none sm:w-44"
              />
            </div>
          </div>

          {/* Pilihan Shift */}
          <div>
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Pilihan Shift
            </span>
            <div
              role="radiogroup"
              aria-label="Pilihan Shift"
              className="grid grid-cols-1 gap-2 sm:grid-cols-3"
            >
              {SHIFT_KEYS.map((key) => {
                const option = SHIFT_OPTIONS[key];
                const active = shift.shift === key;
                return (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => handleSelectShift(key)}
                    className={`flex min-h-[54px] items-center justify-between rounded-xl border px-3.5 py-2.5 text-left transition-all ${
                      active
                        ? "border-slate-900 bg-slate-900 text-white shadow-xs ring-2 ring-slate-900/15"
                        : "border-slate-200 bg-slate-50 text-slate-800 hover:border-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <ShiftIcon shiftKey={key} active={active} />
                      <div>
                        <div className="text-sm font-bold leading-tight">
                          {option.label}
                        </div>
                        <div
                          className={`mt-0.5 font-mono text-xs ${
                            active ? "text-slate-300" : "text-slate-500"
                          }`}
                        >
                          {option.hours}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        active ? "bg-emerald-400" : "bg-slate-300"
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Jam Shift & Nama Petugas */}
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label
                  htmlFor="shift-hours"
                  className="text-xs font-semibold uppercase tracking-wide text-slate-600"
                >
                  Jam Shift (Dapat Diedit)
                </label>
                {shift.shiftHours !== defaultHoursForShift && (
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateShift((prev) => ({
                        ...prev,
                        shiftHours: defaultHoursForShift,
                      }))
                    }
                    className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Standar
                  </button>
                )}
              </div>
              <div className="relative">
                <Clock
                  className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="shift-hours"
                  type="text"
                  value={shift.shiftHours}
                  onChange={(e) =>
                    onUpdateShift((prev) => ({
                      ...prev,
                      shiftHours: e.target.value,
                    }))
                  }
                  placeholder={defaultHoursForShift}
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white pr-3.5 pl-10 font-mono text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="shift-officer"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600"
              >
                Nama Petugas
              </label>
              <div className="relative">
                <User
                  className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="shift-officer"
                  type="text"
                  value={shift.officer}
                  onChange={(e) =>
                    onUpdateShift((prev) => ({ ...prev, officer: e.target.value }))
                  }
                  placeholder="Contoh: Budi Santoso / Dimas A."
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white pr-3.5 pl-10 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Log Kegiatan Shift */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-800">
              <ListChecks className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 sm:text-base">
                Log Kegiatan Shift
              </h2>
              <p className="text-xs text-slate-500">
                Catat patroli, serah terima, tamu VIP, atau kejadian penting
              </p>
            </div>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 font-mono text-xs font-bold text-slate-700 tabular-nums">
            {shift.activities.length} entri
          </span>
        </div>

        <form onSubmit={handleAddActivity} className="space-y-3">
          <div className="grid grid-cols-[84px_1fr_auto] gap-2.5">
            <div>
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                No. Urut
              </span>
              <div
                aria-label={`Nomor urut kegiatan: ${nextActivityNumber}`}
                className="flex h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-100 font-mono text-base font-extrabold text-slate-900 tabular-nums"
              >
                {nextActivityNumber}
              </div>
            </div>

            <div>
              <label
                htmlFor="activity-desc"
                className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600"
              >
                Uraian Kegiatan
              </label>
              <input
                id="activity-desc"
                type="text"
                value={activityDesc}
                onChange={(e) => setActivityDesc(e.target.value)}
                placeholder="Contoh: Patroli area lobi, basement & gerbang belakang (situasi aman)"
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 focus:outline-none"
              />
            </div>

            <div className="self-end">
              <button
                type="submit"
                aria-label="Tambah kegiatan"
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3.5 text-sm font-bold text-white transition-colors hover:bg-slate-800 active:scale-[0.99] sm:px-4"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Tambah</span>
              </button>
            </div>
          </div>
        </form>

        <div className="mt-4">
          {shift.activities.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
              Belum ada kegiatan dicatat untuk shift ini. Isi uraian kegiatan di atas lalu klik tombol +.
            </div>
          ) : (
            <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
              {shift.activities.map((item, idx) => (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-3 px-3.5 py-3 sm:px-4"
                >
                  <div className="flex min-w-0 items-start gap-2.5">
                    <span className="flex h-6 min-w-[26px] shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 px-1.5 font-mono text-xs font-bold text-slate-800 tabular-nums">
                      {idx + 1}
                    </span>
                    <p className="text-sm font-medium leading-relaxed text-slate-800 break-words">
                      {item.description}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteActivity(item.id)}
                    aria-label={`Hapus kegiatan nomor ${idx + 1}`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* 4. Rekap Kendaraan Parkir */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-800">
              <Car className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 sm:text-base">
                Rekap Kendaraan Parkir
              </h2>
              <p className="text-xs text-slate-500">
                Gunakan tombol - / + atau ketik angka langsung
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-slate-900 px-3.5 py-1.5 text-white">
            <span className="text-xs font-medium text-slate-300">Total: </span>
            <span className="font-mono text-base font-bold tabular-nums">
              {totalVeh}
            </span>
            <span className="ml-1 text-xs font-medium text-slate-300">unit</span>
          </div>
        </div>

        <div className="space-y-3">
          {VEHICLE_ITEMS.map((item) => {
            const count = shift.vehicles[item.key];
            return (
              <div
                key={item.key}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800">
                    {item.icon === "motor" && <Bike className="h-5 w-5" aria-hidden="true" />}
                    {item.icon === "mobil" && <Car className="h-5 w-5" aria-hidden="true" />}
                  </div>
                  <div>
                    <label
                      htmlFor={`veh-${item.key}`}
                      className="block text-sm font-bold text-slate-900"
                    >
                      {item.label}
                    </label>
                    <span className="text-xs text-slate-500">{item.hint}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 sm:justify-end">
                  <button
                    type="button"
                    onClick={() => stepVehicle(item.key, -1)}
                    disabled={count <= 0}
                    aria-label={`Kurangi ${item.label}`}
                    className="flex h-12 w-14 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-900 shadow-2xs transition-all hover:bg-slate-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Minus className="h-5 w-5" />
                  </button>

                  <input
                    id={`veh-${item.key}`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={count}
                    onChange={(e) => setVehicleValue(item.key, e.target.value)}
                    onFocus={(e) => e.currentTarget.select()}
                    className="no-spinner h-12 w-24 rounded-xl border border-slate-300 bg-white text-center font-mono text-xl font-bold text-slate-900 tabular-nums focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 focus:outline-none"
                  />

                  <button
                    type="button"
                    onClick={() => stepVehicle(item.key, 1)}
                    aria-label={`Tambah ${item.label}`}
                    className="flex h-12 w-14 items-center justify-center rounded-xl bg-slate-900 text-white shadow-2xs transition-all hover:bg-slate-800 active:scale-95"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-900/10 bg-slate-900 px-4 py-3 text-white">
          <span className="text-sm font-semibold">Total Kendaraan Parkir</span>
          <span className="font-mono text-xl font-extrabold tabular-nums">
            {totalVeh} Unit
          </span>
        </div>
      </section>

      {/* 5. Serah Terima Tugas (Overhandle) */}
      <OverhandleSection
        overhandle={shift.overhandle}
        activeOfficer={shift.officer}
        onChange={(updater) =>
          onUpdateShift((prev) => ({
            ...prev,
            overhandle: updater(prev.overhandle),
          }))
        }
        onPreviewPhoto={onPreviewPhoto}
        onNotify={onNotify}
      />

      {/* 6. Aksi Akhir Shift */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-6">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
            <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 sm:text-base">
              Aksi Akhir Shift
            </h2>
            <p className="text-xs text-slate-500">
              Salin laporan WhatsApp, cetak PDF / unduh dokumen Word (.doc), atau arsipkan shift
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <button
            type="button"
            onClick={handleCopyWA}
            className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-bold transition-all active:scale-[0.99] ${
              copiedWA
                ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                : "border-slate-300 bg-white text-slate-900 hover:bg-slate-50"
            }`}
          >
            {copiedWA ? (
              <>
                <Check className="h-4 w-4 text-emerald-600" />
                <span>Tersalin!</span>
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
            onClick={handlePrintShiftPDF}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-900 transition-all hover:bg-slate-50 active:scale-[0.99]"
          >
            <Printer className="h-4 w-4 text-slate-700" />
            <span>Cetak / Simpan PDF</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadShiftDoc}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-900 transition-all hover:bg-slate-50 active:scale-[0.99]"
          >
            <FileText className="h-4 w-4 text-sky-700" />
            <span>Download DOC (Word)</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onArchiveAndReset}
          disabled={isSavingShift}
          className="mt-2.5 inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-xs transition-all hover:bg-slate-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-65"
        >
          {isSavingShift ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" />
              <span>
                {isCloudEnabled ? "Menyimpan ke Cloud..." : "Menyimpan Shift..."}
              </span>
            </>
          ) : (
            <>
              <Archive className="h-4 w-4" />
              <span>Simpan ke Arsip Bulanan &amp; Reset Shift</span>
            </>
          )}
        </button>

        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            {showPreview ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            <span>{showPreview ? "Sembunyikan Pratinjau WhatsApp" : "Lihat Pratinjau WhatsApp"}</span>
          </button>

          {showPreview && (
            <pre className="mt-2.5 overflow-x-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-3.5 font-mono text-xs leading-relaxed text-slate-800">
              {waText}
            </pre>
          )}
        </div>
      </section>
      </div>

      {/* ========== PRINT-ONLY A4 SHIFT REPORT (PDF / PAPER) ========== */}
      <article className="hidden text-black print:block">
        <header className="border-b-4 border-double border-slate-900 pb-3 text-center">
          <h1 className="text-lg font-extrabold uppercase tracking-wide text-slate-950">
            {hotel.name.trim() || "IDENTITAS HOTEL BELUM DIATUR"}
          </h1>
          {hotel.address.trim() && (
            <p className="mt-0.5 text-xs text-slate-700">{hotel.address.trim()}</p>
          )}
        </header>

        <div className="mt-4 mb-4 text-center">
          <h2 className="text-base font-bold uppercase tracking-wider text-slate-950 underline underline-offset-4">
            LAPORAN KEAMANAN SHIFT
          </h2>
        </div>

        <table className="mb-4 w-full border-collapse border border-slate-900 text-xs">
          <tbody>
            <tr>
              <th className="w-40 border border-slate-900 bg-slate-100 px-3 py-1.5 text-left font-bold">
                Hari / Tanggal
              </th>
              <td className="border border-slate-900 px-3 py-1.5 font-semibold">
                {formatDateID(shift.dateISO)} ({shift.dateISO})
              </td>
            </tr>
            <tr>
              <th className="border border-slate-900 bg-slate-100 px-3 py-1.5 text-left font-bold">
                Shift
              </th>
              <td className="border border-slate-900 px-3 py-1.5 font-semibold">
                {SHIFT_OPTIONS[shift.shift].label}
              </td>
            </tr>
            <tr>
              <th className="border border-slate-900 bg-slate-100 px-3 py-1.5 text-left font-bold">
                Jam Shift
              </th>
              <td className="border border-slate-900 px-3 py-1.5 font-mono font-semibold">
                {shift.shiftHours || "-"}
              </td>
            </tr>
            <tr>
              <th className="border border-slate-900 bg-slate-100 px-3 py-1.5 text-left font-bold">
                Petugas
              </th>
              <td className="border border-slate-900 px-3 py-1.5 font-semibold">
                {shift.officer.trim() || "-"}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="mb-4">
          <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-900">
            1. Log Kegiatan Shift
          </h3>
          <table className="w-full border-collapse border border-slate-900 text-xs">
            <thead>
              <tr className="bg-slate-100 text-left font-bold">
                <th className="w-12 border border-slate-900 px-2 py-1.5 text-center">
                  No
                </th>
                <th className="border border-slate-900 px-3 py-1.5">
                  Uraian Kegiatan
                </th>
              </tr>
            </thead>
            <tbody>
              {shift.activities.length === 0 ? (
                <tr>
                  <td
                    colSpan={2}
                    className="border border-slate-900 px-3 py-3 text-center italic text-slate-600"
                  >
                    Tidak ada kegiatan tercatat pada shift ini.
                  </td>
                </tr>
              ) : (
                shift.activities.map((a, idx) => (
                  <tr key={a.id}>
                    <td className="border border-slate-900 px-2 py-1.5 text-center font-mono font-bold tabular-nums">
                      {idx + 1}
                    </td>
                    <td className="border border-slate-900 px-3 py-1.5">
                      {a.description}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mb-4">
          <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-900">
            2. Rekap Kendaraan Parkir
          </h3>
          <div className="grid grid-cols-3 border border-slate-900 text-center">
            <div className="border-r border-slate-900 p-2">
              <div className="text-[10px] font-semibold uppercase text-slate-600">
                Sepeda Motor
              </div>
              <div className="mt-0.5 font-mono text-sm font-bold tabular-nums">
                {shift.vehicles.motor} unit
              </div>
            </div>
            <div className="border-r border-slate-900 p-2">
              <div className="text-[10px] font-semibold uppercase text-slate-600">
                Mobil
              </div>
              <div className="mt-0.5 font-mono text-sm font-bold tabular-nums">
                {shift.vehicles.mobil} unit
              </div>
            </div>
            <div className="bg-slate-100 p-2">
              <div className="text-[10px] font-bold uppercase text-slate-800">
                Total Kendaraan
              </div>
              <div className="mt-0.5 font-mono text-sm font-extrabold tabular-nums">
                {totalVeh} unit
              </div>
            </div>
          </div>
        </div>

        <div className="print-break-avoid mb-5">
          <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-900">
            3. Serah Terima Tugas (Overhandle)
          </h3>
          <table className="w-full border-collapse border border-slate-900 text-xs">
            <tbody>
              <tr>
                <th className="w-40 border border-slate-900 bg-slate-100 px-3 py-1.5 text-left font-bold">
                  Status Overhandle
                </th>
                <td
                  className={`border border-slate-900 px-3 py-1.5 font-bold ${
                    ovStatus.complete ? "text-emerald-800" : "text-rose-800"
                  }`}
                >
                  {ovStatus.label}
                </td>
              </tr>
              <tr>
                <th className="border border-slate-900 bg-slate-100 px-3 py-1.5 text-left font-bold">
                  Komentar / Catatan
                </th>
                <td className="whitespace-pre-wrap border border-slate-900 px-3 py-1.5">
                  {ov.comment.trim() || "- Tidak ada komentar overhandle -"}
                </td>
              </tr>
              <tr>
                <th className="border border-slate-900 bg-slate-100 px-3 py-1.5 text-left font-bold">
                  Menyerahkan (Shift Lama)
                </th>
                <td className="border border-slate-900 px-3 py-1.5 font-semibold">
                  {ov.handoverBy.signed
                    ? `[✓] ${handoverDisplayName} (Pukul ${ov.handoverBy.signedAt || "-"})`
                    : "[✗] BELUM TTD"}
                </td>
              </tr>
              <tr>
                <th className="border border-slate-900 bg-slate-100 px-3 py-1.5 text-left font-bold">
                  Menerima (Shift Baru)
                </th>
                <td className="border border-slate-900 px-3 py-1.5 font-semibold">
                  {ov.receivedBy.signed
                    ? `[✓] ${receivedDisplayName} (Pukul ${ov.receivedBy.signedAt || "-"})`
                    : "[✗] BELUM TTD"}
                </td>
              </tr>
            </tbody>
          </table>

          {ov.photoDataUrl && (
            <div className="mt-3">
              <p className="mb-1 text-[11px] font-bold text-slate-800">
                Bukti Foto Serah Terima:
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ov.photoDataUrl}
                alt="Bukti Foto Serah Terima"
                className="max-h-56 w-auto rounded border border-slate-400 object-contain"
              />
            </div>
          )}
        </div>

        <div className="print-break-avoid mt-8 grid grid-cols-3 gap-4 text-center text-xs">
          <div className="flex min-h-[120px] flex-col justify-between rounded border border-slate-900 p-2.5">
            <div>
              <p className="font-bold">Diserahkan,</p>
              <p className="text-[11px] text-slate-700">Petugas Shift</p>
            </div>
            <div className="h-14" />
            <p className="border-t border-slate-400 pt-1 font-bold">
              {diserahkanPrintName || "( .................................... )"}
            </p>
          </div>

          <div className="flex min-h-[120px] flex-col justify-between rounded border border-slate-900 p-2.5">
            <div>
              <p className="font-bold">Diketahui,</p>
              <p className="text-[11px] text-slate-700">Danru / Chief Security</p>
            </div>
            <div className="h-14" />
            <p className="border-t border-slate-400 pt-1 font-bold">
              ( .................................... )
            </p>
          </div>

          <div className="flex min-h-[120px] flex-col justify-between rounded border border-slate-900 p-2.5">
            <div>
              <p className="font-bold">Diterima,</p>
              <p className="text-[11px] text-slate-700">Petugas Shift Berikutnya</p>
            </div>
            <div className="h-14" />
            <p className="border-t border-slate-400 pt-1 font-bold">
              {diterimaPrintName || "( .................................... )"}
            </p>
          </div>
        </div>
      </article>
    </div>
  );
}
