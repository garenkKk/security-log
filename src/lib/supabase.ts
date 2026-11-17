import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
const SUPABASE_KEY = (
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  ""
).trim();

const PLACEHOLDER_MARKERS = [
  "ISI_PROJECT_ID_ANDA",
  "ISI_ANON_PUBLIC_KEY",
  "YOUR_PROJECT_ID",
  "YOUR_SUPABASE",
  "your-project",
];

function hasPlaceholder(val: string): boolean {
  return PLACEHOLDER_MARKERS.some((marker) => val.includes(marker));
}

export function isSupabaseConfigured(): boolean {
  if (!SUPABASE_URL || !SUPABASE_KEY) return false;
  if (hasPlaceholder(SUPABASE_URL) || hasPlaceholder(SUPABASE_KEY)) return false;
  try {
    const parsed = new URL(SUPABASE_URL);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!cachedClient) {
    cachedClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }
  return cachedClient;
}
