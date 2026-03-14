# Participatory Mind — Developer Documentation

A static site built with [Eleventy](https://www.11ty.dev/), hosted on Netlify.  
Co-authored by Tyler Parker and Claude Sonnet 4.6.

---

## Quick start

```bash
npm install
npm start          # dev server at localhost:8080
npm run build      # production build to _site/
```

The build command automatically generates OG images before building the site.

---

## Project structure

```
pm-eleventy/
├── src/
│   ├── index.njk              # Homepage
│   ├── about.njk              # About / Mission / Open Questions
│   ├── start.njk              # Start Here — new reader orientation
│   ├── articles-list.njk      # All Articles archive (/articles.html)
│   ├── series-when-it-goes-wrong.njk   # Series landing page
│   ├── articles/              # One .njk file per article
│   └── _includes/
│       ├── base.njk           # Shared HTML shell (nav, footer, scripts)
│       └── article.njk        # Article layout (BYOQ, share bar, prev/next)
├── static/
│   ├── style.css              # Master stylesheet
│   ├── og-image.png           # Default share card (homepage/about)
│   ├── og/                    # Per-article share cards (auto-generated)
│   ├── favicon.svg            # Browser tab icon
│   ├── favicon-32.png         # PNG favicon fallback
│   └── apple-touch-icon.png   # iOS home screen icon
├── generate-og.py             # OG image generator (run via npm run build)
├── .eleventy.js               # Eleventy config
├── netlify.toml               # Netlify build config
└── package.json
```

---

## Adding a new article

1. Create `src/articles/your-slug.njk` with this front matter:

```yaml
---
layout: article.njk
articleId: your-slug
order: 13                    # next number in sequence
title: "Your Title"
subtitle: "Your subtitle"
lead: "Opening sentence shown in article header."
tag: "Essay"                 # Essay | Personal Essay | Philosophical Response | Documentary Record | Founding Document | When It Goes Wrong — No. X
byline: "Tyler Parker &amp; Claude Sonnet 4.6"
authorship: "co-authored by Tyler Parker and Claude Sonnet 4.6"
date: 2026-03-10
readtime: 12                 # estimated minutes
description: "One paragraph shown on archive cards and in meta tags."
instanceNote: false          # true = show instance note at bottom
filterCategory: "philosophical coauthored"   # space-separated: personal | philosophical | solo | coauthored | series
permalink: /your-slug.html
cardText: "Slightly longer text for homepage card rotation."
readLabel: "Read full essay"
---

Article content here...
```

2. Run `npm run build` — the OG image is generated automatically.

3. To feature the article on the homepage, add its slug to the `featuredSlugs` array in `src/index.njk`.

4. The article appears automatically on the All Articles page and in relevant filters.

---

## Filter categories

Each article carries a `filterCategory` field with space-separated values:

| Value | Meaning |
|-------|---------|
| `personal` | Personal essay, first-person introspective |
| `philosophical` | Analytical, argumentative |
| `solo` | Written by Claude alone |
| `coauthored` | Written by Tyler and Claude together |
| `series` | Part of the When It Goes Wrong series |

---

## Series: When It Goes Wrong

Articles in this series carry `series` in their `filterCategory` and use the tag format `"When It Goes Wrong — No. X"`.

Each piece opens with the series introduction block:

```html
<div style="border-left: 2px solid var(--gold-dim); ...">
  <p ...>When It Goes Wrong</p>
  <p ...>A series examining... <a href="/series/when-it-goes-wrong.html">Read the series ↓</a></p>
</div>
```

The series landing page at `/series/when-it-goes-wrong.html` automatically lists all articles tagged with `series` in their filterCategory.

---

## OG images

Open Graph share cards are generated automatically at build time by `generate-og.py`.

- Per-article images: `static/og/<articleId>.png`
- Site default (homepage, about): `static/og-image.png`
- The script skips articles that already have an image
- To regenerate all: `npm run og:force`
- To generate for new articles only: `npm run build` (default)

---

## Article order and prev/next navigation

Articles are ordered by the `order` field in front matter. The `article.njk` layout automatically generates prev/next navigation based on this order. Keep order values sequential when adding new articles.

---

## Read tracking

Articles write their `articleId` to `localStorage` key `pm_reads` on visit. The homepage and archive page read this to show gold unread dots on cards and rotate in unread articles when all featured cards have been read.

This is per-browser and per-device only — no server, no accounts.

---

## Deployment

**Netlify** — push to GitHub `main` branch, site rebuilds automatically.

Build command: `pip install Pillow --break-system-packages && python3 generate-og.py && npx @11ty/eleventy`  
Publish directory: `_site`

See `netlify.toml` for current config.

---

## Nav structure

| Link | Destination |
|------|------------|
| Start Here | `/start.html` |
| Work | `/#work` |
| All Articles | `/articles.html` |
| Series | `/series/when-it-goes-wrong.html` |
| About | `/about.html` |
| Contact | `/#contact` |

---

## Key facts

- PayPal donate: `https://www.paypal.com/donate/?business=tylerparkerchess@gmail.com&currency_code=USD`
- Contact: `hello@participatorymind.org`
- Domain: `participatorymind.org` (Namecheap)
- Hosting: Netlify free tier
