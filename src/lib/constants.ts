import type { ShiftKey } from "./types";

export const STORAGE_KEYS = {
  hotel: "securilog_hotel",
  activeShift: "securilog_active_shift",
  history: "logbook_history",
  signatories: "securilog_signatories",
} as const;

export const SHIFT_OPTIONS: Record<
  ShiftKey,
  { label: string; short: string; hours: string; order: number }
> = {
  pagi: { label: "Shift 1 (Pagi)", short: "Pagi", hours: "08:00 - 16:00", order: 1 },
  siang: { label: "Shift 2 (Siang)", short: "Siang", hours: "16:00 - 00:00", order: 2 },
  malam: { label: "Shift 3 (Malam)", short: "Malam", hours: "00:00 - 08:00", order: 3 },
};

export const MONTHS_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export const VEHICLE_LABELS = {
  motor: "Sepeda Motor",
  mobil: "Mobil",
  box: "Kendaraan Box/Vendor",
} as const;

export const OVERHANDLE_COMMENT_MAX_LENGTH = 1000;
