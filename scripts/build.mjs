// 把模板 + 数据编译成单文件静态页：dist/index.html
// 用法：node scripts/build.mjs

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const SITE = {
	title: 'AI 写小说哪家强 · 正文写作 · 仙侠篇',
	description:
		'SoloEnt 模型测评：10 个模型拿到同一份仙侠大纲，各写三遍第一章，117 份评分全程双盲。含总榜、五维拆解、稳定性、成本错配、AI 腔检测器，30 篇原文与 148 条评审简评全文可读。',
	url: 'https://soloent-ai.github.io/novel_benchmark/',
};

// 站点图标：SoloEnt 八瓣花，内联成 data URI，不依赖外部请求
const FAVICON =
	'data:image/svg+xml,' +
	encodeURIComponent(
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 90">' +
			'<circle fill="#eb4c42" cx="45" cy="45" r="5.277"/><g fill="#eb4c42">' +
			'<path d="M45.214,33.672c24.117-31.271,0.369-31.89,0.369-31.89S21.827,1.851,45.214,33.672z"/>' +
			'<path d="M37.141,36.837c-5.059-39.164-22.288-22.81-22.288-22.81S-1.896,30.874,37.141,36.837z"/>' +
			'<path d="M33.67,44.786c-31.269-24.119-31.888-0.37-31.888-0.37S1.851,68.173,33.67,44.786z"/>' +
			'<path d="M36.837,52.859c-39.166,5.059-22.81,22.288-22.81,22.288S30.874,91.899,36.837,52.859z"/>' +
			'<path d="M44.785,56.33c-24.118,31.271-0.369,31.888-0.369,31.888S68.171,88.149,44.785,56.33z"/>' +
			'<path d="M52.859,53.164c5.057,39.164,22.287,22.81,22.287,22.81S91.896,59.127,52.859,53.164z"/>' +
			'<path d="M56.33,45.216c31.271,24.117,31.888,0.369,31.888,0.369S88.148,21.829,56.33,45.216z"/>' +
			'<path d="M53.162,37.142c39.166-5.061,22.811-22.289,22.811-22.289S59.126-1.896,53.162,37.142z"/>' +
			'</g></svg>'
	);

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

const template = readFileSync(join(ROOT, 'src/index.template.html'), 'utf8');
const works = JSON.parse(readFileSync(join(ROOT, 'data/works.json'), 'utf8'));
const comments = JSON.parse(readFileSync(join(ROOT, 'data/comments.json'), 'utf8'));

const workIds = Object.keys(works);
if (workIds.length !== 30) throw new Error(`data/works.json 应有 30 篇，实际 ${workIds.length}`);
for (const [id, w] of Object.entries(works)) {
	if (!w.text || !w.text.trim()) throw new Error(`作品 ${id} 正文为空`);
}
const orphan = comments.filter((c) => !works[c.workId]);
if (orphan.length) throw new Error(`有 ${orphan.length} 条简评找不到对应作品`);

const body = template
	.replace('__WORK_TEXT__', JSON.stringify(works))
	.replace('__COMMENTS__', JSON.stringify(comments));

if (/__WORK_TEXT__|__COMMENTS__/.test(body)) throw new Error('模板占位符未全部替换');

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(SITE.title)}</title>
<meta name="description" content="${esc(SITE.description)}" />
<meta name="color-scheme" content="light dark" />
<link rel="icon" href="${FAVICON}" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="SoloEnt 模型测评" />
<meta property="og:title" content="${esc(SITE.title)}" />
<meta property="og:description" content="${esc(SITE.description)}" />
<meta property="og:url" content="${esc(SITE.url)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(SITE.title)}" />
<meta name="twitter:description" content="${esc(SITE.description)}" />
<style>*,*::before,*::after{box-sizing:border-box}body{margin:0}</style>
</head>
<body>
${body}
</body>
</html>
`;

mkdirSync(join(ROOT, 'dist'), { recursive: true });
writeFileSync(join(ROOT, 'dist/index.html'), html);
// GitHub Pages 默认会跑 Jekyll，.nojekyll 关掉它
writeFileSync(join(ROOT, 'dist/.nojekyll'), '');
if (existsSync(join(ROOT, 'CNAME'))) {
	writeFileSync(join(ROOT, 'dist/CNAME'), readFileSync(join(ROOT, 'CNAME')));
}

const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
console.log(`dist/index.html — ${workIds.length} 篇原文 · ${comments.length} 条简评 · ${kb} KB`);
