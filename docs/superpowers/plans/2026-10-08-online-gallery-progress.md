# SDD ledger — plan: docs/superpowers/plans/2026-10-08-online-gallery.md

- API 官方文档与 3 次真实 JSON 查询已由研究代理核对，原始证据见 docs/wallpaper-api-v2.md。
- 用户已明确“设计和执行”，并追问可实现性；持续执行，不增加重复设计批准步骤。
- Ruling: 原生 HTTP bridge 增加可选 base64 模式 — 当前 UTF-8 lossy 会破坏图片，持久化历史必须取得真实字节 — 需要重建或更新宿主。
- Ruling: 插件按指定可安装目录直接迭代 — 该目录不是 Git 仓库 — 保留已有文件和构建工作流。
- Ruling: 宿主已有其他任务未提交改动 — 只叠加本次相关变更，不提交/推送或撤销既有内容。
- Ruling: 使用当前可工作的继承模型 — 前次显式 gpt-6-sol 调用曾初始化 503 — 避免重复等待不可用模型。

| Tasks sharing interface | Producer | Consumer | Resolution |
| --- | --- | --- | --- |
| 1 / 2 | HTTP responseEncoding=base64, encoding/body/contentType/byteLength/url | 图片解码适配器 | 插件要求显式 encoding marker，旧宿主报升级提示 |
| 2 / 3 | 在线查询/读取/仅保存；历史可选来源 | 在线图库及历史组件 | 预览不修改配置；保存成功后才反馈 |
| 3 / 4 | JSX 与 CSS 源码 | Vite 根目录产物 | 只由构建生成 main.js/styles.css |

- Task 1: host source already returns optional base64; public SDK docs still describe text-only responses. Plugin requires the encoding marker and tells older hosts to update.
- Task 2: wallpaper adapter and optional history source already present; manager now searches, previews, and saves into the same history.
- Task 3: settings background area has history / online gallery / local import. Preview does not write history; apply and save-only do.
- Task 4: plugin version 0.2.0 declares the verified image hosts. Running desktop must include the base64 bridge before online images can be saved.
