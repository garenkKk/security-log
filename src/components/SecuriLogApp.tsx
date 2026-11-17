"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { browser } from "react-dom";
import { RefreshCw, TriangleExclamationPoint, X } from "lucide-react";
import { SHIFT_OPTIONS, STORAGE_KEYS } from "@/lib/constants";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import {
  deleteShiftLog,
  fetchHotelSettings,
  fetchShiftLogs,
  insertShiftLog,
  rowToHotelAndSignatories,
  rowToShiftRecord,
  upsertHotelSettings,
  type HotelSettingsRow,
  type ShiftLogRow,
} from "@/lib/supabase-db";
import type { ActiveShift, HotelInfo, ShiftRecord, Signatories } from "@/lib/types";
import {
  defaultSignatories,
  emptyOverhandle,
  emptyVehicles,
  formatDateID,
  formatDateShort,
  loadActiveShift,
  loadHistory,
  loadHotel,
  loadSignatories,
  nowHHMM,
  saveJSON,
  totalVehicles,
  uid,
} from "@/lib/utils";
import { ActiveShiftTab } from "./ActiveShiftTab";
import { AppHeader, type AppTab, type SyncStatus } from "./AppHeader";
import { ConfirmModal } from "./ConfirmModal";
import { MonthlyReportTab } from "./MonthlyReportTab";
import { PhotoModal } from "./PhotoModal";
import { ShiftDetailModal } from "./ShiftDetailModal";
import { Toast, type ToastState, type ToastTone } from "./Toast";

