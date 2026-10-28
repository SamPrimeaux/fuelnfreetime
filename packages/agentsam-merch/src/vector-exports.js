/**
 * Shared vector artwork export geometry: SVG is rendered at actual placement
 * pixels. Raster sources are never marked sharp because of interpolation.
 */
export const MAX_EXPORT_SIDE = 8192;
export const MAX_EXPORT_PIXELS = 32000000;
export function planVectorExport({widthIn,heightIn,dpi=300,intrinsicWidth,intrinsicHeight,isVector=false}={}) {
  const w=Number(widthIn),h=Number(heightIn),density=Number(dpi);
  if(!Number.isFinite(w)||!Number.isFinite(h)||!Number.isFinite(density)||
    w<=0||h<=0||density<72||density>1200) throw new RangeError("Invalid print dimensions or DPI");
  let pxW=Math.ceil(w*density),pxH=Math.ceil(h*density);
  if(pxW>MAX_EXPORT_SIDE||pxH>MAX_EXPORT_SIDE||pxW*pxH>MAX_EXPORT_PIXELS)
    throw new RangeError("Print export exceeds browser pixel budget");
  const srcW=Number(intrinsicWidth),srcH=Number(intrinsicHeight);
  if(!isVector && (!srcW||!srcH))throw new RangeError("Raster source dimensions unavailable");
  const sourcesEnough=isVector||srcW>=pxW&&srcH>=pxH;
  if(!isVector) {
    const ratio=Math.min(1,srcW/pxW,srcH/pxH);
    pxW=Math.max(1,Math.floor(pxW*ratio));
    pxH=Math.max(1,Math.floor(pxH*ratio));
  }
  return Object.freeze({
    widthPx:pxW,heightPx:pxH,sourceKind:isVector?"vector":"raster",
    targetPpi:density,effectivePpi:Math.min(pxW/w,pxH/h),
    sourceHasRequiredDetail:sourcesEnough,
    note:isVector?"True vector paths rendered at requested output resolution":
      sourcesEnough?"Source contains enough pixels for this full placement":
      "Raster resolution limited by original; resizing cannot recover detail",
  });
}
export function inspectPrintMethodArtwork({method,colorCount,transparent,hasLiveText=false}={}) {
  const m=String(method||"").toLowerCase();
  const warnings=[];
  if(["etching","engraving"].includes(m)) {
    if(Number(colorCount)>1)warnings.push("One-color process: create a separate monochrome candidate or use a color-capable method.");
    if(!transparent)warnings.push("Transparent background required to avoid engraving a solid rectangle.");
  }
  if(m==="embroidery")warnings.push("Embroidery requires supplier-approved digitization (e.g. DST); raster/SVG is not a stitch file.");
  if(hasLiveText)warnings.push("Outline fonts before production.");
  return Object.freeze({method:m,warnings,reviewRequired:warnings.length>0});
}
