import type { PluginContext } from "./ccgui-plugin";
import { isBackgroundImage, MAX_BACKGROUND_BYTES } from "./background-import-core.ts";

export const MAX_BACKGROUND_HISTORY_ITEMS = 20;
export const MAX_BACKGROUND_HISTORY_BYTES = 120 * 1024 * 1024;
export const BACKGROUND_HISTORY_KEY = "background_history";

export interface BackgroundImageSource {
  provider: "wallpaper-api-v2" | "wallhaven";
  url: string;
  source?: string;
  category?: string;
  keyword?: string;
}

export interface BackgroundHistoryItem {
  id: string;
  name: string;
  thumbnail: string;
  size: number;
  createdAt: number;
  source?: BackgroundImageSource;
}

type HistoryListener = (items: BackgroundHistoryItem[]) => void;

export function backgroundHistoryImageKey(id: string): string {
  if (!/^[a-f0-9]{64}$/.test(id)) throw new Error("壁纸记录无效");
  return `background_history_image_${id}`;
}

export function backgroundImageBytes(image: string): number {
  const content = image.slice(image.indexOf(",") + 1);
  let padding = 0;
  if (content.endsWith("==")) padding = 2;
  else if (content.endsWith("=")) padding = 1;
  return content.length * 3 / 4 - padding;
}

function isHistoryItem(value: unknown): value is BackgroundHistoryItem {
  if (!value || typeof value !== "object") return false;
  const item = value as BackgroundHistoryItem;
  return typeof item.id === "string" && /^[a-f0-9]{64}$/.test(item.id) &&
    typeof item.name === "string" && item.name.length <= 200 &&
    typeof item.thumbnail === "string" && item.thumbnail.length <= 100_000 &&
    (!item.thumbnail || isBackgroundImage(item.thumbnail)) &&
    Number.isInteger(item.size) && item.size > 0 && item.size <= MAX_BACKGROUND_BYTES &&
    Number.isFinite(item.createdAt) && item.createdAt > 0 &&
    (item.source === undefined || isImageSource(item.source));
}

function isImageSource(value: unknown): value is BackgroundImageSource {
  if (!value || typeof value !== "object") return false;
  const source = value as BackgroundImageSource;
  if (!["wallpaper-api-v2", "wallhaven"].includes(source.provider) || typeof source.url !== "string" || source.url.length > 2048 ||
      ![source.source, source.category, source.keyword].every(field => field === undefined || typeof field === "string" && field.length <= 300)) return false;
  try {
    const url = new URL(source.url);
    return (url.protocol === "https:" || url.protocol === "http:") && !url.username && !url.password;
  } catch { return false; }
}

function copyHistoryItem(item: BackgroundHistoryItem): BackgroundHistoryItem {
  return { ...item, ...(item.source ? { source: { ...item.source } } : {}) };
}

export class BackgroundHistory {
  private items: BackgroundHistoryItem[] = [];
  private listeners = new Set<HistoryListener>();
  private ready: Promise<void> | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private storage: PluginContext["storage"];
  private createThumbnail: (image: string) => Promise<string>;

  constructor(
    storage: PluginContext["storage"],
    createThumbnail: (image: string) => Promise<string> = async () => "",
  ) {
    this.storage = storage;
    this.createThumbnail = createThumbnail;
  }

  public init(): Promise<void> {
    if (!this.ready) {
      this.ready = this.storage.get<unknown>(BACKGROUND_HISTORY_KEY).then(saved => {
        if (saved === null) return;
        const history = saved as { version?: unknown; items?: unknown };
        if (!history || history.version !== 1 || !Array.isArray(history.items) ||
            !history.items.every(isHistoryItem) || history.items.length > MAX_BACKGROUND_HISTORY_ITEMS ||
            new Set(history.items.map(item => item.id)).size !== history.items.length ||
            history.items.reduce((sum, item) => sum + item.size, 0) > MAX_BACKGROUND_HISTORY_BYTES) {
          throw new Error("已保存的壁纸历史无效，请保留原数据并重试");
        }
        this.items = history.items.map(copyHistoryItem);
        this.notify();
      }).catch(error => { this.ready = null; throw error; });
    }
    return this.ready;
  }

