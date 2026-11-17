import { SHIFT_OPTIONS } from "./constants";
import { getSupabaseClient } from "./supabase";
import type { Activity, HotelInfo, ShiftKey, ShiftRecord, Signatories } from "./types";
import {
  defaultSignatories,
  formatDateID,
  getOverhandleStatus,
  totalVehicles,
  uid,
} from "./utils";

export interface HotelSettingsRow {
  id: string;
  name: string;
  address: string;
  approver_title: string;
  approver_name: string;
  maker_title: string;
  maker_name: string;
  city: string;
  updated_at: string;
}

export interface ShiftLogRow {
  id: string;
  date_iso: string;
  date_label: string;
  shift: string;
  shift_label: string;
  shift_hours: string;
  officer: string;
  motor_count: number;
  mobil_count: number;
  box_count: number;
  total_vehicles: number;
  activities: unknown;
  overhandle_comment: string;
  overhandle_photo: string;
  handover_by_name: string;
  handover_by_signed: boolean;
  handover_by_signed_at: string;
  received_by_name: string;
  received_by_signed: boolean;
  received_by_signed_at: string;
  overhandle_complete: boolean;
  overhandle_status: string;
  hotel_name: string;
  hotel_address: string;
  created_at: string;
}

function isShiftKey(val: unknown): val is ShiftKey {
  return val === "pagi" || val === "siang" || val === "malam";
}

function toNonNegInt(val: unknown): number {
  const n = typeof val === "number" ? val : Number(val);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

function normalizeActivitiesJson(raw: unknown): Activity[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map((item) => ({
      id: typeof item.id === "string" && item.id ? item.id : uid(),
      description: typeof item.description === "string" ? item.description : "",
    }))
    .filter((a) => a.description.trim().length > 0);
}

export function rowToHotelAndSignatories(row: Partial<HotelSettingsRow>): {
  hotel: HotelInfo;
  signatories: Signatories;
} {
  const defSig = defaultSignatories();
  return {
    hotel: {
      name: typeof row.name === "string" ? row.name : "",
      address: typeof row.address === "string" ? row.address : "",
    },
    signatories: {
      approverTitle:
        typeof row.approver_title === "string" && row.approver_title.trim()
          ? row.approver_title
          : defSig.approverTitle,
      approverName: typeof row.approver_name === "string" ? row.approver_name : "",
      makerTitle:
        typeof row.maker_title === "string" && row.maker_title.trim()
          ? row.maker_title
          : defSig.makerTitle,
      makerName: typeof row.maker_name === "string" ? row.maker_name : "",
      city: typeof row.city === "string" ? row.city : "",
    },
  };
}

export function rowToShiftRecord(row: Partial<ShiftLogRow>): ShiftRecord {
  const shift: ShiftKey = isShiftKey(row.shift) ? row.shift : "pagi";
  const rawDate = typeof row.date_iso === "string" ? row.date_iso.slice(0, 10) : "";
  const dateISO = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : "2026-01-01";
  const handoverSigned = Boolean(row.handover_by_signed);
  const receivedSigned = Boolean(row.received_by_signed);

  return {
    id: typeof row.id === "string" && row.id ? row.id : uid(),
    dateISO,
    dateLabel:
      typeof row.date_label === "string" && row.date_label
        ? row.date_label
        : formatDateID(dateISO),
    shift,
    shiftLabel:
      typeof row.shift_label === "string" && row.shift_label
        ? row.shift_label
        : SHIFT_OPTIONS[shift].label,
    shiftHours:
      typeof row.shift_hours === "string" && row.shift_hours
        ? row.shift_hours
        : SHIFT_OPTIONS[shift].hours,
    officer: typeof row.officer === "string" ? row.officer : "",
    vehicles: {
      motor: toNonNegInt(row.motor_count),
      mobil: toNonNegInt(row.mobil_count),
      box: toNonNegInt(row.box_count),
    },
    activities: normalizeActivitiesJson(row.activities),
    overhandle: {
      comment: typeof row.overhandle_comment === "string" ? row.overhandle_comment : "",
      photoDataUrl:
        typeof row.overhandle_photo === "string" ? row.overhandle_photo : "",
      handoverBy: {
        name: typeof row.handover_by_name === "string" ? row.handover_by_name : "",
        signed: handoverSigned,
        signedAt:
          handoverSigned && typeof row.handover_by_signed_at === "string"
            ? row.handover_by_signed_at
            : "",
      },
      receivedBy: {
        name: typeof row.received_by_name === "string" ? row.received_by_name : "",
        signed: receivedSigned,
        signedAt:
          receivedSigned && typeof row.received_by_signed_at === "string"
            ? row.received_by_signed_at
            : "",
      },
    },
    hotelName: typeof row.hotel_name === "string" ? row.hotel_name : "",
    hotelAddress: typeof row.hotel_address === "string" ? row.hotel_address : "",
    savedAt:
      typeof row.created_at === "string" && row.created_at
        ? row.created_at
        : new Date().toISOString(),
  };
}

export async function fetchHotelSettings(): Promise<{
  hotel: HotelInfo;
  signatories: Signatories;
} | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data, error } = await client
    .from("hotel_settings")
    .select("*")
    .eq("id", "default")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) return null;
  return rowToHotelAndSignatories(data as HotelSettingsRow);
}

