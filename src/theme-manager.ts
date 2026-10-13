import type { PluginContext } from "./ccgui-plugin";
import { paletteCss, THEME_PALETTES } from "./theme-palette";
import { toolTimelineCss } from "./tool-timeline-theme";
import { customThemeColor, paletteFromColor, isBackgroundImage, createBackgroundThumbnail, readBackgroundBytes } from "./theme-customization";
import { shouldSuppressBackgroundMotion } from "./background-import-core";
import { BackgroundHistory, type BackgroundHistoryItem, type BackgroundImageSource } from "./background-history";
import { WallpaperApi } from "./wallpaper-api";
import type { OnlineWallpaper, WallpaperQuery } from "./wallpaper-api";
import { Upx8Provider } from "./upx8-api";
import { WallhavenProvider } from "./wallhaven-api";
import type { WallpaperPage, WallpaperProvider, WallpaperProviderId } from "./wallpaper-provider";
import { SeenUrlStore } from "./seen-urls";

export interface GuiThemeConfig {
  /** 主题预设 */
  preset: "default" | keyof typeof THEME_PALETTES;
  paletteMode: "preset" | "custom";
  customAccent?: string;
  backgroundImage?: string;
  backgroundName?: string;
  backgroundId?: string;
  backgroundEnabled: boolean;
  backgroundFit: "cover" | "contain";
  backgroundDim: number;
  enableBackdropPolish: boolean;
  backdropOpacity: number;
  backdropBlur: number;
  enableTimelinePolish: boolean;
  /** 会话页签精修（当前会话纯净卡片高亮浮起） */
  enableTabPolish: boolean;
  /** 全局聚焦光晕 */
  enableComposerGlow: boolean;
  /** 启用极简胶囊滚动条 */
  enableSleekScrollbars: boolean;
  /** 启用代码块与卡片圆角加固 */
  enableCardPolish: boolean;
  /** 启用更精致的平滑字体渲染 */
  enableFontSmoothing: boolean;
}
export interface OnlineGallerySnapshot {
  items: OnlineWallpaper[];
  query: WallpaperQuery | null;
  provider: WallpaperProviderId;
  page: number;
  totalPages: number | null;
  totalItems: number | null;
  hiddenCount: number;
  hideSeen: boolean;
}

type GalleryCachedPage = { result: WallpaperPage; hidden: Set<string> };


export const DEFAULT_THEME_CONFIG: GuiThemeConfig = {
  preset: "acrylic",
  paletteMode: "preset",
  backgroundEnabled: false,
  backgroundFit: "cover",
  backgroundDim: 65,
  enableBackdropPolish: true,
  backdropOpacity: 45,
  backdropBlur: 6,
  enableTimelinePolish: true,
  enableTabPolish: true,
  enableComposerGlow: true,
  enableSleekScrollbars: true,
  enableCardPolish: true,
  enableFontSmoothing: true,
};

/** Keep persisted settings limited to fields used by this plugin version. */
function normalizeThemeConfig(config?: Partial<GuiThemeConfig> | null): GuiThemeConfig {
  const normalized: GuiThemeConfig = {
    preset: config?.preset ?? DEFAULT_THEME_CONFIG.preset,
    paletteMode: config?.paletteMode ?? DEFAULT_THEME_CONFIG.paletteMode,
    backgroundEnabled: config?.backgroundEnabled ?? DEFAULT_THEME_CONFIG.backgroundEnabled,
    backgroundFit: config?.backgroundFit ?? DEFAULT_THEME_CONFIG.backgroundFit,
    backgroundDim: config?.backgroundDim ?? DEFAULT_THEME_CONFIG.backgroundDim,
    enableBackdropPolish: config?.enableBackdropPolish ?? DEFAULT_THEME_CONFIG.enableBackdropPolish,
    backdropOpacity: config?.backdropOpacity ?? DEFAULT_THEME_CONFIG.backdropOpacity,
    backdropBlur: config?.backdropBlur ?? DEFAULT_THEME_CONFIG.backdropBlur,
    enableTimelinePolish: config?.enableTimelinePolish ?? DEFAULT_THEME_CONFIG.enableTimelinePolish,
    enableTabPolish: config?.enableTabPolish ?? DEFAULT_THEME_CONFIG.enableTabPolish,
    enableComposerGlow: config?.enableComposerGlow ?? DEFAULT_THEME_CONFIG.enableComposerGlow,
    enableSleekScrollbars: config?.enableSleekScrollbars ?? DEFAULT_THEME_CONFIG.enableSleekScrollbars,
    enableCardPolish: config?.enableCardPolish ?? DEFAULT_THEME_CONFIG.enableCardPolish,
    enableFontSmoothing: config?.enableFontSmoothing ?? DEFAULT_THEME_CONFIG.enableFontSmoothing,
  };

  if (typeof config?.customAccent === "string") normalized.customAccent = config.customAccent;
  if (typeof config?.backgroundImage === "string") normalized.backgroundImage = config.backgroundImage;
  if (typeof config?.backgroundName === "string") normalized.backgroundName = config.backgroundName;
  if (typeof config?.backgroundId === "string" && /^[a-f0-9]{64}$/.test(config.backgroundId)) normalized.backgroundId = config.backgroundId;

  return normalized;
}

