import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://sxpprttrkzvtpojygfxm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4cHBydHRya3p2dHBvanlnZnhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4NTYxNzMsImV4cCI6MjA4NjQzMjE3M30.b2_xTNPnlU3eUVZxJG_BMSW8pmLpZdPrslYzD1uBgtE";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
