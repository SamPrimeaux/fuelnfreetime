/**
 * Responsive + gesture smoke test for the admin dock: serves dist/assets, loads the dock in an
 * iframe at real CSS widths (one at a time), and asserts the size contract and the swipe behavior.
 * Node stdlib only.
 *
 *   npm run build:admin:skip && node tests/dock-responsive-smoke.mjs
 *
 * Chrome is located on macOS/Linux PATH defaults; the test skips (exit 0) with a message when no
 * Chrome is found, so CI without a browser stays green.
 */
import http from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";

const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assets = path.join(root, "dist/assets");
const chrome = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].find((p) => existsSync(p));
if (!chrome) { console.log("SKIP: no Chrome found"); process.exit(0); }
if (!existsSync(path.join(assets, "admin/dock/index.js"))) {
  console.error("dist/assets/admin/dock missing. Run: npm run build:admin:skip");
  process.exit(1);
}

const VISIBLE = [360, 390, 430, 744, 834, 900];
const HIDDEN = [901, 1024, 1440, 1920, 2560];

const inner = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<style>*{box-sizing:border-box}body{margin:0;font-family:system-ui}</style><link rel="stylesheet" href="/admin/dock/dock.css"><pre id="out">pending</pre>
<script type="module">
import { mountAdminDock } from "/admin/dock/index.js";
const out = {};
try {
  try { sessionStorage.removeItem("admin-dock:hidden"); } catch {}
  const config = await (await fetch("/admin/dock/dock.config.json")).json();
  const unsafeReply = "Literal <script>alert('nope')</script> text stays text. Here is a deliberately longer AgentSam response so the compact peek clamps the preview to a few lines until the user explicitly asks to show more. Nothing in this reply should become executable markup.";
  const host = {
    send: async () => ({ reply: unsafeReply, conversation_id: "conv_smoke" }),
    open() { out.opened = (out.opened || 0) + 1; },
    openNav() { out.navOpened = true; },
  };
  const mk = () => mountAdminDock({ config, pathname: "/admin/products/create", host });
  let dock = mk();
  const $ = (s) => document.querySelector(s), R = (e) => e.getBoundingClientRect(), wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const pe = (type, el, x, y, id = 5) => el.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: id, pointerType: "touch", isPrimary: true, clientX: x, clientY: y }));
  out.w = innerWidth; out.visible = $(".admin-dock").classList.contains("is-visible");
  if (out.visible) {
    const bar = R($(".admin-dock__bar"));
    const tabs = [...document.querySelectorAll(".admin-dock__tab")];
    out.nav = { orbGone: !$(".admin-dock__orb"), tabCount: tabs.length, agentIndex: tabs.findIndex((t) => t.dataset.action === "agent"), agentInBar: !!$('.admin-dock__bar [data-action="agent"]'),
      barH: Math.round(bar.height), barW: Math.round(bar.width), left: Math.round(bar.left), right: Math.round(innerWidth - bar.right),
      minTap: Math.round(Math.min(...tabs.flatMap((t) => [R(t).width, R(t).height]))) };
    // edit mode
    const detail = { active: true, hint: "Unsaved changes", dirty: true, canSave: true, saveLabel: "Create", onSave() {}, discardHref: "/admin/products" };
    document.dispatchEvent(new CustomEvent("admin-dock:edit", { detail })); await wait(20);
    const hint = $(".admin-dock__hint"), ed = $(".admin-dock__edit");
    const ctl = [...document.querySelectorAll(".admin-dock__edit .admin-dock__btn, .admin-dock__edit .admin-dock__icon-btn")].filter((e) => !e.hidden);
    out.edit = { hintW: Math.round(R(hint).width), overflow: ed.scrollWidth > ed.clientWidth, minCtl: Math.round(Math.min(...ctl.flatMap((b) => [R(b).width, R(b).height]))), agentInEdit: !!$('.admin-dock__edit [data-action="agent"]') };
    document.dispatchEvent(new CustomEvent("admin-dock:edit", { detail: { active: true, hint: "x", dirty: false, canSave: false, saveLabel: "Save" } })); await wait(10);
    out.discardHiddenWhenNone = $('[data-edit="discard"]').hidden === true;
    document.body.classList.add("admin-dock-off"); out.offHides = getComputedStyle($(".admin-dock")).display === "none"; document.body.classList.remove("admin-dock-off");
    document.dispatchEvent(new CustomEvent("admin-dock:edit", { detail })); await wait(10);
    // compose (from edit mode, via the agent control inside the capsule)
    $('.admin-dock__edit [data-action="agent"]').click(); await wait(20);
    const close = $('[data-action="close-compose"]'), send = $(".admin-dock__send");
    const activeBarStyle = getComputedStyle($(".admin-dock__bar"));
    out.compose = {
      mode: $(".admin-dock").dataset.mode,
      inputFont: getComputedStyle($(".admin-dock__input")).fontSize,
      inputH: Math.round(R($(".admin-dock__input")).height),
      minChipH: Math.round(Math.min(...[...document.querySelectorAll(".admin-dock__chip")].map((c) => R(c).height))),
      closeW: Math.round(R(close).width),
      closeH: Math.round(R(close).height),
      sendW: Math.round(R(send).width),
      accent: getComputedStyle($(".admin-dock")).getPropertyValue("--admin-dock-accent").trim(),
      borderColor: activeBarStyle.borderTopColor,
      veilVisible: !$(".admin-dock__veil").hidden,
      sendPointsUp: send.querySelector("path")?.getAttribute("d") === "M12 19V5M6 11l6-6 6 6",
    };
    close.click(); await wait(10); out.composeClosesToEdit = $(".admin-dock").dataset.mode === "edit";
    document.dispatchEvent(new CustomEvent("admin-dock:edit", { detail: { active: false } })); await wait(10);

    // P1 reply stays in place: no automatic drawer, safe text, compact card above the capsule.
    $('[data-tab="agent"]').click(); await wait(10);
    $(".admin-dock__input").value = "Tell me about this page";
    $(".admin-dock__compose").requestSubmit();
    await wait(40);
    const peek = $(".admin-dock__peek"), peekText = $(".admin-dock__peek-text"), openChat = $('[data-peek-action="open"]'), expand = $('[data-peek-action="expand"]');
    const peekRect = R(peek), peekBarRect = R($(".admin-dock__bar"));
    out.peek = {
      state: peek.dataset.state,
      visible: !peek.hidden,
      autoOpened: (out.opened || 0) > 0,
      safeText: peekText.textContent === unsafeReply && !peek.querySelector("script"),
      noOverlap: peekRect.bottom <= peekBarRect.top,
      openTargetH: Math.round(R(openChat).height),
      showMoreVisible: !expand.hidden,
      clamped: getComputedStyle(peekText).webkitLineClamp === "4",
    };
    expand.click(); await wait(10);
    out.peek.expands = peek.classList.contains("is-expanded");
    openChat.click(); await wait(10);
    out.peek.explicitOpen = out.opened === 1 && peek.hidden;

    // Tap outside dismisses a later reply.
    $('[data-tab="agent"]').click(); $(".admin-dock__input").value = "Again"; $(".admin-dock__compose").requestSubmit(); await wait(30);
    document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "touch", pointerId: 21 }));
    await wait(10);
    out.peek.tapOutsideDismisses = $(".admin-dock__peek").hidden;

    // Swipe down uses the dock's existing gesture language to dismiss.
    $('[data-tab="agent"]').click(); $(".admin-dock__input").value = "One more"; $(".admin-dock__compose").requestSubmit(); await wait(30);
    const peek2 = $(".admin-dock__peek"), p2 = R(peek2), px = p2.left + Math.min(80, p2.width / 2), py = p2.top + 28;
    pe("pointerdown", peek2, px, py, 22); pe("pointermove", peek2, px, py + 62, 22); pe("pointerup", peek2, px, py + 62, 22); await wait(30);
    out.peek.swipeDismisses = peek2.hidden;

    // swipe: a slow short drag snaps back
    const barEl = $(".admin-dock__bar"), mainEl = $(".admin-dock__main"), handle = $(".admin-dock__handle");
    pe("pointerdown", barEl, 200, 760); await wait(300); pe("pointermove", barEl, 200, 772); pe("pointermove", barEl, 200, 782); await wait(50);
    out.swipe = { draggingMidway: $(".admin-dock").classList.contains("is-dragging") && mainEl.style.transform.startsWith("translateY(") };
    pe("pointerup", barEl, 200, 782); await wait(20);
    out.swipe.slowShortStays = $(".admin-dock").dataset.hidden === "false" && mainEl.style.transform === "";
    // a quick longer swipe hides it, leaving only the handle
    pe("pointerdown", barEl, 200, 760); pe("pointermove", barEl, 200, 790); pe("pointermove", barEl, 200, 830); pe("pointerup", barEl, 200, 830); await wait(350);
    const hr = R(handle);
    out.swipe.fastHides = $(".admin-dock").dataset.hidden === "true";
    out.swipe.handleH = Math.round(hr.height); out.swipe.handleW = Math.round(hr.width); out.swipe.handleShown = getComputedStyle(handle).display !== "none";
    out.swipe.bodyClass = document.body.classList.contains("admin-dock-hidden"); out.swipe.mainInert = mainEl.inert === true;
    out.swipe.persisted = (() => { try { return sessionStorage.getItem("admin-dock:hidden") === "1"; } catch { return null; } })();
    out.swipe.clearanceShrinks = getComputedStyle(document.body).getPropertyValue("--admin-dock-clearance").includes("44px");
    // survives the next page load
    dock.destroy(); dock = mk(); await wait(20);
    out.swipe.hiddenAfterRemount = $(".admin-dock").dataset.hidden === "true";
    // swipe the handle up to bring it back
    const handle2 = $(".admin-dock__handle");
    pe("pointerdown", handle2, 200, 820, 6); pe("pointermove", handle2, 200, 790, 6); pe("pointerup", handle2, 200, 790, 6); await wait(350);
    out.swipe.swipeUpRestores = $(".admin-dock").dataset.hidden === "false";
    // grabber button hides, handle tap restores
    $(".admin-dock__grab").click(); await wait(20); const hiddenByGrab = $(".admin-dock").dataset.hidden === "true";
    $(".admin-dock__handle").click(); await wait(20);
    out.swipe.grabAndTap = hiddenByGrab && $(".admin-dock").dataset.hidden === "false";
    // in compose, swiping down closes the composer instead of tucking the dock away
    $('[data-tab="agent"]').click(); await wait(20); const composing = $(".admin-dock").dataset.mode === "compose";
    const bar2 = $(".admin-dock__bar");
    pe("pointerdown", bar2, 200, 760, 7); pe("pointermove", bar2, 200, 790, 7); pe("pointermove", bar2, 200, 830, 7); pe("pointerup", bar2, 200, 830, 7); await wait(60);
    out.swipe.composeSwipeCloses = composing && $(".admin-dock").dataset.mode === "nav" && $(".admin-dock").dataset.hidden === "false";
    try { sessionStorage.removeItem("admin-dock:hidden"); } catch {}
    // config default: startHidden true starts tucked away; the default (false) starts visible
    dock.destroy(); dock = mountAdminDock({ config: { ...config, startHidden: true }, pathname: "/admin/home", host: {} }); await wait(20);
    out.startHiddenHonored = $(".admin-dock").dataset.hidden === "true";
    dock.destroy(); dock = mk(); await wait(20);
    out.startsVisibleByDefault = $(".admin-dock").dataset.hidden === "false";
    try { sessionStorage.removeItem("admin-dock:hidden"); } catch {}
  }
} catch (e) { out.error = String(e && e.stack || e); }
document.getElementById("out").textContent = JSON.stringify(out);
</script>`;
const widths = [...VISIBLE, ...HIDDEN];
// One iframe at a time: sessionStorage is shared across same-origin frames.
const outer = `<!doctype html><pre id="out"></pre><script>
const widths=${JSON.stringify(widths)},res={};let i=0;
function next(){if(i>=widths.length){document.getElementById('out').textContent=JSON.stringify(res);return}
const w=widths[i++],f=document.createElement('iframe');f.width=w;f.height=844;f.style.cssText='border:0;display:block';f.src='/inner.html';
f.onload=()=>setTimeout(()=>{try{res[w]=JSON.parse(f.contentDocument.getElementById('out').textContent)}catch(e){res[w]={error:String(e)}}f.remove();next()},1500);document.body.appendChild(f)}
next();</script>`;

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://x").pathname;
  if (url === "/inner.html") return void res.writeHead(200, { "content-type": "text/html" }).end(inner);
  if (url === "/index.html") return void res.writeHead(200, { "content-type": "text/html" }).end(outer);
  const file = path.join(assets, path.normalize(url));
  if (!file.startsWith(assets) || !existsSync(file) || !statSync(file).isFile()) return void res.writeHead(404).end();
  const type = { ".js": "text/javascript", ".css": "text/css", ".json": "application/json" }[path.extname(file)] || "application/octet-stream";
  res.writeHead(200, { "content-type": type }).end(readFileSync(file));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;
let dom;
try {
  // Async on purpose: the server above lives in this process, so a blocking exec would deadlock it.
  ({ stdout: dom } = await run(chrome, ["--headless=new", "--disable-gpu", "--window-size=1600,900", "--virtual-time-budget=90000", "--dump-dom", `http://127.0.0.1:${port}/index.html`], { encoding: "utf8", maxBuffer: 1 << 24, timeout: 120000 }));
} finally { server.close(); }
const m = dom.match(/<pre id="out">([\s\S]*?)<\/pre>/);
if (!m || !m[1].trim()) { console.error("no result from Chrome"); process.exit(1); }
const results = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"));

