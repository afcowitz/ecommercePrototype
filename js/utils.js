"use strict";
/* NODEX — small helpers (DOM, formatting, storage, toast). */
/* ============ UTILITIES ============ */
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>CFG.currency+' '+Number(n).toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:2});
const ls={
  get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},
  set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
};
let toastT;
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),2200)}

const lastOrderGet=()=>{try{return JSON.parse(sessionStorage.getItem("nx_last"))}catch(e){return null}};
