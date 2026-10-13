import type { PluginContext } from "./ccgui-plugin";
import type { WallpaperQuery } from "./wallpaper-api.ts";
import { WALLPAPER_CATEGORIES, WALLPAPER_RESOLUTIONS, WallpaperApi } from "./wallpaper-api.ts";
import type { WallpaperPage, WallpaperProvider } from "./wallpaper-provider";

/** Legacy sampling source: another batch is not a server-side page. */
export class Upx8Provider implements WallpaperProvider {
  readonly id = "upx8";
  readonly label = "随机抽样（UPX8）";
  readonly paginated = false;
  readonly categories = WALLPAPER_CATEGORIES;
  readonly resolutions = WALLPAPER_RESOLUTIONS;
  readonly defaultQuery: WallpaperQuery = { category: "", keyword: "", resolution: "1920x1080" };
  readonly sorts = [];
  private readonly api: WallpaperApi;

  constructor(bridge: PluginContext["bridge"]) {
    this.api = new WallpaperApi(bridge);
  }

  async search(query: WallpaperQuery, page: number): Promise<WallpaperPage> {
    if (page !== 1) throw new Error("随机抽样来源不支持分页，请获取另一批");
    return { items: await this.api.search(query), page: 1, totalPages: null, totalItems: null };
  }

  dispose(): void {
    this.api.dispose();
  }
}
