export type ShiftKey = "pagi" | "siang" | "malam";

export interface HotelInfo {
  name: string;
  address: string;
}

export interface VehicleCount {
  motor: number;
  mobil: number;
  box: number;
}

export interface Activity {
  id: string;
  description: string;
  time?: string; // legacy optional field
}

export interface OverhandleParty {
  name: string;
  signed: boolean;
  signedAt: string; // HH:mm
}

export interface OverhandleInfo {
  comment: string;
  photoDataUrl: string;
  handoverBy: OverhandleParty;
  receivedBy: OverhandleParty;
}

export interface ActiveShift {
  dateISO: string; // YYYY-MM-DD
  shift: ShiftKey;
  shiftHours: string;
  officer: string;
  vehicles: VehicleCount;
  activities: Activity[];
  overhandle: OverhandleInfo;
}

export interface ShiftRecord extends ActiveShift {
  id: string;
  dateLabel: string; // e.g. "Selasa, 17 November 2026"
  shiftLabel: string;
  hotelName: string;
  hotelAddress: string;
  savedAt: string; // ISO timestamp
}

export interface Signatories {
  approverTitle: string;
  approverName: string;
  makerTitle: string;
  makerName: string;
  city: string;
}
