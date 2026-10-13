# 公开壁纸／图片库与 CC GUI 接入研究

核验日期：**2026-09-30**；时区 Asia/Shanghai。对象是公开可查看、可下载的来源，而非仅能打开首页的站点。

## 2026-10-08 复核：Commons 与 4 MB JPEG 导入

- 无 key 请求 Commons `generator=search`、`prop=imageinfo` 成功返回 HTTP 200、两条文件和 `continue` 分页对象。原图域名为 `upload.wikimedia.org`，缩略图域名为 `thumb.wikimedia.org`。此次样本分别为 4,666,555 bytes、3008×2000、CC BY-SA 2.5，以及 4,335,061 bytes、3872×2592、CC BY 3.0。
- 第一条样本的缩略图 GET 返回 HTTP 200、`image/jpeg`、27,299 bytes。将字节按 UTF-8 文本往返转换后原图字节不一致；现有宿主 `plugin_http_request` 的文本返回接口仍不足以无损传递 Commons JPEG。搜索可接不代表完整查看／下载／应用已实现。
- 未增加不完整的在线入口或绕过授权的浏览器请求。完整产品方案需要宿主提供受现有网络授权约束的二进制返回模式，并继续校验域名／重定向、真实字节限额、MIME 与许可；在线下载完成后再进入本地壁纸历史。
- 新增 `scripts/check-jpeg-import.html`：浏览器生成真实可解码、精确 4 MiB 的 JPEG，用有效 JPEG COM 段补足文件体积，并逐字节检查导入数据未改变；测试原图读取、历史保存、CSS 背景、重启恢复和历史切换，结果 PASS。
- 额外从 Commons 下载真实 `Landscape_Arnisee-region.JPG`（4,666,555 bytes），在 Chromium 中通过 `readBackgroundFile`、`GuiThemeManager.updateConfig`、重新初始化与 `selectBackground` 测试，结果 PASS。临时图片只用于验证，不打包进插件。
- 上述持久化测试使用模拟的 PluginContext 存储／CSS 接口，**不是实际桌面宿主 IPC 的端到端验收**。当前机器安装的插件为 0.1.2；只读核对该插件历史仅三张、原图总计 779,907 bytes，未满 20 张／120 MiB 配额；未修改实际用户配置或背景。
- **尚未复现用户的那张 4 MB JPG 导入失败，不能宣称已经修复。** 文件大小不是唯一门槛：还检查格式、解码与 4000 万像素上限；也可能在实际桌面存储／CSS 环节失败。需要用户提供失败原图路径与准确报错，再针对同一文件建立失败回归；不猜测或直接调大限额。

以下为 2026-09-30 的原始调研记录与来源。

## 结论与证据边界

1. **不能断言所有公开图库都不能接。** 本轮 Wallhaven、Wikimedia Commons、GitHub 官方接口匿名请求成功；GitHub 官方 JSON/base64 可在现有文本桥接内传递图片，不需要绕过插件网络授权。
2. **搜索、原图地址、下载传输、内容许可是四件事。** Wallhaven/Commons 的搜索、续页和原图字节均成功；但普通 JPEG/PNG 经当前 bridge 的 UTF-8 lossy 转换会损坏。GitHub Blob 的 JSON/base64 是现有桥接可承载的例外。
3. **推荐：许可审查后的 GitHub 小文件源先做完整传输试点；Commons 作为优先原生图库，待宿主二进制模式；Wallhaven 作为公开 SFW 搜索源。** Unsplash/Pexels 不是免 key 默认源；还需审查产品形态的 API 合规性，尤其 Unsplash 不宜强制用户申请个人开发者 key。[W1][C1][U2][G1]
4. **能下载不等于能商业再分发。** Commons 逐文件核对；Wallhaven 保留原作者权利；收集型 GitHub 仓库的 MIT 不证明外来图片都获得 MIT 授权；图片许可也不等同于 API 条款。[W2][C1][U2][R1]

