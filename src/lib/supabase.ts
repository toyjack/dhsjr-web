import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase.type";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing Supabase environment variables. Please check your .env file."
  );
}

// Create a singleton Supabase client
const globalForSupabase = global as unknown as {
  supabase: ReturnType<typeof createClient<Database>>;
};

export const supabase =
  globalForSupabase.supabase ||
  createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalForSupabase.supabase = supabase;
}
