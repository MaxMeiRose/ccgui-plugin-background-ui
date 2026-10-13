import { React, useState, useRef, useEffect } from "../react-context";
import type { GuiThemeConfig, GuiThemeManager } from "../theme-manager";
import { MAX_BACKGROUND_HISTORY_ITEMS, MAX_BACKGROUND_HISTORY_BYTES, type BackgroundHistoryItem } from "../background-history";
import { customThemeColor, readBackgroundFile } from "../theme-customization";
import { PlusIcon, TrashIcon } from "../icons";
import { OnlineGallery } from "./OnlineGallery";

interface Props {
  config: GuiThemeConfig;
  update: (partial: Partial<GuiThemeConfig>) => Promise<void>;
  manager: GuiThemeManager;
  section: "palette" | "background";
}

export function ThemeCustomizationPanel({ config, update, manager, section }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement | null>(null);
  const request = useRef(0);
  const [history, setHistory] = useState<BackgroundHistoryItem[]>(manager.getBackgroundHistory());
  const [historyError, setHistoryError] = useState("");
  const [historyAction, setHistoryAction] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [source, setSource] = useState<"history" | "online" | "local">(
    manager.hasOnlineGallerySession() ? "online" : "history",
  );
  const [galleryBusy, setGalleryBusy] = useState(false);
  const busy = loading || historyAction !== null || galleryBusy;
  useEffect(() => () => { request.current++; }, []);
  useEffect(() => {
    if (section !== "background") return;
    let alive = true;
    const unsubscribe = manager.subscribeBackgroundHistory(setHistory);
    setHistory(manager.getBackgroundHistory());
    void manager.loadBackgroundHistory().catch(error => {
      if (alive) setHistoryError(error instanceof Error ? error.message : "壁纸历史加载失败");
    });
    return () => { alive = false; unsubscribe(); };
  }, [manager, section]);
  const color = customThemeColor(config.customAccent, config.preset);
  if (section === "palette") return <div className="ms-custom-palette">
    <label className="ms-color-field">
      <input type="color" aria-label="主题色" value={color}
        onChange={event => void update({ customAccent: event.target.value })} />
      <span>主题色<code>{color.toUpperCase()}</code></span>
    </label>
  </div>;

  const importFile = async (file?: File) => {
    if (!file) return;
    const id = ++request.current;
    setLoading(true); setError("");
    try {
      const data = await readBackgroundFile(file);
      if (id !== request.current) return;
      await manager.updateConfig({ backgroundImage: data, backgroundName: file.name, backgroundEnabled: true });
    } catch (e) {
      if (id === request.current) setError(e instanceof Error ? e.message : "图片导入失败");
    } finally {
      if (id === request.current) setLoading(false);
    }
  };
  const manageBackground = async (item: BackgroundHistoryItem, action: "use" | "remove") => {
    const id = ++request.current;
    setHistoryAction(`${action}:${item.id}`); setError(""); setDeleteId(null);
    try {
      if (action === "use") await manager.selectBackground(item.id);
      else await manager.removeBackground(item.id);
    } catch (error) {
      if (id === request.current) setError(error instanceof Error ? error.message : "壁纸操作失败");
    } finally {
      if (id === request.current) setHistoryAction(null);
    }
  };
  return <div className="ms-image-settings">
    <div className="ms-theme-modes" role="group" aria-label="应用背景类型">
      <button type="button" disabled={busy} aria-pressed={!config.backgroundEnabled} onClick={() => {
        request.current++; setLoading(false); setError("");
        void update({ backgroundEnabled: false });
      }}>纯色</button>
      <button type="button" disabled={busy} aria-pressed={config.backgroundEnabled} onClick={() => {
        if (config.backgroundImage) void update({ backgroundEnabled: true });
        else fileInput.current?.click();
      }}>图片</button>
    </div>
    <input ref={fileInput} hidden type="file" accept="image/png,image/jpeg,image/webp,image/gif"
      aria-label="选择背景图片" onChange={event => { void importFile(event.target.files?.[0]); event.target.value = ""; }} />
    <div className="ms-image-toolbar">
      <button type="button" className="ms-image-import" disabled={busy} onClick={() => fileInput.current?.click()}>
        <PlusIcon />{loading ? "正在导入…" : config.backgroundImage ? "更换图片" : "导入图片"}
      </button>
      {config.backgroundImage && <>
        <button type="button" className="ms-icon-button" disabled={busy} title="停用当前图片（保留历史记录）" aria-label="移除背景图片" onClick={() => {
          request.current++; setLoading(false); setError("");
          void update({ backgroundImage: "", backgroundName: "", backgroundEnabled: false });
        }}><TrashIcon /></button>
      </>}
    </div>
    {error && <div role="alert" className="ms-status">{error}</div>}
    {config.backgroundImage && <>
      <div className="ms-image-preview"><img src={config.backgroundImage} alt={config.backgroundName || "应用背景"} style={{ objectFit: config.backgroundFit }} /></div>
      <div className="ms-image-name" title={config.backgroundName}>{config.backgroundName}</div>
      <div className="ms-theme-modes" role="group" aria-label="图片适配">
        <button type="button" aria-pressed={config.backgroundFit === "cover"} onClick={() => void update({ backgroundFit: "cover" })}>铺满</button>
        <button type="button" aria-pressed={config.backgroundFit === "contain"} onClick={() => void update({ backgroundFit: "contain" })}>完整显示</button>
      </div>
      <div className="ms-theme-slider ms-image-dim"><span>阅读遮罩<output>{config.backgroundDim}%</output></span>
        <div className="ms-effort-track"><div className="ms-effort-fill" style={{ width: `calc(${config.backgroundDim / 100} * (100% - 21px) + 21px)` }} />
          <input className="ms-range" aria-label="阅读遮罩" type="range" min="0" max="100" step="5" value={config.backgroundDim}
            onChange={event => void update({ backgroundDim: Number(event.target.value) })} /></div>
      </div>
    </>}
    <section className="ms-background-history" aria-label="壁纸管理">
      <div className="ms-source-tabs" role="tablist" aria-label="图片来源">
        <button type="button" role="tab" aria-selected={source === "history"} disabled={busy} onClick={() => setSource("history")}>历史记录</button>
        <button type="button" role="tab" aria-selected={source === "online"} disabled={busy} onClick={() => setSource("online")}>在线图库</button>
        <button type="button" role="tab" aria-selected={source === "local"} disabled={busy} onClick={() => setSource("local")}>本地导入</button>
      </div>
      {source === "online" ? <OnlineGallery manager={manager} busy={busy} onBusy={setGalleryBusy} onApplied={() => setSource("history")} /> : <>
      <div className="ms-history-heading"><strong>{source === "local" ? "从本机导入" : "壁纸历史"}</strong><span>{history.length} / {MAX_BACKGROUND_HISTORY_ITEMS} 张</span></div>
      {source === "local" ? <p className="ms-history-hint">选择 PNG、JPEG、WebP 或 GIF。导入后自动加入历史，可离线切换。</p> :
      <p className="ms-history-hint">导入或在线保存后出现在这里。点击缩略图即可切换，无需重新选择文件。原图合计上限 {MAX_BACKGROUND_HISTORY_BYTES / 1024 / 1024} MB。打开历史不会访问网络。</p>}
      {source === "local" && <div className="ms-image-toolbar">
        <button type="button" className="ms-image-import" disabled={busy} onClick={() => fileInput.current?.click()}>
          <PlusIcon />{loading ? "正在导入…" : "选择本地图片"}
        </button>
      </div>}
      {historyError && <div role="alert" className="ms-status">{historyError}</div>}
      {!historyError && history.length === 0 && source === "history" && <p className="ms-history-empty">还没有保存的壁纸。可以从在线图库保存，或导入一张本地图片。</p>}
      <div className="ms-history-grid">
        {history.map(item => {
          const active = config.backgroundEnabled && config.backgroundId === item.id;
          const applying = historyAction === `use:${item.id}`;
          let status = `${(item.size / 1024 / 1024).toFixed(1)} MB · 点击使用`;
          if (active) status = "当前使用";
          if (applying) status = "正在切换…";
          return <div key={item.id} className="ms-history-item">
            <button type="button" className="ms-history-use" disabled={busy} aria-label={`使用壁纸 ${item.name}`}
              aria-pressed={active} title={item.name} onClick={() => void manageBackground(item, "use")}>
              <span className="ms-history-thumbnail">{item.thumbnail ? <img src={item.thumbnail} alt="" loading="lazy" /> : <span>预览不可用</span>}</span>
              <strong>{item.name}</strong>
              <small>{status}</small>
            </button>
            {deleteId === item.id ? <div className="ms-history-confirm" role="group" aria-label={`确认删除 ${item.name}`}>
              <span>{active ? "删除并停用？" : "删除记录？"}</span>
              <button type="button" disabled={busy} onClick={() => void manageBackground(item, "remove")}>确认删除</button>
              <button type="button" disabled={busy} onClick={() => setDeleteId(null)}>取消</button>
            </div> : <button type="button" className="ms-history-delete" disabled={busy}
              aria-label={`从历史删除 ${item.name}`} title="从历史删除，不影响磁盘原文件" onClick={() => setDeleteId(item.id)}><TrashIcon />删除记录</button>}
          </div>;
        })}
      </div>
      </>}
    </section>
  </div>;
}
