import "./styles.css";

import { React, initReact } from "./react-context";
import type { Disposer, PluginContext } from "./ccgui-plugin";
import { ThemeSettingsPanel } from "./components/ThemeSettingsPanel";
import { settingsPanelStyles } from "./components/settings-panel-styles";
import { GuiThemeManager } from "./theme-manager";

function AppearanceIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 3a9 9 0 1 0 9 9c0-1.1-.9-2-2-2h-2.2a2 2 0 0 1-2-2V5.8c0-1.55-1.25-2.8-2.8-2.8Z" />
      <circle cx="7.5" cy="10" r="1" fill="currentColor" stroke="none" />
      <circle cx="10" cy="6.8" r="1" fill="currentColor" stroke="none" />
      <circle cx="7.8" cy="14" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** 独立的背景与界面优化插件入口。 */
export default function activate(ctx: PluginContext): Disposer {
  initReact(ctx.react);

  const manager = new GuiThemeManager(ctx);
  void manager.init();

  function AppearanceSettings() {
    return (
      <div className="ccgui-background-ui-root">
        <style>{settingsPanelStyles}</style>
        <ThemeSettingsPanel manager={manager} />
      </div>
    );
  }

  const unregister = ctx.ui.registerSettingsSection({
    key: "background-ui-settings",
    label: () => "背景和 UI 优化",
    icon: AppearanceIcon,
    component: AppearanceSettings,
  });

  return () => {
    unregister();
    manager.dispose();
  };
}
