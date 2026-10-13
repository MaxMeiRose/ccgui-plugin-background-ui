// Scoped styles prevent this plugin from changing similarly named controls in other plugins.
export const settingsPanelStyles = `
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
  max-width: 920px;
  min-width: 0;
  border: 1px solid var(--ms-border);
  border-radius: 8px;
  background: var(--ms-bg);
  color: var(--ms-text);
  font: 13px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif;
  letter-spacing: 0;
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
.ccgui-background-ui-root input { font: inherit; letter-spacing: 0; }
.ccgui-background-ui-root button { color: inherit; cursor: pointer; }
.ccgui-background-ui-root button:disabled { opacity: .4; cursor: not-allowed; }
.ccgui-background-ui-root button:focus-visible,
.ccgui-background-ui-root input:focus-visible { outline: 2px solid var(--ms-accent); outline-offset: 2px; }
.ccgui-background-ui-root svg { flex-shrink: 0; }
.ccgui-background-ui-root .ms-theme { width: 100%; padding: 16px 18px; }
.ccgui-background-ui-root .ms-theme-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.ccgui-background-ui-root .ms-theme-heading h3 { margin: 0; color: var(--ms-text); font-size: 16px; font-weight: 650; }
.ccgui-background-ui-root .ms-status { margin-bottom: 12px; padding: 8px 10px; border: 1px solid var(--ms-border); border-radius: 6px; background: var(--ms-tint); color: var(--ms-text); font-size: 12px; overflow-wrap: anywhere; }
.ccgui-background-ui-root .ms-icon-button { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; padding: 0; border: 1px solid transparent; border-radius: 6px; background: transparent; color: var(--ms-muted); }
.ccgui-background-ui-root .ms-icon-button:hover:not(:disabled) { background: var(--ms-hover); color: var(--ms-text); }
.ccgui-background-ui-root .ms-theme-modes { display: flex; gap: 3px; padding: 3px; border: 1px solid var(--ms-border); border-radius: 6px; background: var(--ms-surface); }
.ccgui-background-ui-root .ms-theme-modes button { flex: 1; min-width: 0; min-height: 30px; border: 0; border-radius: 4px; background: transparent; color: var(--ms-muted); font-size: 12px; }
.ccgui-background-ui-root .ms-theme-modes button[aria-pressed="true"] { background: var(--ms-bg); color: var(--ms-text); box-shadow: 0 1px 3px #00000016; }
.ccgui-background-ui-root .ms-palette-mode { margin-bottom: 14px; }
.ccgui-background-ui-root .ms-theme-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
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
.ccgui-background-ui-root .ms-image-preview { height: 112px; margin-top: 8px; overflow: hidden; border-radius: 6px; background: var(--ms-surface); }
.ccgui-background-ui-root .ms-image-preview img { display: block; width: 100%; height: 100%; }
.ccgui-background-ui-root .ms-image-name { margin: 6px 0 10px; overflow: hidden; color: var(--ms-muted); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.ccgui-background-ui-root .ms-image-dim { display: block; margin-top: 12px; }
.ccgui-background-ui-root .ms-background-history { margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--ms-border); }
.ccgui-background-ui-root .ms-history-heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 12px; }
.ccgui-background-ui-root .ms-history-heading span, .ccgui-background-ui-root .ms-history-hint, .ccgui-background-ui-root .ms-history-empty { color: var(--ms-muted); font-size: 11px; }
.ccgui-background-ui-root .ms-history-hint { margin: 8px 0 12px; line-height: 1.6; }
.ccgui-background-ui-root .ms-history-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.ccgui-background-ui-root .ms-history-item { min-width: 0; overflow: hidden; border: 1px solid var(--ms-border); border-radius: 7px; background: var(--ms-bg); }
.ccgui-background-ui-root .ms-history-use { display: flex; flex-direction: column; width: 100%; min-width: 0; padding: 0 0 8px; border: 0; background: transparent; color: var(--ms-text); text-align: left; }
.ccgui-background-ui-root .ms-history-use[aria-pressed="true"] { background: color-mix(in srgb, var(--ms-accent) 12%, transparent); }
.ccgui-background-ui-root .ms-history-use:hover:not(:disabled) { background: var(--ms-hover); }
.ccgui-background-ui-root .ms-history-thumbnail { display: grid; place-items: center; width: 100%; aspect-ratio: 16 / 9; overflow: hidden; background: var(--ms-surface); color: var(--ms-muted); font-size: 11px; }
.ccgui-background-ui-root .ms-history-thumbnail img { display: block; width: 100%; height: 100%; object-fit: cover; }
.ccgui-background-ui-root .ms-history-use strong { display: block; max-width: 100%; box-sizing: border-box; overflow: hidden; padding: 8px 8px 0; font-size: 11px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.ccgui-background-ui-root .ms-history-use small { padding: 4px 8px 0; color: var(--ms-muted); font-size: 10px; }
.ccgui-background-ui-root .ms-history-delete { display: flex; align-items: center; justify-content: center; gap: 4px; width: 100%; padding: 7px; border: 0; border-top: 1px solid var(--ms-border); background: transparent; color: var(--ms-muted); font-size: 10px; }
.ccgui-background-ui-root .ms-history-delete svg { width: 12px; height: 12px; }
.ccgui-background-ui-root .ms-history-confirm { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; padding: 7px; border-top: 1px solid var(--ms-border); font-size: 10px; }
.ccgui-background-ui-root .ms-history-confirm button { padding: 3px 5px; border: 1px solid var(--ms-border); border-radius: 4px; background: transparent; color: var(--ms-text); font-size: 10px; }
.ccgui-background-ui-root .ms-source-tabs { display: flex; gap: 3px; margin-bottom: 12px; padding: 3px; border: 1px solid var(--ms-border); border-radius: 6px; background: var(--ms-surface); }
.ccgui-background-ui-root .ms-source-tabs button { flex: 1; min-width: 0; min-height: 30px; border: 0; border-radius: 4px; background: transparent; color: var(--ms-muted); font-size: 12px; }
.ccgui-background-ui-root .ms-source-tabs button[aria-selected="true"] { background: var(--ms-bg); color: var(--ms-text); box-shadow: 0 1px 3px #00000016; }
.ccgui-background-ui-root .ms-gallery-filters { display: grid; grid-template-columns: 1fr 1.4fr .9fr auto; gap: 8px; align-items: end; }
.ccgui-background-ui-root .ms-gallery-filters label { display: flex; min-width: 0; flex-direction: column; gap: 4px; color: var(--ms-muted); font-size: 11px; }
.ccgui-background-ui-root .ms-gallery-filters select,
.ccgui-background-ui-root .ms-gallery-filters input { width: 100%; min-width: 0; min-height: 32px; padding: 4px 8px; border: 1px solid var(--ms-border); border-radius: 6px; background: var(--ms-bg); color: var(--ms-text); }
.ccgui-background-ui-root .ms-gallery-filters > button,
.ccgui-background-ui-root .ms-gallery-actions button,
.ccgui-background-ui-root .ms-gallery-retry { min-height: 32px; padding: 4px 8px; border: 1px solid var(--ms-border); border-radius: 6px; background: var(--ms-bg); color: var(--ms-text); font-size: 12px; }
.ccgui-background-ui-root .ms-gallery-actions { display: flex; gap: 6px; padding: 8px; border-top: 1px solid var(--ms-border); }
.ccgui-background-ui-root .ms-gallery-actions button { flex: 1; }
.ccgui-background-ui-root .ms-gallery-retry { width: calc(100% - 16px); margin: 0 8px 8px; }
.ccgui-background-ui-root .ms-gallery-preview { margin-top: 12px; padding: 8px; border: 1px solid var(--ms-border); border-radius: 8px; background: var(--ms-surface); }
.ccgui-background-ui-root .ms-gallery-preview .ms-image-preview { display: grid; place-items: center; height: 220px; color: var(--ms-muted); }
.ccgui-background-ui-root .ms-gallery-preview .ms-gallery-actions { border-top: 0; padding: 8px 0 0; }
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
@media (max-width: 600px) {
  .ccgui-background-ui-root .ms-history-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .ccgui-background-ui-root .ms-gallery-filters { grid-template-columns: 1fr; }
  .ccgui-background-ui-root .ms-theme { padding: 14px 12px; }
  .ccgui-background-ui-root .ms-theme-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .ccgui-background-ui-root .ms-theme-sliders,
  .ccgui-background-ui-root .ms-theme-toggles { grid-template-columns: 1fr; }
}
@media (prefers-reduced-motion: reduce) {
  .ccgui-background-ui-root *,
  .ccgui-background-ui-root *::before { transition: none !important; }
}
`;
