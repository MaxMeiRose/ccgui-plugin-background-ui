# 壁纸 API V2.0 接入契约

核验时间：2026-10-08 12:04–12:05（Asia/Shanghai）。依据官方文档及 3 次匿名、只读 GET；未触发限流、故障兜底或下载图片。本文记录接口约定和接入建议，不代表插件宿主端已完成验收。

## 接入结论

- 使用 `GET https://wp.upx8.com/api.php`，显式传 `format=json`，无需文档未要求的 API key。分类和关键词检索均由这一个入口提供。[D1]
- **这是抽样壁纸接口，没有公开 `page`、`cursor`、`offset` 或搜索总数。** 可以再次获取一批，不能实现可靠的“下一页”。服务端声明文件缓存 5 分钟；官方演示源码特意不添加 `_t`，以保留缓存行为。[D1]
- 本次相隔约 25 秒的同参数请求各返回 10 张，两批有 4 个相同 URL、顺序不同。说明普通重复请求能获得不同抽样，但不能保证不重复，也不能把缓存时长解释成整批 JSON 必然固定。[L1][L3]
- 每批建议请求 10 张，使用“获取壁纸／换一批”并提示“每批最多 10 张，可能重复”。不添加未文档化的刷新或分页参数；有关键词时发送 `content`，否则发送所选 `category`。[D1]

## 请求参数

| 参数 | 类型、默认值 | 约定 |
| --- | --- | --- |
| `format` | string；默认留空 | `json` 返回 JSON；留空返回图片的 HTTP 302 跳转。 |
| `content` | string；可省略 | 搜索关键词，最长 100 字符；与 `category` 同时传时 **content 优先**，不是二者交集。 |
| `category` | string；可省略 | 下表的英文 key；省略关键词和分类时获取随机壁纸。 |
| `resolution` | string；`1920x1080` | 从下列 6 个值中选择。 |
| `count` | integer；`1` | 范围 1–10，仅 JSON 模式有效。 |
| `stats` | 任意值；可省略 | 返回调用统计；在线图库不需要调用。 |

来源：[D1] 的接口参数表与演示 `buildUrl`。

| 分类 | key | 分类 | key |
| --- | --- | --- | --- |
| 风景 | `nature` | 动漫 | `anime` |
| 游戏 | `game` | 动物 | `animal` |
| 城市 | `city` | 抽象 | `abstract` |
| 宇宙 | `space` | 汽车 | `car` |
| 美女 | `girl` | 运动 | `sport` |

来源：[D2]。官方演示下拉框遗漏了 `girl`，但官方分类表明确列有该分类；本次未逐个测试分类。

合法分辨率：`1280x720`、`1366x768`、`1600x900`、`1920x1080`、`2560x1440`、`3840x2160`。**birdpaper 返回原始尺寸，`resolution` 只是记录，不强制缩放；必应支持指定分辨率，但部分图片没有 4K 版本。** 不能把响应中的 `resolution` 当成已测量的图片尺寸。[D3]

## 响应与实际图片地址

`count=1` 的 `data` 是对象；多张的 `data` 是数组。实测如下（保留首个样本的实际字段）：[D1][L1][L2]

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "url": "http://cdn-hsyq-static.shanhutech.cn/bizhi/staticwp/202508/e68112b2c59617399c4e1f35e65cf1f3--3207272339.jpg",
    "width": 0,
    "height": 0,
    "title": "",
    "source": "birdpaper",
    "resolution": "1920x1080"
  },
  "count": 1
}
```

多张外层为 `{ "code": 200, "message": "success", "data": [ ... ], "count": 10 }`。需要把单对象和数组归一化；`count` 是本次返回数量，不是搜索总量。[L1][L2]

- 本次三个响应的图片地址均在 **`http://cdn-hsyq-static.shanhutech.cn`**，不同于文档示例的 `https://img.birdpaper.com.cn`。实际网络授权与下载处理应以已核对的图片域名和宿主 SDK 为准，不只照抄示例域名。[D1][L1][L2][L3]
- 本次样本 `title` 全为空，`width` / `height` 全为 `0`。界面应使用如“壁纸 1”的回退标题，未知尺寸不显示为 `0 × 0` 或假装是请求分辨率。[L1][L2][L3]
- 返回的是具体图片文件 URL，适合作为本次选择的来源记录；文档没有保证永久有效、无防盗链或对应 HTTPS 也可用。本次未读取图片字节，未验证 HTTP/HTTPS 图片下载能力。[D1][L1]
- 文档声明 birdpaper 失败时会自动回退至必应每日壁纸。客户端应保留来源信息，不能保证回退图仍匹配分类或关键词；本次只观察到 `source: "birdpaper"`，没有实测必应响应及其 `source` 字段取值。[D1][L1][L2][L3]

