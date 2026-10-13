import assert from "node:assert/strict";
import { SeenUrlStore, SEEN_URLS_KEY, SEEN_URLS_LIMIT } from "../src/seen-urls.ts";

function createStorage(initial = null) {
  const saved = new Map(initial === null ? [] : [[SEEN_URLS_KEY, structuredClone(initial)]]);
  const fixture = {
    saved,
    calls: [],
    failGet: false,
    failSet: false,
    failDelete: false,
    beforeSet: null,
    beforeDelete: null,
    storage: {
      get: async key => {
        fixture.calls.push(["get", key]);
        if (fixture.failGet) throw new Error("storage get failed");
        return structuredClone(saved.get(key) ?? null);
      },
      set: async (key, value) => {
        fixture.calls.push(["set", key, structuredClone(value)]);
        if (fixture.beforeSet) await fixture.beforeSet();
        if (fixture.failSet) throw new Error("storage set failed");
        saved.set(key, structuredClone(value));
      },
      delete: async key => {
        fixture.calls.push(["delete", key]);
        if (fixture.beforeDelete) await fixture.beforeDelete();
        if (fixture.failDelete) throw new Error("storage delete failed");
        saved.delete(key);
      },
    },
  };
  return fixture;
}

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

const firstUrl = "https://example.com/first.jpg";
const secondUrl = "https://example.com/second.jpg";
const thirdUrl = "https://example.com/third.jpg";

// Successful initialization is shared and cached, and persisted URLs survive a new instance.
{
  const fixture = createStorage();
  const seen = new SeenUrlStore(fixture.storage);
  await Promise.all([seen.init(), seen.init(), seen.init()]);
  assert.equal(fixture.calls.filter(([operation]) => operation === "get").length, 1);
  assert.equal(seen.size, 0);
  await seen.record(firstUrl, secondUrl, firstUrl);
  assert.equal(seen.size, 2);
  assert.deepEqual([...seen.asSet()], [firstUrl, secondUrl]);
  assert.deepEqual(fixture.saved.get(SEEN_URLS_KEY), [firstUrl, secondUrl]);
  await seen.init();
  assert.equal(fixture.calls.filter(([operation]) => operation === "get").length, 1);
  const reloaded = new SeenUrlStore(fixture.storage);
  await reloaded.init();
  assert.equal(reloaded.has(firstUrl), true);
  assert.deepEqual([...reloaded.asSet()], [firstUrl, secondUrl]);
  const snapshot = reloaded.asSet();
  snapshot.clear();
  assert.equal(reloaded.size, 2, "callers cannot mutate the store through a snapshot");
  const writes = fixture.calls.length;
  await seen.record(firstUrl, secondUrl);
  await seen.record();
  assert.equal(fixture.calls.length, writes, "duplicates and empty records do not write storage");
  await seen.clear();
  assert.equal(seen.size, 0);
  assert.equal(fixture.saved.has(SEEN_URLS_KEY), false);
  const afterClear = new SeenUrlStore(fixture.storage);
  await afterClear.init();
  assert.equal(afterClear.size, 0);
}

// Normalization is identical for saved records, new records and lookups.
{
  const fixture = createStorage([
    "HTTPS://Example.COM:443/first.jpg#old",
    firstUrl,
    "http://Example.COM:80/second.jpg#fragment",
  ]);
  const seen = new SeenUrlStore(fixture.storage);
  await seen.init();
  assert.deepEqual([...seen.asSet()], [firstUrl, "http://example.com/second.jpg"]);
  assert.equal(seen.has("https://EXAMPLE.COM:443/first.jpg#new"), true);
  assert.equal(seen.has("http://example.com:80/second.jpg#new"), true);
  assert.equal(seen.has("https://user:secret@example.com/first.jpg"), false);
  assert.equal(seen.has("not a URL"), false);
  await seen.record("HTTPS://EXAMPLE.COM:443/first.jpg#new", "https://example.com:8443/third.jpg#new");
  assert.deepEqual(fixture.saved.get(SEEN_URLS_KEY), [
    firstUrl, "http://example.com/second.jpg", "https://example.com:8443/third.jpg",
  ]);
}

