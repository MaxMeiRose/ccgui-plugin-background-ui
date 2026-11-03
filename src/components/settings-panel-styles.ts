// Scoped styles prevent this plugin from changing similarly named controls in other plugins.
export const settingsPanelStyles = `
/* Keep room for six gallery cards without stretching across the whole window. */
[class~="max-w-[720px]"]:has(.ccgui-background-ui-root),
dialog:has(.ccgui-background-ui-root) [class~="max-w-[720px]"] { max-width: 1120px; }
.ccgui-background-ui-root {
  --ms-bg: var(--color-background-primary-default, var(--background-primary-default, #ffffff));
  --ms-surface: var(--color-background-secondary-default, var(--background-secondary-default, #f6f7f8));
  --ms-hover: var(--color-background-primary-hover, #edf0f3);
  --ms-text: var(--color-text-primary, var(--text-primary, #20242b));
  --ms-muted: var(--color-text-secondary, var(--text-secondary, #646c78));
  --ms-border: var(--color-border-button-default, var(--border-button-default, #e1e4e8));
  --ms-accent: var(--color-accent-500, #147d92);
  --ms-tint: color-mix(in srgb, var(--ms-accent) 9%, var(--ms-bg));
  width: 100%;
  box-sizing: border-box;
  max-width: 1120px;
  margin-inline: auto;
  min-width: 0;
  border: 1px solid var(--ms-border);
  border-radius: 8px;
  background: var(--ms-bg);
  color: var(--ms-text);
  font: 13px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif;
  letter-spacing: 0;
  container-name: background-settings;
  container-type: inline-size;
}
.dark .ccgui-background-ui-root {
  --ms-bg: var(--color-background-primary-default, var(--background-primary-default, #202124));
  --ms-surface: var(--color-background-secondary-default, var(--background-secondary-default, #25272b));
  --ms-hover: var(--color-background-primary-hover, #303338);
  --ms-text: var(--color-text-primary, var(--text-primary, #f0f1f3));
  --ms-muted: var(--color-text-secondary, var(--text-secondary, #a4abb5));
  --ms-border: var(--color-border-button-default, var(--border-button-default, #383c42));
  --ms-accent: var(--color-border-focus-ring, #62c4d4);
}
.ccgui-background-ui-root *,
.ccgui-background-ui-root *::before,
.ccgui-background-ui-root *::after { box-sizing: border-box; }
.ccgui-background-ui-root button,
.ccgui-background-ui-root input,
.ccgui-background-ui-root select { font: inherit; letter-spacing: 0; }
.ccgui-background-ui-root button { color: inherit; cursor: pointer; }
.ccgui-background-ui-root button:disabled { opacity: .4; cursor: not-allowed; }
.ccgui-background-ui-root button:focus-visible,
.ccgui-background-ui-root input:focus-visible,
.ccgui-background-ui-root select:focus-visible { outline: 2px solid var(--ms-accent); outline-offset: 2px; }
.ccgui-background-ui-root svg { flex-shrink: 0; }
.ccgui-background-ui-root .ms-theme { width: 100%; padding: 16px 18px; }
.ccgui-background-ui-root .ms-theme-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.ccgui-background-ui-root .ms-theme-heading h3 { margin: 0; color: var(--ms-text); font-size: 16px; font-weight: 650; }
.ccgui-background-ui-root .ms-status { margin-bottom: 12px; padding: 8px 10px; border: 1px solid var(--ms-border); border-radius: 6px; background: var(--ms-tint); color: var(--ms-text); font-size: 12px; overflow-wrap: anywhere; }
.ccgui-background-ui-root .ms-icon-button { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; padding: 0; border: 1px solid transparent; border-radius: 6px; background: transparent; color: var(--ms-muted); }
.ccgui-background-ui-root .ms-icon-button:hover:not(:disabled) { background: var(--ms-hover); color: var(--ms-text); }
.ccgui-background-ui-root .ms-palette-mode { margin-bottom: 14px; }
.ccgui-background-ui-root .ms-theme-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px; }
.ccgui-background-ui-root .ms-theme-preset { display: flex; min-width: 0; flex-direction: column; padding: 5px; border: 1px solid var(--ms-border); border-radius: 6px; background: var(--ms-bg); text-align: left; }
.ccgui-background-ui-root .ms-theme-preset:hover { background: var(--ms-hover); }
.ccgui-background-ui-root .ms-theme-preset[aria-pressed="true"] { border-color: var(--ms-accent); background: var(--ms-tint); }
.ccgui-background-ui-root .ms-theme-thumbnail { display: grid; grid-template-columns: 26% 1fr; width: 100%; height: 58px; overflow: hidden; border-radius: 3px; background: var(--preview-light); }
.dark .ccgui-background-ui-root .ms-theme-thumbnail { background: var(--preview-dark); }
.ccgui-background-ui-root .ms-theme-thumbnail-nav { display: flex; flex-direction: column; gap: 5px; padding: 10px 5px; background: var(--preview-panel-light); }
.dark .ccgui-background-ui-root .ms-theme-thumbnail-nav { background: var(--preview-panel-dark); }
.ccgui-background-ui-root .ms-theme-thumbnail i { display: block; height: 3px; border-radius: 1px; background: var(--preview-ink-light); opacity: .25; }
.dark .ccgui-background-ui-root .ms-theme-thumbnail i { background: var(--preview-ink-dark); }
.ccgui-background-ui-root .ms-theme-thumbnail-nav i:first-child { background: var(--preview-accent); opacity: .8; }
.ccgui-background-ui-root .ms-theme-thumbnail-chat { display: flex; flex-direction: column; gap: 5px; padding: 8px 9px; }
.ccgui-background-ui-root .ms-theme-thumbnail-chat i:first-child { width: 48%; height: 9px; align-self: flex-end; border-radius: 2px; background: var(--preview-accent); opacity: 1; }
.ccgui-background-ui-root .ms-theme-thumbnail-chat i:nth-child(3) { width: 72%; }
.ccgui-background-ui-root .ms-theme-thumbnail-chat i:last-child { height: 8px; margin-top: 2px; opacity: .1; }
.ccgui-background-ui-root .ms-theme-caption { display: flex; align-items: center; width: 100%; min-height: 30px; gap: 4px; padding: 5px 3px 0; }
.ccgui-background-ui-root .ms-theme-name { min-width: 0; flex: 1; overflow-wrap: anywhere; font-size: 12px; }
.ccgui-background-ui-root .ms-theme-choice { display: flex; align-items: center; justify-content: center; width: 16px; height: 16px; flex-shrink: 0; color: var(--ms-accent); }
.ccgui-background-ui-root .ms-theme-choice > span { width: 8px; height: 8px; border-radius: 2px; }
.ccgui-background-ui-root .ms-theme-section { margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--ms-border); }
.ccgui-background-ui-root .ms-theme-section h4 { margin: 0 0 8px; font-size: 12px; font-weight: 500; }
.ccgui-background-ui-root .ms-theme-section > .ms-theme-toggle { width: 100%; min-height: 32px; padding-top: 0; }
.ccgui-background-ui-root .ms-theme-sliders { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 8px; }
.ccgui-background-ui-root .ms-theme-slider { min-width: 0; }
.ccgui-background-ui-root .ms-theme-slider > span { display: flex; justify-content: space-between; margin-bottom: 8px; color: var(--ms-muted); font-size: 12px; }
.ccgui-background-ui-root .ms-theme-slider output { color: var(--ms-text); font-variant-numeric: tabular-nums; }
.ccgui-background-ui-root .ms-theme-slider:has(:disabled) { opacity: .45; }
.ccgui-background-ui-root .ms-color-field { display: flex; align-items: center; min-width: 0; gap: 9px; padding: 8px; border-bottom: 1px solid var(--ms-border); }
.ccgui-background-ui-root .ms-color-field input[type="color"] { appearance: none; width: 34px; height: 34px; flex-shrink: 0; padding: 0; border: 1px solid var(--ms-border); border-radius: 6px; background: transparent; cursor: pointer; }
.ccgui-background-ui-root .ms-color-field input::-webkit-color-swatch-wrapper { padding: 3px; }
.ccgui-background-ui-root .ms-color-field input::-webkit-color-swatch { border: 0; border-radius: 3px; }
.ccgui-background-ui-root .ms-color-field input::-moz-color-swatch { border: 0; border-radius: 3px; }
.ccgui-background-ui-root .ms-color-field > span { min-width: 0; font-size: 12px; }
.ccgui-background-ui-root .ms-color-field code { display: block; color: var(--ms-muted); font-size: 10px; }
.ccgui-background-ui-root .ms-image-toolbar { display: flex; align-items: center; gap: 8px; margin-top: 12px; }
.ccgui-background-ui-root .ms-image-import { display: flex; align-items: center; gap: 6px; margin-right: auto; padding: 6px 0; border: 0; background: transparent; font-size: 12px; }
.ccgui-background-ui-root .ms-image-preview { height: clamp(180px, 28vh, 300px); margin-top: 8px; overflow: hidden; border-radius: 6px; background: var(--ms-surface); }
.ccgui-background-ui-root .ms-image-preview img { display: block; width: 100%; height: 100%; }
.ccgui-background-ui-root .ms-image-name { margin: 6px 0 10px; overflow: hidden; color: var(--ms-muted); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.ccgui-background-ui-root .ms-image-dim { display: block; margin-top: 12px; }
.ccgui-background-ui-root .ms-background-history { margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--ms-border); }
.ccgui-background-ui-root .ms-history-heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 12px; }
.ccgui-background-ui-root .ms-history-heading span, .ccgui-background-ui-root .ms-history-hint, .ccgui-background-ui-root .ms-history-empty { color: var(--ms-muted); font-size: 11px; }
.ccgui-background-ui-root .ms-history-hint { margin: 8px 0 12px; line-height: 1.6; }
.ccgui-background-ui-root .ms-history-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
.ccgui-background-ui-root .ms-history-item { min-width: 0; overflow: hidden; border: 1px solid var(--ms-border); border-radius: 7px; background: var(--ms-bg); }
.ccgui-background-ui-root .ms-history-use { display: flex; flex-direction: column; width: 100%; min-width: 0; padding: 0 0 8px; border: 0; background: transparent; color: var(--ms-text); text-align: left; }
.ccgui-background-ui-root .ms-history-use[aria-pressed="true"] { background: color-mix(in srgb, var(--ms-accent) 12%, transparent); }
.ccgui-background-ui-root .ms-history-use:hover:not(:disabled) { background: var(--ms-hover); }
.ccgui-background-ui-root .ms-history-thumbnail { display: grid; place-items: center; width: 100%; aspect-ratio: 16 / 9; overflow: hidden; background: var(--ms-surface); color: var(--ms-muted); font-size: 11px; }
.ccgui-background-ui-root .ms-history-thumbnail img { display: block; width: 100%; height: 100%; object-fit: cover; }
.ccgui-background-ui-root .ms-history-use strong { display: block; max-width: 100%; box-sizing: border-box; overflow: hidden; padding: 8px 8px 0; font-size: 12px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.ccgui-background-ui-root .ms-history-use small { padding: 4px 8px 0; color: var(--ms-muted); font-size: 11px; }
.ccgui-background-ui-root .ms-history-delete { display: flex; align-items: center; justify-content: center; gap: 4px; width: 100%; padding: 7px; border: 0; border-top: 1px solid var(--ms-border); background: transparent; color: var(--ms-muted); font-size: 10px; }
.ccgui-background-ui-root .ms-history-delete svg { width: 12px; height: 12px; }
.ccgui-background-ui-root .ms-history-confirm { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; padding: 7px; border-top: 1px solid var(--ms-border); font-size: 10px; }
.ccgui-background-ui-root .ms-history-confirm button { padding: 3px 5px; border: 1px solid var(--ms-border); border-radius: 4px; background: transparent; color: var(--ms-text); font-size: 10px; }
.ccgui-background-ui-root .ms-source-tabs { display: flex; gap: 4px; margin-bottom: 12px; padding: 4px; border: 1px solid var(--ms-border); border-radius: 8px; background: var(--ms-surface); }
.ccgui-background-ui-root .ms-source-tabs button { position: relative; flex: 1; min-width: 0; min-height: 32px; border: 1px solid transparent; border-radius: 6px; background: transparent; color: var(--ms-muted); font-size: 12px; font-weight: 500; transition: color .12s ease, background-color .12s ease, border-color .12s ease, box-shadow .12s ease; }
.ccgui-background-ui-root .ms-source-tabs button:hover:not(:disabled):not([aria-selected="true"]) { background: var(--ms-hover); color: var(--ms-text); }
.ccgui-background-ui-root .ms-source-tabs button[aria-selected="true"] { background: var(--ms-tint); border-color: color-mix(in srgb, var(--ms-accent) 45%, var(--ms-border)); color: var(--ms-accent); font-weight: 650; box-shadow: 0 1px 2px #00000012; }

.ccgui-background-ui-root .ms-theme-modes { display: flex; gap: 4px; padding: 4px; border: 1px solid var(--ms-border); border-radius: 8px; background: var(--ms-surface); }
.ccgui-background-ui-root .ms-theme-modes button { flex: 1; min-width: 0; min-height: 32px; border: 1px solid transparent; border-radius: 6px; background: transparent; color: var(--ms-muted); font-size: 12px; font-weight: 500; transition: color .12s ease, background-color .12s ease, border-color .12s ease, box-shadow .12s ease; }
.ccgui-background-ui-root .ms-theme-modes button:hover:not(:disabled):not([aria-pressed="true"]) { background: var(--ms-hover); color: var(--ms-text); }
.ccgui-background-ui-root .ms-theme-modes button[aria-pressed="true"] { background: var(--ms-bg); border: 2px solid var(--ms-accent); color: var(--ms-accent); font-weight: 700; box-shadow: 0 1px 2px #00000012, 0 4px 14px #00000022; }
.ccgui-background-ui-root .ms-online-gallery { container-type: inline-size; }
.ccgui-background-ui-root .ms-gallery-search-form { display: grid; gap: 10px; padding: 12px; border: 1px solid var(--ms-border); border-radius: 8px; background: var(--ms-surface); }
.ccgui-background-ui-root .ms-gallery-filters { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
.ccgui-background-ui-root .ms-gallery-search-form label { display: flex; min-width: 0; flex-direction: column; gap: 5px; color: var(--ms-muted); font-size: 11px; }
.ccgui-background-ui-root .ms-gallery-search-form select,
.ccgui-background-ui-root .ms-gallery-search-form input { width: 100%; min-width: 0; height: 34px; padding: 5px 9px; border: 1px solid var(--ms-border); border-radius: 6px; background: var(--ms-bg); color: var(--ms-text); font-size: 12px; }
.ccgui-background-ui-root .ms-gallery-search-form input::placeholder { color: var(--ms-muted); }
.ccgui-background-ui-root .ms-gallery-search-form :disabled { opacity: .5; }
.ccgui-background-ui-root .ms-gallery-search-row { display: flex; align-items: flex-end; gap: 10px; }
.ccgui-background-ui-root .ms-gallery-search-row label { flex: 1; }
.ccgui-background-ui-root .ms-gallery-search-button { min-width: 80px; height: 34px; padding: 5px 14px; border: 1px solid var(--ms-accent); border-radius: 6px; background: var(--ms-accent); color: var(--ms-bg); font-size: 12px; font-weight: 600; }
.ccgui-background-ui-root .ms-gallery-search-button:hover:not(:disabled) { filter: brightness(1.1); }
.ccgui-background-ui-root .ms-gallery-toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; margin: 10px 0; }
.ccgui-background-ui-root .ms-gallery-seen-toggle { display: inline-flex; align-items: center; gap: 6px; color: var(--ms-muted); font-size: 11px; cursor: pointer; }
.ccgui-background-ui-root .ms-gallery-seen-toggle input { width: 14px; height: 14px; margin: 0; accent-color: var(--ms-accent); }
.ccgui-background-ui-root .ms-gallery-total { color: var(--ms-muted); font-size: 11px; font-variant-numeric: tabular-nums; }
.ccgui-background-ui-root .ms-gallery-pagination { display: flex; flex-direction: column; align-items: center; gap: 8px; margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--ms-border); }
.ccgui-background-ui-root .ms-gallery-page-summary { color: var(--ms-muted); font-size: 11px; font-variant-numeric: tabular-nums; }
.ccgui-background-ui-root .ms-gallery-page-controls { display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; }
.ccgui-background-ui-root .ms-gallery-page-list { display: flex; align-items: center; justify-content: center; gap: 4px; min-width: 0; }
.ccgui-background-ui-root .ms-gallery-pagination button,
.ccgui-background-ui-root .ms-gallery-actions button,
.ccgui-background-ui-root .ms-gallery-retry { min-height: 32px; padding: 4px 8px; border: 1px solid var(--ms-border); border-radius: 6px; background: var(--ms-bg); color: var(--ms-text); font-size: 12px; }
.ccgui-background-ui-root .ms-gallery-pagination button { display: inline-flex; align-items: center; justify-content: center; gap: 4px; min-width: 32px; font-variant-numeric: tabular-nums; white-space: nowrap; }
.ccgui-background-ui-root .ms-gallery-pagination button:hover:not(:disabled):not([aria-current="page"]) { background: var(--ms-hover); border-color: var(--ms-accent); }
.ccgui-background-ui-root .ms-gallery-pagination button[aria-current="page"] { background: var(--ms-tint); border-color: var(--ms-accent); color: var(--ms-accent); font-weight: 650; }
.ccgui-background-ui-root .ms-gallery-page-ellipsis { min-width: 18px; color: var(--ms-muted); text-align: center; }
.ccgui-background-ui-root .ms-gallery-page-previous > span,
.ccgui-background-ui-root .ms-gallery-page-next > span { font-size: 18px; line-height: 1; }
.ccgui-background-ui-root .ms-gallery-actions { display: flex; gap: 6px; padding: 8px; border-top: 1px solid var(--ms-border); }
.ccgui-background-ui-root .ms-gallery-actions button { flex: 1; }
.ccgui-background-ui-root .ms-gallery-retry { width: calc(100% - 16px); margin: 0 8px 8px; }
.ccgui-background-ui-root .ms-gallery-preview { width: min(960px, calc(100vw - 48px)); max-width: none; max-height: calc(100dvh - 48px); margin: auto; padding: 0; overflow: auto; border: 1px solid var(--ms-border); border-radius: 12px; background: var(--ms-bg); color: var(--ms-text); box-shadow: 0 24px 72px #00000066; }
.ccgui-background-ui-root .ms-gallery-preview[open] { display: flex; flex-direction: column; }
.ccgui-background-ui-root .ms-gallery-preview::backdrop { background: #00000099; }
.ccgui-background-ui-root .ms-gallery-preview-heading { display: flex; flex-shrink: 0; align-items: center; justify-content: space-between; gap: 16px; padding: 16px; }
.ccgui-background-ui-root .ms-gallery-preview-heading > div { display: flex; flex-direction: column; min-width: 0; gap: 4px; }
.ccgui-background-ui-root .ms-gallery-preview-heading strong { font-size: 15px; overflow-wrap: anywhere; }
.ccgui-background-ui-root .ms-gallery-preview-heading > div > span { color: var(--ms-muted); font-size: 12px; }
.ccgui-background-ui-root .ms-gallery-preview-close { display: inline-flex; flex-shrink: 0; align-items: center; gap: 8px; min-height: 34px; padding: 5px 10px; border: 1px solid var(--ms-border); border-radius: 6px; background: var(--ms-surface); font-size: 12px; }
.ccgui-background-ui-root .ms-gallery-preview-close > span { font-size: 20px; line-height: 1; }
.ccgui-background-ui-root .ms-gallery-preview .ms-image-preview { display: grid; place-items: center; height: min(64vh, 720px); min-height: 0; margin: 0 16px; color: var(--ms-muted); }
.ccgui-background-ui-root .ms-gallery-preview .ms-image-preview img { object-fit: contain; }
.ccgui-background-ui-root .ms-gallery-preview-loading { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 24px; }
.ccgui-background-ui-root .ms-gallery-preview-loading button { padding: 6px 14px; border: 1px solid var(--ms-border); border-radius: 6px; background: var(--ms-bg); }
.ccgui-background-ui-root .ms-gallery-preview .ms-status { flex-shrink: 0; margin: 12px 16px 0; }
.ccgui-background-ui-root .ms-gallery-preview .ms-gallery-actions { flex-shrink: 0; align-items: center; flex-wrap: wrap; padding: 16px; border: 0; }
.ccgui-background-ui-root .ms-gallery-preview .ms-gallery-actions button { flex: none; min-width: 120px; min-height: 36px; }
.ccgui-background-ui-root .ms-gallery-preview .ms-gallery-preview-apply { border-color: var(--ms-accent); background: var(--ms-accent); color: var(--ms-bg); font-weight: 600; }
.ccgui-background-ui-root .ms-gallery-preview-hint { margin-left: auto; color: var(--ms-muted); font-size: 11px; }
.ccgui-background-ui-root .ms-theme-toggles { display: grid; grid-template-columns: 1fr 1fr; column-gap: 24px; margin-top: 18px; padding-top: 6px; border-top: 1px solid var(--ms-border); }
.ccgui-background-ui-root .ms-theme-toggle { display: flex; align-items: center; justify-content: space-between; min-width: 0; min-height: 44px; gap: 8px; padding: 8px 0; border: 0; background: transparent; text-align: left; }
.ccgui-background-ui-root .ms-switch { display: inline-flex; align-items: center; width: 30px; height: 18px; flex-shrink: 0; border-radius: 10px; background: color-mix(in srgb, var(--ms-muted) 45%, var(--ms-bg)); transition: background 150ms; pointer-events: none; }
.ccgui-background-ui-root [aria-checked="true"] .ms-switch { background: var(--ms-accent); }
.ccgui-background-ui-root .ms-switch > span { width: 14px; height: 14px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px #0003; transform: translateX(2px); transition: transform 150ms; }
.ccgui-background-ui-root [aria-checked="true"] .ms-switch > span { transform: translateX(14px); }
.ccgui-background-ui-root .ms-effort-track { position: relative; width: 100%; height: 27px; overflow: hidden; border-radius: 8px; background: var(--ms-surface); }
.ccgui-background-ui-root .ms-effort-fill { position: absolute; inset: 0 auto 0 0; border-radius: 8px; background: var(--color-background-tertiary-hover, var(--ms-hover)); transition: width 150ms ease-out; pointer-events: none; }
.ccgui-background-ui-root .ms-range { appearance: none; position: relative; display: block; width: 100%; height: 27px; padding: 0; margin: 0; border: 0; border-radius: 8px; background: transparent; cursor: grab; touch-action: none; }
.ccgui-background-ui-root .ms-range:active { cursor: grabbing; }
.ccgui-background-ui-root .ms-range:disabled { cursor: not-allowed; }
.ccgui-background-ui-root .ms-range::-webkit-slider-runnable-track { height: 27px; border: 0; background: transparent; }
.ccgui-background-ui-root .ms-range::-webkit-slider-thumb { appearance: none; width: 21px; height: 27px; border: 1px solid var(--color-border-checkbox-default, var(--ms-border)); border-radius: 7px; background: var(--ms-bg); box-shadow: 0 1px 2px #0000000d; }
.ccgui-background-ui-root .ms-range::-moz-range-track { height: 27px; border: 0; background: transparent; }
.ccgui-background-ui-root .ms-range::-moz-range-thumb { box-sizing: border-box; width: 21px; height: 27px; border: 1px solid var(--color-border-checkbox-default, var(--ms-border)); border-radius: 7px; background: var(--ms-bg); }
@container background-settings (max-width: 600px) {
  .ccgui-background-ui-root .ms-history-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .ccgui-background-ui-root .ms-theme { padding: 14px 12px; }
  .ccgui-background-ui-root .ms-theme-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .ccgui-background-ui-root .ms-theme-sliders,
  .ccgui-background-ui-root .ms-theme-toggles { grid-template-columns: 1fr; }
}
@media (max-width: 600px) {
  .ccgui-background-ui-root .ms-gallery-preview { width: calc(100vw - 24px); max-height: calc(100dvh - 24px); border-radius: 10px; }
  .ccgui-background-ui-root .ms-gallery-preview .ms-image-preview { margin: 0 12px; }
  .ccgui-background-ui-root .ms-gallery-preview .ms-image-preview:has(img) { height: auto; flex-shrink: 0; }
  .ccgui-background-ui-root .ms-gallery-preview .ms-image-preview img { height: auto; max-height: min(64vh, calc(100dvh - 200px)); }
  .ccgui-background-ui-root .ms-gallery-preview-heading,
  .ccgui-background-ui-root .ms-gallery-preview .ms-gallery-actions { padding: 12px; }
}
@container background-settings (min-width: 940px) {
  .ccgui-background-ui-root .ms-theme:has(.ms-online-gallery) { padding: 12px 18px; }
  .ccgui-background-ui-root .ms-image-settings:has(.ms-online-gallery) { display: grid; grid-template-columns: minmax(0, 1fr) auto; column-gap: 12px; }
  .ccgui-background-ui-root .ms-image-settings:has(.ms-online-gallery) > * { grid-column: 1 / -1; }
  .ccgui-background-ui-root .ms-image-settings:has(.ms-online-gallery) > .ms-theme-modes:first-child { grid-column: 1; }
  .ccgui-background-ui-root .ms-image-settings:has(.ms-online-gallery) > .ms-image-toolbar { grid-column: 2; grid-row: 1; margin-top: 0; }
  /* The current background stays available in history; reserve this view for browsing. */
  .ccgui-background-ui-root .ms-image-settings:has(.ms-online-gallery) > .ms-image-preview,
  .ccgui-background-ui-root .ms-image-settings:has(.ms-online-gallery) > .ms-image-name,
  .ccgui-background-ui-root .ms-image-settings:has(.ms-online-gallery) > .ms-theme-modes:not(:first-child),
  .ccgui-background-ui-root .ms-image-settings:has(.ms-online-gallery) > .ms-image-dim { display: none; }
}
@container (min-width: 900px) {
  .ccgui-background-ui-root .ms-gallery-search-form { grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); }
  .ccgui-background-ui-root .ms-gallery-toolbar { margin: 8px 0; }
  .ccgui-background-ui-root .ms-online-gallery > .ms-history-hint { margin: 6px 0 8px; }
  .ccgui-background-ui-root .ms-online-gallery .ms-history-grid { grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 8px; }
  .ccgui-background-ui-root .ms-online-gallery .ms-history-use { position: relative; padding: 0; }
  .ccgui-background-ui-root .ms-online-gallery .ms-history-thumbnail { position: relative; max-height: clamp(60px, calc((100dvh - 500px) / 4 - 39px), 108px); }
  .ccgui-background-ui-root .ms-online-gallery .ms-history-thumbnail::after { position: absolute; inset: 0; background: linear-gradient(transparent 35%, #000000bb); content: ""; pointer-events: none; }
  .ccgui-background-ui-root .ms-online-gallery .ms-history-use strong,
  .ccgui-background-ui-root .ms-online-gallery .ms-history-use small { position: absolute; z-index: 1; left: 0; width: 100%; padding: 0 7px; overflow: hidden; color: #fff; text-overflow: ellipsis; white-space: nowrap; pointer-events: none; }
  .ccgui-background-ui-root .ms-online-gallery .ms-history-use strong { bottom: 20px; }
  .ccgui-background-ui-root .ms-online-gallery .ms-history-use small { bottom: 4px; font-size: 10px; }
  .ccgui-background-ui-root .ms-online-gallery .ms-history-item > .ms-gallery-actions { gap: 5px; padding: 4px; }
  .ccgui-background-ui-root .ms-online-gallery .ms-history-item > .ms-gallery-actions button { min-width: 0; min-height: 28px; padding: 3px 4px; font-size: 11px; white-space: nowrap; }
  .ccgui-background-ui-root .ms-gallery-pagination { flex-direction: row; justify-content: center; gap: 12px; margin-top: 8px; padding-top: 8px; }
  .ccgui-background-ui-root .ms-gallery-page-summary { flex-shrink: 0; }
  .ccgui-background-ui-root .ms-gallery-page-controls { width: auto; }
}
@media (max-height: 850px) {
  @container background-settings (min-width: 940px) {
    .ccgui-background-ui-root .ms-theme:has(.ms-online-gallery) { padding-block: 8px; }
    .ccgui-background-ui-root .ms-image-settings:has(.ms-online-gallery) > .ms-theme-modes:first-child,
    .ccgui-background-ui-root .ms-image-settings:has(.ms-online-gallery) > .ms-image-toolbar { display: none; }
    .ccgui-background-ui-root .ms-background-history:has(.ms-online-gallery) { margin-top: 0; padding-top: 0; border-top: 0; }
    .ccgui-background-ui-root .ms-background-history:has(.ms-online-gallery) > .ms-source-tabs { margin-bottom: 8px; }
  }
  @container (min-width: 900px) {
    .ccgui-background-ui-root .ms-gallery-search-form { grid-template-columns: minmax(0, 5fr) minmax(0, 2fr); padding: 8px; gap: 8px; }
    .ccgui-background-ui-root .ms-gallery-filters { grid-template-columns: 1fr .8fr 1.5fr .8fr; }
    .ccgui-background-ui-root .ms-gallery-search-form label { flex-direction: row; align-items: center; gap: 6px; white-space: nowrap; }
    .ccgui-background-ui-root .ms-gallery-search-form select,
    .ccgui-background-ui-root .ms-gallery-search-form input,
    .ccgui-background-ui-root .ms-gallery-search-button { height: 30px; }
    .ccgui-background-ui-root .ms-gallery-search-row { align-items: center; gap: 8px; }
    .ccgui-background-ui-root .ms-gallery-toolbar { margin: 6px 0; }
    .ccgui-background-ui-root .ms-online-gallery > .ms-history-hint { margin: 4px 0 6px; }
  }
}
@container (max-width: 560px) {
  .ccgui-background-ui-root .ms-gallery-filters { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .ccgui-background-ui-root .ms-online-gallery .ms-history-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .ccgui-background-ui-root .ms-gallery-page-controls { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
  .ccgui-background-ui-root .ms-gallery-page-previous { grid-column: 1; grid-row: 1; justify-self: start; }
  .ccgui-background-ui-root .ms-gallery-page-next { grid-column: 2; grid-row: 1; justify-self: end; }
  .ccgui-background-ui-root .ms-gallery-page-list { grid-column: 1 / -1; grid-row: 2; flex-wrap: wrap; }
}
@container (max-width: 280px) {
  .ccgui-background-ui-root .ms-gallery-filters { grid-template-columns: 1fr; }
}
@media (prefers-reduced-motion: reduce) {
  .ccgui-background-ui-root *,
  .ccgui-background-ui-root *::before { transition: none !important; }
}
`;