export interface ThemePresetOption {
  id: GuiThemeConfig["preset"];
  name: string;
  accent: string;
}

export const THEME_PRESETS: ThemePresetOption[] = [
  {
    id: "default",
    name: "原生极简 (Classic)",
    accent: "#3b82f6",
  },
  {
    id: "acrylic",
    name: "深空雅致 (Deep Slate)",
    accent: "#6366f1",
  },
  {
    id: "cyberpunk",
    name: "赛博霓虹 (Cyberpunk)",
    accent: "#ec4899",
  },
  {
    id: "nordic",
    name: "北欧极夜 (Nordic Slate)",
    accent: "#38bdf8",
  },
  {
    id: "sakura",
    name: "落樱浅绛 (Sakura Mist)",
    accent: "#f43f5e",
  },
  {
    id: "emerald",
    name: "翡翠森林 (Emerald Forest)",
    accent: "#10b981",
  },
  { id: "graphite", name: "石墨 (Graphite)", accent: "#42515e" },
  { id: "ocean", name: "潮汐 (Ocean)", accent: "#086c77" },
  { id: "cobalt", name: "钴蓝 (Cobalt)", accent: "#2858b9" },
  { id: "plum", name: "梅影 (Plum)", accent: "#854273" },
  { id: "terminal", name: "青柠终端 (Terminal)", accent: "#3a672d" },
  { id: "vermilion", name: "朱砂 (Vermilion)", accent: "#b03838" },
];

