import type { OnlineWallpaper, WallpaperQuery } from "./wallpaper-api";

export type WallpaperProviderId = "wallhaven" | "upx8";
export type WallpaperOption = { value: string; label: string };

export interface WallpaperPage {
  items: OnlineWallpaper[];
  page: number;
  totalPages: number | null;
  totalItems: number | null;
  seed?: string;
}

export interface WallpaperProvider {
  readonly id: WallpaperProviderId;
  readonly label: string;
  readonly paginated: boolean;
  readonly categories: readonly WallpaperOption[];
  readonly resolutions: readonly WallpaperOption[];
  readonly sorts: readonly WallpaperOption[];
  readonly defaultQuery: WallpaperQuery;
  search(query: WallpaperQuery, page: number): Promise<WallpaperPage>;
  dispose(): void;
}
