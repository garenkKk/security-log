import {
  MONTHS_ID,
  OVERHANDLE_COMMENT_MAX_LENGTH,
  SHIFT_OPTIONS,
  STORAGE_KEYS,
  VEHICLE_LABELS,
} from "./constants";
import type {
  ActiveShift,
  Activity,
  HotelInfo,
  OverhandleInfo,
  OverhandleParty,
  ShiftKey,
  ShiftRecord,
  Signatories,
  VehicleCount,
} from "./types";

/* ---------- ID & storage ---------- */

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveJSON<T>(key: string, value: T): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/* ---------- Date & time ---------- */

const pad = (n: number) => String(n).padStart(2, "0");

/** Local date (not UTC) in YYYY-MM-DD */
export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function nowHHMM(): string {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Guess the current shift based on the clock */
export function currentShiftKey(): ShiftKey {
  const h = new Date().getHours();
  if (h >= 8 && h < 16) return "pagi";
  if (h >= 16) return "siang";
  return "malam";
}

function parseISODate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** "Selasa, 17 November 2026" */
export function formatDateID(iso: string): string {
  const d = parseISODate(iso);
  if (!d) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

/** "17/11/2026" */
export function formatDateShort(iso: string): string {
  const d = parseISODate(iso);
  if (!d) return "-";
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** "Sel" */
export function weekdayShort(iso: string): string {
  const d = parseISODate(iso);
  if (!d) return "";
  return new Intl.DateTimeFormat("id-ID", { weekday: "short" }).format(d);
}

export function monthLabel(month: number, year: number): string {
  return `${MONTHS_ID[month - 1]} ${year}`;
}

/* ---------- Data helpers ---------- */

export const totalVehicles = (v: VehicleCount) => v.motor + v.mobil + v.box;

export function emptyVehicles(): VehicleCount {
  return { motor: 0, mobil: 0, box: 0 };
}

export function emptyOverhandle(): OverhandleInfo {
  return {
    comment: "",
    photoDataUrl: "",
    handoverBy: { name: "", signed: false, signedAt: "" },
    receivedBy: { name: "", signed: false, signedAt: "" },
  };
}

export interface OverhandleStatusResult {
  complete: boolean;
  label: string;
  shortLabel: string;
}

export function getOverhandleStatus(ov: OverhandleInfo): OverhandleStatusResult {
  const handoverSigned = ov.handoverBy.signed;
  const receivedSigned = ov.receivedBy.signed;

  if (handoverSigned && receivedSigned) {
    return {
      complete: true,
      label: "OVERHANDLE LENGKAP",
      shortLabel: "OVERHANDLE LENGKAP",
    };
  }

  const missing: string[] = [];
  if (!handoverSigned) {
    missing.push(
      ov.handoverBy.name.trim()
        ? `${ov.handoverBy.name.trim()} (Shift Lama)`
        : "Petugas Menyerahkan",
    );
  }
  if (!receivedSigned) {
    missing.push(
      ov.receivedBy.name.trim()
        ? `${ov.receivedBy.name.trim()} (Shift Baru)`
        : "Petugas Menerima",
    );
  }

  return {
    complete: false,
    label: `BELUM OVERHANDLE (Menunggu TTD ${missing.join(" & ")})`,
    shortLabel: `BELUM OVERHANDLE (${missing.join(" & ")})`,
  };
}

export function defaultActiveShift(): ActiveShift {
  const shift = currentShiftKey();
  return {
    dateISO: todayISO(),
    shift,
    shiftHours: SHIFT_OPTIONS[shift].hours,
    officer: "",
    vehicles: emptyVehicles(),
    activities: [],
    overhandle: emptyOverhandle(),
  };
}

export function sortRecords(records: ShiftRecord[]): ShiftRecord[] {
  return [...records].sort((a, b) => {
    if (a.dateISO !== b.dateISO) return a.dateISO.localeCompare(b.dateISO);
    return SHIFT_OPTIONS[a.shift].order - SHIFT_OPTIONS[b.shift].order;
  });
}

/* ---------- WhatsApp text ---------- */

export function buildWhatsAppText(hotel: HotelInfo, s: ActiveShift): string {
  const line = "━━━━━━━━━━━━━━━━━━";
  const v = s.vehicles;
  const ov = s.overhandle ?? emptyOverhandle();
  const ovStatus = getOverhandleStatus(ov);
  const handoverName = ov.handoverBy.name.trim() || s.officer.trim() || "Petugas Shift Lama";
  const receivedName = ov.receivedBy.name.trim() || "Petugas Shift Baru";

  const lines: string[] = [];

  lines.push("*LAPORAN SHIFT KEAMANAN*");
  if (hotel.name.trim()) lines.push(`*${hotel.name.trim().toUpperCase()}*`);
  if (hotel.address.trim()) lines.push(hotel.address.trim());
  lines.push(line);
  lines.push(`📅 Hari/Tanggal : ${formatDateID(s.dateISO)}`);
  lines.push(`🔄 Shift : ${SHIFT_OPTIONS[s.shift].label}`);
  lines.push(`⏰ Jam Shift : ${s.shiftHours || "-"}`);
  lines.push(`👮 Petugas : ${s.officer.trim() || "-"}`);
  lines.push(line);
  lines.push("*🚗 REKAP KENDARAAN PARKIR*");
  lines.push(`• ${VEHICLE_LABELS.motor} : ${v.motor} unit`);
  lines.push(`• ${VEHICLE_LABELS.mobil} : ${v.mobil} unit`);
  lines.push(`• ${VEHICLE_LABELS.box} : ${v.box} unit`);
  lines.push(`*Total Kendaraan : ${totalVehicles(v)} unit*`);
  lines.push(line);
  lines.push("*📝 LOG KEGIATAN SHIFT*");
  if (s.activities.length === 0) {
    lines.push("- Tidak ada kegiatan tercatat -");
  } else {
    s.activities.forEach((a, i) => {
      lines.push(`${i + 1}. ${a.description}`);
    });
  }
  lines.push(line);
  lines.push("*🤝 STATUS OVERHANDLE*");
  lines.push(`• Status: ${ovStatus.label}`);
  lines.push(`• Komentar / Catatan: ${ov.comment.trim() || "-"}`);
  lines.push(
    ov.handoverBy.signed
      ? `[✓] Menyerahkan: ${handoverName} (${ov.handoverBy.signedAt || "-"})`
      : "[✗] Menyerahkan: BELUM TTD",
  );
  lines.push(
    ov.receivedBy.signed
      ? `[✓] Menerima: ${receivedName} (${ov.receivedBy.signedAt || "-"})`
      : "[✗] Menerima: BELUM TTD",
  );
  lines.push(ov.photoDataUrl ? "[✓] Foto Bukti Terlampir" : "[✗] Foto Bukti Belum Ada");
  lines.push(line);
  lines.push("Situasi: Aman & Terkendali ✅");
  lines.push("");
  lines.push("Dilaporkan oleh,");
  lines.push(`*${s.officer.trim() || "Petugas Keamanan"}*`);

  return lines.join("\n");
}

/* ---------- Clipboard (with fallback for non-secure contexts, e.g. LAN IP) ---------- */

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "0";
    ta.style.left = "0";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/* ---------- CSV export ---------- */

/** Strip characters that Excel may garble when opening a non-BOM CSV */
function toExcelSafe(text: string): string {
  return text
    .replace(/[\u2013\u2014\u2212]/g, "-")
    .replace(/[\u2018\u2019\u201A]/g, "'")
    .replace(/[\u201C\u201D\u201E]/g, '"')
    .replace(/\u2026/g, "...")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\r?\n/g, " ");
}

function csvCell(value: string | number): string {
  const s = toExcelSafe(String(value ?? ""));
  return `"${s.replace(/"/g, '""')}"`;
}

export function buildMonthlyCSV(
  hotel: HotelInfo,
  records: ShiftRecord[],
  month: number,
  year: number,
): string {
  const SEP = ";";
  const row = (cells: (string | number)[]) => cells.map(csvCell).join(SEP);
  const totals = records.reduce(
    (acc, r) => ({
      motor: acc.motor + r.vehicles.motor,
      mobil: acc.mobil + r.vehicles.mobil,
      box: acc.box + r.vehicles.box,
    }),
    emptyVehicles(),
  );

  const out: string[] = [];
  // Tells Excel (any locale) to use semicolon as the delimiter
  out.push(`sep=${SEP}`);
  out.push(row(["LAPORAN REKAPITULASI KEAMANAN BULANAN"]));
  out.push(row(["Nama Hotel", hotel.name || "-"]));
  out.push(row(["Alamat", hotel.address || "-"]));
  out.push(row(["Periode", monthLabel(month, year)]));
  out.push("");
  out.push(row(["RINGKASAN"]));
  out.push(row(["Total Shift Tercatat", records.length]));
  out.push(row(["Total Sepeda Motor", totals.motor]));
  out.push(row(["Total Mobil", totals.mobil]));
  out.push(row(["Total Box/Vendor", totals.box]));
  out.push(row(["Grand Total Kendaraan", totalVehicles(totals)]));
  out.push("");
  out.push(
    row([
      "No",
      "Hari/Tanggal",
      "Tanggal",
      "Shift",
      "Jam Shift",
      "Petugas",
      "Sepeda Motor",
      "Mobil",
      "Box/Vendor",
      "Total Kendaraan",
      "Jumlah Kegiatan",
      "Detail Kegiatan",
    ]),
  );
  records.forEach((r, i) => {
    out.push(
      row([
        i + 1,
        formatDateID(r.dateISO),
        formatDateShort(r.dateISO),
        SHIFT_OPTIONS[r.shift].label,
        r.shiftHours,
        r.officer || "-",
        r.vehicles.motor,
        r.vehicles.mobil,
        r.vehicles.box,
        totalVehicles(r.vehicles),
        r.activities.length,
        r.activities.map((a, idx) => `${idx + 1}. ${a.description}`).join(" | ") || "-",
      ]),
    );
  });
  out.push(
    row([
      "",
      "TOTAL",
      "",
      "",
      "",
      "",
      totals.motor,
      totals.mobil,
      totals.box,
      totalVehicles(totals),
      records.reduce((n, r) => n + r.activities.length, 0),
      "",
    ]),
  );

  return out.join("\r\n");
}

export function downloadTextFile(content: string, filename: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function slugify(text: string): string {
  return (
    toExcelSafe(text)
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || "Hotel"
  );
}

/* ---------- Sanitizers & Monthly Aggregations ---------- */

function isShiftKey(val: unknown): val is ShiftKey {
  return val === "pagi" || val === "siang" || val === "malam";
}

function toNonNegInt(val: unknown): number {
  const n = typeof val === "number" ? val : Number(val);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

function normalizeVehicles(raw: unknown): VehicleCount {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    motor: toNonNegInt(obj.motor),
    mobil: toNonNegInt(obj.mobil),
    box: toNonNegInt(obj.box),
  };
}

function normalizeActivities(raw: unknown): Activity[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map((item) => ({
      id: typeof item.id === "string" && item.id ? item.id : uid(),
      description: typeof item.description === "string" ? item.description : "",
    }))
    .filter((a) => a.description.trim().length > 0);
}

function normalizeParty(raw: unknown): OverhandleParty {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const signed = Boolean(obj.signed);
  return {
    name: typeof obj.name === "string" ? obj.name : "",
    signed,
    signedAt: signed && typeof obj.signedAt === "string" ? obj.signedAt : "",
  };
}

export function normalizeOverhandle(raw: unknown): OverhandleInfo {
  const def = emptyOverhandle();
  if (!raw || typeof raw !== "object") return def;
  const obj = raw as Record<string, unknown>;
  const rawComment = typeof obj.comment === "string" ? obj.comment : "";
  return {
    comment: rawComment.slice(0, OVERHANDLE_COMMENT_MAX_LENGTH),
    photoDataUrl:
      typeof obj.photoDataUrl === "string" && obj.photoDataUrl.startsWith("data:image/")
        ? obj.photoDataUrl
        : "",
    handoverBy: normalizeParty(obj.handoverBy),
    receivedBy: normalizeParty(obj.receivedBy),
  };
}

export async function compressImageToDataUrl(
  file: File,
  maxWidth = 600,
  quality = 0.7,
): Promise<{ dataUrl: string; width: number; height: number; sizeKB: number }> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Gagal memuat file gambar."));
      el.src = objectUrl;
    });

    const natW = img.naturalWidth || img.width || maxWidth;
    const natH = img.naturalHeight || img.height || maxWidth;
    const scale = natW > maxWidth ? maxWidth / natW : 1;
    const width = Math.max(1, Math.round(natW * scale));
    const height = Math.max(1, Math.round(natH * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas tidak didukung di browser ini.");
    }
    // Fill white background before drawing so PNG transparency becomes clean white in JPEG
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    const sizeKB = Math.max(1, Math.round((dataUrl.length * 3) / 4 / 1024));
    return { dataUrl, width, height, sizeKB };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function loadHotel(): HotelInfo {
  const raw = loadJSON<unknown>(STORAGE_KEYS.hotel, null);
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    name: typeof obj.name === "string" ? obj.name : "",
    address: typeof obj.address === "string" ? obj.address : "",
  };
}

const LEGACY_SHIFT_HOURS = new Set([
  "07:00 - 15:00",
  "15:00 - 23:00",
  "23:00 - 07:00",
]);

export function loadActiveShift(): ActiveShift {
  const def = defaultActiveShift();
  const raw = loadJSON<unknown>(STORAGE_KEYS.activeShift, null);
  if (!raw || typeof raw !== "object") return def;
  const obj = raw as Record<string, unknown>;
  const shift: ShiftKey = isShiftKey(obj.shift) ? obj.shift : def.shift;
  const rawHours = typeof obj.shiftHours === "string" ? obj.shiftHours.trim() : "";
  const shiftHours =
    rawHours && !LEGACY_SHIFT_HOURS.has(rawHours)
      ? rawHours
      : SHIFT_OPTIONS[shift].hours;
  return {
    dateISO:
      typeof obj.dateISO === "string" && /^\d{4}-\d{2}-\d{2}$/.test(obj.dateISO)
        ? obj.dateISO
        : def.dateISO,
    shift,
    shiftHours,
    officer: typeof obj.officer === "string" ? obj.officer : "",
    vehicles: normalizeVehicles(obj.vehicles),
    activities: normalizeActivities(obj.activities),
    overhandle: normalizeOverhandle(obj.overhandle),
  };
}

export function loadHistory(): ShiftRecord[] {
  const raw = loadJSON<unknown>(STORAGE_KEYS.history, []);
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map((item) => {
      const shift: ShiftKey = isShiftKey(item.shift) ? item.shift : "pagi";
      const dateISO =
        typeof item.dateISO === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.dateISO)
          ? item.dateISO
          : todayISO();
      return {
        id: typeof item.id === "string" && item.id ? item.id : uid(),
        dateISO,
        dateLabel: typeof item.dateLabel === "string" && item.dateLabel ? item.dateLabel : formatDateID(dateISO),
        shift,
        shiftLabel:
          typeof item.shiftLabel === "string" && item.shiftLabel
            ? item.shiftLabel
            : SHIFT_OPTIONS[shift].label,
        shiftHours:
          typeof item.shiftHours === "string" && item.shiftHours
            ? item.shiftHours
            : SHIFT_OPTIONS[shift].hours,
        officer: typeof item.officer === "string" ? item.officer : "",
        vehicles: normalizeVehicles(item.vehicles),
        activities: normalizeActivities(item.activities),
        overhandle: normalizeOverhandle(item.overhandle),
        hotelName: typeof item.hotelName === "string" ? item.hotelName : "",
        hotelAddress: typeof item.hotelAddress === "string" ? item.hotelAddress : "",
        savedAt: typeof item.savedAt === "string" ? item.savedAt : new Date().toISOString(),
      };
    });
}

