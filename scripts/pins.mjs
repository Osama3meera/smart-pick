import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const BLOG_DIR = path.join(ROOT, 'src/content/blog');
const PINS_DIR = path.join(ROOT, 'pins');
export const SITE_URL = 'https://smart-pick.pages.dev';
export const SITE_LABEL = 'smart-pick.pages.dev';
const W = 1000;
const H = 1500;
export const FONT = 'Arial, Helvetica, sans-serif';

export const THEMES = {
	'health-fitness': { bg1: '#1e1b4b', bg2: '#4338ca', accent: '#fde68a', soft: '#c7d2fe', ink: '#1e1b4b' },
	'self-help': { bg1: '#3b0764', bg2: '#9333ea', accent: '#fcd34d', soft: '#e9d5ff', ink: '#3b0764' },
	'home-garden': { bg1: '#14532d', bg2: '#16a34a', accent: '#fef08a', soft: '#bbf7d0', ink: '#14532d' },
	'cooking-food': { bg1: '#7c2d12', bg2: '#ea580c', accent: '#fef3c7', soft: '#fed7aa', ink: '#7c2d12' },
	relationships: { bg1: '#831843', bg2: '#db2777', accent: '#fef08a', soft: '#fbcfe8', ink: '#831843' },
	'parenting-family': { bg1: '#0c4a6e', bg2: '#0284c7', accent: '#fde68a', soft: '#bae6fd', ink: '#0c4a6e' },
	pets: { bg1: '#78350f', bg2: '#d97706', accent: '#ffffff', soft: '#fde68a', ink: '#78350f' },
	spirituality: { bg1: '#134e4a', bg2: '#0d9488', accent: '#fef08a', soft: '#99f6e4', ink: '#134e4a' },
};

export const BOARDS = {
	'health-fitness': 'Health & Fitness Tips',
	'self-help': 'Self-Improvement',
	'home-garden': 'Home & Garden Ideas',
	'cooking-food': 'Easy Recipes & Food Tips',
	relationships: 'Relationship Advice',
	'parenting-family': 'Parenting Tips',
	pets: 'Pet Care Tips',
	spirituality: 'Mindfulness & Spirituality',
};

export const HASHTAGS = {
	'health-fitness': '#healthyhabits #wellness #fitnesstips #selfcare',
	'self-help': '#selfimprovement #personalgrowth #motivation #habits',
	'home-garden': '#homeideas #gardening #diyhome #homeimprovement',
	'cooking-food': '#recipes #easyrecipes #foodtips #cooking',
	relationships: '#relationshipadvice #love #dating #marriage',
	'parenting-family': '#parentingtips #momlife #family #parenting',
	pets: '#pettips #dogsofpinterest #petcare #pets',
	spirituality: '#mindfulness #meditation #spirituality #innerpeace',
};

