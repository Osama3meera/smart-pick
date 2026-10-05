import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import ffmpegPath from 'ffmpeg-static';
import matter from 'gray-matter';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import sharp from 'sharp';
import { esc, fit, FONT, HASHTAGS, loadPost, SITE_LABEL, SITE_URL, slugify, textBlock, THEMES } from './pins.mjs';

const run = promisify(execFile);
const ROOT = path.resolve(import.meta.dirname, '..');
const VIDEOS_DIR = path.join(ROOT, 'videos');
const TMP_DIR = path.join(ROOT, '.video-tmp');
const W = 1080;
const H = 1920;
const FPS = 30;
const DEFAULT_VOICE = 'en-US-AndrewNeural';
const END_SCREEN = 'Follow for more || Follow for more tips, and check the link in the first comment.';

function parseScenes(content) {
	return content
		.split(/\r?\n\s*\r?\n/)
		.map((block) => block.replace(/\s*\r?\n\s*/g, ' ').trim())
		.filter(Boolean)
		.map((block) => {
			const [screen, voice] = block.split('||').map((part) => part.trim());
			return { screen, voice: voice || screen };
		});
}

function background(theme) {
	return `<defs>
<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${theme.bg1}"/><stop offset="1" stop-color="${theme.bg2}"/></linearGradient>
<radialGradient id="glow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ffffff" stop-opacity="0.16"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
</defs>
<rect width="${W}" height="${H}" fill="url(#bg)"/>
<circle cx="960" cy="260" r="380" fill="url(#glow)"/>
<circle cx="120" cy="1660" r="420" fill="url(#glow)"/>`;
}

function brand(theme) {
	return `<g transform="translate(${W / 2 - 150} 190)">
<rect width="64" height="64" rx="16" fill="${theme.accent}"/>
<path d="M18 33l10 10 19-21" fill="none" stroke="${theme.ink}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
<text x="84" y="47" font-family="${FONT}" font-size="44" font-weight="700" fill="#ffffff">Smart Pick</text>
</g>`;
}

function progress(theme, index, total) {
	const width = 600;
	const x = (W - width) / 2;
	const done = (width * (index + 1)) / total;
	return `<rect x="${x}" y="1560" width="${width}" height="10" rx="5" fill="#ffffff" opacity="0.2"/>
<rect x="${x}" y="1560" width="${done}" height="10" rx="5" fill="${theme.accent}"/>`;
}

function sceneSvg(scene, index, total, theme) {
	const text = fit(scene.screen, { size: 104, minSize: 56, maxWidth: 900, maxLines: 7 });
	const lineHeight = 1.2;
	const blockHeight = (text.lines.length - 1) * text.size * lineHeight;
	const y = 960 - blockHeight / 2 + text.size * 0.35;
	const fill = index === 0 ? theme.accent : '#ffffff';
	const block = textBlock(text.lines, { x: W / 2, y, size: text.size, fill, lineHeight });
	const underline =
		index === 0
			? `<rect x="${W / 2 - 120}" y="${block.bottom + 50}" width="240" height="12" rx="6" fill="#ffffff" opacity="0.85"/>`
			: '';
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
${background(theme)}
${brand(theme)}
${block.svg}
${underline}
${progress(theme, index, total)}
</svg>`;
}

function endSvg(theme) {
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
${background(theme)}
<g transform="translate(${W / 2 - 90} 470)">
<rect width="180" height="180" rx="44" fill="${theme.accent}"/>
<path d="M48 92l28 28 56-60" fill="none" stroke="${theme.ink}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
</g>
<text x="${W / 2}" y="800" text-anchor="middle" font-family="${FONT}" font-size="64" font-weight="700" fill="${theme.soft}">Smart Pick</text>
<rect x="190" y="900" width="700" height="150" rx="75" fill="${theme.accent}"/>
<text x="${W / 2}" y="998" text-anchor="middle" font-family="${FONT}" font-size="72" font-weight="700" fill="${theme.ink}">Follow</text>
<text x="${W / 2}" y="1200" text-anchor="middle" font-family="${FONT}" font-size="58" font-weight="700" fill="#ffffff">Link in the first comment</text>
<g transform="translate(${W / 2} 1300)" fill="none" stroke="${theme.accent}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round">
<path d="M0 0v110M-45 65l45 45 45-45"/>
</g>
<text x="${W / 2}" y="1560" text-anchor="middle" font-family="${FONT}" font-size="38" fill="${theme.soft}">${esc(SITE_LABEL)}</text>
</svg>`;
}

async function speak(tts, text, file) {
	const dir = path.dirname(file);
	const { audioFilePath } = await tts.toFile(dir, text, { rate: '+5%' });
	fs.renameSync(audioFilePath, file);
}

