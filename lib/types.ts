export type VerifyStatus =
  | "GENUINE_FIRST"
  | "REPEAT_SAME_DEVICE"
  | "CLONE_DETECTED"
  | "INVALID_PIN"
  | "NOT_FOUND"
  | "BAD_REQUEST";

export interface VerifyResponse {
  status: VerifyStatus;
  message: string;
  drug_name?: string;
  batch_no?: string;
  exp_date?: string;
  velocity?: string;
  distance_km?: number;
  prev_city?: string;
  current_city?: string;
  prev_scanned_at?: string;
}

export type ScanVerdict =
  | "GENUINE_FIRST"
  | "REPEAT_SAME_DEVICE"
  | "CLONE_DETECTED"
  | "INVALID_PIN"
  | "NOT_FOUND";

export interface ScanFeedItem {
  id: number;
  serial_number: string;
  device_fingerprint: string;
  city: string;
  lat: number | null;
  lng: number | null;
  scanned_at: string;
  verdict: ScanVerdict;
  velocity_kmh: number;
  drug_name: string | null;
  batch_no: string | null;
  prev_city: string | null;
  prev_lat: number | null;
  prev_lng: number | null;
  prev_scanned_at: string | null;
  distance_km: number | null;
}

export interface AdminOverview {
  generated_at: string;
  kpis: {
    cleanScans: number;
    repeatScans: number;
    cloneIncidents: number;
    counterfeitAttempts: number;
    activeBatches: number;
    serializedUnits: number;
    totalScans: number;
  };
  feed: ScanFeedItem[];
  incidents: ScanFeedItem[];
}

export interface MintedItem {
  serial_number: string;
  pin: string;
  qr_data_url: string;
  drug_name: string;
  batch_no: string;
  mfg_date: string;
  exp_date: string;
}

export interface MintResponse {
  batch_no: string;
  drug_name: string;
  mfg_date: string;
  exp_date: string;
  quantity: number;
  items: MintedItem[];
}
