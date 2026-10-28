import { useEffect, useMemo, useState } from "react";
import { adminFetch } from "../../lib/api";
import VectorAssetWorkbench from "./VectorAssetWorkbench";
import type { MediaAsset } from "./studio-model";

type Assessment = {
  status: string; source_px?: {width:number;height:number};
  crop?: {x:number;y:number;width:number;height:number}|null;
  effective_ppi?: number|null; target_ppi?: number;
  target_source?: string; required_active_px?: {width:number;height:number};
  production_ready?: boolean; requires_visual_review?: boolean;
  recommendation?: string;
};
type Recovery = {asset:MediaAsset; relation:string; assessment:Assessment};
type Inspection = {ok:boolean;source:MediaAsset;assessment:Assessment; supplier?:{
  ppi:number|null;format?:string|null;status:string;
}|null;candidates:Recovery[];available_actions:{
  recover_master:boolean;trim_transparent:boolean;remove_background:boolean;reconstruct:boolean;
}; limitation:string};
type Proposal = {candidate:MediaAsset;assessment:Assessment;requires_visual_review:boolean;message?:string;
  automated_choice?:string};

function density(value:number|null|undefined) {
  return typeof value==="number" && Number.isFinite(value) ? value.toFixed(1)+" PPI" : "Unmeasured";
}
function dims(value:Assessment["source_px"]) {
  return value ? value.width.toLocaleString()+" × "+value.height.toLocaleString()+" px" : "Unknown dimensions";
}
export default function ArtworkRepairPanel({
  asset, printWidthIn, printHeightIn, targetPpi, catalogProductId, printLocationId, method="dtg",
  onApply, onClose,
}:{
  asset:MediaAsset;printWidthIn:number|null;printHeightIn:number|null;targetPpi:number;
  catalogProductId:string;printLocationId:string;method?:string;
  onApply:(candidate:MediaAsset)=>void;onClose:()=>void;
}) {
  const [inspection,setInspection]=useState<Inspection|null>(null);
  const [candidate,setCandidate]=useState<Proposal|null>(null);
  const [busy,setBusy]=useState("");
  const [error,setError]=useState("");
  const [reviewed,setReviewed]=useState(false);
  const [consent,setConsent]=useState(false);
  const [models,setModels]=useState<Array<{id:string;name:string}>>([]);
  const [model,setModel]=useState("");
  const geometry = useMemo(()=>({
    print_width_in:printWidthIn,print_height_in:printHeightIn,
    target_ppi:targetPpi,catalog_product_id:catalogProductId,
    print_location_id:printLocationId,
  }),[printWidthIn,printHeightIn,targetPpi,catalogProductId,printLocationId]);
  const canInspect=Boolean(printWidthIn && printHeightIn && printWidthIn>0 && printHeightIn>0);
  useEffect(()=>{
    setCandidate(null);setReviewed(false);setInspection(null);setError("");
    if (!canInspect) return;
    const controller=new AbortController();
    const qs=new URLSearchParams(Object.entries(geometry)
      .filter((entry):entry is [string,string|number]=>entry[1]!=null)
      .map(([key,value])=>[key,String(value)]));
    adminFetch<Inspection>("/api/admin/media/"+encodeURIComponent(asset.id)+"/production-repair?"+qs.toString(),{
      signal:controller.signal,
    }).then(response=>{
      if (!controller.signal.aborted) setInspection(response);
    }).catch(e=>{
      if (!controller.signal.aborted) setError(e instanceof Error?e.message:"Artwork analysis failed");
    });
    return ()=>controller.abort();
  },[asset.id,canInspect,geometry]);
  useEffect(()=>{
    const controller=new AbortController();
    adminFetch<{models:Array<{id:string;name:string}>}>("/api/admin/media/image-models",{
      signal:controller.signal,
    }).then(result=>{
      if(controller.signal.aborted)return;
      setModels(result.models||[]);
      setModel(current=>current && result.models?.some(m=>m.id===current)
        ?current:result.models?.[0]?.id||"");
    }).catch(()=>setModels([]));
    return ()=>controller.abort();
  },[]);
  async function repair(method:"auto"|"trim_transparent"|"remove_background"|"reconstruct"|"recover_master",
    relatedId?:number) {
    if (!canInspect || busy) return;
    if (method==="reconstruct" && (!model || !consent)) {
      setError("Choose an enabled image model and confirm reconstruction before starting.");
      return;
    }
    setBusy(method);setError("");
    try {
      const result=await adminFetch<Proposal & {ok:boolean}>(
        "/api/admin/media/"+encodeURIComponent(asset.id)+"/production-repair",{
        method:"POST",body:JSON.stringify({
          ...geometry,method,model_id:(method==="auto"||method==="reconstruct")?model:undefined,
          allow_reconstruct:method==="auto" && consent,
          confirm_changes:method==="reconstruct"?consent:undefined,
          candidate_media_asset_id:relatedId,
        }),
      });
      if (!result.ok || !result.candidate) throw new Error(result.message || "No repair candidate returned");
      setCandidate(result);setReviewed(false);
    } catch(e) {
      setError(e instanceof Error?e.message:"Artwork preparation failed");
    } finally {setBusy("");}
  }
  return (
    <section className="ps-repair-workbench" aria-label="Production artwork repair">
      <div className="ps-repair-workbench__header">
        <div><strong>Production artwork repair</strong>
          <small>Inspect the original file · Prepare a separate candidate · Compare before use</small></div>
        <button type="button" aria-label="Close repair panel" onClick={onClose}>×</button>
      </div>
      {!canInspect && <p className="ps-repair-status">Select a supplier print location with physical dimensions to analyze this artwork.</p>}
      {error && <p className="ps-repair-error" role="alert">{error}</p>}
      {!inspection && canInspect && !error && <p className="ps-repair-status" role="status">Reading original image from Media Library storage…</p>}
      {inspection && <>
        <div className="ps-repair-stats">
          <div><span>Original source</span><strong>{dims(inspection.assessment.source_px)}</strong></div>
          <div><span>At this placement</span><strong>{density(inspection.assessment.effective_ppi)}</strong></div>
          <div><span>Quality reference</span><strong>{density(inspection.assessment.target_ppi)}</strong></div>
        </div>
        <p className="ps-repair-status">{inspection.assessment.target_source==="supplier_declared"
          ? "Supplier-declared density was found; final printer acceptance is still unverified."
          : "300 PPI is an advisory studio goal until this supplier location is verified."}
          {" "}No automated image operation can certify detail or artwork accuracy.</p>
        {inspection.candidates.length>0 && (
          <div className="ps-repair-masters">
            <strong>Potential sharper originals</strong>
            <small>Only same-lineage or matching-name media assets; inspect before applying.</small>
            {inspection.candidates.map(item=>(
              <div className="ps-repair-master" key={item.asset.id}>
                <img src={item.asset.url} alt="" />
                <span><strong>{item.asset.filename}</strong><small>{dims(item.assessment.source_px)} · {density(item.assessment.effective_ppi)}</small></span>
                <button type="button" disabled={!!busy}
                  onClick={()=>void repair("recover_master",item.asset.id)}>Compare</button>
              </div>
            ))}
          </div>
        )}
        <div className="ps-repair-actions">
          <button type="button" className="ps-button ps-repair-auto" disabled={!!busy}
            onClick={()=>void repair("auto")}>
            {busy==="auto"?"Finding best repair…":"Auto repair · compare result"}
          </button>
          <small>First finds a sharper original, then tries real transparency or background cleanup.
            AI runs only when you enable reconstruction review below. No pixel resizing is treated as restored detail.</small>
          {inspection.available_actions.trim_transparent && (
            <button type="button" disabled={!!busy} onClick={()=>void repair("trim_transparent")}>
              {busy==="trim_transparent"?"Trimming…":"Trim transparent borders"}</button>
          )}
          {inspection.available_actions.remove_background && (
            <button type="button" disabled={!!busy} onClick={()=>void repair("remove_background")}>
              {busy==="remove_background"?"Removing…":"Clean background"}</button>
          )}
        </div>
        <details className="ps-repair-reconstruct">
          <summary>Reconstruct artwork with AI (review required)</summary>
          <p>Generative reconstruction can change letters, logos and fine details. It is not a certified super-resolution process. Never replace an original without comparing both.</p>
          <label>Available image model
            <select value={model} onChange={e=>setModel(e.target.value)} disabled={!!busy}>
              {!models.length&&<option value="">No provider configured</option>}
              {models.map(m=><option key={m.id} value={m.id}>{m.name||m.id}</option>)}
            </select>
          </label>
          <label className="ps-repair-consent"><input type="checkbox" checked={consent}
            onChange={e=>setConsent(e.target.checked)}/> I understand the output may change the design and must be checked.</label>
          <button type="button" disabled={!model||!consent||!!busy}
            onClick={()=>void repair("reconstruct")}>
            {busy==="reconstruct"?"Reconstructing…":"Create reconstruction candidate"}
          </button>
        </details>
      </>}
      <details className="ps-vector-disclosure">
        <summary>Convert SVG / optimize logo for this print area</summary>
        <VectorAssetWorkbench selectedAsset={asset} printWidthIn={printWidthIn} printHeightIn={printHeightIn}
          targetPpi={targetPpi} method={method} onPrepared={(prepared)=>{onApply(prepared);onClose();}}/>
      </details>
      {candidate && (
        <section className="ps-repair-compare" aria-label="Review original and repaired artwork">
          <strong>Before / after — compare closely{candidate.automated_choice ? " · "+candidate.automated_choice.replaceAll("_"," ") : ""}</strong>
          <div className="ps-repair-compare__images">
            <figure><img src={asset.url} alt="Current original artwork"/><figcaption>Current original</figcaption></figure>
            <figure><img src={candidate.candidate.url} alt="Candidate artwork"/><figcaption>Proposed candidate</figcaption></figure>
          </div>
          <p>Candidate: {dims(candidate.assessment.source_px)} · {density(candidate.assessment.effective_ppi)}
            {candidate.assessment.requires_visual_review ? " · reconstructed detail unverified" : ""}
          </p>
          <label className="ps-repair-consent"><input type="checkbox" checked={reviewed}
            onChange={e=>setReviewed(e.target.checked)}/>
            I checked the text, shapes, colors, transparency and crop.</label>
          <div className="ps-repair-actions">
            <button type="button" disabled={!reviewed||!!busy}
              onClick={()=>{onApply(candidate.candidate);onClose();}}>Use reviewed candidate</button>
            <button type="button" onClick={()=>{setCandidate(null);setReviewed(false);}}>
              Keep original</button>
          </div>
          <small>Using this candidate does not certify manufacturing or overwrite the original Media Library file.</small>
        </section>
      )}
    </section>
  );
}