export function generateThemeCss(config: GuiThemeConfig): string {
  const parts: string[] = [];
  const palette = config.paletteMode === "custom"
    ? paletteFromColor(customThemeColor(config.customAccent, config.preset))
    : config.preset === "default" ? undefined : THEME_PALETTES[config.preset];
  if (palette)
    parts.push(
      paletteCss(palette.light, false),
      paletteCss(palette.dark, true),
    );
  if (palette) parts.push(`
    :root.dark, .dark {
      --ms-caret: color-mix(in srgb, var(--color-text-primary, #f3f4f6) 86%, var(--color-accent-400, #ffffff));
      --ms-selection: color-mix(in srgb, var(--color-accent-400, #ffffff) 30%, transparent);
    }
    :root:not(.dark) {
      --ms-caret: color-mix(in srgb, var(--color-text-primary, #111827) 86%, var(--color-accent-500, #000000));
      --ms-selection: color-mix(in srgb, var(--color-accent-500, #000000) 20%, transparent);
    }
    :where(input:not([type="range"]):not([type="color"]), textarea, [contenteditable="true"]) { caret-color: var(--ms-caret) !important; }
    :where(input, textarea, [contenteditable="true"])::selection { background: var(--ms-selection); color: var(--color-text-primary, currentColor); }
  `);
  if (config.enableBackdropPolish) {
    const opacity = Number.isFinite(config.backdropOpacity) ? Math.min(80, Math.max(20, config.backdropOpacity)) : 45;
    const blur = Number.isFinite(config.backdropBlur) ? Math.min(16, Math.max(0, config.backdropBlur)) : 6;
    parts.push(`
      :root { --color-overlay-backdrop: color-mix(in srgb, var(--ms-backdrop-ink, #18202a) ${opacity}%, transparent); }
      .bg-overlay-backdrop { background-color: var(--color-overlay-backdrop); }
      @supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
        .bg-overlay-backdrop { backdrop-filter: blur(${blur}px); -webkit-backdrop-filter: blur(${blur}px); }
      }
      @media (prefers-reduced-transparency: reduce) {
        .bg-overlay-backdrop { backdrop-filter: none; -webkit-backdrop-filter: none; background-image: none; background-color: #171b20; }
      }
    `);
  }
  if (config.enableTimelinePolish) {
    // Keep virtual row positioning under host control; its ResizeObserver measures content.
    parts.push(`
      [data-virtual-inner] .bg-bubble-user {
        border-radius: 8px;
        box-shadow: inset 0 0 0 1px #ffffff18, 0 2px 5px #0000000d;
      }
      [data-virtual-inner] .prose-chat {
        color: var(--color-text-primary);
        text-decoration-color: var(--ms-timeline-accent, var(--color-accent-500));
      }
      [data-virtual-inner] .prose-chat a { color: var(--md-link-color, var(--color-accent-500)); text-underline-offset: 3px; }
      [data-virtual-inner] .prose-chat blockquote {
        border-inline-start-color: var(--ms-timeline-accent, var(--color-accent-500));
        background-color: var(--ms-timeline-surface, var(--color-background-secondary-default));
      }
      [data-virtual-inner] .prose-chat :is(th, thead) { background-color: var(--ms-timeline-surface, var(--color-background-secondary-default)); }
      [data-virtual-inner] li > .pointer-events-none.text-foreground-icon-quaternary { color: var(--ms-timeline-guide, var(--color-separator-border)); }
      [data-virtual-inner] button[aria-expanded] { border-radius: 4px; }
      [data-virtual-inner] button[aria-expanded]:is(:hover, :focus-visible) {
        background-color: var(--ms-timeline-surface, var(--color-background-secondary-default));
      }
      [data-virtual-inner] button[aria-expanded="true"] > span { color: var(--ms-timeline-accent, var(--color-accent-500)); }
      [data-anchor-id][aria-current="location"] > span {
        background-color: var(--ms-timeline-accent, var(--color-accent-500));
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--ms-timeline-accent, var(--color-accent-500)) 12%, transparent);
      }
      nav:has([data-anchor-id]) [role="tooltip"] { border-color: var(--ms-timeline-guide, var(--color-separator-border)); border-radius: 8px; }
      [data-virtual-inner] .group:focus-within > .mt-1 :is(button, .opacity-0) { opacity: 1; }
      @media (hover: none) {
        [data-virtual-inner] .group > .mt-1 .opacity-0 { opacity: 1; }
      }
    `);
    parts.push(toolTimelineCss);
  }
  if (config.enableFontSmoothing) {
    parts.push(
      `body { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; text-rendering: optimizeLegibility; }`,
    );
  }
  if (config.enableSleekScrollbars) {
    parts.push(`
      * { scrollbar-width: thin; scrollbar-color: color-mix(in srgb, var(--color-text-secondary, #888) 35%, transparent) transparent; }
      ::-webkit-scrollbar { width: 6px; height: 6px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: color-mix(in srgb, var(--color-text-secondary, #888) 35%, transparent); border-radius: 6px; }
      ::-webkit-scrollbar-thumb:hover { background: var(--color-text-secondary, #888); }
    `);
  }
  if (config.enableComposerGlow) {
    // Keep the persisted key compatible while applying focus feedback app-wide.
    parts.push(`
      :where(input:not([type="range"]):not([type="checkbox"]):not([type="radio"]), textarea, select):focus-visible,
      :where(button, [role="tab"], [role="switch"]):focus-visible,
      div.rounded-2xl.border.p-2.shadow-xs:focus-within {
        outline: 2px solid var(--color-border-focus-ring, #3b82f6);
        outline-offset: 2px;
        box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-border-focus-ring, #3b82f6) 12%, transparent);
      }
    `);
  }
  if (config.enableCardPolish) {
    parts.push(`
      .prose-chat pre {
        border: 1px solid var(--color-separator-border, #ddd);
        border-radius: 8px;
        background-color: var(--md-codeblock-bg, var(--color-background-secondary-default, #f7f7f7));
      }
      .prose-chat code { font-feature-settings: "liga" 1, "calt" 1; }
      .prose-chat :not(pre) > code { border-radius: 4px; }
      .prose-chat table { border-color: var(--color-border-table, #ddd); }
    `);
  }

  if (config.enableTabPolish) {
    // 顶栏会话页签（SessionTabStrip）微调：采用 Linear/macOS 分段卡片质感，克制清晰
    parts.push(`
      /* 当前激活会话页签：纯白/高对比立体浮起卡片，清晰但克制 */
      [role="tablist"] > div[data-tab-key]:has([role="tab"][aria-selected="true"]),
      [role="tablist"] > div[data-tab-key].bg-background-secondary-default {
        background-color: #ffffff !important;
        color: var(--color-text-primary, #111827) !important;
        font-weight: 500 !important;
        border: 1px solid color-mix(in srgb, var(--color-separator-border, #d1d5db) 75%, transparent) !important;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06), 0 1px 1px rgba(0, 0, 0, 0.04) !important;
      }

      :root.dark [role="tablist"] > div[data-tab-key]:has([role="tab"][aria-selected="true"]),
      :root.dark [role="tablist"] > div[data-tab-key].bg-background-secondary-default,
      .dark [role="tablist"] > div[data-tab-key]:has([role="tab"][aria-selected="true"]),
      .dark [role="tablist"] > div[data-tab-key].bg-background-secondary-default {
        background-color: var(--color-background-primary-default, #1e2023) !important;
        color: var(--color-text-primary, #f3f4f6) !important;
        border: 1px solid color-mix(in srgb, var(--color-separator-border, #4b5563) 60%, transparent) !important;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.06) !important;
      }
    `);
  }

  const hasImage = config.backgroundEnabled && isBackgroundImage(config.backgroundImage);
  if (palette || hasImage) {
    // Fixed attachment aligns the same image across opaque host surfaces, including portals.
    // Keep controls, selected rows and code/result panels on their semantic colors.
    const surfaces = `:is(body, #root,
      :is(div, main, section, aside, header, footer, nav)[class~="bg-background-full"]:not([data-virtual-inner] *),
      :is(div, main, section, aside, header, footer, nav)[class~="bg-background-primary-default"]:not([data-virtual-inner] *),
      :is(div, main, section, aside, header, footer, nav)[class~="bg-background-secondary-default"]:not([data-virtual-inner] *):not([data-tab-key]),
      .overflow-y-auto:has(> [data-virtual-inner]),
      [role="dialog"], .shadow-dropdown)`;
    const canvas = 'var(--ms-canvas, var(--color-background-full, #f2f2f2))';
    const dim = Number.isFinite(config.backgroundDim) ? Math.max(0, Math.min(100, config.backgroundDim)) : 65;
    const wash = `color-mix(in srgb, ${canvas} ${dim}%, transparent)`;
    parts.push(`${surfaces} {
      background-color: ${canvas};
      background-image: ${hasImage ? `linear-gradient(${wash}, ${wash}), var(--ms-background-image, none)` : 'none'};
      background-size: auto, ${config.backgroundFit === 'contain' ? 'contain' : 'cover'};
      background-position: center;
      background-repeat: no-repeat;
      background-attachment: fixed;
      ${hasImage ? 'backdrop-filter: none; -webkit-backdrop-filter: none;' : ''}
    }`);
    // Do not disable an imported WebP just because the OS requests reduced
    // motion: many WebP files are static, and CSS has no reliable way to tell
    // static and animated WebP apart. GIF animation is the only format we
    // intentionally suppress for that accessibility preference.
    if (hasImage && shouldSuppressBackgroundMotion(config.backgroundImage)) parts.push(`
      @media (prefers-reduced-motion: reduce) { ${surfaces} { background-image: none; } }
    `);
  }
  return parts.join("\n");
}

