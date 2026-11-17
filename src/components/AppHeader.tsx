"use client";

import {
  Building,
  ClipboardList,
  Cloud,
  CloudCheck,
  CloudOff,
  FileChartColumn,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";

export type AppTab = "input" | "report";
export type SyncStatus = "syncing" | "synced" | "error" | "local";

interface AppHeaderProps {
  activeTab: AppTab;
  onChangeTab: (tab: AppTab) => void;
  hotelName: string;
  historyCount: number;
  syncStatus: SyncStatus;
  lastSyncedAt: string;
  onRetrySync: () => void;
}

export function AppHeader({
  activeTab,
  onChangeTab,
  hotelName,
  historyCount,
  syncStatus,
  lastSyncedAt,
  onRetrySync,
}: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm print:hidden">
      <div className="mx-auto max-w-5xl px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex min-w-0 items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.jpg"
              alt="Logo security-log"
              className="h-11 w-11 shrink-0 rounded-xl border border-slate-200 object-contain shadow-xs"
            />
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold tracking-tight text-slate-900 sm:text-lg">
                security-log
              </h1>
              <p className="truncate text-xs font-medium text-slate-500">
                Digital Security Shift &amp; Monthly Report
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Sync Status Pill */}
            {syncStatus === "syncing" && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-800">
                <LoaderCircle className="h-3.5 w-3.5 animate-spin text-sky-600" />
                <span>Menyinkronkan...</span>
              </span>
            )}

            {syncStatus === "synced" && (
              <span
                title={
                  lastSyncedAt
                    ? `Terakhir sinkron pukul ${lastSyncedAt}`
                    : "Tersinkronisasi real-time dengan Supabase Cloud"
                }
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <CloudCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>Tersinkron ke Cloud</span>
                {lastSyncedAt && (
                  <span className="hidden font-mono text-[10px] text-emerald-700 sm:inline">
                    ({lastSyncedAt})
                  </span>
                )}
              </span>
            )}

            {syncStatus === "error" && (
              <button
                type="button"
                onClick={onRetrySync}
                className="inline-flex items-center gap-1.5 rounded-full border border-rose-300 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-800 transition-colors hover:bg-rose-100"
              >
                <CloudOff className="h-3.5 w-3.5 text-rose-600" />
                <span>Gagal Sinkron</span>
                <RefreshCw className="h-3 w-3" />
              </button>
            )}

            {syncStatus === "local" && (
              <span
                title="Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY di .env.local untuk sinkronisasi cloud"
                className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800"
              >
                <Cloud className="h-3.5 w-3.5 text-amber-600" />
                <span>Mode Lokal</span>
              </span>
            )}

            <div className="hidden max-w-[200px] items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 md:flex">
              <Building className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden="true" />
              <span className="truncate">
                {hotelName.trim() || "Identitas Hotel Belum Diatur"}
              </span>
            </div>
          </div>
        </div>

        <nav
          role="tablist"
          aria-label="Navigasi Utama security-log"
          className="mt-3 grid grid-cols-2 gap-1.5 rounded-xl border border-slate-200 bg-slate-100 p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "input"}
            onClick={() => onChangeTab("input")}
            className={`flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all sm:text-sm ${
              activeTab === "input"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
            }`}
          >
            <ClipboardList className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">1. Input Shift Aktif</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "report"}
            onClick={() => onChangeTab("report")}
            className={`flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all sm:text-sm ${
              activeTab === "report"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
            }`}
          >
            <FileChartColumn className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">2. Rekap Laporan Bulanan</span>
            <span
              className={`inline-flex min-w-[22px] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${
                activeTab === "report"
                  ? "bg-white/20 text-white"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {historyCount}
            </span>
          </button>
        </nav>
      </div>
    </header>
  );
}
