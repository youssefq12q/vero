import { createServerClient } from '@supabase/ssr'

/**
 * Creates a server-side Supabase client using @supabase/ssr.
 * This is designed to be highly compatible with various server-side cookie handlers,
 * including frameworks like Express or Next.js.
 * 
 * @param cookieStore An optional standard or Next-like cookie store object
 */
export function createClient(cookieStore?: any) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

  // If a cookie store is provided (e.g. Next.js cookies() or a custom adapter), use it
  if (cookieStore) {
    return createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          if (typeof cookieStore.getAll === 'function') {
            return cookieStore.getAll().map((cookie: any) => ({
              name: cookie.name,
              value: cookie.value,
            }));
          }
          return [];
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              if (typeof cookieStore.set === 'function') {
                cookieStore.set(name, value, options);
              }
            });
          } catch {
            // Ignore if we are in an environment that doesn't permit setting headers
          }
        },
      },
    });
  }

  // Default fallback for general server-side scripting or REST interactions
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return [];
      },
      setAll() {
        // No-op fallback
      },
    },
  });
}

/**
 * Creates an Express-specific Supabase client.
 * Designed to interact seamlessly with your Express backend endpoints!
 */
export function createExpressClient(req: any, res: any) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        const cookieHeader = req.headers.cookie || "";
        return cookieHeader
          .split(";")
          .map((v: string) => v.split("="))
          .reduce((acc: any[], [k, v]: any) => {
            if (k) acc.push({ name: k.trim(), value: decodeURIComponent(v || "") });
            return acc;
          }, []);
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          if (typeof res.cookie === 'function') {
            res.cookie(name, value, {
              ...options,
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
            });
          }
        });
      },
    },
  });
}
