import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

/* ================= SUPABASE CONFIG ================= */

const SUPABASE_URL = "https://ndifofxobgmixcswhiet.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kaWZvZnhvYmdtaXhjc3doaWV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3OTcyMDQsImV4cCI6MjA4NDM3MzIwNH0.9-BulmjzuZX3uxxhjXi_GXHnHjnr5MU0E6BhPspAkUY";

/* ================= CLIENT ================= */

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
