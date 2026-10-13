import assert from "node:assert/strict";
import test from "node:test";

import { WallhavenProvider, WALLHAVEN_CATEGORIES, WALLHAVEN_RESOLUTIONS, WALLHAVEN_SORTS } from "../src/wallhaven-api.ts";

const image = (overrides = {}) => ({
  id: "abc123",
  purity: "sfw",
  path: "https://w.wallhaven.cc/full/ab/wallhaven-abc123.jpg",
  dimension_x: 3840,
  dimension_y: 2160,
  thumbs: { small: "https://th.wallhaven.cc/small/ab/abc123.jpg" },
  ...overrides,
});
const response = (data, meta = {}) => ({
  status: 200,
  body: JSON.stringify({ data, meta: { current_page: 1, last_page: 1, total: data.length, ...meta } }),
});
function bridgeReturning(...responses) {
  const calls = [];
  return {
    calls,
    invoke: async (command, args) => {
      calls.push({ command, args });
      assert.equal(command, "plugin_http_request");
      const next = responses.shift();
      if (next instanceof Error) throw next;
      return next;
    },
  };
}
function query(overrides = {}) {
  return { category: "", keyword: "", resolution: "any", ...overrides };
}

test("provider exposes supported category, resolution and sort filters", () => {
  const provider = new WallhavenProvider({ invoke: async () => response([], { total: 0 }) });
  assert.equal(provider.paginated, true);
  assert.deepEqual(provider.categories.map(item => item.value), ["", "general", "anime", "people"]);
  assert.deepEqual(provider.resolutions.map(item => item.value), ["any", "1280x720", "1366x768", "1600x900", "1920x1080", "2560x1440", "3840x2160"]);
  assert.deepEqual(provider.sorts.map(item => item.value), ["date_added", "relevance", "random", "toplist"]);
  assert.deepEqual(WALLHAVEN_CATEGORIES.map(item => item.value), ["", "general", "anime", "people"]);
  assert.equal(WALLHAVEN_RESOLUTIONS.length, 7);
  assert.equal(WALLHAVEN_SORTS.length, 4);
});

test("default query uses latest ordering and the windowless fallback resolution", () => {
  const provider = new WallhavenProvider({ invoke: async () => response([], { total: 0 }) });
  assert.deepEqual(provider.defaultQuery, { category: "", keyword: "", resolution: "any", sort: "date_added" });
});

test("screen-style resolutions are accepted and relevance without a keyword falls back to newest", async () => {
  const bridge = bridgeReturning(response([], { total: 0 }), response([], { total: 0 }));
  const provider = new WallhavenProvider(bridge);
  await provider.search(query({ resolution: "2880x1800", sort: "relevance" }), 1);
  let request = new URL(bridge.calls[0].args.url);
  assert.equal(request.searchParams.get("atleast"), "2880x1800");
  assert.equal(request.searchParams.get("sorting"), "date_added");
  await provider.search(query({ keyword: "landscape", resolution: "nonsense", sort: "relevance" }), 1);
  request = new URL(bridge.calls[1].args.url);
  assert.equal(request.searchParams.has("atleast"), false);
  assert.equal(request.searchParams.get("sorting"), "relevance");
});

test("filters unsafe purity and malicious original or thumbnail hosts, and deduplicates within page", async () => {
  const rows = [
    image({ id: "unsafe", purity: "sketchy" }),
    image({ id: "malicious", path: "https://w.wallhaven.cc.evil.example/pic.jpg" }),
    image({ id: "bad-thumb", path: "https://w.wallhaven.cc/full/ab/wallhaven-bad123.jpg", thumbs: { small: "https://th.wallhaven.cc@evil.example/pic.jpg" } }),
    image({ id: "wrong-thumb", path: "https://w.wallhaven.cc/full/ab/wallhaven-wrong1.jpg", thumbs: { small: "http://th.wallhaven.cc/small.jpg" } }),
    image({ id: "duplicate", path: "https://w.wallhaven.cc/full/ab/wallhaven-dupe01.jpg#fragment" }),
    image({ id: "dupe2", path: "https://w.wallhaven.cc/full/ab/wallhaven-dupe01.jpg" }),
  ];
  const result = await new WallhavenProvider(bridgeReturning(response(rows))).search(query(), 1);
  assert.equal(result.items.length, 3);
  assert.deepEqual(result.items.map(item => item.title), ["bad-thumb", "wrong-thumb", "duplicate"]);
  assert.equal(result.items[0].thumbnail, undefined);
  assert.equal(result.items[1].thumbnail, undefined);
  assert.equal(result.items[0].width, 3840);
  assert.equal(result.items[0].height, 2160);
  assert.equal(result.items[2].thumbnail, "https://th.wallhaven.cc/small/ab/abc123.jpg");
});

