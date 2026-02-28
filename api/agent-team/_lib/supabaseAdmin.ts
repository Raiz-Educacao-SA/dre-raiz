import { createClient, SupabaseClient } from '@supabase/supabase-js';

export function supabaseAdmin(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error('SUPABASE_URL não configurado — defina no ambiente do backend');
  }

  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurado — nunca use anon key no backend');
  }

  return createClient(url, key);
}
