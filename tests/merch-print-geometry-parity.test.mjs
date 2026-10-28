import assert from "node:assert/strict";
import test from "node:test";
import { effectiveArtworkDpi as canonical, providerPrintSizeIn as unitSize,
 rasterResolutionPreflight } from "../packages/agentsam-merch/src/geometry.js";
import { effectiveArtworkDpi as studio } from "../apps/ecommerce-cms-agentsam/packages/agentsam-merch/src/effective-dpi.js";
import { evaluateManufacturingCompatibility } from "../apps/ecommerce-cms-agentsam/packages/agentsam-merch/src/index.js";

test("studio and repo-level SDK geometry resolve to one module",()=>{
 assert.equal(studio,canonical);
 assert.deepEqual(unitSize({unit:"px",file_width:4200,file_height:4800,dpi:300}),{width:14,height:16});
 const g=canonical({sourceWidthPx:1254,sourceHeightPx:1254,
   printWidthIn:14,printHeightIn:16,placementWidthPercent:104});
 assert.equal(g.dpi,86);
 const p=rasterResolutionPreflight({sourceWidthPx:1254,sourceHeightPx:1254,
  printWidthIn:14,printHeightIn:16,placementWidthPercent:104,targetPpi:300});
 assert.equal(p.status,"needs_review");
 assert.equal(p.effectivePpi,g.exactDpi);
});
test("compatibility returns SDK source-pixel PPI for placed printed inches",()=>{
 const check=evaluateManufacturingCompatibility(
  {filename:"source artwork",mimeType:"image/png",widthPx:1254,heightPx:1254},
  {id:"dtg",manufacturer:"completeful",process:"dtg",format:"png",allowRaster:true,ppi:300,source:{verified:false}},
  {printWidthIn:14.56,printHeightIn:14.56});
 assert.ok(check.effectivePpi>86 && check.effectivePpi<86.2);
 assert.equal(check.productionReady,false);
 assert.equal(check.issues.some(i=>i.code==="insufficient_resolution"),true);
});
