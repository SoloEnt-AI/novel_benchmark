// 把模板 + 数据编译成静态站：dist/index.html（首页）+ dist/reports/<slug>/index.html（报告详情）
// 中文在根目录，英文在 /en/ 下，两套页面结构完全一致
// 用法：node scripts/build.mjs

import { readFileSync, writeFileSync, copyFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, posix } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (...p) => readFileSync(join(ROOT, ...p), 'utf8');

const SITE = {
	name: 'SoloEnt 模型写作测评',
	title: 'AI 写小说哪家强 · SoloEnt 模型写作测评',
	description:
		'SoloEnt 模型写作测评：同一份大纲，多个模型各写几遍，交给读网文的人双盲打分。每期公开全部原文、原始评语与统计口径。',
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

/* ============================================================
   语言：中文是原文，英文文案全部集中在 en/，靠「原文 → 译文」的词典逐串替换
   en/shell.json 是外壳和首页，en/reports/<slug>.json 是各期正文和 meta 字段。
   按串长从长到短替换，避免短串先把长句切碎；查不到的串原样保留，页面上一眼能看出漏了什么。
   ============================================================ */
const LANGS = [
	{ id: 'zh', code: 'zh-CN', base: '', label: 'EN', aria: 'Switch to English' },
	{ id: 'en', code: 'en', base: 'en/', label: '中文', aria: '切换到中文' },
];

const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function makeTranslator(dictFiles) {
	const dict = new Map();
	const keep = []; // 译文留空 = 有意保持中文（评审昵称、AI 感检测器的句式清单和示例）
	for (const f of dictFiles) {
		if (!existsSync(join(ROOT, f))) continue;
		for (const [k, v] of Object.entries(JSON.parse(read(f)))) {
			if (k.startsWith('_')) continue;
			if (v) dict.set(k, v);
			else keep.push(k);
		}
	}
	// 模板里的长句会跨行折行，所以词条中的空白一律按「一处或多处空白」匹配
	const rules = [...dict.keys()]
		.sort((a, b) => b.trim().length - a.trim().length)
		.map((k) => ({
			re: new RegExp(k.trim().split(/\s+/).map(reEsc).join('\\s+'), 'g'),
			to: dict.get(k),
		}));
	const t = (s) => {
		if (typeof s !== 'string' || !s) return s;
		let out = s;
		for (const r of rules) out = out.replace(r.re, () => r.to);
		return out;
	};
	t.keep = keep;
	return t;
}

const noop = (s) => s;
// 各语言的翻译函数：外壳一份，每期报告在外壳基础上叠自己的词典
const SHELL_DICT = 'en/shell.json';
const reportDict = (slug) => `en/reports/${slug}.json`;

const shellT = { zh: noop, en: makeTranslator([SHELL_DICT]) };
const reportTranslators = new Map();
const translatorFor = (slug, langId) => {
	if (langId === 'zh') return noop;
	if (!reportTranslators.has(slug)) {
		reportTranslators.set(slug, makeTranslator([SHELL_DICT, reportDict(slug)]));
	}
	return reportTranslators.get(slug);
};

const BASE_CSS = read('src/shell/base.css');
const HOME_CSS = read('src/shell/home.css');
const REPORT_CSS = read('src/shell/report.css');
const MATERIALS_CSS = read('src/shell/materials.css');
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
// rel：页面相对各语言根目录的路径（首页是 ''，报告是 'reports/<slug>/'），
// 由它推出返回首页的相对路径、另一语言同名页的相对路径和绝对 URL
function shell({ lang, rel, title, description, css, body, navLinks, brandSub, footerNote, t, og }) {
	const depth = rel ? rel.split('/').filter(Boolean).length : 0;
	const home = depth ? '../'.repeat(depth) : './';
	const alt = LANGS.find((l) => l.id !== lang.id);
	const altHref = '../'.repeat(depth + (lang.id === 'en' ? 1 : 0)) + alt.base + rel;

	const nav = t(NAV)
		.replace('{{HOME}}', home)
		.replace('{{LOGO}}', LOGO)
		.replace('{{BRAND_SUB}}', brandSub ? esc(t(brandSub)) : '')
		.replace('{{NAV_LINKS}}', navLinks)
		.replace('{{LANG_HREF}}', esc(altHref))
		.replace('{{LANG_CODE}}', alt.code)
		.replace('{{LANG_ARIA}}', esc(lang.aria))
		.replace('{{LANG_LABEL}}', esc(lang.label));

	const footer = t(FOOTER)
		.replace('{{LOGO}}', LOGO)
		.replace('{{FOOTER_NOTE}}', footerNote.map((s) => `<span>${esc(t(s))}</span>`).join('\n      '));

	const url = SITE.url + lang.base + rel;
	const alternates = LANGS.map(
		(l) => `<link rel="alternate" hreflang="${l.code}" href="${esc(SITE.url + l.base + rel)}" />`
	).join('\n');

	return `<!doctype html>
<html lang="${lang.code}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<meta name="color-scheme" content="light dark" />
<link rel="icon" href="${FAVICON}" />
<link rel="canonical" href="${esc(url)}" />
${alternates}
<link rel="alternate" hreflang="x-default" href="${esc(SITE.url + rel)}" />
<meta property="og:type" content="${og}" />
<meta property="og:site_name" content="${esc(t(SITE.name))}" />
<meta property="og:locale" content="${lang.id === 'en' ? 'en_US' : 'zh_CN'}" />
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
${t(SHELL_JS)}
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

// 带占位符的句子：先整句翻译，再把 %name 换成实际值
const fmt = (s, vals) => String(s).replace(/%(\w+)/g, (_, k) => (k in vals ? vals[k] : `%${k}`));

// meta.json 里会出现在页面上的字段，按语言翻一份
function localize(r, t) {
	return {
		...r,
		title: t(r.title),
		brandSub: t(r.brandSub),
		cardTitle: t(r.cardTitle),
		summary: t(r.summary),
		description: t(r.description),
		tags: (r.tags || []).map(t),
		stats: (r.stats || []).map((s) => ({ ...s, label: t(s.label) })),
		nav: (r.nav || []).map((l) => ({ ...l, label: t(l.label) })),
		footerNote: (r.footerNote || []).map(t),
		materials: r.materials ? { ...r.materials, note: t(r.materials.note || '') } : r.materials,
	};
}

/* ============================================================
   Markdown → HTML
   够用即可：素材是模型生成的策划文件与正文，没有嵌套引用、脚注这类结构
   ============================================================ */
function inline(s) {
	return esc(s)
		.replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`)
		.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, a, u) => `<img src="${u}" alt="${a}" loading="lazy" />`)
		.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => `<a href="${u}" rel="noopener">${t}</a>`)
		.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
		.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
}

