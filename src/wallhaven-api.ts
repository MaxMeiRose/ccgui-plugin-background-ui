import type { PluginContext } from "./ccgui-plugin";
import type { OnlineWallpaper, WallpaperQuery } from "./wallpaper-api.ts";
import { isAuthorizedImageUrl } from "./wallpaper-api.ts";
import type { WallpaperOption, WallpaperPage, WallpaperProvider } from "./wallpaper-provider";

const WALLHAVEN_API_URL = "https://wallhaven.cc/api/v1/search";
const PAGE_SIZE = 24;
const WALLHAVEN_CATEGORY_BITS: Record<string, string> = { general: "100", anime: "010", people: "001" };

export const WALLHAVEN_CATEGORIES = [
  { value: "", label: "全部" },
  { value: "general", label: "通用" },
  { value: "anime", label: "动漫" },
  { value: "people", label: "人物" },
] as const;
export const WALLHAVEN_RESOLUTIONS = [
  { value: "any", label: "任意分辨率" },
  { value: "1280x720", label: "1280 × 720" },
  { value: "1366x768", label: "1366 × 768" },
  { value: "1600x900", label: "1600 × 900" },
  { value: "1920x1080", label: "1920 × 1080" },
  { value: "2560x1440", label: "2560 × 1440" },
  { value: "3840x2160", label: "3840 × 2160" },
] as const;
export const WALLHAVEN_SORTS = [
  { value: "date_added", label: "最新" },
  { value: "relevance", label: "相关度" },
  { value: "random", label: "随机" },
  { value: "toplist", label: "热门" },
] as const;

const ORIGINAL_HOSTS = ["w.wallhaven.cc"] as const;
const THUMB_HOSTS = ["th.wallhaven.cc"] as const;
const MIN_SCREEN_WIDTH = 640;
const MIN_SCREEN_HEIGHT = 480;
const MAX_SCREEN_EDGE = 20000;
const RESOLUTION_RE = /^\d{3,5}x\d{3,5}$/;

/**
 * Physical pixels of the current display. Wallhaven filters with `atleast`, so the
 * default search matches the monitor instead of a hardcoded guess.
 */
function screenResolution(): WallpaperOption | null {
  if (typeof window === "undefined") return null;
  const ratio = Number.isFinite(window.devicePixelRatio) && window.devicePixelRatio > 0 ? window.devicePixelRatio : 1;
  const width = Math.round((window.screen?.width ?? 0) * ratio);
  const height = Math.round((window.screen?.height ?? 0) * ratio);
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height)) return null;
  if (width < MIN_SCREEN_WIDTH || height < MIN_SCREEN_HEIGHT || width > MAX_SCREEN_EDGE || height > MAX_SCREEN_EDGE) return null;
  return { value: `${width}x${height}`, label: `屏幕 ${width} × ${height}` };
}

function authorizeWallhavenImage(value: unknown, hosts: readonly string[]): string {
  const url = isAuthorizedImageUrl(value, hosts);
  if (new URL(url).protocol !== "https:") throw new Error("Wallhaven 图片必须使用 HTTPS");
  return url;
}

function positiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 1;
}

function parseWallhaven(data: unknown, query: WallpaperQuery): OnlineWallpaper[] {
  if (!Array.isArray(data)) throw new Error("Wallhaven 响应数据无效");
  const items: OnlineWallpaper[] = [];
  const seen = new Set<string>();
  for (const value of data) {
    const row = value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
    if (!row || row.purity !== "sfw") continue;
    let url: string;
    try { url = authorizeWallhavenImage(row.path, ORIGINAL_HOSTS); } catch { continue; }
    if (seen.has(url)) continue;
    seen.add(url);
    const thumbs = row.thumbs !== null && typeof row.thumbs === "object" && !Array.isArray(row.thumbs) ? row.thumbs as Record<string, unknown> : null;
    let thumbnail: string | undefined;
    for (const candidate of [thumbs?.small, thumbs?.large]) {
      if (candidate === undefined) continue;
      try {
        thumbnail = authorizeWallhavenImage(candidate, THUMB_HOSTS);
        break;
      } catch {
        thumbnail = undefined;
      }
    }
    items.push({
      url,
      title: typeof row.id === "string" && row.id.trim() ? row.id.trim() : `Wallhaven 壁纸 ${items.length + 1}`,
      source: "wallhaven",
      width: positiveInteger(row.dimension_x) ? row.dimension_x : 0,
      height: positiveInteger(row.dimension_y) ? row.dimension_y : 0,
      ...(thumbnail ? { thumbnail } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.keyword ? { keyword: query.keyword } : {}),
    });
    if (items.length === PAGE_SIZE) break;
  }
  return items;
}

