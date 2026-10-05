"use strict";
/* NODEX — demo backend, used when CFG.mode is 'demo'.
   Simulates the database and sign-in entirely inside the visitor's browser (localStorage).
   Nothing is sent anywhere, and nothing is shared between visitors. It follows the same rules as
   sql/schema.sql (pricing, stock, delivery fee, cancellation restores stock) so the behaviour is representative. */
const demoBackend=(()=>{
  const KEY={p:'nx_demo_products',o:'nx_demo_orders',s:'nx_demo_settings',u:'nx_demo_users',me:'nx_demo_me',n:'nx_demo_seq'};
  const DEMO_ADMIN={email:'admin@demo.mv',password:'demo1234'};
  const mem={};
  const get=(k,d)=>{try{const v=localStorage.getItem(k);if(v!==null)return JSON.parse(v)}catch(e){}return k in mem?mem[k]:d};
  const isQuota=e=>!!e&&(e.name==='QuotaExceededError'||e.code===22||e.code===1014||/quota/i.test(e.message||''));
  const set=(k,v)=>{mem[k]=v;try{localStorage.setItem(k,JSON.stringify(v))}catch(e){if(isQuota(e))throw new Error('Browser storage is full: the demo keeps product images inside the browser. Remove some images, or use "Reset demo data".')}};
  const clone=x=>JSON.parse(JSON.stringify(x));
  const P=(sku,name,category,price,stock,description,specs,featured,hue)=>({id:'d-'+sku.toLowerCase(),sku,name,category,price,stock,description,specs,featured,hue});
  const SEED=[
    P('NX-LT-001','Aether 14 Pro Laptop','Laptops',18999,6,'14-inch performance laptop for creators and developers. Placeholder product content.',[['Display','14" 2.8K OLED, 120 Hz'],['Processor','8-core, 4.8 GHz boost'],['Memory','32 GB LPDDR5'],['Storage','1 TB NVMe'],['Weight','1.4 kg']],true,190),
    P('NX-LT-002','Strata X Ultrabook 13','Laptops',14499,3,'Thin and light 13-inch ultrabook with all-day battery. Placeholder product content.',[['Display','13.3" FHD IPS'],['Memory','16 GB'],['Storage','512 GB NVMe'],['Battery','Up to 16 h']],false,215),
    P('NX-PH-001','Pulse 12 Smartphone','Phones',8999,14,'Flagship-class smartphone with a dual-camera system. Placeholder product content.',[['Display','6.4" AMOLED, 120 Hz'],['Storage','256 GB'],['Camera','50 MP + 12 MP'],['Battery','5000 mAh']],true,270),
    P('NX-PH-002','Pulse 12 Lite','Phones',4999,22,'Value smartphone with a large battery. Placeholder product content.',[['Display','6.6" LCD, 90 Hz'],['Storage','128 GB'],['Battery','5000 mAh']],false,300),
    P('NX-AU-001','Halo ANC Headphones','Audio',2799,18,'Over-ear wireless headphones with active noise cancellation. Placeholder product content.',[['Drivers','40 mm'],['Battery','Up to 40 h'],['Connectivity','Bluetooth 5.3']],true,160),
    P('NX-AU-002','Orbit Buds Pro','Audio',1299,0,'True wireless earbuds with a compact charging case. Placeholder product content.',[['Battery','7 h + 21 h case'],['Rating','IPX4']],false,140),
    P('NX-CP-001','Core R7 Processor','Components',5499,9,'8-core desktop processor for gaming and productivity. Placeholder product content.',[['Cores / Threads','8 / 16'],['Boost clock','5.0 GHz'],['Socket','AM5']],false,20),
    P('NX-CP-002','Vector 16GB DDR5 Kit','Components',1899,25,'2 x 8 GB DDR5 memory kit. Placeholder product content.',[['Capacity','16 GB (2 x 8)'],['Speed','6000 MT/s'],['Latency','CL30']],false,40),
    P('NX-CP-003','Titan 1TB NVMe SSD','Components',1599,30,'PCIe 4.0 M.2 solid-state drive. Placeholder product content.',[['Capacity','1 TB'],['Read','up to 7,000 MB/s'],['Interface','PCIe 4.0 x4']],false,350),
    P('NX-AC-001','Keystone Mechanical Keyboard','Accessories',1499,12,'Hot-swappable mechanical keyboard with per-key lighting. Placeholder product content.',[['Layout','75%'],['Switches','Linear, hot-swap'],['Connectivity','USB-C / Bluetooth']],false,180),
    P('NX-AC-002','Glide Wireless Mouse','Accessories',699,40,'Lightweight wireless mouse with a high-precision sensor. Placeholder product content.',[['Sensor','26,000 DPI'],['Weight','62 g'],['Battery','Up to 80 h']],false,200),
    P('NX-SH-001','Nest Hub Smart Display','Smart Home',1899,8,'Smart display and home-control hub. Placeholder product content.',[['Screen','7" touch'],['Connectivity','Wi-Fi, Bluetooth, Thread']],false,120)
  ];
  const products=()=>{let p=get(KEY.p,null);if(!p){p=clone(SEED);set(KEY.p,p)}return p};
  const settings=()=>({delivery_male_free_above:500,delivery_male_fee:50,tax_rate:0,...get(KEY.s,{})});
  const me=()=>get(KEY.me,null);
  const needAdmin=()=>{const u=me();if(!u||u.role!=='admin')throw new Error('Not permitted: administrator sign-in required')};
  const STATUSES=['Pending','Confirmed','Shipped','Delivered','Cancelled'];
  const emailRx=/^[^@\s]+@[^@\s]+\.[^@\s]+$/;

  const db={
    async settings(){return settings()},
    async saveSettings(o){needAdmin();set(KEY.s,{...settings(),...o})},
    async listProducts(){return clone(products())},
    async saveProduct(p){
      needAdmin();
      if(!(p.price>=0)||!Number.isInteger(p.stock)||p.stock<0)throw new Error('Invalid price or stock');
      const all=products(),sku=(p.sku||'').trim();
      if(sku&&all.some(x=>x.sku===sku&&x.id!==p.id))throw new Error('That value must be unique (is the SKU already used?)');
      const row={sku,name:p.name,category:p.category,price:p.price,stock:p.stock,description:p.description||'',specs:p.specs||[],featured:!!p.featured,hue:p.hue,images:Array.isArray(p.images)?p.images.filter(Boolean):[]};
      if(p.id){const i=all.findIndex(x=>x.id===p.id);if(i<0)throw new Error('Not permitted, or the record no longer exists');all[i]={...all[i],...row};set(KEY.p,all);return p.id}
      const id='d-'+Date.now().toString(36);all.push({id,...row});set(KEY.p,all);return id;
    },
    async uploadImage(blob){ // demo: the image is kept inside the product record as a data address
      needAdmin();
      return await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(new Error('Could not read the image'));r.readAsDataURL(blob)});
    },
    async deleteImages(){},
    async deleteProduct(id){needAdmin();const all=products();if(!all.some(x=>x.id===id))throw new Error('Not permitted, or the record no longer exists');set(KEY.p,all.filter(x=>x.id!==id))},
    async placeOrder(items,c,area,payment){
      const t=k=>String(c[k]==null?'':c[k]).trim();
      const email=t('email').toLowerCase(),first=t('first'),last=t('last'),phone=t('phone'),address=t('address'),island=t('island'),atoll=t('atoll');
      if(!emailRx.test(email)||email.length>254)throw new Error('Enter a valid email address');
      if(!first||!last)throw new Error('First and last name are required');
      if(phone.replace(/\D/g,'').length<7||phone.length>30)throw new Error('Enter a valid phone number');
      if(!['male','island'].includes(area))throw new Error('Invalid delivery area');
      if(!['cod','bank'].includes(payment))throw new Error('Invalid payment method');
      if(area==='male'&&!address)throw new Error("Address is required for delivery in Male'");
      if(area==='island'&&(!island||!atoll))throw new Error('Island and atoll are required for island delivery');
      if(!Array.isArray(items)||!items.length||items.length>50)throw new Error('The cart is empty or invalid');
      const merged=new Map();
      for(const it of items){if(!/^[0-9]{1,4}$/.test(String(it.qty))||Number(it.qty)<1)throw new Error('The cart contains an invalid item');merged.set(it.id,(merged.get(it.id)||0)+Number(it.qty))}
      const all=products();let sub=0;const lines=[];
      for(const [id,qty] of merged){
        const p=all.find(x=>x.id===id);
        if(!p)throw new Error('A product in your cart is no longer available');
        if(p.stock<qty)throw new Error(`Insufficient stock for ${p.name} (${p.stock} available)`);
        sub+=p.price*qty;lines.push({id:p.id,name:p.name,price:p.price,qty});
      }
      const st=settings(),fee=area==='male'?(sub>st.delivery_male_free_above?0:st.delivery_male_fee):0,tax=Math.round(sub*st.tax_rate*100)/100;
      lines.forEach(l=>{all.find(x=>x.id===l.id).stock-=l.qty});set(KEY.p,all);
      const n=get(KEY.n,1001);set(KEY.n,n+1);
      const order={uid:'o'+n,id:'NX-'+n,userId:(me()||{}).id||null,created:new Date().toISOString(),status:'Pending',payment,area,
        customer:{email,first,last,phone,address,island,atoll},items:lines,shipping:fee,tax,total:sub+fee+tax};
      const os=get(KEY.o,[]);os.unshift(order);set(KEY.o,os);
      return clone(order);
    },
    async listOrders(){ // mirrors the row-level security rules: admins see all, customers their own, guests none
      const u=me(),os=get(KEY.o,[]);
      if(!u)return[];
      return clone(u.role==='admin'?os:os.filter(o=>o.userId===u.id));
    },
    async updateOrderStatus(uid,status){
      needAdmin();
      if(!STATUSES.includes(status))throw new Error('Invalid status');
      const os=get(KEY.o,[]),o=os.find(x=>x.uid===uid);
      if(!o)throw new Error('Not permitted, or the record no longer exists');
      if(status!==o.status){
        if(o.status==='Cancelled')throw new Error('A cancelled order cannot be reopened');
        if(status==='Cancelled'){const all=products();o.items.forEach(i=>{const p=all.find(x=>x.id===i.id);if(p)p.stock+=i.qty});set(KEY.p,all)}
        o.status=status;set(KEY.o,os);
      }
    }
  };

  const setMe=u=>set(KEY.me,u);
  const auth={
    async current(){return me()},
    async signUp(email,password,fullName,phone){
      email=String(email).trim().toLowerCase();
      if(!emailRx.test(email))throw new Error('Enter a valid email address');
      if(String(password).length<6)throw new Error('Password must be at least 6 characters');
      phone=String(phone||'').trim();
      if(phone.replace(/\D/g,'').length<7||phone.length>30)throw new Error('Enter a valid phone number');
      if(email===DEMO_ADMIN.email)throw new Error('That address is reserved for the demo administrator');
      const users=get(KEY.u,[]);
      if(users.some(x=>x.email===email))throw new Error('An account with this email already exists in this demo. Please sign in.');
      const user={id:'u'+Date.now().toString(36),email,name:fullName||email.split('@')[0],role:'customer',phone,address:'',island:'',atoll:''};
      users.push(user);set(KEY.u,users);setMe(user);   // passwords are never stored in the demo
      return{user,needsConfirmation:false};
    },
    async signIn(email,password){
      email=String(email).trim().toLowerCase();
      if(email===DEMO_ADMIN.email){
        if(password!==DEMO_ADMIN.password)throw new Error('Invalid login credentials');
        const a={id:'u-admin',email,name:'Demo Administrator',role:'admin',phone:'',address:'',island:'',atoll:''};setMe(a);return a;
      }
      if(String(password).length<6)throw new Error('Invalid login credentials');
      const user=get(KEY.u,[]).find(x=>x.email===email);
      if(!user)throw new Error('No demo account exists for this email. Please create an account first.');
      setMe(user);return user;
    },
    async signOut(){setMe(null)},
    async updateProfile(fields){
      const u=me();if(!u||u.role==='admin')return;
      const nu={...u,...fields};setMe(nu);set(KEY.u,get(KEY.u,[]).map(x=>x.id===u.id?nu:x));
    },
    onChange(){}
  };

  return{name:'demo',db,auth,async init(){products();return{}},
    reset(){
      Object.values(KEY).forEach(k=>{try{localStorage.removeItem(k)}catch(e){}});
      ['nx_cart'].forEach(k=>{try{localStorage.removeItem(k)}catch(e){}});
      try{sessionStorage.removeItem('nx_last')}catch(e){}
      location.hash='#/';location.reload();
    }};
})();
