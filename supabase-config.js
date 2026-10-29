import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'oqczrhjsvbfjvoqeijck';
const SUPABASE_ANON_KEY = 'sb_publishable_aALUjnrFv3_PGOraBdkYMg_kyS2kUHw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