export function SecuriLogApp() {
  use(browser("security-log uses browser storage and local device clock."));

  const cloudEnabled = isSupabaseConfigured();

  const [activeTab, setActiveTab] = useState<AppTab>("input");
  const [hotel, setHotel] = useState<HotelInfo>(() =>
    cloudEnabled ? { name: "", address: "" } : loadHotel(),
  );
  const [activeShift, setActiveShift] = useState<ActiveShift>(() => loadActiveShift());
  const [history, setHistory] = useState<ShiftRecord[]>(() =>
    cloudEnabled ? [] : loadHistory(),
  );
  const [signatories, setSignatories] = useState<Signatories>(() =>
    cloudEnabled ? defaultSignatories() : loadSignatories(),
  );

  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() =>
    cloudEnabled ? "syncing" : "local",
  );
  const [syncError, setSyncError] = useState<string>("");
  const [lastSyncedAt, setLastSyncedAt] = useState<string>("");
  const [isLoadingCloud, setIsLoadingCloud] = useState<boolean>(() => cloudEnabled);
  const [isSavingShift, setIsSavingShift] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showLocalBanner, setShowLocalBanner] = useState<boolean>(() => !cloudEnabled);

  const [detailRecord, setDetailRecord] = useState<ShiftRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ShiftRecord | null>(null);
  const [photoPreview, setPhotoPreview] = useState<{
    src: string;
    caption: string;
  } | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const toastTimerRef = useRef<number | null>(null);
  const hotelSyncTimerRef = useRef<number | null>(null);
  const pendingSelfShiftIdsRef = useRef<Set<string>>(new Set());
  const pendingHotelSyncRef = useRef<boolean>(false);

  const notify = useCallback((message: string, tone: ToastTone = "success") => {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    setToast({ id: Date.now(), message, tone });
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 3600);
  }, []);

  const syncFromCloud = useCallback(async () => {
    if (!cloudEnabled) return;
    setSyncStatus("syncing");
    setSyncError("");
    setIsLoadingCloud(true);
    try {
      const [settings, logs] = await Promise.all([
        fetchHotelSettings(),
        fetchShiftLogs(),
      ]);
      if (settings && !pendingHotelSyncRef.current) {
        setHotel(settings.hotel);
        setSignatories(settings.signatories);
      }
      setHistory(logs);
      setSyncStatus("synced");
      setLastSyncedAt(nowHHMM());
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Tidak dapat terhubung ke database Supabase.";
      setSyncStatus("error");
      setSyncError(msg);
    } finally {
      setIsLoadingCloud(false);
    }
  }, [cloudEnabled]);

  useEffect(() => {
    if (!cloudEnabled) return;

    const client = getSupabaseClient();
    if (!client) return;

    let active = true;

    async function init() {
      try {
        const [settings, logs] = await Promise.all([
          fetchHotelSettings(),
          fetchShiftLogs(),
        ]);
        if (!active) return;
        if (settings && !pendingHotelSyncRef.current) {
          setHotel(settings.hotel);
          setSignatories(settings.signatories);
        }
        setHistory(logs);
        setSyncStatus("synced");
        setLastSyncedAt(nowHHMM());
      } catch (err) {
        if (!active) return;
        const msg =
          err instanceof Error
            ? err.message
            : "Tidak dapat terhubung ke database Supabase.";
        setSyncStatus("error");
        setSyncError(msg);
      } finally {
        if (active) setIsLoadingCloud(false);
      }
    }

    void init();

    const channel = client
      .channel("security-log-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shift_logs" },
        (payload) => {
          if (!active) return;

          if (payload.eventType === "INSERT") {
            const incoming = rowToShiftRecord(payload.new as Partial<ShiftLogRow>);
            const isSelf = pendingSelfShiftIdsRef.current.delete(incoming.id);
            setHistory((prev) => {
              if (prev.some((r) => r.id === incoming.id)) return prev;
              return [incoming, ...prev];
            });
            setSyncStatus("synced");
            setLastSyncedAt(nowHHMM());
            if (!isSelf) {
              notify(
                `Shift baru masuk real-time: ${SHIFT_OPTIONS[incoming.shift].label} (${formatDateShort(incoming.dateISO)}).`,
                "info",
              );
            }
          } else if (payload.eventType === "UPDATE") {
            const updated = rowToShiftRecord(payload.new as Partial<ShiftLogRow>);
            setHistory((prev) =>
              prev.map((r) => (r.id === updated.id ? updated : r)),
            );
            setSyncStatus("synced");
            setLastSyncedAt(nowHHMM());
          } else if (payload.eventType === "DELETE") {
            const oldId = (payload.old as { id?: string } | null)?.id;
            if (oldId) {
              setHistory((prev) => prev.filter((r) => r.id !== oldId));
              setDetailRecord((cur) => (cur?.id === oldId ? null : cur));
              setSyncStatus("synced");
              setLastSyncedAt(nowHHMM());
            }
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "hotel_settings" },
        (payload) => {
          if (!active) return;
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const row = payload.new as Partial<HotelSettingsRow>;
            if (row.id === "default" && !pendingHotelSyncRef.current) {
              const mapped = rowToHotelAndSignatories(row);
              setHotel(mapped.hotel);
              setSignatories(mapped.signatories);
              setSyncStatus("synced");
              setLastSyncedAt(nowHHMM());
            }
          }
        },
      )
      .subscribe();

    return () => {
      active = false;
      void client.removeChannel(channel);
    };
  }, [cloudEnabled, notify]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
      if (hotelSyncTimerRef.current !== null) {
        window.clearTimeout(hotelSyncTimerRef.current);
      }
    };
  }, []);

  function scheduleCloudHotelSave(nextHotel: HotelInfo, nextSignatories: Signatories) {
    if (!cloudEnabled) return;
    pendingHotelSyncRef.current = true;
    setSyncStatus("syncing");
    setSyncError("");

    if (hotelSyncTimerRef.current !== null) {
      window.clearTimeout(hotelSyncTimerRef.current);
    }

    hotelSyncTimerRef.current = window.setTimeout(() => {
      hotelSyncTimerRef.current = null;
      void (async () => {
        try {
          await upsertHotelSettings(nextHotel, nextSignatories);
          setSyncStatus("synced");
          setLastSyncedAt(nowHHMM());
        } catch (err) {
          const msg =
            err instanceof Error
              ? err.message
              : "Gagal menyimpan identitas hotel ke Supabase.";
          setSyncStatus("error");
          setSyncError(msg);
          notify(`Gagal sinkron identitas hotel: ${msg}`, "warning");
        } finally {
          pendingHotelSyncRef.current = false;
        }
      })();
    }, 650);
  }

  function updateHotel(next: HotelInfo) {
    setHotel(next);
    if (cloudEnabled) {
      scheduleCloudHotelSave(next, signatories);
    } else {
      saveJSON(STORAGE_KEYS.hotel, next);
    }
  }

  function updateSignatories(next: Signatories) {
    setSignatories(next);
    if (cloudEnabled) {
      scheduleCloudHotelSave(hotel, next);
    } else {
      saveJSON(STORAGE_KEYS.signatories, next);
    }
  }

  function updateActiveShift(updater: (prev: ActiveShift) => ActiveShift) {
    setActiveShift((prev) => {
      const next = updater(prev);
      const saved = saveJSON(STORAGE_KEYS.activeShift, next);
      if (!saved) {
        notify(
          "Penyimpanan draft browser penuh. Kompres atau hapus foto jika terlalu besar.",
          "warning",
        );
      }
      return next;
    });
  }

  async function handleArchiveAndReset() {
    if (isSavingShift) return;

    const ov = activeShift.overhandle ?? emptyOverhandle();
    const hasOfficer = activeShift.officer.trim().length > 0;
    const hasVehicles = totalVehicles(activeShift.vehicles) > 0;
    const hasActivities = activeShift.activities.length > 0;
    const hasOverhandle =
      ov.handoverBy.signed ||
      ov.receivedBy.signed ||
      Boolean(ov.photoDataUrl) ||
      ov.comment.trim().length > 0;

    if (!hasOfficer && !hasVehicles && !hasActivities && !hasOverhandle) {
      notify(
        "Isi minimal Nama Petugas, jumlah kendaraan, log kegiatan, atau data overhandle sebelum menyimpan.",
        "warning",
      );
      return;
    }

    const record: ShiftRecord = {
      ...activeShift,
      id: uid(),
      dateLabel: formatDateID(activeShift.dateISO),
      shiftLabel: SHIFT_OPTIONS[activeShift.shift].label,
      hotelName: hotel.name.trim(),
      hotelAddress: hotel.address.trim(),
      savedAt: new Date().toISOString(),
    };

    if (cloudEnabled) {
      setIsSavingShift(true);
      setSyncStatus("syncing");
      setSyncError("");
      pendingSelfShiftIdsRef.current.add(record.id);

      try {
        const savedRecord = await insertShiftLog(record);
        setHistory((prev) =>
          prev.some((r) => r.id === savedRecord.id) ? prev : [savedRecord, ...prev],
        );

        const resetShift: ActiveShift = {
          ...activeShift,
          officer: "",
          vehicles: emptyVehicles(),
          activities: [],
          overhandle: emptyOverhandle(),
        };
        setActiveShift(resetShift);
        saveJSON(STORAGE_KEYS.activeShift, resetShift);

        setSyncStatus("synced");
        setLastSyncedAt(nowHHMM());
        notify(
          `Shift ${SHIFT_OPTIONS[savedRecord.shift].label} (${formatDateShort(savedRecord.dateISO)}) tersinkron ke Cloud & form direset.`,
          "success",
        );
      } catch (err) {
        pendingSelfShiftIdsRef.current.delete(record.id);
        const msg =
          err instanceof Error ? err.message : "Gagal menyimpan laporan ke Supabase.";
        setSyncStatus("error");
        setSyncError(msg);
        notify(`Gagal mengirim ke Cloud: ${msg}`, "warning");
      } finally {
        setIsSavingShift(false);
      }
      return;
    }

    const nextHistory = [record, ...history];
    const saved = saveJSON(STORAGE_KEYS.history, nextHistory);
    if (!saved) {
      notify(
        "Gagal menyimpan ke arsip lokal: kapasitas localStorage penuh. Hapus arsip lama terlebih dahulu.",
        "warning",
      );
      return;
    }
    setHistory(nextHistory);

    const resetShift: ActiveShift = {
      ...activeShift,
      officer: "",
      vehicles: emptyVehicles(),
      activities: [],
      overhandle: emptyOverhandle(),
    };
    setActiveShift(resetShift);
    saveJSON(STORAGE_KEYS.activeShift, resetShift);

    notify(
      `Shift ${SHIFT_OPTIONS[record.shift].label} (${formatDateShort(record.dateISO)}) berhasil disimpan (Mode Lokal) & form direset.`,
      "success",
    );
  }

  async function handleConfirmDelete() {
    if (!deleteTarget || isDeleting) return;
    const target = deleteTarget;

    if (cloudEnabled) {
      setIsDeleting(true);
      setSyncStatus("syncing");
      try {
        await deleteShiftLog(target.id);
        setHistory((prev) => prev.filter((item) => item.id !== target.id));
        if (detailRecord?.id === target.id) {
          setDetailRecord(null);
        }
        setDeleteTarget(null);
        setSyncStatus("synced");
        setLastSyncedAt(nowHHMM());
        notify(
          `Arsip shift ${formatDateShort(target.dateISO)} (${SHIFT_OPTIONS[target.shift].label}) telah dihapus dari Cloud.`,
          "info",
        );
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Gagal menghapus arsip dari Supabase.";
        setSyncStatus("error");
        setSyncError(msg);
        notify(`Gagal menghapus dari Cloud: ${msg}`, "warning");
      } finally {
        setIsDeleting(false);
      }
      return;
    }

    const nextHistory = history.filter((item) => item.id !== target.id);
    setHistory(nextHistory);
    saveJSON(STORAGE_KEYS.history, nextHistory);
    if (detailRecord?.id === target.id) {
      setDetailRecord(null);
    }
    setDeleteTarget(null);
    notify(
      `Arsip shift ${formatDateShort(target.dateISO)} (${SHIFT_OPTIONS[target.shift].label}) telah dihapus.`,
      "info",
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 print:min-h-0 print:bg-white">
      <AppHeader
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        hotelName={hotel.name}
        historyCount={history.length}
        syncStatus={syncStatus}
        lastSyncedAt={lastSyncedAt}
        onRetrySync={() => void syncFromCloud()}
      />

      {/* Status/Notice Banner for Unconfigured .env.local or Sync Error */}
      {!cloudEnabled && showLocalBanner && (
        <div className="mx-auto mt-3 w-full max-w-5xl px-4 sm:px-6 print:hidden">
          <div className="flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900">
            <p className="leading-relaxed">
              <span className="font-bold">Mode Penyimpanan Lokal: </span>
              Untuk sinkronisasi Cloud Supabase antar HP secara real-time, isi{" "}
              <code className="rounded bg-amber-100 px-1 py-0.5 font-mono font-semibold">
                NEXT_PUBLIC_SUPABASE_URL
              </code>{" "}
              dan{" "}
              <code className="rounded bg-amber-100 px-1 py-0.5 font-mono font-semibold">
                NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
              </code>{" "}
              pada file <code className="font-mono font-semibold">.env.local</code>.
            </p>
            <button
              type="button"
              onClick={() => setShowLocalBanner(false)}
              aria-label="Tutup info mode lokal"
              className="rounded p-1 text-amber-700 hover:bg-amber-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {cloudEnabled && syncStatus === "error" && (
        <div className="mx-auto mt-3 w-full max-w-5xl px-4 sm:px-6 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-300 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-900">
            <div className="flex items-start gap-2">
              <TriangleExclamationPoint className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              <div>
                <span className="font-bold">Sinkronisasi Supabase Gagal: </span>
                <span>{syncError || "Periksa koneksi internet & tabel Supabase."}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void syncFromCloud()}
              className="inline-flex items-center gap-1 rounded-lg bg-rose-700 px-2.5 py-1 font-bold text-white hover:bg-rose-800"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Coba Lagi</span>
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-4 sm:px-6 sm:py-6 print:max-w-none print:p-0">
        {activeTab === "input" ? (
          <ActiveShiftTab
            hotel={hotel}
            onUpdateHotel={updateHotel}
            shift={activeShift}
            onUpdateShift={updateActiveShift}
            onArchiveAndReset={() => void handleArchiveAndReset()}
            isSavingShift={isSavingShift}
            isCloudEnabled={cloudEnabled}
            onPreviewPhoto={(src, caption) => setPhotoPreview({ src, caption })}
            onNotify={notify}
          />
        ) : (
          <MonthlyReportTab
            hotel={hotel}
            history={history}
            signatories={signatories}
            isLoadingCloud={isLoadingCloud}
            isCloudEnabled={cloudEnabled}
            onRefreshCloud={() => void syncFromCloud()}
            onUpdateSignatories={updateSignatories}
            onViewRecord={setDetailRecord}
            onRequestDeleteRecord={setDeleteTarget}
            onGoToInput={() => setActiveTab("input")}
            onNotify={notify}
          />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-3 text-center text-xs text-slate-500 print:hidden">
        security-log — Digital Security Shift &amp; Monthly Report &bull;{" "}
        {cloudEnabled ? "Tersinkron Cloud Supabase Real-Time" : "Penyimpanan Lokal"}
      </footer>

      <ShiftDetailModal
        record={detailRecord}
        fallbackHotel={hotel}
        onClose={() => setDetailRecord(null)}
        onCopied={() => notify("Format WhatsApp arsip shift berhasil disalin.", "success")}
      />

      <PhotoModal
        src={photoPreview?.src ?? null}
        caption={photoPreview?.caption}
        onClose={() => setPhotoPreview(null)}
      />

      <ConfirmModal
        open={deleteTarget !== null}
        title="Hapus Arsip Shift?"
        description={
          deleteTarget
            ? `Data shift ${SHIFT_OPTIONS[deleteTarget.shift].label} tanggal ${formatDateID(deleteTarget.dateISO)} akan dihapus permanen${cloudEnabled ? " dari Supabase Cloud" : ""}.`
            : ""
        }
        busy={isDeleting}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => {
          if (!isDeleting) setDeleteTarget(null);
        }}
      />

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
