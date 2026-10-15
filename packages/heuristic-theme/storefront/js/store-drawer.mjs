// @ts-check
/** The global, accessible cart preview. The checkout remains the only order-writing surface. */
import {cartTotals,changeCartLine,cartLineLabel} from "./cart-model.mjs";
/** @typedef {import("../../src/cart-contract.js").CartBridge} CartBridge */
const money=cents=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(cents/100);
const esc=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const safeUrl=value=>{const str=String(value||"");return str.startsWith("/")&&!str.startsWith("//")||/^https:\/\//i.test(str)?esc(str):"";};
let isOpen=false, lastFocus=null;
const mount=document.createElement("div");
mount.id="store-cart-drawer-root";
document.body.append(mount);
/** @returns {CartBridge|null} */
const bridge=()=>window.FNF_STORE||null;
const getItems=()=>{
  if(bridge())return bridge().getCart();
  try{const items=JSON.parse(localStorage.getItem("fnf_cart")||"[]");return Array.isArray(items)?items:[];}
  catch{return [];}
};
const setItems=items=>{
  if(bridge())bridge().setCart(items);
  else{localStorage.setItem("fnf_cart",JSON.stringify(items));document.dispatchEvent(new CustomEvent("fnf:cart-updated"));}
};
function render(){
  const items=getItems(),totals=cartTotals(items);
  const lines=items.map((item,index)=>`
    <article class="drawer-line" data-cart-line="${index}">
      <a class="drawer-line__image" href="${item.slug?"/products/"+encodeURIComponent(item.slug):"/shop"}" aria-label="View ${esc(item.title)}">
        ${safeUrl(item.image)?`<img src="${safeUrl(item.image)}" alt="" loading="lazy">`:""}
      </a>
      <div class="drawer-line__copy">
        <a class="drawer-line__title" href="${item.slug?"/products/"+encodeURIComponent(item.slug):"/shop"}">${esc(item.title)}</a>
        ${cartLineLabel(item)?`<p class="drawer-line__option">${esc(cartLineLabel(item))}</p>`:""}
        <div class="drawer-line__qty" role="group" aria-label="Quantity for ${esc(item.title)}">
          <button type="button" data-cart-action="dec" data-index="${index}" aria-label="Decrease ${esc(item.title)} quantity">−</button>
          <output>${item.qty}</output>
          <button type="button" data-cart-action="inc" data-index="${index}" aria-label="Increase ${esc(item.title)} quantity" ${item.qty>=10?"disabled":""}>+</button>
        </div>
      </div>
      <div class="drawer-line__price">
        <strong>${money(Number(item.price_cents||0)*item.qty)}</strong>
        <button type="button" data-cart-action="remove" data-index="${index}" aria-label="Remove ${esc(item.title)}">Remove</button>
      </div>
    </article>`).join("");
  mount.innerHTML=`
    <div class="drawer-backdrop" data-cart-close aria-hidden="true"></div>
    <aside class="drawer-panel" role="dialog" aria-modal="true" aria-labelledby="cart-drawer-heading" aria-hidden="${!isOpen}">
      <header class="drawer-head">
        <div><p class="drawer-eyebrow">Your selection</p><h2 id="cart-drawer-heading">Your bag <span>${totals.count?String(totals.count).padStart(2,"0"):""}</span></h2></div>
        <button type="button" class="drawer-close" data-cart-close aria-label="Close bag">×</button>
      </header>
      <div class="drawer-items" id="drawer-items" aria-live="polite">
        ${lines||'<div class="drawer-empty"><p>Your bag is waiting.</p><span>Find something worth taking along.</span><a href="/shop">Explore the shop →</a></div>'}
      </div>
      ${items.length?`<footer class="drawer-summary">
        <div class="drawer-subtotal"><span>Subtotal</span><strong>${money(totals.subtotal_cents)}</strong></div>
        <p>Shipping and discounts are calculated at checkout.</p>
        <a class="drawer-checkout" href="/checkout">Review &amp; checkout <span aria-hidden="true">→</span></a>
        <button type="button" class="drawer-continue" data-cart-close>Continue shopping</button>
      </footer>`:""}
    </aside>`;
  mount.classList.toggle("is-open",isOpen);
  const panel=mount.querySelector(".drawer-panel");
  if(isOpen){panel?.setAttribute("aria-hidden","false");}
}
function open(){
  if(isOpen){render();return;}
  lastFocus=document.activeElement;
  isOpen=true;render();
  document.body.classList.add("store-cart-open");
  /** @type {HTMLElement|null} */ (mount.querySelector(".drawer-close"))?.focus();
}
function close(){
  if(!isOpen)return;
  isOpen=false;
  document.body.classList.remove("store-cart-open");
  mount.classList.remove("is-open");
  mount.querySelector(".drawer-panel")?.setAttribute("aria-hidden","true");
  if(lastFocus instanceof HTMLElement && lastFocus.isConnected)lastFocus.focus();
}
document.addEventListener("click",event=>{
  const target=event.target;
  if(!(target instanceof Element))return;
  const trigger=target.closest("[data-cart-open]");
  if(trigger){event.preventDefault();open();return;}
  if(!isOpen)return;
  if(target.closest("[data-cart-close]")){close();return;}
  const action=target.closest("[data-cart-action]");
  if(action){
    const index=Number(action.getAttribute("data-index"));
    const kind=action.getAttribute("data-cart-action");
    if(!["inc","dec","remove"].includes(kind))return;
    setItems(changeCartLine(getItems(),index,/** @type {"inc"|"dec"|"remove"} */(kind)));
  }
});
document.addEventListener("keydown",event=>{
  if(!isOpen)return;
  if(event.key==="Escape"){event.preventDefault();close();}
  if(event.key==="Tab"){
    const nodes=Array.from(mount.querySelectorAll(".drawer-panel a[href],.drawer-panel button:not(:disabled)")).filter(node=>node.getClientRects().length).map(node=>/** @type {HTMLElement} */ (node));
    if(!nodes.length)return;
    const first=nodes[0],last=nodes[nodes.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
});
document.addEventListener("fnf:cart-updated",()=>{if(isOpen)render();});
document.addEventListener("fnf:cart-added",open);
window.FNF_CART_DRAWER={open,close,render,isOpen:()=>isOpen};
render();
