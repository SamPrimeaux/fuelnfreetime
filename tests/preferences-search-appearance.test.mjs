import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { canonicalUrlFor } from "../apps/ecommerce-cms-agentsam/backend/cms/html-rewriter.js";

const APP = new URL("../apps/ecommerce-cms-agentsam/", import.meta.url);
const html = readFileSync(new URL("frontend/static/preferences.html", APP), "utf8");
const css = readFileSync(new URL("frontend/static/css/preferences.css", APP), "utf8");

test("canonicalUrlFor strips query, hash, .html and index.html; rejects non-https", () => {
  assert.equal(canonicalUrlFor("https://fuelnfreetime.com/?utm=x#a"), "https://fuelnfreetime.com/");
  assert.equal(canonicalUrlFor("https://fuelnfreetime.com/index.html"), "https://fuelnfreetime.com/");
  assert.equal(canonicalUrlFor("https://fuelnfreetime.com/about.html?x=1"), "https://fuelnfreetime.com/about");
  assert.equal(canonicalUrlFor("https://fuelnfreetime.com/shop"), "https://fuelnfreetime.com/shop");
  assert.equal(canonicalUrlFor("http://fuelnfreetime.com/shop"), "");
  assert.equal(canonicalUrlFor("not a url"), "");
});

test("social preview placeholder honors the hidden attribute (no overlap with a loaded image)", () => {
  assert.match(css, /\.prefs-social-placeholder\[hidden\]\s*\{\s*display:\s*none/);
});

test("social image preview reports load failures instead of showing a broken image", () => {
  assert.match(html, /img\.onerror\s*=\s*async/);
  assert.match(html, /explainImageFailure/);
  assert.match(html, /id="social-image-hint"/);
});

test("search discovery card uses plain language and live file checks, with no internal jargon", () => {
  const card = html.slice(html.indexOf('id="search-discovery-card"'), html.indexOf('id="prefs-note"'));
  assert.match(card, /Search engine discovery/);
  assert.match(card, /data-check="robots"/);
  assert.match(card, /data-check="sitemap"/);
  assert.doesNotMatch(card, /Not bound|service binding|crawl queue/);
  // The shared capability stays named for wiring, but never as visible jargon.
  assert.match(card, /data-capability="site\.scrape"/);
  assert.doesNotMatch(card.replace(/data-capability="site\.scrape"/, ""), /site\.scrape/);
});

test("inline preferences scripts parse", () => {
  const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  assert.ok(scripts.length > 0);
  for (const code of scripts) {
    const isModule = /\bimport\s|\bexport\s/.test(code);
    execFileSync(process.execPath, ["--check", ...(isModule ? ["--input-type=module"] : [])], { input: code, stdio: ["pipe", "ignore", "pipe"] });
  }
});