核验方法：调用 `web.run` 查询／打开官方资料，初期未返回正文，后续成功获取 GitHub 官方 Blob 文档、Unsplash API 指南、Pexels 帮助页等。另用命令行 Node `fetch` 直接 GET 官方文档、第一方 API 和其返回的图像地址，在内存中核对 HTTP 状态、字段、文件字节和 Git blob SHA；未将测试图片保存到工作区。下列“实测成功”指当前机器出口的 HTTP 请求，**不等于 CC GUI 插件在线图库 UI 已端到端运行**。许可结论是产品工程风险判断，不是逐图法律担保。

## 1. 当前 SDK：真正受限的是二进制桥接

只读核对本机源码：

- `D:\temp\dist\desktop-cc-gui\packages\plugin-sdk\src\context.ts:246`、`packages\plugin-sdk\plugin.d.ts:311`：`ctx.bridge.invoke('plugin_http_request', { method, url, headers?, body? })` 返回 `{ status, body }`。
- `D:\temp\dist\desktop-cc-gui\src-tauri\src\plugin_caps.rs:51`：连接 10 秒、请求 30 秒；响应体上限 `8 * 1024 * 1024` bytes，即 **8 MiB**。
- `plugin_caps.rs:405`：响应只有 `status: u16`、`body: String`；没有响应头、MIME、最终 URL 或字节数组。
- `plugin_caps.rs:438` 的 `read_body_capped` 按实际接收字节限额，最后在第 454 行执行 `String::from_utf8_lossy(&bytes)`；第 486 行 HTTP 入口校验网络授权，非 2xx 仍返回 status/body。

普通 JPEG/PNG → lossy 字符串 → 再编码，不能恢复原字节。本轮 Wallhaven 原图／缩略图、Commons 原图／缩略图、GitHub raw PNG 的这一往返对比都为 `false`。**在插件里对已经 lossy 的 body 再 base64、改 `Accept`、调用 JSON.parse 都不能修复。**

插件出网必须走 bridge。拿到 `thumburl`/`path` 后直接设 `<img src="https://…">`、CSS 背景 URL、直接 `fetch`、iframe、调用外部 curl 等，仍是另一条出网路径，**不作为本报告的接入建议**。没有二进制能力时可以请求列表／许可 JSON，但不能据此承诺远程缩略图、离线缓存或原图背景已经可用。

现有网络权限按精确域名／端口检查，不自动覆盖子域。API 域名与图片域名须分别显式授权。例如 Wallhaven 使用 `wallhaven.cc`、`w.wallhaven.cc`、`th.wallhaven.cc`；本轮 Commons 返回 `commons.wikimedia.org`、`upload.wikimedia.org`、`thumb.wikimedia.org`。GitHub Blob 路线只需 `api.github.com`，无需为了图片额外走 raw 域名。

## 2. 服务能力与本轮结果

| 来源 | 免密／凭据 | 搜索、分页、原图 | 本轮验证 | 当前 bridge 完整图片接入 |
| --- | --- | --- | --- | --- |
| Wallhaven | 公开 SFW 免 key；NSFW／个人功能需账户 key | `q`、`page`；每页 24；`path` 原图、`thumbs` 缩略图 | 两页搜索 200；原图与缩略图 200 | JSON 可以；普通图片必须二进制增强 |
| Wikimedia Commons | 公共读取免 key | namespace=6 搜索；`continue`；`imageinfo.url/thumburl`、尺寸、MIME、许可 | 搜索与续页 200；原图与缩略图 200 | JSON 可以；普通图片必须二进制增强 |
| Unsplash | API 需要应用 Access Key，非用户登录密码 | 官方文档有 `/search/photos`、`page/per_page`、`urls`、`download_location` | 无 key 401；文档／指南 200；未测带 key 搜索 | 技术上需凭据和图片通道；另有壁纸产品、热链条款障碍 |
| Pexels | API 需要账户申请的 key | 搜索端点存在；常见文档字段 `page/per_page/next_page/src.original` 本轮未获官方正文复核 | API 无 key 401；官网文档／许可页挑战 403；未测带 key | 获取凭据并完成合规复核，再谈二进制 |
| 公开 GitHub 仓库 | 公共读取一般免 token，可选个人 token 提高额度 | Contents／Trees 枚举；**不是图库语义搜索或目录分页 API**；Blob JSON/base64 | 两仓库枚举 200；图片 Contents／Blob base64 200 | **可先接入限大小的官方 JSON/base64**；许可与额度另审 |