/**
 * 主题管理器类：负责注入与热更新样式
 */
export class GuiThemeManager {
  private ctx: PluginContext;
  private currentDisposer: (() => void) | null = null;
  private imageDisposer: (() => void) | null = null;
  private appliedImage = "";
  private previewCache = new Map<string, string>();
  private previewLoads = new Map<string, Promise<string>>();
  private onlineGalleryItems: OnlineWallpaper[] = [];
  private onlineGalleryQuery: WallpaperQuery | null = null;
  private readonly providers: WallpaperProvider[];
  private activeProviderId: WallpaperProviderId = "wallhaven";
  private readonly seenUrls: SeenUrlStore;
  private galleryPage = 1;
  private galleryTotalPages: number | null = null;
  private galleryTotalItems: number | null = null;
  private galleryHiddenCount = 0;
  private hideSeen = true;
  private galleryPages = new Map<number, GalleryCachedPage>();
  private galleryProviderId: WallpaperProviderId = "wallhaven";
  private saveQueue: Promise<void> = Promise.resolve();
  private config: GuiThemeConfig = { ...DEFAULT_THEME_CONFIG };
  private listeners = new Set<(cfg: GuiThemeConfig) => void>();
  private backgroundHistory: BackgroundHistory;
  private wallpaperApi: WallpaperApi;
  private initialization: Promise<void> | null = null;

