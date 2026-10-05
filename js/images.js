"use strict";
/* NODEX — product images: display helper and in-browser resizing before saving. */

/* The image shown for a product in the catalogue, hero banner and cart: its first image,
   or the generated placeholder when it has none. */
function pic(p,opts){
  opts=opts||{};
  const u=p&&Array.isArray(p.images)&&p.images[0];
  return u?`<img class="pic" src="${esc(u)}" alt="${esc(p.name)}" ${opts.eager?'fetchpriority="high"':'loading="lazy"'} decoding="async" draggable="false">`:art(p);
}

function fitSize(w,h,max){
  const s=Math.min(1,max/Math.max(w,h));
  return{w:Math.max(1,Math.round(w*s)),h:Math.max(1,Math.round(h*s))};
}
async function loadBitmap(file){
  if(window.createImageBitmap){try{return await createImageBitmap(file)}catch(e){}}
  return await new Promise((res,rej)=>{
    const url=URL.createObjectURL(file),img=new Image();
    img.onload=()=>{URL.revokeObjectURL(url);res(img)};
    img.onerror=()=>{URL.revokeObjectURL(url);rej(new Error('unsupported'))};
    img.src=url;
  });
}
/* Resizes to CFG.images.maxDim on the longer side and re-encodes as JPEG. Returns a Blob. */
async function compressImage(file){
  const c=Object.assign({},CFG.images,BACKEND.name==='demo'?CFG.images.demo:{});
  if(!/^image\//.test(file.type))throw new Error('"'+file.name+'" is not an image file');
  if(file.size>25*1024*1024)throw new Error('"'+file.name+'" is larger than 25 MB');
  let bmp;
  try{bmp=await loadBitmap(file)}catch(e){throw new Error('"'+file.name+'" could not be read. Please use JPEG, PNG or WebP')}
  const {w,h}=fitSize(bmp.width,bmp.height,c.maxDim);
  const cv=document.createElement('canvas');cv.width=w;cv.height=h;
  const g=cv.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,w,h);g.drawImage(bmp,0,0,w,h);
  if(bmp.close)bmp.close();
  const blob=await new Promise(r=>cv.toBlob(r,'image/jpeg',c.quality));
  if(!blob)throw new Error('"'+file.name+'" could not be processed');
  return blob;
}
