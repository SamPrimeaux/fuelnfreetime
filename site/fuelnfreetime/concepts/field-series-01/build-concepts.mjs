/**
 * FNF FIELD SERIES 01 — original authored vector concepts.
 * Merchant-specific working sources, NOT shared CMS/theme engine defaults.
 * Transparent spot-color artwork uses live SVG text: outline/flatten and run
 * Completeful placement + DPI/print preflight before any product release.
 */
import { writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const out = path.dirname(fileURLToPath(import.meta.url));
const BONE = "#F1E9D8", INK = "#121416", ORANGE = "#FA4E13", BLUE = "#8BB3BC";
const font = "'Arial Narrow','Impact','Bebas Neue',sans-serif";
const mono = "'Courier New',monospace";
const open = (title, w=960, h=1120) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${title}">`;
const t = (x,y,str,size=35,fill=BONE,extra="") =>
  `<text x="${x}" y="${y}" fill="${fill}" font-family="${font}" font-weight="900" font-stretch="condensed" font-size="${size}" letter-spacing="-1.4" ${extra}>${str}</text>`;
const micro=(x,y,str,fill=BONE,size=17,extra="")=>`<text x="${x}" y="${y}" fill="${fill}" font-family="${mono}" font-size="${size}" letter-spacing="4" ${extra}>${str}</text>`;
const line=(x1,y1,x2,y2,color=BONE,width=3)=>`<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${color}" stroke-width="${width}" fill="none"/>`;
const save=(name,svg)=>{writeFileSync(path.join(out,name+".svg"),svg+"</svg>\n");console.log("Wrote",name+".svg");};

// 01 / Off Clock: machinery gauge rendered as timepiece, not another generic racing logo.
const ticks = Array.from({length:48},(_,i)=>{
  const a=(i*7.5-90)*Math.PI/180, inner=i%4===0?298:310, outer=326;
  return line(480+Math.cos(a)*inner,426+Math.sin(a)*inner,
    480+Math.cos(a)*outer,426+Math.sin(a)*outer,i%4===0?ORANGE:BONE,i%4===0?7:3);
}).join("");
save("01-off-clock-back",
 open("FNF Off Clock chronometer artwork")+
 `<g fill="none" stroke="${BONE}"><circle cx="480" cy="426" r="333" stroke-width="3"/><circle cx="480" cy="426" r="280" stroke-width="5"/><path d="M480 426 L645 280" stroke="${ORANGE}" stroke-width="14" stroke-linecap="square"/><circle cx="480" cy="426" r="17" stroke="${ORANGE}" stroke-width="7"/></g>`+
 ticks+
 `<rect x="304" y="371" width="352" height="121" rx="4" fill="${INK}"/>`+
 micro(480,351,"FIELD SERIES / 01",BONE,18,'text-anchor="middle"')+
 t(480,420,"OFF",115,BONE,'text-anchor="middle"')+
 t(480,489,"CLOCK.",84,ORANGE,'text-anchor="middle"')+
 `<rect x="60" y="795" width="840" height="5" fill="${ORANGE}"/>`+
 t(60,904,"THE HOURS",104,BONE)+t(60,1003,"ARE YOURS.",106,BONE)+
 micro(64,1060,"FUEL &amp; FREE TIME  //  EST. IN THE EARNED HOURS",BONE,18));
save("01-off-clock-front",
 open("FNF Off Clock left chest mark",520,400)+
 `<circle cx="85" cy="96" r="60" fill="none" stroke="${BONE}" stroke-width="7"/>`+
 Array.from({length:12},(_,i)=>{const a=(i*30-90)*Math.PI/180;return line(85+Math.cos(a)*47,96+Math.sin(a)*47,85+Math.cos(a)*55,96+Math.sin(a)*55,ORANGE,3)}).join("")+
 `<path d="M85 96 L113 61" stroke="${ORANGE}" stroke-width="7"/>`+
 t(168,86,"FNF",98,BONE)+micro(171,123,"OFF CLOCK DIVISION",BONE,14)+line(168,147,470,147,ORANGE,5));

// 02 / First Light: graphic system based on water line, launch coordinates + morning horizon.
const rays = Array.from({length:13},(_,i)=>{const a=Math.PI+(i/12)*Math.PI;const x=480+Math.cos(a)*280,y=434+Math.sin(a)*280;return line(480+Math.cos(a)*183,434+Math.sin(a)*183,x,y,ORANGE,5)}).join("");
const wake = Array.from({length:7},(_,i)=>`<path d="M${65+i*15} ${570+i*56} Q${450} ${550+i*52} ${895-i*16} ${580+i*56}" stroke="${BONE}" stroke-width="${i%2?5:3}" opacity="${1-i*.09}" fill="none"/>`).join("");
save("02-first-light-back",
 open("FNF First Light launch artwork")+
 micro(60,84,"FNF  /  WATER &amp; WILD",BONE,25)+line(60,109,899,109,ORANGE,5)+
 `<clipPath id="h"><rect x="58" y="160" width="845" height="610"/></clipPath>`+
 `<g clip-path="url(#h)"><circle cx="480" cy="434" r="184" stroke="${ORANGE}" stroke-width="7" fill="none"/>${rays}${wake}<rect x="49" y="435" width="870" height="10" fill="${BONE}"/></g>`+
 t(60,862,"FIRST",168,BONE)+t(60,1014,"LIGHT.",183,ORANGE)+
 micro(64,1070,"UP BEFORE THE WORLD  /  HOME WHEN IT'S GOOD",BONE,17));
save("02-first-light-front",
 open("FNF First Light chest badge",520,400)+
 `<rect x="18" y="24" width="470" height="228" rx="4" stroke="${BONE}" stroke-width="5" fill="none"/>`+
 `<path d="M40 142H466M350 140A64 64 0 0 1 478 140" stroke="${ORANGE}" stroke-width="7" fill="none"/>`+
 micro(40,68,"WATER &amp; WILD",BONE,19)+t(40,121,"FIRST LIGHT",69,BONE)+
 micro(42,210,"FNF / 001 / LAUNCH",BONE,17));

// 03 / Shop Notes: mechanical illustrated workshop plate, not a car logo paste.
const rotor=Array.from({length:12},(_,i)=>{const a=(i*30)*Math.PI/180;const x=480+Math.cos(a)*220,y=452+Math.sin(a)*220;
return `<rect x="${x-24}" y="${y-30}" width="48" height="60" rx="5" fill="${INK}" stroke="${ORANGE}" stroke-width="5" transform="rotate(${i*30} ${x} ${y})"/>`}).join("");
save("03-shop-notes-back",
 open("FNF Shop Notes workshop insignia")+
 micro(72,98,"SERVICE RECORD / VOL 001",BONE,21)+line(72,122,887,122,ORANGE,5)+
 `<circle cx="480" cy="452" r="228" fill="none" stroke="${BONE}" stroke-width="8"/><circle cx="480" cy="452" r="140" fill="none" stroke="${BONE}" stroke-width="5"/><circle cx="480" cy="452" r="43" fill="${ORANGE}"/>`+
 rotor+
 `<path d="M382 452L456 525L589 365" fill="none" stroke="${BONE}" stroke-width="23" stroke-linecap="square"/>`+
 t(480,750,"STILL",155,BONE,'text-anchor="middle"')+
 t(480,892,"BUILDING.",143,ORANGE,'text-anchor="middle"')+
 line(73,950,887,950,BONE,3)+micro(76,1000,"THE BEST HOURS DON'T NEED A TIME CLOCK",BONE,20)+
 micro(77,1050,"FUEL &amp; FREE TIME  /  SHOP NOTES 03",BONE,16));
save("03-shop-notes-front",
 open("FNF Shop Notes small chest insignia",520,400)+
 `<rect x="20" y="35" width="480" height="202" rx="4" fill="none" stroke="${BONE}" stroke-width="6"/>`+
 micro(44,72,"SHOP NOTES / No.03",ORANGE,18)+t(40,177,"FNF",158,BONE)+
 micro(42,216,"STILL BUILDING",BONE,18));

// Authored garment concept covers; illustration conveys placement, not proof of physical sample.
const garments=[
 ["01-off-clock","OFF CLOCK","Washed black",BONE,ORANGE,"#262728","#1b1d1d"],
 ["02-first-light","FIRST LIGHT","Deep navy",BONE,ORANGE,"#273a45","#1a2c34"],
 ["03-shop-notes","SHOP NOTES","Iron charcoal",BONE,ORANGE,"#414242","#292b2b"],
];
for(const [stem,title,color,ink,accent,shirt,shade] of garments){
  const garment = `<path d="M303 115 L379 71 Q480 128 581 71 L657 115 L791 257 L685 362 L645 314 L652 970 Q480 1019 308 970 L315 314 L275 362 L169 257 Z" fill="${shirt}" stroke="${shade}" stroke-width="18" stroke-linejoin="round"/>
  <path d="M379 73 Q480 182 581 73" fill="none" stroke="${shade}" stroke-width="18"/>
  <path d="M303 115 L315 314 M657 115 L645 314" stroke="${shade}" stroke-width="8" fill="none"/>
  <path d="M355 886 Q480 921 605 886" stroke="${shade}" stroke-width="4" fill="none"/>`;
  const artwork=`<image href="${stem}-back.svg" x="344" y="261" width="270" height="350" preserveAspectRatio="xMidYMid meet"/>`;
  const frontArt=`<image href="${stem}-front.svg" x="517" y="192" width="87" height="70" preserveAspectRatio="xMidYMid meet"/>`;
  const cover=open(title+" garment concept cover",960,1120)+
   `<rect width="960" height="1120" fill="#E8E4DC"/><path d="M0 1097H960" stroke="#D1C9BB" stroke-width="44"/>`+
   `<text x="62" y="62" fill="#67645F" font-family="${mono}" font-size="19" letter-spacing="4">FNF / FIELD SERIES 01</text>`+
   `<g>${garment}${artwork}</g>`+
   `<text x="70" y="1050" fill="#181817" font-family="${font}" font-size="65" font-weight="900">${title}</text>`+
   `<text x="74" y="1087" fill="#66615B" font-family="${mono}" font-size="17" letter-spacing="2">${color.toUpperCase()} / BACK GRAPHIC STUDY</text>`+
   "</svg>\n";
  // Standalone SVG artwork cannot use relative external SVG <image> consistently
  // through R2 media proxy; bake source-art layers into an SVG <svg> nested viewport.
  const inner=readSource(stem+"-back.svg");
  const baked=cover.replace(artwork,`<svg x="344" y="261" width="270" height="350" viewBox="0 0 960 1120">${inner}</svg>`);
  writeFileSync(path.join(out,stem+"-cover.svg"),baked);
  console.log("Wrote",stem+"-cover.svg");
}
function readSource(file){
 return readFileSync(path.join(out,file),"utf8").replace(/^<svg[^>]*>/,"").replace(/<\/svg>\s*$/,"");
}
