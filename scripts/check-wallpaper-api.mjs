import assert from "node:assert/strict";
import test from "node:test";

import {
  WALLPAPER_API_URL,
  WALLPAPER_CATEGORIES,
  WALLPAPER_RESOLUTIONS,
  WALLPAPER_NETWORK_HOSTS,
  normalizeWallpaperQuery,
  buildWallpaperUrl,
  WallpaperApi,
} from "../src/wallpaper-api.ts";

const query = { category: "nature", keyword: "", resolution: "1920x1080" };
const imageUrl = "http://cdn-hsyq-static.shanhutech.cn/bizhi/staticwp/photo.jpg";
const imageRow = { url: imageUrl, title: "", source: "birdpaper", width: 0, height: 0, resolution: "1920x1080" };
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jgbkAAAAASUVORK5CYII=", "base64");
const maxBytes = 8 * 1024 * 1024;

const jsonResponse = data => ({ status: 200, body: JSON.stringify({ code: 200, message: "success", data, count: Array.isArray(data) ? data.length : 1 }) });
const binaryResponse = (bytes = png, extra = {}) => ({
  status: 200,
  body: Buffer.from(bytes).toString("base64"),
  encoding: "base64",
  contentType: "image/png",
  byteLength: bytes.length,
  url: imageUrl,
  ...extra,
});
function bridgeReturning(...responses) {
  const calls = [];
  return {
    calls,
    invoke: async (command, args) => {
      calls.push({ command, args });
      if (command === "plugin_exec_run") {
        assert.equal(args.bin, "node");
        const response = responses.shift() || { code: 0, stdout: png.toString("base64"), stderr: "" };
        if (response instanceof Error) throw response;
        return response;
      }
      assert.equal(command, "plugin_http_request");
      assert.equal(args.method, "GET");
      assert.ok(responses.length, "unexpected automatic retry or extra network request");
      const response = responses.shift();
      if (response instanceof Error) throw response;
      return response;
    },
  };
}
function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test("keyword search overrides category and safely encodes user input", () => {
  const input = { category: "nature", keyword: "  星空 &count=1 🪐  ", resolution: "2560x1440" };
  assert.deepEqual(normalizeWallpaperQuery(input), { category: "", keyword: "星空 &count=1 🪐", resolution: "2560x1440" });
  assert.equal(input.category, "nature", "normalization must not mutate the form state");
  const url = new URL(buildWallpaperUrl(input));
  assert.equal(`${url.origin}${url.pathname}`, "https://wp.upx8.com/api.php");
  assert.equal(WALLPAPER_API_URL, "https://wp.upx8.com/api.php");
  assert.deepEqual(Object.fromEntries(url.searchParams), {
    format: "json", count: "10", content: "星空 &count=1 🪐", resolution: "2560x1440",
  });
});

test("keywords are limited to 100 Unicode code points without splitting emoji", () => {
  const normalized = normalizeWallpaperQuery({ ...query, keyword: `  ${"🌌".repeat(101)}tail  ` });
  assert.equal(normalized.keyword, "🌌".repeat(100));
  assert.equal(new URL(buildWallpaperUrl(normalized)).searchParams.get("content"), "🌌".repeat(100));
  assert.equal(normalized.category, "");
});

test("keyword truncation leaves a stable normalized value when the boundary is whitespace", () => {
  const normalized = normalizeWallpaperQuery({ ...query, keyword: `${"星".repeat(99)} beyond the limit` });
  assert.equal(normalized.keyword, "星".repeat(99));
  assert.deepEqual(normalizeWallpaperQuery(normalized), normalized);
  assert.equal(new URL(buildWallpaperUrl(normalized)).searchParams.get("content"), normalized.keyword);
});

