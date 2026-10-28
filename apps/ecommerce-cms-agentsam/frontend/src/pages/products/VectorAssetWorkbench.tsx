import { useEffect, useState } from "react";
import { adminFetch, adminFormFetch } from "../../lib/api";
import type { MediaAsset } from "./studio-model";
import { planVectorExport, inspectPrintMethodArtwork, type VectorPlan } from "../../../../../../packages/agentsam-merch/src/vector-exports.js";

const SVG_ELEMENTS = new Set(["svg","g","path","rect","circle","ellipse","line","polyline","polygon",
  "defs","linearGradient","radialGradient","stop","clipPath","title","desc"]);
const SVG_ATTRIBUTES = new Set(["xmlns","version","width","height","viewBox","preserveAspectRatio",
  "d","fill","fill-rule","fill-opacity","stroke","stroke-width","stroke-linecap","stroke-linejoin",
  "stroke-miterlimit","stroke-opacity","stroke-dasharray","stroke-dashoffset","opacity",
  "x","y","x1","x2","y1","y2","cx","cy","r","rx","ry","points","transform","id",
  "gradientUnits","gradientTransform","offset","stop-color","stop-opacity","spreadMethod","clip-path"]);
const validPaint = (v:string) => !/url\s*\(/i.test(v) || /^url\(#[a-zA-Z][\w.:-]*\)$/.test(v.trim());

function cleanSvg(source:string):string {
  if(source.length > 4_000_000 || /<!DOCTYPE|<!ENTITY/i.test(source))
    throw new Error("SVG exceeds 4 MB or declares external entities.");
  const doc=new DOMParser().parseFromString(source,"image/svg+xml");
  const root=doc.documentElement;
  if(root.localName!=="svg" || doc.querySelector("parsererror"))
    throw new Error("Choose a valid SVG vector file.");
  const inspect=(node:Element) => {
    if(node.namespaceURI!=="http://www.w3.org/2000/svg" || !SVG_ELEMENTS.has(node.localName))
      throw new Error("SVG contains unsupported content ("+node.localName+"). Convert embedded images to paths and outline live text first.");
    for(const attr of [...node.attributes]) {
      if(!SVG_ATTRIBUTES.has(attr.name) || /^on/i.test(attr.name) ||
         /(?:javascript:|data:|https?:|\/\/)/i.test(attr.value) ||
         !validPaint(attr.value))
        throw new Error("SVG attribute requires safe vector cleanup: "+attr.name);
    }
    for(const child of [...node.children])inspect(child);
  };
  inspect(root);
  root.setAttribute("xmlns","http://www.w3.org/2000/svg");
  if(!root.hasAttribute("viewBox")) {
    const width=Number.parseFloat(root.getAttribute("width")||"");
    const height=Number.parseFloat(root.getAttribute("height")||"");
    if(!(width>0&&height>0))throw new Error("SVG needs a viewBox or pixel width and height.");
    root.setAttribute("viewBox",`0 0 ${width} ${height}`);
  }
  const box=(root.getAttribute("viewBox")||"").trim().split(/[\s,]+/).map(Number);
  if(box.length!==4 || box.some(n=>!Number.isFinite(n)) || box[2]<=0||box[3]<=0)
    throw new Error("Invalid SVG viewBox.");
  root.setAttribute("width",String(box[2]));
  root.setAttribute("height",String(box[3]));
  return new XMLSerializer().serializeToString(root);
}
const isSvg=(file:Blob,name:string)=>file.type==="image/svg+xml"||/\.svg$/i.test(name);
const fileKind=(file:Blob,name:string)=>isSvg(file,name)?"svg":
  /image\/(png|jpeg|webp)/.test(file.type)||/\.(png|jpe?g|webp)$/i.test(name)?"raster":"unsupported";
async function imageFor(url:string):Promise<HTMLImageElement>{
  return new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>resolve(img);
    img.onerror=()=>reject(new Error("Image cannot be decoded; check the original file."));
    img.src=url;
  });
}
async function canvasBlob(canvas:HTMLCanvasElement,format:string,quality?:number):Promise<Blob>{
  const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,format,quality));
  if(!blob)throw new Error("Browser could not encode the requested image.");
  return blob;
}
type Candidate = {source:File;sourcePreview:string;outputPreview:string;png:File;webp:File;
  plan:VectorPlan;colorCount:number;transparent:boolean;warnings:string[]};
