"use strict";
/* NODEX — configuration. Choose the mode, and (for live use) enter the Supabase URL and anon key below. */
/* ============ CONFIG (tuneable) ============ */
const CFG={
  // 'demo'     : simulated, runs entirely in the visitor's browser; no database. For showing the site to clients.
  // 'supabase' : live, connected to the Supabase project configured below.
  mode:'demo',
  // Project Settings > API in the Supabase dashboard. Use the anon / publishable key only. NEVER the service_role / secret key.
  supabase:{url:'https://YOUR-PROJECT.supabase.co',anonKey:'YOUR-ANON-PUBLIC-KEY'},
  currency:'MVR',
  heroMax:5,          // most products shown in the rotating hero banner (those ticked "Feature in hero banner" in Admin)
  heroInterval:6000,  // milliseconds each hero product stays on screen
  lowStock:5,
  // The three values below are defaults only; at start-up they are overwritten from the `settings` table (editable in Admin > Settings).
  taxRate:0,
  delivery:{maleFreeAbove:500,maleFee:50}
};
