import { getProductOptions, resolveProductVariant, isOrderable, sizeExists, sizeAvailable, imagesForColor } from "./product-options.mjs";

const root = document.getElementById("pdp-root");
if (root) {
  const match = location.pathname.match(/^\/products\/([^/]+)\/?$/);
  const slug = new URLSearchParams(location.search).get("slug") || (match ? decodeURIComponent(match[1]) : "");
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char =>
    ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[char]);
  const safeUrl = value => {
    const url=String(value||"");
    return url.startsWith("/")&&!url.startsWith("//") || /^https:\/\//i.test(url) ? escapeHtml(url) : "";
  };
  const dollars = cents => Number(cents)>0 ? "$"+(Number(cents)/100).toFixed(2) : "Price on request";
  const normalize = value => String(value||"").trim().toLowerCase();
  const swatches = {
    black:"#181a1a",ash:"#c2c3bf",navy:"#1b293e","sport grey":"#acaaa7",
    charcoal:"#484b4d",white:"#f8f7f2",bone:"#ddd4be",natural:"#eee5d3",
    red:"#a5272c",forest:"#243e30",moss:"#657358",denim:"#607d91",
    "carolina blue":"#89b5d2",heather:"#9e9e9e",slate:"#56646c",
    olive:"#77795b",sand:"#d5c5a4",maroon:"#5c2433",royal:"#35549c",
    clay:"#b88f77",stone:"#b5b0a6",steel:"#737d83",wine:"#633747",
    "dark chocolate":"#3a302e","dark heather":"#55595c",
    "forest green":"#2b453a","heather red":"#b95f67","kelly green":"#16865a",
    "navy blue":"#24304d","royal blue":"#28569c","sport grey":"#b4b6b5",
    brick:"#9c4b40",ivory:"#f1e8d7",pepper:"#6d7071"
  };
  let product=null, variants=[], options={}, selectedColor="", selectedSize="", chosen=null;
  let activeImageIndex=0, activeImages=[];
  const badge=() => {
    const n=window.FNF_STORE?.cartCount?.() || 0;
    document.querySelectorAll("[data-cart-count]").forEach(el=>{
      el.textContent=String(n); el.hidden=!n;
    });
    window.FNF_SHELL?.updateCartBadge?.();
  };
  const meta=p=>{
    const siteName=document.querySelector('meta[property="og:site_name"]')?.content ||
      document.title.split(/[|–]/).pop().trim();
    const title=p.seo_title||p.title;
    document.title=siteName && !title.includes(siteName)?title+" | "+siteName:title;
    let desc=document.querySelector('meta[name="description"]');
    if(!desc){desc=document.createElement("meta");desc.name="description";document.head.append(desc);}
    desc.content=(p.seo_description||p.description||p.title||"").slice(0,180);
    const image=p.primary_image||p.image_url;
    if(image){
      for(const prop of ["og:image","twitter:image"]){
        let tag=document.querySelector('meta[property="'+prop+'"]');
        if(!tag){tag=document.createElement("meta");tag.setAttribute("property",prop);document.head.append(tag);}
        tag.content=new URL(image,location.origin).href;
      }
    }
  };
  const lead=text=>{
    const first=String(text||"").trim().split(/(?<=[.!?])\s|\n/)[0]||"";
    return first.length>195?first.slice(0,192).trim()+"…":first;
  };
  const mainMedia=()=>{
    const entry=activeImages[activeImageIndex]||activeImages[0];
    return entry?.url||"";
  };
  function redrawGallery() {
    const match=imagesForColor(product,selectedColor);
    activeImages=match.images;activeImageIndex=0;
    paintGallery();
  }
  function paintGallery(){
    const gallery=document.getElementById("pdp-gallery");
    if(!gallery)return;
    const image=activeImages[activeImageIndex],source=safeUrl(image?.url||"");
    gallery.innerHTML=source ? `
      <div class="pdp-main"><img src="${source}" alt="${escapeHtml(image?.alt_text||product.title)}" fetchpriority="high">
        <div class="pdp-image-index">${String(activeImageIndex+1).padStart(2,"0")} / ${String(activeImages.length).padStart(2,"0")}</div>
      </div>
      ${image?.source==="supplier_reference" ? '<p class="pdp-image-reference">Supplier color reference</p>' : ""}
      ${activeImages.length>1 ? '<div class="pdp-thumbs" aria-label="Product gallery">'+activeImages.map((img,i)=>
        `<button type="button" class="pdp-thumb${i===activeImageIndex?" active":""}" data-image="${i}" aria-label="View image ${i+1}" aria-pressed="${i===activeImageIndex}"><img src="${safeUrl(img.url)}" alt="" loading="lazy"></button>`
      ).join("")+'</div>' : ""}` : '<div class="pdp-main pdp-no-image">Product image coming soon</div>';
  }
  function setSelection(){
    chosen=resolveProductVariant(variants,selectedColor,selectedSize);
    const price=document.getElementById("pdp-price"),button=document.getElementById("pdp-add");
    const note=document.getElementById("pdp-selection-note");
    const displayCents=chosen?.price_cents>0?chosen.price_cents:product.price_cents;
    price.textContent=dollars(displayCents);
    const canBuy=isOrderable(chosen)&&Number(displayCents)>0;
    button.disabled=!canBuy;
    button.textContent=canBuy?"Add to bag":!variants.length?"Currently unavailable":
      options.hasColors&&!selectedColor?"Choose a color":options.hasSizes&&!selectedSize?"Choose a size":"Unavailable";
    note.textContent=chosen&&!canBuy?"This selection is currently unavailable.":"";
    document.getElementById("pdp-color-current")?.replaceChildren(document.createTextNode(selectedColor||"Choose a color"));
    document.getElementById("pdp-size-current")?.replaceChildren(document.createTextNode(selectedSize||"Choose a size"));
    for(const b of root.querySelectorAll("[data-color]")){
      const active=b.dataset.color===selectedColor;b.classList.toggle("active",active);b.setAttribute("aria-pressed",String(active));
    }
    for(const b of root.querySelectorAll("[data-size]")){
      const exists=sizeExists(variants,selectedColor,b.dataset.size);
      const available=sizeAvailable(variants,selectedColor,b.dataset.size);
      b.disabled=!exists||!available;b.classList.toggle("active",b.dataset.size===selectedSize);
      b.setAttribute("aria-pressed",String(b.dataset.size===selectedSize));
    }
  }
  function render(){
    options=getProductOptions(variants);
    if(options.colors.length===1)selectedColor=options.colors[0];
    if(options.sizes.length===1)selectedSize=options.sizes[0];
    const desc=String(product.description||"").trim();
    const firstLine=lead(desc);
    const colorControls=options.hasColors?`<div class="pdp-field">
      <div class="pdp-option-heading"><span>COLOR</span><span id="pdp-color-current">Choose a color</span></div>
      <div class="pdp-colors" role="group" aria-label="Color">
        ${options.colors.map(color=>{
          const swatch=swatches[normalize(color)]||"#888";
          return `<button type="button" class="pdp-color" data-color="${escapeHtml(color)}" title="${escapeHtml(color)}" aria-label="${escapeHtml(color)}" aria-pressed="false"><span class="pdp-color-dot" style="--swatch:${swatch}"></span><span class="pdp-color-label">${escapeHtml(color)}</span></button>`;
        }).join("")}
      </div></div>`:"";
    const sizeControls=options.hasSizes?`<div class="pdp-field">
      <div class="pdp-option-heading"><span>SIZE</span><span id="pdp-size-current">Choose a size</span></div>
      <div class="pdp-sizes" role="group" aria-label="Size">
        ${options.sizes.map(size=>`<button type="button" class="pdp-size" data-size="${escapeHtml(size)}" aria-pressed="false">${escapeHtml(size)}</button>`).join("")}
      </div></div>`:"";
    root.innerHTML=`
      <nav class="pdp-crumb" aria-label="Breadcrumb"><a href="/shop">Shop</a><span>/</span><span>${escapeHtml(product.title)}</span></nav>
      <div class="pdp-layout">
        <div id="pdp-gallery" class="pdp-gallery"></div>
        <div class="pdp-buy">
          ${product.collection?`<p class="pdp-kicker">${escapeHtml(product.collection)}</p>`:""}
          <h1>${escapeHtml(product.title)}</h1>
          <div class="pdp-price" id="pdp-price">${dollars(product.price_cents)}</div>
          ${firstLine?`<p class="pdp-lead">${escapeHtml(firstLine)}</p>`:""}
          ${colorControls}${sizeControls}
          <button type="button" class="pdp-btn primary" id="pdp-add" disabled>Choose an option <span aria-hidden="true">→</span></button>
          <p id="pdp-selection-note" class="pdp-note" aria-live="polite"></p>
          <div class="pdp-disclosures">
            <details class="pdp-disclosure"><summary>The details <span aria-hidden="true">+</span></summary>
              <p>${escapeHtml(desc||product.title)}</p></details>
            <details class="pdp-disclosure"><summary>Shipping &amp; care <span aria-hidden="true">+</span></summary>
              <p>Shipping options are shown at checkout. For fabric and care instructions, follow the label included with your item.</p></details>
          </div>
        </div>
      </div>
      <section class="pdp-related" id="pdp-related" hidden></section>`;
    root.addEventListener("click", event=>{
      const color=event.target.closest("[data-color]");
      if(color){selectedColor=color.dataset.color;
        if(!sizeExists(variants,selectedColor,selectedSize))selectedSize="";
        redrawGallery();setSelection();return;}
      const size=event.target.closest("[data-size]");
      if(size&&!size.disabled){selectedSize=size.dataset.size;setSelection();return;}
      const img=event.target.closest("[data-image]");
      if(img){activeImageIndex=Number(img.dataset.image);paintGallery();}
    });
    document.getElementById("pdp-add").addEventListener("click",()=>{
      if(!isOrderable(chosen)||!window.FNF_STORE)return;
      const cents=chosen.price_cents>0?chosen.price_cents:product.price_cents;
      if(Number(cents)<=0)return;
      window.FNF_STORE.addItem({variant_id:chosen.id,product_id:product.id,
        slug:product.slug,title:product.title,color:chosen.color||"",
        size:selectedSize||chosen.size||"",price_cents:cents,image:mainMedia(),qty:1});
      badge();
      const btn=document.getElementById("pdp-add");btn.textContent="Added to bag";
      setTimeout(()=>{if(btn.isConnected)setSelection();},1100);
    });
    redrawGallery();setSelection();badge();loadRelated();
  }
  async function loadRelated(){
    try{
      const response=await fetch("/api/store/products");
      if(!response.ok)return;
      const data=await response.json();
      const others=(data.products||[]).filter(item=>item.slug!==product.slug&&item.price_cents>0).slice(0,4);
      if(!others.length)return;
      const section=document.getElementById("pdp-related");if(!section)return;
      section.hidden=false;
      section.innerHTML=`<h2>More from the shop</h2><div class="pdp-related-grid">${others.map(item=>
        `<a class="pdp-related-card" href="/products/${encodeURIComponent(item.slug)}"><img src="${safeUrl(item.primary_image||item.image_url)}" alt="${escapeHtml(item.title)}" loading="lazy"><div><strong>${escapeHtml(item.title)}</strong><span>${dollars(item.price_cents)}</span></div></a>`
      ).join("")}</div>`;
    }catch{ /* Related merchandise is optional; never block buying. */ }
  }
  document.addEventListener("fnf:cart-updated",badge);
  if(!slug){root.textContent="Product not found."; }
  else{
    root.innerHTML='<div class="pdp-loading-text">Loading product…</div>';
    fetch("/api/store/products/"+encodeURIComponent(slug))
      .then(async response=>{const data=await response.json();if(!response.ok||!data.ok)throw Error(data.error||"Product unavailable");return data;})
      .then(data=>{product=data.product;variants=data.variants||[];root.dataset.hProduct=product.slug;meta(product);render();})
      .catch(()=>{root.innerHTML='<div class="pdp-error-wrap"><h1>Product unavailable</h1><a href="/shop">Back to shop</a></div>';});
  }
}