async function duration(file) {
	const { stderr } = await run(ffmpegPath, ['-i', file]).catch((err) => err);
	const m = stderr.match(/Duration: (\d+):(\d+):([\d.]+)/);
	if (!m) throw new Error(`Could not read duration of ${file}`);
	return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

async function renderClip(image, audio, seconds, out) {
	const frames = Math.ceil(seconds * FPS);
	const fadeOut = Math.max(0, seconds - 0.25).toFixed(2);
	const video = [
		`scale=${W * 2}:${H * 2}`,
		`zoompan=z='min(zoom+0.0005,1.08)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${W}x${H}:fps=${FPS}`,
		`fade=t=in:st=0:d=0.25`,
		`fade=t=out:st=${fadeOut}:d=0.25`,
		'format=yuv420p',
	].join(',');
	await run(ffmpegPath, [
		'-y',
		'-loop', '1',
		'-i', image,
		'-i', audio,
		'-filter_complex', `[0:v]${video}[v];[1:a]apad,aformat=sample_rates=44100:channel_layouts=stereo[a]`,
		'-map', '[v]',
		'-map', '[a]',
		'-t', seconds.toFixed(2),
		'-c:v', 'libx264',
		'-preset', 'medium',
		'-crf', '20',
		'-r', String(FPS),
		'-c:a', 'aac',
		'-b:a', '160k',
		out,
	]);
}

function nextNumber(dir) {
	if (!fs.existsSync(dir)) return 1;
	const nums = fs.readdirSync(dir).map((f) => Number(f.match(/^(\d+)\.mp4$/)?.[1])).filter(Boolean);
	return nums.length ? Math.max(...nums) + 1 : 1;
}

function postCopy(post, scenes, n) {
	const link = `${SITE_URL}/blog/${post.slug}/?utm_source=pinterest&utm_medium=video&utm_campaign=${post.slug}-video${n}`;
	const tags = HASHTAGS[post.category] || '';
	return [
		`# ${post.product} video ${n}`,
		'',
		`**Title:** ${scenes[0].screen}`.slice(0, 110),
		'',
		`**Description:** ${post.description} Full honest breakdown at the link in the first comment. #affiliate ${tags}`,
		'',
		'**First comment:**',
		'',
		`Read the full honest review here: ${link}`,
		'',
		`**Destination link (Pinterest video pins):** ${link}`,
		'',
		'Cover image: `' + `${n}-cover.jpg` + '`',
		'',
	].join('\n');
}

async function generate(scriptFile) {
	const { data, content } = matter(fs.readFileSync(scriptFile, 'utf8'));
	if (!data.post) throw new Error('Add "post: <post-name>" at the top of the script');
	const post = loadPost(data.post);
	const theme = THEMES[post.category] || THEMES['health-fitness'];
	const scenes = parseScenes(content);
	if (!scenes.length) throw new Error('The script has no scenes');
	const [endScreen, endVoice] = END_SCREEN.split('||').map((s) => s.trim());
	const all = [...scenes, { screen: endScreen, voice: endVoice, end: true }];

	const outDir = path.join(VIDEOS_DIR, slugify(post.product));
	fs.mkdirSync(outDir, { recursive: true });
	const n = nextNumber(outDir);
	const tmp = path.join(TMP_DIR, `${slugify(post.product)}-${n}`);
	fs.rmSync(tmp, { recursive: true, force: true });
	fs.mkdirSync(tmp, { recursive: true });

	const tts = new MsEdgeTTS();
	await tts.setMetadata(data.voice || DEFAULT_VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);

	const clips = [];
	let total = 0;
	for (let i = 0; i < all.length; i++) {
		const scene = all[i];
		const image = path.join(tmp, `${i}.png`);
		const audio = path.join(tmp, `${i}.mp3`);
		const clip = path.join(tmp, `${i}.mp4`);
		const svg = scene.end ? endSvg(theme) : sceneSvg(scene, i, scenes.length, theme);
		await sharp(Buffer.from(svg), { density: 144 }).resize(W, H).png().toFile(image);
		await speak(tts, scene.voice, audio);
		const seconds = (await duration(audio)) + (scene.end ? 1.2 : 0.45);
		await renderClip(image, audio, seconds, clip);
		clips.push(clip);
		total += seconds;
		process.stdout.write(`  scene ${i + 1}/${all.length} (${seconds.toFixed(1)}s)\n`);
	}
	tts.close();

	const list = path.join(tmp, 'list.txt');
	fs.writeFileSync(list, clips.map((c) => `file '${c.replace(/\\/g, '/')}'`).join('\n'));
	const output = path.join(outDir, `${n}.mp4`);
	await run(ffmpegPath, ['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', output]);

	await sharp(path.join(tmp, '0.png')).jpeg({ quality: 90 }).toFile(path.join(outDir, `${n}-cover.jpg`));
	fs.writeFileSync(path.join(outDir, `${n}.md`), postCopy(post, scenes, n));
	fs.rmSync(tmp, { recursive: true, force: true });

	console.log(`✔ ${post.product}: video ${n} (${total.toFixed(0)}s) -> ${path.relative(ROOT, output)}`);
}

const files = process.argv.slice(2);
if (!files.length) {
	console.error('Usage: npm run video <script-file>');
	process.exit(1);
}
for (const file of files) {
	try {
		await generate(path.resolve(file));
	} catch (err) {
		console.error(`✖ ${file}: ${err.message}`);
		process.exitCode = 1;
	}
}