test("category remains selected alongside exact safely encoded keyword", async () => {
  const bridge = bridgeReturning(response([], { total: 0 }));
  await new WallhavenProvider(bridge).search(query({ category: "anime", keyword: "  星空 &categories=111 🪐  ", resolution: "1920x1080" }), 1);
  const request = new URL(bridge.calls[0].args.url);
  assert.equal(request.searchParams.get("categories"), "010");
  assert.equal(request.searchParams.get("q"), "  星空 &categories=111 🪐  ");
  assert.equal(request.searchParams.get("purity"), "100");
  assert.equal(request.searchParams.get("atleast"), "1920x1080");
  assert.equal(request.searchParams.get("page"), "1");
});

test("toplist sends official sort range and random pages carry response seed", async () => {
  const bridge = bridgeReturning(
    response([image()], { current_page: 3, last_page: 9, total: 201, seed: "aBc123" }),
    response([image()], { current_page: 3, last_page: 9, total: 201, seed: "aBc123" }),
    response([image({ id: "page4" })], { current_page: 4, last_page: 9, total: 201, seed: "aBc123" }),
  );
  const provider = new WallhavenProvider(bridge);
  const top = await provider.search(query({ sort: "toplist" }), 3);
  const topRequest = new URL(bridge.calls[0].args.url);
  assert.equal(topRequest.searchParams.get("sorting"), "toplist");
  assert.equal(topRequest.searchParams.get("topRange"), "1M");
  assert.deepEqual([top.page, top.totalPages, top.totalItems], [3, 9, 201]);

  const first = await provider.search(query({ sort: "random" }), 3);
  assert.equal(first.seed, "aBc123");
  const next = await provider.search(query({ sort: "random", seed: first.seed }), 4);
  assert.deepEqual([next.page, next.totalPages, next.totalItems], [4, 9, 201]);
  assert.equal(new URL(bridge.calls[1].args.url).searchParams.get("seed"), null);
  assert.equal(new URL(bridge.calls[2].args.url).searchParams.get("seed"), "aBc123");
  assert.equal(new URL(bridge.calls[2].args.url).searchParams.get("page"), "4");
});

test("empty results and out-of-range page metadata stay server-authoritative", async () => {
  const provider = new WallhavenProvider(bridgeReturning(
    response([], { current_page: 7, last_page: 1, total: 0 }),
  ));
  assert.deepEqual(await provider.search(query(), 7), { items: [], page: 7, totalPages: 1, totalItems: 0 });
});

test("malformed JSON and invalid pagination metadata are rejected", async () => {
  for (const result of [
    { status: 200, body: "not json" },
    { status: 200, body: JSON.stringify({ data: [], meta: { current_page: 1, last_page: 0, total: 0 } }) },
    { status: 200, body: JSON.stringify({ data: [], meta: { current_page: 1, last_page: 1, total: -1 } }) },
    { status: 200, body: JSON.stringify({ data: [], meta: { current_page: "1", last_page: 1, total: 0 } }) },
  ]) {
    await assert.rejects(new WallhavenProvider(bridgeReturning(result)).search(query(), 1), /JSON|元数据/);
  }
});

test("429 is reported and disposal rejects in-flight search", async () => {
  await assert.rejects(new WallhavenProvider(bridgeReturning({ status: 429, body: "" })).search(query(), 1), /频繁/);
  let resolve;
  const provider = new WallhavenProvider({ invoke: () => new Promise(yes => { resolve = yes; }) });
  const pending = provider.search(query(), 1);
  provider.dispose();
  resolve(response([], { total: 0 }));
  await assert.rejects(pending, /关闭/);
});
