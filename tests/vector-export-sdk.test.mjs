import test from "node:test";
import assert from "node:assert/strict";
import { planVectorExport,inspectPrintMethodArtwork } from "../packages/agentsam-merch/src/vector-exports.js";
test("SVG vector path export uses actual supplier print geometry at 300 PPI",()=>{
 const plan=planVectorExport({widthIn:3.34,heightIn:3.54,dpi:300,isVector:true});
 assert.equal(plan.widthPx,1002);assert.equal(plan.heightPx,1062);
 assert.equal(plan.sourceHasRequiredDetail,true);
});
test("raster source is never artificially upgraded by a print conversion",()=>{
 const plan=planVectorExport({widthIn:10,heightIn:10,dpi:300,intrinsicWidth:500,intrinsicHeight:500,isVector:false});
 assert.equal(plan.sourceHasRequiredDetail,false);
 assert.equal(plan.widthPx,500);assert.equal(plan.heightPx,500);assert.equal(plan.effectivePpi,50);
});
test("oversized SVGs fail safely instead of exhausting browser canvas memory",()=>{
 assert.throws(()=>planVectorExport({widthIn:48,heightIn:48,dpi:300,isVector:true}),/pixel budget/);
});
test("etching and embroidery give actionable warnings, UV retains full-color support",()=>{
 assert.equal(inspectPrintMethodArtwork({method:"uv",colorCount:20,transparent:false}).reviewRequired,false);
 assert.equal(inspectPrintMethodArtwork({method:"etching",colorCount:5,transparent:false}).warnings.length,2);
 assert.match(inspectPrintMethodArtwork({method:"embroidery",colorCount:1,transparent:true}).warnings[0],/digitization/);
});
