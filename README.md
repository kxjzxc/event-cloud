# Event Cloud

> 静态事件网站生成器 — 将 Logseq Graph 编译成可浏览的事件云。

Event Cloud 不是博客，而是一个事件云。用户以随机探索的方式重新遇见过去的自己。

## 核心理念

1. **Logseq 负责维护内容，Time Machine 负责展示内容。** Time Machine 永远不修改 Logseq 数据。
2. **随机探索优先。** 首页只有一个入口——启动时光机，随机穿越到一个记忆。不提供时间轴、日历或主动检索。
3. **解锁机制。** 第一次访问的记忆被永久解锁，之后可以在记忆馆中回顾。
4. **静态优先。** 最终输出是纯静态网站，可部署到任意静态托管平台。
5. **插件化架构。** Parser、Storage、Renderer、ImageProcessor 均可插拔。

## 快速开始

```bash
# 安装依赖
npm install

# 编译 TypeScript
npx tsc

# 把你的 Logseq Graph 放到 graph/ 目录（或修改 config.json 的 logseqPath）

# 构建静态站点
npx node lib/cli/index.js build

# 本地预览
npx node lib/cli/index.js preview
```

打开 http://localhost:3000 ，点击「启动时光机」即可。

## 配置

编辑 `config.json`：

```json
{
  "logseqPath": "./graph",
  "outputPath": "./dist",
  "storage": "local",
  "media": {
    "thumbnailSize": 200,
    "previewSize": 800
  }
}
```

| 字段 | 说明 | 默认值 |
|------|------|--------|
| `logseqPath` | Logseq Graph 根目录路径 | `./graph` |
| `outputPath` | 静态站点输出目录 | `./dist` |
| `storage` | 存储插件：`local` / `r2` / `oss` | `local` |
| `media.thumbnailSize` | 缩略图宽度（px） | `200` |
| `media.previewSize` | 预览图宽度（px） | `800` |

## CLI 命令

```bash
tm build [--dry-run] [-v] [-c <config>] [--storage <name>]
tm preview [--port <port>] [-c <config>]
tm deploy --platform <github-pages|r2|oss>
tm init --graph <path> --output <path>
```

| 命令 | 说明 |
|------|------|
| `build` | 解析 Logseq Graph，生成静态站点到 `dist/` |
| `build --dry-run` | 仅解析，不生成输出，用于检查 Event 数量 |
| `build -v` | 详细日志 |
| `preview` | 启动本地静态服务器预览 `dist/` |
| `deploy` | 部署到远程平台（占位，未来支持 GitHub Pages / R2 / OSS） |
| `init` | 初始化新的 `config.json` |

## Event 识别规则

Time Machine 的最小单位不是 Journal，而是 Event。

当前识别规则：

- **`pages/` 目录下每个 `.md` 文件 = 一个 Event**（跳过 `contents.md` 等 Logseq 内部页面）
- Journal 文件不作为 Event 来源
- 页面标题 = 文件名
- 日期 = 页面属性中的 `date::`，无则取文件修改时间

页面内容支持的 Logseq 语法：

```markdown
# 页面标题

自由文本内容...

[[双链]] 和 #标签 会自动解析

![](../assets/photo.jpg)        — 图片引用
![[video.mp4]]                  — 视频引用（Embed 语法）
```

## 网站功能

### 首页

只有一个按钮：**启动时光机**。点击后随机跳转到一个 Event。

### Event 页面

沉浸式展示：
- 标题、日期
- 正文内容（Markdown 渲染）
- 图片画廊（点击放大）
- 视频播放器
- 标签
- 双链（`[[link]]` 解析为对应 Event 页面链接）
- 同一天的其他 Event
- 被引用（Backlinks）
- 相关记忆（共享标签的 Event）
- 「再次穿越」按钮

### 随机与解锁

- 随机策略：优先抽取未解锁的 Event，全部解锁后完全随机
- 解锁状态存储在浏览器 `localStorage` 中，无需后端

### 记忆馆（Archive）

查看所有已解锁的 Event，支持搜索和标签过滤。

## 图片处理

Builder 自动处理图片，**不修改原始文件**：

| 输出 | 尺寸 | 用途 |
|------|------|------|
| `thumbnail.webp` | 200px 宽 | 列表/卡片缩略图 |
| `preview.webp` | 800px 宽 | 点击放大时展示 |

支持增量处理：已生成的 WebP 文件不会重复生成。

视频文件（`.mp4` / `.mov` / `.webm`）直接复制到 `dist/assets/videos/`。

## 项目结构

```
event-cloud/
├── graph/                  # Logseq Graph 数据（你的笔记）
│   ├── journals/
│   ├── pages/
│   ├── assets/
│   └── logseq/config.edn
├── dist/                   # 构建输出（静态网站）
├── src/
│   ├── types/index.ts      # 核心类型定义 + 插件接口
│   ├── core/builder.ts     # Builder — 核心调度器
│   ├── parsers/
│   │   └── logseq/parser.ts    # Logseq Parser 插件
│   ├── storage/
│   │   ├── local.ts        # 本地存储插件
│   │   ├── r2.ts           # Cloudflare R2（占位）
│   │   └── oss.ts          # 阿里云 OSS（占位）
│   ├── image/processor.ts  # 图片处理插件（sharp）
│   ├── renderers/default/
│   │   ├── renderer.ts     # 默认渲染器
│   │   └── templates.ts    # HTML/CSS/JS 模板
│   ├── registry.ts         # 插件注册表
│   └── cli/index.ts        # CLI 入口
├── bin/ec.js               # 可执行入口
├── config.json             # 配置文件
└── package.json
```

## 插件架构

所有核心能力采用插件化设计。Builder 只负责调度，不直接耦合具体实现。

```typescript
interface IParser {
  parse(graphPath: string): Promise<TMEvent[]>;
}

interface IStorage {
  save(filePath: string, content: Buffer | string): Promise<void>;
  load(filePath: string): Promise<Buffer>;
  exists(filePath: string): Promise<boolean>;
}

interface IRenderer {
  render(events: TMEvent[], index: EventIndexEntry[], ctx: RenderContext): Promise<void>;
}

interface IImageProcessor {
  process(imagePath: string, outputDir: string, config: MediaConfig): Promise<ProcessedAsset>;
}
```

| 插件类型 | 已实现 | 未来扩展 |
|----------|--------|----------|
| Parser | Logseq | Obsidian, 通用 Markdown |
| Storage | Local | Cloudflare R2, 阿里云 OSS |
| Renderer | Default | 自定义主题 |
| ImageProcessor | Sharp | — |

## 数据流

```
Logseq Graph → [Parser] → Events → [ImageProcessor] → [Renderer] → Static HTML
                                  ↑
                            [buildRelations]
                            (backlinks + related)
```

单向流动，严禁反向写入 Logseq。

## 技术栈

- **TypeScript** (CommonJS)
- **Node.js** 22+
- `marked` — Markdown → HTML
- `sharp` — 图片处理（WebP 转换）
- `commander` + `chalk` — CLI
- 前端：纯 HTML / CSS / JS，无框架，`localStorage` 存解锁状态

## 开发

```bash
# 编译
npx tsc

# 修改源码后重新构建
npx tsc && npx node lib/cli/index.js build -v

# 预览
npx node lib/cli/index.js preview
```

## License

MIT
