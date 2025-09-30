/* eslint-disable @typescript-eslint/no-var-requires */
const QRCode = require('qrcode');
const fs = require('fs');

const sanitize = (v, max = 70) =>
  v
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .slice(0, max);

async function run() {
  const payee = sanitize('Jeroen Démo', 70);
  const iban = 'BE72007000000001';
  const amount = 'EUR12.34';
  const rem = sanitize('Ocaso 12345', 35);
  const lines = ['BCD','001','1','SCT','','' + payee, iban, amount, '', rem];
  const epc = lines.join('\n') + '\n';
  console.log('EPC payload:\n', epc);
  const png = await QRCode.toBuffer(epc, { errorCorrectionLevel: 'L', scale: 8, margin: 4 });
  fs.writeFileSync('sample-epc.png', png);
  console.log('Wrote sample-epc.png');
}

run().catch(e => { console.error(e); process.exit(1); });