### 2.1 Wallhaven：公开搜索和原图确实存在

官方 API 文档及条款正文本轮均 GET 200。[W1][W2]

```text
GET https://wallhaven.cc/api/v1/search?q=nature&purity=100&page=1
HTTP 200；24 条
meta: current_page=1, last_page=3056, per_page=24, total=73344
GET https://wallhaven.cc/api/v1/search?q=nature&purity=100&page=2
HTTP 200；24 条（分页请求实际成功）

第一页样本：id=1qo2l9，4000x3000，purity=sfw
GET https://w.wallhaven.cc/full/1q/wallhaven-1qo2l9.jpg
HTTP 200；image/jpeg；3266744 bytes
GET https://th.wallhaven.cc/small/1q/1qo2l9.jpg
HTTP 200；image/jpeg；20267 bytes
```

- 文档支持 `q`、分类、purity、分辨率、排序、`page`，公开 SFW 不需 key；NSFW 要有效 key。响应有 `path` 原图及 `thumbs`。不要把“某些功能需 key”扩大为“所有搜索都需 key”。[W1]
- 本轮搜索响应头 `X-RateLimit-Limit=45`、某次 `Remaining=43`；仅代表当前请求观察。生产端应缓存、消抖、限并发，遇 429 等退避；目前 bridge 不传响应头，无法可靠读取 quota/reset/Retry-After。
- 站点页脚与条款强调图片仍属原作者。API 中 `source` 可能为空，本轮样本就是空值；不能把上传者当作摄影师，也不能推导所有图有商用许可。[W2]
- 本轮图片域名公开 GET 成功，API 也正式提供图片 URL；这不证明“任意热链／永不限流”，更不是商业镜像或素材再分发授权。保留 Wallhaven 图片页、ID、作者来源（如有），权利不明时不打包分发。

已复现用户提供的前轮转换失败：

```text
GET https://wsrv.nl/?url=w.wallhaven.cc/full/1q/wallhaven-1qo2l9.jpg
HTTP 400
{"status":"error","code":400,"message":"Domain or TLD blocked by policy"}
```

这说明本轮该域名被转换服务策略拒绝，不表示 Wallhaven 本身不可下载；不推荐继续依赖无保障公共转换代理，也不建议绕过该策略。

### 2.2 Wikimedia Commons：免 key，许可元数据与分页可用

MediaWiki `Imageinfo`、Commons 复用说明、Wikimedia API 使用规范正文均本轮 GET 200。[C1][C2][C3]

```text
GET https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&generator=search&gsrsearch=landscape%20filetype:bitmap&gsrnamespace=6&gsrlimit=2&prop=imageinfo&iiprop=url%7Csize%7Cmime%7Cextmetadata&iiurlwidth=320
HTTP 200；2 个文件；continue: {gsroffset:2, continue:"gsroffset||"}
将完整 continue 对象合并到下一次请求：HTTP 200；另 2 个文件；gsroffset=4
```

样本：`File:Landscape Arnisee-region.JPG`，3008×2000，4,666,555 bytes，CC BY-SA 2.5、要求署名；另一条 `Landscape during Laugavegur hiking trail 2-CA reduced.jpg` 为 CC BY 3.0。API 返回 `url`、`thumburl`、`descriptionurl`、`mime`、尺寸、文件大小和 `extmetadata`。[C2]

