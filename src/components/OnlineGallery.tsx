import { React, useEffect, useRef, useState } from "../react-context";
import type { GuiThemeManager } from "../theme-manager";
import type { OnlineWallpaper, WallpaperQuery } from "../wallpaper-api";
import type { WallpaperProviderId } from "../wallpaper-provider";
import { WALLPAPER_PREVIEW_TIMEOUT_MS } from "../wallpaper-network";
interface Props {
  manager: GuiThemeManager;
  busy: boolean;
  onBusy: (busy: boolean) => void;
  onApplied: () => void;
}
type CardState = { status: "loading" | "ready" | "error"; preview?: string; message?: string; width?: number; height?: number };
type ImageSize = { width: number; height: number };
type CardPatch = Partial<CardState>;
const PREVIEW_CONCURRENCY = 6;

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  const { promise: timeout, reject } = Promise.withResolvers<never>();
  const timer = setTimeout(() => reject(new Error(message)), ms);
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function measureImage(dataUrl: string): Promise<ImageSize> {
  const { promise, resolve, reject } = Promise.withResolvers<ImageSize>();
  const image = new Image();
  image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
  image.onerror = () => reject(new Error("图片损坏或格式不受支持"));
  image.src = dataUrl;
  return promise;
}

function sizeLabel(item: OnlineWallpaper, card?: CardState): string {
  const width = item.width || card?.width;
  const height = item.height || card?.height;
  return width && height ? `${width} × ${height}` : "尺寸待加载";
}

function paginationPages(page: number, totalPages: number | null): (number | "ellipsis")[] {
  if (!totalPages) return [page];
  const start = Math.max(1, Math.min(page - 1, totalPages - 4));
  const end = Math.min(totalPages, Math.max(page + 1, 5));
  const pages = [...new Set([1, ...Array.from({ length: end - start + 1 }, (_, index) => start + index), totalPages])];
  const result: (number | "ellipsis")[] = [];
  pages.forEach((value, index) => {
    if (index > 0 && value - pages[index - 1] > 1) result.push("ellipsis");
    result.push(value);
  });
  return result;
}

interface PreviewProps {
  item: OnlineWallpaper;
  card?: CardState;
  locked: boolean;
  action: string;
  error: string;
  notice: string;
  trigger: HTMLButtonElement | null;
  onApply: () => void;
  onSave: () => void;
  onRetry: () => void;
  onClose: () => void;
}

function WallpaperPreview({ item, card, locked, action, error, notice, trigger, onApply, onSave, onRetry, onClose }: PreviewProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const pixelRatio = Math.max(1, window.devicePixelRatio || 1);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    // Consume Escape before the settings shell's window listener, including
    // when a focused action button becomes disabled while saving.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && dialog.open) {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current();
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      if (dialog.open) dialog.close();
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [trigger]);

  return <dialog ref={dialogRef} className="ms-gallery-preview" aria-label={`预览 ${item.title}`} aria-modal="true"
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => {
      if (event.target !== event.currentTarget) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
    }}>
    <header className="ms-gallery-preview-heading">
      <div><strong>{item.title}</strong><span>{sizeLabel(item, card)} · {item.source}</span></div>
      <button type="button" className="ms-gallery-preview-close" aria-label="关闭预览" autoFocus onClick={onClose}>关闭 <span aria-hidden="true">×</span></button>
    </header>
    <div className="ms-image-preview" aria-busy={card?.status === "loading"}>{card?.preview ? <img src={card.preview} alt={item.title}
      style={{ maxWidth: card.width ? card.width / pixelRatio : undefined, maxHeight: card.height ? `min(${card.height / pixelRatio}px, 64vh, max(120px, calc(100dvh - 200px)))` : undefined }} /> : <div className="ms-gallery-preview-loading" role="status">
      <span>{card?.message || "正在加载原图…"}</span>
      {card?.status === "error" && <button type="button" disabled={locked} onClick={onRetry}>重试</button>}
    </div>}</div>
    {error && <div role="alert" className="ms-status">{error}</div>}
    {notice && <div role="status" className="ms-status">{notice}</div>}
    <footer className="ms-gallery-actions">
      <button type="button" className="ms-gallery-preview-apply" disabled={locked} onClick={onApply}>{action === `apply:${item.url}` ? "设置中…" : "设为背景"}</button>
      <button type="button" disabled={locked} onClick={onSave}>{action === `save:${item.url}` ? "保存中…" : "仅保存到历史"}</button>
      <span className="ms-gallery-preview-hint">Esc 关闭预览</span>
    </footer>
  </dialog>;
}

