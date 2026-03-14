#!/usr/bin/env python3
"""
generate-og.py
Generates Open Graph share images for all articles.
Called automatically by: npm run build
Called manually by: python3 generate-og.py
Called with --force to regenerate existing images.

Reads article front matter from src/articles/*.njk
Outputs 1200x630 PNGs to static/og/<articleId>.png
Skips articles that already have an image unless --force is passed.
"""

import os, sys, re, textwrap
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("PIL not found. Run: pip install Pillow --break-system-packages")
    sys.exit(1)

ARTICLES_DIR = Path(__file__).parent / 'src' / 'articles'
OUTPUT_DIR   = Path(__file__).parent / 'static' / 'og'
FORCE        = '--force' in sys.argv

BG    = '#0e0e0e'
GOLD  = '#c9a96e'
TEXT  = '#f0ece4'
MUTED = '#777777'

FONT_PATHS = [
    '/usr/share/fonts/truetype/liberation/LiberationSerif-Italic.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf',
    '/usr/share/fonts/truetype/freefont/FreeSerif.ttf',
]
FONT_PATHS_REG = [p.replace('Italic', 'Regular').replace('-Italic','') for p in FONT_PATHS]

def load_font(paths, size):
    for p in paths:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()

def parse_front_matter(text):
    m = re.match(r'^---\n(.*?)\n---', text, re.DOTALL)
    if not m: return {}
    fm = {}
    for line in m.group(1).splitlines():
        if ':' not in line: continue
        k, _, v = line.partition(':')
        fm[k.strip()] = v.strip().strip('"\'')
    return fm

def hex_to_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def generate(article_id, title, description):
    W, H = 1200, 630
    img  = Image.new('RGB', (W, H), hex_to_rgb(BG))
    draw = ImageDraw.Draw(img)

    font_title = load_font(FONT_PATHS, 58)
    font_sub   = load_font(FONT_PATHS_REG, 26)
    font_label = load_font(FONT_PATHS_REG, 20)

    # Gold left accent
    draw.rectangle([(80, 80), (83, 550)], fill=hex_to_rgb(GOLD))

    # Site label
    draw.text((120, 92), 'PARTICIPATORY MIND', font=font_label, fill=hex_to_rgb(GOLD))

    # Title
    lines = textwrap.wrap(title, width=26)
    y = 155
    for line in lines[:3]:
        draw.text((120, y), line, font=font_title, fill=hex_to_rgb(TEXT))
        y += 72

    # Description
    y += 16
    desc_lines = textwrap.wrap(description, width=60)
    for line in desc_lines[:3]:
        draw.text((120, y), line, font=font_sub, fill=hex_to_rgb(MUTED))
        y += 40

    # Attribution
    draw.text((120, 526), 'Tyler Parker & Claude Sonnet 4.6  —  participatorymind.org',
              font=font_label, fill=(68, 68, 68))

    # Gold bottom line
    draw.rectangle([(80, 578), (1120, 580)], fill=hex_to_rgb(GOLD))

    return img

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

files = sorted(ARTICLES_DIR.glob('*.njk'))
generated = skipped = errors = 0

for f in files:
    fm = parse_front_matter(f.read_text())
    article_id  = fm.get('articleId', '')
    title       = fm.get('title', '')
    description = fm.get('description', '')

    if not article_id or not title:
        skipped += 1
        continue

    out = OUTPUT_DIR / f'{article_id}.png'
    if not FORCE and out.exists():
        skipped += 1
        continue

    try:
        img = generate(article_id, title, description)
        img.save(str(out), 'PNG', optimize=True)
        print(f'  ✓  og/{article_id}.png')
        generated += 1
    except Exception as e:
        print(f'  ✗  {article_id}: {e}')
        errors += 1

print(f'\nOG images: {generated} generated, {skipped} skipped, {errors} errors.')
print('Pass --force to regenerate all existing images.')
