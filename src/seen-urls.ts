import type { PluginContext } from "./ccgui-plugin";

export const SEEN_URLS_KEY = "wallpaper_seen_urls";
export const SEEN_URLS_LIMIT = 500;
const SEEN_URLS_MAX_LENGTH = 2048;

function normalizeSeenUrl(value: unknown): string {
  if (typeof value !== "string" || value.length === 0 || value.length > SEEN_URLS_MAX_LENGTH) {
    throw new Error("壁纸浏览记录无效");
  }
  try {
    const url = new URL(value);
    if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password) {
      throw new Error("invalid URL");
    }
    const authority = url.href.slice(url.protocol.length + 2).split(/[/?#]/, 1)[0];
    if (authority.includes("@")) throw new Error("invalid URL");
    url.hash = "";
    const normalized = url.href;
    if (normalized.length > SEEN_URLS_MAX_LENGTH) throw new Error("invalid URL");
    return normalized;
  } catch {
    throw new Error("壁纸浏览记录无效");
  }
}

function normalizeSavedUrls(saved: unknown): string[] {
  if (!Array.isArray(saved)) throw new Error("已保存的壁纸浏览记录无效，请保留原数据并重试");
  const unique = new Set<string>();
  for (const value of saved) unique.add(normalizeSeenUrl(value));
  return [...unique].slice(-SEEN_URLS_LIMIT);
}

/**
 * Persisted set of wallpaper URLs the user has already seen or saved.
 * Used to filter duplicate results across sessions; capped FIFO eviction.
 */
export class SeenUrlStore {
  private urls: string[] = [];
  private index = new Set<string>();
  private ready: Promise<void> | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private readonly storage: PluginContext["storage"];

  constructor(storage: PluginContext["storage"]) {
    this.storage = storage;
  }

  public init(): Promise<void> {
    if (!this.ready) {
      const loading = this.storage.get<unknown>(SEEN_URLS_KEY).then(saved => {
        const urls = saved === null ? [] : normalizeSavedUrls(saved);
        this.urls = urls;
        this.index = new Set(urls);
      });
      this.ready = loading.catch(error => {
        this.ready = null;
        throw error;
      });
    }
    return this.ready;
  }

  public has(url: string): boolean {
    try {
      return this.index.has(normalizeSeenUrl(url));
    } catch {
      return false;
    }
  }

  public asSet(): ReadonlySet<string> {
    return new Set(this.index);
  }

  public get size(): number {
    return this.urls.length;
  }

  /** Record URLs as seen; persists. Oldest entries are evicted beyond the cap. */
  public async record(...added: readonly string[]): Promise<void> {
    const normalized = added.map(normalizeSeenUrl);
    await this.enqueue(async () => {
      const next = this.urls.slice();
      const nextIndex = new Set(this.index);
      let changed = false;
      for (const url of normalized) {
        if (nextIndex.has(url)) continue;
        nextIndex.add(url);
        next.push(url);
        changed = true;
      }
      if (!changed) return;
      const excess = next.length - SEEN_URLS_LIMIT;
      if (excess > 0) {
        for (let index = 0; index < excess; index++) nextIndex.delete(next[index]);
        next.splice(0, excess);
      }
      await this.storage.set(SEEN_URLS_KEY, next);
      this.urls = next;
      this.index = nextIndex;
    });
  }

  public clear(): Promise<void> {
    return this.enqueue(async () => {
      await this.storage.delete(SEEN_URLS_KEY);
      this.urls = [];
      this.index = new Set();
    });
  }

  private enqueue<Result>(action: () => Promise<Result>): Promise<Result> {
    const next = this.queue.then(async () => {
      await this.init();
      return action();
    });
    this.queue = next.catch(() => undefined);
    return next;
  }
}