```text
GET https://upload.wikimedia.org/wikipedia/commons/1/14/Landscape_Arnisee-region.JPG
HTTP 200；image/jpeg；4666555 bytes
API 返回的 thumb.wikimedia.org 缩略图：HTTP 200；27299 bytes
```

实际下载使用 API 返回的完整 URL（本轮附带 utm 参数）；上述原图地址为去掉查询参数后的识别地址。部分其他搜索结果为 19,583,454 bytes，远超当前 bridge 上限，不能只解决编码而忽略大小。

Commons 允许按文件许可下载／热链；复用页提醒核对许可真实性、作者、署名、改动说明及人物肖像、商标等其他权利。CC BY／BY-SA 的商用不是无条件的；BY-SA 对分发改编作品有同许可义务，公共领域也应保留来源，不等于没有人格权等限制。作者不是必然等于上传者。[C1]

缓存／历史元数据至少保存：文件页、原始 URL、作者、许可证及 URL、获取日期；把 HTML 形式的 `Artist`/`Credit` 转为安全文本，不直接把未知元数据注入 UI。API 使用规范要求可识别 User-Agent、遵守限速通知和内容许可；不以更换 IP、并发或切换 endpoint 规避配额。本轮未测高频访问，不宣称无限请求。[C3]

### 2.3 GitHub 壁纸库：现有桥接确实能传完整图片

官方 Get a blob 接口匿名可读公开资源，返回 JSON，`encoding` 为 `base64`、`content` 为编码内容，并支持最大 100 MB 的 Blob。[G1] 这里服务上限与插件上限必须分开：当前 bridge 是整个 HTTP 响应体不超过 8 MiB，base64 还有体积与换行开销，所以不能把 GitHub 的 100 MB 当成插件可用大小。

主线程复核的实际结果：

| 仓库 | 本轮树索引 | 抽样原图 | JSON/base64 响应 | 完整性检查 |
| --- | --- | --- | --- | --- |
| `dracula/wallpaper` | HTTP 200；72 个 PNG/JPEG/WebP；未截断 | `aosc.png`；979,857 bytes | HTTP 200；JSON 1,350,318 bytes | PNG 文件头匹配；解码后 Git Blob SHA 与树索引一致 |
| `dharmx/walls` | HTTP 200；1,637 个 PNG/JPEG/WebP；未截断 | `abstract/a_black_and_white_drawing_of_a_person_with_a_blindfold.png`；399,164 bytes | HTTP 200；JSON 550,242 bytes | PNG 文件头匹配；解码后 Git Blob SHA 与树索引一致 |

这些数量是 2026-09-30 的树快照，不是固定目录规模或持续可用保证。请求链为仓库元数据 → Git Trees 递归索引 → `git/blobs/{sha}` → base64 解码。生产实现需固定允许的仓库，校验树路径、文件类型、尺寸与 SHA；递归树可能截断，必须检查 `truncated` 并按树节点续取。[G1][G3]

前一轮 PowerShell 匿名请求 403，而本轮 Node 匿名请求 200，观察到剩余额度 56 至 51；这是出口／时段请求观察，不能解释为某种语言天然绕过限流。官方未认证请求通常是每 IP 每小时 60 次，不能通过换出口规避限制。[G2] 应缓存索引与已下载图片、避免自动拉取大量全尺寸预览，按需获取，并清晰显示 403/429 与重试状态。

`dracula/wallpaper` 的仓库元数据声明 MIT；`dharmx/walls` 本轮元数据未声明许可证。两者都不能仅凭“公开可读”或代码仓库许可证推断所有图片、商标和外部作品均可商业再分发。GitHub 路线适合逐图许可清晰、体积较小且目录固定的壁纸源，不应把未经许可的大型收集库整个打包成素材商城。[R1][R2]

### 2.4 Unsplash 与 Pexels：有下载能力，但不是无条件免密商城源