// The oldest unique URL is evicted; repeating one does not refresh its FIFO position.
{
  const fixture = createStorage();
  const seen = new SeenUrlStore(fixture.storage);
  const urls = Array.from({ length: SEEN_URLS_LIMIT }, (_, index) => `https://example.com/${index}.jpg`);
  await seen.record(...urls);
  await seen.record(urls[0], thirdUrl);
  assert.equal(seen.size, SEEN_URLS_LIMIT);
  assert.equal(seen.has(urls[0]), false);
  assert.deepEqual([...seen.asSet()], [...urls.slice(1), thirdUrl]);
  const reloaded = new SeenUrlStore(fixture.storage);
  await reloaded.init();
  assert.deepEqual([...reloaded.asSet()], [...urls.slice(1), thirdUrl]);

  const oversized = createStorage([...urls, urls[0], secondUrl, thirdUrl]);
  const capped = new SeenUrlStore(oversized.storage);
  await capped.init();
  assert.equal(capped.size, SEEN_URLS_LIMIT);
  assert.deepEqual([...capped.asSet()], [...urls.slice(2), secondUrl, thirdUrl]);
  assert.equal(oversized.calls.length, 1, "loading does not rewrite the saved record");
}

// record, clear and another record execute in call order, exposing only committed state.
{
  const fixture = createStorage([firstUrl]);
  const seen = new SeenUrlStore(fixture.storage);
  await seen.init();
  const setStarted = deferred();
  const allowSet = deferred();
  const deleteStarted = deferred();
  const allowDelete = deferred();
  fixture.beforeSet = async () => {
    setStarted.resolve();
    await allowSet.promise;
  };
  fixture.beforeDelete = async () => {
    deleteStarted.resolve();
    await allowDelete.promise;
  };
  const record = seen.record(secondUrl);
  const clear = seen.clear();
  const afterClear = seen.record(thirdUrl);
  await setStarted.promise;
  assert.deepEqual([...seen.asSet()], [firstUrl], "an in-flight write is not published");
  assert.deepEqual(fixture.saved.get(SEEN_URLS_KEY), [firstUrl]);
  assert.deepEqual(fixture.calls.map(([operation]) => operation), ["get", "set"]);
  allowSet.resolve();
  await deleteStarted.promise;
  assert.deepEqual([...seen.asSet()], [firstUrl, secondUrl], "an in-flight delete is not published");
  assert.deepEqual(fixture.saved.get(SEEN_URLS_KEY), [firstUrl, secondUrl]);
  allowDelete.resolve();
  await Promise.all([record, clear, afterClear]);
  assert.deepEqual([...seen.asSet()], [thirdUrl]);
  assert.deepEqual(fixture.saved.get(SEEN_URLS_KEY), [thirdUrl]);
  assert.deepEqual(fixture.calls.map(([operation]) => operation), ["get", "set", "delete", "set"]);
}

// Concurrent records cannot overwrite one another even without an explicit init call.
{
  const fixture = createStorage();
  const seen = new SeenUrlStore(fixture.storage);
  await Promise.all([seen.record(firstUrl), seen.record(secondUrl), seen.record(thirdUrl)]);
  assert.deepEqual([...seen.asSet()], [firstUrl, secondUrl, thirdUrl]);
  assert.deepEqual(fixture.saved.get(SEEN_URLS_KEY), [firstUrl, secondUrl, thirdUrl]);
  assert.equal(fixture.calls.filter(([operation]) => operation === "get").length, 1);
}

// Failed writes/deletes roll back memory, allow the same input to be retried and leave the queue usable.
{
  const fixture = createStorage([firstUrl]);
  const seen = new SeenUrlStore(fixture.storage);
  await seen.init();
  fixture.failSet = true;
  await assert.rejects(seen.record(secondUrl), /storage set failed/);
  assert.deepEqual([...seen.asSet()], [firstUrl]);
  assert.deepEqual(fixture.saved.get(SEEN_URLS_KEY), [firstUrl]);
  fixture.failSet = false;
  await seen.record(secondUrl);
  assert.deepEqual([...seen.asSet()], [firstUrl, secondUrl]);
  fixture.failDelete = true;
  await assert.rejects(seen.clear(), /storage delete failed/);
  assert.deepEqual([...seen.asSet()], [firstUrl, secondUrl]);
  assert.deepEqual(fixture.saved.get(SEEN_URLS_KEY), [firstUrl, secondUrl]);
  fixture.failDelete = false;
  await seen.clear();
  assert.equal(seen.size, 0);
  assert.equal(fixture.saved.has(SEEN_URLS_KEY), false);
  await seen.record(thirdUrl);
  assert.deepEqual(fixture.saved.get(SEEN_URLS_KEY), [thirdUrl]);
}

