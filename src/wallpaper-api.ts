import type { PluginContext } from "./ccgui-plugin";
import { detectBackgroundMime } from "./background-import-core.ts";

export type WallpaperQuery = { category: string; keyword: string; resolution: string; sort?: string; seed?: string };
export type OnlineWallpaper = {
  url: string;
  title: string;
  source: string;
  width: number;
  height: number;
  category?: string;
  keyword?: string;
  thumbnail?: string;
};

export const WALLPAPER_API_URL = "https://wp.upx8.com/api.php";
export const WALLPAPER_CATEGORIES: readonly { value: string; label: string }[] = [
  { value: "", label: "全部" },
  { value: "nature", label: "风景" },
  { value: "anime", label: "动漫" },
  { value: "game", label: "游戏" },
  { value: "animal", label: "动物" },
  { value: "city", label: "城市" },
  { value: "abstract", label: "抽象" },
  { value: "space", label: "宇宙" },
  { value: "car", label: "汽车" },
  { value: "girl", label: "美女" },
  { value: "sport", label: "运动" },
];
export const WALLPAPER_RESOLUTIONS: readonly { value: string; label: string }[] = [
  { value: "1280x720", label: "1280 × 720" },
  { value: "1366x768", label: "1366 × 768" },
  { value: "1600x900", label: "1600 × 900" },
  { value: "1920x1080", label: "1920 × 1080" },
  { value: "2560x1440", label: "2560 × 1440" },
  { value: "3840x2160", label: "3840 × 2160" },
];

const IMAGE_HOSTS: readonly string[] = [
  "cdn-hsyq-static.shanhutech.cn",
  "img.birdpaper.com.cn",
  "www.bing.com",
  "cn.bing.com",
];
export const WALLPAPER_NETWORK_HOSTS: readonly string[] = ["wp.upx8.com", ...IMAGE_HOSTS];

