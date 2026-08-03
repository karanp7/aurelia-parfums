import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import * as XLSX_NS from 'xlsx';

// The xlsx package's ESM named exports don't include readFile/writeFile in this
// version — those live on the CJS-style default export. Fall back gracefully
// either way so this keeps working across xlsx releases.
const XLSX = XLSX_NS.readFile ? XLSX_NS : XLSX_NS.default;

const root = process.cwd();
const source = process.argv[2] || path.join(root, 'data', 'products.xlsx');
const output = path.join(root, 'src', 'data', 'perfumes.js');

if (!fs.existsSync(source)) {
  console.error(`Product spreadsheet not found: ${source}`);
  console.error('Copy your Excel file to data/products.xlsx or pass a path: npm run import:products -- /path/file.xlsx');
  process.exit(1);
}

const workbook = XLSX.readFile(source, { cellDates: false });
const sheetName = workbook.SheetNames.includes('Products') ? 'Products' : workbook.SheetNames[0];
const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });

const clean = (value) => String(value ?? '').trim();
const number = (value, fallback = 0) => {
  if (typeof value === 'number') return value;
  const parsed = Number(String(value ?? '').replace(/[$,]/g, '').trim());
  return Number.isFinite(parsed) ? parsed : fallback;
};
const list = (value) => clean(value).split('|').map((item) => item.trim()).filter(Boolean);
const slugify = (value) => clean(value).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const toneForFamily = (family) => ({
  Floral: 'rose', Woody: 'amber', Fresh: 'blue', Gourmand: 'cream', Fruity: 'plum', Amber: 'amber', Citrus: 'blue', Musk: 'cream', Chypre: 'red', Oriental: 'plum'
}[family] || 'rose');

const seenIds = new Set();
const uniqueId = (base) => {
  let id = base;
  let counter = 2;
  while (seenIds.has(id)) {
    id = `${base}-${counter}`;
    counter += 1;
  }
  seenIds.add(id);
  return id;
};

const products = rows
  .filter((row) => clean(row.Active).toLowerCase() !== 'no')
  .filter((row) => clean(row.Name))
  .map((row, index) => {
    const rowNumber = index + 2; // account for header row
    const id = uniqueId(slugify(row.ID || row.Name) || `product-${rowNumber}`);
    const family = clean(row.Family) || 'Other';
    const sizes = [
      ['30 ml', row['30ml Price']],
      ['50 ml', row['50ml Price']],
      ['100 ml', row['100ml Price']],
    ].filter(([, price]) => number(price, 0) > 0).map(([label, price]) => ({ label, price: number(price) }));

    if (!sizes.length) {
      throw new Error(
        `Row ${rowNumber} ("${clean(row.Name) || 'unnamed product'}") has no valid size price. ` +
        `Fill in at least one of "30ml Price", "50ml Price" or "100ml Price" with a number greater than 0.`
      );
    }

    const imageUrl = clean(row['Image URL']);
    const imageFile = clean(row['Image File']);
    const image = imageUrl || (imageFile ? `/images/products/${imageFile}` : '');

    return {
      id,
      sku: clean(row.SKU),
      name: clean(row.Name),
      house: clean(row.Brand) || 'Independent House',
      family,
      secondaryFamily: clean(row['Secondary Family']),
      mood: clean(row.Mood) || 'Elegant',
      price: sizes.find((size) => size.label === '50 ml')?.price || sizes[0].price,
      sizes,
      rating: number(row.Rating, 0),
      reviews: Math.round(number(row['Review Count'], 0)),
      notes: {
        top: list(row['Top Notes']),
        heart: list(row['Heart Notes']),
        base: list(row['Base Notes']),
      },
      summary: clean(row.Summary) || clean(row.Description),
      description: clean(row.Description) || clean(row.Summary),
      image,
      imageAlt: `${clean(row.Brand)} ${clean(row.Name)} perfume bottle`.trim(),
      tone: toneForFamily(family),
      badge: clean(row.Badge),
      intensity: Math.max(1, Math.min(5, Math.round(number(row.Intensity, 3)))),
      longevity: clean(row.Longevity) || 'Not specified',
      projection: clean(row.Projection) || 'Not specified',
      occasions: list(row.Occasions),
      seasons: list(row.Seasons),
      reviewQuote: clean(row['Review Quote']),
      reviewMeta: clean(row['Review Meta']),
    };
  });

if (!products.length) {
  console.error(`No active product rows found in sheet "${sheetName}".`);
  process.exit(1);
}

// Every mood offered as a quiz answer option (see MOOD_OPTIONS in src/App.jsx).
// If the workbook introduces a product mood outside this list, the quiz's
// "how should it feel" question simply won't be able to award mood points for
// it — it can still surface on family/intensity scoring alone. This is
// surfaced here (not just in the app) so it's visible at import time.
const QUIZ_MOOD_OPTIONS = ['Elegant', 'Confident', 'Energizing', 'Comforting', 'Magnetic', 'Romantic'];
const unmatchedMoods = [...new Set(products.map((product) => product.mood).filter((mood) => !QUIZ_MOOD_OPTIONS.includes(mood)))];
if (unmatchedMoods.length) {
  console.warn(
    `Note: these product moods aren't offered as quiz answers and won't score mood points: ${unmatchedMoods.join(', ')}. ` +
    `Add them to QUIZ_MOOD_OPTIONS in src/App.jsx if you want the quiz to be able to fully match them.`
  );
}

const discoverySet = {
  id: 'personal-discovery-set',
  type: 'discovery',
  name: 'Your Personal Discovery Set',
  price: 18,
  sampleCount: 3,
  sampleSize: '2 ml each',
  wears: 'Approximately 20–30 wears total',
  credit: 18,
  creditWindow: '45 days',
  tone: 'ivory'
};

const content = `// AUTO-GENERATED from ${path.relative(root, source)}. Do not edit manually.\n` +
  `export const perfumes = ${JSON.stringify(products, null, 2)};\n\n` +
  `export const discoverySet = ${JSON.stringify(discoverySet, null, 2)};\n`;

fs.writeFileSync(output, content, 'utf8');
console.log(`Imported ${products.length} products from ${path.relative(root, source)}`);
console.log(`Wrote ${path.relative(root, output)}`);
console.log('Image files should exist in public/images/products/ when Image File is used.');
