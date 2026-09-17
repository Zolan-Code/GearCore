import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // Desactiva el bloqueo de Web Locks para evitar congelamiento/deadlock en Brave Browser
      lock: async (_name, _acquireTimeout, fn) => await fn(),
    },
  },
);