export class WallhavenProvider implements WallpaperProvider {
  readonly id = "wallhaven";
  readonly label = "Wallhaven";
  readonly paginated = true;
  readonly categories = WALLHAVEN_CATEGORIES;
  readonly screenOption = screenResolution();
  get resolutions(): readonly WallpaperOption[] {
    return this.screenOption ? [this.screenOption, ...WALLHAVEN_RESOLUTIONS] : WALLHAVEN_RESOLUTIONS;
  }
  readonly sorts = WALLHAVEN_SORTS;
  readonly defaultQuery: WallpaperQuery = { category: "", keyword: "", resolution: this.screenOption?.value ?? "any", sort: "date_added" };
  private readonly bridge: PluginContext["bridge"];
  private disposed = false;

  constructor(bridge: PluginContext["bridge"]) { this.bridge = bridge; }

  private assertActive(): void {
    if (this.disposed) throw new Error("在线图库已关闭，请重新打开后重试");
  }

  private async request(url: string): Promise<string> {
    this.assertActive();
    let response: unknown;
    try {
      response = await this.bridge.invoke<unknown>("plugin_http_request", { method: "GET", url });
    } catch (error) {
      this.assertActive();
      throw error;
    }
    this.assertActive();
    const result = response !== null && typeof response === "object" && !Array.isArray(response) ? response as Record<string, unknown> : null;
    if (!result || typeof result.status !== "number" || !Number.isInteger(result.status)) throw new Error("Wallhaven 响应格式无效");
    const body = typeof result.body === "string" ? result.body : "";
    if (result.status === 429) throw new Error("Wallhaven 请求过于频繁（每分钟 45 次），请稍后再试");
    if (result.status !== 200) throw new Error(`Wallhaven 请求失败（HTTP ${result.status}）：${body.slice(0, 120)}`);
    if (typeof result.body !== "string") throw new Error("Wallhaven 响应格式无效");
    return result.body;
  }

  async search(query: WallpaperQuery, page: number): Promise<WallpaperPage> {
    this.assertActive();
    if (!positiveInteger(page)) throw new Error("Wallhaven 页码无效");
    const category = WALLHAVEN_CATEGORIES.some(item => item.value === query.category) ? query.category : "";
    const keyword = typeof query.keyword === "string" ? query.keyword : "";
    const requestedResolution = typeof query.resolution === "string" ? query.resolution : "";
    const resolution = requestedResolution === "any" || RESOLUTION_RE.test(requestedResolution) ? requestedResolution : "any";
    const requestedSort = WALLHAVEN_SORTS.some(item => item.value === query.sort) ? query.sort! : "date_added";
    // Relevance without a keyword returns an empty first page, so fall back to newest.
    const sort = requestedSort === "relevance" && !keyword ? "date_added" : requestedSort;
    const categories = category ? WALLHAVEN_CATEGORY_BITS[category] : "111";
    const url = new URL(WALLHAVEN_API_URL);
    url.searchParams.set("categories", categories);
    url.searchParams.set("purity", "100");
    if (keyword) url.searchParams.set("q", keyword);
    if (resolution !== "any") url.searchParams.set("atleast", resolution);
    url.searchParams.set("sorting", sort);
    if (sort === "toplist") url.searchParams.set("topRange", "1M");
    url.searchParams.set("page", String(page));
    if (sort === "random" && typeof query.seed === "string" && /^[a-zA-Z0-9]{6}$/.test(query.seed)) url.searchParams.set("seed", query.seed);
    const body = await this.request(url.href);
    this.assertActive();
    let payload: unknown;
    try { payload = JSON.parse(body); } catch { throw new Error("Wallhaven 响应不是有效 JSON"); }
    const root = payload !== null && typeof payload === "object" && !Array.isArray(payload) ? payload as Record<string, unknown> : null;
    const meta = root?.meta !== null && typeof root?.meta === "object" && !Array.isArray(root?.meta) ? root.meta as Record<string, unknown> : null;
    if (!root || !meta || !positiveInteger(meta.current_page) || !positiveInteger(meta.last_page) ||
      typeof meta.total !== "number" || !Number.isSafeInteger(meta.total) || meta.total < 0 ||
      !Array.isArray(root.data) || root.data.length > PAGE_SIZE) throw new Error("Wallhaven 响应元数据无效");
    const seed = typeof meta.seed === "string" && /^[a-zA-Z0-9]{6}$/.test(meta.seed) ? meta.seed : undefined;
    return {
      items: parseWallhaven(root.data, { ...query, category, keyword }),
      page: meta.current_page,
      totalPages: meta.last_page,
      totalItems: meta.total,
      ...(seed && sort === "random" ? { seed } : {}),
    };
  }

  dispose(): void { this.disposed = true; }
}
