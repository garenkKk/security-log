"use client";

import { useState } from "react";
import {
  Bike,
  Car,
  ChartColumn,
  ClipboardList,
  Eye,
  FileSpreadsheet,
  Inbox,
  Layers,
  LoaderCircle,
  PenLine,
  Printer,
  RefreshCw,
  Trash,
  Truck,
} from "lucide-react";
import { MONTHS_ID, SHIFT_OPTIONS } from "@/lib/constants";
import { downloadMonthlyWorkbook } from "@/lib/excel";
import type { HotelInfo, ShiftRecord, Signatories } from "@/lib/types";
import {
  filterRecordsByMonth,
  formatDateID,
  formatDateShort,
  getAvailableYears,
  getOverhandleStatus,
  monthLabel,
  sumVehicles,
  todayISO,
  totalVehicles,
  weekdayShort,
} from "@/lib/utils";
import type { ToastTone } from "./Toast";

interface MonthlyReportTabProps {
  hotel: HotelInfo;
  history: ShiftRecord[];
  signatories: Signatories;
  isLoadingCloud: boolean;
  isCloudEnabled: boolean;
  onRefreshCloud: () => void;
  onUpdateSignatories: (next: Signatories) => void;
  onViewRecord: (record: ShiftRecord) => void;
  onRequestDeleteRecord: (record: ShiftRecord) => void;
  onGoToInput: () => void;
  onNotify: (message: string, tone?: ToastTone) => void;
}