  constructor(ctx: PluginContext) {
    this.ctx = ctx;
    this.backgroundHistory = new BackgroundHistory(ctx.storage, createBackgroundThumbnail);
    this.seenUrls = new SeenUrlStore(ctx.storage);
    this.providers = [new WallhavenProvider(ctx.bridge), new Upx8Provider(ctx.bridge)];
    this.wallpaperApi = new WallpaperApi(ctx.bridge);
  }

  public init(): Promise<void> {
    if (!this.initialization) this.initialization = this.loadConfiguration();
    return this.initialization;
  }

  private async loadConfiguration(): Promise<void> {
    try {
      const saved = await this.ctx.storage.get<GuiThemeConfig>("theme_config");
      if (saved) {
        this.config = normalizeThemeConfig(saved);
      }
      const image = await this.ctx.storage.get<string>("theme_background");
      if (isBackgroundImage(image)) this.config.backgroundImage = image;
    } catch (e) {
      console.warn("[background-ui] 读取主题设置失败:", e);
    }
    this.apply();
    try {
      await this.backgroundHistory.init();
      if (isBackgroundImage(this.config.backgroundImage)) {
        const item = await this.backgroundHistory.remember(this.config.backgroundImage, this.config.backgroundName || "已保存壁纸");
        this.config.backgroundId = item.id;
      }
    } catch (error) {
      console.warn("[background-ui] 读取壁纸历史失败:", error);
    }
    try {
      await this.seenUrls.init();
      const seenFromHistory = this.backgroundHistory.getItems().flatMap(item => item.source?.url ? [item.source.url] : []);
      if (seenFromHistory.length) await this.seenUrls.record(...seenFromHistory);
      const savedProvider = await this.ctx.storage.get<unknown>("wallpaper_provider");
      if (savedProvider === "wallhaven" || savedProvider === "upx8") this.activeProviderId = savedProvider;
      const hideSeen = await this.ctx.storage.get<unknown>("wallpaper_hide_seen");
      if (typeof hideSeen === "boolean") this.hideSeen = hideSeen;
    } catch (error) {
      console.warn("[background-ui] 读取图库状态失败:", error);
    }
    this.listeners.forEach(listener => listener(this.getConfig()));
  }

  public getConfig(): GuiThemeConfig {
    return { ...this.config };
  }

