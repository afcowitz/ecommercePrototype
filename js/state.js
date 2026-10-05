"use strict";
/* NODEX — application state, cart and totals. */
/* ============ STATE ============ */
const S={
  products:[],cart:ls.get('nx_cart',[]),user:null,lastOrder:lastOrderGet(),
  filter:{cat:'All',q:'',sort:'featured',inStock:false},
  area:'male',adminTab:'products',acctTab:'in',pdQty:1,confirmDel:null
};
const getP=id=>S.products.find(p=>p.id===id);
const cats=()=>['All',...new Set(S.products.map(p=>p.category))];
const isAdmin=()=>S.user&&S.user.role==='admin';
const saveCart=()=>{ls.set('nx_cart',S.cart);updateChrome()};
function cartLines(){return S.cart.map(c=>({p:getP(c.id),qty:c.qty})).filter(l=>l.p)}
function addToCart(id,n=1){
  const p=getP(id);if(!p||p.stock<=0)return toast('Out of stock');
  const c=S.cart.find(x=>x.id===id),cur=c?c.qty:0,q=Math.min(p.stock,cur+n);
  if(c)c.qty=q;else S.cart.push({id,qty:q});
  saveCart();renderDrawer();
  toast(q<cur+n?`Item added to cart (limited to ${p.stock} in stock)`:'Item added to cart');
  const cc=$('#cc');cc.classList.remove('bump');void cc.offsetWidth;cc.classList.add('bump');
}
function setQty(id,q){
  const p=getP(id);q=Math.max(0,Math.min(p?p.stock:0,q));
  S.cart=q?S.cart.map(c=>c.id===id?{...c,qty:q}:c):S.cart.filter(c=>c.id!==id);
  saveCart();renderDrawer();
}
function totals(co){
  const sub=cartLines().reduce((s,l)=>s+l.p.price*l.qty,0);
  const sh=(co&&S.area==='male'&&sub)?(sub>CFG.delivery.maleFreeAbove?0:CFG.delivery.maleFee):0;
  const tax=Math.round(sub*CFG.taxRate*100)/100;
  return{sub,sh,tax,total:sub+sh+tax};
}