if (process.env.DOCK_SMOKE_DEBUG) for (const w of [390, 744]) console.log(w, JSON.stringify(results[w]));
const failures = [];
for (const w of VISIBLE) {
  const r = results[w];
  const check = (ok, msg) => { if (!ok) failures.push(`${w}px: ${msg}`); };
  check(r && !r.error && r.visible, `dock should be visible ${r?.error || ""}`);
  if (!r?.visible) continue;
  const n = r.nav, e = r.edit, c = r.compose, p = r.peek, s = r.swipe;
  check(n.orbGone, "no separate orb: the agent lives inside the capsule");
  check(n.agentInBar && n.tabCount === 5 && n.agentIndex === 2, `agent must be the middle of 5 tabs inside the bar (tabs=${n.tabCount}, agentIndex=${n.agentIndex})`);
  check(n.minTap >= 44, `tab hit area ${n.minTap} < 44`);
  check(n.barH >= 63 && n.barH <= 65, `bar height ${n.barH} not 64`);
  if (w <= 640) check(Math.abs(n.barW - (w - 32)) <= 2, `phone bar should fill the width (barW ${n.barW}, expected ${w - 32})`);
  else check(n.barW <= 561, `tablet bar capped at 560 (barW ${n.barW})`);
  check(n.left >= 16 && n.right >= 16, `side margins ${n.left}/${n.right} < 16`);
  check(!e.overflow, "edit panel overflows");
  check(e.hintW >= 90, `edit hint only ${e.hintW}px wide`);
  check(e.minCtl >= 44, `edit control ${e.minCtl} < 44`);
  check(e.agentInEdit, "agent stays reachable inside the capsule in edit mode");
  check(r.discardHiddenWhenNone === true, "Discard must hide when no discardHref/onDiscard");
  check(r.offHides === true, "body.admin-dock-off must hide the dock");
  check(c.mode === "compose" && r.composeClosesToEdit === true, "agent control opens compose; close returns to edit");
  check(c.inputFont === "16px", `input font ${c.inputFont} would zoom on iOS`);
  check(c.inputH >= 44 && c.minChipH >= 44 && c.closeW >= 44 && c.closeH >= 44 && c.sendW >= 44, "compose targets < 44");
  check(c.accent === "#7c3aed", `manifest accent did not reach dock token: ${c.accent}`);
  check(c.borderColor === "rgb(124, 58, 237)", `active composer border is not the agent accent: ${c.borderColor}`);
  check(c.veilVisible === true, "compose mode should quietly dim the page");
  check(c.sendPointsUp === true, "send arrow should point upward");
  check(p && p.visible && p.state === "success", "reply should resolve into a visible success peek card");
  check(p.autoOpened === false, "sending from the dock must never auto-open full chat");
  check(p.safeText === true, "model HTML must render as inert text");
  check(p.noOverlap === true, "peek card must sit above, not overlap, the capsule");
  check(p.openTargetH >= 44, `Open chat target only ${p.openTargetH}px tall`);
  check(p.showMoreVisible === true && p.clamped === true && p.expands === true, "long replies need a four-line preview with explicit expansion");
  check(p.explicitOpen === true, "Open chat should be the explicit drawer transition");
  check(p.tapOutsideDismisses === true, "tap outside should dismiss the peek card");
  check(p.swipeDismisses === true, "swipe down should dismiss the peek card");
  check(s.draggingMidway === true, "capsule should follow the finger while dragging");
  check(s.slowShortStays === true, "a slow short drag must snap back");
  check(s.fastHides === true, "a quick swipe down must tuck the capsule away");
  check(s.handleShown && s.handleH >= 44 && s.handleW >= 44, `handle must remain (>=44): ${s.handleW}x${s.handleH}`);
  check(s.bodyClass === true && s.mainInert === true, "hidden state must set body class and make the capsule inert");
  check(s.persisted === true && s.hiddenAfterRemount === true, "hidden state must persist across page loads (sessionStorage)");
  check(s.clearanceShrinks === true, "page clearance must shrink when the capsule is tucked away");
  check(s.swipeUpRestores === true, "swiping the handle up must bring the capsule back");
  check(s.grabAndTap === true, "grabber hides, handle tap restores");
  check(r.startsVisibleByDefault === true, "dock starts visible by default");
  check(r.startHiddenHonored === true, "dock.startHidden: true starts tucked away");
  check(s.composeSwipeCloses === true, "swipe down in compose closes the composer, not the dock");
}
for (const w of HIDDEN) {
  if (!(results[w] && results[w].visible === false)) failures.push(`${w}px: dock must be hidden above 900px`);
}
if (failures.length) { console.error("FAIL\n" + failures.map((f) => " - " + f).join("\n")); process.exit(1); }
console.log(`PASS: ${VISIBLE.length} compact widths meet the size contract and swipe behavior; dock hidden at ${HIDDEN.join(", ")}px`);