test("unsupported filters fall back to all categories and the official default resolution", () => {
  assert.deepEqual(normalizeWallpaperQuery({ category: "unknown", keyword: "   ", resolution: "9999x9999" }), {
    category: "", keyword: "", resolution: "1920x1080",
  });
  const defaults = new URL(buildWallpaperUrl({ category: "", keyword: "", resolution: "" }));
  assert.deepEqual(Object.fromEntries(defaults.searchParams), { format: "json", count: "10", resolution: "1920x1080" });
  assert.deepEqual(WALLPAPER_CATEGORIES.map(item => item.value), ["", "nature", "anime", "game", "animal", "city", "abstract", "space", "car", "girl", "sport"]);
  assert.deepEqual(WALLPAPER_RESOLUTIONS.map(item => item.value), ["1280x720", "1366x768", "1600x900", "1920x1080", "2560x1440", "3840x2160"]);
  for (const category of WALLPAPER_CATEGORIES) {
    assert.equal(new URL(buildWallpaperUrl({ ...query, category: category.value })).searchParams.get("category"), category.value || null);
  }
  for (const resolution of WALLPAPER_RESOLUTIONS) {
    assert.equal(new URL(buildWallpaperUrl({ ...query, resolution: resolution.value })).searchParams.get("resolution"), resolution.value);
  }
});

test("single-object responses use the requested resolution when dimensions are omitted", async () => {
  const bridge = bridgeReturning(jsonResponse(imageRow));
  const result = await new WallpaperApi(bridge).search(query);
  assert.deepEqual(result, [{ url: imageUrl, title: "风景壁纸 1", source: "birdpaper", width: 1920, height: 1080, category: "nature" }]);
  assert.deepEqual(Object.fromEntries(new URL(bridge.calls[0].args.url).searchParams), {
    format: "json", count: "10", category: "nature", resolution: "1920x1080",
  });
  assert.equal(bridge.calls[0].args.responseEncoding, undefined, "JSON queries use the backward-compatible text response");
});

test("array responses deduplicate canonical URLs and return at most ten authorized pictures", async () => {
  const response = [
    { ...imageRow, url: "http://CDN-HSYQ-STATIC.SHANHUTECH.CN:80/folder/../a.jpg?crop=1#one", title: " 第一张 ", width: 640, height: 360 },
    { ...imageRow, url: "http://cdn-hsyq-static.shanhutech.cn/a.jpg?crop=1#two", title: "重复" },
    { ...imageRow, url: "https://unapproved.example/wallpaper.jpg" },
    null,
    ...Array.from({ length: 12 }, (_, index) => ({ ...imageRow, url: `https://img.birdpaper.com.cn/${index}.jpg`, width: "1920", height: -1 })),
  ];
  const result = await new WallpaperApi(bridgeReturning(jsonResponse(response))).search({ ...query, keyword: "星空" });
  assert.equal(result.length, 10);
  assert.deepEqual(result.map(item => item.url), [
    "http://cdn-hsyq-static.shanhutech.cn/a.jpg?crop=1",
    ...Array.from({ length: 9 }, (_, index) => `https://img.birdpaper.com.cn/${index}.jpg`),
  ]);
  assert.equal(result[0].title, "第一张");
  assert.equal(result[0].width, 640);
  assert.equal(result[0].height, 360);
  assert.equal(result[0].keyword, "星空");
  assert.equal(result[0].category, undefined);
  assert.equal(result[1].width, 1920);
  assert.equal(result[1].height, 1080);
  assert.equal(result[1].title, "壁纸 2");
});

test("empty results are distinct from malformed JSON or business errors", async () => {
  assert.deepEqual(await new WallpaperApi(bridgeReturning(jsonResponse([]))).search(query), []);
  for (const response of [
    { status: 200, body: "not json" },
    { status: 200, body: JSON.stringify({ code: 500, message: "failed" }) },
    { status: 200, body: JSON.stringify({ code: "200", data: imageRow }) },
    jsonResponse(null),
    jsonResponse("wrong data"),
    { status: 200, body: {} },
    { status: "200", body: "{}" },
  ]) {
    await assert.rejects(new WallpaperApi(bridgeReturning(response)).search(query), /响应|数据|错误/);
  }
});

test("only official image hosts on HTTP(S) default ports are accepted", async () => {
  const accepted = [
    imageUrl,
    "https://img.birdpaper.com.cn:443/a.jpg",
    "https://www.bing.com/th?id=OHR.Example_1920x1080.jpg",
    "https://cn.bing.com/th?id=OHR.Example_1920x1080.jpg",
  ];
  const rows = await new WallpaperApi(bridgeReturning(jsonResponse(accepted.map(url => ({ ...imageRow, url }))))).search(query);
  assert.equal(rows.length, accepted.length);
  assert.equal(rows[0].url, imageUrl, "do not invent HTTPS support for a source URL");
  for (const row of rows) assert.ok(WALLPAPER_NETWORK_HOSTS.includes(new URL(row.url).hostname));
  assert.deepEqual([...WALLPAPER_NETWORK_HOSTS].sort(), ["wp.upx8.com", "cdn-hsyq-static.shanhutech.cn", "img.birdpaper.com.cn", "www.bing.com", "cn.bing.com"].sort());
});