const MAX_DOWNLOAD_BYTES = 8 * 1024 * 1024;
const MAX_BASE64_LENGTH = Math.ceil(MAX_DOWNLOAD_BYTES / 3) * 4;
const BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const NODE_SLICE_BYTES = 45_000; // multiple of 3 keeps base64 slices alignable; output stays under the 64 KiB exec cap
const INLINE_TOO_BIG = "#big"; // a body above the inline limit is re-read through the temp-file path
export type DownloadedImage = { bytes: Uint8Array; mime: "image/png" | "image/jpeg" | "image/gif" | "image/webp"; url: string };
type HttpResponse = Record<string, unknown> & { status: number; body: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function trimText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeWallpaperQuery(
  query: WallpaperQuery,
  categories: readonly { value: string }[] = WALLPAPER_CATEGORIES,
  resolutions: readonly { value: string }[] = WALLPAPER_RESOLUTIONS,
): WallpaperQuery {
  const keyword = Array.from(trimText(query.keyword)).slice(0, 100).join("").trim();
  const category = trimText(query.category);
  const resolution = trimText(query.resolution);
  return {
    category: !keyword && categories.some(item => item.value === category) ? category : "",
    keyword,
    resolution: resolutions.some(item => item.value === resolution) ? resolution : "1920x1080",
    ...(typeof query.sort === "string" ? { sort: query.sort } : {}),
    ...(typeof query.seed === "string" ? { seed: query.seed } : {}),
  };

}

export function buildWallpaperUrl(query: WallpaperQuery): string {
  const normalized = normalizeWallpaperQuery(query);
  const url = new URL(WALLPAPER_API_URL);
  url.searchParams.set("format", "json");
  url.searchParams.set("count", "10");
  if (normalized.keyword) url.searchParams.set("content", normalized.keyword);
  else if (normalized.category) url.searchParams.set("category", normalized.category);
  url.searchParams.set("resolution", normalized.resolution);
  return url.href;
}

export function isAuthorizedImageUrl(value: unknown, hosts: readonly string[] = IMAGE_HOSTS): string {
  const text = trimText(value);
  const invalid = () => new Error("壁纸图片地址无效或不在授权来源中");
  // Reject URL parser repairs that could conceal credentials or a different authority.
  if (!/^https?:\/\//i.test(text) || /[\u0000-\u0020\u007f\\]/.test(text)) throw invalid();
  const authority = text.slice(text.indexOf("://") + 3).split(/[/?#]/, 1)[0];
  if (authority.includes("@")) throw invalid();
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    throw invalid();
  }
  if (!hosts.includes(url.hostname) || url.port || url.username || url.password) throw invalid();
  // Fragments do not reach the server; default ports and host casing are normalized by URL.
  url.hash = "";
  return url.href;
}
function normalizeImageUrl(value: unknown): string {
  return isAuthorizedImageUrl(value, IMAGE_HOSTS);
}

function dimension(value: unknown): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : 0;
}

function parseWallpapers(data: unknown, query: WallpaperQuery): OnlineWallpaper[] {
  if (!Array.isArray(data) && !isRecord(data)) throw new Error("壁纸服务响应数据无效，请稍后重试");
  const rows = Array.isArray(data) ? data : [data];
  const items: OnlineWallpaper[] = [];
  const seen = new Set<string>();
  const categoryLabel = query.category ? WALLPAPER_CATEGORIES.find(item => item.value === query.category)?.label || "" : "";
  for (const row of rows) {
    if (!isRecord(row)) continue;
    let url: string;
    try {
      url = normalizeImageUrl(row.url);
    } catch {
      continue;
    }
    if (seen.has(url)) continue;
    seen.add(url);
    const requested = (() => { const match = /^(\d+)x(\d+)$/.exec(query.resolution || ""); return match ? { width: Number(match[1]), height: Number(match[2]) } : null; })();
    items.push({
      url,
      title: trimText(row.title) || `${categoryLabel}壁纸 ${items.length + 1}`,
      source: trimText(row.source) || "unknown",
      width: dimension(row.width) || (requested?.width ?? 0),
      height: dimension(row.height) || (requested?.height ?? 0),
      ...(query.category ? { category: query.category } : {}),
      ...(query.keyword ? { keyword: query.keyword } : {}),
    });
    if (items.length === 10) break;
  }
  if (rows.length && !items.length) throw new Error("壁纸服务未返回有效且已授权的图片地址，请稍后重试");
  return items;
}

function decodeImageBody(body: string): Uint8Array {
  const compact = body.replace(/\s+/g, "");
  const invalid = () => new Error("壁纸 Base64 数据无效，请重新下载");
  if (!compact || compact.length % 4 !== 0 || compact.length > MAX_BASE64_LENGTH || !/^[A-Za-z0-9+/]*={0,2}$/.test(compact)) throw invalid();
  let padding = 0;
  if (compact.endsWith("==")) padding = 2;
  else if (compact.endsWith("=")) padding = 1;
  const decodedLength = compact.length / 4 * 3 - padding;
  if (decodedLength <= 0 || decodedLength > MAX_DOWNLOAD_BYTES) throw new Error("壁纸原图超过 8 MiB 下载上限，请选择其他图片");
  const finalSextet = BASE64_ALPHABET.indexOf(compact[compact.length - padding - 1]);
  if ((padding === 2 && (finalSextet & 15) !== 0) || (padding === 1 && (finalSextet & 3) !== 0)) throw invalid();
  let binary: string;
  try { binary = atob(compact); } catch { throw invalid(); }
  if (binary.length !== decodedLength) throw invalid();
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export class WallpaperApi {
  private readonly bridge: PluginContext["bridge"];
  private disposed = false;
  private cooldownUntil = 0;

  constructor(bridge: PluginContext["bridge"]) {
    this.bridge = bridge;
  }

  private assertActive(): void {
    if (this.disposed) throw new Error("在线图库已关闭，请重新打开后重试");
  }

  private checkStatus(status: number, body?: string): void {
    const detail = trimText(body).replace(/\s+/g, " ").slice(0, 160);
    const suffix = detail ? `：${detail}` : "";
    if (status === 429) {
      this.cooldownUntil = Date.now() + 60_000;
      throw new Error(`壁纸请求过于频繁，请在 60 秒后重试${suffix}`);
    }
    if (status === 503) throw new Error(`壁纸服务暂时不可用（503），请稍后重试${suffix}`);
    if (status < 200 || status >= 300) throw new Error(`壁纸请求失败（HTTP ${status}）${suffix}`);
  }

  private async request(args: Record<string, unknown>, allowRetry = false): Promise<HttpResponse> {
    this.assertActive();
    const remaining = Math.ceil((this.cooldownUntil - Date.now()) / 1000);
    if (remaining > 0) throw new Error(`壁纸请求过于频繁，请在 ${remaining} 秒后重试`);
    let response: unknown;
    try {
      response = await this.bridge.invoke<unknown>("plugin_http_request", args);
    } catch (error) {
      this.assertActive();
      let detail = "请稍后重试";
      if (error instanceof Error) detail = error.message;
      else if (typeof error === "string") detail = error;
      throw new Error(`壁纸网络请求失败：${detail}`);
    }
    this.assertActive();
    if (!isRecord(response) || typeof response.status !== "number" || !Number.isInteger(response.status) ||
      response.status < 100 || response.status > 599) throw new Error("壁纸服务响应格式无效，请稍后重试");
    if (response.status === 500 && allowRetry) return this.request(args, false);
    const body = typeof response.body === "string" ? response.body : "";
    this.checkStatus(response.status, body);
    if (typeof response.body !== "string") throw new Error("壁纸服务响应数据无效，请稍后重试");
    return response as HttpResponse;
  }

  async search(query: WallpaperQuery): Promise<OnlineWallpaper[]> {
    this.assertActive();
    const normalized = normalizeWallpaperQuery(query);
    const response = await this.request({ method: "GET", url: buildWallpaperUrl(normalized) }, true);
    this.assertActive();
    let payload: unknown;
    try {
      payload = JSON.parse(response.body);
    } catch {
      throw new Error("壁纸服务响应不是有效 JSON，请稍后重试");
    }
    if (!isRecord(payload)) throw new Error("壁纸服务响应格式无效，请稍后重试");
    if (payload.code === 429 || payload.code === 503) this.checkStatus(payload.code);
    if (payload.code !== 200) throw new Error("壁纸服务返回错误响应，请稍后重试");
    return parseWallpapers(payload.data, normalized);
  }

  /** Fetch once: inline small bodies, stream large ones through a temporary file. */
  async download(item: OnlineWallpaper, hosts: readonly string[] = IMAGE_HOSTS): Promise<DownloadedImage> {
    this.assertActive();
    const url = isAuthorizedImageUrl(item.url, hosts);
    const token = `ccgui-wallpaper-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    const prelude = `const fs=require("node:fs"),p=require("node:path").join(require("node:os").tmpdir(),${JSON.stringify(token)});`;
    const result = await this.downloadInline(url, hosts, prelude);
    return result.image ?? this.downloadViaNode(url, result.size, prelude);
  }

  private async execNode(script: string): Promise<string> {
    this.assertActive();
    const { promise: timeout, reject } = Promise.withResolvers<never>();
    const timer = setTimeout(() => reject(new Error("壁纸读取超时，请重试")), 30_000);
    try {
      const response = await Promise.race([
        this.bridge.invoke<{ code?: number; stdout?: string; stderr?: string }>(
          "plugin_exec_run", { bin: "node", args: ["-e", script], timeoutMs: 30_000 }),
        timeout,
      ]);
      this.assertActive();
      if (response.code !== 0) throw new Error(`壁纸下载失败：${trimText(response.stderr) || "Node 未返回图片"}`);
      return trimText(response.stdout);
    } finally {
      clearTimeout(timer);
    }
  }

  private scriptPrelude(hosts: readonly string[]): string {
    return `const allowed=${JSON.stringify(hosts)};const authorize=value=>{let u;try{u=new URL(value)}catch{throw new Error("壁纸图片地址无效或不在授权来源中")}if(!["https:","http:"].includes(u.protocol)||!allowed.includes(u.hostname)||u.port||u.username||u.password)throw new Error("壁纸图片地址无效或不在授权来源中");return u};`;
  }

  private fetchOpening(url: string): string {
    return `(async()=>{const signal=AbortSignal.timeout(25000);let url=${JSON.stringify(url)};let r;for(let i=0;i<=10;i++){const current=authorize(url);r=await fetch(current.href,{redirect:"manual",signal});if(![301,302,303,307,308].includes(r.status))break;const location=r.headers.get("location");if(!location)throw new Error("图片重定向地址无效");const next=new URL(location,current);authorize(next.href);await r.body?.cancel();url=next.href;if(i===10)throw new Error("图片重定向次数过多")}if(!r.ok)throw new Error("HTTP "+r.status);`;
  }

  private finishDownload(bytes: Uint8Array, size: number, url: string): DownloadedImage {
    if (bytes.byteLength !== size) throw new Error("图片下载不完整，请重试");
    const mime = detectBackgroundMime(bytes);
    if (!mime) throw new Error("下载内容不是受支持的 PNG、JPEG、GIF 或 WebP 图片");
    return { bytes, mime, url };
  }

  /** Small bodies return inline; large ones are written during the same fetch. */
  private async downloadInline(url: string, hosts: readonly string[], prelude: string): Promise<{ image: DownloadedImage; size: number } | { image: null; size: number }> {
    const script = `${prelude}${this.scriptPrelude(hosts)}${this.fetchOpening(url)}const declared=Number(r.headers.get("content-length"));if(Number.isFinite(declared)&&declared>${MAX_DOWNLOAD_BYTES})throw new Error("壁纸原图超过 8 MiB 下载上限");const parts=[];let size=0;for await(const part of r.body){size+=part.length;if(size>${MAX_DOWNLOAD_BYTES})throw new Error("壁纸原图超过 8 MiB 下载上限");parts.push(part)}const buf=Buffer.concat(parts,size);if(size>${NODE_SLICE_BYTES}){fs.writeFileSync(p,buf,{flag:"wx"});process.stdout.write("${INLINE_TOO_BIG} "+size);return}process.stdout.write(size+"\\n"+buf.toString("base64"))})().catch(e=>{console.error(String(e&&e.message||e));process.exitCode=1})`;
    const output = await this.execNode(script);
    if (output.startsWith(INLINE_TOO_BIG)) {
      const size = Number(output.slice(INLINE_TOO_BIG.length).trim());
      if (size > MAX_DOWNLOAD_BYTES) throw new Error("壁纸原图超过 8 MiB 下载上限");
      if (!Number.isSafeInteger(size) || size <= NODE_SLICE_BYTES) throw new Error("壁纸下载失败：未取得图片大小，请重试");
      return { image: null, size };
    }
    const separator = output.indexOf("\n");
    const size = separator > 0 ? Number(output.slice(0, separator)) : Number.NaN;
    if (!Number.isSafeInteger(size) || size <= 0 || size > NODE_SLICE_BYTES) throw new Error("壁纸下载失败：未取得图片大小，请重试");
    return { image: this.finishDownload(decodeImageBody(output.slice(separator + 1)), size, url), size };
  }

  private async downloadViaNode(url: string, size: number, prelude: string): Promise<DownloadedImage> {
    const chunks: string[] = [];
    let cleaned = false;
    try {
      for (let offset = 0; offset < size; offset += NODE_SLICE_BYTES) {
        this.assertActive();
        const count = Math.min(NODE_SLICE_BYTES, size - offset);
        const last = offset + count >= size;
        // The last slice deletes the temp file, so a complete download needs no cleanup process.
        const readScript = `${prelude}const f=fs.openSync(p,"r");try{const b=Buffer.alloc(${count});if(fs.readSync(f,b,0,b.length,${offset})!==b.length)throw new Error("图片分片不完整");process.stdout.write(b.toString("base64"))}finally{fs.closeSync(f)}${last ? "fs.rmSync(p,{force:true})" : ""}`;
        const chunk = await this.execNode(readScript);
        if (chunk.length !== Math.ceil(count / 3) * 4) throw new Error("图片分片不完整，请重新下载");
        chunks.push(chunk);
        if (last) cleaned = true;
      }
      return this.finishDownload(decodeImageBody(chunks.join("")), size, url);
    } finally {
      // Cleanup must still run after disposal or a failed read.
      if (!cleaned) await this.bridge.invoke("plugin_exec_run", { bin: "node", args: ["-e", `${prelude}fs.rmSync(p,{force:true})`], timeoutMs: 5_000 }).catch(() => undefined);
    }
  }

  dispose(): void {
    this.disposed = true;
  }
}
