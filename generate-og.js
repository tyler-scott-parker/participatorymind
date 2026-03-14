#!/usr/bin/env node
/**
 * generate-og.js
 * Generates Open Graph share images for all articles.
 * Run automatically via: npm run build
 * Run manually via: node generate-og.js
 *
 * Reads article front matter, generates a 1200x630 PNG for each
 * into /static/og/<articleId>.png. Skips articles that already
 * have an up-to-date image unless --force is passed.
 */

const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

const ARTICLES_DIR = path.join(__dirname, 'src/articles');
const OUTPUT_DIR = path.join(__dirname, 'static/og');
const FORCE = process.argv.includes('--force');

// Colors matching site CSS variables
const BG = '#0e0e0e';
const GOLD = '#c9a96e';
const TEXT = '#f0ece4';
const MUTED = '#777777';
const BORDER = '#c9a96e';

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function parseFrontMatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm = {};
  for (const line of match[1].split('\n')) {
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const val = line.slice(colon + 1).trim().replace(/^["']|["']$/g, '');
    fm[key] = val;
  }
  return fm;
}

function generateImage(articleId, title, description) {
  const W = 1200, H = 630;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  // Gold left accent line
  ctx.fillStyle = GOLD;
  ctx.fillRect(80, 80, 3, 470);

  // Site label
  ctx.fillStyle = GOLD;
  ctx.font = '500 20px serif';
  ctx.fillText('PARTICIPATORY MIND', 120, 110);

  // Title
  ctx.fillStyle = TEXT;
  ctx.font = 'italic 58px serif';
  const titleLines = wrapText(ctx, title, 900);
  let y = 175;
  for (const line of titleLines.slice(0, 3)) {
    ctx.fillText(line, 120, y);
    y += 72;
  }

  // Description
  ctx.fillStyle = MUTED;
  ctx.font = '26px serif';
  const descLines = wrapText(ctx, description, 900);
  y += 16;
  for (const line of descLines.slice(0, 3)) {
    ctx.fillText(line, 120, y);
    y += 40;
  }

  // Attribution
  ctx.fillStyle = '#444444';
  ctx.font = '20px serif';
  ctx.fillText('Tyler Parker & Claude Sonnet 4.6  —  participatorymind.org', 120, 530);

  // Gold bottom line
  ctx.fillStyle = GOLD;
  ctx.fillRect(80, 578, 1040, 2);

  return canvas.toBuffer('image/png');
}

// Ensure output dir exists
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Process all article files
const files = fs.readdirSync(ARTICLES_DIR).filter(f => f.endsWith('.njk'));
let generated = 0, skipped = 0;

for (const file of files) {
  const content = fs.readFileSync(path.join(ARTICLES_DIR, file), 'utf8');
  const fm = parseFrontMatter(content);
  const { articleId, title, description } = fm;

  if (!articleId || !title) { skipped++; continue; }

  const outPath = path.join(OUTPUT_DIR, `${articleId}.png`);

  if (!FORCE && fs.existsSync(outPath)) { skipped++; continue; }

  try {
    const buf = generateImage(articleId, title, description || '');
    fs.writeFileSync(outPath, buf);
    console.log(`  ✓ og/${articleId}.png`);
    generated++;
  } catch (e) {
    console.error(`  ✗ ${articleId}: ${e.message}`);
  }
}

console.log(`\nOG images: ${generated} generated, ${skipped} skipped. Pass --force to regenerate all.`);
