#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const KNOWN_PERMISSIONS = new Set([
  "storage", "ui:settings-section", "ui:add-menu", "ui:composer",
  "ui:panel-tab", "ui:status-bar", "ui:command", "ui:markdown",
  "ui:page", "ui:timeline-row", "theme", "i18n", "events",
  "network:none", "composer:draft",
]);
const NETWORK_GRANT_RE = /^([A-Za-z0-9.-]+)(?::(\d+)(?:-(\d+))?)?$/;
const EXEC_BIN_RE = /^[A-Za-z0-9._-]+$/;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readJson(name) {
  return JSON.parse(readFileSync(path.join(root, name), "utf8"));
}

function isKnownPermission(permission) {
  if (KNOWN_PERMISSIONS.has(permission)) return true;
  if (permission.startsWith("exec:")) return EXEC_BIN_RE.test(permission.slice(5));
  if (!permission.startsWith("network:")) return false;
  const match = NETWORK_GRANT_RE.exec(permission.slice(8));
  if (!match) return false;
  if (match[2] === undefined) return true;
  const from = Number(match[2]);
  const to = match[3] === undefined ? from : Number(match[3]);
  return from >= 1 && from <= to && to <= 65535;
}

const manifest = readJson("manifest.json");
const pkg = readJson("package.json");
const problems = [];
if (typeof manifest.id !== "string" || !/^[a-z0-9][a-z0-9-]{1,63}$/.test(manifest.id))
  problems.push("id 必须是 2~64 位小写字母、数字或连字符");
if (!manifest.name?.trim()) problems.push("name 不能为空");
if (!/^\d+\.\d+\.\d+$/.test(manifest.version || "")) problems.push("version 必须是三段 semver");
if (manifest.version !== pkg.version) problems.push("manifest 与 package.json 版本不一致");
if (!new Set(["declarative", "js"]).has(manifest.tier)) problems.push("tier 必须是 declarative 或 js");
if (manifest.sdkVersion && !/^(\^|~|>=)?\d+\.\d+(\.\d+)?$|^\*$/.test(manifest.sdkVersion))
  problems.push("sdkVersion 格式不受支持");
if (!Array.isArray(manifest.permissions)) problems.push("permissions 必须是数组");
else {
  for (const permission of manifest.permissions) {
    if (typeof permission !== "string" || !isKnownPermission(permission)) problems.push(`未知权限: ${permission}`);
  }
  if (new Set(manifest.permissions).size !== manifest.permissions.length) problems.push("permissions 存在重复项");
}

if (problems.length) {
  console.error(`✗ manifest 校验失败（${problems.length} 项）`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log(`✓ ${manifest.id}@${manifest.version} manifest 校验通过`);