## 缓存、频率与错误

| 情况 | 官方约定／本次观察 | 接入建议 |
| --- | --- | --- |
| 正常 JSON | HTTP 200，业务 `code: 200` | 同时核对状态、业务码和图片 URL。 |
| 默认模式 | HTTP 302，Location 指向图片 | 图库使用 JSON；历史不要保存随机 302 入口。 |
| 请求过频 | 每 IP 每分钟最多 60 次；HTTP 429 | 禁止重复提交，展示“请求过于频繁，请稍后再试”；不自动连续重试。 |
| 两个上游均失败 | HTTP 503 | 展示暂不可用，保留当前背景和现有历史。 |
| 服务端缓存 | 官方声明 5 分钟文件缓存 | 不使用未公开的缓存穿透参数；刷新允许重复。 |

来源：[D1][D4][D5]。官方 429 JSON 示例为 `{ "code": 429, "message": "请求过于频繁，请稍后再试", "limit": "60次/60秒" }`；未公开固定的 503 JSON 结构。[D5]

三个实测响应均带 `Access-Control-Allow-Origin: *`、`Access-Control-Allow-Methods: GET, OPTIONS`、`Access-Control-Allow-Headers: Content-Type` 和 `Cache-Control: no-store`。这些是本次 API 响应头，不代表所有图片域名允许 CORS，也不否定服务端内部的文件缓存。[L1][L2][L3]

## 与设置页和历史的衔接建议

在线图库提供“分类／关键词 → 获取一批 → 查看单张 → 使用背景”的选择流程。应明确“输入关键词后优先按关键词搜索”，避免让用户误以为关键词还受所选分类限制。[D1]

浏览、刷新或查看图片不自动修改背景；确认使用后进入现有素材应用与历史流程。历史应记录选定的具体图片及来源，不保存 `api.php` 随机入口，否则再次打开可能变成另一张图。需要离线重用时，复用现有本地素材存储链路，不能依赖上游 URL 永久可用。这是集成建议，须由实现与宿主测试验证。[D1][L1][L3]

## 证据来源

- [D1] [官方总览、快速开始、接口参考及页面演示源码](https://wp.upx8.com/#overview)，2026-10-08 读取。
- [D2] [官方分类列表](https://wp.upx8.com/#categories)。
- [D3] [官方支持的分辨率及来源限制](https://wp.upx8.com/#resolutions)。
- [D4] [官方错误码](https://wp.upx8.com/#errors)。
- [D5] [官方频率限制](https://wp.upx8.com/#ratelimit)。
- [L1] 2026-10-08 12:04:54，GET [`?format=json&category=nature&resolution=1920x1080&count=10`](https://wp.upx8.com/api.php?format=json&category=nature&resolution=1920x1080&count=10)：HTTP 200，`data` 为 10 元素数组，实际 CDN 域名见上文。
- [L2] 2026-10-08 12:04:55，GET [`?format=json&content=星空&category=animal&resolution=1920x1080&count=1`](https://wp.upx8.com/api.php?format=json&content=%E6%98%9F%E7%A9%BA&category=animal&resolution=1920x1080&count=1)：HTTP 200，`data` 为单对象。仅证明此组合请求成功；关键词优先级依据官方文档，不从无标题图片推断相关性。
- [L3] 2026-10-08 12:05:19，原样重复 L1：HTTP 200，10 元素数组，与 L1 有 4 个相同 URL，顺序不同。只验证本次抽样行为，不构成长期服务保证。