export function defaultSignatories(): Signatories {
  return {
    approverTitle: "Chief Security / General Manager",
    approverName: "",
    makerTitle: "Koordinator Keamanan / Danru",
    makerName: "",
    city: "",
  };
}

export function loadSignatories(): Signatories {
  const def = defaultSignatories();
  const raw = loadJSON<unknown>(STORAGE_KEYS.signatories, null);
  if (!raw || typeof raw !== "object") return def;
  const obj = raw as Record<string, unknown>;
  return {
    approverTitle:
      typeof obj.approverTitle === "string" && obj.approverTitle.trim()
        ? obj.approverTitle
        : def.approverTitle,
    approverName: typeof obj.approverName === "string" ? obj.approverName : "",
    makerTitle:
      typeof obj.makerTitle === "string" && obj.makerTitle.trim()
        ? obj.makerTitle
        : def.makerTitle,
    makerName: typeof obj.makerName === "string" ? obj.makerName : "",
    city: typeof obj.city === "string" ? obj.city : "",
  };
}

export function filterRecordsByMonth(
  records: ShiftRecord[],
  month: number,
  year: number,
): ShiftRecord[] {
  const prefix = `${year}-${pad(month)}-`;
  return sortRecords(records.filter((r) => r.dateISO.startsWith(prefix)));
}

