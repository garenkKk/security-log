import {
  AlignmentType,
  BorderStyle,
  Document,
  ImageRun,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  UnderlineType,
  VerticalAlignTable,
  WidthType,
} from "docx";
import { SHIFT_OPTIONS } from "./constants";
import type { ActiveShift, HotelInfo } from "./types";
import {
  downloadBlob,
  emptyOverhandle,
  formatDateID,
  getOverhandleStatus,
  slugify,
  totalVehicles,
} from "./utils";

// A4 page geometry in twips (1440 twips = 1 inch = 25.4 mm)
const PAGE_WIDTH_DXA = 11906; // 210 mm
const PAGE_HEIGHT_DXA = 16838; // 297 mm
const PAGE_MARGIN_DXA = 720; // 12.7 mm (~0.5 in) for roomy mobile & A4 layout
const CONTENT_WIDTH_DXA = PAGE_WIDTH_DXA - PAGE_MARGIN_DXA * 2; // 10466 twips

const COLOR_DARK = "0F172A";
const COLOR_MUTED = "475569";
const COLOR_BORDER = "475569";
const COLOR_HEADER_BG = "F1F5F9";
const COLOR_SUBTLE_BG = "F8FAFC";
const COLOR_OK = "166534";
const COLOR_WARN = "991B1B";

const FONT_NAME = "Calibri";
const MAX_PHOTO_WIDTH_PX = 340;
const MAX_PHOTO_HEIGHT_PX = 240;

const BORDER_THIN = {
  style: BorderStyle.SINGLE,
  size: 6,
  color: COLOR_BORDER,
} as const;

const CELL_MARGINS = {
  marginUnitType: WidthType.DXA,
  top: 90,
  bottom: 90,
  left: 130,
  right: 130,
} as const;

type DocxRasterType = "jpg" | "png" | "gif" | "bmp";

interface EmbeddedImageData {
  bytes: Uint8Array;
  type: DocxRasterType;
  width: number;
  height: number;
}

function fitDimensions(srcWidth: number, srcHeight: number): { width: number; height: number } {
  const safeW = srcWidth > 0 ? srcWidth : MAX_PHOTO_WIDTH_PX;
  const safeH = srcHeight > 0 ? srcHeight : MAX_PHOTO_HEIGHT_PX;
  const scale = Math.min(1, MAX_PHOTO_WIDTH_PX / safeW, MAX_PHOTO_HEIGHT_PX / safeH);
  return {
    width: Math.max(1, Math.round(safeW * scale)),
    height: Math.max(1, Math.round(safeH * scale)),
  };
}

function loadHtmlImage(src: string, useCors: boolean): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (useCors) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Gagal memuat gambar untuk Word."));
    img.src = src;
  });
}

function decodeBase64DataUrl(dataUrl: string): { type: DocxRasterType; bytes: Uint8Array } | null {
  const match = /^data:image\/(jpeg|jpg|png|gif|bmp);base64,(.+)$/i.exec(dataUrl.trim());
  if (!match) return null;

  const subtype = match[1].toLowerCase();
  const type: DocxRasterType = subtype === "jpeg" ? "jpg" : (subtype as DocxRasterType);
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return { type, bytes };
}

async function rasterizeViaCanvas(img: HTMLImageElement): Promise<EmbeddedImageData | null> {
  const { width, height } = fitDimensions(img.naturalWidth || img.width, img.naturalHeight || img.height);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth || width;
  canvas.height = img.naturalHeight || height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.85),
  );
  if (!blob) return null;

  const buffer = await blob.arrayBuffer();
  return {
    bytes: new Uint8Array(buffer),
    type: "jpg",
    width,
    height,
  };
}

