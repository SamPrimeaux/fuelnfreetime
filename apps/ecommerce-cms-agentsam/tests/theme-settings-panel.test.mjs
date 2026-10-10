import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {readFileSync} from "node:fs";
const require=createRequire(new URL("../package.json",import.meta.url));
const {JSDOM}=require("jsdom");
const script=readFileSync(new URL("../frontend/static/js/theme-settings-panel.js",import.meta.url),"utf8");
function fixture(){
 const markup='<!doctype html><body><div id="te-theme-name">Heuristic</div><div id="te-preview-device" data-device="desktop"></div><iframe id="theme-preview"></iframe><section data-drawer-panel="theme-settings"></section></body>';
 const dom=new JSDOM(markup,{url:"https://editor.test/admin/theme-editor?slug=shop",runScripts:"outside-only",pretendToBeVisual:true});
 const w=dom.window;w.eval(script);
 return {dom,w,root:w.document.querySelector("#ts-theme-root")};
}
test("18 reference categories and exclusive accordion behavior",()=>{
 const {dom,root}=fixture();
 assert.ok(root,"component mounted");
 const expected=["Logo and favicon","Color palette","Typography","Page","Animations","Badges","Buttons","Cart","Drawers","Icons","Input fields","Popovers and modals","Prices","Product cards","Search","Swatches","Variant pickers","Custom CSS"];
 const buttons=[...root.querySelectorAll("[data-ts-toggle]")];
 assert.deepEqual(buttons.map(b=>b.textContent.trim()),expected);
 for(const b of buttons){b.click();assert.equal(root.querySelectorAll('[data-ts-toggle][aria-expanded="true"]').length,1,b.textContent);}
 buttons.at(-1).click();
 assert.equal(root.querySelectorAll('[data-ts-toggle][aria-expanded="true"]').length,0);
 dom.window.close();
});
test("all final five reference fields are present with correct initial values",()=>{
 const {dom,w,root}=fixture();
 const keys=["prices.product","prices.cards","prices.items","prices.total","cards.quick","cards.mobileQuick","cards.second","cards.carousel","search.empty","search.productRadius","search.cardRadius","swatches.width","swatches.height","swatches.radius","swatches.borders","swatches.thickness","swatches.opacity","variants.selectedBg","variants.selectedText","variants.selectedBorder","variants.width"];
 const found=new Set();
 root.querySelectorAll("[data-ts-toggle]").forEach(b=>{b.click();root.querySelectorAll("[data-ts-key]").forEach(x=>found.add(x.dataset.tsKey));});
 assert.ok(keys.every(key=>found.has(key)),keys.filter(k=>!found.has(k)).join(", "));
 const st=w.ThemeSettingsPanel.getState().values;
 assert.equal(st["prices.total"],true);assert.equal(st["cards.quick"],true);
 assert.equal(st["swatches.width"],34);assert.equal(st["swatches.height"],34);
 assert.equal(st["swatches.opacity"],10);assert.equal(st["variants.width"],"Fill");
 dom.window.close();
});
test("numeric slider synchronizes with typed values and survives category switching",()=>{
 const {dom,w,root}=fixture();
 const buttons=[...root.querySelectorAll("[data-ts-toggle]")];
 buttons[15].click();
 const number=root.querySelector('[data-ts-key="swatches.width"][type=number]');
 number.value="57";number.dispatchEvent(new w.Event("input",{bubbles:true}));
 assert.equal(root.querySelector('[data-ts-key="swatches.width"][type=range]').value,"57");
 buttons[16].click();buttons[15].click();
 assert.equal(root.querySelector('[data-ts-key="swatches.width"][type=number]').value,"57");
 assert.equal(w.ThemeSettingsPanel.getState().values["swatches.width"],57);
 assert.match(w.sessionStorage.getItem("ia:theme-ui-review:v1:Heuristic:shop"),/"swatches.width":57/);
 dom.window.close();
});
test("color picker Apply saves selection, Cancel preserves previous value",()=>{
 const {dom,w,root}=fixture();
 root.querySelectorAll("[data-ts-toggle]")[16].click();
 const picker=root.querySelector('[data-ts-key="variants.selectedBg"]');
 picker.click();assert.ok(w.document.querySelector(".ts-modal"));
 w.document.querySelector("[data-ts-color-hex]").value="#224466";
 w.document.querySelector("[data-ts-apply]").click();
 assert.equal(w.ThemeSettingsPanel.getState().values["variants.selectedBg"],"#224466");
 picker.click();
 w.document.querySelector("[data-ts-color-hex]").value="#abcdef";
 w.document.querySelector("[data-ts-close]").click();
 assert.equal(w.ThemeSettingsPanel.getState().values["variants.selectedBg"],"#224466");
 dom.window.close();
});
test("prices, variants and category preview respond without publication",()=>{
 const {dom,w,root}=fixture();
 const buttons=[...root.querySelectorAll("[data-ts-toggle]")];
 buttons[12].click();root.querySelector('[data-ts-key="prices.total"]').click();
 assert.equal(w.ThemeSettingsPanel.getState().values["prices.total"],false);
 assert.doesNotMatch(root.querySelector('[data-ts-demo-content]').textContent,/USD/);
 buttons[16].click();root.querySelector('[data-ts-key="variants.width"][data-ts-value="Fit"]').click();
 assert.equal(w.ThemeSettingsPanel.getState().values["variants.width"],"Fit");
 assert.ok(!root.querySelector(".ts-demo-variants").classList.contains("is-fill"));
 assert.equal(w.ThemeSettingsPanel.getState().published,false);
 dom.window.close();
});
