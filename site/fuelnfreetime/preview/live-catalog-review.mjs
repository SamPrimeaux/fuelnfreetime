/** Local read-only FNF storefront verification against saved real D1 catalog records. */
import http from "node:http";
import path from "node:path";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../..");
const store=path.join(repo,"packages/heuristic-theme/storefront");
const catalog=JSON.parse(readFileSync(path.join(here,".local-products.json"),"utf8"));
const instance=JSON.parse(readFileSync(path.join(repo,"site/fuelnfreetime/site.json"),"utf8"));
const catalogList=catalog.map(({product,variants})=>({...product,variant_count:variants.length}));
const extContent=name=>name.endsWith(".html")?"text/html":name.endsWith(".css")?"text/css":
  /\.m?js$/.test(name)?"text/javascript":name.endsWith(".svg")?"image/svg+xml":"application/octet-stream";
const server=http.createServer(async(req,res)=>{
 try{
  const u=new URL(req.url||"/","http://127.0.0.1");
  const endpoint=u.pathname;
  if(req.method!=="GET") {res.writeHead(405).end("Read-only preview");return;}
  if(endpoint==="/api/store/nav"){
    res.writeHead(200,{"content-type":"application/json"}).end(JSON.stringify({
      ok:true,nav:{items:[{label:"HOME",href:"/"},{label:"SHOP",href:"/shop"},{label:"ABOUT",href:"/about"},{label:"COMMUNITY",href:"/community"}],
      logoUrl:instance.brand?.logo?.currentUrl||"",logoHeight:38,announcement:{enabled:false}}}));return;
  }
  if(endpoint==="/api/store/products"){
    res.writeHead(200,{"content-type":"application/json"}).end(JSON.stringify({ok:true,products:catalogList}));return;
  }
  if(endpoint.startsWith("/api/store/products/")){
    const slug=decodeURIComponent(endpoint.slice("/api/store/products/".length));
    const found=catalog.find(x=>x.product.slug===slug);
    res.writeHead(found?200:404,{"content-type":"application/json"})
      .end(JSON.stringify(found?{ok:true,...found}:{ok:false,error:"Not found"}));return;
  }
  if(endpoint.startsWith("/media/")){
    // Browser/CDN accepts Chrome-style curl; native Node fetch is rejected by WAF.
    // Read-only, origin-locked asset forwarding for local screenshots.
    const call=spawn("curl",["-L","--fail","--silent","--show-error","--max-time","12",
      "-A","Mozilla/5.0","https://fuelnfreetime.com"+endpoint]);
    const chunks=[];
    let bytes=0;
    call.stdout.on("data",chunk=>{bytes+=chunk.length;if(bytes<=25000000)chunks.push(chunk);else call.kill();});
    call.on("error",()=>{if(!res.writableEnded)res.writeHead(502).end("Media request failed");});
    call.on("close",code=>{
      if(res.writableEnded)return;
      if(code!==0||bytes>25000000){res.writeHead(502).end("Image unavailable");return;}
      const mime=/\.webp$/i.test(endpoint)?"image/webp":/\.jpe?g$/i.test(endpoint)?"image/jpeg":"image/png";
      res.writeHead(200,{"content-type":mime}).end(Buffer.concat(chunks));
    });return;
  }
  const route=endpoint.startsWith("/products/")?"/product.html":endpoint==="/checkout"||endpoint==="/cart"?"/cart.html":endpoint;
  const target=path.resolve(store,"."+(route==="/"?"/product.html":route));
  if(!target.startsWith(store+path.sep)||!existsSync(target)){res.writeHead(404).end("Not found");return;}
  res.writeHead(200,{"content-type":extContent(target),"cache-control":"no-store"}).end(readFileSync(target));
 }catch(error){console.error(error.message);res.writeHead(500).end("Local read failure");}
});
const port=Number(process.env.FNF_PDP_REVIEW_PORT||4346);
await new Promise(resolve=>server.listen(port,"127.0.0.1",resolve));
console.log("Live-catalog snapshot review: http://127.0.0.1:"+port+"/products/"+catalog.find(x=>x.product.id===12).product.slug);
console.log("Read-only data snapshot from real D1; no orders, inventory or publishing actions.");