async function loadImageForDocx(src: string): Promise<EmbeddedImageData | null> {
  if (!src.trim() || typeof window === "undefined") return null;

  try {
    const decoded = decodeBase64DataUrl(src);
    if (decoded) {
      const img = await loadHtmlImage(src, false);
      const { width, height } = fitDimensions(img.naturalWidth, img.naturalHeight);
      return {
        bytes: decoded.bytes,
        type: decoded.type,
        width,
        height,
      };
    }

    const isDataUrl = src.startsWith("data:");
    const img = await loadHtmlImage(src, !isDataUrl);
    return await rasterizeViaCanvas(img);
  } catch {
    return null;
  }
}

function multiLineRuns(
  text: string,
  opts?: {
    bold?: boolean;
    italics?: boolean;
    size?: number;
    color?: string;
  },
): TextRun[] {
  const lines = text.split(/\r?\n/);
  return lines.map(
    (line, idx) =>
      new TextRun({
        text: line,
        bold: opts?.bold,
        italics: opts?.italics,
        size: opts?.size ?? 20,
        color: opts?.color ?? COLOR_DARK,
        break: idx > 0 ? 1 : undefined,
      }),
  );
}

function makeTextCell(
  text: string,
  widthDxa: number,
  opts?: {
    bold?: boolean;
    italics?: boolean;
    size?: number;
    color?: string;
    shading?: string;
    align?: (typeof AlignmentType)[keyof typeof AlignmentType];
  },
): TableCell {
  return new TableCell({
    width: { size: widthDxa, type: WidthType.DXA },
    margins: CELL_MARGINS,
    verticalAlign: VerticalAlignTable.TOP,
    shading: opts?.shading
      ? { type: ShadingType.CLEAR, fill: opts.shading, color: "auto" }
      : undefined,
    borders: {
      top: BORDER_THIN,
      bottom: BORDER_THIN,
      left: BORDER_THIN,
      right: BORDER_THIN,
    },
    children: [
      new Paragraph({
        alignment: opts?.align ?? AlignmentType.LEFT,
        spacing: { before: 10, after: 10, line: 260 },
        children: multiLineRuns(text, {
          bold: opts?.bold,
          italics: opts?.italics,
          size: opts?.size,
          color: opts?.color,
        }),
      }),
    ],
  });
}

function makeFixedTable(columnWidths: readonly number[], rows: TableRow[]): Table {
  return new Table({
    width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [...columnWidths],
    borders: {
      top: BORDER_THIN,
      bottom: BORDER_THIN,
      left: BORDER_THIN,
      right: BORDER_THIN,
      insideHorizontal: BORDER_THIN,
      insideVertical: BORDER_THIN,
    },
    rows,
  });
}

function makeSectionTitle(text: string): Paragraph {
  return new Paragraph({
    keepNext: true,
    spacing: { before: 220, after: 80 },
    children: [
      new TextRun({
        text: text.toUpperCase(),
        bold: true,
        size: 21,
        color: COLOR_DARK,
      }),
    ],
  });
}

function makeSignatureCell(
  roleTitle: string,
  subtitle: string,
  signerName: string,
  widthDxa: number,
): TableCell {
  const hasName = signerName.trim().length > 0;
  return new TableCell({
    width: { size: widthDxa, type: WidthType.DXA },
    margins: {
      marginUnitType: WidthType.DXA,
      top: 110,
      bottom: 110,
      left: 100,
      right: 100,
    },
    verticalAlign: VerticalAlignTable.TOP,
    borders: {
      top: BORDER_THIN,
      bottom: BORDER_THIN,
      left: BORDER_THIN,
      right: BORDER_THIN,
    },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 20 },
        children: [
          new TextRun({
            text: roleTitle,
            bold: true,
            size: 20,
            color: COLOR_DARK,
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 560 },
        children: [
          new TextRun({
            text: subtitle,
            size: 18,
            color: COLOR_MUTED,
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 0 },
        children: [
          new TextRun({
            text: hasName ? signerName.trim() : "( .................. )",
            bold: true,
            size: hasName ? 20 : 19,
            color: COLOR_DARK,
            underline: hasName ? { type: UnderlineType.SINGLE } : undefined,
          }),
        ],
      }),
    ],
  });
}

