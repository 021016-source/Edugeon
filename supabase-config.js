import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// 1. 올바른 Project URL
const SUPABASE_URL = "https://assvvpsqviuqqcmmquyy.supabase.co";

// 2. Publishable (anon) API Key
const SUPABASE_ANON_KEY = "sb_publishable_uY5UB8x5G59YbQK-XbV-Ig_SXa4IZR2";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
