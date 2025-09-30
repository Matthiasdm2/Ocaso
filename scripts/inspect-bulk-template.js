import { Workbook } from 'exceljs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname, '..', 'public', 'templates', 'bulk-listings-template.xlsx');

async function inspect() {
  if (!fs.existsSync(file)) {
    console.error('File missing:', file);
    process.exit(2);
  }
  const wb = new Workbook();
  await wb.xlsx.readFile(file);
  console.log('Sheets:', wb.worksheets.map((s) => s.name));
  const lists = wb.getWorksheet('Lists');
  if (!lists) {
    console.error('No Lists sheet');
  } else {
    console.log('Lists sheet dims:', lists.columnCount, 'cols x', lists.rowCount, 'rows');
    // print first row headers
    const headers = [];
    for (let c = 1; c <= lists.columnCount; c++) headers.push(lists.getCell(1, c).value);
    console.log('Lists headers (safe names):', headers.filter(Boolean));
  }
  console.log('Defined names keys:', wb.definedNames ? Object.keys(wb.definedNames) : 'none');
  const ws = wb.getWorksheet('template');
  if (!ws) return;
  // check some rows in column F for dataValidation
  const checks = [];
  for (let r = 2; r <= 5; r++) {
    const dv = ws.getCell(`F${r}`).dataValidation;
    checks.push({ row: r, dv: dv ? dv.formulae : null });
  }
  console.log('DataValidation on F2..F5:', checks);
}

inspect().catch((e) => { console.error(e); process.exit(1); });