- **Unsplash**：无 Access Key 的 API 请求本轮返回 401。官方文档提供搜索分页、图片 URL、下载追踪端点。官方 API 指南要求热链其返回的图像 URL、适当署名，并在设置壁纸等类似下载动作时调用 `download_location`；指南还禁止复制 Unsplash 的核心体验，直接举例 wallpaper applications，并限制要求普通用户申请开发者账户。不能用“图库免费”推导此插件可以直接把它包装成壁纸库。[U1][U2]
- **Pexels**：无 key 请求本轮返回 401；部分官网文档受挑战返回 403，所以本轮没有据这些页面验证带 key 搜索。后续官方帮助页确认 API 需免费申请 key，并有默认限额说明。其“复制核心功能”说明将单纯复制图库的 wallpaper apps 列为不允许，并指出其他服务中附带的图片来源功能可能是例外；插件背景工具是否属于例外应先与其确认，而不是在客户端内藏一个共用 key 后默认放行。[P1][P2]

本次没有用户密钥，未验证任何带 key 的 Unsplash/Pexels 下载闭环，也不建议把私密 API key 写进可分发的插件。

## 3. 推荐路线

1. **如果只修改插件**：可先以逐图许可核验后的 GitHub 小文件库完成真实图片传输，单张原图建议不超过 5 MiB，为 8 MiB JSON 响应留余量。索引缓存、按需下载、图片类型与完整性校验、许可展示、配额提示都要一起做；不要声称这等同于 Wallhaven 的大规模搜索体验。
2. **如果要真正的公开壁纸搜索商城**：优先补齐宿主的授权二进制 HTTP 能力，再接 Wallhaven SFW 或 Commons。请求需要显式二进制模式，返回可安全保存的 base64/字节、MIME、大小和必要响应头；继续按实际流量硬限制，保留 URL、重定向与域名授权检查，不接受插件以远程图片元素绕过门禁。
3. **下载与使用共用本地管理**：在线下载成功后进入相同的壁纸历史管理，保存原图和来源／许可元数据，再由用户预览、应用和删除；网络失败不影响已缓存背景。当前实现已完成本地导入历史管理，尚未添加网络权限或在线图库入口。

### 不能混淆的结论

- “公开图库可下载”：**是**，Wallhaven 与 Commons 的原图实际 GET 成功。
- “现有 bridge 可下载任何格式的原图”：**否**，lossy 文本不能承载任意二进制。
- “因此所有公开图库都无法接”：**否**，官方 JSON/base64 是已实测的传输例外。
- “已完成在线商城”：**否**，本次是来源与传输可行性调研；不能把直接请求接口测试说成完整产品已经上线。

## 4. 官方来源

- [W1] Wallhaven API：<https://wallhaven.cc/help/api>
- [W2] Wallhaven Terms：<https://wallhaven.cc/terms>
- [C1] Commons 内容复用与许可：<https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia>
- [C2] MediaWiki Imageinfo：<https://www.mediawiki.org/wiki/API:Imageinfo>
- [C3] Wikimedia API Usage Guidelines：<https://foundation.wikimedia.org/wiki/Policy:Wikimedia_Foundation_API_Usage_Guidelines>
- [G1] GitHub Get a blob：<https://docs.github.com/en/rest/git/blobs>
- [G2] GitHub REST API Rate Limits：<https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api>
- [G3] GitHub Git Trees：<https://docs.github.com/en/rest/git/trees>
- [R1] Dracula 官方壁纸仓库：<https://github.com/dracula/wallpaper>
- [R2] Dharmx 壁纸收集仓库：<https://github.com/dharmx/walls>
- [U1] Unsplash API Documentation：<https://unsplash.com/documentation>
- [U2] Unsplash API Guidelines：<https://help.unsplash.com/en/articles/2511245-unsplash-api-guidelines>
- [P1] Pexels API 入门、key 与限额说明：<https://help.pexels.com/hc/en-us/sections/900001840183-Getting-Started>
- [P2] Pexels 对独立壁纸应用与背景功能／插件例外的说明：<https://help.pexels.com/hc/en-us/articles/4405588861721-Can-I-use-the-API-as-a-wallpaper-app>
