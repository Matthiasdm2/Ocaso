/* eslint-disable @typescript-eslint/no-var-requires */
const QRCode = require('qrcode');
const fs = require('fs');

const sanitize = (v, max = 70) =>
  v
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .slice(0, max);

const makeEpc = ({ bic = '', payee = 'Jeroen Démo', iban = 'BE72007000000001', amount = 'EUR12.34', rem = 'Ocaso 12345' }) => {
  const lines = ['BCD','001','1','SCT', bic, '' + sanitize(payee, 70), iban.replace(/\s+/g, '').toUpperCase(), amount, '', sanitize(rem, 35)];
  return lines.join('\n') + '\n';
};

const variants = [];
const bics = ['', 'KREDBEBB'];
const payees = ['Jeroen Démo', 'JEROEN DEMO'];
const amounts = ['EUR12.34', 'EUR12,34'];
const eccs = ['L', 'M'];
const scales = [8, 10];
const margins = [4, 6];

bics.forEach(bic => {
  payees.forEach(payee => {
    amounts.forEach(amount => {
      eccs.forEach(ecc => {
        scales.forEach(scale => {
          margins.forEach(margin => {
            variants.push({ bic, payee, amount, ecc, scale, margin });
          });
        });
      });
    });
  });
});

(async () => {
  for (let i = 0; i < variants.length; i++) {
    const v = variants[i];
    const epc = makeEpc({ bic: v.bic, payee: v.payee, amount: v.amount });
    const name = `epc_bic-${v.bic || 'NO'}_payee-${v.payee.replace(/\s+/g, '_')}_amt-${v.amount.replace(/\W/g, '')}_ecc-${v.ecc}_s-${v.scale}_m-${v.margin}.png`;
    try {
      const png = await QRCode.toBuffer(epc, { errorCorrectionLevel: v.ecc, scale: v.scale, margin: v.margin });
      fs.writeFileSync(name, png);
      console.log('Wrote', name);
    } catch (e) {
      console.error('Failed', name, e && e.message);
    }
  }
})();
