import assert from "node:assert/strict";
import {
  BackgroundHistory,
  BACKGROUND_HISTORY_KEY,
  MAX_BACKGROUND_HISTORY_ITEMS,
  MAX_BACKGROUND_HISTORY_BYTES,
  backgroundHistoryImageKey,
  backgroundImageBytes,
} from "../src/background-history.ts";

const stored = new Map();
let failSetKey = "";
let failDeleteKey = "";
const storage = {
  get: async key => stored.get(key) ?? null,
  set: async (key, value) => {
    if (key === failSetKey) throw new Error("storage set failed");
    stored.set(key, structuredClone(value));
  },
  delete: async key => {
    if (key === failDeleteKey) throw new Error("storage delete failed");
    stored.delete(key);
  },
};
const picture = seed => `data:image/png;base64,${Buffer.from(seed).toString("base64")}`;
const history = new BackgroundHistory(storage, async () => picture("thumbnail"));
let updates = 0;
const unsubscribe = history.subscribe(() => { updates++; });
await history.init();
assert.deepEqual(history.getItems(), []);

const firstImage = picture("first wallpaper");
const first = await history.remember(firstImage, "第一张.png");
assert.equal((await history.read(first.id)).image, firstImage);
assert.equal(stored.get(backgroundHistoryImageKey(first.id)), firstImage);
assert.equal(first.size, Buffer.byteLength("first wallpaper"));
assert.equal(backgroundImageBytes(picture("a")), 1);
assert.equal(backgroundImageBytes(picture("ab")), 2);
assert.equal(backgroundImageBytes(picture("abc")), 3);
assert.equal(JSON.stringify(stored.get(BACKGROUND_HISTORY_KEY)).includes(firstImage), false);
await history.remember(firstImage, "同一张重命名.png");
assert.equal(history.getItems().length, 1);
assert.equal(history.getItems()[0].name, "同一张重命名.png");
const copied = history.getItems();
copied[0].name = "外部修改";
assert.notEqual(history.getItems()[0].name, copied[0].name);

const gif = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
const animated = await history.remember(gif, "动画.gif");
assert.equal((await history.read(animated.id)).image, gif);
const reloaded = new BackgroundHistory(storage);
await reloaded.init();
assert.equal(reloaded.getItems().length, 2);
assert.equal((await reloaded.read(first.id)).image, firstImage);
const beforeFailure = structuredClone(stored.get(BACKGROUND_HISTORY_KEY));
failSetKey = BACKGROUND_HISTORY_KEY;
await assert.rejects(history.remember(picture("failed wallpaper"), "失败.png"), /storage set failed/);
assert.equal(history.getItems().length, 2);
assert.deepEqual(stored.get(BACKGROUND_HISTORY_KEY), beforeFailure);
assert.equal([...stored.values()].includes(picture("failed wallpaper")), false);
await assert.rejects(history.remove(first.id), /storage set failed/);
assert.equal(stored.get(backgroundHistoryImageKey(first.id)), firstImage);
failSetKey = "";
failDeleteKey = backgroundHistoryImageKey(first.id);
await assert.rejects(history.remove(first.id), /storage delete failed/);
assert.deepEqual(stored.get(BACKGROUND_HISTORY_KEY), beforeFailure);
assert.equal(history.getItems().length, 2);
failDeleteKey = "";
await history.remove(first.id);
assert.equal(stored.has(backgroundHistoryImageKey(first.id)), false);
await assert.rejects(history.read(first.id), /已经从历史中删除/);
await assert.rejects(history.remember("https://example.com/image.png", "远程图片"), /壁纸图片无效/);
await Promise.all(["one", "two", "three"].map(seed => history.remember(picture(seed), `${seed}.png`)));
assert.equal(history.getItems().length, 4);
assert.equal(stored.get(BACKGROUND_HISTORY_KEY).items.length, 4);
assert.ok(updates >= 6);
unsubscribe();
const previousUpdates = updates;
await history.remember(gif, "动画.gif");
assert.equal(updates, previousUpdates);

