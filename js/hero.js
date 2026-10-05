"use strict";
/* NODEX — hero slider behaviour: autoplay (driven by the progress bar), arrows, dots, touch swipe,
   keyboard arrows, pause on hover/focus, pointer parallax. Respects "reduce motion" (no autoplay). */
function initHero(){
  const hero=$('#hero');if(!hero)return;
  const slides=[...hero.querySelectorAll('.slide')];if(slides.length<2)return;
  const dots=[...hero.querySelectorAll('.hdot')],bar=$('#hbar'),hc=$('#hc');
  const reduce=!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const interval=CFG.heroInterval||6000;
  let cur=0,busy=false;

  function startBar(){
    if(!bar||reduce)return;
    bar.style.animation='none';void bar.offsetWidth;
    bar.style.animation='hprog '+interval+'ms linear forwards';
  }
  function show(n,dir){
    n=(n+slides.length)%slides.length;
    if(n===cur||busy)return;
    hero.dataset.dir=dir||(n>cur?'next':'prev');
    const old=slides[cur];
    old.classList.remove('active');old.classList.add('leaving');
    slides[n].classList.add('active');
    dots.forEach((d,i)=>d.classList.toggle('on',i===n));
    if(hc)hc.textContent=String(n+1).padStart(2,'0');
    cur=n;busy=true;
    setTimeout(()=>{old.classList.remove('leaving');busy=false},reduce?0:600);
    startBar();
  }
  const next=()=>show(cur+1,'next'),prev=()=>show(cur-1,'prev');

  hero.addEventListener('click',e=>{
    const b=e.target.closest('[data-hero]');if(!b)return;
    const v=b.dataset.hero;
    if(v==='next')next();else if(v==='prev')prev();else show(+v);
  });
  if(bar)bar.addEventListener('animationend',next);          // autoplay: advance when the progress bar completes
  const pause=on=>hero.classList.toggle('paused',on);
  hero.addEventListener('mouseenter',()=>pause(true));
  hero.addEventListener('mouseleave',()=>{pause(false);hero.style.setProperty('--px',0);hero.style.setProperty('--py',0)});
  hero.addEventListener('focusin',()=>pause(true));
  hero.addEventListener('focusout',()=>pause(false));
  hero.addEventListener('keydown',e=>{if(e.key==='ArrowRight')next();else if(e.key==='ArrowLeft')prev()});
  let x0=null,y0=null;
  hero.addEventListener('touchstart',e=>{x0=e.touches[0].clientX;y0=e.touches[0].clientY},{passive:true});
  hero.addEventListener('touchend',e=>{
    if(x0===null)return;
    const dx=e.changedTouches[0].clientX-x0,dy=e.changedTouches[0].clientY-y0;x0=null;
    if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.3){if(dx<0)next();else prev()}
  },{passive:true});
  if(!reduce)hero.addEventListener('mousemove',e=>{
    const r=hero.getBoundingClientRect();
    hero.style.setProperty('--px',((e.clientX-r.left)/r.width-.5).toFixed(3));
    hero.style.setProperty('--py',((e.clientY-r.top)/r.height-.5).toFixed(3));
  });
  startBar();
}
