import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://assvvpsqviuqqcmmquyy.supabase.co";

// Publishable key (sb_publishable_...)를 그대로 넣어주시면 됩니다.
const SUPABASE_ANON_KEY = "sb_publishable_uY5UB8x5G59YbQK-XbV-Ig_SXa4IZR2";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
