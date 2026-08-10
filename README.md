# AI 写小说哪家强 · 正文写作 · 仙侠篇

SoloEnt 模型测评的成果页：10 个模型拿到同一份仙侠大纲，各写三遍第一章，117 份测评员评分全程双盲。

线上地址：<https://soloent-ai.github.io/novel_benchmark/>

页面是**单文件静态站**，无运行时依赖、无外部请求，30 篇原文和 148 条评审简评全部内联，离线可读。

## 页面包含什么

| 章节 | 内容 |
|---|---|
| 一 | 押注：先猜谁最强，选完揭晓真实排名 |
| 二 | 总榜：7 个维度切换，榜单实时重排 |
| 三 | 五维雷达：任选两个模型对比 |
| 四 | 稳定性：三次生成的点阵与极差 |
| 五 | 成本：每章成本 × 总分散点（对数轴）+ 章节数预算滑块 |
| 六 | AI 腔检测器：按测评员点名的句式做字面匹配 |
| 七 | 选型器：两个问题给出对应建议 |
| 八 | 148 条评审原话，可按模型和分数筛选 |
| 九 | 30 篇原文全文，四个入口都能打开阅读抽屉 |
| 十 | 方法与局限，附测评用的统一大纲 |

## 目录结构

```
src/index.template.html   页面本体（HTML + CSS + JS，带两个数据占位符）
data/works.json           30 篇作品正文，key 是四位数匿名编号
data/comments.json        148 条评审简评，按编号关联到作品
scripts/build.mjs         把模板和数据编译成 dist/index.html
.github/workflows/        push 到 main 自动构建并部署到 GitHub Pages
```

分数、价格等汇总数据直接写在 `src/index.template.html` 顶部的 `MODELS` / `WORKS` 两个数组里，改数字在那里改。

## 本地开发

```bash
node scripts/build.mjs        # 生成 dist/index.html
open dist/index.html          # 直接用浏览器打开即可，不需要起服务
```

只依赖 Node（≥18），没有 npm 依赖。

改完 `src/index.template.html` 重新跑一次构建就能看到效果。构建时会校验作品数量、空正文和孤儿简评，任一不通过直接报错。

## 部署

push 到 `main` 触发 `.github/workflows/deploy.yml`：构建 → 上传 artifact → 部署 Pages。仓库 Settings → Pages 的 Source 需要设为 **GitHub Actions**。

要用自定义域名，在仓库根目录放一个 `CNAME` 文件（写入域名），构建时会自动复制进 `dist/`。

## 数据来源

原始数据在内部的测评项目里（飞书多维表格 + 评审作品仓库），`data/*.json` 是导出的快照。作品正文按匿名编号存放，不含评审真实姓名，也不含内部文档链接。

重新出一批数据时，覆盖 `data/works.json` 和 `data/comments.json` 再构建即可，格式：

```jsonc
// works.json
{ "2017": { "chars": 5144, "text": "# 第一章 ...\n\n正文..." } }

// comments.json
[{ "workId": "2017", "code": "C01", "group": "资深组", "total": 6, "note": "……" }]
```
