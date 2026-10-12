# Smart Pick

Affiliate blog built with Astro and hosted on Cloudflare Pages: https://smart-pick.pages.dev

Every push to `main` deploys automatically.

## Commands

| Command | What it does |
| :-- | :-- |
| `npm run dev` | Preview the site at http://localhost:4321 |
| `npm run build` | Build the site into `dist/` |
| `npm run pins <post-name>` | Create the 8 pins for that post (set by `postNumber`) |
| `npm run pins <post-name> -- --set 3` | Recreate one set of 4 pins |
| `npm run pins` | Create the pins for every post |

## Adding a product

1. Add the HopLink to `public/_redirects`: `/go/<name>  <hoplink>?tid=<post-name>  302`
2. Create `src/content/blog/<post-name>.md` with `title`, `description`, `pubDate`, `heroImage`, `category`, and `product`.
3. In the post, link to `/go/<name>` and include:
   - a quick verdict box (`<div class="verdict">` with `<li><strong>Label:</strong> value</li>` items, including `Price:`)
   - one numbered list of 3 or more tips
   - a "who it is not for" section
4. Run `npm run pins <post-name>`.
5. `git add . && git commit -m "..." && git push`

## Pins

`npm run pins <post-name>` writes to `pins/<product-name>/`:

| File | Design | Built from |
| :-- | :-- | :-- |
| `1.jpg` | Question hook | Part of the title after the `:` |
| `2.jpg` | List teaser (3 shown, rest hidden) | First numbered list and the heading above it |
| `3.jpg` | "Is it worth $X?" | Quick verdict box |
| `4.jpg` | "Before you buy... read this" | Product name |
| `5.jpg` | "Is it right for you?" (fits shown, who should skip hidden) | "Who is it for" section with two bullet lists |
| `6.jpg` | Single tip spotlight | Tip #2 of the numbered list |
| `7.jpg` | "N questions to ask before you buy" | `##` headings that end with `?` |
| `8.jpg` | "The truth about..." | Product name (override with `pins.truth`) |
| `pins.md` | Title, description, link with UTM, board, posting dates | All of the above |

Set 1 (pins 1-4) uses a dark background and set 2 (pins 5-8) a light one, so they look different in the feed.

Sets 3 to 8 (pins 9-32) are built from the post's numbered tips, `##` questions, "Who is it for" lists, ingredient list, price and money-back guarantee, in four looks (dark, light, solid color, tinted). Designs: tip spotlight, "did you know" fact, one question, checklist, price, guarantee, big number, two tips, 3 steps, who should skip, good fit vs skip, ingredients, headline.

## Rule: 4 posts and 32 pins per product

Every product has 4 posts, and every post gets 8 pins:

| Post | `postNumber` | Pins |
| :-- | :-- | :-- |
| First (the review) | 1 | 1-8 |
| Second | 2 | 9-16 |
| Third | 3 | 17-24 |
| Fourth | 4 | 25-32 |

Set `postNumber: 1` to `4` in each post frontmatter (same `product` value on all four), then run `npm run pins <post-name>` for each post. Each post needs a numbered list of 5 or more tips, 4 or more `##` questions, and a "Who is X for?" section. Give each post its own `/go/<name>` redirect with a unique `tid`.

The generator prints a warning if any text is too long for a pin.

Optional overrides in the post frontmatter:

```yaml
pins:
  hook: 'Custom text for pin 1'
  teaser: 'Custom subtitle for pin 4'
  truth: 'Custom subtitle for pin 8'
```

Colors come from the post category (see `THEMES` in `scripts/pins.mjs`). Override per post with `pinTheme: 'orange'` (or any other key in `THEMES`). Add `tags: [...]` to a post to set its Pinterest tags; category tags are added automatically (max 10).

## Videos

`npm run video video-scripts/<name>.md` turns a script into a vertical 1080x1920 MP4 with a voiceover, and adds a "Follow / Link in the first comment" end screen automatically.

Script format:

```md
---
post: the-brain-song-review
voice: en-US-AndrewNeural
---
First scene text (shown on screen and spoken)

Short on-screen text || Longer sentence the voice says
```

Each blank-line-separated paragraph is one scene. Output goes to `videos/<product-name>/`: `<n>.mp4`, `<n>-cover.jpg`, and `<n>.md` (title, description, first-comment text with the tracked link). MP4 files are not committed to git.
