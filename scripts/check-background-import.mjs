import assert from "node:assert/strict";

import {
  MAX_BACKGROUND_BYTES,
  detectBackgroundMime,
  isBackgroundImage,
  shouldSuppressBackgroundMotion,
} from "../src/background-import-core.ts";

const webpHeader = Uint8Array.from([
  0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00,
  0x57, 0x45, 0x42, 0x50,
]);
assert.equal(detectBackgroundMime(webpHeader), "image/webp");

assert.equal(MAX_BACKGROUND_BYTES, 12 * 1024 * 1024);
const fiveMegabyteWebp = `data:image/webp;base64,${"A".repeat(Math.ceil(5 * 1024 * 1024 / 3) * 4)}`;
assert.equal(isBackgroundImage(fiveMegabyteWebp), true);

assert.equal(shouldSuppressBackgroundMotion("data:image/webp;base64,UklGRg=="), false);
assert.equal(shouldSuppressBackgroundMotion("data:image/gif;base64,R0lGODlh"), true);

console.log("background import regression checks passed");
