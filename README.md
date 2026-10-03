# Smart Pick

Affiliate blog built with Astro and hosted on Cloudflare Pages: https://smart-pick.pages.dev

Every push to `main` deploys automatically.

## Commands

| Command | What it does |
| :-- | :-- |
| `npm run dev` | Preview the site at http://localhost:4321 |
| `npm run build` | Build the site into `dist/` |
| `npm run pins <post-name>` | Create 4 Pinterest pins for a post |
| `npm run pins` | Create pins for every post |

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
| `pins.md` | Title, description, link with UTM, board, posting dates | All of the above |

Optional overrides in the post frontmatter:

```yaml
pins:
  hook: 'Custom text for pin 1'
  teaser: 'Custom subtitle for pin 4'
```

Colors come from the post category (see `THEMES` in `scripts/pins.mjs`).
