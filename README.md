# Smart Pick

Affiliate blog built with Astro and hosted on Cloudflare Pages: https://smart-pick.pages.dev

Every push to `main` deploys automatically.

## Commands

| Command | What it does |
| :-- | :-- |
| `npm run dev` | Preview the site at http://localhost:4321 |
| `npm run build` | Build the site into `dist/` |
| `npm run pins <post-name>` | Create the next 4 Pinterest pins for a post (1-4, then 5-8) |
| `npm run pins <post-name> -- --set 2` | Recreate a specific set of 4 pins |
| `npm run pins` | Create the next set for every post |

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

Optional overrides in the post frontmatter:

```yaml
pins:
  hook: 'Custom text for pin 1'
  teaser: 'Custom subtitle for pin 4'
  truth: 'Custom subtitle for pin 8'
```

Colors come from the post category (see `THEMES` in `scripts/pins.mjs`).
