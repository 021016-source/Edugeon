// ============================================================
// Supabase 초기화
// Supabase 대시보드 → 프로젝트 → Project Settings → API 에서
// "Project URL" 과 "anon public" 키를 복사해 아래에 붙여넣으세요.
// ============================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://assvvpsqviuqqcmmquyy.supabase.co/rest/v1/";
const SUPABASE_ANON_KEY = "sb_publishable_uY5UB8x5G59YbQK-XbV-Ig_SXa4IZR2";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
