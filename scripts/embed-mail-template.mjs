#!/usr/bin/env node
/**
 * Embeds mail-app partial into email.html template for offline-first boot.
 * Run: node scripts/embed-mail-template.mjs
 */

import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const partialPath = path.join(root, "public/admin/partials/mail-app.html");
const emailPath = path.join(root, "public/admin/dashboard/email.html");

const partial = fs.readFileSync(partialPath, "utf8");
const email = fs.readFileSync(emailPath, "utf8");

const templateBlock = `<template id="mail-app-template">\n${partial}\n</template>\n`;

let next = email;
if (email.includes('id="mail-app-template"')) {
  next = email.replace(
    /<template id="mail-app-template">[\s\S]*?<\/template>\n?/,
    templateBlock
  );
} else {
  next = email.replace("<body>", `<body>\n${templateBlock}`);
}

fs.writeFileSync(emailPath, next);
console.log("Embedded mail partial into email.html");
