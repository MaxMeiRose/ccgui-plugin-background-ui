export const WALLPAPER_DOWNLOAD_TIMEOUT_MS = 180_000;
export const WALLPAPER_EXEC_TIMEOUT_MS = WALLPAPER_DOWNLOAD_TIMEOUT_MS + 30_000;
export const WALLPAPER_PREVIEW_TIMEOUT_MS = WALLPAPER_EXEC_TIMEOUT_MS + 90_000;

export interface WallpaperSearchOptions {
  signal?: AbortSignal;
  onRetry?: (nextAttempt: number, totalAttempts: number, delayMs: number) => void;
}

export class WallpaperSearchError extends Error {
  readonly retryable: boolean;
  constructor(message: string, retryable: boolean) {
    super(message);
    this.name = "WallpaperSearchError";
    this.retryable = retryable;
  }
}

export function wallpaperNetworkError(error: unknown, source = "壁纸"): WallpaperSearchError {
  const detail = error instanceof Error ? error.message : typeof error === "string" ? error : "请稍后重试";
  const denied = /permission|权限|未授权|forbidden|disabled|禁用|not allowed/i.test(detail);
  return new WallpaperSearchError(`${source}网络请求失败：${detail}`, !denied);
}

export function isRetryableWallpaperStatus(status: number): boolean {
  return status === 408 || (status >= 500 && status <= 599);
}

function waitForRetry(delayMs: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    signal?.throwIfAborted();
    const aborted = () => { clearTimeout(timer); reject(signal?.reason); };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", aborted);
      resolve();
    }, delayMs);
    signal?.addEventListener("abort", aborted, { once: true });
  });
}

/** Retry transient search failures; keep validation, authorization and rate limits explicit. */
export async function retryWallpaperSearch<T>(operation: () => Promise<T>, options: WallpaperSearchOptions): Promise<T> {
  const totalAttempts = 3;
  for (let attempt = 1; ; attempt++) {
    options.signal?.throwIfAborted();
    try {
      const value = await operation();
      options.signal?.throwIfAborted();
      return value;
    } catch (error) {
      options.signal?.throwIfAborted();
      if (!(error instanceof WallpaperSearchError) || !error.retryable) throw error;
      if (attempt >= totalAttempts) throw new Error(`${error.message}（自动重试 2 次后仍失败）`, { cause: error });
      const delayMs = attempt * 1000;
      options.onRetry?.(attempt + 1, totalAttempts, delayMs);
      await waitForRetry(delayMs, options.signal);
    }
  }
}
