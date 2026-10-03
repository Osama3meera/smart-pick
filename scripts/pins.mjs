import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const BLOG_DIR = path.join(ROOT, 'src/content/blog');
const PINS_DIR = path.join(ROOT, 'pins');
const SITE_URL = 'https://smart-pick.pages.dev';
const SITE_LABEL = 'smart-pick.pages.dev';
const W = 1000;
const H = 1500;
const FONT = 'Arial, Helvetica, sans-serif';

const THEMES = {
	'health-fitness': { bg1: '#1e1b4b', bg2: '#4338ca', accent: '#fde68a', soft: '#c7d2fe', ink: '#1e1b4b' },
	'self-help': { bg1: '#3b0764', bg2: '#9333ea', accent: '#fcd34d', soft: '#e9d5ff', ink: '#3b0764' },
	'home-garden': { bg1: '#14532d', bg2: '#16a34a', accent: '#fef08a', soft: '#bbf7d0', ink: '#14532d' },
	'cooking-food': { bg1: '#7c2d12', bg2: '#ea580c', accent: '#fef3c7', soft: '#fed7aa', ink: '#7c2d12' },
	relationships: { bg1: '#831843', bg2: '#db2777', accent: '#fef08a', soft: '#fbcfe8', ink: '#831843' },
	'parenting-family': { bg1: '#0c4a6e', bg2: '#0284c7', accent: '#fde68a', soft: '#bae6fd', ink: '#0c4a6e' },
	pets: { bg1: '#78350f', bg2: '#d97706', accent: '#ffffff', soft: '#fde68a', ink: '#78350f' },
	spirituality: { bg1: '#134e4a', bg2: '#0d9488', accent: '#fef08a', soft: '#99f6e4', ink: '#134e4a' },
};

const BOARDS = {
	'health-fitness': 'Health & Fitness Tips',
	'self-help': 'Self-Improvement',
	'home-garden': 'Home & Garden Ideas',
	'cooking-food': 'Easy Recipes & Food Tips',
	relationships: 'Relationship Advice',
	'parenting-family': 'Parenting Tips',
	pets: 'Pet Care Tips',
	spirituality: 'Mindfulness & Spirituality',
};

const HASHTAGS = {
	'health-fitness': '#healthyhabits #wellness #fitnesstips #selfcare',
	'self-help': '#selfimprovement #personalgrowth #motivation #habits',
	'home-garden': '#homeideas #gardening #diyhome #homeimprovement',
	'cooking-food': '#recipes #easyrecipes #foodtips #cooking',
	relationships: '#relationshipadvice #love #dating #marriage',
	'parenting-family': '#parentingtips #momlife #family #parenting',
	pets: '#pettips #dogsofpinterest #petcare #pets',
	spirituality: '#mindfulness #meditation #spirituality #innerpeace',
};