export function OnlineGallery({ manager, busy, onBusy, onApplied }: Props) {
  const snapshot = manager.getOnlineGallerySnapshot();
  const options = manager.getWallpaperOptions();
  const defaults = manager.getDefaultWallpaperQuery();
  const initialQuery = snapshot.query ?? defaults;
  const initialSort = initialQuery.sort ?? defaults.sort ?? "";
  const [provider, setProvider] = useState<WallpaperProviderId>(snapshot.provider);
  const [category, setCategory] = useState(initialQuery.category ?? defaults.category);
  const [keyword, setKeyword] = useState(initialQuery.keyword ?? defaults.keyword);
  const [resolution, setResolution] = useState(initialQuery.resolution ?? defaults.resolution);
  const [sort, setSort] = useState(!initialQuery.keyword?.trim() && initialSort === "relevance"
    ? options.sorts.find(item => item.value !== "relevance")?.value ?? defaults.sort
    : initialSort);
  const [page, setPage] = useState(snapshot.page);
  const [totalPages, setTotalPages] = useState(snapshot.totalPages);
  const [totalItems, setTotalItems] = useState(snapshot.totalItems);
  const [hiddenCount, setHiddenCount] = useState(snapshot.hiddenCount);
  const [hideSeen, setHideSeen] = useState(snapshot.hideSeen);
  const [items, setItems] = useState<OnlineWallpaper[]>(snapshot.items);
  const [status, setStatus] = useState(snapshot.items.length ? `保留上次第 ${snapshot.page} 页结果。` : "输入关键词或选择分类开始搜索。");
  const [error, setError] = useState("");
  const [searching, setSearching] = useState(false);
  const [cards, setCards] = useState<Record<string, CardState>>({});
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewNotice, setPreviewNotice] = useState("");
  const [originalPreview, setOriginalPreview] = useState<CardState>({ status: "loading" });
  const originalRequest = useRef(0);
  const previewTrigger = useRef<HTMLButtonElement | null>(null);
  const [action, setAction] = useState("");
  const request = useRef(0);
  const searchController = useRef<AbortController | null>(null);
  const mounted = useRef(true);

  const cardsRef = useRef<Record<string, CardState>>({});
  useEffect(() => {
    mounted.current = true;
    if (snapshot.items.length) void loadAllPreviews(snapshot.items, request.current);
    else void search(1);
    return () => { mounted.current = false; request.current++; originalRequest.current++; searchController.current?.abort(); };
  }, []);

  const updateCard = (url: string, value: CardPatch) => {
    cardsRef.current = { ...cardsRef.current, [url]: { ...cardsRef.current[url], ...value } as CardState };
    setCards(cardsRef.current);
  };
  const current = (id: number) => mounted.current && id === request.current;

  const search = async (targetPage = 1, override: Partial<WallpaperQuery> = {}) => {
    if (busy || action !== "") return;
    const id = ++request.current;
    searchController.current?.abort();
    const controller = new AbortController();
    searchController.current = controller;
    setSearching(true);
    setError("");
    closePreview();
    if (targetPage === 1) { cardsRef.current = {}; setCards({}); setItems([]); }
    setStatus(targetPage === 1 ? "正在搜索…" : `正在加载第 ${targetPage} 页…`);
    const normalizedSort = sort === "relevance" && !keyword.trim() ? options.sorts.find(item => item.value !== "relevance")?.value ?? "" : sort;
    const query: WallpaperQuery = { category, keyword, resolution, sort: normalizedSort, ...override };
    try {
      const result = await manager.searchWallpapers(query, targetPage, {
        signal: controller.signal,
        onRetry: (nextAttempt, totalAttempts, delayMs) => {
          if (current(id)) setStatus(`搜索失败，${delayMs / 1000} 秒后自动重试（第 ${nextAttempt} / ${totalAttempts} 次）…`);
        },
      });
      if (!current(id)) return;
      setItems(result.items);
      setPage(result.page);
      setTotalPages(result.totalPages);
      setTotalItems(result.totalItems);
      setHiddenCount(manager.getOnlineGallerySnapshot().hiddenCount);
      setStatus(result.items.length
        ? `本页 ${result.items.length} 张${result.items.some(item => item.source === "wallhaven") ? " · 搜索支持标签和多语言，但英文标签通常更准" : " · 随机抽样，未保证关键词相关性"}${manager.getOnlineGallerySnapshot().hiddenCount ? ` · 隐藏已看过 ${manager.getOnlineGallerySnapshot().hiddenCount} 张` : ""}`
        : manager.getOnlineGallerySnapshot().hiddenCount ? "本页图片都看过了。关闭“隐藏已看过”可重新查看。" : "没有找到图片，请更换关键词或分类。");
      if (result.items.length) void loadAllPreviews(result.items, id);
    } catch (cause) {
      if (!current(id)) return;
      setItems([]);
      setError(cause instanceof Error ? cause.message : "壁纸搜索失败");
      setStatus("");
    } finally {
      if (current(id)) setSearching(false);
    }
  };

  const loadAllPreviews = async (list: OnlineWallpaper[], id: number) => {
    let cursor = 0;
    const worker = async () => {
      while (mounted.current && id === request.current && cursor < list.length) {
        const item = list[cursor++];
        await loadPreview(item, id).catch(() => undefined);
      }
    };
    await Promise.all(Array.from({ length: Math.min(PREVIEW_CONCURRENCY, list.length) }, worker));
    if (!current(id)) return;
    const snapshot = manager.getOnlineGallerySnapshot();
    const failed = list.filter(item => cardsRef.current[item.url]?.status === "error").length;
    setStatus(`本页 ${list.length} 张 · 已显示 ${list.length - failed} 张${failed ? ` · ${failed} 张失败，可重试` : ""}${snapshot.hiddenCount ? ` · 隐藏已看过 ${snapshot.hiddenCount} 张` : ""}`);
  };
  const loadPreview = async (item: OnlineWallpaper, id = request.current): Promise<string | undefined> => {
    const existing = cardsRef.current[item.url];
    if (existing?.status === "ready" && existing.preview) return existing.preview;
    if (existing?.status === "loading") return;
    updateCard(item.url, { status: "loading" });
    try {
      const image = await withTimeout(manager.previewOnlineWallpaper(item), WALLPAPER_PREVIEW_TIMEOUT_MS, "读取超时，请稍后重试");
      if (!current(id)) return;
      updateCard(item.url, { status: "ready", preview: image });
      void withTimeout(measureImage(image), 10_000, "图片尺寸读取超时")
        .then(size => { if (current(id)) updateCard(item.url, size); })
        .catch(() => undefined);
      return image;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "图片读取失败";
      if (current(id)) updateCard(item.url, { status: "error", message });
      throw cause;
    }
  };

  const useWallpaper = async (item: OnlineWallpaper, apply: boolean) => {
    const id = request.current;
    setAction(`${apply ? "apply" : "save"}:${item.url}`);
    setError("");
    onBusy(true);
    try {
      await manager.saveOnlineWallpaper(item, apply);
      if (!current(id)) return;
      const message = apply ? `已将「${item.title}」设为背景，并写入壁纸历史。` : `已将「${item.title}」保存到壁纸历史。`;
      setStatus(message);
      setPreviewNotice(message);
      if (apply) {
        closePreview();
        onApplied();
      }
    } catch (cause) {
      if (current(id)) setError(cause instanceof Error ? cause.message : "壁纸保存失败");
    } finally {
      if (current(id)) {
        setAction("");
        onBusy(false);
      }
    }
  };

  const closePreview = () => {
    originalRequest.current++;
    setPreviewUrl("");
    setOriginalPreview({ status: "loading" });
  };

  const loadOriginalPreview = async (item: OnlineWallpaper) => {
    const id = ++originalRequest.current;
    setOriginalPreview({ status: "loading" });
    try {
      const image = await withTimeout(manager.previewOnlineWallpaper(item, "original"), WALLPAPER_PREVIEW_TIMEOUT_MS, "原图加载超时，请重试");
      if (!mounted.current || id !== originalRequest.current) return;
      const size = await withTimeout(measureImage(image), 10_000, "原图尺寸读取超时，请重试");
      if (mounted.current && id === originalRequest.current) setOriginalPreview({ status: "ready", preview: image, ...size });
    } catch (cause) {
      if (mounted.current && id === originalRequest.current) setOriginalPreview({ status: "error", message: cause instanceof Error ? cause.message : "原图加载失败，请重试" });
    }
  };

  const openPreview = (item: OnlineWallpaper, trigger: HTMLButtonElement) => {
    previewTrigger.current = trigger;
    setError("");
    setPreviewNotice("");
    setPreviewUrl(item.url);
    void loadOriginalPreview(item);
  };

  const locked = busy || searching || action !== "";
  const preview = items.find(item => item.url === previewUrl);
  const pageNumbers = paginationPages(page, totalPages);
  // Without a keyword relevance is disabled upstream; hide the dead option.
  const sortOptions = keyword.trim() ? options.sorts : options.sorts.filter(item => item.value !== "relevance");

  return <div className="ms-online-gallery">
    <form className="ms-gallery-search-form" onSubmit={event => { event.preventDefault(); void search(1); }}>
    <div className="ms-gallery-filters">
      <label>壁纸源
        <select aria-label="壁纸源" value={provider} disabled={locked} onChange={event => {
          const next = event.target.value as WallpaperProviderId;
          void (async () => {
            await manager.setWallpaperProvider(next);
            const nextDefaults = manager.getDefaultWallpaperQuery();
            setProvider(next);
            setCategory(nextDefaults.category); setKeyword(nextDefaults.keyword); setItems([]); setPage(1);
            setResolution(nextDefaults.resolution); setSort(nextDefaults.sort);
            setTotalPages(null); setTotalItems(null);
            void search(1, nextDefaults);
          })().catch(cause => setError(cause instanceof Error ? cause.message : "切换壁纸源失败"));
        }}>
          {manager.listWallpaperProviders().map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </label>
      <label>分类
        <select aria-label="壁纸分类" value={category} disabled={locked} onChange={event => setCategory(event.target.value)}>
          {options.categories.map(item => <option key={item.value || "all"} value={item.value}>{item.label}</option>)}
        </select>
      </label>
      {options.resolutions.length > 1 && <label>最低分辨率
        <select aria-label="最低分辨率" value={resolution} disabled={locked} onChange={event => setResolution(event.target.value)}>
          {options.resolutions.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </label>}
      {options.sorts.length > 0 && <label>排序
        <select aria-label="搜索排序" value={sort} disabled={locked} onChange={event => setSort(event.target.value)}>
          {sortOptions.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </label>}
    </div>
    <div className="ms-gallery-search-row">
      <label>关键词
        <input aria-label="壁纸关键词" value={keyword} maxLength={100} disabled={locked} placeholder="搜索标签 / 关键词"
          onChange={event => {
            const value = event.target.value;
            setKeyword(value);
            if (!value.trim() && sort === "relevance") setSort(options.sorts.find(item => item.value !== "relevance")?.value ?? sort);
          }} />
      </label>
      <button type="submit" className="ms-gallery-search-button" disabled={locked}>{searching ? "搜索中…" : "搜索"}</button>
    </div>
    </form>
    <div className="ms-gallery-toolbar">
    <label className="ms-gallery-seen-toggle"><input type="checkbox" checked={hideSeen} disabled={locked} onChange={event => {
      const value = event.target.checked;
      void manager.setHideSeenWallpapers(value).then(() => { setHideSeen(value); setItems([]); setPage(1); void search(1); })
        .catch(cause => setError(cause instanceof Error ? cause.message : "保存浏览记录设置失败"));
    }} /> 隐藏已看过（跨会话）</label>
    {totalItems !== null && <span className="ms-gallery-total">共 {totalItems.toLocaleString()} 张</span>}
    </div>
    {provider === "upx8" && <p className="ms-history-hint">UPX8 是随机抽样源，关键词相关性不稳定，不支持分页。</p>}
    {error && <div role="alert" className="ms-status">{error}</div>}
    {status && <p className="ms-history-hint" role="status">{status}</p>}
    <div className="ms-history-grid" aria-label="在线壁纸结果" aria-busy={searching}>
      {items.map((item, index) => {
        const card = cards[item.url];
        return <div key={item.url} className="ms-history-item">
          <button type="button" className="ms-history-use" disabled={locked} aria-label={`预览壁纸 ${item.title}`}
            title={`${item.title || `壁纸 ${index + 1}`} · ${sizeLabel(item, card)} · ${item.source}`} onClick={event => void openPreview(item, event.currentTarget)}>
            <span className="ms-history-thumbnail">{card?.preview ? <img src={card.preview} alt="" onLoad={event => {
              const image = event.currentTarget;
              if (image.naturalWidth && image.naturalHeight) updateCard(item.url, { width: image.naturalWidth, height: image.naturalHeight });
              void manager.markWallpapersSeen([item.url]).catch(cause => setError(cause instanceof Error ? cause.message : "保存浏览记录失败"));
            }} onError={() => updateCard(item.url, { status: "error", message: "缩略图加载失败，请重试" })} /> : <span>{card?.status === "loading" ? "读取中…" : card?.status === "error" ? "读取失败" : "等待加载"}</span>}</span>
            <strong>{item.title || `壁纸 ${index + 1}`}</strong>
            <small>{sizeLabel(item, card)} · {item.source}</small>
          </button>
          {card?.status === "error" && <small role="alert">{card.message}</small>}
          {card?.status === "error" && <button type="button" className="ms-gallery-retry" disabled={locked} onClick={() => void loadPreview(item).catch(cause => setError(cause instanceof Error ? cause.message : "图片读取失败"))}>重试</button>}
          <div className="ms-gallery-actions">
            <button type="button" disabled={locked} onClick={() => void useWallpaper(item, true)}>{action === `apply:${item.url}` ? "设置中…" : "设为背景"}</button>
            <button type="button" disabled={locked} onClick={() => void useWallpaper(item, false)}>{action === `save:${item.url}` ? "保存中…" : "仅保存"}</button>
          </div>
        </div>;
      })}
    </div>
    <nav className="ms-gallery-pagination" aria-label="壁纸分页">
      {options.paginated ? <>
        <span className="ms-gallery-page-summary">第 {page.toLocaleString()} / {totalPages?.toLocaleString() ?? "…"} 页</span>
        <div className="ms-gallery-page-controls">
          <button type="button" className="ms-gallery-page-previous" aria-label="上一页" disabled={locked || page <= 1} onClick={() => void search(page - 1)}><span aria-hidden="true">‹</span> 上一页</button>
          <div className="ms-gallery-page-list">
            {pageNumbers.map((value, index) => value === "ellipsis"
              ? <span key={`ellipsis-${index}`} className="ms-gallery-page-ellipsis" aria-hidden="true">…</span>
              : <button key={value} type="button" aria-label={`第 ${value} 页`} aria-current={value === page ? "page" : undefined}
                  disabled={locked} onClick={() => { if (value !== page) void search(value); }}>{value}</button>)}
          </div>
          <button type="button" className="ms-gallery-page-next" aria-label="下一页" disabled={locked || (totalPages !== null && page >= totalPages)} onClick={() => void search(page + 1)}>下一页 <span aria-hidden="true">›</span></button>
        </div>
      </> : <button type="button" disabled={locked} onClick={() => void search(1)}>再抽一批 <span aria-hidden="true">↻</span></button>}
    </nav>
    {preview && <WallpaperPreview key={preview.url} item={preview} card={originalPreview} locked={locked} action={action} error={error} notice={previewNotice} trigger={previewTrigger.current}
      onApply={() => void useWallpaper(preview, true)} onSave={() => void useWallpaper(preview, false)}
      onRetry={() => void loadOriginalPreview(preview)} onClose={closePreview} />}
  </div>;
}