function mdToHtml(src) {
	const lines = src.replace(/\r\n?/g, '\n').split('\n');
	const out = [];
	const listStack = [];   // [{ tag, indent }]
	let para = [];
	let fence = null;
	let fenceBuf = [];

	const flushPara = () => {
		if (para.length) out.push(`<p>${inline(para.join('\n')).replace(/\n/g, '<br />')}</p>`);
		para = [];
	};
	const closeLists = (toIndent) => {
		while (listStack.length && listStack[listStack.length - 1].indent >= toIndent) {
			out.push(`</${listStack.pop().tag}>`);
		}
	};

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		if (fence !== null) {
			if (line.trim().startsWith('```')) {
				out.push(`<pre><code>${esc(fenceBuf.join('\n'))}</code></pre>`);
				fence = null;
				fenceBuf = [];
			} else fenceBuf.push(line);
			continue;
		}
		if (line.trim().startsWith('```')) {
			flushPara();
			closeLists(0);
			fence = line.trim().slice(3);
			continue;
		}

		if (!line.trim()) { flushPara(); closeLists(0); continue; }

		const h = line.match(/^(#{1,6})\s+(.*)$/);
		if (h) {
			flushPara(); closeLists(0);
			out.push(`<h${h[1].length}>${inline(h[2].trim())}</h${h[1].length}>`);
			continue;
		}

		if (/^\s*([-*_])\s*\1\s*\1[\s\-*_]*$/.test(line)) {
			flushPara(); closeLists(0);
			out.push('<hr />');
			continue;
		}

		// 表格：| a | b |  后跟 | --- | --- |
		if (line.trim().startsWith('|') && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] || '')) {
			flushPara(); closeLists(0);
			const cells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => inline(c.trim()));
			let html = '<div class="tablebox"><table><thead><tr>' +
				cells(line).map((c) => `<th>${c}</th>`).join('') + '</tr></thead><tbody>';
			i += 2;
			for (; i < lines.length && lines[i].trim().startsWith('|'); i++) {
				html += '<tr>' + cells(lines[i]).map((c) => `<td>${c}</td>`).join('') + '</tr>';
			}
			i--;
			out.push(html + '</tbody></table></div>');
			continue;
		}

		const q = line.match(/^\s*>\s?(.*)$/);
		if (q) {
			flushPara(); closeLists(0);
			const buf = [q[1]];
			while (i + 1 < lines.length && /^\s*>/.test(lines[i + 1])) buf.push(lines[++i].replace(/^\s*>\s?/, ''));
			out.push(`<blockquote>${mdToHtml(buf.join('\n'))}</blockquote>`);
			continue;
		}

		const li = line.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
		if (li) {
			flushPara();
			const indent = li[1].replace(/\t/g, '    ').length;
			const tag = /^\d/.test(li[2]) ? 'ol' : 'ul';
			closeLists(indent + 1);
			const top = listStack[listStack.length - 1];
			if (!top || top.indent < indent) {
				listStack.push({ tag, indent });
				out.push(`<${tag}>`);
			} else if (top.tag !== tag) {
				out.push(`</${listStack.pop().tag}>`);
				listStack.push({ tag, indent });
				out.push(`<${tag}>`);
			}
			out.push(`<li>${inline(li[3])}</li>`);
			continue;
		}

		if (listStack.length) { out.push(`<li>${inline(line.trim())}</li>`); continue; }
		para.push(line.trim());
	}
	if (fence !== null) out.push(`<pre><code>${esc(fenceBuf.join('\n'))}</code></pre>`);
	flushPara();
	closeLists(0);
	return out.join('\n');
}

