/* eslint-disable simple-import-sort/imports */
// eslint-disable-next-line simple-import-sort/imports
import { type NextRequest, NextResponse } from "next/server";

import { computeImageEmbedding } from "@/lib/imageEmbedding";
import { computeAHash64, hammingDistanceBits } from "@/lib/imageHash";
import { supabaseServer } from "@/lib/supabaseServer";

// Force Node.js runtime (needed for tesseract.js in server routes)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lightweight Dutch/English stopword list to extract useful search terms
const STOPWORDS = new Set([
  "de",
  "het",
  "een",
  "en",
  "of",
  "voor",
  "met",
  "op",
  "in",
  "te",
  "van",
  "bij",
  "naar",
  "aan",
  "als",
  "je",
  "jij",
  "u",
  "ik",
  "hij",
  "zij",
  "wij",
  "jullie",
  "ze",
  "dit",
  "dat",
  "die",
  "dan",
  "dus",
  "om",
  "maar",
  "ook",
  "nog",
  "al",
  "er",
  "geen",
  "wel",
  "uit",
  "door",
  "tot",
  "over",
  "onder",
  "boven",
  "achter",
  "vooran",
  "voorin",
  "voorop",
  "the",
  "a",
  "an",
  "and",
  "or",
  "for",
  "with",
  "on",
  "in",
  "to",
  "of",
  "by",
  "at",
  "from",
  "is",
  "are",
  "was",
  "were",
  "this",
  "that",
  "these",
  "those",
  "it",
  "as",
  "be",
]);

function extractTerms(input: string): string[] {
  const text = (input || "")
    .toLowerCase()
    // keep letters, numbers and spaces
    .replace(/[^a-zà-ÿ0-9\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return [];
  const raw = text.split(" ");
  const terms: string[] = [];
  for (const t of raw) {
    if (!t) continue;
    if (STOPWORDS.has(t)) continue;
    if (t.length < 2) continue;
    // avoid standalone very small numbers
    if (/^\d{1,2}$/.test(t)) continue;
    terms.push(t);
  }
  // de-dup preserving order
  const seen = new Set<string>();
  const unique = terms.filter((
    t,
  ) => (seen.has(t) ? false : (seen.add(t), true)));
  return unique.slice(0, 10);
}

// --- Visual similarity helpers (aHash + Hamming distance) ---
// moved to lib/imageHash

// (no external image fetching needed when using precomputed hashes)

async function findSimilarListingIdsByImage(uploadBuffer: Buffer, limit = 24) {
  const supabase = supabaseServer();
  // If embeddings are enabled and present, prefer vector search
  if ((process.env.IMAGE_SEARCH_EMBEDDINGS_ENABLED || "0") === "1") {
    try {
      const emb = await computeImageEmbedding(uploadBuffer);
      const { data: matches } = await supabase.rpc("match_listing_embeddings", {
        query_embedding: emb,
        match_count: limit,
      });
      const MAX_DIST = Number(
        process.env.IMAGE_SEARCH_EMBEDDING_MAX_DIST || 0.35,
      );
      const filtered = (matches || []).filter((m: { distance: number }) =>
        typeof m.distance === "number" && m.distance <= MAX_DIST
      );
      const ids = filtered.map((m: { listing_id: string }) => m.listing_id);
      if (ids.length > 0) return { ids, compared: filtered.length };
    } catch (e) {
      console.warn("Embedding search failed, falling back to aHash", e);
    }
  }
  const uploadedHash = await computeAHash64(uploadBuffer);
  // Prefer precomputed hashes
  // Prefer recent hashes first to reduce scan size and latency
  let { data: rows } = await supabase
    .from("listing_image_hashes")
    .select("listing_id,ahash_64,updated_at")
    .order("updated_at", { ascending: false })
    .limit(600);
  if (!rows || rows.length < 50) {
    // Fallback: widen search if table is sparse
    const fallback = await supabase
      .from("listing_image_hashes")
      .select("listing_id,ahash_64")
      .limit(2000);
    rows = fallback.data || rows;
  }
  const perListingMin = new Map<string, number>();
  for (const r of rows || []) {
    if (!r.ahash_64 || !r.listing_id) continue;
    const id = r.listing_id as string;
    const dist = hammingDistanceBits(uploadedHash, r.ahash_64);
    const prev = perListingMin.get(id);
    if (prev === undefined || dist < prev) perListingMin.set(id, dist);
  }
  // Filter on a reasonable threshold to avoid bad matches
  const MAX_DIST = 12; // tune between 8-16 for stricter/looser matching
  if (perListingMin.size > 0) {
    const entries = Array.from(perListingMin.entries())
      .map(([id, dist]) => ({ id, dist }))
      .filter((e) => e.dist <= MAX_DIST);
    entries.sort((a, b) => a.dist - b.dist);
    const best = entries.slice(0, limit).map((s) => s.id);
    return { ids: best, compared: entries.length };
  }
  // No precomputed hashes available
  return { ids: [], compared: 0 };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    // Accept both 'image' (modal) and 'file' (older client) field names
    const file = (formData.get("image") || formData.get("file")) as File | null;

    if (!file) {
      return NextResponse.json({ error: "No image file provided" }, {
        status: 400,
      });
    }

    if (!file.type || !file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, {
        status: 400,
      });
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Image file too large (max 10MB)" }, {
        status: 400,
      });
    }

    const arrayBuffer = await file.arrayBuffer();
    const uploadBuffer = Buffer.from(arrayBuffer);

    // 1) Try visual similarity on recent listings
    let ids: string[] = [];
    let compared = 0;
    try {
      const sim = await findSimilarListingIdsByImage(uploadBuffer, 24);
      ids = sim.ids;
      compared = sim.compared;
    } catch (e) {
      // ignore visual search errors, fallback to OCR
      console.warn("Visual similarity failed, falling back to OCR", e);
    }

    // 2) OCR only when no good visual matches
    let recognized_text = "";
    let search_terms: string[] = [];
    const OCR_ENABLED = (process.env.IMAGE_SEARCH_OCR_ENABLED || "1") !== "0";
    if ((!ids || ids.length === 0) && OCR_ENABLED) {
      try {
        const Tesseract = await import("tesseract.js");
        const OCR_TIMEOUT_MS = Number(
          process.env.IMAGE_SEARCH_OCR_TIMEOUT_MS || 5000,
        );
        const ocrPromise = Tesseract.recognize(uploadBuffer, "eng+nld", {
          logger: () => {},
        }) as unknown as Promise<{ data: { text: string } }>;
        const result = await Promise.race([
          ocrPromise,
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("OCR timeout")), OCR_TIMEOUT_MS)
          ),
        ]);
        recognized_text = (result?.data?.text || "").trim();
        search_terms = extractTerms(recognized_text);
      } catch (e) {
        // OCR best-effort
        console.warn("OCR failed", e);
      }
    }
    const query = search_terms.join(" ");

    return NextResponse.json({
      success: true,
      ids,
      compared,
      recognized_text,
      search_terms,
      query,
    });
  } catch (error) {
    console.error("Image search API error:", error);
    return NextResponse.json({ error: "Internal server error" }, {
      status: 500,
    });
  }
}
