import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// 1. 올바른 Project URL (끝에 / 및 /rest/v1/ 제거된 형태)
const SUPABASE_URL = "https://assvvpsqviuqqcmmquyy.supabase.co";

// 2. 전달해주신 Publishable (anon) API Key
const SUPABASE_ANON_KEY = "sb_publishable_uY5UB8x5G59YbQK-XbV-Ig_SXa4IZR2";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