export function sumVehicles(records: ShiftRecord[]): VehicleCount {
  return records.reduce(
    (acc, r) => ({
      motor: acc.motor + r.vehicles.motor,
      mobil: acc.mobil + r.vehicles.mobil,
      box: acc.box + r.vehicles.box,
    }),
    emptyVehicles(),
  );
}

export function getAvailableYears(records: ShiftRecord[], currentYear: number): number[] {
  const set = new Set<number>([currentYear - 1, currentYear, currentYear + 1]);
  for (const r of records) {
    const y = Number(r.dateISO.slice(0, 4));
    if (Number.isInteger(y) && y >= 2000 && y <= 2100) {
      set.add(y);
    }
  }
  return Array.from(set).sort((a, b) => b - a);
}

/* ---------- Word (.doc) Export for Active Shift ---------- */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildShiftDocHtml(hotel: HotelInfo, s: ActiveShift): string {
  const v = s.vehicles;
  const ov = s.overhandle ?? emptyOverhandle();
  const ovStatus = getOverhandleStatus(ov);
  const handoverName = ov.handoverBy.name.trim() || s.officer.trim() || "Petugas Shift Lama";
  const receivedName = ov.receivedBy.name.trim() || "Petugas Shift Baru";
  const diserahkanDocName = ov.handoverBy.name.trim() || s.officer.trim();
  const diterimaDocName = ov.receivedBy.name.trim();
  const commentHtml = ov.comment.trim()
    ? escapeHtml(ov.comment.trim()).replace(/\r?\n/g, "<br />")
    : "<em>- Tidak ada komentar overhandle -</em>";

  const activityRows =
    s.activities.length === 0
      ? `<tr><td colspan="2" style="text-align:center;color:#64748b;padding:8px;">Tidak ada kegiatan tercatat pada shift ini.</td></tr>`
      : s.activities
          .map(
            (a, idx) =>
              `<tr>
                <td style="width:42px;text-align:center;font-weight:bold;">${idx + 1}</td>
                <td>${escapeHtml(a.description)}</td>
              </tr>`,
          )
          .join("");

  const photoHtml = ov.photoDataUrl
    ? `<div style="margin-top:10px;">
         <p style="margin:0 0 6px 0;font-weight:bold;font-size:11px;">Bukti Foto Serah Terima:</p>
         <img src="${ov.photoDataUrl}" width="320" alt="Bukti Foto Overhandle" style="border:1px solid #94a3b8;" />
       </div>`
    : `<p style="margin:8px 0 0 0;font-size:11px;color:#64748b;"><em>Foto Bukti: Belum dilampirkan</em></p>`;

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8" />
<title>Laporan Shift Keamanan - ${escapeHtml(formatDateShort(s.dateISO))}</title>
<style>
  @page { size: A4; margin: 16mm 14mm; }
  body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #0f172a; line-height: 1.4; }
  h1, h2, h3, p { margin: 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { border: 1px solid #334155; padding: 6px 8px; font-size: 10.5pt; vertical-align: top; }
  th { background-color: #f1f5f9; text-align: left; font-weight: bold; }
  .kop { text-align: center; border-bottom: 3px double #0f172a; padding-bottom: 8px; margin-bottom: 12px; }
  .kop h1 { font-size: 15pt; text-transform: uppercase; letter-spacing: 0.5px; }
  .kop p { font-size: 9.5pt; color: #334155; margin-top: 2px; }
  .title { text-align: center; margin-bottom: 12px; }
  .title h2 { font-size: 13pt; text-decoration: underline; text-transform: uppercase; }
  .section-title { font-size: 11pt; font-weight: bold; text-transform: uppercase; margin-top: 14px; margin-bottom: 4px; color: #0f172a; }
</style>
</head>
<body>
  <div class="kop">
    <h1>${escapeHtml(hotel.name.trim() || "IDENTITAS HOTEL BELUM DIATUR")}</h1>
    ${hotel.address.trim() ? `<p>${escapeHtml(hotel.address.trim())}</p>` : ""}
  </div>

  <div class="title">
    <h2>LAPORAN KEAMANAN SHIFT</h2>
  </div>

  <table>
    <tr>
      <th style="width:160px;">Hari / Tanggal</th>
      <td>${escapeHtml(formatDateID(s.dateISO))} (${escapeHtml(s.dateISO)})</td>
    </tr>
    <tr>
      <th>Shift</th>
      <td>${escapeHtml(SHIFT_OPTIONS[s.shift].label)}</td>
    </tr>
    <tr>
      <th>Jam Shift</th>
      <td>${escapeHtml(s.shiftHours || "-")}</td>
    </tr>
    <tr>
      <th>Petugas</th>
      <td>${escapeHtml(s.officer.trim() || "-")}</td>
    </tr>
  </table>

  <div class="section-title">1. Rekap Kendaraan Parkir</div>
  <table>
    <thead>
      <tr>
        <th>Sepeda Motor</th>
        <th>Mobil</th>
        <th>Kendaraan Box / Vendor</th>
        <th>Total Kendaraan</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="text-align:center;font-weight:bold;">${v.motor} unit</td>
        <td style="text-align:center;font-weight:bold;">${v.mobil} unit</td>
        <td style="text-align:center;font-weight:bold;">${v.box} unit</td>
        <td style="text-align:center;font-weight:bold;background:#f8fafc;">${totalVehicles(v)} unit</td>
      </tr>
    </tbody>
  </table>

  <div class="section-title">2. Log Kegiatan Shift</div>
  <table>
    <thead>
      <tr>
        <th style="width:42px;text-align:center;">No</th>
        <th>Uraian Kegiatan</th>
      </tr>
    </thead>
    <tbody>
      ${activityRows}
    </tbody>
  </table>

  <div class="section-title">3. Serah Terima Tugas (Overhandle)</div>
  <table>
    <tr>
      <th style="width:160px;">Status Overhandle</th>
      <td style="font-weight:bold;color:${ovStatus.complete ? "#166534" : "#991b1b"};">
        ${escapeHtml(ovStatus.label)}
      </td>
    </tr>
    <tr>
      <th>Komentar / Catatan</th>
      <td>${commentHtml}</td>
    </tr>
    <tr>
      <th>Menyerahkan (Shift Lama)</th>
      <td>${
        ov.handoverBy.signed
          ? `[&#10003;] ${escapeHtml(handoverName)} (Pukul ${escapeHtml(ov.handoverBy.signedAt || "-")})`
          : "[&#10007;] BELUM TTD"
      }</td>
    </tr>
    <tr>
      <th>Menerima (Shift Baru)</th>
      <td>${
        ov.receivedBy.signed
          ? `[&#10003;] ${escapeHtml(receivedName)} (Pukul ${escapeHtml(ov.receivedBy.signedAt || "-")})`
          : "[&#10007;] BELUM TTD"
      }</td>
    </tr>
  </table>
  ${photoHtml}

  <table style="margin-top:24px;">
    <tr>
      <td style="width:33.3%;text-align:center;border:1px solid #334155;padding:10px 8px;">
        <strong>Diserahkan,</strong><br />
        <span style="font-size:9.5pt;color:#475569;">Petugas Shift</span><br /><br /><br /><br />
        <strong><u>${escapeHtml(diserahkanDocName || "( ................................. )")}</u></strong>
      </td>
      <td style="width:33.3%;text-align:center;border:1px solid #334155;padding:10px 8px;">
        <strong>Diketahui,</strong><br />
        <span style="font-size:9.5pt;color:#475569;">Danru / Chief Security</span><br /><br /><br /><br />
        <strong>( ................................. )</strong>
      </td>
      <td style="width:33.3%;text-align:center;border:1px solid #334155;padding:10px 8px;">
        <strong>Diterima,</strong><br />
        <span style="font-size:9.5pt;color:#475569;">Petugas Shift Berikutnya</span><br /><br /><br /><br />
        <strong><u>${escapeHtml(diterimaDocName || "( ................................. )")}</u></strong>
      </td>
    </tr>
  </table>
</body>
</html>`;
}



