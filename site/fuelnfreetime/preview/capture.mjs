/** Real Chrome CDP screenshots at exact CSS viewport sizes; local fixture only. */
import { spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { setTimeout as delay } from "node:timers/promises";
const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const profile = path.join(os.tmpdir(), "fnf-preview-" + process.pid);
const out = path.resolve(path.dirname(new URL(import.meta.url).pathname), "snapshots");
const shop = process.env.FNF_REVIEW_TARGET === "shop";
const previewUrl = shop ? "http://127.0.0.1:4337/shop" : "http://127.0.0.1:4337/products/review-hoodie";
mkdirSync(out, { recursive: true });
const child = spawn(chrome, [
  "--headless=new", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage",
  "--no-first-run", "--remote-debugging-port=0", "--user-data-dir=" + profile,
  previewUrl,
], { stdio: "ignore" });
try {
  let portFile = "";
  for (let i=0; i<100; i++) {
    if (existsSync(path.join(profile, "DevToolsActivePort"))) {
      portFile = readFileSync(path.join(profile, "DevToolsActivePort"), "utf8"); break;
    }
    await delay(120);
  }
  if (!portFile) throw Error("Chrome did not open DevTools");
  const port = Number(portFile.split("\n")[0]);
  const tabs = await (await fetch("http://127.0.0.1:" + port + "/json/list")).json();
  const tab = tabs.find((t) => t.type === "page");
  if (!tab) throw Error("No Chrome page for inspection");
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve,reject) => {
    ws.addEventListener("open", resolve, { once:true });
    ws.addEventListener("error", reject, { once:true });
  });
  let nextId = 1;
  const pending = new Map();
  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const resolve = pending.get(msg.id); pending.delete(msg.id); resolve(msg);
    }
  });
  async function send(method,params={}) {
    const id = nextId++;
    const value = new Promise(resolve=>pending.set(id,resolve));
    ws.send(JSON.stringify({ id, method, params }));
    const result = await value;
    if (result.error) throw Error(method + ": " + result.error.message);
    return result.result;
  }
  await send("Page.enable");
  await send("Runtime.enable");
  for (const width of [390, 834, 1440]) {
    const height = width === 390 ? 844 : width === 834 ? 1112 : 960;
    await send("Emulation.setDeviceMetricsOverride", {
      width, height, deviceScaleFactor:1, mobile:width<900,
      screenWidth:width, screenHeight:height,
    });
    await send("Page.navigate", { url: previewUrl });
    await delay(1800);
    const result = await send("Runtime.evaluate", {
      expression:`({ width: innerWidth, colors: document.querySelectorAll(".pdp-color").length,
        sizes: document.querySelectorAll(".pdp-size").length,
        canBuy: !document.getElementById("pdp-add")?.disabled,
        scroll: document.documentElement.scrollWidth > innerWidth,
        title: document.querySelector(".pdp-buy h1")?.textContent,
        cards: document.querySelectorAll(".fft-card").length,
        hero: document.querySelector(".shop-hero h1")?.textContent,
        activeNav: document.querySelector(".fnf-nav .is-active")?.textContent })`,
      returnByValue:true,
    });
    const evidence = result.result.value;
    console.log(JSON.stringify({ viewport: width+"x"+height, ...evidence }));
    if (shop) {
      if (evidence.width !== width || evidence.cards !== 3 || evidence.scroll)
        throw Error("Shop preview gate failed at " + width);
    } else if (evidence.width !== width || evidence.colors !== 15 || evidence.sizes !== 6 ||
        evidence.canBuy || evidence.scroll) throw Error("Product preview gate failed at "+width);
    const image = await send("Page.captureScreenshot", {
      format:"png", captureBeyondViewport:shop && width === 1440, fromSurface:true,
    });
    const target = path.join(out, "fnf-" + (shop ? "shop" : "pdp") + "-" + width + ".png");
    writeFileSync(target, Buffer.from(image.data, "base64"));
    console.log("Screenshot:",target);
    if (!shop && width === 390) {
      const interaction = await send("Runtime.evaluate", {
        expression:`(() => {
          const color = document.querySelector('button[data-color="Black"]');
          const size = document.querySelector('button[data-size="XL"]');
          color?.click(); size?.click();
          document.getElementById("pdp-colors")?.scrollIntoView({block:"start"});
          return {color:document.getElementById("pdp-color-name")?.textContent,
            size:document.getElementById("pdp-size-name")?.textContent,
            disabled:document.getElementById("pdp-add")?.disabled,
            note:document.getElementById("pdp-stock")?.textContent};
        })()`,
        returnByValue:true,
      });
      console.log("Mobile option interaction:",JSON.stringify(interaction.result.value));
      if (interaction.result.value.color !== "Black" || interaction.result.value.size !== "XL" ||
          !interaction.result.value.disabled) throw Error("Mobile option selection failed");
      await delay(250);
      const optionsImage = await send("Page.captureScreenshot", {
        format:"png", captureBeyondViewport:false, fromSurface:true,
      });
      const optionsPath = path.join(out, "fnf-pdp-390-options.png");
      writeFileSync(optionsPath, Buffer.from(optionsImage.data,"base64"));
      console.log("Interaction screenshot:",optionsPath);
    }
  }
  ws.close();
} finally {
  child.kill();
  await delay(250);
  rmSync(profile, {recursive:true, force:true});
}