export function slugify(text) {
	return text
		.toLowerCase()
		.replace(/&/g, ' and ')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

export function esc(text) {
	return String(text)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function charWidth(ch, bold) {
	if (ch === ' ' || ch === ' ') return 0.28;
	if ('iljI.,:;\'!|'.includes(ch)) return 0.3;
	if ('fJrt()-'.includes(ch)) return 0.38;
	if ('mwMW'.includes(ch)) return 0.9;
	if (/[A-Z0-9?$]/.test(ch)) return bold ? 0.7 : 0.66;
	return bold ? 0.58 : 0.54;
}

export function textWidth(text, size, bold) {
	return [...text].reduce((sum, ch) => sum + charWidth(ch, bold), 0) * size;
}

export function wrap(text, size, maxWidth, bold) {
	const words = text.split(/[ \t\n]+/).filter(Boolean);
	const lines = [];
	let line = '';
	for (const word of words) {
		const next = line ? `${line} ${word}` : word;
		if (line && textWidth(next, size, bold) > maxWidth) {
			lines.push(line);
			line = word;
		} else {
			line = next;
		}
	}
	if (line) lines.push(line);
	return balance(lines, size, maxWidth, bold);
}

function balance(lines, size, maxWidth, bold) {
	const last = lines.length - 1;
	if (last < 1 || lines[last].includes(' ')) return lines;
	const prev = lines[last - 1].split(' ');
	if (prev.length < 3) return lines;
	const moved = `${prev.pop()} ${lines[last]}`;
	if (textWidth(moved, size, bold) > maxWidth) return lines;
	return [...lines.slice(0, last - 1), prev.join(' '), moved];
}

export function fit(text, { size, minSize = 40, maxWidth = 840, maxLines = 4, bold = true }) {
	for (let s = size; s >= minSize; s -= 4) {
		const lines = wrap(text, s, maxWidth, bold);
		if (lines.length <= maxLines && lines.every((l) => textWidth(l, s, bold) <= maxWidth)) {
			return { lines, size: s };
		}
	}
	return { lines: wrap(text, minSize, maxWidth, bold).slice(0, maxLines), size: minSize };
}

export function textBlock(lines, { x = W / 2, y, size, fill, bold = true, anchor = 'middle', lineHeight = 1.15 }) {
	const spans = lines
		.map((line, i) => `<tspan x="${x}" dy="${i === 0 ? 0 : size * lineHeight}">${esc(line)}</tspan>`)
		.join('');
	const svg = `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${FONT}" font-size="${size}" font-weight="${bold ? 700 : 400}" fill="${fill}">${spans}</text>`;
	return { svg, bottom: y + (lines.length - 1) * size * lineHeight };
}

function frame(theme, inner) {
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${theme.bg1}"/><stop offset="1" stop-color="${theme.bg2}"/></linearGradient>
<radialGradient id="glow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ffffff" stop-opacity="0.18"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
</defs>
<rect width="${W}" height="${H}" fill="url(#bg)"/>
<circle cx="880" cy="140" r="260" fill="url(#glow)"/>
<circle cx="90" cy="1330" r="300" fill="url(#glow)"/>
${inner}
<text x="${W / 2}" y="1440" text-anchor="middle" font-family="${FONT}" font-size="32" fill="${theme.soft}">${SITE_LABEL}</text>
</svg>`;
}

function kicker(text, theme, y = 170) {
	return `<text x="${W / 2}" y="${y}" text-anchor="middle" font-family="${FONT}" font-size="40" font-weight="700" letter-spacing="6" fill="${theme.soft}">${esc(text.toUpperCase())}</text>`;
}

function ctaButton(text, theme, y = 1250) {
	const { lines, size } = fit(text, { size: 46, minSize: 32, maxWidth: 660, maxLines: 1 });
	return `<rect x="130" y="${y}" width="740" height="110" rx="55" fill="${theme.accent}"/>
<text x="${W / 2}" y="${y + 55 + size * 0.35}" text-anchor="middle" font-family="${FONT}" font-size="${size}" font-weight="700" fill="${theme.ink}">${esc(lines[0])}</text>`;
}

function pill(text, theme, y) {
	const size = 38;
	const width = Math.min(860, textWidth(text, size, true) + 90);
	return `<rect x="${(W - width) / 2}" y="${y}" width="${width}" height="80" rx="40" fill="none" stroke="${theme.soft}" stroke-width="3"/>
<text x="${W / 2}" y="${y + 53}" text-anchor="middle" font-family="${FONT}" font-size="${size}" font-weight="700" fill="#ffffff">${esc(text)}</text>`;
}

function questionMarks(theme) {
	return `<g font-family="${FONT}" font-weight="700" fill="${theme.soft}" opacity="0.16">
<text x="80" y="1080" font-size="300">?</text><text x="760" y="980" font-size="220">?</text><text x="430" y="1160" font-size="160">?</text>
</g>`;
}

function pinHook(post, theme) {
	const hook = post.pins.hook || post.hookTitle;
	const title = fit(hook, { size: 104, minSize: 64, maxLines: 5 });
	const block = textBlock(title.lines, { y: 330, size: title.size, fill: '#ffffff' });
	return frame(
		theme,
		`${questionMarks(theme)}
${kicker('Honest review', theme)}
${block.svg}
${pill(post.product, theme, block.bottom + 90)}
${ctaButton('Read this before you buy →', theme)}`,
	);
}

function pinList(post, theme) {
	const { items, heading } = post.list;
	const shown = items.slice(0, 3);
	const hidden = items.length - shown.length;
	const title = fit(heading, { size: 92, minSize: 60, maxLines: 3 });
	const block = textBlock(title.lines, { y: 250, size: title.size, fill: '#ffffff' });
	let y = block.bottom + 130;
	const rows = [];
	shown.forEach((item, i) => {
		const t = fit(item, { size: 50, minSize: 34, maxWidth: 680, maxLines: 1 });
		rows.push(`<circle cx="140" cy="${y - 16}" r="42" fill="${theme.accent}"/>
<text x="140" y="${y + 2}" text-anchor="middle" font-family="${FONT}" font-size="46" font-weight="700" fill="${theme.ink}">${i + 1}</text>
<text x="215" y="${y}" font-family="${FONT}" font-size="${t.size}" font-weight="700" fill="#ffffff">${esc(t.lines[0])}</text>`);
		y += 130;
	});
	if (hidden > 0) {
		rows.push(`<circle cx="140" cy="${y - 16}" r="42" fill="none" stroke="${theme.soft}" stroke-width="4" stroke-dasharray="10 8"/>
<text x="140" y="${y + 2}" text-anchor="middle" font-family="${FONT}" font-size="46" font-weight="700" fill="${theme.soft}">?</text>
<rect x="215" y="${y - 46}" width="560" height="40" rx="20" fill="${theme.soft}" opacity="0.35"/>
<text x="${W / 2}" y="${y + 100}" text-anchor="middle" font-family="${FONT}" font-size="44" font-weight="700" fill="${theme.accent}">+ ${hidden} more in the full guide</text>`);
	}
	return frame(
		theme,
		`${block.svg}
${rows.join('\n')}
${ctaButton(`See all ${items.length} →`, theme)}`,
	);
}

function pinVerdict(post, theme) {
	const question = post.price ? `Is ${post.product} Worth ${post.price}?` : `Is ${post.product} Worth It?`;
	const title = fit(question, { size: 100, minSize: 62, maxLines: 4 });
	const block = textBlock(title.lines, { y: 330, size: title.size, fill: '#ffffff' });
	const facts = post.facts.filter((f) => !/keep in mind|best for/i.test(f.label)).slice(0, 3);
	const texts = facts.map((f) => `${f.label}: ${f.value}`);
	let rowSize = 44;
	while (rowSize > 30 && texts.some((t) => wrap(t, rowSize, 680, false).length > 2)) rowSize -= 2;
	let y = block.bottom + 140;
	const rows = texts.map((text) => {
		const lines = wrap(text, rowSize, 680, false).slice(0, 2);
		const row = `<circle cx="150" cy="${y - 15}" r="30" fill="${theme.accent}"/>
<path d="M136 ${y - 15}l10 10 18-20" fill="none" stroke="${theme.ink}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
${textBlock(lines, { x: 210, y, size: rowSize, fill: '#ffffff', bold: false, anchor: 'start', lineHeight: 1.25 }).svg}`;
		y += 110 + (lines.length - 1) * rowSize * 1.25;
		return row;
	});
	rows.push(`<circle cx="150" cy="${y - 15}" r="30" fill="none" stroke="${theme.accent}" stroke-width="4"/>
<text x="150" y="${y}" text-anchor="middle" font-family="${FONT}" font-size="40" font-weight="700" fill="${theme.accent}">?</text>
<text x="210" y="${y}" font-family="${FONT}" font-size="44" font-weight="700" fill="${theme.accent}">Our honest verdict: inside</text>`);
	return frame(
		theme,
		`${kicker('Before you spend a cent', theme)}
${block.svg}
${rows.join('\n')}
${ctaButton('Get the full verdict →', theme)}`,
	);
}

function pinWarning(post, theme) {
	const title = fit(`Before You Buy ${post.product}… Read This`, { size: 108, minSize: 66, maxLines: 5 });
	const block = textBlock(title.lines, { y: 420, size: title.size, fill: '#ffffff' });
	const teaser = post.pins.teaser || 'What you really get, what the science says, and who should skip it';
	const sub = fit(teaser, { size: 48, minSize: 34, maxLines: 4, bold: false, maxWidth: 780 });
	const subBlock = textBlock(sub.lines, { y: block.bottom + 140, size: sub.size, fill: theme.soft, bold: false, lineHeight: 1.3 });
	return frame(
		theme,
		`<rect x="350" y="150" width="300" height="100" rx="50" fill="${theme.accent}"/>
<text x="${W / 2}" y="218" text-anchor="middle" font-family="${FONT}" font-size="52" font-weight="700" fill="${theme.ink}">WAIT!</text>
${block.svg}
${subBlock.svg}
${ctaButton('Read the honest review →', theme)}`,
	);
}

function frameLight(theme, inner) {
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" fill="#f7f7fb"/>
<rect width="${W}" height="24" fill="${theme.bg2}"/>
<circle cx="960" cy="1460" r="220" fill="${theme.bg2}" opacity="0.06"/>
<circle cx="40" cy="120" r="160" fill="${theme.bg2}" opacity="0.06"/>
${inner}
<text x="${W / 2}" y="1440" text-anchor="middle" font-family="${FONT}" font-size="32" fill="${theme.bg1}" opacity="0.7">${SITE_LABEL}</text>
</svg>`;
}

function kickerLight(text, theme, y = 150) {
	return `<text x="${W / 2}" y="${y}" text-anchor="middle" font-family="${FONT}" font-size="38" font-weight="700" letter-spacing="6" fill="${theme.bg2}">${esc(text.toUpperCase())}</text>`;
}

function ctaLight(text, theme, y = 1250) {
	const { lines, size } = fit(text, { size: 46, minSize: 32, maxWidth: 660, maxLines: 1 });
	return `<rect x="130" y="${y}" width="740" height="110" rx="55" fill="${theme.bg2}"/>
<text x="${W / 2}" y="${y + 55 + size * 0.35}" text-anchor="middle" font-family="${FONT}" font-size="${size}" font-weight="700" fill="#ffffff">${esc(lines[0])}</text>`;
}

function pinFit(post, theme) {
	const title = fit(`Is ${post.product} Right for You?`, { size: 100, minSize: 62, maxLines: 4 });
	const block = textBlock(title.lines, { y: 290, size: title.size, fill: theme.bg1 });
	let y = block.bottom + 150;
	const rows = post.fit.yes.slice(0, 2).map((item) => {
		const all = wrap(`You ${item.charAt(0).toLowerCase()}${item.slice(1)}`, 42, 660, false);
		if (all.length > 2) console.warn(`  ⚠ "Who is it for" line too long for pin, shorten it: ${item}`);
		const lines = all.slice(0, 2);
		const row = `<circle cx="150" cy="${y - 14}" r="32" fill="#16a34a"/>
<path d="M135 ${y - 14}l10 10 19-21" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
${textBlock(lines, { x: 215, y, size: 42, fill: theme.bg1, bold: false, anchor: 'start', lineHeight: 1.25 }).svg}`;
		y += 120 + (lines.length - 1) * 52;
		return row;
	});
	rows.push(`<circle cx="150" cy="${y - 14}" r="32" fill="#dc2626"/>
<path d="M138 ${y - 26}l24 24M162 ${y - 26}l-24 24" stroke="#fff" stroke-width="7" stroke-linecap="round"/>
<text x="215" y="${y}" font-family="${FONT}" font-size="42" font-weight="700" fill="#dc2626">Who should skip it?</text>
<rect x="215" y="${y + 30}" width="560" height="34" rx="17" fill="${theme.bg1}" opacity="0.12"/>
<rect x="215" y="${y + 80}" width="420" height="34" rx="17" fill="${theme.bg1}" opacity="0.12"/>`);
	return frameLight(
		theme,
		`${kickerLight('Quick check', theme)}
${block.svg}
${rows.join('\n')}
${ctaLight('See if it fits you →', theme)}`,
	);
}

function pinSpotlight(post, theme) {
	const { items, details } = post.list;
	const index = Math.min(1, items.length - 1);
	const title = fit(items[index], { size: 104, minSize: 64, maxLines: 3 });
	const block = textBlock(title.lines, { y: 470, size: title.size, fill: theme.bg1 });
	const detail = fit(details[index] || '', { size: 46, minSize: 34, maxLines: 4, bold: false, maxWidth: 800 });
	const detailBlock = textBlock(detail.lines, { y: block.bottom + 120, size: detail.size, fill: theme.bg1, bold: false, lineHeight: 1.35 });
	return frameLight(
		theme,
		`${kickerLight(`Tip #${index + 1} of ${items.length}`, theme)}
<circle cx="${W / 2}" cy="280" r="70" fill="${theme.bg2}"/>
<text x="${W / 2}" y="306" text-anchor="middle" font-family="${FONT}" font-size="78" font-weight="700" fill="#fff">${index + 1}</text>
${block.svg}
${detailBlock.svg}
<rect x="150" y="${detailBlock.bottom + 110}" width="700" height="2" fill="${theme.bg2}" opacity="0.25"/>
<text x="${W / 2}" y="${detailBlock.bottom + 210}" text-anchor="middle" font-family="${FONT}" font-size="44" font-weight="700" fill="${theme.bg2}">+ ${items.length - 1} more tips in the full guide</text>
${ctaLight(`Get all ${items.length} tips →`, theme)}`,
	);
}

function pinQuestions(post, theme) {
	let qs = post.questions.slice(0, 4);
	let size = 44;
	const rowsHeight = (list, sz) =>
		list.reduce((h, q) => h + 140 + (wrap(q, sz, 640, true).slice(0, 2).length - 1) * sz * 1.22, 0);
	const titleFor = (n) => fit(`${n} Questions to Ask Before You Buy ${post.product.replace(/ /g, '\u00a0')}`, { size: 84, minSize: 56, maxLines: 4 });
	let title = titleFor(qs.length);
	const top = () => 280 + (title.lines.length - 1) * title.size * 1.15 + 140;
	while (top() + rowsHeight(qs, size) > 1230) {
		if (size > 36) size -= 2;
		else if (qs.length > 3) {
			qs = qs.slice(0, 3);
			size = 44;
			title = titleFor(qs.length);
		} else break;
	}
	const block = textBlock(title.lines, { y: 280, size: title.size, fill: theme.bg1 });
	let y = block.bottom + 140;
	const rows = qs.map((q, i) => {
		const lines = wrap(q, size, 640, true).slice(0, 2);
		const extra = (lines.length - 1) * size * 1.22;
		const row = `<rect x="90" y="${y - 62}" width="820" height="${110 + extra}" rx="20" fill="#ffffff" stroke="${theme.bg2}" stroke-opacity="0.25" stroke-width="3"/>
<text x="150" y="${y + 6}" text-anchor="middle" font-family="${FONT}" font-size="50" font-weight="700" fill="${theme.bg2}">${i + 1}</text>
${textBlock(lines, { x: 210, y: y + 4, size, fill: theme.bg1, anchor: 'start', lineHeight: 1.22 }).svg}`;
		y += 140 + extra;
		return row;
	});
	post.questionCount = qs.length;
	return frameLight(
		theme,
		`${kickerLight('Answered inside', theme)}
${block.svg}
${rows.join('\n')}
${ctaLight('Get the answers →', theme)}`,
	);
}

function pinTruth(post, theme) {
	const title = fit(`The Truth About ${post.product}`, { size: 112, minSize: 70, maxLines: 4 });
	const block = textBlock(title.lines, { y: 620, size: title.size, fill: theme.bg1 });
	const teaser = post.pins.truth || 'We checked the claims against the research. Here is what we found.';
	const sub = fit(teaser, { size: 48, minSize: 34, maxLines: 4, bold: false, maxWidth: 780 });
	const subBlock = textBlock(sub.lines, { y: block.bottom + 130, size: sub.size, fill: theme.bg1, bold: false, lineHeight: 1.3 });
	return frameLight(
		theme,
		`${kickerLight('We looked into it', theme)}
<g transform="translate(500 330)" fill="none" stroke="${theme.bg2}" stroke-width="18" stroke-linecap="round">
<circle cx="-20" cy="-20" r="95"/>
<path d="M50 50l85 85"/>
</g>
${block.svg}
${subBlock.svg}
${ctaLight('Read what we found →', theme)}`,
	);
}

function cleanItem(raw) {
	const bold = raw.match(/^\*\*(.+?)\*\*/);
	const text = (bold ? bold[1] : raw).replace(/\*\*|__|`/g, '').replace(/\[(.+?)\]\(.+?\)/g, '$1');
	return text.trim().replace(/[.:]+$/, '');
}

export function titleCase(text) {
	const small = new Set(['a', 'an', 'the', 'and', 'or', 'for', 'to', 'of', 'in', 'on', 'at', 'by', 'that']);
	return text
		.split(' ')
		.map((w, i) => (i > 0 && small.has(w.toLowerCase()) ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1)))
		.join(' ');
}

function parseList(body) {
	const lines = body.split(/\r?\n/);
	let heading = '';
	for (let i = 0; i < lines.length; i++) {
		const h = lines[i].match(/^#{2,3}\s+(.+)/);
		if (h) heading = h[1].trim();
		if (/^\d+\.\s+/.test(lines[i])) {
			const items = [];
			const details = [];
			while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
				const raw = lines[i].replace(/^\d+\.\s+/, '');
				items.push(cleanItem(raw));
				details.push(raw.replace(/^\*\*.+?\*\*\s*/, '').replace(/\*\*|__|`/g, '').trim());
				i++;
			}
			if (items.length >= 3) return { heading: titleCase(heading || `${items.length} Things to Know`), items, details };
		}
	}
	return null;
}

function parseFacts(body) {
	const facts = [];
	for (const m of body.matchAll(/<li><strong>([^<]+?):<\/strong>\s*([^<]+?)<\/li>/g)) {
		facts.push({ label: m[1].trim(), value: m[2].trim() });
	}
	return facts;
}

function parseQuestions(body) {
	return [...body.matchAll(/^##\s+(.+\?)\s*$/gm)].map((m) => m[1].trim()).slice(0, 4);
}

function parseFit(body) {
	const section = body.split(/^##\s+/m).find((s) => /^who\b.*\bfor\b/i.test(s));
	if (!section) return null;
	const lists = [];
	let current = null;
	for (const line of section.split(/\r?\n/)) {
		if (/^[-*]\s+/.test(line)) {
			if (!current) lists.push((current = []));
			current.push(line.replace(/^[-*]\s+/, '').replace(/\*\*|__|`/g, '').replace(/\s*\(.*?\)\s*$/, '').trim());
		} else if (line.trim()) {
			current = null;
		}
	}
	return lists.length ? { yes: lists[0], no: lists[1] || [] } : null;
}

export function loadPost(slug) {
	const file = ['.md', '.mdx'].map((ext) => path.join(BLOG_DIR, slug + ext)).find((f) => fs.existsSync(f));
	if (!file) throw new Error(`Post not found: src/content/blog/${slug}.md`);
	const { data, content } = matter(fs.readFileSync(file, 'utf8'));
	const product = data.product || data.title.split(':')[0].replace(/\s+review$/i, '').trim();
	const hookTitle = data.title.includes(':') ? data.title.split(':').slice(1).join(':').trim() : data.title;
	const facts = parseFacts(content);
	const priceFact = facts.find((f) => /price/i.test(f.label));
	return {
		slug,
		title: data.title,
		description: data.description,
		category: data.category,
		product,
		hookTitle,
		pins: data.pins || {},
		list: parseList(content),
		questions: parseQuestions(content),
		fit: parseFit(content),
		facts,
		price: priceFact?.value.match(/\$\d+(\.\d{2})?/)?.[0],
	};
}

function pinCopy(post, n) {
	const tags = HASHTAGS[post.category] || '';
	const link = `${SITE_URL}/blog/${post.slug}/?utm_source=pinterest&utm_medium=pin&utm_campaign=${post.slug}-pin${n}`;
	const list = post.list;
	const copies = {
		hook: {
			title: post.pins.hook || post.hookTitle,
			description: `Wondering if ${post.product} actually works? We took an honest look at what you really get, how it claims to work, and who it is (and is not) for. Read the full review before you buy.`,
		},
		list: {
			title: list ? list.heading : post.hookTitle,
			description: list
				? `Start with these: ${list.items.slice(0, 3).join(', ')}... plus ${list.items.length - 3} more simple ideas in the full guide. Save this pin for later!`
				: post.description,
		},
		verdict: {
			title: post.price ? `Is ${post.product} Worth ${post.price}? Honest Verdict` : `Is ${post.product} Worth It? Honest Verdict`,
			description: `Thinking about ${post.product}? Before you spend a cent, see the price, the guarantee, the pros and cons, and our honest verdict in the full review.`,
		},
		warning: {
			title: `Before You Buy ${post.product}, Read This`,
			description: `${post.description} Read the honest review first so you know exactly what to expect.`,
		},
		fit: {
			title: `Is ${post.product} Right for You? Quick Check`,
			description: `Not sure if ${post.product} is a good fit? See who it is made for and who should skip it before you decide.`,
		},
		spotlight: {
			title: list ? `${titleCase(list.items[1])}: ${list.heading}` : post.hookTitle,
			description: list
				? `"${list.items[1]}" is just one of ${list.items.length} simple tips. Get the full list in our guide and save this pin for later!`
				: post.description,
		},
		questions: {
			title: `${post.questionCount || post.questions.length} Questions to Ask Before Buying ${post.product}`,
			description: `${post.questions.slice(0, 2).join(' ')} We answer these and more in our honest review.`,
		},
		truth: {
			title: `The Truth About ${post.product}: What We Found`,
			description: `We checked what ${post.product} claims against what the research actually says. See what we found before you buy.`,
		},
	};
	const c = copies[post.designs[n - 1].type];
	return {
		title: c.title.slice(0, 100),
		description: `${c.description} #affiliate ${tags}`.trim().slice(0, 500),
		link,
	};
}

function schedule(offset) {
	const d = new Date();
	d.setDate(d.getDate() + offset * 3);
	return d.toISOString().slice(0, 10);
}

function designSets(post) {
	const set1 = [
		{ type: 'hook', render: pinHook },
		post.list ? { type: 'list', render: pinList } : { type: 'warning', render: pinWarning },
		{ type: 'verdict', render: pinVerdict },
		post.list
			? { type: 'warning', render: pinWarning }
			: { type: 'hook', render: (p, t) => pinHook({ ...p, pins: { hook: `The Truth About ${p.product}` } }, t) },
	];
	const set2 = [
		post.fit ? { type: 'fit', render: pinFit } : { type: 'truth', render: pinTruth },
		post.list ? { type: 'spotlight', render: pinSpotlight } : { type: 'truth', render: pinTruth },
		post.questions.length >= 3 ? { type: 'questions', render: pinQuestions } : { type: 'verdict', render: pinVerdict },
		{ type: 'truth', render: pinTruth },
	];
	return [set1, set2];
}

function existingCount(dir) {
	if (!fs.existsSync(dir)) return 0;
	return fs.readdirSync(dir).filter((f) => /^\d+\.jpg$/.test(f)).length;
}

async function generate(slug, setArg) {
	const post = loadPost(slug);
	const theme = THEMES[post.category] || THEMES['health-fitness'];
	const outDir = path.join(PINS_DIR, slugify(post.product));
	const sets = designSets(post);
	const setNumber = setArg || Math.floor(existingCount(outDir) / 4) + 1;
	if (setNumber > sets.length) {
		console.log(`• ${post.product}: all ${sets.length * 4} pin designs already created. Use --set 1 or --set 2 to recreate a set.`);
		return;
	}
	fs.mkdirSync(outDir, { recursive: true });

	const designs = sets[setNumber - 1];
	const first = (setNumber - 1) * 4 + 1;
	post.designs = sets.flat();

	for (let i = 0; i < designs.length; i++) {
		await sharp(Buffer.from(designs[i].render(post, theme)), { density: 144 })
			.resize(W, H)
			.jpeg({ quality: 90 })
			.toFile(path.join(outDir, `${first + i}.jpg`));
	}

	const board = BOARDS[post.category] || 'Smart Picks';
	const header = [
		`# ${post.product} pins`,
		'',
		`Post: ${SITE_URL}/blog/${post.slug}/`,
		`Board: **${board}**`,
		'',
		"Upload one pin every 3 days (suggested dates below) using Pinterest's scheduler.",
		'',
	];
	const section = [first, first + 1, first + 2, first + 3].flatMap((n, i) => {
		const c = pinCopy(post, n);
		return [
			`## Pin ${n} (${n}.jpg) - post on ${schedule(i)}`,
			'',
			`**Title:** ${c.title}`,
			'',
			`**Description:** ${c.description}`,
			'',
			`**Link:** ${c.link}`,
			'',
		];
	});
	const mdFile = path.join(outDir, 'pins.md');
	if (setNumber === 1 || !fs.existsSync(mdFile)) {
		fs.writeFileSync(mdFile, [...header, ...section].join('\n'));
	} else {
		const existing = fs.readFileSync(mdFile, 'utf8').split(/\n(?=## Pin \d+ )/);
		const kept = existing.filter((part) => {
			const m = part.match(/^## Pin (\d+) /);
			return !m || Number(m[1]) < first || Number(m[1]) > first + 3;
		});
		fs.writeFileSync(mdFile, `${kept.join('\n').trimEnd()}\n\n${section.join('\n')}`);
	}

	console.log(`✔ ${post.product}: pins ${first}-${first + 3} -> ${path.relative(ROOT, outDir)}`);
	if (!post.list) console.log('  (no numbered list found in the post, used fallback designs)');
	if (!post.facts.length) console.log('  (no quick verdict box found, the verdict pin shows fewer facts)');
	if (setNumber === 2 && !post.fit) console.log('  (no "Who is it for" section found, used a fallback design)');
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
	const args = process.argv.slice(2);
	const setIndex = args.indexOf('--set');
	const setArg = setIndex >= 0 ? Number(args.splice(setIndex, 2)[1]) : undefined;
	const slugs = args.length
		? args
		: fs.readdirSync(BLOG_DIR).filter((f) => /\.mdx?$/.test(f)).map((f) => f.replace(/\.mdx?$/, ''));

	for (const slug of slugs) {
		try {
			await generate(slug, setArg);
		} catch (err) {
			console.error(`✖ ${slug}: ${err.message}`);
			process.exitCode = 1;
		}
	}
}
