import { createClient } from "@supabase/supabase-js";

// Public anon/publishable key — safe to ship to the browser. Row Level
// Security policies on the Supabase tables control what can actually be
// read or written.
const SUPABASE_URL = "https://xmlrjycdjldrnbraxyxv.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_OorsUmkyEBYiVpvqI1X1gQ_G63iGfOr";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