export async function upsertHotelSettings(
  hotel: HotelInfo,
  signatories: Signatories,
): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  const payload: HotelSettingsRow = {
    id: "default",
    name: hotel.name,
    address: hotel.address,
    approver_title: signatories.approverTitle,
    approver_name: signatories.approverName,
    maker_title: signatories.makerTitle,
    maker_name: signatories.makerName,
    city: signatories.city,
    updated_at: new Date().toISOString(),
  };

  const { error } = await client
    .from("hotel_settings")
    .upsert(payload, { onConflict: "id" });

  if (error) {
    throw new Error(error.message);
  }
}

export async function fetchShiftLogs(): Promise<ShiftRecord[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  const { data, error } = await client
    .from("shift_logs")
    .select("*")
    .order("date_iso", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }
  return ((data ?? []) as ShiftLogRow[]).map(rowToShiftRecord);
}

export async function insertShiftLog(record: ShiftRecord): Promise<ShiftRecord> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error("Supabase belum dikonfigurasi.");
  }

  const ov = record.overhandle;
  const ovStatus = getOverhandleStatus(ov);

  const payload: ShiftLogRow = {
    id: record.id,
    date_iso: record.dateISO,
    date_label: record.dateLabel,
    shift: record.shift,
    shift_label: record.shiftLabel,
    shift_hours: record.shiftHours,
    officer: record.officer,
    motor_count: record.vehicles.motor,
    mobil_count: record.vehicles.mobil,
    box_count: record.vehicles.box,
    total_vehicles: totalVehicles(record.vehicles),
    activities: record.activities,
    overhandle_comment: ov.comment,
    overhandle_photo: ov.photoDataUrl,
    handover_by_name: ov.handoverBy.name,
    handover_by_signed: ov.handoverBy.signed,
    handover_by_signed_at: ov.handoverBy.signedAt,
    received_by_name: ov.receivedBy.name,
    received_by_signed: ov.receivedBy.signed,
    received_by_signed_at: ov.receivedBy.signedAt,
    overhandle_complete: ovStatus.complete,
    overhandle_status: ovStatus.label,
    hotel_name: record.hotelName,
    hotel_address: record.hotelAddress,
    created_at: record.savedAt,
  };

  const { data, error } = await client
    .from("shift_logs")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return rowToShiftRecord(data as ShiftLogRow);
}

export async function deleteShiftLog(id: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error("Supabase belum dikonfigurasi.");
  }

  const { error } = await client.from("shift_logs").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}