/* ============================================================
   测试素材浏览器：reports/<slug>/materials/<run>/**
   ============================================================ */
function walk(dir, base = '') {
	const out = [];
	for (const e of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'zh'))) {
		if (e.name.startsWith('.')) continue;
		const rel = base ? posix.join(base, e.name) : e.name;
		if (e.isDirectory()) out.push(...walk(join(dir, e.name), rel));
		else out.push(rel);
	}
	return out;
}

function buildMaterials(r, lang, t) {
	const src = join(ROOT, r.dir, 'materials');
	if (!existsSync(src)) return null;

	const cfg = r.materials || {};
	const modelOf = (run) => (cfg.map || {})[run.replace(/-[^-]+$/, '')] || run;
	const roundOf = (run) => (run.match(/-([^-]+)$/) || [, ''])[1].replace(/^0+/, '');

	const runs = readdirSync(src, { withFileTypes: true })
		.filter((e) => e.isDirectory() && !e.name.startsWith('.'))
		.map((e) => e.name)
		.sort((a, b) => a.localeCompare(b, 'zh'))
		.map((run) => ({ run, model: modelOf(run), round: roundOf(run), files: walk(join(src, run)) }));
	const modelRunCounts = new Map();
	for (const it of runs) {
		const displayRound = (modelRunCounts.get(it.model) || 0) + 1;
		modelRunCounts.set(it.model, displayRound);
		it.displayRound = String(displayRound).padStart(2, '0');
		it.label = `${it.model}-${it.displayRound}`;
	}

	let bytes = 0;
	const navLinks = `<a href="../../">${esc(t('全部报告'))}</a>\n      <a href="../">${esc(t('返回报告'))}</a>`;

	for (const it of runs) {
		const docs = [];
		for (const f of it.files) {
			if (f.toLowerCase().endsWith('.md')) {
				docs.push({ path: f, html: mdToHtml(readFileSync(join(src, it.run, f), 'utf8')) });
			} else {
				// 图片等二进制原样拷贝，页面里按相对路径引用
				const dest = join(ROOT, 'dist', lang.base, r.dir, 'materials', it.run, f);
				mkdirSync(dirname(dest), { recursive: true });
				copyFileSync(join(src, it.run, f), dest);
				docs.push({ path: f, html: `<img src="${encodeURI(f)}" alt="${esc(f)}" loading="lazy" />` });
			}
		}

		let sidebar = '';
		let lastDir = null;
		docs.forEach((d, i) => {
			const dir = posix.dirname(d.path);
			if (dir !== lastDir) {
				sidebar += `<div class="fdir">${dir === '.' ? esc(t('（根目录）')) : esc(dir) + '/'}</div>`;
				lastDir = dir;
			}
			sidebar += `<button type="button" data-i="${i}"${i === 0 ? ' class="on"' : ''}>${esc(posix.basename(d.path))}</button>`;
		});

		const body = `<main>
  <div class="wrap">
    <header class="mhead">
      <div class="crumb">
        <a href="../">${esc(r.brandSub)}</a><span class="sep">/</span>
        <a href="./">${esc(t('测试素材'))}</a><span class="sep">/</span>
        <span>${esc(it.label)}</span>
      </div>
      <span class="tag">${esc(it.label)}</span>
      <h1>${esc(fmt(t('%label 的全部产出'), { label: it.label }))}</h1>
      <p class="lede">
        ${esc(fmt(t('这一轮落盘的 %n 个文件，按模型自己建的目录结构排列，内容未作任何删改。左侧切换文件。'), { n: docs.length }))}
      </p>
    </header>

    <div class="mlayout">
      <nav class="mfiles" id="mfiles" aria-label="${esc(t('文件列表'))}">${sidebar}</nav>
      <article class="mdoc">
        <div class="mdoc-top">
          <b id="doc-name"></b>
          <span id="doc-path"></span>
        </div>
        <div class="md" id="doc-body"></div>
      </article>
    </div>
  </div>
</main>

<script>
(function () {
  "use strict";
  var DOCS = ${JSON.stringify(docs)};
  var box = document.getElementById("mfiles");
  var name = document.getElementById("doc-name");
  var path = document.getElementById("doc-path");
  var bodyEl = document.getElementById("doc-body");

  function show(i) {
    var d = DOCS[i];
    if (!d) return;
    name.textContent = d.path.split("/").pop();
    path.textContent = d.path;
    bodyEl.innerHTML = d.html;
    box.querySelectorAll("button").forEach(function (b) {
      b.classList.toggle("on", +b.getAttribute("data-i") === i);
    });
    if (location.hash.slice(1) !== String(i)) history.replaceState(null, "", "#" + i);
  }
  box.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (b) show(+b.getAttribute("data-i"));
  });
  show(Math.max(0, Math.min(DOCS.length - 1, parseInt(location.hash.slice(1), 10) || 0)));
})();
</script>`;

		bytes += write(
			join(lang.base, r.dir, 'materials', it.run),
			shell({
				lang,
				rel: `reports/${r.slug}/materials/${it.run}/`,
				title: `${it.label} · ${t('测试素材')} · ${r.title}`,
				description: fmt(
					t('%label 同题运行中落盘的全部策划文件与第一章正文，共 %n 个文件。'),
					{ label: it.label, n: docs.length }
				),
				css: `${BASE_CSS}\n${MATERIALS_CSS}`,
				body,
				navLinks,
				brandSub: t('测试素材'),
				footerNote: r.footerNote,
				t,
				og: 'article',
			})
		);
	}

	// 索引页：按模型分组
	const byModel = new Map();
	for (const it of runs) {
		if (!byModel.has(it.model)) byModel.set(it.model, []);
		byModel.get(it.model).push(it);
	}
	const order = cfg.order || [...byModel.keys()];
	const groups = order
		.filter((m) => byModel.has(m))
		.map((m) => {
			const items = byModel.get(m);
			const total = items.reduce((n, it) => n + it.files.length, 0);
			return `<section class="mgroup">
        <div class="mgroup-head">
          <h2>${esc(m)}</h2>
          <span class="meta">${esc(fmt(t('%r 轮 · 共 %n 个文件'), { r: items.length, n: total }))}</span>
        </div>
        <div class="mruns">
          ${items
						.map(
							(it) => `<a class="mrun" href="${encodeURIComponent(it.run)}/">
            <span class="r-round">${esc(it.label)}</span>
            <span class="r-files">${esc(fmt(t('%n 个文件'), { n: it.files.length }))}</span>
            <span class="r-open">${esc(t('打开'))} ${ARROW}</span>
          </a>`
						)
						.join('\n          ')}
        </div>
      </section>`;
		})
		.join('\n      ');

	const totalFiles = runs.reduce((n, it) => n + it.files.length, 0);
	const indexBody = `<main>
  <div class="wrap">
    <header class="mhead">
      <div class="crumb">
        <a href="../">${esc(r.brandSub)}</a><span class="sep">/</span><span>${esc(t('测试素材'))}</span>
      </div>
      <span class="tag">${esc(fmt(t('%r 轮 · %n 个文件'), { r: runs.length, n: totalFiles }))}</span>
      <h1>${esc(t('全部测试素材'))}</h1>
      <p class="lede">${esc(cfg.note || '')}</p>
    </header>
    ${groups}
  </div>
</main>`;

	bytes += write(
		join(lang.base, r.dir, 'materials'),
		shell({
			lang,
			rel: `reports/${r.slug}/materials/`,
			title: `${t('全部测试素材')} · ${r.title}`,
			description: fmt(
				t(
					'%title的全部测试素材：%r 轮同题运行落盘的 %n 个文件，含策划总纲、分卷与章节细纲、人物设定与第一章正文。'
				),
				{ title: r.title, r: runs.length, n: totalFiles }
			),
			css: `${BASE_CSS}\n${MATERIALS_CSS}`,
			body: indexBody,
			navLinks,
			brandSub: t('测试素材'),
			footerNote: r.footerNote,
			t,
			og: 'website',
		})
	);

	return { runs: runs.length, files: totalFiles, bytes };
}

