"use strict";
/* NODEX — selects the backend from CFG.mode. The rest of the application only uses `db` and `auth`. */
const BACKEND=CFG.mode==='supabase'?supabaseBackend:demoBackend;
const db=BACKEND.db;
const auth=BACKEND.auth;