export async function buildShiftDocxBlob(hotel: HotelInfo, s: ActiveShift): Promise<Blob> {
  const v = s.vehicles;
  const ov = s.overhandle ?? emptyOverhandle();
  const ovStatus = getOverhandleStatus(ov);
  const hotelName = hotel.name.trim() || "IDENTITAS HOTEL BELUM DIATUR";
  const hotelAddress = hotel.address.trim();

  const handoverName = ov.handoverBy.name.trim() || s.officer.trim() || "Petugas Shift Lama";
  const receivedName = ov.receivedBy.name.trim() || "Petugas Shift Baru";
  const diserahkanDocName = ov.handoverBy.name.trim() || s.officer.trim();
  const diterimaDocName = ov.receivedBy.name.trim();
  const commentText = ov.comment.trim() || "- Tidak ada komentar overhandle -";
  const hasComment = ov.comment.trim().length > 0;

  const kopDividerBorder = {
    bottom: {
      style: BorderStyle.DOUBLE,
      size: 6,
      color: COLOR_DARK,
      space: 6,
    },
  } as const;

  const headerParagraphs: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: hotelAddress ? 40 : 140 },
      border: hotelAddress ? undefined : kopDividerBorder,
      children: [
        new TextRun({
          text: hotelName.toUpperCase(),
          bold: true,
          size: 28,
          color: COLOR_DARK,
        }),
      ],
    }),
  ];

  if (hotelAddress) {
    headerParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 140 },
        border: kopDividerBorder,
        children: [
          new TextRun({
            text: hotelAddress,
            size: 19,
            color: COLOR_MUTED,
          }),
        ],
      }),
    );
  }

  headerParagraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 80, after: 180 },
      children: [
        new TextRun({
          text: "LAPORAN KEAMANAN SHIFT",
          bold: true,
          size: 24,
          color: COLOR_DARK,
          underline: { type: UnderlineType.SINGLE },
        }),
      ],
    }),
  );

  // Meta Table (2900 + 7566 = 10466 DXA)
  const metaTable = makeFixedTable(
    [2900, 7566],
    [
      new TableRow({
        cantSplit: true,
        children: [
          makeTextCell("Hari / Tanggal", 2900, { bold: true, shading: COLOR_HEADER_BG }),
          makeTextCell(`${formatDateID(s.dateISO)} (${s.dateISO})`, 7566),
        ],
      }),
      new TableRow({
        cantSplit: true,
        children: [
          makeTextCell("Shift", 2900, { bold: true, shading: COLOR_HEADER_BG }),
          makeTextCell(SHIFT_OPTIONS[s.shift].label, 7566),
        ],
      }),
      new TableRow({
        cantSplit: true,
        children: [
          makeTextCell("Jam Shift", 2900, { bold: true, shading: COLOR_HEADER_BG }),
          makeTextCell(s.shiftHours || "-", 7566),
        ],
      }),
      new TableRow({
        cantSplit: true,
        children: [
          makeTextCell("Petugas", 2900, { bold: true, shading: COLOR_HEADER_BG }),
          makeTextCell(s.officer.trim() || "-", 7566),
        ],
      }),
    ],
  );

  // 1. Log Kegiatan Shift (780 + 9686 = 10466 DXA)
  const activityRows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      cantSplit: true,
      children: [
        makeTextCell("No", 780, {
          bold: true,
          shading: COLOR_HEADER_BG,
          align: AlignmentType.CENTER,
        }),
        makeTextCell("Uraian Kegiatan", 9686, {
          bold: true,
          shading: COLOR_HEADER_BG,
        }),
      ],
    }),
  ];

  if (s.activities.length === 0) {
    activityRows.push(
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            columnSpan: 2,
            width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
            margins: CELL_MARGINS,
            borders: {
              top: BORDER_THIN,
              bottom: BORDER_THIN,
              left: BORDER_THIN,
              right: BORDER_THIN,
            },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 40, after: 40 },
                children: [
                  new TextRun({
                    text: "Tidak ada kegiatan tercatat pada shift ini.",
                    italics: true,
                    size: 20,
                    color: COLOR_MUTED,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    );
  } else {
    s.activities.forEach((a, idx) => {
      activityRows.push(
        new TableRow({
          cantSplit: true,
          children: [
            makeTextCell(String(idx + 1), 780, {
              bold: true,
              align: AlignmentType.CENTER,
            }),
            makeTextCell(a.description, 9686),
          ],
        }),
      );
    });
  }

  const activityTable = makeFixedTable([780, 9686], activityRows);

  // 2. Rekap Kendaraan Parkir (3488 + 3489 + 3489 = 10466 DXA)
  const vehicleTable = makeFixedTable(
    [3488, 3489, 3489],
    [
      new TableRow({
        tableHeader: true,
        cantSplit: true,
        children: [
          makeTextCell("Sepeda Motor", 3488, {
            bold: true,
            shading: COLOR_HEADER_BG,
            align: AlignmentType.CENTER,
          }),
          makeTextCell("Mobil", 3489, {
            bold: true,
            shading: COLOR_HEADER_BG,
            align: AlignmentType.CENTER,
          }),
          makeTextCell("Total Kendaraan", 3489, {
            bold: true,
            shading: COLOR_HEADER_BG,
            align: AlignmentType.CENTER,
          }),
        ],
      }),
      new TableRow({
        cantSplit: true,
        children: [
          makeTextCell(`${v.motor} unit`, 3488, {
            bold: true,
            align: AlignmentType.CENTER,
          }),
          makeTextCell(`${v.mobil} unit`, 3489, {
            bold: true,
            align: AlignmentType.CENTER,
          }),
          makeTextCell(`${totalVehicles(v)} unit`, 3489, {
            bold: true,
            shading: COLOR_SUBTLE_BG,
            align: AlignmentType.CENTER,
          }),
        ],
      }),
    ],
  );

  // 3. Serah Terima Tugas (Overhandle) (3200 + 7266 = 10466 DXA)
  const overhandleTable = makeFixedTable(
    [3200, 7266],
    [
      new TableRow({
        cantSplit: true,
        children: [
          makeTextCell("Status Overhandle", 3200, { bold: true, shading: COLOR_HEADER_BG }),
          makeTextCell(ovStatus.label, 7266, {
            bold: true,
            color: ovStatus.complete ? COLOR_OK : COLOR_WARN,
          }),
        ],
      }),
      new TableRow({
        cantSplit: true,
        children: [
          makeTextCell("Komentar / Catatan", 3200, { bold: true, shading: COLOR_HEADER_BG }),
          makeTextCell(commentText, 7266, {
            italics: !hasComment,
            color: hasComment ? COLOR_DARK : COLOR_MUTED,
          }),
        ],
      }),
      new TableRow({
        cantSplit: true,
        children: [
          makeTextCell("Menyerahkan (Shift Lama)", 3200, {
            bold: true,
            shading: COLOR_HEADER_BG,
          }),
          makeTextCell(
            ov.handoverBy.signed
              ? `[✓] ${handoverName} (Pukul ${ov.handoverBy.signedAt || "-"})`
              : "[×] BELUM TTD",
            7266,
            {
              bold: true,
              color: ov.handoverBy.signed ? COLOR_OK : COLOR_WARN,
            },
          ),
        ],
      }),
      new TableRow({
        cantSplit: true,
        children: [
          makeTextCell("Menerima (Shift Baru)", 3200, {
            bold: true,
            shading: COLOR_HEADER_BG,
          }),
          makeTextCell(
            ov.receivedBy.signed
              ? `[✓] ${receivedName} (Pukul ${ov.receivedBy.signedAt || "-"})`
              : "[×] BELUM TTD",
            7266,
            {
              bold: true,
              color: ov.receivedBy.signed ? COLOR_OK : COLOR_WARN,
            },
          ),
        ],
      }),
    ],
  );

  // Optional Overhandle Photo
  const photoChildren: Paragraph[] = [];
  if (ov.photoDataUrl) {
    const embedded = await loadImageForDocx(ov.photoDataUrl);
    if (embedded) {
      photoChildren.push(
        new Paragraph({
          keepNext: true,
          spacing: { before: 140, after: 60 },
          children: [
            new TextRun({
              text: "Bukti Foto Serah Terima:",
              bold: true,
              size: 20,
              color: COLOR_DARK,
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { before: 0, after: 120 },
          children: [
            new ImageRun({
              type: embedded.type,
              data: embedded.bytes,
              transformation: {
                width: embedded.width,
                height: embedded.height,
              },
              altText: {
                name: "Bukti Foto Overhandle",
                title: "Bukti Foto Serah Terima",
                description: "Foto bukti serah terima tugas security shift",
              },
            }),
          ],
        }),
      );
    } else {
      photoChildren.push(
        new Paragraph({
          spacing: { before: 120, after: 80 },
          children: [
            new TextRun({
              text: "Foto Bukti: Terlampir pada aplikasi (gagal disematkan ke Word).",
              italics: true,
              size: 19,
              color: COLOR_MUTED,
            }),
          ],
        }),
      );
    }
  } else {
    photoChildren.push(
      new Paragraph({
        spacing: { before: 120, after: 80 },
        children: [
          new TextRun({
            text: "Foto Bukti: Belum dilampirkan",
            italics: true,
            size: 19,
            color: COLOR_MUTED,
          }),
        ],
      }),
    );
  }

  // Signature Block (3488 + 3489 + 3489 = 10466 DXA)
  const signatureTable = makeFixedTable(
    [3488, 3489, 3489],
    [
      new TableRow({
        cantSplit: true,
        children: [
          makeSignatureCell("Diserahkan,", "Petugas Shift", diserahkanDocName, 3488),
          makeSignatureCell("Diketahui,", "Danru / Chief Security", "", 3489),
          makeSignatureCell("Diterima,", "Petugas Shift Berikutnya", diterimaDocName, 3489),
        ],
      }),
    ],
  );

  const doc = new Document({
    creator: "security-log",
    title: `Laporan Shift Keamanan - ${s.dateISO}`,
    description: `Laporan keamanan ${SHIFT_OPTIONS[s.shift].label} ${hotelName}`,
    styles: {
      default: {
        document: {
          run: {
            font: FONT_NAME,
            size: 20,
            color: COLOR_DARK,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: PAGE_WIDTH_DXA,
              height: PAGE_HEIGHT_DXA,
            },
            margin: {
              top: PAGE_MARGIN_DXA,
              right: PAGE_MARGIN_DXA,
              bottom: PAGE_MARGIN_DXA,
              left: PAGE_MARGIN_DXA,
            },
          },
        },
        children: [
          ...headerParagraphs,
          metaTable,
          makeSectionTitle("1. Log Kegiatan Shift"),
          activityTable,
          makeSectionTitle("2. Rekap Kendaraan Parkir"),
          vehicleTable,
          makeSectionTitle("3. Serah Terima Tugas (Overhandle)"),
          overhandleTable,
          ...photoChildren,
          new Paragraph({ spacing: { before: 120, after: 0 }, children: [] }),
          signatureTable,
        ],
      },
    ],
  });

  const buffer = await Packer.toArrayBuffer(doc);
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

export async function downloadShiftDocx(hotel: HotelInfo, s: ActiveShift): Promise<string> {
  const blob = await buildShiftDocxBlob(hotel, s);
  const filename = `security-log_Shift_${slugify(hotel.name)}_${s.dateISO}_${SHIFT_OPTIONS[s.shift].short}.docx`;
  downloadBlob(blob, filename);
  return filename;
}