// A queued action behind a failed action still executes in order.
{
  const fixture = createStorage([firstUrl]);
  const seen = new SeenUrlStore(fixture.storage);
  fixture.failSet = true;
  const failure = assert.rejects(seen.record(secondUrl), /storage set failed/);
  const clear = seen.clear();
  await Promise.all([failure, clear]);
  assert.equal(seen.size, 0);
  assert.equal(fixture.saved.has(SEEN_URLS_KEY), false);
  fixture.failSet = false;
  await seen.record(secondUrl);
  assert.deepEqual(fixture.saved.get(SEEN_URLS_KEY), [secondUrl]);
}

// Storage reads may be retried after failure; failures must never erase persisted data.
{
  const fixture = createStorage([firstUrl]);
  const seen = new SeenUrlStore(fixture.storage);
  fixture.failGet = true;
  await assert.rejects(seen.init(), /storage get failed/);
  await assert.rejects(seen.record(secondUrl), /storage get failed/);
  await assert.rejects(seen.clear(), /storage get failed/);
  assert.equal(seen.size, 0);
  assert.deepEqual(fixture.saved.get(SEEN_URLS_KEY), [firstUrl]);
  assert.ok(fixture.calls.every(([operation]) => operation === "get"));
  fixture.failGet = false;
  await seen.init();
  assert.equal(seen.has(firstUrl), true);
  await seen.record(secondUrl);
  assert.deepEqual(fixture.saved.get(SEEN_URLS_KEY), [firstUrl, secondUrl]);
}

// Invalid saved arrays fail atomically, retain original storage and can be retried after repair.
const invalidUrls = [
  "", "not a URL", "/relative.jpg", "ftp://example.com/image.jpg", "javascript:alert(1)",
  "https://user@example.com/image.jpg", "https://user:secret@example.com/image.jpg",
  "https://", `https://example.com/${"x".repeat(2048)}`, null, 42,
];
for (const malformed of [{ urls: [firstUrl] }, "not an array", ...invalidUrls.map(url => [firstUrl, url])]) {
  const fixture = createStorage(malformed);
  const seen = new SeenUrlStore(fixture.storage);
  await assert.rejects(seen.init(), /浏览记录无效/);
  assert.equal(seen.size, 0, "a valid prefix of a malformed array must not be published");
  await assert.rejects(seen.record(secondUrl), /浏览记录无效/);
  await assert.rejects(seen.clear(), /浏览记录无效/);
  assert.deepEqual(fixture.saved.get(SEEN_URLS_KEY), malformed);
  assert.ok(fixture.calls.every(([operation]) => operation === "get"));
  fixture.saved.set(SEEN_URLS_KEY, [firstUrl]);
  await seen.init();
  assert.equal(seen.has(firstUrl), true);
  await seen.record(secondUrl);
  assert.deepEqual(fixture.saved.get(SEEN_URLS_KEY), [firstUrl, secondUrl]);
}

// An invalid record batch must neither partially publish valid entries nor write them.
{
  const fixture = createStorage([firstUrl]);
  const seen = new SeenUrlStore(fixture.storage);
  await seen.init();
  for (const invalid of invalidUrls) {
    await assert.rejects(seen.record(secondUrl, invalid), /浏览记录.*无效/);
    assert.deepEqual([...seen.asSet()], [firstUrl]);
    assert.deepEqual(fixture.saved.get(SEEN_URLS_KEY), [firstUrl]);
  }
  assert.equal(fixture.calls.length, 1);
  await seen.record(secondUrl);
  assert.deepEqual([...seen.asSet()], [firstUrl, secondUrl]);
}

console.log("seen URL checks passed: persistence, normalization, FIFO eviction, ordered writes, rollback/retry and malformed data preservation");
