"use strict";
/* NODEX — product page image gallery: arrows, thumbnails, touch swipe, keyboard arrows. */
function initGallery(){
  const g=$('#gallery');if(!g)return;
  const box=g.closest('.pleft'),slides=[...g.querySelectorAll('.gs')];
  if(slides.length<2)return;
  const thumbs=[...box.querySelectorAll('.gt')],strip=box.querySelector('.gthumbs'),gc=$('#gc');
  let cur=0;
  function show(n){
    n=(n+slides.length)%slides.length;
    if(n===cur)return;
    slides[cur].classList.remove('active');slides[n].classList.add('active');
    thumbs.forEach((t,i)=>t.classList.toggle('on',i===n));
    if(gc)gc.textContent=String(n+1);
    const t=thumbs[n];
    if(strip&&t&&strip.scrollTo)strip.scrollTo({left:t.offsetLeft-strip.clientWidth/2+t.clientWidth/2,behavior:'smooth'});
    cur=n;
  }
  box.addEventListener('click',e=>{
    const b=e.target.closest('[data-g]');if(!b)return;
    const v=b.dataset.g;
    if(v==='next')show(cur+1);else if(v==='prev')show(cur-1);else show(+v);
  });
  g.setAttribute('tabindex','0');
  g.addEventListener('keydown',e=>{if(e.key==='ArrowRight')show(cur+1);else if(e.key==='ArrowLeft')show(cur-1)});
  let x0=null,y0=null;
  g.addEventListener('touchstart',e=>{x0=e.touches[0].clientX;y0=e.touches[0].clientY},{passive:true});
  g.addEventListener('touchend',e=>{
    if(x0===null)return;
    const dx=e.changedTouches[0].clientX-x0,dy=e.changedTouches[0].clientY-y0;x0=null;
    if(Math.abs(dx)>40&&Math.abs(dx)>Math.abs(dy)*1.3){if(dx<0)show(cur+1);else show(cur-1)}
  },{passive:true});
}