test("unapproved URLs cannot enter results or be downloaded directly", async () => {
  for (const url of [
    "https://img.birdpaper.com.cn.evil.example/a.jpg",
    "https://evil.example/a.jpg?host=img.birdpaper.com.cn",
    "https://img.birdpaper.com.cn:444/a.jpg",
    "http://img.birdpaper.com.cn:443/a.jpg",
    "https://user:password@img.birdpaper.com.cn/a.jpg",
    "https://@img.birdpaper.com.cn/a.jpg",
    "https://img.birdpaper.com.cn./a.jpg",
    "https://img.birdpaper.com.cn/a\nb.jpg",
    "https://img.birdpaper.com.cn\\a.jpg",
    "https://wp.upx8.com/api.php",
    "http://127.0.0.1/a.jpg",
    "//img.birdpaper.com.cn/a.jpg",
    "ftp://img.birdpaper.com.cn/a.jpg",
    "file:///a.jpg",
    "data:image/png;base64,aGVsbG8=",
    "not a url",
  ]) {
    await assert.rejects(new WallpaperApi(bridgeReturning(jsonResponse({ ...imageRow, url }))).search(query), /地址/, url);
    const bridge = bridgeReturning();
    await assert.rejects(new WallpaperApi(bridge).download({ ...imageRow, url }), /地址/, url);
    assert.equal(bridge.calls.length, 0, "invalid addresses must fail before the bridge is invoked");
  }
});

test("HTTP failures surface without automatic retries", async () => {
  for (const [response, message] of [
    [{ status: 503, body: "service unavailable" }, /暂时|暂不可用|503/],
    [{ status: 404, body: "not found" }, /404/],
    [new Error("connection timeout"), /timeout|超时|网络/],
  ]) {
    const bridge = bridgeReturning(response);
    await assert.rejects(new WallpaperApi(bridge).search(query), message);
    assert.equal(bridge.calls.length, 1);
  }
});

test("429 pauses requests for sixty seconds and then permits an explicit retry", async t => {
  let now = 1_000_000;
  t.mock.method(Date, "now", () => now);
  for (const limited of [
    { status: 429, body: JSON.stringify({ code: 429, message: "too many requests" }) },
    { status: 200, body: JSON.stringify({ code: 429, message: "too many requests" }) },
  ]) {
    const bridge = bridgeReturning(limited, jsonResponse([]));
    const api = new WallpaperApi(bridge);
    await assert.rejects(api.search(query), /频繁|429/);
    await assert.rejects(api.search(query), /频繁|稍后/);
    now += 59_000;
    await assert.rejects(api.search(query), /频繁|稍后/);
    assert.equal(bridge.calls.length, 1);
    now += 1_000;
    assert.deepEqual(await api.search(query), []);
    assert.equal(bridge.calls.length, 2);
  }
});

test("small previews download in a single node process", async () => {
  const jpeg = Buffer.from([255, 216, 255, 224, 0, 16, 128, 255, 217]);
  const bridge = nodeBridgeFor([jpeg]);
  const result = await new WallpaperApi(bridge).download(imageRow);
  assert.deepEqual(result.bytes, new Uint8Array(jpeg));
  assert.equal(result.mime, "image/jpeg");
  assert.equal(bridge.calls.length, 1, "a small preview must never touch the temp-file path");
  assert.equal(bridge.calls[0].args.bin, "node");
});

test("oversized-in-cap downloads fall back to sliced temp-file reads", async () => {
  const body = Buffer.concat([png, Buffer.alloc(90_000 - png.length, 7)]);
  const bridge = nodeBridgeFor([body]);
  const result = await new WallpaperApi(bridge).download(imageRow);
  assert.deepEqual(result.bytes, new Uint8Array(body));
  assert.equal(bridge.calls.filter(call => call.args.args[1].includes("fetch(")).length, 1, "the original is fetched once");
  assert.equal(bridge.calls.filter(call => call.args.args[1].includes("readSync")).length, 2);
  assert.equal(bridge.calls.filter(call => call.args.args[1].includes("rmSync") && !call.args.args[1].includes("readSync")).length, 0);
});