export function MonthlyReportTab({
  hotel,
  history,
  signatories,
  isLoadingCloud,
  isCloudEnabled,
  onRefreshCloud,
  onUpdateSignatories,
  onViewRecord,
  onRequestDeleteRecord,
  onGoToInput,
  onNotify,
}: MonthlyReportTabProps) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const [selectedMonth, setSelectedMonth] = useState<number>(() => now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(() => currentYear);
  const [showSignatorySettings, setShowSignatorySettings] = useState(false);

  const years = getAvailableYears(history, currentYear);
  const filtered = filterRecordsByMonth(history, selectedMonth, selectedYear);
  const vehicleTotals = sumVehicles(filtered);
  const grandTotal = totalVehicles(vehicleTotals);
  const totalActivities = filtered.reduce((sum, r) => sum + r.activities.length, 0);
  const periodText = monthLabel(selectedMonth, selectedYear);
  const printDateText = formatDateID(todayISO());

  function handleDownloadExcel() {
    if (filtered.length === 0) {
      onNotify("Tidak ada data shift pada periode ini untuk diunduh.", "warning");
      return;
    }
    const filename = downloadMonthlyWorkbook(
      hotel,
      filtered,
      selectedMonth,
      selectedYear,
    );
    onNotify(`Rekap Excel ${periodText} berhasil diunduh (${filename}).`, "success");
  }

  function handlePrintPDF() {
    if (filtered.length === 0) {
      onNotify("Tidak ada data shift pada periode ini untuk dicetak.", "warning");
      return;
    }
    window.print();
  }

  return (
    <div>
      {/* ========== SCREEN VIEW (HIDDEN WHEN PRINTING) ========== */}
      <div className="space-y-4 sm:space-y-5 print:hidden">
        {/* Filter Bulan & Tahun + Export Actions */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="grid grid-cols-2 gap-3 sm:flex sm:items-end">
              <div>
                <label
                  htmlFor="filter-month"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600"
                >
                  Bulan
                </label>
                <select
                  id="filter-month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 focus:outline-none sm:w-44"
                >
                  {MONTHS_ID.map((m, i) => (
                    <option key={m} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="filter-year"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600"
                >
                  Tahun
                </label>
                <select
                  id="filter-year"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 font-mono text-sm font-semibold text-slate-900 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 focus:outline-none sm:w-28"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => setShowSignatorySettings((v) => !v)}
                className={`col-span-2 inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border px-3.5 text-xs font-bold transition-colors sm:col-span-1 ${
                  showSignatorySettings
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <PenLine className="h-4 w-4" />
                <span>Pengaturan Tanda Tangan</span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:flex">
              {isCloudEnabled && (
                <button
                  type="button"
                  onClick={onRefreshCloud}
                  disabled={isLoadingCloud}
                  title="Muat ulang data terbaru dari Supabase Cloud"
                  className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-800 transition-colors hover:bg-slate-100 disabled:opacity-50"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${isLoadingCloud ? "animate-spin" : ""}`}
                  />
                  <span>Muat Ulang</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleDownloadExcel}
                disabled={filtered.length === 0}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-700" />
                <span>Download Rekap Bulanan (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={handlePrintPDF}
                disabled={filtered.length === 0}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-xs transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Printer className="h-4 w-4" />
                <span>Cetak / Simpan PDF</span>
              </button>
            </div>
          </div>

          {/* Collapsible Signatory Settings for Print */}
          {showSignatorySettings && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-600">
                Pengaturan Kolom Tanda Tangan (Tampil Saat Cetak / PDF)
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Kota
                  </label>
                  <input
                    type="text"
                    value={signatories.city}
                    onChange={(e) =>
                      onUpdateSignatories({ ...signatories, city: e.target.value })
                    }
                    placeholder="Contoh: Jakarta"
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Jabatan Mengetahui
                  </label>
                  <input
                    type="text"
                    value={signatories.approverTitle}
                    onChange={(e) =>
                      onUpdateSignatories({
                        ...signatories,
                        approverTitle: e.target.value,
                      })
                    }
                    placeholder="Chief Security / GM"
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Nama Mengetahui
                  </label>
                  <input
                    type="text"
                    value={signatories.approverName}
                    onChange={(e) =>
                      onUpdateSignatories({
                        ...signatories,
                        approverName: e.target.value,
                      })
                    }
                    placeholder="(Opsional)"
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Jabatan Pembuat
                  </label>
                  <input
                    type="text"
                    value={signatories.makerTitle}
                    onChange={(e) =>
                      onUpdateSignatories({
                        ...signatories,
                        makerTitle: e.target.value,
                      })
                    }
                    placeholder="Koordinator Keamanan"
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Nama Pembuat
                  </label>
                  <input
                    type="text"
                    value={signatories.makerName}
                    onChange={(e) =>
                      onUpdateSignatories({
                        ...signatories,
                        makerName: e.target.value,
                      })
                    }
                    placeholder="(Opsional)"
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Kartu Ringkasan Eksekutif Bulanan */}
        <section aria-label="Ringkasan Eksekutif Bulanan">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold">Total Shift Tercatat</span>
                <Layers className="h-4 w-4" aria-hidden="true" />
              </div>
              <p className="mt-2 font-mono text-2xl font-extrabold text-slate-900 tabular-nums">
                {filtered.length}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                {totalActivities} log kegiatan
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold">Sepeda Motor</span>
                <Bike className="h-4 w-4" aria-hidden="true" />
              </div>
              <p className="mt-2 font-mono text-2xl font-extrabold text-slate-900 tabular-nums">
                {vehicleTotals.motor}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">unit tercatat</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold">Mobil</span>
                <Car className="h-4 w-4" aria-hidden="true" />
              </div>
              <p className="mt-2 font-mono text-2xl font-extrabold text-slate-900 tabular-nums">
                {vehicleTotals.mobil}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">unit tercatat</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold">Box / Vendor</span>
                <Truck className="h-4 w-4" aria-hidden="true" />
              </div>
              <p className="mt-2 font-mono text-2xl font-extrabold text-slate-900 tabular-nums">
                {vehicleTotals.box}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">unit tercatat</p>
            </div>

            <div className="col-span-2 rounded-2xl border border-slate-900 bg-slate-900 p-4 text-white shadow-xs sm:col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-xs font-semibold">Grand Total Kendaraan</span>
                <ChartColumn className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              </div>
              <p className="mt-2 font-mono text-2xl font-extrabold text-white tabular-nums">
                {grandTotal}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-300">{periodText}</p>
            </div>
          </div>
        </section>

        {/* Tabel Rekap & Detail Kegiatan */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3.5 sm:px-6">
            <div>
              <h2 className="text-sm font-bold text-slate-900 sm:text-base">
                Rekap &amp; Detail Kegiatan — {periodText}
              </h2>
              <p className="text-xs text-slate-500">
                Menampilkan seluruh shift yang diarsipkan pada bulan terpilih
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 font-mono text-xs font-bold text-slate-700 tabular-nums">
              {filtered.length} Shift
            </span>
          </div>

          {isLoadingCloud && history.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2.5 px-6 py-12 text-center">
              <LoaderCircle className="h-7 w-7 animate-spin text-slate-600" />
              <p className="text-sm font-semibold text-slate-700">
                Mengambil data laporan shift dari Supabase Cloud...
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <Inbox className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="mt-3 text-sm font-bold text-slate-900">
                Belum Ada Arsip Shift di {periodText}
              </h3>
              <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500">
                Catat data shift di tab Input Shift Aktif lalu klik Simpan ke Arsip Bulanan untuk melihat rekap dan mencetak laporan bulanan.
              </p>
              <button
                type="button"
                onClick={onGoToInput}
                className="mt-4 inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-800"
              >
                <ClipboardList className="h-4 w-4" />
                <span>Ke Tab Input Shift Aktif</span>
              </button>
            </div>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="divide-y divide-slate-200 md:hidden">
                {filtered.map((r) => {
                  const rowTotal = totalVehicles(r.vehicles);
                  const ovStatus = getOverhandleStatus(r.overhandle);
                  return (
                    <div key={r.id} className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-bold text-slate-900">
                            {formatDateID(r.dateISO)}
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                            <span className="rounded-md bg-slate-900 px-2 py-0.5 font-semibold text-white">
                              {SHIFT_OPTIONS[r.shift].label}
                            </span>
                            <span className="font-mono">{r.shiftHours}</span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                ovStatus.complete
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-rose-50 text-rose-700 border border-rose-200"
                              }`}
                            >
                              {ovStatus.complete ? "Overhandle ✓" : "Belum Overhandle"}
                            </span>
                          </div>
                        </div>
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs font-bold text-slate-900 tabular-nums">
                          {rowTotal} unit
                        </span>
                      </div>

                      <div className="text-xs text-slate-700">
                        <span className="font-semibold text-slate-500">Petugas: </span>
                        <span className="font-semibold text-slate-900">
                          {r.officer.trim() || "-"}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-2.5 text-center text-xs">
                        <div>
                          <div className="text-[11px] text-slate-500">Motor</div>
                          <div className="font-mono font-bold text-slate-900 tabular-nums">
                            {r.vehicles.motor}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] text-slate-500">Mobil</div>
                          <div className="font-mono font-bold text-slate-900 tabular-nums">
                            {r.vehicles.mobil}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] text-slate-500">Box/Vendor</div>
                          <div className="font-mono font-bold text-slate-900 tabular-nums">
                            {r.vehicles.box}
                          </div>
                        </div>
                      </div>

                      <div className="text-xs text-slate-600">
                        <span className="font-semibold text-slate-800">
                          {r.activities.length} Kegiatan:{" "}
                        </span>
                        {r.activities.length === 0
                          ? "Tidak ada log kegiatan"
                          : `1. ${r.activities[0].description}${
                              r.activities.length > 1
                                ? ` (+${r.activities.length - 1} lainnya)`
                                : ""
                            }`}
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => onViewRecord(r)}
                          className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-800 hover:bg-slate-50"
                        >
                          <Eye className="h-4 w-4" />
                          <span>Lihat Detail</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onRequestDeleteRecord(r)}
                          aria-label={`Hapus arsip ${formatDateShort(r.dateISO)}`}
                          className="inline-flex min-h-[40px] items-center justify-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-bold text-rose-700 hover:bg-rose-100"
                        >
                          <Trash className="h-4 w-4" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-600">
                      <th className="px-4 py-3">Tanggal</th>
                      <th className="px-4 py-3">Shift</th>
                      <th className="px-4 py-3">Petugas</th>
                      <th className="px-4 py-3">Rincian Kendaraan</th>
                      <th className="px-4 py-3">Ringkasan Kegiatan</th>
                      <th className="px-4 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filtered.map((r) => {
                      const rowTotal = totalVehicles(r.vehicles);
                      const ovStatus = getOverhandleStatus(r.overhandle);
                      return (
                        <tr key={r.id} className="hover:bg-slate-50/70">
                          <td className="whitespace-nowrap px-4 py-3.5 align-top">
                            <div className="font-bold text-slate-900">
                              {weekdayShort(r.dateISO)}, {formatDateShort(r.dateISO)}
                            </div>
                            <div className="text-xs text-slate-500">
                              {formatDateID(r.dateISO)}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5 align-top">
                            <div className="font-semibold text-slate-900">
                              {SHIFT_OPTIONS[r.shift].label}
                            </div>
                            <div className="font-mono text-xs text-slate-500">
                              {r.shiftHours}
                            </div>
                            <span
                              className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                ovStatus.complete
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-rose-50 text-rose-700 border border-rose-200"
                              }`}
                            >
                              {ovStatus.complete ? "Overhandle ✓" : "Belum Overhandle"}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 align-top font-medium text-slate-900">
                            {r.officer.trim() || "-"}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5 align-top">
                            <div className="flex flex-wrap items-center gap-1.5 text-xs">
                              <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-slate-700 tabular-nums">
                                Mtr: {r.vehicles.motor}
                              </span>
                              <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-slate-700 tabular-nums">
                                Mbl: {r.vehicles.mobil}
                              </span>
                              <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-slate-700 tabular-nums">
                                Box: {r.vehicles.box}
                              </span>
                              <span className="rounded-md bg-slate-900 px-2 py-0.5 font-mono font-bold text-white tabular-nums">
                                Σ {rowTotal}
                              </span>
                            </div>
                          </td>
                          <td className="max-w-xs px-4 py-3.5 align-top text-xs text-slate-600">
                            {r.activities.length === 0 ? (
                              <span className="italic text-slate-400">
                                Tidak ada kegiatan
                              </span>
                            ) : (
                              <div>
                                <span className="font-bold text-slate-800">
                                  {r.activities.length} entri —{" "}
                                </span>
                                <span className="line-clamp-2">
                                  1. {r.activities[0].description}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-right align-top">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => onViewRecord(r)}
                                className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span>Detail</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => onRequestDeleteRecord(r)}
                                aria-label={`Hapus shift ${formatDateShort(r.dateISO)}`}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                              >
                                <Trash className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>

      {/* ========== PRINT-ONLY FORMAL DOCUMENT ========== */}
      <article className="hidden text-black print:block">
        {/* Kop Surat Hotel */}
        <header className="border-b-4 border-double border-slate-900 pb-3 text-center">
          <h1 className="text-lg font-extrabold uppercase tracking-wide text-slate-950">
            {hotel.name.trim() || "IDENTITAS HOTEL BELUM DIATUR"}
          </h1>
          {hotel.address.trim() && (
            <p className="mt-0.5 text-xs text-slate-700">{hotel.address.trim()}</p>
          )}
        </header>

        {/* Judul Laporan */}
        <div className="mt-4 mb-4 text-center">
          <h2 className="text-base font-bold uppercase tracking-wider text-slate-950 underline underline-offset-4">
            LAPORAN REKAPITULASI KEAMANAN BULANAN
          </h2>
          <p className="mt-1 text-xs font-semibold text-slate-700">
            Periode: {periodText} &nbsp;|&nbsp; Tanggal Cetak: {printDateText}
          </p>
        </div>

        {/* Ringkasan Eksekutif Print */}
        <div className="mb-4 grid grid-cols-5 border border-slate-900 text-center">
          <div className="border-r border-slate-900 p-2">
            <div className="text-[10px] font-semibold uppercase text-slate-600">
              Total Shift
            </div>
            <div className="mt-0.5 font-mono text-sm font-bold tabular-nums">
              {filtered.length}
            </div>
          </div>
          <div className="border-r border-slate-900 p-2">
            <div className="text-[10px] font-semibold uppercase text-slate-600">
              Sepeda Motor
            </div>
            <div className="mt-0.5 font-mono text-sm font-bold tabular-nums">
              {vehicleTotals.motor}
            </div>
          </div>
          <div className="border-r border-slate-900 p-2">
            <div className="text-[10px] font-semibold uppercase text-slate-600">
              Mobil
            </div>
            <div className="mt-0.5 font-mono text-sm font-bold tabular-nums">
              {vehicleTotals.mobil}
            </div>
          </div>
          <div className="border-r border-slate-900 p-2">
            <div className="text-[10px] font-semibold uppercase text-slate-600">
              Box / Vendor
            </div>
            <div className="mt-0.5 font-mono text-sm font-bold tabular-nums">
              {vehicleTotals.box}
            </div>
          </div>
          <div className="bg-slate-100 p-2">
            <div className="text-[10px] font-bold uppercase text-slate-800">
              Grand Total
            </div>
            <div className="mt-0.5 font-mono text-sm font-extrabold tabular-nums">
              {grandTotal} Unit
            </div>
          </div>
        </div>

        {/* Tabel Data Lengkap */}
        <table className="w-full border-collapse border border-slate-900 text-[11px]">
          <thead>
            <tr className="bg-slate-100 text-left font-bold text-slate-950">
              <th className="border border-slate-900 px-2 py-1.5 text-center w-8">No</th>
              <th className="border border-slate-900 px-2 py-1.5">Tanggal</th>
              <th className="border border-slate-900 px-2 py-1.5">Shift &amp; Jam</th>
              <th className="border border-slate-900 px-2 py-1.5">Petugas</th>
              <th className="border border-slate-900 px-2 py-1.5 text-center">Motor</th>
              <th className="border border-slate-900 px-2 py-1.5 text-center">Mobil</th>
              <th className="border border-slate-900 px-2 py-1.5 text-center">Box</th>
              <th className="border border-slate-900 px-2 py-1.5 text-center">Total</th>
              <th className="border border-slate-900 px-2 py-1.5">Log Kegiatan Shift</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={r.id}>
                <td className="border border-slate-900 px-2 py-1.5 text-center align-top tabular-nums">
                  {i + 1}
                </td>
                <td className="border border-slate-900 px-2 py-1.5 align-top whitespace-nowrap">
                  <div className="font-semibold">{formatDateShort(r.dateISO)}</div>
                  <div className="text-[10px] text-slate-700">
                    {weekdayShort(r.dateISO)}
                  </div>
                </td>
                <td className="border border-slate-900 px-2 py-1.5 align-top whitespace-nowrap">
                  <div className="font-semibold">{SHIFT_OPTIONS[r.shift].label}</div>
                  <div className="font-mono text-[10px]">{r.shiftHours}</div>
                </td>
                <td className="border border-slate-900 px-2 py-1.5 align-top">
                  {r.officer.trim() || "-"}
                </td>
                <td className="border border-slate-900 px-2 py-1.5 text-center align-top font-mono tabular-nums">
                  {r.vehicles.motor}
                </td>
                <td className="border border-slate-900 px-2 py-1.5 text-center align-top font-mono tabular-nums">
                  {r.vehicles.mobil}
                </td>
                <td className="border border-slate-900 px-2 py-1.5 text-center align-top font-mono tabular-nums">
                  {r.vehicles.box}
                </td>
                <td className="border border-slate-900 px-2 py-1.5 text-center align-top font-mono font-bold tabular-nums">
                  {totalVehicles(r.vehicles)}
                </td>
                <td className="border border-slate-900 px-2 py-1.5 align-top">
                  {r.activities.length === 0 ? (
                    <span className="text-slate-500">-</span>
                  ) : (
                    <ul className="space-y-0.5">
                      {r.activities.map((a, idx) => (
                        <li key={a.id}>
                          <span className="font-mono font-semibold">{idx + 1}.</span>{" "}
                          {a.description}
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 font-bold">
              <td
                colSpan={4}
                className="border border-slate-900 px-2 py-1.5 text-right uppercase"
              >
                Total Keseluruhan ({filtered.length} Shift)
              </td>
              <td className="border border-slate-900 px-2 py-1.5 text-center font-mono tabular-nums">
                {vehicleTotals.motor}
              </td>
              <td className="border border-slate-900 px-2 py-1.5 text-center font-mono tabular-nums">
                {vehicleTotals.mobil}
              </td>
              <td className="border border-slate-900 px-2 py-1.5 text-center font-mono tabular-nums">
                {vehicleTotals.box}
              </td>
              <td className="border border-slate-900 px-2 py-1.5 text-center font-mono tabular-nums">
                {grandTotal}
              </td>
              <td className="border border-slate-900 px-2 py-1.5 text-[10px]">
                Total {totalActivities} kegiatan tercatat
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Kolom Tanda Tangan */}
        <div className="print-break-avoid mt-10 grid grid-cols-2 gap-12 text-center text-xs">
          <div>
            <p>Mengetahui,</p>
            <p className="font-bold">
              {signatories.approverTitle.trim() || "Chief Security / General Manager"}
            </p>
            <div className="h-20" />
            <p className="font-bold underline underline-offset-4">
              {signatories.approverName.trim() || "( ........................................ )"}
            </p>
          </div>

          <div>
            <p>
              {signatories.city.trim() ? `${signatories.city.trim()}, ` : ""}
              {printDateText}
            </p>
            <p>Dibuat oleh,</p>
            <p className="font-bold">
              {signatories.makerTitle.trim() || "Koordinator Keamanan / Danru"}
            </p>
            <div className="h-16" />
            <p className="font-bold underline underline-offset-4">
              {signatories.makerName.trim() || "( ........................................ )"}
            </p>
          </div>
        </div>
      </article>
    </div>
  );
}
