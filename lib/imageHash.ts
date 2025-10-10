import sharp from "sharp";

/** Compute a perceptual average-hash (64 bits as string of '0'/'1') for an image buffer */
export async function computeAHash64(buffer: Buffer): Promise<string> {
    const raw: Buffer = await sharp(buffer)
        .resize(8, 8, { fit: "cover" })
        .grayscale()
        .raw()
        .toBuffer();
    let sum = 0;
    for (const v of raw) sum += v;
    const avg = sum / raw.length;
    let bits = "";
    for (const v of raw) bits += v >= avg ? "1" : "0";
    return bits;
}

/** Hamming distance between two bitstrings of equal length; counts mismatch bits. */
export function hammingDistanceBits(a: string, b: string): number {
    let dist = 0;
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
        if (a[i] !== b[i]) dist++;
    }
    return dist + Math.abs(a.length - b.length);
}
