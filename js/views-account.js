"use strict";
function demoHint(){
  return CFG.mode!=='demo'?'':`<div class="demohint"><b>Demo accounts.</b> Administrator: <b>admin@demo.mv</b> / <b>demo1234</b>. Customer: choose Create account and enter a name, a phone number, any email address and a password of at least 6 characters. Passwords are not stored or checked in the demo, so please do not enter a real one.</div>`;
}
/* NODEX — account view (sign in, registration, order history). */
async function viewAccount(){
  if(S.user){
    const os=(await db.listOrders()).filter(o=>o.userId===S.user.id);
    return `<h2 class="sec">Account <span class="mono">${esc(S.user.role)}</span></h2><div class="cols"><div class="panel"><h3 style="margin-top:0">${esc(S.user.name||S.user.email)}</h3><p class="mono">${esc(S.user.email)}</p>
    <div class="row">${isAdmin()?'<a class="btn" href="#/admin">Open admin</a>':''}<button class="btn ghost" data-act="signout">Sign out</button></div></div>
    <div class="panel"><h3 style="margin-top:0">Your orders</h3>${os.length?os.map(o=>`<div class="row" style="justify-content:space-between;padding:6px 0"><a href="#/order/${esc(o.id)}" style="color:var(--accent)" class="mono">${esc(o.id)}</a><span>${fmt(o.total)}</span><span class="st ok">${esc(o.status)}</span></div>`).join(''):'<p class="mono">No orders yet.</p>'}</div></div>`;
  }
  const reg=S.acctTab==='up';
  return `<h2 class="sec">Account</h2><div class="panel" style="max-width:460px"><div class="tabs"><button class="${reg?'':'on'}" data-act="atab" data-v="in">Sign in</button><button class="${reg?'on':''}" data-act="atab" data-v="up">Create account</button></div>
  <form id="auth" novalidate>${reg?fld('name','Full name','',{ac:'name'})+fld('phone','Phone number (required)','',{type:'tel',ac:'tel',ph:'e.g. 7771234',err:'Enter a valid phone number (at least 7 digits)'}):''}${fld('email','Email','',{type:'email',ac:'email',err:'Enter a valid email address'})}${fld('password','Password','',{type:'password',ac:reg?'new-password':'current-password',err:'Minimum 6 characters'})}
  <button class="btn block" type="submit">${reg?'Create account':'Sign in'}</button></form>${demoHint()}</div>`;
}
