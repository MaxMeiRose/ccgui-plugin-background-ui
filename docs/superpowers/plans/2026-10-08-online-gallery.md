# Online Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** 接入壁纸 API V2.0，完成分类搜索、预览、应用、持久化历史和设置页整合。

**Architecture:** 插件通过授权 HTTP bridge 查询 JSON 和下载 base64 原图。适配器负责契约及传输，管理器负责现有存储，React 组件负责查询与选择。宿主添加可选编码模式并保持文本兼容。

**Tech Stack:** TypeScript、React 18（ctx.react）、Vite、Node 内置断言测试；CC GUI Rust/Tauri、Vitest。

**Spec:** `../specs/2026-10-08-online-gallery-design.md`

## Global Constraints

- 插件交付目录为 `D:/temp/dist/ccgui-plugin-background-ui`，根入口不包含运行时 import。
- 所有出网经过 `ctx.bridge.invoke`，不使用 exec 或浏览器远程图片请求。
- 历史保留 20 张/120 MiB、单个本地文件 12 MiB；在线请求原始响应不超过宿主 8 MiB。
- API 每批最多 10 张，无真实分页；旧记录兼容，预览不自动保存/应用。
- 保留宿主既有工作区改动，不提交或推送。

### Task 1: 宿主可选 base64 HTTP 响应

**Files:** `D:/temp/dist/desktop-cc-gui/src-tauri/src/plugin_caps.rs`；`packages/plugin-sdk/src/context.ts`、`plugin.d.ts`、版本与 CHANGELOG；对应 runtime 测试与生成的 SDK 说明。

**Interface produced:** `invoke('plugin_http_request', {method:'GET',url,responseEncoding:'base64'})` 返回 `{status,body,encoding:'base64',contentType,byteLength,url}`。省略 encoding 保留原响应形状。

- [ ] 写二进制编码、旧文本模式、超限、无效编码和重定向授权回归，先观察失败。
- [ ] 实现原始字节读取后按选定编码返回；限制大小、HTTP(S)、域名与重定向凭据。
- [ ] 更新 SDK 公共文档和版本，运行受影响 Rust/Vitest/SDK 检查并生成 skill 文档。
- [ ] 自查已有改动未被撤销，报告宿主构建/重启要求。

### Task 2: 插件 API 适配与统一历史

**Files:** 新增 `src/wallpaper-api.ts`、`scripts/check-wallpaper-api.mjs`；修改 `src/background-history.ts`、`src/theme-manager.ts`、对应历史检查。

**Interfaces:** `WallpaperQuery {category, keyword, resolution}`；`Wallpaper {url,title,source,width,height}`；适配器通过注入的 bridge 查询并解码图片；管理器提供查询、读取在线图片和仅保存历史的方法。

- [ ] 先写用例：关键词编码/分类互斥、单/多响应、重复和未知域名、限流、base64 精确字节及旧宿主拒绝。
- [ ] 实现限定来源、错误反馈及有界缓存，复用 `readBackgroundFile` 验证实际图片。
- [ ] 给历史增加可选来源字段；覆盖旧索引兼容、深复制、内容去重、持久化失败和重启。
- [ ] 运行 `node --experimental-strip-types scripts/check-wallpaper-api.mjs` 与历史/导入检查。

### Task 3: 设置页与在线选图

**Files:** `src/components/ThemeSettingsPanel.tsx`、`ThemeCustomizationPanel.tsx`、新背景/在线图库组件、`settings-panel-styles.ts`；浏览器检查页。

- [ ] 扩展浏览器用例，验证打开在线页签才查询、分类与搜索、预览不应用、应用/仅保存、离线历史、失败及卸载晚到结果。
- [ ] 实现三级主页面和背景来源切换；用请求序号/清理函数处理旧响应。
- [ ] 实现受限并发缩略图加载、图片预览和明确的保存/应用反馈，保持原有本地导入、调色与界面开关。
- [ ] 浏览器检查亮/暗与窄屏，修复发现的布局及交互问题。

### Task 4: 交付与复核

**Files:** `manifest.json`、`package.json`、锁文件版本、README、根构建产物、`checksums.txt`。

- [ ] 对实际请求域名声明最小网络权限，更新插件版本与宿主 SDK 要求。
- [ ] 执行 `npm run validate`、`npm run build` 与浏览器回归，核对生成入口/校验摘要。
- [ ] 独立复核跨模块链路，修复重要问题并运行覆盖检查。
- [ ] 交付安装目录和文档，准确区分原生/模拟验证与正在运行的宿主状态。