type UploadAsset = MediaAsset & {content_type?:string};
const METHODS=["dtg","uv","sublimation","etching","engraving","embroidery"] as const;

export default function VectorAssetWorkbench({selectedAsset,printWidthIn,printHeightIn,targetPpi=300,method="dtg",onPrepared}:{
  selectedAsset?:MediaAsset|null;printWidthIn?:number|null;printHeightIn?:number|null;
  targetPpi?:number;method?:string;onPrepared?:(asset:MediaAsset)=>void;
}){
  const [sourceFile,setSourceFile]=useState<File|null>(null);
  const [sourceAsset,setSourceAsset]=useState<MediaAsset|null>(selectedAsset||null);
  const [items,setItems]=useState<MediaAsset[]>([]);
  const [librarySearch,setLibrarySearch]=useState("");
  const [widthIn,setWidthIn]=useState(printWidthIn||4);
  const [heightIn,setHeightIn]=useState(printHeightIn||4);
  const [ppi,setPpi]=useState(targetPpi);
  const [printMethod,setPrintMethod]=useState(method.toLowerCase());
  const [mono,setMono]=useState(false);
  const [candidate,setCandidate]=useState<Candidate|null>(null);
  const [busy,setBusy]=useState("");
  const [notice,setNotice]=useState("");
  const [error,setError]=useState("");
  const [reviewed,setReviewed]=useState(false);
  const [saved,setSaved]=useState<MediaAsset|null>(null);

  useEffect(()=>{if(selectedAsset)setSourceAsset(selectedAsset);},[selectedAsset]);
  useEffect(()=>{if(printWidthIn&&printHeightIn){setWidthIn(printWidthIn);setHeightIn(printHeightIn);}},[printWidthIn,printHeightIn]);
  useEffect(()=>{setPpi(targetPpi);},[targetPpi]);
  useEffect(()=>{setPrintMethod(method.toLowerCase());},[method]);
  useEffect(()=>{
    const controller=new AbortController();
    const timer=setTimeout(()=>{
      const params=new URLSearchParams({view:"images",page:"1",page_size:"30",...(librarySearch?{q:librarySearch}:{})});
      adminFetch<{assets?:MediaAsset[]}>(`/api/admin/media?${params}`,{signal:controller.signal})
        .then(data=>{if(!controller.signal.aborted)setItems((data.assets||[]).filter(a=>/\.(svg|png|jpe?g|webp)$/i.test(a.filename)||/image\/(svg\+xml|png|jpeg|webp)/.test(a.content_type||"")));})
        .catch(()=>{if(!controller.signal.aborted)setItems([]);});
    },250);
    return ()=>{clearTimeout(timer);controller.abort();};
  },[librarySearch]);
  useEffect(()=>()=>{if(candidate){URL.revokeObjectURL(candidate.sourcePreview);URL.revokeObjectURL(candidate.outputPreview);}},[candidate]);

  function resetCandidate(){setCandidate(null);setSaved(null);setReviewed(false);setNotice("");setError("");}
  function selectFile(file?:File){
    if(!file)return;
    if(fileKind(file,file.name)==="unsupported"){setError("Choose SVG, PNG, JPEG or WebP artwork.");return;}
    setSourceFile(file);setSourceAsset(null);resetCandidate();
  }
  async function prepare(){
    if(busy || (!sourceFile&&!sourceAsset))return;
    setBusy("prepare");setError("");setNotice("");setSaved(null);
    let inputURL="";
    try {
      const blob=sourceFile||await (async()=>{
        const res=await fetch(sourceAsset!.url,{credentials:"same-origin"});
        if(!res.ok)throw new Error("Media Library source could not be loaded.");
        return res.blob();
      })();
      const name=sourceFile?.name||sourceAsset!.filename;
      if(blob.size>32*1024*1024)throw new Error("Source exceeds 32 MB. Choose the original master or a smaller file.");
      const kind=fileKind(blob,name);
      if(kind==="unsupported")throw new Error("This format is not supported for vector export.");
      const svg=kind==="svg";
      const source=svg?
        new File([cleanSvg(await blob.text())],name.replace(/\.[^.]+$/,"")+".svg",{type:"image/svg+xml"}):
        new File([blob],name,{type:blob.type||"image/png"});
      inputURL=URL.createObjectURL(source);
      const img=await imageFor(inputURL);
      const plan=planVectorExport({widthIn,heightIn,dpi:ppi,
        intrinsicWidth:img.naturalWidth,intrinsicHeight:img.naturalHeight,isVector:svg});
      const canvas=document.createElement("canvas");
      canvas.width=plan.widthPx;canvas.height=plan.heightPx;
      const ctx=canvas.getContext("2d",{willReadFrequently:true});
      if(!ctx)throw new Error("Canvas rendering is unavailable.");
      ctx.clearRect(0,0,canvas.width,canvas.height);
      const scale=Math.min(canvas.width/img.naturalWidth,canvas.height/img.naturalHeight);
      const width=img.naturalWidth*scale,height=img.naturalHeight*scale;
      ctx.drawImage(img,(canvas.width-width)/2,(canvas.height-height)/2,width,height);
      let data=ctx.getImageData(0,0,canvas.width,canvas.height);
      const colors=new Set<string>();
      let transparent=false;
      const left=(canvas.width-width)/2,top=(canvas.height-height)/2;
      for(let i=0;i<data.data.length;i+=Math.max(4,Math.floor(data.data.length/45000/4)*4)){
        const pixel=i/4,x=pixel%canvas.width,y=Math.floor(pixel/canvas.width);
        // Outside-image transparent padding is not proof that a JPEG/logo has an alpha channel.
        const inside=x>=left&&x<left+width&&y>=top&&y<top+height;
        if(inside&&data.data[i+3]<250)transparent=true;
        if(data.data[i+3]>128&&colors.size<=40)
          colors.add([data.data[i]>>4,data.data[i+1]>>4,data.data[i+2]>>4].join(","));
      }
      if(mono) {
        for(let i=0;i<data.data.length;i+=4){
          data.data[i]=0;data.data[i+1]=0;data.data[i+2]=0;
        }
        ctx.putImageData(data,0,0);
      }
      const count=mono?1:colors.size;
      const report=inspectPrintMethodArtwork({method:printMethod,colorCount:count,transparent});
      const base=name.replace(/\.[^.]+$/,"").replace(/[^a-z0-9-]+/gi,"-").slice(0,90)||"artwork";
      const png=new File([await canvasBlob(canvas,"image/png")],`${base}-${canvas.width}x${canvas.height}-print.png`,{type:"image/png"});
      const webp=new File([await canvasBlob(canvas,"image/webp",0.9)],`${base}-preview.webp`,{type:"image/webp"});
      setCandidate({source,sourcePreview:inputURL,outputPreview:URL.createObjectURL(png),png,webp,plan,
        colorCount:count,transparent,warnings:[...report.warnings,...(!plan.sourceHasRequiredDetail?[plan.note]:[])]});
      inputURL="";
      setNotice(svg?"Vector paths rendered at the actual selected print size.":"Raster original preserved; only verified source pixels used.");
    }catch(e){setError(e instanceof Error?e.message:"Could not prepare artwork.");}
    finally{if(inputURL)URL.revokeObjectURL(inputURL);setBusy("");}
  }
  async function uploadFile(file:File,role:"original/master"|"manufacturing"|"storefront/gallery",sourceId?:number){
    const form=new FormData();
    form.append("files",file);form.append("folder","images");
    form.append("prefix",role==="original/master"?"studio/artwork/masters":role==="manufacturing"?"studio/artwork/print":"studio/artwork/previews");
    form.append("derivative_role",role);form.append("transform_policy","preserve");
    if(sourceId)form.append("source_media_asset_id",String(sourceId));
    const response=await adminFormFetch<{assets?:MediaAsset[]}>("/api/admin/media",form);
    if(!response.assets?.[0]?.id)throw new Error("Media Library did not return the saved asset.");
    return response.assets[0];
  }
  async function saveCandidate(){
    if(!candidate||busy)return;
    setBusy("save");setError("");
    try{
      const master=sourceAsset||await uploadFile(candidate.source,"original/master");
      const print=await uploadFile(candidate.png,"manufacturing",master.id);
      await uploadFile(candidate.webp,"storefront/gallery",master.id);
      setSaved(print);
      setNotice(`Saved source #${master.id}, production PNG #${print.id}, and smaller WebP preview to Media Library. Original remains unchanged.`);
    }catch(e){setError(e instanceof Error?e.message:"Unable to save derivatives.");}
    finally{setBusy("");}
  }
  return <section className="ps-vector-workbench" aria-label="SVG and artwork preparation workbench">
    <header><div><strong>SVG & artwork preparation</strong><small>Vector master → print-size transparent PNG + optimized WebP preview</small></div></header>
    <div className="ps-vector-grid">
      <div className="ps-vector-side">
        <div className="ps-vector-drop" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();selectFile(e.dataTransfer.files[0]);}}>
          <strong>Drop artwork here</strong><small>SVG, PNG, JPEG or WebP · source preserved</small>
          <label className="ps-button">Choose file<input type="file" hidden accept=".svg,.png,.jpg,.jpeg,.webp,image/svg+xml,image/png,image/jpeg,image/webp" onChange={e=>selectFile(e.target.files?.[0])}/></label>
        </div>
        <label className="ps-vector-field">Select from Media Library<input type="search" placeholder="Find logos, icons…" value={librarySearch} onChange={e=>setLibrarySearch(e.target.value)}/></label>
        <div className="ps-vector-library" aria-label="Media Library artwork">
          {items.map(item=><button type="button" key={item.id} title={item.filename}
            className={sourceAsset?.id===item.id?"is-selected":""} onClick={()=>{setSourceFile(null);setSourceAsset(item);resetCandidate();}}>
            <img src={item.url} alt=""/><span>{item.filename}</span></button>)}
        </div>
        <small>Selected: {sourceFile?.name||sourceAsset?.filename||"none"}</small>
      </div>
      <div className="ps-vector-controls">
        <div className="ps-vector-dimensions">
          <label>Print width (in)<input type="number" min=".1" step=".1" value={widthIn} onChange={e=>{setWidthIn(Number(e.target.value));resetCandidate();}}/></label>
          <label>Print height (in)<input type="number" min=".1" step=".1" value={heightIn} onChange={e=>{setHeightIn(Number(e.target.value));resetCandidate();}}/></label>
          <label>PPI target<input type="number" min="72" max="1200" step="25" value={ppi} onChange={e=>{setPpi(Number(e.target.value));resetCandidate();}}/></label>
          <label>Method<select value={printMethod} onChange={e=>{setPrintMethod(e.target.value);resetCandidate();}}>
            {METHODS.map(m=><option value={m} key={m}>{m.toUpperCase()}</option>)}
          </select></label>
        </div>
        <label className="ps-vector-toggle"><input type="checkbox" checked={mono} onChange={e=>{setMono(e.target.checked);resetCandidate();}}/> Create separate one-color art (engraving/etching)</label>
        <button type="button" className="ps-button ps-primary" disabled={!sourceFile&&!sourceAsset||Boolean(busy)}
          onClick={()=>void prepare()}>{busy==="prepare"?"Converting…":"Prepare artwork"}</button>
        {candidate&&<div className="ps-vector-review">
          <div className="ps-vector-preview">
            <figure><img src={candidate.sourcePreview} alt="Original source"/><figcaption>Source</figcaption></figure>
            <figure><img src={candidate.outputPreview} alt="Production PNG candidate"/><figcaption>Print PNG</figcaption></figure>
          </div>
          <strong>{candidate.plan.widthPx} × {candidate.plan.heightPx} px · {Math.round(candidate.plan.effectivePpi)} effective PPI</strong>
          <small>{candidate.plan.note}</small>
          <p>{candidate.colorCount>40?"Many shades / gradients detected":`Approx. ${candidate.colorCount} sampled color bins`} · {candidate.transparent?"Has transparency":"Opaque background"}</p>
          {!!candidate.warnings.length&&<ul>{candidate.warnings.map((w,i)=><li key={i}>{w}</li>)}</ul>}
          <label className="ps-vector-toggle"><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/>
            I checked the converted logo's spelling, edges, colors and transparency.</label>
          <div className="ps-vector-actions">
            <button type="button" className="ps-button ps-primary" disabled={!reviewed||Boolean(busy)} onClick={()=>void saveCandidate()}>
              {busy==="save"?"Saving…":"Save master + derivatives"}</button>
            {saved && onPrepared && <button type="button" className="ps-button" disabled={!reviewed} onClick={()=>onPrepared(saved)}>Use PNG in Product Studio</button>}
            <a className="ps-button" href={candidate.outputPreview} download={candidate.png.name}>Export PNG</a>
          </div>
          <small>Candidate only: supplier acceptance and engraving legibility are not automatically certified.</small>
        </div>}
      </div>
    </div>
    {error&&<p className="ps-repair-error" role="alert">{error}</p>}
    {notice&&<p className="ps-repair-status" role="status">{notice}</p>}
  </section>;
}
