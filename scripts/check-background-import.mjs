import assert from "node:assert/strict";

import {
  detectBackgroundMime,
  isBackgroundImage,
  shouldSuppressBackgroundMotion,
} from "../src/background-import-core.ts";

const webpHeader = Uint8Array.from([
  0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00,
  0x57, 0x45, 0x42, 0x50,
]);
assert.equal(detectBackgroundMime(webpHeader), "image/webp");

const fiveMegabyteWebp = `data:image/webp;base64,${"A".repeat(Math.ceil(5 * 1024 * 1024 / 3) * 4)}`;
assert.equal(isBackgroundImage(fiveMegabyteWebp), true);
const largeWebp = `data:image/webp;base64,${Buffer.alloc(32 * 1024 * 1024).toString("base64")}`;
assert.equal(isBackgroundImage(largeWebp), true, "32 MiB originals must remain valid after loading from storage");
const oversizedWebp = `data:image/webp;base64,${Buffer.alloc(33 * 1024 * 1024).toString("base64")}`;
assert.equal(isBackgroundImage(oversizedWebp), false);

assert.equal(shouldSuppressBackgroundMotion("data:image/webp;base64,UklGRg=="), false);
assert.equal(shouldSuppressBackgroundMotion("data:image/gif;base64,R0lGODlh"), true);

console.log("background import regression checks passed");