/* ============================================================
   报告详情页
   ============================================================ */
const built = [];

for (const lang of LANGS) {
	for (const raw of reports) {
		const t = translatorFor(raw.slug, lang.id);
		const r = localize(raw, t);

		// 先翻译模板，再塞作品原文与评语——它们是被评的对象，始终保持中文
		const tpl = t(read(r.dir, 'page.template.html'));
		const body = tpl
			.replace('__WORK_TEXT__', JSON.stringify(r.works))
			.replace('__COMMENTS__', JSON.stringify(r.comments));
		if (/__WORK_TEXT__|__COMMENTS__/.test(body)) throw new Error(`${r.dir}：模板占位符未全部替换`);

		const navLinks = [{ href: '../../', label: t('全部报告') }, ...(r.nav || [])]
			.map((l) => `<a href="${esc(l.href)}">${esc(l.label)}</a>`)
			.join('\n      ');

		const html = shell({
			lang,
			rel: `reports/${r.slug}/`,
			title: `${r.title} · ${t(SITE.name)}`,
			description: r.description,
			css: `${BASE_CSS}\n${REPORT_CSS}`,
			body,
			navLinks,
			brandSub: r.brandSub,
			footerNote: r.footerNote,
			t,
			og: 'article',
		});

		const bytes = write(join(lang.base, 'reports', r.slug), html);
		built.push({
			lang: lang.id,
			slug: r.slug,
			bytes,
			works: r.works ? Object.keys(r.works).length : 0,
			comments: r.comments ? r.comments.length : 0,
			untranslated: (
				(t.keep || []).reduce((s, k) => s.split(k.trim()).join(''), tpl).match(/[一-鿿]/g) || []
			).length,
			materials: buildMaterials(r, lang, t),
		});
	}
}

