// Imported by both API routes and the worker (plain tsx), so no `server-only` marker here.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let admin: SupabaseClient | null | undefined;

// Service-role client: bypasses RLS. Server only. Returns null when env is missing
// so local runs without a database still work (callers must tolerate null).
export function adminClient(): SupabaseClient | null {
  if (admin !== undefined) return admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  admin = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  return admin;
}
