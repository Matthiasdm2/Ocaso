// Only import sharp in Node.js server runtime
// Minimal shape used from sharp
type SharpModule = (input?: unknown) => {
    resize: (
        w: number,
        h: number,
        o: { fit: "cover" },
    ) => ReturnType<SharpModule>;
    removeAlpha: () => ReturnType<SharpModule>;
    toFormat: (fmt: "png") => ReturnType<SharpModule>;
    toBuffer: () => Promise<Buffer>;
};
let sharpLib: SharpModule | null = null;
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    sharpLib = require("sharp");
} catch {
    sharpLib = null;
}

type FeatureExtractor = (
    input: Buffer | Uint8Array,
    opts: { pooling: "mean" | "none"; normalize: boolean },
) => Promise<{ data?: Float32Array | number[] } | Float32Array | number[]>;

let cachedExtractor: FeatureExtractor | null = null;

// Compute CLIP embedding using @xenova/transformers in Node.js
// Returns a Float32Array-like number[] of length 512
export async function computeImageEmbedding(buffer: Buffer): Promise<number[]> {
    // Resize to 224 and ensure RGB
    if (!sharpLib) throw new Error("sharp not available in this runtime");
    const img = await sharpLib(buffer).resize(224, 224, { fit: "cover" })
        .removeAlpha().toFormat("png").toBuffer();
    // Lazy import to avoid bundling in edge/client
    if (!cachedExtractor) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore types not available at build time in this environment
        const { pipeline } = await import("@xenova/transformers");
        cachedExtractor =
            (await pipeline(
                "feature-extraction",
                "Xenova/clip-vit-base-patch32",
            )) as unknown as FeatureExtractor;
    }
    const extractor = cachedExtractor;
    const features = await extractor(img, { pooling: "mean", normalize: true });
    const maybeObj = features as { data?: Float32Array | number[] };
    const raw: Float32Array | number[] = Array.isArray(maybeObj as unknown)
        ? (maybeObj as unknown as number[])
        : (maybeObj.data ?? (features as Float32Array | number[]));
    const arr = Array.isArray(raw)
        ? raw as number[]
        : Array.from(raw as { length: number; [k: number]: number });
    const data: number[] = arr.map((v) => Number(v));
    // Ensure length 512
    return data.length === 512 ? data : data.slice(0, 512);
}
