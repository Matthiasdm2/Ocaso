declare module 'qrcode' {
  type QRCodeToBufferOptions = {
    type?: 'png' | 'svg' | 'utf8';
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    scale?: number;
    margin?: number;
    color?: { dark?: string; light?: string };
  };
  function toBuffer(text: string, opts?: QRCodeToBufferOptions): Promise<Buffer>;
  function toDataURL(text: string, opts?: QRCodeToBufferOptions): Promise<string>;
  const _default: { toBuffer: typeof toBuffer; toDataURL: typeof toDataURL };
  export default _default;
  export { toBuffer, toDataURL };
}