/* ============================================================
   首页
   ============================================================ */
// 首页的累计数字来自各期 meta.totals，与用于展示的 stats 解耦
const sum = (key) => reports.reduce((n, r) => n + Number((r.totals || {})[key] || 0), 0);

const homeBytes = {};

for (const lang of LANGS) {
	const t = shellT[lang.id];

	const cards = reports
		.map((raw) => localize(raw, translatorFor(raw.slug, lang.id)))
		.map(
			(r) => `<a class="rcard" href="reports/${r.slug}/">
          <div class="rtop">
            <span class="tag">${esc(fmt(t('第 %n 期'), { n: r.issue }))}</span>
            ${(r.tags || []).map((tag) => `<span class="tag muted">${esc(tag)}</span>`).join('')}
            <span class="rdate" style="margin-left:auto">${esc(r.date.replace(/-/g, '.'))}</span>
          </div>
          <h3>${esc(r.cardTitle)}</h3>
          <p class="rsum">${esc(r.summary).replace(/\n/g, '<br />')}</p>
          <div class="rstats">
            ${r.stats.map((s) => `<div><b>${esc(s.value)}</b>${esc(s.label)}</div>`).join('\n            ')}
          </div>
          <span class="rmore">${esc(t('读报告'))} ${ARROW}</span>
        </a>`
		)
		.join('\n        ');

	const homeBody = t(read('src/home.template.html'))
		.replace('{{REPORT_CARDS}}', cards)
		.replace('{{TOTAL_REPORTS}}', String(reports.length))
		.replace('{{TOTAL_MODELS}}', String(sum('models')))
		.replace('{{TOTAL_WORKS}}', String(sum('works')))
		.replace('{{TOTAL_SCORES}}', String(sum('ratings')));

	if (/\{\{[A-Z_]+\}\}/.test(homeBody)) throw new Error('首页模板占位符未全部替换');

	const homeHtml = shell({
		lang,
		rel: '',
		title: t(SITE.title),
		description: t(SITE.description),
		css: `${BASE_CSS}\n${HOME_CSS}`,
		body: homeBody,
		navLinks: [
			`<a href="#reports">${esc(t('全部报告'))}</a>`,
			`<a href="#method">${esc(t('测评方法'))}</a>`,
			`<a href="#join">${esc(t('加入测评团'))}</a>`,
		].join('\n      '),
		brandSub: '',
		footerNote: ['© 2026 SoloEnt.ai. 版权所有。为勇敢的故事创作者而生。'],
		t,
		og: 'website',
	});

	homeBytes[lang.id] = write(lang.base || '.', homeHtml);
}

