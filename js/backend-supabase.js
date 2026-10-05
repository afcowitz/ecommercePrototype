"use strict";
/* NODEX — Supabase backend, used when CFG.mode is 'supabase'.
   Prices, stock and delivery fees are enforced in the database (see sql/schema.sql); the checks
   in the browser are for usability only. Security comes from row-level security and place_order(). */
const supabaseBackend=(()=>{
  let sb=null;
  const must=({data,error})=>{
    if(error)throw new Error(error.code==='23505'?'That value must be unique (is the SKU already used?)':error.message);
    return data;
  };
  const changed=(rows,msg)=>{if(!rows||!rows.length)throw new Error(msg||'Not permitted, or the record no longer exists');return rows};
  const rowToProduct=r=>({id:r.id,sku:r.sku||'',name:r.name,category:r.category,price:Number(r.price),stock:r.stock,description:r.description||'',specs:Array.isArray(r.specs)?r.specs:[],featured:!!r.featured,hue:r.hue});
  const mapOrder=r=>({uid:r.id,id:r.order_no,userId:r.user_id,created:r.created_at,status:r.status,payment:r.payment_method,area:r.area,
    customer:{email:r.email,first:r.first_name,last:r.last_name,phone:r.phone,address:r.address,island:r.island,atoll:r.atoll},
    items:(r.order_items||[]).map(i=>({id:i.product_id,name:i.name,price:Number(i.unit_price),qty:i.qty})),
    shipping:Number(r.delivery_fee),tax:Number(r.tax),total:Number(r.total)});

  const db={
    async settings(){const rows=must(await sb.from('settings').select('key,value'));return Object.fromEntries(rows.map(r=>[r.key,Number(r.value)]))},
    async saveSettings(o){for(const [key,value] of Object.entries(o))changed(must(await sb.from('settings').update({value}).eq('key',key).select('key')))},
    async listProducts(){return must(await sb.from('products').select('*').order('created_at')).map(rowToProduct)},
    async saveProduct(p){
      const row={sku:p.sku||null,name:p.name,category:p.category,price:p.price,stock:p.stock,description:p.description,specs:p.specs,featured:!!p.featured,hue:p.hue};
      if(p.id){changed(must(await sb.from('products').update(row).eq('id',p.id).select('id')));return p.id}
      return must(await sb.from('products').insert(row).select('id').single()).id;
    },
    async unfeatureOthers(id){must(await sb.from('products').update({featured:false}).eq('featured',true).neq('id',id))},
    async deleteProduct(id){changed(must(await sb.from('products').delete().eq('id',id).select('id')))},
    async placeOrder(items,customer,area,payment){
      const r=must(await sb.rpc('place_order',{p_items:items,p_customer:customer,p_area:area,p_payment:payment}));
      return{uid:r.id,id:r.order_no,status:r.status,area:r.area,payment:r.payment,customer:r.customer,items:r.items.map(i=>({...i,price:Number(i.price)})),shipping:Number(r.delivery_fee),tax:Number(r.tax),total:Number(r.total)};
    },
    async listOrders(){return must(await sb.from('orders').select('*, order_items(*)').order('created_at',{ascending:false})).map(mapOrder)},
    async updateOrderStatus(uid,status){changed(must(await sb.from('orders').update({status}).eq('id',uid).select('id')))}
  };

  const userFrom=async session=>{
    const {data}=await sb.from('profiles').select('*').eq('id',session.user.id).maybeSingle();
    const d=data||{};
    return{id:session.user.id,email:session.user.email,name:d.full_name||session.user.email.split('@')[0],role:d.role||'customer',phone:d.phone||'',address:d.address||'',island:d.island||'',atoll:d.atoll||''};
  };
  const auth={
    async current(){const {data:{session}}=await sb.auth.getSession();return session?userFrom(session):null},
    async signUp(email,password,fullName){
      const {data,error}=await sb.auth.signUp({email,password,options:{data:{full_name:fullName}}});
      if(error)throw error;
      return data.session?{user:await userFrom(data.session),needsConfirmation:false}:{user:null,needsConfirmation:true};
    },
    async signIn(email,password){
      const {data,error}=await sb.auth.signInWithPassword({email,password});
      if(error)throw error;
      return userFrom(data.session);
    },
    async signOut(){await sb.auth.signOut()},
    async updateProfile(fields){if(!S.user)return;try{await sb.from('profiles').update(fields).eq('id',S.user.id)}catch(e){}},
    onChange(cb){sb.auth.onAuthStateChange(ev=>{if(['SIGNED_IN','SIGNED_OUT','USER_UPDATED'].includes(ev))setTimeout(cb,0)})} // deferred: supabase-js calls must not be awaited inside this callback
  };

  return{name:'supabase',db,auth,async init(){
    const c=CFG.supabase;
    if(!window.supabase)return{error:'The Supabase library could not be loaded (check the network connection or the script address).'};
    if(!c.url||!c.anonKey||c.url.includes('YOUR-PROJECT')||c.anonKey.startsWith('YOUR-'))return{error:'Supabase is not configured yet. Enter the project URL and key in js/config.js, or set mode to \'demo\' there.'};
    sb=window.supabase.createClient(c.url,c.anonKey);
    return{};
  }};
})();
