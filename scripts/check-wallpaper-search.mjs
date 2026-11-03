import assert from "node:assert/strict";
import test from "node:test";
import { WallhavenProvider } from "../src/wallhaven-api.ts";
import { Upx8Provider } from "../src/upx8-api.ts";

const flush = () => new Promise(resolve => setImmediate(resolve));
const query = { category: "", keyword: "mountains", resolution: "1920x1080", sort: "random", seed: "abc123" };
const providers = [
  {
    name: "Wallhaven", create: bridge => new WallhavenProvider(bridge), page: 4,
    success: { status: 200, body: JSON.stringify({ data: [], meta: { current_page: 4, last_page: 8, total: 180, seed: "abc123" } }) },
  },
  {
    name: "UPX8", create: bridge => new Upx8Provider(bridge), page: 1,
    success: { status: 200, body: JSON.stringify({ code: 200, data: [] }) },
  },
];

function fixtureBridge(responses) {
  const calls = [];
  return {
    calls,
    invoke: async (command, args) => {
      assert.equal(command, "plugin_http_request");
      calls.push(args);
      const response = responses[Math.min(calls.length - 1, responses.length - 1)];
      if (response instanceof Error || typeof response === "string") throw response;
      return response;
    },
  };
}

for (const provider of providers) {
  test(`${provider.name}: network failure and 503 recover automatically with backoff`, async t => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const bridge = fixtureBridge(["The operation was aborted due to timeout", { status: 503, body: "service unavailable" }, provider.success]);
    const retries = [];
    const work = provider.create(bridge).search(query, provider.page, { onRetry: (...retry) => retries.push(retry) })
      .then(value => ({ value }), error => ({ error }));
    await flush();
    t.mock.timers.tick(999);
    await flush();
    assert.equal(bridge.calls.length, 1, "do not retry immediately");
    t.mock.timers.tick(1);
    await flush();
    t.mock.timers.tick(1999);
    await flush();
    assert.ok(bridge.calls.length <= 2, "the next retry must back off for two seconds");
    t.mock.timers.tick(1);
    await flush();
    const result = await work;
    assert.ifError(result.error);
    assert.deepEqual(result.value.items, []);
    assert.equal(result.value.page, provider.page);
    assert.equal(bridge.calls.length, 3);
    assert.equal(new Set(bridge.calls.map(call => call.url)).size, 1, "retain the same filters, page and random seed");
    assert.deepEqual(retries, [[2, 3, 1000], [3, 3, 2000]]);
  });

  test(`${provider.name}: persistent server failure stops after three attempts`, async t => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const bridge = fixtureBridge([{ status: 502, body: "bad gateway" }]);
    const work = provider.create(bridge).search(query, provider.page).then(() => null, error => error);
    await flush();
    t.mock.timers.tick(1000);
    await flush();
    t.mock.timers.tick(2000);
    await flush();
    assert.match(String(await work), /502/);
    assert.equal(bridge.calls.length, 3);
    t.mock.timers.tick(60_000);
    await flush();
    assert.equal(bridge.calls.length, 3);
  });

  test(`${provider.name}: retryable HTTP statuses recover on the next attempt`, async t => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    for (const status of [408, 500, 502, 504]) {
      const bridge = fixtureBridge([{ status, body: "temporary failure" }, provider.success]);
      const work = provider.create(bridge).search(query, provider.page).then(value => ({ value }), error => ({ error }));
      await flush();
      t.mock.timers.tick(1000);
      await flush();
      const result = await work;
      assert.ifError(result.error);
      assert.equal(result.value.page, provider.page);
      assert.equal(bridge.calls.length, 2);
    }
  });

  test(`${provider.name}: invalid requests, permissions and rate limits do not trigger repeated calls`, async () => {
    for (const status of [400, 401, 403, 404, 429]) {
      const bridge = fixtureBridge([{ status, body: "denied" }]);
      await assert.rejects(provider.create(bridge).search(query, provider.page));
      assert.equal(bridge.calls.length, 1);
    }
  });

  for (const cancel of ["caller", "dispose"]) {
    test(`${provider.name}: ${cancel} cancels a pending retry`, async t => {
      t.mock.timers.enable({ apis: ["setTimeout"] });
      const bridge = fixtureBridge([{ status: 503, body: "unavailable" }, provider.success]);
      const client = provider.create(bridge);
      const controller = new AbortController();
      const work = client.search(query, provider.page, { signal: controller.signal }).then(() => null, error => error);
      await flush();
      if (cancel === "caller") controller.abort();
      else client.dispose();
      t.mock.timers.tick(5000);
      await flush();
      assert.match(String(await work), /关闭|取消|abort/i);
      assert.equal(bridge.calls.length, 1);
    });
  }
}
