import pkg from 'exceljs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';
const { Workbook } = pkg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const categoriesFile = path.join(__dirname, '..', 'lib', 'categories.ts');

async function run() {
  const wb = new Workbook();
  const ws = wb.addWorksheet('template');

  const headers = [
    'title', 'price', 'description', 'location', 'category', 'subcategory', 'images', 'main_photo', 'status', 'allow_bids', 'condition', 'created_at'
  ];
  ws.addRow(headers);

  // sample rows
  ws.addRow(['Retro platenspeler', 125, 'Werkende platenspeler uit 1978', 'Gent', 'Elektronica, TV & Audio', "LP's & CD's", 'https://example.com/img1.jpg,https://example.com/img2.jpg', 'https://example.com/img1.jpg', 'active', false, 'used', '2025-09-20']);
  ws.addRow(['Kinderfiets', 60, 'Tweedehands kinderfiets', 'Antwerpen', "Kinderen & Baby's", 'Speelgoed', 'https://example.com/bike1.jpg', 'https://example.com/bike1.jpg', 'active', false, 'used', '2025-09-19']);

  // categories sheet
  const catSheet = wb.addWorksheet('Categories');
  let catNames = [];
  let subMap = {};
  if (fs.existsSync(categoriesFile)) {
    const txt = fs.readFileSync(categoriesFile, 'utf8');
    // Try to extract the CATEGORIES array and coerce into JSON
    const start = txt.indexOf('CATEGORIES');
    if (start !== -1) {
      const arrStart = txt.indexOf('[', start);
      const arrEnd = txt.indexOf('];', arrStart);
      if (arrStart !== -1 && arrEnd !== -1) {
        let arrText = txt.slice(arrStart, arrEnd + 1);
        // Quote unquoted keys (name, slug, subs)
        arrText = arrText.replace(/([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '"$1":');
        // Remove trailing commas before } or ]
        arrText = arrText.replace(/,\s*(\}|\])/g, '$1');
        try {
          // Evaluate the array literal in a sandboxed vm to recover the JS objects.
          const sandbox = {};
          const script = new vm.Script(`CATEGORIES = ${arrText};`);
          const context = vm.createContext(sandbox);
          script.runInContext(context);
          const parsed = sandbox.CATEGORIES;
          if (Array.isArray(parsed)) {
            catNames = parsed.map((c) => c.name).filter(Boolean);
            parsed.forEach((c) => {
              subMap[c.name] = (c.subs || []).map((s) => s.name);
            });
          }
        } catch (e) {
          console.error('GENERATOR: failed to evaluate categories.ts:', e && e.message ? e.message : e);
        }
      }
    }
  }

  // write categories column
  catSheet.addRow(['categories']);
  catNames.forEach((c) => catSheet.addRow([c]));

  // write subcategories sheet
  const subSheet = wb.addWorksheet('Subcategories');
  subSheet.addRow(['category','subcategory']);
  Object.keys(subMap).forEach((cat) => {
    subMap[cat].forEach((sub) => subSheet.addRow([cat, sub]));
  });

  // Create a hidden 'Lists' sheet where each category gets its own column of subcategories
  const listsSheet = wb.addWorksheet('Lists');
  // veryHidden so it's not visible in Excel UI
  listsSheet.state = 'veryHidden';
  const safeNameFor = (s) => String(s).replace(/[^A-Za-z0-9_]/g, '_');

  // helper: column number to letter (1 => A, 27 => AA)
  function colToLetter(col) {
    let letter = '';
    while (col > 0) {
      const mod = (col - 1) % 26;
      letter = String.fromCharCode(65 + mod) + letter;
      col = Math.floor((col - 1) / 26);
    }
    return letter;
  }

  // determine max number of sub rows
  const cats = Object.keys(subMap);
  const maxSubs = Math.max(1, ...cats.map((c) => (subMap[c] || []).length));

  // build a 2D array for Lists where first row is safe names and following rows are sub values
  const listRows = [];
  const headerRow = cats.map((cat) => safeNameFor(cat) || '');
  listRows.push(headerRow);
  for (let i = 0; i < maxSubs; i++) {
    const row = cats.map((cat) => {
      const subs = subMap[cat] || [];
      return subs[i] || null;
    });
    listRows.push(row);
  }
  // debug
  console.log('GENERATOR DEBUG: cats length =', cats.length);
  console.log('GENERATOR DEBUG: maxSubs =', maxSubs);
  console.log('GENERATOR DEBUG: headerRow sample =', headerRow.slice(0,6));
  console.log('GENERATOR DEBUG: listRows length =', listRows.length);
  // write rows to listsSheet
  listRows.forEach((r) => listsSheet.addRow(r));

  // add named ranges per category column
  cats.forEach((cat, idx) => {
    const col = idx + 1;
    const safe = safeNameFor(cat) || `cat${col}`;
    const colLetter = colToLetter(col);
    const last = 1 + maxSubs;
    // Quote sheet name to be safe
    const range = `'Lists'!$${colLetter}$2:$${colLetter}$${last}`;
    try {
      if (wb.definedNames && typeof wb.definedNames.add === 'function') {
        wb.definedNames.add(safe, range);
      } else if (wb.definedNames) {
        wb.definedNames[safe] = range;
      }
    } catch (err) {
      // ignore
    }
  });

  // create a named range for categories
  if (catNames.length) {
    // ExcelJS doesn't support defined names referencing ranges in the workbook directly in older versions.
    // But we can add a simple dataValidation list referencing the sheet cells by address.
    const lastRow = catSheet.rowCount;
    const listAddress = `Categories!$A$2:$A$${lastRow}`;
    // Apply dataValidation to column E (category) for rows 2..200
    for (let r = 2; r <= 200; r++) {
      ws.getCell(`E${r}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [listAddress],
        showErrorMessage: true,
        errorTitle: 'Ongeldige categorie',
        error: 'Selecteer een categorie uit de lijst in het Categories blad.'
      };

      // For subcategory (column F), use INDIRECT on the sanitized category name to point to the named range created in Lists
      // sanitize by replacing unsafe chars with underscore to match safeNameFor used when creating named ranges
      const sanitizeExpr = `SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(SUBSTITUTE($E${r}," ","_"),"&","_"),",","_"),"'","_")`;
      const indirect = `INDIRECT(${sanitizeExpr})`;
      ws.getCell(`F${r}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [indirect],
        showErrorMessage: true,
        errorTitle: 'Ongeldige subcategorie',
        error: 'Selecteer een subcategorie die bij de gekozen categorie hoort.'
      };
    }
  }

  const outDir = path.join(__dirname, '..', 'public', 'templates');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'bulk-listings-template.xlsx');
  await wb.xlsx.writeFile(outPath);
  console.log('Wrote', outPath);
}

run().catch((e) => { console.error(e); process.exit(1); });
