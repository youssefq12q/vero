import { createBrowserClient } from '@supabase/ssr'

/**
 * Creates a browser-safe Supabase client.
 * Uses Vite's import.meta.env on the client, or process.env when rendering server-side.
 */
export const createClient = () => {
  const supabaseUrlRaw = 
    (typeof window !== 'undefined' ? ((import.meta as any).env?.VITE_SUPABASE_URL) : undefined) ||
    process.env.VITE_SUPABASE_URL || 
    process.env.SUPABASE_URL || 
    "";
    
  const supabaseAnonKeyRaw = 
    (typeof window !== 'undefined' ? ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY) : undefined) ||
    process.env.VITE_SUPABASE_ANON_KEY || 
    process.env.SUPABASE_ANON_KEY || 
    "";

  const supabaseUrl = supabaseUrlRaw.replace(/^['"]|['"]$/g, "").trim();
  const supabaseAnonKey = supabaseAnonKeyRaw.replace(/^['"]|['"]$/g, "").trim();

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