  public getItems(): BackgroundHistoryItem[] {
    return this.items.map(copyHistoryItem);
  }

  public subscribe(listener: HistoryListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public remember(image: string, name: string, source?: BackgroundImageSource): Promise<BackgroundHistoryItem> {
    return this.enqueue(async () => {
      if (!isBackgroundImage(image)) throw new Error("壁纸图片无效");
      if (source !== undefined && !isImageSource(source)) throw new Error("壁纸来源信息无效");
      const size = backgroundImageBytes(image);
      if (!Number.isInteger(size) || size <= 0 || size > MAX_BACKGROUND_BYTES) throw new Error("图片不能超过 12 MB");
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(image));
      const id = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
      const existing = this.items.find(item => item.id === id);
      if (!existing && (this.items.length >= MAX_BACKGROUND_HISTORY_ITEMS ||
          this.items.reduce((sum, item) => sum + item.size, 0) + size > MAX_BACKGROUND_HISTORY_BYTES)) {
        throw new Error("壁纸历史已满（最多 20 张、原图合计 120 MB），请先删除不需要的记录");
      }
      let thumbnail = existing?.thumbnail || await this.createThumbnail(image).catch(() => "");
      if (thumbnail.length > 100_000 || (thumbnail && !isBackgroundImage(thumbnail))) thumbnail = "";
      const item: BackgroundHistoryItem = {
        id, name: (name || "未命名壁纸").slice(0, 200), thumbnail, size,
        createdAt: existing?.createdAt ?? Date.now(),
      };
      const provenance = source ?? existing?.source;
      if (provenance) item.source = { ...provenance };
      const next = [item, ...this.items.filter(entry => entry.id !== id)];
      const key = backgroundHistoryImageKey(id);
      await this.storage.set(key, image);
      try {
        await this.storage.set(BACKGROUND_HISTORY_KEY, { version: 1, items: next });
      } catch (error) {
        if (!existing) await this.storage.delete(key).catch(() => undefined);
        throw error;
      }
      this.items = next;
      this.notify();
      return copyHistoryItem(item);
    });
  }

  public read(id: string): Promise<{ item: BackgroundHistoryItem; image: string }> {
    return this.enqueue(async () => {
      const item = this.items.find(entry => entry.id === id);
      if (!item) throw new Error("这张壁纸已经从历史中删除");
      const image = await this.storage.get<string>(backgroundHistoryImageKey(id));
      if (!isBackgroundImage(image)) throw new Error("壁纸原图缺失或损坏，请重新导入这张图片");
      return { item: copyHistoryItem(item), image };
    });
  }

  public remove(id: string): Promise<void> {
    return this.enqueue(async () => {
      if (!this.items.some(item => item.id === id)) throw new Error("这张壁纸已经从历史中删除");
      const next = this.items.filter(item => item.id !== id);
      await this.storage.set(BACKGROUND_HISTORY_KEY, { version: 1, items: next });
      try {
        await this.storage.delete(backgroundHistoryImageKey(id));
      } catch (error) {
        await this.storage.set(BACKGROUND_HISTORY_KEY, { version: 1, items: this.items });
        throw error;
      }
      this.items = next;
      this.notify();
    });
  }

  public dispose(): void {
    this.listeners.clear();
  }

  private enqueue<Result>(action: () => Promise<Result>): Promise<Result> {
    const next = this.queue.then(async () => { await this.init(); return action(); });
    this.queue = next.catch(() => undefined);
    return next;
  }

  private notify(): void {
    this.listeners.forEach(listener => listener(this.getItems()));
  }
}
