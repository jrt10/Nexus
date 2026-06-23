const SUPABASE_URL =
  "https://mohdnpxdypgkgukafqqm.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_uR0RWmT6EGuuzsuVe91bpg_pGmQ05D7";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

console.log("Supabase conectado ao Nexus");