// GitHub Pages 默认会跑 Jekyll，.nojekyll 关掉它
writeFileSync(join(ROOT, 'dist/.nojekyll'), '');
if (existsSync(join(ROOT, 'CNAME'))) {
	writeFileSync(join(ROOT, 'dist/CNAME'), readFileSync(join(ROOT, 'CNAME')));
}

const kb = (n) => (n / 1024).toFixed(0) + ' KB';
for (const lang of LANGS) {
	const prefix = lang.base || '';
	console.log(`dist/${prefix}index.html — ${reports.length} 期报告 · ${kb(homeBytes[lang.id])}`);
	for (const b of built.filter((x) => x.lang === lang.id)) {
		console.log(
			`dist/${prefix}reports/${b.slug}/index.html — ${b.works} 篇原文 · ${b.comments} 条简评 · ${kb(b.bytes)}`
		);
		if (b.materials) {
			console.log(
				`  └ materials/ — ${b.materials.runs} 轮 · ${b.materials.files} 个文件 · ${kb(b.materials.bytes)}`
			);
		}
	}
}

// 漏译提醒：只看模板本身（作品原文、评语、素材内容本来就保持中文，不计入）
const miss = built.filter((b) => b.lang !== 'zh' && b.untranslated);
if (miss.length) {
	console.log(`\n⚠️  以下页面模板还有没进词典的中文：`);
	for (const b of miss) {
		const dict = reportDict(b.slug);
		const hint = existsSync(join(ROOT, dict)) ? dict : `${dict}（还没建）`;
		console.log(`   /${b.lang}/reports/${b.slug}/ — ${b.untranslated} 个汉字 · 补到 ${hint}`);
	}
}