function slugify(text) {
	return text
		.toLowerCase()
		.replace(/&/g, ' and ')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

function esc(text) {
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

function textWidth(text, size, bold) {
	return [...text].reduce((sum, ch) => sum + charWidth(ch, bold), 0) * size;
}

function wrap(text, size, maxWidth, bold) {
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

function fit(text, { size, minSize = 40, maxWidth = 840, maxLines = 4, bold = true }) {
	for (let s = size; s >= minSize; s -= 4) {
		const lines = wrap(text, s, maxWidth, bold);
		if (lines.length <= maxLines && lines.every((l) => textWidth(l, s, bold) <= maxWidth)) {
			return { lines, size: s };
		}
	}
	return { lines: wrap(text, minSize, maxWidth, bold).slice(0, maxLines), size: minSize };
}

function textBlock(lines, { x = W / 2, y, size, fill, bold = true, anchor = 'middle', lineHeight = 1.15 }) {
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

function cleanItem(raw) {
	const bold = raw.match(/^\*\*(.+?)\*\*/);
	const text = (bold ? bold[1] : raw).replace(/\*\*|__|`/g, '').replace(/\[(.+?)\]\(.+?\)/g, '$1');
	return text.trim().replace(/[.:]+$/, '');
}

function titleCase(text) {
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
			while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
				items.push(cleanItem(lines[i].replace(/^\d+\.\s+/, '')));
				i++;
			}
			if (items.length >= 3) return { heading: titleCase(heading || `${items.length} Things to Know`), items };
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

function loadPost(slug) {
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
		facts,
		price: priceFact?.value.match(/\$\d+(\.\d{2})?/)?.[0],
	};
}

function pinCopy(post, n) {
	const tags = HASHTAGS[post.category] || '';
	const link = `${SITE_URL}/blog/${post.slug}/?utm_source=pinterest&utm_medium=pin&utm_campaign=${post.slug}-pin${n}`;
	const copies = {
		1: {
			title: (post.pins.hook || post.hookTitle).slice(0, 100),
			description: `Wondering if ${post.product} actually works? We took an honest look at what you really get, how it claims to work, and who it is (and is not) for. Read the full review before you buy.`,
		},
		2: {
			title: (post.list ? post.list.heading : post.hookTitle).slice(0, 100),
			description: post.list
				? `Start with these: ${post.list.items.slice(0, 3).join(', ')}... plus ${post.list.items.length - 3} more simple ideas in the full guide. Save this pin for later!`
				: post.description,
		},
		3: {
			title: (post.price ? `Is ${post.product} Worth ${post.price}? Honest Verdict` : `Is ${post.product} Worth It? Honest Verdict`).slice(0, 100),
			description: `Thinking about ${post.product}? Before you spend a cent, see the price, the guarantee, the pros and cons, and our honest verdict in the full review.`,
		},
		4: {
			title: `Before You Buy ${post.product}, Read This`.slice(0, 100),
			description: `${post.description} Read the honest review first so you know exactly what to expect.`,
		},
	};
	const c = copies[n];
	return { ...c, description: `${c.description} #affiliate ${tags}`.trim().slice(0, 500), link };
}

function schedule(n) {
	const d = new Date();
	d.setDate(d.getDate() + (n - 1) * 3);
	return d.toISOString().slice(0, 10);
}

async function generate(slug) {
	const post = loadPost(slug);
	const theme = THEMES[post.category] || THEMES['health-fitness'];
	const outDir = path.join(PINS_DIR, slugify(post.product));
	fs.mkdirSync(outDir, { recursive: true });

	const designs = [
		pinHook(post, theme),
		post.list ? pinList(post, theme) : pinWarning(post, theme),
		pinVerdict(post, theme),
		pinWarning(post, theme),
	];
	if (!post.list) designs[3] = pinHook({ ...post, pins: { hook: `The Truth About ${post.product}` } }, theme);

	for (let i = 0; i < designs.length; i++) {
		await sharp(Buffer.from(designs[i]), { density: 144 })
			.resize(W, H)
			.jpeg({ quality: 90 })
			.toFile(path.join(outDir, `${i + 1}.jpg`));
	}

	const board = BOARDS[post.category] || 'Smart Picks';
	const md = [
		`# ${post.product} pins`,
		'',
		`Post: ${SITE_URL}/blog/${post.slug}/`,
		`Board: **${board}**`,
		'',
		'Upload one pin every 3 days (suggested dates below) using Pinterest\'s scheduler.',
		'',
		...[1, 2, 3, 4].flatMap((n) => {
			const c = pinCopy(post, n);
			return [
				`## Pin ${n} (${n}.jpg) - post on ${schedule(n)}`,
				'',
				`**Title:** ${c.title}`,
				'',
				`**Description:** ${c.description}`,
				'',
				`**Link:** ${c.link}`,
				'',
			];
		}),
	].join('\n');
	fs.writeFileSync(path.join(outDir, 'pins.md'), md);

	console.log(`✔ ${post.product}: 4 pins -> ${path.relative(ROOT, outDir)}`);
	if (!post.list) console.log('  (no numbered list found in the post, used a different design for pin 2)');
	if (!post.facts.length) console.log('  (no quick verdict box found, pin 3 shows fewer facts)');
}

const args = process.argv.slice(2);
const slugs = args.length
	? args
	: fs.readdirSync(BLOG_DIR).filter((f) => /\.mdx?$/.test(f)).map((f) => f.replace(/\.mdx?$/, ''));

for (const slug of slugs) {
	try {
		await generate(slug);
	} catch (err) {
		console.error(`✖ ${slug}: ${err.message}`);
		process.exitCode = 1;
	}
}
