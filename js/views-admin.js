"use strict";
/* NODEX — admin views: products, orders, settings, product form. */
async function viewAdmin(){
  if(!isAdmin())return `<h2 class="sec">Admin</h2><div class="empty">Administrator access required. <a href="#/account" style="color:var(--accent)">Sign in</a>${demoHint()}</div>`;
  const tab=S.adminTab;
  let body='';
  if(tab==='products'){
    body=`<div class="row" style="margin-bottom:12px"><button class="btn" data-act="pform">Add product</button><span class="mono">${S.products.length} products</span></div>
    <div class="tw"><table><thead><tr><th>Product</th><th>Category</th><th>Price (${CFG.currency})</th><th>Stock</th><th></th></tr></thead><tbody>
    ${S.products.map(p=>`<tr><td>${esc(p.name)} ${p.featured?'<span class="st ok">Hero</span>':''}<div class="mono">${esc(p.sku||String(p.id).slice(0,8))}</div></td><td>${esc(p.category)}</td>
    <td><input class="n" type="number" min="0" step="any" value="${p.price}" data-quick="price" data-id="${p.id}"></td>
    <td><input class="n" type="number" min="0" step="1" value="${p.stock}" data-quick="stock" data-id="${p.id}"></td>
    <td style="white-space:nowrap"><button class="btn ghost sm" data-act="pform" data-id="${p.id}">Edit</button> <button class="btn ${S.confirmDel===p.id?'danger':'ghost'} sm" data-act="del" data-id="${p.id}">${S.confirmDel===p.id?'Confirm delete':'Delete'}</button></td></tr>`).join('')}</tbody></table></div>`;
  }else if(tab==='orders'){
    const os=await db.listOrders();
    body=os.length?`<div class="tw"><table><thead><tr><th>Order</th><th>Customer</th><th>Delivery</th><th>Items</th><th>Total</th><th>Status</th></tr></thead><tbody>
    ${os.map(o=>`<tr><td class="mono">${esc(o.id)}</td><td>${esc(o.customer.first)} ${esc(o.customer.last)}<div class="mono">${esc(o.customer.email)} · ${esc(o.customer.phone)}</div></td>
    <td>${o.area==='island'?esc(o.customer.island)+', '+esc(o.customer.atoll)+'<div class="mono">fee to be arranged</div>':'Malé<div class="mono">'+esc(o.customer.address)+'</div>'}</td>
    <td>${o.items.reduce((s,i)=>s+i.qty,0)}</td><td>${fmt(o.total)}</td>
    <td><select data-ostat="${o.uid}">${['Pending','Confirmed','Shipped','Delivered','Cancelled'].map(s=>`<option ${o.status===s?'selected':''}>${s}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></div>
    <p class="mono">Cancelling an order returns its items to stock. A cancelled order cannot be reopened.</p>`:'<div class="empty">No orders yet.</div>';
  }else{
    body=`<form id="sf" class="panel" style="max-width:520px" novalidate>
    <div class="field" data-f="free"><label>Malé: delivery is free when the subtotal exceeds (${CFG.currency})</label><input name="free" type="number" min="0" step="any" value="${CFG.delivery.maleFreeAbove}"><div class="em">Enter a non-negative number</div></div>
    <div class="field" data-f="fee"><label>Malé: delivery fee at or below that amount (${CFG.currency})</label><input name="fee" type="number" min="0" step="any" value="${CFG.delivery.maleFee}"><div class="em">Enter a non-negative number</div></div>
    <div class="field" data-f="tax"><label>Tax rate as a fraction (0.08 = 8%; 0 = none)</label><input name="tax" type="number" min="0" max="1" step="any" value="${CFG.taxRate}"><div class="em">Enter a value between 0 and 1</div></div>
    <button class="btn" type="submit">Save settings</button></form>`;
  }
  const T=(k,l)=>`<button class="${tab===k?'on':''}" data-act="admtab" data-v="${k}">${l}</button>`;
  return `<h2 class="sec">Admin <span class="mono">Store management</span></h2><div class="tabs">${T('products','Products')}${T('orders','Orders')}${T('settings','Settings')}</div>${body}`;
}
function productForm(id){
  const p=id?getP(id):{name:'',sku:'',category:'',price:'',stock:0,description:'',specs:[],featured:false,hue:200};
  const hue=p.hue??200;
  $('#modal').innerHTML=`<div class="box"><h3 style="margin-top:0">${id?'Edit product':'Add product'}</h3><form id="pf" novalidate>
  ${fld('name','Name',p.name)}
  <div class="two">${fld('sku','SKU (optional, unique)',p.sku||'')}<div class="field" data-f="category"><label>Category</label><input name="category" list="cl" value="${esc(p.category)}"><datalist id="cl">${cats().slice(1).map(c=>`<option value="${esc(c)}">`).join('')}</datalist><div class="em">Required</div></div></div>
  <div class="two">${fld('price','Price ('+CFG.currency+')',p.price,{type:'number',err:'Enter a non-negative number'})}${fld('stock','Stock',p.stock,{type:'number',err:'Enter a whole number ≥ 0'})}</div>
  <div class="field"><label>Description</label><textarea name="description" rows="3">${esc(p.description)}</textarea></div>
  <div class="field"><label>Specifications (one per line, “Label: value”)</label><textarea name="specs" rows="4">${esc((p.specs||[]).map(s=>s[0]+': '+s[1]).join('\n'))}</textarea></div>
  <div class="two"><div class="field"><label>Placeholder art hue (0–360)</label><input name="hue" type="number" min="0" max="360" value="${hue}"></div><label class="chk" style="align-self:end;margin-bottom:18px"><input type="checkbox" name="featured" ${p.featured?'checked':''}> Show in hero banner (several allowed)</label></div>
  <div class="row" style="justify-content:flex-end"><button type="button" class="btn ghost" data-act="closeall">Cancel</button><button class="btn" type="submit">Save</button></div>
  <input type="hidden" name="id" value="${esc(id||'')}"></form></div>`;
  $('#modal').classList.add('open');
}
