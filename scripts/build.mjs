// 把模板 + 数据编译成静态站：dist/index.html（首页）+ dist/reports/<slug>/index.html（报告详情）
// 用法：node scripts/build.mjs

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (...p) => readFileSync(join(ROOT, ...p), 'utf8');

const SITE = {
	name: 'SoloEnt 模型测评',
	title: 'AI 写小说哪家强 · SoloEnt 模型测评',
	description:
		'SoloEnt 模型测评：同一份大纲，多个模型各写几遍，交给读网文的人双盲打分。每期公开全部原文、原始评语与统计口径。',
	url: 'https://soloent-ai.github.io/novel_benchmark/',
};

// 站点图标 / 品牌标识：SoloEnt 八瓣花
const LOGO_PATHS =
	'<circle fill="currentColor" cx="45" cy="45" r="5.277"/><g fill="currentColor">' +
	'<path d="M45.214,33.672c24.117-31.271,0.369-31.89,0.369-31.89S21.827,1.851,45.214,33.672z"/>' +
	'<path d="M37.141,36.837c-5.059-39.164-22.288-22.81-22.288-22.81S-1.896,30.874,37.141,36.837z"/>' +
	'<path d="M33.67,44.786c-31.269-24.119-31.888-0.37-31.888-0.37S1.851,68.173,33.67,44.786z"/>' +
	'<path d="M36.837,52.859c-39.166,5.059-22.81,22.288-22.81,22.288S30.874,91.899,36.837,52.859z"/>' +
	'<path d="M44.785,56.33c-24.118,31.271-0.369,31.888-0.369,31.888S68.171,88.149,44.785,56.33z"/>' +
	'<path d="M52.859,53.164c5.057,39.164,22.287,22.81,22.287,22.81S91.896,59.127,52.859,53.164z"/>' +
	'<path d="M56.33,45.216c31.271,24.117,31.888,0.369,31.888,0.369S88.148,21.829,56.33,45.216z"/>' +
	'<path d="M53.162,37.142c39.166-5.061,22.811-22.289,22.811-22.289S59.126-1.896,53.162,37.142z"/></g>';

const LOGO = `<svg viewBox="0 0 90 90" style="color:#eb4c42" aria-hidden="true" focusable="false">${LOGO_PATHS}</svg>`;

const FAVICON =
	'data:image/svg+xml,' +
	encodeURIComponent(
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 90" fill="#eb4c42">${LOGO_PATHS.replace(/currentColor/g, '#eb4c42')}</svg>`
	);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

const BASE_CSS = read('src/shell/base.css');
const HOME_CSS = read('src/shell/home.css');
const REPORT_CSS = read('src/shell/report.css');
const SHELL_JS = read('src/shell/shell.js');
const NAV = read('src/shell/nav.html');
const FOOTER = read('src/shell/footer.html');

const ARROW =
	'<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>';

/* ============================================================
   报告：读取 reports/<slug>/{meta.json,page.template.html,data/*}
   ============================================================ */
const reports = readdirSync(join(ROOT, 'reports'), { withFileTypes: true })
	.filter((d) => d.isDirectory() && existsSync(join(ROOT, 'reports', d.name, 'meta.json')))
	.map((d) => {
		const dir = join('reports', d.name);
		const meta = JSON.parse(read(dir, 'meta.json'));
		if (meta.slug !== d.name) throw new Error(`${dir}/meta.json 的 slug 与目录名不一致`);

		// 有的报告不公开原文（只有汇总数据），data/ 可以整个不存在
		const hasData = existsSync(join(ROOT, dir, 'data/works.json'));
		const works = hasData ? JSON.parse(read(dir, 'data/works.json')) : null;
		const comments = hasData ? JSON.parse(read(dir, 'data/comments.json')) : null;

		if (hasData) {
			for (const [id, w] of Object.entries(works)) {
				if (!w.text || !w.text.trim()) throw new Error(`${dir}：作品 ${id} 正文为空`);
			}
			const orphan = comments.filter((c) => !works[c.workId]);
			if (orphan.length) throw new Error(`${dir}：有 ${orphan.length} 条简评找不到对应作品`);
		}

		return { ...meta, dir, works, comments };
	})
	.sort((a, b) => (a.date < b.date ? 1 : -1));

if (!reports.length) throw new Error('reports/ 下没有找到任何 meta.json');

/* ============================================================
   页面外壳
   ============================================================ */
