"use strict";
/* NODEX — generated placeholder product art (inline SVG). */
/* ============ PRODUCT ART (inline SVG, no remote images) ============ */
let artN=0;
const GLYPHS={
  Laptops:'<rect x="120" y="70" width="160" height="104" rx="8"/><path d="M92 184h216l-14 18H106z"/><path d="M140 92h120M140 112h80" opacity=".5"/>',
  Phones:'<rect x="165" y="46" width="70" height="152" rx="14"/><path d="M190 60h20M185 184h30"/><circle cx="200" cy="118" r="22" opacity=".5"/>',
  Audio:'<path d="M140 134a60 60 0 0 1 120 0"/><rect x="128" y="130" width="24" height="54" rx="10"/><rect x="248" y="130" width="24" height="54" rx="10"/>',
  Components:'<rect x="150" y="68" width="100" height="100" rx="8"/><rect x="175" y="93" width="50" height="50" rx="4" opacity=".6"/><path d="M165 54v14M185 54v14M205 54v14M225 54v14M165 168v14M185 168v14M205 168v14M225 168v14M136 88h14M136 108h14M136 128h14M136 148h14M250 88h14M250 108h14M250 128h14M250 148h14"/>',
  Accessories:'<rect x="104" y="104" width="192" height="84" rx="10"/><path d="M126 126h14M152 126h14M178 126h14M204 126h14M230 126h14M256 126h14M126 146h148M126 166h34M174 166h52"/>',
  'Smart Home':'<circle cx="200" cy="124" r="36"/><circle cx="200" cy="124" r="60" opacity=".5"/><circle cx="200" cy="124" r="84" opacity=".25"/><circle cx="200" cy="124" r="8"/>',
  _:'<path d="M200 60l80 40v80l-80 40-80-40v-80z"/><path d="M200 60v80l80 40M200 140l-80 40" opacity=".5"/>'
};
function art(p){
  const h=Number.isFinite(+p.hue)?+p.hue:200, id='a'+(++artN), g=GLYPHS[p.category]||GLYPHS._;
  return `<svg viewBox="0 0 400 270" role="img" aria-label="${esc(p.name)}" xmlns="http://www.w3.org/2000/svg">
  <defs><radialGradient id="${id}" cx="50%" cy="40%" r="70%"><stop offset="0" stop-color="hsl(${h} 70% 24%)"/><stop offset="1" stop-color="#070d17"/></radialGradient>
  <pattern id="${id}p" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="hsl(${h} 80% 60%)" stroke-opacity=".08"/></pattern></defs>
  <rect width="400" height="270" fill="url(#${id})"/><rect width="400" height="270" fill="url(#${id}p)"/>
  <g fill="hsl(${h} 90% 60% / .07)" stroke="hsl(${h} 95% 68%)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="filter:drop-shadow(0 0 8px hsl(${h} 95% 60% / .6))">${g}</g>
  <text x="14" y="256" font-family="monospace" font-size="11" fill="hsl(${h} 60% 70%)" opacity=".7">${esc(p.sku||String(p.id).slice(0,8)).toUpperCase()} // ${esc(p.category).toUpperCase()}</text></svg>`;
}
