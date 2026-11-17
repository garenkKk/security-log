import * as XLSX from "xlsx";
import { MONTHS_ID, SHIFT_OPTIONS } from "./constants";
import type { HotelInfo, ShiftRecord } from "./types";
import {
  formatDateShort,
  getOverhandleStatus,
  monthLabel,
  slugify,
  sumVehicles,
  totalVehicles,
  weekdayShort,
} from "./utils";

export function downloadMonthlyWorkbook(
  hotel: HotelInfo,
  records: ShiftRecord[],
  month: number,
  year: number,
): string {
  const period = monthLabel(month, year);
  const hotelName = hotel.name.trim() || "-";
  const hotelAddress = hotel.address.trim() || "-";
  const totals = sumVehicles(records);
  const grandTotal = totalVehicles(totals);
  const totalActivities = records.reduce((sum, r) => sum + r.activities.length, 0);

  const completeCount = records.filter(
    (r) => getOverhandleStatus(r.overhandle).complete,
  ).length;
  const incompleteCount = records.length - completeCount;
  const completionRatio = records.length > 0 ? completeCount / records.length : 0;

  const shiftBreakdown = {
    pagi: records.filter((r) => r.shift === "pagi").length,
    siang: records.filter((r) => r.shift === "siang").length,
    malam: records.filter((r) => r.shift === "malam").length,
  };

  /* ---------- Sheet 1: Rekap Harian & Shift ---------- */
  const sheet1Rows: (string | number)[][] = [
    ["LAPORAN REKAPITULASI KEAMANAN BULANAN"],
    [`Hotel: ${hotelName}`],
    [`Alamat: ${hotelAddress}`],
    [`Periode: ${period}`],
    [],
    [
      "No",
      "Tanggal",
      "Shift",
      "Jam",
      "Petugas",
      "Sepeda Motor",
      "Mobil",
      "Box/Vendor",
      "Total Kendaraan",
      "Status Overhandle",
      "Detail Kegiatan",
    ],
  ];

  records.forEach((r, idx) => {
    const ovStatus = getOverhandleStatus(r.overhandle);
    const activityText =
      r.activities.length > 0
        ? r.activities.map((a, i) => `${i + 1}. ${a.description}`).join("\n")
        : "-";

    sheet1Rows.push([
      idx + 1,
      `${weekdayShort(r.dateISO)}, ${formatDateShort(r.dateISO)}`,
      SHIFT_OPTIONS[r.shift].label,
      r.shiftHours || "-",
      r.officer.trim() || "-",
      r.vehicles.motor,
      r.vehicles.mobil,
      r.vehicles.box,
      totalVehicles(r.vehicles),
      ovStatus.label,
      activityText,
    ]);
  });

  sheet1Rows.push([
    "",
    "TOTAL BULANAN",
    `${records.length} Shift`,
    "",
    "",
    totals.motor,
    totals.mobil,
    totals.box,
    grandTotal,
    `${completeCount}/${records.length} Lengkap`,
    `${totalActivities} entri kegiatan tercatat`,
  ]);

  const ws1 = XLSX.utils.aoa_to_sheet(sheet1Rows);
  ws1["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 10 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 10 } },
  ];
  ws1["!cols"] = [
    { wch: 6 },
    { wch: 18 },
    { wch: 16 },
    { wch: 15 },
    { wch: 24 },
    { wch: 14 },
    { wch: 12 },
    { wch: 14 },
    { wch: 16 },
    { wch: 36 },
    { wch: 50 },
  ];

  /* ---------- Sheet 2: Ringkasan Eksekutif ---------- */
  const sheet2Rows: (string | number | XLSX.CellObject)[][] = [
    ["RINGKASAN EKSEKUTIF LAPORAN KEAMANAN"],
    [`Hotel: ${hotelName}`],
    [`Alamat: ${hotelAddress}`],
    [`Periode: ${period}`],
    [],
    ["Indikator Operasional & Kendaraan", "Nilai", "Keterangan"],
    [
      "Total Shift Berjalan",
      records.length,
      `Pagi: ${shiftBreakdown.pagi} | Siang: ${shiftBreakdown.siang} | Malam: ${shiftBreakdown.malam}`,
    ],
    ["Total Sepeda Motor", totals.motor, "Akumulasi unit sepeda motor"],
    ["Total Mobil", totals.mobil, "Akumulasi unit mobil tamu & operasional"],
    ["Total Kendaraan Box / Vendor", totals.box, "Akumulasi kendaraan logistik & vendor"],
    ["Grand Total Kendaraan", grandTotal, `Total seluruh kendaraan (${period})`],
    ["Total Log Kegiatan Shift", totalActivities, "Jumlah aktivitas tercatat selama bulan berjalan"],
    [],
    ["Indikator Kepatuhan Overhandle", "Nilai", "Keterangan"],
    [
      "Shift Overhandle Lengkap",
      completeCount,
      "Ditandatangani 2 pihak (Shift Lama & Shift Baru)",
    ],
    [
      "Shift Belum Overhandle",
      incompleteCount,
      "Menunggu tanda tangan lengkap",
    ],
    [
      "Persentase Kelengkapan Overhandle",
      { t: "n", v: completionRatio, z: "0.0%" },
      `${completeCount} dari ${records.length} shift berstatus OVERHANDLE LENGKAP`,
    ],
  ];

  const ws2 = XLSX.utils.aoa_to_sheet(sheet2Rows);
  ws2["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 2 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 2 } },
  ];
  ws2["!cols"] = [{ wch: 34 }, { wch: 16 }, { wch: 48 }];

  /* ---------- Build & Save Workbook ---------- */
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws1, "Rekap Harian & Shift");
  XLSX.utils.book_append_sheet(wb, ws2, "Ringkasan Eksekutif");

  const filename = `security-log_Rekap_${slugify(hotel.name)}_${slugify(MONTHS_ID[month - 1])}_${year}.xlsx`;
  XLSX.writeFileXLSX(wb, filename);
  return filename;
}