function shell({ title, description, url, css, body, navLinks, brandSub, footerNote, home, og }) {
	const nav = NAV.replace('{{HOME}}', home)
		.replace('{{LOGO}}', LOGO)
		.replace('{{BRAND_SUB}}', brandSub ? esc(brandSub) : '')
		.replace('{{NAV_LINKS}}', navLinks);

	const footerReports = reports
		.map((r) => `<li><a href="${home}reports/${r.slug}/">第 ${esc(r.issue)} 期 · ${esc(r.brandSub)}</a></li>`)
		.join('\n          ');

	const footer = FOOTER.replace('{{LOGO}}', LOGO)
		.replace('{{FOOTER_REPORTS}}', footerReports)
		.replace('{{FOOTER_NOTE}}', footerNote.map((s) => `<span>${esc(s)}</span>`).join('\n      '));

	return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<meta name="color-scheme" content="light dark" />
<link rel="icon" href="${FAVICON}" />
<meta property="og:type" content="${og}" />
<meta property="og:site_name" content="${esc(SITE.name)}" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:url" content="${esc(url)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(description)}" />
<style>*,*::before,*::after{box-sizing:border-box}body{margin:0}</style>
<style>
${css}
</style>
<script>document.documentElement.classList.add("js");window.__themeHooks=[];window.onThemeChange=function(f){window.__themeHooks.push(f)};</script>
</head>
<body>
${nav}
${body}
${footer}
<script>
${SHELL_JS}
</script>
</body>
</html>
`;
}

function write(relDir, html) {
	mkdirSync(join(ROOT, 'dist', relDir), { recursive: true });
	writeFileSync(join(ROOT, 'dist', relDir, 'index.html'), html);
	return Buffer.byteLength(html);
}

/* ============================================================
   报告详情页
   ============================================================ */
const built = [];

for (const r of reports) {
	const template = read(r.dir, 'page.template.html');
	const body = template
		.replace('__WORK_TEXT__', JSON.stringify(r.works))
		.replace('__COMMENTS__', JSON.stringify(r.comments));
	if (/__WORK_TEXT__|__COMMENTS__/.test(body)) throw new Error(`${r.dir}：模板占位符未全部替换`);

	const navLinks = [{ href: '../../', label: '全部报告' }, ...(r.nav || [])]
		.map((l) => `<a href="${esc(l.href)}">${esc(l.label)}</a>`)
		.join('\n      ');

	const html = shell({
		title: `${r.title} · ${SITE.name}`,
		description: r.description,
		url: `${SITE.url}reports/${r.slug}/`,
		css: `${BASE_CSS}\n${REPORT_CSS}`,
		body,
		navLinks,
		brandSub: r.brandSub,
		footerNote: r.footerNote,
		home: '../../',
		og: 'article',
	});

	const bytes = write(join('reports', r.slug), html);
	built.push({
		slug: r.slug,
		bytes,
		works: r.works ? Object.keys(r.works).length : 0,
		comments: r.comments ? r.comments.length : 0,
	});
}

/* ============================================================
   首页
   ============================================================ */
// 首页的累计数字来自各期 meta.totals，与用于展示的 stats 解耦
const sum = (key) => reports.reduce((n, r) => n + Number((r.totals || {})[key] || 0), 0);

const cards = reports
	.map(
		(r) => `<a class="rcard" href="reports/${r.slug}/">
          <div class="rtop">
            <span class="tag">第 ${esc(r.issue)} 期</span>
            ${(r.tags || []).map((t) => `<span class="tag muted">${esc(t)}</span>`).join('')}
            <span class="rdate" style="margin-left:auto">${esc(r.date.replace(/-/g, '.'))}</span>
          </div>
          <h3>${esc(r.cardTitle)}</h3>
          <p class="rsum">${esc(r.summary)}</p>
          <div class="rstats">
            ${r.stats.map((s) => `<div><b>${esc(s.value)}</b>${esc(s.label)}</div>`).join('\n            ')}
          </div>
          <span class="rmore">读报告 ${ARROW}</span>
        </a>`
	)
	.join('\n        ');

const homeBody = read('src/home.template.html')
	.replace('{{REPORT_CARDS}}', cards)
	.replace('{{TOTAL_REPORTS}}', String(reports.length))
	.replace('{{TOTAL_MODELS}}', String(sum('models')))
	.replace('{{TOTAL_WORKS}}', String(sum('works')))
	.replace('{{TOTAL_SCORES}}', String(sum('ratings')));

if (/\{\{[A-Z_]+\}\}/.test(homeBody)) throw new Error('首页模板占位符未全部替换');

const homeHtml = shell({
	title: SITE.title,
	description: SITE.description,
	url: SITE.url,
	css: `${BASE_CSS}\n${HOME_CSS}`,
	body: homeBody,
	navLinks: '<a href="#reports">全部报告</a>\n      <a href="#method">怎么测</a>\n      <a href="#join">加入测评团</a>',
	brandSub: '',
	footerNote: ['盲评打分 · 数据与口径全部公开', '页面为静态站，无外部请求，离线可读'],
	home: './',
	og: 'website',
});

const homeBytes = write('.', homeHtml);

// GitHub Pages 默认会跑 Jekyll，.nojekyll 关掉它
writeFileSync(join(ROOT, 'dist/.nojekyll'), '');
if (existsSync(join(ROOT, 'CNAME'))) {
	writeFileSync(join(ROOT, 'dist/CNAME'), readFileSync(join(ROOT, 'CNAME')));
}

const kb = (n) => (n / 1024).toFixed(0) + ' KB';
console.log(`dist/index.html — ${reports.length} 期报告 · ${kb(homeBytes)}`);
for (const b of built) {
	console.log(`dist/reports/${b.slug}/index.html — ${b.works} 篇原文 · ${b.comments} 条简评 · ${kb(b.bytes)}`);
}
