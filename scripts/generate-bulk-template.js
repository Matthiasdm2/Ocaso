import fs from 'fs';
import path from 'path';
import { book_append_sheet, book_new, utils, writeFile } from 'xlsx';

const headers = [
  'title',
  'price',
  'description',
  'location',
  'category',
  'subcategory',
  'images', // comma-separated URLs
  'main_photo',
  'status',
  'allow_bids',
  'condition',
  'created_at',
];

const rows = [
  ['Retro platenspeler', '125', 'Goed werkende platenspeler uit 1978', 'Gent', "Elektronica, TV & Audio", "LP's & CD's", 'https://example.com/img1.jpg,https://example.com/img2.jpg', 'https://example.com/img1.jpg', 'active', 'false', 'used', '2025-09-20'],
  ['Kinderfiets', '60', 'Tweedehands kinderfiets, 20 inch', 'Antwerpen', "Kinderen & Baby's", 'Kinderkleding', 'https://example.com/bike1.jpg', 'https://example.com/bike1.jpg', 'active', 'false', 'used', '2025-09-19'],
];

const ws_data = [headers, ...rows];
const ws = utils.aoa_to_sheet(ws_data);
const wb = book_new();
book_append_sheet(wb, ws, 'template');

// Try to read categories from lib/categories.ts and write them to a separate sheet
const categoriesFile = path.join(__dirname, '..', 'lib', 'categories.ts');
let catNames = [];
if (fs.existsSync(categoriesFile)) {
  const txt = fs.readFileSync(categoriesFile, 'utf8');
  // crude parse: capture name: "..." occurrences
  const regex = /name:\s*"([^"]+)"/g;
  const names = [];
  let m;
  while ((m = regex.exec(txt))) {
    names.push(m[1]);
  }
  // unique & preserve order
  catNames = Array.from(new Set(names));
}

if (catNames.length) {
  const catSheet = utils.aoa_to_sheet([['categories'], ...catNames.map((c) => [c])]);
  book_append_sheet(wb, catSheet, 'Categories');
}

const outDir = path.join(__dirname, '..', 'public', 'templates');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'bulk-listings-template.xlsx');
writeFile(wb, outPath);
console.log('Wrote', outPath);