const capacityStore = new Map();
const capacityStorage = {
  get: async key => capacityStore.get(key) ?? null,
  set: async (key, value) => { capacityStore.set(key, structuredClone(value)); },
  delete: async key => { capacityStore.delete(key); },
};
const capacity = new BackgroundHistory(capacityStorage);
for (let index = 0; index < MAX_BACKGROUND_HISTORY_ITEMS; index++) {
  await capacity.remember(picture(`wallpaper ${index}`), `${index}.png`);
}
await assert.rejects(capacity.remember(picture("overflow"), "溢出.png"), /历史已满/);
await capacity.remember(picture("wallpaper 0"), "重复不占额外空间.png");
assert.equal(capacity.getItems().length, MAX_BACKGROUND_HISTORY_ITEMS);
await capacity.remove(capacity.getItems()[0].id);
await capacity.remember(picture("overflow"), "删除后可继续导入.png");
assert.equal(capacity.getItems().length, MAX_BACKGROUND_HISTORY_ITEMS);

capacityStore.set(BACKGROUND_HISTORY_KEY, { version: 1, items: Array.from({ length: 10 }, (_, index) => ({
  id: index.toString(16).padStart(64, "0"), name: "large.png", thumbnail: "",
  size: MAX_BACKGROUND_HISTORY_BYTES / 10, createdAt: 1,
})) });
const bytesCapacity = new BackgroundHistory(capacityStorage);
await assert.rejects(bytesCapacity.remember(picture("extra"), "超出总容量.png"), /历史已满/);
capacityStore.set(BACKGROUND_HISTORY_KEY, { version: 1, items: [{ id: "invalid" }] });
const corrupted = new BackgroundHistory(capacityStorage);
await assert.rejects(corrupted.init(), /历史无效/);
assert.deepEqual(capacityStore.get(BACKGROUND_HISTORY_KEY), { version: 1, items: [{ id: "invalid" }] });
await assert.rejects(corrupted.remember(firstImage, "不覆盖损坏索引.png"), /历史无效/);
assert.throws(() => backgroundHistoryImageKey("../escape"), /记录无效/);

// Online pictures use the same original-image index, retaining optional provenance.
const onlineStore = new Map();
const onlineStorage = {
  get: async key => structuredClone(onlineStore.get(key) ?? null),
  set: async (key, value) => { onlineStore.set(key, structuredClone(value)); },
  delete: async key => { onlineStore.delete(key); },
};
const onlineHistory = new BackgroundHistory(onlineStorage);
const origin = {
  provider: "wallpaper-api-v2", url: "https://cdn-hsyq-static.shanhutech.cn/bizhi/staticwp/example.jpg",
  source: "birdpaper", category: "nature", keyword: "山海",
};
const online = await onlineHistory.remember(firstImage, "山海.jpg", origin);
assert.deepEqual(online.source, origin, "online origin must be saved with the existing history record");
origin.keyword = "caller mutation";
assert.equal(onlineHistory.getItems()[0].source.keyword, "山海");
online.source.keyword = "returned mutation";
const onlineCopy = onlineHistory.getItems();
onlineCopy[0].source.keyword = "list mutation";
assert.equal((await onlineHistory.read(online.id)).item.source.keyword, "山海");
await onlineHistory.remember(firstImage, "重复下载.jpg");
assert.equal(onlineHistory.getItems().length, 1);
assert.equal(onlineHistory.getItems()[0].source.keyword, "山海", "reload migration must retain provenance");
const onlineReload = new BackgroundHistory(onlineStorage);
await onlineReload.init();
assert.equal(onlineReload.getItems()[0].source.provider, "wallpaper-api-v2");
assert.equal((await onlineReload.read(online.id)).image, firstImage);
const local = await onlineReload.remember(picture("another local picture"), "本地.png");
assert.equal(local.source, undefined, "legacy/local entries need no source metadata");
await assert.rejects(onlineReload.remember(picture("unsafe"), "无效来源", {
  provider: "wallpaper-api-v2", url: "javascript:alert(1)",
}), /来源/);
assert.equal(onlineReload.getItems().length, 2);
await onlineReload.remove(online.id);
assert.equal(onlineStore.has(backgroundHistoryImageKey(online.id)), false);
history.dispose();
console.log("background history checks passed: persistence, deduplication, original bytes, queues, quotas, storage failures and online provenance");
