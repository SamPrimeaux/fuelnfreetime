import test from "node:test";
import assert from "node:assert/strict";
import { applyCmsSlotValue } from "../apps/ecommerce-cms-agentsam/backend/cms/edge-hydrate.js";

function element(attr) {
  const attrs=new Map([["data-cms-attr",attr]]);
  let text=null;
  return {
    getAttribute(k){return attrs.get(k)||null;},
    setAttribute(k,v){attrs.set(k,v);},
    setInnerContent(value,options){text={value,options};},
    read(k){return attrs.get(k)||null;},
    text(){return text;}
  };
}
const data=value=>({gallery:{card1:{url:value}}});
test("published edge media/link attributes reject javascript, data, and file URLs",()=>{
  for(const attr of ["src","href","style.backgroundImage"])for(const url of [
    "javascript:alert(1)","data:text/html,<script>alert(1)</script>",
    "file:///etc/passwd","vbscript:alert(1)","\u0000javascript:alert(1)"
  ]){
    const el=element(attr);
    const ok=applyCmsSlotValue(el,"gallery.card1.url",data(url));
    assert.equal(ok,false,"Rejected unsafe "+attr+" "+JSON.stringify(url));
    assert.equal(el.read(attr),null);
  }
});
test("published edge keeps existing internal R2 media URLs and real merchant links",()=>{
  for(const [attr,value] of [
    ["src","/media/archive/shopify-import/graphics/Vette.png"],
    ["src","https://fuelnfreetime.com/media/image.webp"],
    ["href","/collaborate"],["href","mailto:hello@fuelnfreetime.com"],
    ["href","https://fuelnfreetime.com/shop"],["href","#member-stories"],
  ]){
    const el=element(attr);
    assert.equal(applyCmsSlotValue(el,"gallery.card1.url",data(value)),true);
    assert.equal(el.read(attr),value);
  }
});
test("background image CSS is safely escaped and published text stays text, not HTML",()=>{
  const bg=element("style.backgroundImage");
  const url="/media/archive/(new)'image.webp";
  assert.equal(applyCmsSlotValue(bg,"gallery.card1.url",data(url)),true);
  assert.match(bg.read("style"),/background-image: url\('/);
  assert.doesNotMatch(bg.read("style"),/new\)'image/);
  const heading=element("textContent");
  assert.equal(applyCmsSlotValue(heading,"gallery.card1.url",data("<b>Still editorial text</b>")),true);
  assert.equal(heading.text().value,"<b>Still editorial text</b>");
  assert.equal(heading.text().options,undefined);
});
