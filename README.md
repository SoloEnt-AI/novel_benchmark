# SoloEnt 模型写作测评

同一份大纲，多个模型各写几遍，交给读网文的人双盲打分。本仓库是这系列测评的成果站：**首页列出全部报告，每期报告是一个二级页**。

线上地址：<https://benchmark.soloent.ai/>（GitHub Pages 备用：<https://soloent-ai.github.io/novel_benchmark/>）

页面是**静态站**，无运行时依赖、无外部请求，参评作品原文和评审简评全部内联，离线可读。视觉沿用 [soloent-web](https://soloent.ai) 主页的设计（配色、字重、圆角、深色页脚）。

## 站点结构

```
/                                      首页：报告列表 + 测评方法 + 加入测评团
/reports/<slug>/                       报告详情页（一期一个）
/reports/<slug>/materials/             测试素材索引（有素材的期才有）
/reports/<slug>/materials/<run>/       某一轮跑出来的全部文件
/en/**                                 上面每一页的英文版，路径结构完全一致
```

中文在根目录，英文在 `/en/` 下，导航右上角的 `EN` / `中文` 按钮在两者之间跳转（页面对页面，不会跳回首页）。
深色 / 浅色跟随系统，没有手动开关。

已发布：

| 期号 | slug | 内容 |
|---|---|---|
| 01 | `writingflow_18models` | 全流程 · 18 模型汇总：从 Plan 引导到第一章落盘，四维拆解 + 成本 |
| 02 | `prosewriting_xianxia` | 正文写作 · 仙侠篇：10 个模型 × 3 篇第一章，117 份双盲评分 |

首页按 `date` 倒序排列，期号写在各自的 `meta.json` 里。

## 目录结构

```
src/
  shell/
    base.css            设计令牌 + 基础样式 + 导航 + 页脚（所有页面共用）
    home.css            首页专用样式
    report.css          报告详情页专用样式（图表 / 阅读器 / 表格…）
    shell.js            滚动进度、入场动画、数字滚动
    nav.html            顶部导航模板
    footer.html         页脚模板
  home.template.html    首页正文
reports/<slug>/
  meta.json             这期的标题、日期、标签、摘要、统计数字、导航锚点
  page.template.html    这期的正文（HTML + JS；公开原文的期带两个数据占位符）
  data/works.json       参评作品正文，key 是四位数匿名编号（可选）
  data/comments.json    评审简评，按编号关联到作品（可选）
  materials/<run>/**    这一轮跑出来的原始文件（可选），构建时渲染成素材浏览器
en/
  shell.json            外壳 + 首页 + 素材页的英文文案
  reports/<slug>.json   这一期正文与 meta 的英文文案
  README.md             英文文案怎么改
scripts/build.mjs       编译成 dist/ 下的中英两套页面
.github/workflows/      push 到 main 自动构建并部署到 GitHub Pages
```

分数、价格等汇总数据直接写在各期 `page.template.html` 顶部的 `MODELS` / `WORKS` 两个数组里，改数字在那里改。

## 英文版怎么来的

**英文页上的每一个字都在 [`en/`](en/) 里**，模板只写一份中文，构建时按「原文 → 译文」逐串替换：`en/shell.json` 管外壳和首页，`en/reports/<slug>.json` 管这一期的正文和 `meta.json` 字段。改英文只动 `en/`，结构、图表和分数数据永远只有一处来源。

- 键是模板里的原文，值是译文。**键里的空白按「一处或多处空白」匹配**，所以模板里折行的长句照抄一行即可。
- 按串长从长到短替换，长句先落地，短词才不会把长句切碎。
- **值留空 = 有意保持中文**：评审昵称、AI 感检测器的句式清单和示例文本都是被检测的对象，翻译了就失真。以 `_` 开头的键是注释，不参与替换。
- 键里带引号的条目是 JS / HTML 片段（如 `"（第`），值必须用直引号；纯文案里的引号一律用弯引号 `“ ”`，否则会撑破 JS 字符串。
- 参评作品原文、评审简评、`materials/` 里的素材始终保持中文，构建时在翻译之后才注入。
- 构建结束会列出英文模板里还没进词典的中文字数，为 0 才算翻完。

## 本地开发

```bash
node scripts/build.mjs        # 生成 dist/
open dist/index.html          # 直接用浏览器打开即可，不需要起服务
```

只依赖 Node（≥18），没有 npm 依赖。

构建时会校验每期作品的空正文和孤儿简评、`meta.json` 的 slug 与目录名是否一致、模板占位符是否全部替换，任一不通过直接报错。

## 新增一期报告

1. `cp -r reports/prosewriting_xianxia reports/<新 slug>`，删掉里面的 `data/`。
2. 改 `meta.json`：`slug` 必须等于目录名；`stats` 是这期页面上展示的四个数字，随便写；`totals`（`models` / `works` / `ratings`）是首页累计数字的来源，两者互不影响。
3. 改 `page.template.html`：正文和 `MODELS` 数组。
4. 要公开原文就放入 `data/works.json` 和 `data/comments.json`（格式见下），并在模板里保留 `__WORK_TEXT__` 和 `__COMMENTS__` 两个占位符；不公开原文就整个 `data/` 不要，构建会自动跳过。
5. 要公开测试素材，把每一轮的原始文件放进 `materials/<run>/`（`<run>` 形如 `compare-gpt-01`，末段是轮次），并在 `meta.json` 的 `materials.map` 里写好「前缀 → 模型名」的映射、`materials.order` 里写分组顺序。构建会把 markdown 渲染成素材浏览器，图片等二进制原样拷贝。
6. 新建 `en/reports/<新 slug>.json`：把这期正文和 `meta.json` 里的中文串翻成英文（做法见 [`en/README.md`](en/README.md)）。先跑一次构建，末尾会告诉你还差多少字没翻。
7. `node scripts/build.mjs` —— 首页卡片、页脚链接、导航都会自动带上新的一期，按 `date` 倒序排列，中英各生成一套。

```jsonc
// works.json
{ "2017": { "chars": 5144, "text": "# 第一章 ...\n\n正文..." } }

// comments.json
[{ "workId": "2017", "code": "C01", "group": "资深组", "total": 6, "note": "……" }]
```

## 部署

push 到 `main` 触发 `.github/workflows/deploy.yml`：构建 → 上传 artifact → 部署 Pages。仓库 Settings → Pages 的 Source 需要设为 **GitHub Actions**。

自定义域名：`benchmark.soloent.ai`（根目录 `CNAME`，构建时复制进 `dist/`）。DNS 在 Cloudflare 配 **CNAME → `soloent-ai.github.io`**，代理须为 **DNS only（灰云）**；校验通过后在仓库 Settings → Pages 勾选 Enforce HTTPS。

## 数据来源

原始数据在内部的测评项目里（飞书多维表格 + 评审作品仓库），`reports/<slug>/data/*.json` 是导出的快照。作品正文按匿名编号存放，不含评审真实姓名，也不含内部文档链接。