  public subscribe(fn: (cfg: GuiThemeConfig) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  public async updateConfig(partial: Partial<GuiThemeConfig>): Promise<void> {
    await this.init();
    if (isBackgroundImage(partial.backgroundImage)) {
      const item = await this.backgroundHistory.remember(partial.backgroundImage, partial.backgroundName || "未命名壁纸");
      partial = { ...partial, backgroundId: item.id };
    } else if (Object.prototype.hasOwnProperty.call(partial, "backgroundImage")) {
      partial = { ...partial, backgroundId: undefined };
    }
    return this.saveConfig(partial);
  }

  public getBackgroundHistory(): BackgroundHistoryItem[] {
    return this.backgroundHistory.getItems();
  }

  public subscribeBackgroundHistory(listener: (items: BackgroundHistoryItem[]) => void): () => void {
    return this.backgroundHistory.subscribe(listener);
  }

  public async loadBackgroundHistory(): Promise<void> {
    await this.init();
    await this.backgroundHistory.init();
  }

  public async selectBackground(id: string): Promise<void> {
    await this.init();
    const { item, image } = await this.backgroundHistory.read(id);
    await this.saveConfig({ backgroundId: id, backgroundImage: image, backgroundName: item.name, backgroundEnabled: true });
  }

  public async removeBackground(id: string): Promise<void> {
    await this.init();
    if (this.config.backgroundId === id) {
      await this.saveConfig({ backgroundId: undefined, backgroundImage: "", backgroundName: "", backgroundEnabled: false });
    }
    await this.backgroundHistory.remove(id);
  }
  public hasOnlineGallerySession(): boolean {
    return this.onlineGalleryItems.length > 0;
  }

  public getOnlineGallerySnapshot(): OnlineGallerySnapshot {
    return {
      items: this.onlineGalleryItems.slice(),
      query: this.onlineGalleryQuery ? { ...this.onlineGalleryQuery } : null,
      provider: this.activeProviderId,
      page: this.galleryPage,
      totalPages: this.galleryTotalPages,
      totalItems: this.galleryTotalItems,
      hiddenCount: this.galleryHiddenCount,
      hideSeen: this.hideSeen,
    };
  }

  public listWallpaperProviders(): { id: WallpaperProviderId; label: string }[] {
    return this.providers.map(provider => ({ id: provider.id, label: provider.label }));
  }

  public getWallpaperProvider(): WallpaperProviderId {
    return this.activeProviderId;
  }

  public async setWallpaperProvider(id: WallpaperProviderId): Promise<void> {
    if (!this.providers.some(provider => provider.id === id)) throw new Error("未知的壁纸来源");
    await this.ctx.storage.set("wallpaper_provider", id);
    this.activeProviderId = id;
    this.galleryPages.clear();
    this.onlineGalleryItems = [];
    this.onlineGalleryQuery = null;
    this.galleryPage = 1;
    this.galleryTotalPages = null;
    this.galleryTotalItems = null;
    this.galleryHiddenCount = 0;
  }

  public async setHideSeenWallpapers(value: boolean): Promise<void> {
    await this.ctx.storage.set("wallpaper_hide_seen", value);
    this.hideSeen = value;
    this.galleryPages.clear();
  }

  public async searchWallpapers(query: WallpaperQuery, page = 1): Promise<WallpaperPage> {
    await this.init();
    const provider = this.providers.find(item => item.id === this.activeProviderId);
    if (!provider) throw new Error("壁纸来源不可用");
    const changed = !this.onlineGalleryQuery || this.galleryProviderId !== this.activeProviderId ||
      this.onlineGalleryQuery.category !== query.category || this.onlineGalleryQuery.keyword !== query.keyword ||
      this.onlineGalleryQuery.resolution !== query.resolution || this.onlineGalleryQuery.sort !== query.sort;
    if (page <= 1 || changed) {
      this.galleryPages.clear();
      this.galleryPage = 1;
      this.galleryProviderId = this.activeProviderId;
    }
    const cached = this.galleryPages.get(page);
    if (cached) {
      this.galleryPage = page;
      this.onlineGalleryItems = cached.result.items.slice();
      this.galleryHiddenCount = cached.hidden.size;
      return cached.result;
    }
    const requestQuery = page > 1 && !changed && this.onlineGalleryQuery?.seed
      ? { ...query, seed: this.onlineGalleryQuery.seed }
      : query;
    const result = await provider.search(requestQuery, page);
    const seen = this.hideSeen ? this.seenUrls.asSet() : new Set<string>();
    const hidden = new Set<string>();
    const visible: OnlineWallpaper[] = [];
    for (const item of result.items) {
      if (seen.has(item.url)) hidden.add(item.url);
      else visible.push(item);
    }
    const pageResult = { ...result, items: visible };
    this.galleryPages.set(page, { result: pageResult, hidden });
    this.galleryPage = page;
    this.galleryTotalPages = result.totalPages;
    this.galleryTotalItems = result.totalItems;
    this.galleryHiddenCount = hidden.size;
    this.onlineGalleryItems = visible.slice();
    this.onlineGalleryQuery = { ...requestQuery, ...(result.seed ? { seed: result.seed } : {}) };
    return pageResult;
  }

  public async markWallpapersSeen(urls: string[]): Promise<void> {
    await this.seenUrls.record(...urls);
  }

  public async resetSeenWallpapers(): Promise<void> {
    await this.seenUrls.clear();
    this.galleryPages.clear();
  }

  public getWallpaperOptions(): Pick<WallpaperProvider, "categories" | "resolutions" | "sorts" | "paginated"> {
    const provider = this.providers.find(item => item.id === this.activeProviderId);
    if (!provider) throw new Error("壁纸来源不可用");
    return provider;
  }

  public getDefaultWallpaperQuery(): WallpaperQuery {
    const provider = this.providers.find(item => item.id === this.activeProviderId);
    if (!provider) throw new Error("壁纸来源不可用");
    return { ...provider.defaultQuery };
  }

  public previewOnlineWallpaper(item: OnlineWallpaper): Promise<string> {
    const cached = this.previewCache.get(item.url);
    if (cached) return Promise.resolve(cached);
    const pending = this.previewLoads.get(item.url);
    if (pending) return pending;
    const load = this.loadOnlineWallpaper(item.thumbnail ? { ...item, url: item.thumbnail } : item).then(image => {
      if (this.previewCache.size >= 48 && !this.previewCache.has(item.url)) {
        const oldest = this.previewCache.keys().next().value;
        if (oldest) this.previewCache.delete(oldest);
      }
      this.previewCache.set(item.url, image);
      return image;
    }).finally(() => { this.previewLoads.delete(item.url); });
    this.previewLoads.set(item.url, load);
    return load;
  }

  public async saveOnlineWallpaper(item: OnlineWallpaper, apply: boolean): Promise<BackgroundHistoryItem> {
    await this.init();
    const image = await this.loadOnlineWallpaper(item);
    const source: BackgroundImageSource = {
      provider: item.source === "wallhaven" ? "wallhaven" : "wallpaper-api-v2",
      url: item.url,
      source: item.source,
      ...(item.category ? { category: item.category } : {}),
      ...(item.keyword ? { keyword: item.keyword } : {}),
    };
    const saved = await this.backgroundHistory.remember(image, item.title, source);
    await this.seenUrls.record(item.url);
    if (apply) await this.selectBackground(saved.id);
    return saved;
  }

  private async loadOnlineWallpaper(item: OnlineWallpaper): Promise<string> {
    const allowedHosts = item.source === "wallhaven"
      ? ["w.wallhaven.cc", "th.wallhaven.cc"]
      : undefined;
    const downloaded = await this.wallpaperApi.download(item, allowedHosts);
    return readBackgroundBytes(downloaded.bytes, downloaded.mime);
  }



  private async saveConfig(partial: Partial<GuiThemeConfig>): Promise<void> {
    this.config = normalizeThemeConfig({ ...this.config, ...partial });
    this.apply();
    this.listeners.forEach((fn) => fn(this.config));
    const { backgroundImage, ...settings } = this.config;
    // Serialize slider/picker writes and keep large media out of ordinary settings writes.
    const save = this.saveQueue.then(async () => {
      if (Object.prototype.hasOwnProperty.call(partial, "backgroundImage")) {
        await this.ctx.storage.set("theme_background", isBackgroundImage(backgroundImage) ? backgroundImage : null);
      }
      await this.ctx.storage.set("theme_config", settings);
    });
    this.saveQueue = save.catch(e => { console.warn("[background-ui] 保存主题配置失败:", e); });
    return save;
  }

  public apply(): void {
    const image = this.config.backgroundEnabled && isBackgroundImage(this.config.backgroundImage) ? this.config.backgroundImage : "";
    if (image !== this.appliedImage) {
      this.imageDisposer?.();
      this.imageDisposer = image ? this.ctx.theme.injectCss(`:root { --ms-background-image: url("${image}"); }`) : null;
      this.appliedImage = image;
    }
    if (this.currentDisposer) {
      this.currentDisposer();
      this.currentDisposer = null;
    }
    const css = generateThemeCss(this.config);
    if (css && css.trim()) {
      try {
        this.currentDisposer = this.ctx.theme.injectCss(css);
      } catch (err) {
        console.warn("[background-ui] 注入主题 CSS 失败:", err);
      }
    }
  }

  public dispose(): void {
    this.wallpaperApi.dispose();
    for (const provider of this.providers) provider.dispose();
    this.previewLoads.clear();
    this.previewCache.clear();
    this.backgroundHistory.dispose();
    this.imageDisposer?.();
    this.imageDisposer = null;
    this.appliedImage = "";
    if (this.currentDisposer) {
      this.currentDisposer();
      this.currentDisposer = null;
    }
    this.listeners.clear();
  }
}