test("custom download hosts are used for the initial URL and every redirect", async () => {
  const bridge = nodeBridgeFor([png]);
  const api = new WallpaperApi(bridge);
  const hosts = ["w.wallhaven.cc", "th.wallhaven.cc"];
  await api.download({ ...imageRow, url: "https://th.wallhaven.cc/small/ab/abc123.jpg" }, hosts);
  assert.match(bridge.calls[0].args.args[1], /redirect:\"manual\"/);
  assert.match(bridge.calls[0].args.args[1], /w\.wallhaven\.cc/);
  assert.match(bridge.calls[0].args.args[1], /th\.wallhaven\.cc/);
  const denied = bridgeReturning();
  await assert.rejects(new WallpaperApi(denied).download({ ...imageRow, url: "https://evil.example/pic.jpg" }, hosts), /地址/);
  assert.equal(denied.calls.length, 0);
});


function nodeBridgeFor(fixtures) {
  let file = null;
  const queue = [...fixtures];
  const calls = [];
  return {
    calls,
    invoke: async (command, args) => {
      calls.push({ command, args });
      assert.equal(command, "plugin_exec_run");
      const script = args.args[1];
      if (script.includes("readSync")) {
        const offset = Number(script.match(/readSync\(f,b,0,b\.length,(\d+)\)/)[1]);
        const count = Math.min(45_000, (file?.length ?? 0) - offset);
        return { code: 0, stdout: (file ?? Buffer.alloc(0)).subarray(offset, offset + count).toString("base64"), stderr: "" };
      }
      if (script.includes("rmSync")) return { code: 0, stdout: "", stderr: "" };
      if (script.includes("fetch(")) {
        const body = queue.shift();
        if (!body) throw new Error("unexpected fetch call");
        if (body.length > 45_000) {
          file = body;
          return { code: 0, stdout: `#big ${body.length}`, stderr: "" };
        }
        return { code: 0, stdout: `${body.length}\n${body.toString("base64")}`, stderr: "" };
      }
      throw new Error("unexpected node script");
    },
  };
}

test("all supported image signatures are accepted and HTML or SVG is rejected", async () => {
  const fixtures = [
    [png, "image/png"],
    [Buffer.from([255, 216, 255, 224, 0, 16, 128, 255, 217]), "image/jpeg"],
    [Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64"), "image/gif"],
    [Buffer.from("UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA", "base64"), "image/webp"],
  ];
  for (const [bytes, mime] of fixtures) {
    const result = await new WallpaperApi(nodeBridgeFor([bytes])).download(imageRow);
    assert.equal(result.mime, mime);
    assert.deepEqual(result.bytes, new Uint8Array(bytes));
  }
  for (const bytes of [Buffer.from("<html>upstream error</html>"), Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')]) {
    await assert.rejects(new WallpaperApi(nodeBridgeFor([bytes])).download(imageRow), /图片|格式/);
  }
});


test("oversized downloads are rejected with the 8 MiB cap message", async () => {
  const bridge = {
    invoke: async (command, args) => {
      if (command === "plugin_exec_run") {
        const script = args.args[1];
        if (script.includes("fetch(")) return { code: 0, stdout: `#big ${8 * 1024 * 1024 + 1}`, stderr: "" };
        return { code: 0, stdout: "", stderr: "" };
      }
      throw new Error("unexpected bridge call");
    },
  };
  await assert.rejects(new WallpaperApi(bridge).download(imageRow), /超过 8 MiB/);
});


test("node failures are surfaced", async () => {
  await assert.rejects(new WallpaperApi(bridgeReturning({ code: 1, stdout: "", stderr: "HTTP 404" })).download(imageRow), /下载失败|404/);
});

test("disposed adapters reject in-flight downloads", async () => {
  const pending = deferred();
  const api = new WallpaperApi({ invoke: () => pending.promise });
  const work = api.download(imageRow);
  api.dispose();
  pending.resolve({ code: 0, stdout: png.toString("base64"), stderr: "" });
  await assert.rejects(work, /关闭|取消|失效|卸载/);
});
