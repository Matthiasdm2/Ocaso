export const runtime = "nodejs";
import { type CookieOptions, createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// Local
import { computeAHash64 } from "@/lib/imageHash";
import { supabaseServer } from "@/lib/supabaseServer";
// XLSX is optional; prefer CSV parsing fallback to avoid adding a native dependency.

export const dynamic = "force-dynamic";

// Allow large uploads
// Note: `export const config` is deprecated for app router route files in modern Next.js.
// We rely on Request.formData()/arrayBuffer() and set `export const dynamic = 'force-dynamic'` above.

async function parseWorkbook(buffer: Buffer) {
  const text = buffer.toString("utf-8");
  // Try CSV first (simple and dependency-free)
  if (isProbablyCsv(text)) {
    return parseCsv(text);
  }

  // Try XLSX if available at runtime
  try {
    // Dynamically require to avoid static import error when module is not installed
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
    const XLSX = require("xlsx");
    const wb = XLSX.read(buffer, { type: "buffer" });
    const firstSheet = wb.SheetNames[0];
    const sheet = wb.Sheets[firstSheet];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    return rows;
  } catch (err) {
    // As last resort, attempt CSV parsing of text
    return parseCsv(text);
  }
}

function normalizeRow(r: Record<string, unknown>) {
  // Accept common column names and normalize
  const title = (r["title"] || r["Title"] || r["titel"] || "") as string;
  const priceRaw = r["price"] || r["Price"] || r["Prijs"] || 0;
  const price = typeof priceRaw === "number"
    ? priceRaw
    : Number(String(priceRaw || "").replace(/[^0-9.-]/g, "")) || 0;
  const description =
    (r["description"] || r["Description"] || r["beschrijving"] || "") as string;
  const location =
    (r["location"] || r["Location"] || r["plaats"] || "") as string;
  const category =
    (r["category"] || r["Category"] || r["categorie"] || "") as string;
  const images =
    (r["images"] || r["Images"] || r["images_csv"] || r["imagesCsv"] ||
      "") as string;
  return {
    title: String(title || "").trim(),
    price,
    description: String(description || "").trim(),
    location: String(location || "").trim(),
    category: String(category || "").trim(),
    images: String(images || "").trim(),
  };
}

function isProbablyCsv(text: string) {
  // Heuristic: many commas and newlines and header row keywords
  const lines = text.split(/\r?\n/).slice(0, 5);
  const commaCount = lines.reduce((s, l) => s + (l.split(",").length - 1), 0);
  return commaCount >= 1 &&
    /title|price|description|category/i.test(lines.join("\n"));
}

function parseCsv(text: string) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  const rows: Record<string, unknown>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    const obj: Record<string, unknown> = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = (cols[j] || "").trim();
    }
    rows.push(obj);
  }
  return rows;
}

export async function POST(req: Request) {
  try {
    // Support either raw body with XLSX/CSV or multipart FormData from browser
    const contentType = req.headers.get("content-type") || "";
    let rows: Record<string, unknown>[] = [];

    if (contentType.startsWith("multipart/form-data")) {
      // Parse as FormData (Next.js server) - extract first file
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "Geen bestand geüpload" }, {
          status: 400,
        });
      }
      const ab = await file.arrayBuffer();
      rows = await parseWorkbook(Buffer.from(ab));
    } else {
      // Raw body (upload of binary) - try parse
      const ab = await req.arrayBuffer();
      if (!ab || (ab as ArrayBuffer).byteLength === 0) {
        return NextResponse.json({ error: "Geen bestand in body" }, {
          status: 400,
        });
      }
      rows = await parseWorkbook(Buffer.from(ab));
    }

    // Authenticated user (server client using cookies)
    const cookieStore = cookies();
    const supaAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: "", ...options });
          },
        },
      },
    );
    const { data: userData } = await supaAuth.auth.getUser();
    const user = userData.user;
    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const supabase = supabaseServer();

    const results: Array<
      { row: number; ok: boolean; error?: string; listingId?: string }
    > = [];

    // Process rows sequentially (simple, predictable)
    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i];
      const rowNum = i + 2; // header=1
      try {
        const norm = normalizeRow(raw);
        if (!norm.title) throw new Error("Titel ontbreekt");
        if (!norm.price || norm.price <= 0) {
          throw new Error("Prijs ontbreekt of ongeldig");
        }

        // Basic insert into listings table; adapt fields as project schema
        const insertPayload: Record<string, unknown> = {
          title: norm.title,
          price: norm.price,
          description: norm.description || null,
          location: norm.location || null,
          seller_id: user.id,
          status: "active",
        };

        // Images: accept comma-separated URLs or filenames
        if (norm.images) {
          const imgs = norm.images.split(",").map((s) => s.trim()).filter(
            Boolean,
          );
          if (imgs.length) insertPayload["images"] = imgs;
          if (imgs.length) insertPayload["main_photo"] = imgs[0];
        }

        // Category heuristic: if category is a numeric id, use category_id; else try to look up slug by name
        if (norm.category) {
          const maybeId = Number(norm.category);
          if (!Number.isNaN(maybeId) && maybeId > 0) {
            insertPayload["category_id"] = maybeId;
          } else {
            // try find category by slug or name
            const { data: cat } = await supabase.from("categories").select(
              "id,slug,name",
            ).or(`slug.eq.${norm.category},name.ilike.%${norm.category}%`)
              .limit(1).maybeSingle();
            if (cat && cat.id) insertPayload["category_id"] = cat.id;
          }
        }

        const { data: inserted, error: insErr } = await supabase.from(
          "listings",
        ).insert(insertPayload).select("id").maybeSingle();
        if (insErr || !inserted) {
          throw new Error(
            (insErr && (insErr.message || String(insErr))) || "Insert failed",
          );
        }

        // inserted may be an object with id property
        const insertedId =
          (inserted && (inserted as Record<string, unknown>)["id"]) || null;
        // Index image hashes for instant visual search (best-effort)
        try {
          const listingId = String(insertedId || "");
          const images = (insertPayload["images"] as string[] | undefined) ||
            [];
          const urls = Array.isArray(images)
            ? images.filter((u) => typeof u === "string" && !!u)
            : [];
          if (listingId && urls.length > 0) {
            // Helper: fetch image into buffer with timeout
            const fetchImageBuffer = async (
              url: string,
              timeoutMs = 4000,
              maxBytes = 4_000_000,
            ): Promise<Buffer | null> => {
              try {
                const controller = new AbortController();
                const t = setTimeout(() => controller.abort(), timeoutMs);
                const res = await fetch(url, { signal: controller.signal });
                clearTimeout(t);
                if (!res.ok) return null;
                const cl = res.headers.get("content-length");
                if (cl && parseInt(cl, 10) > maxBytes) return null;
                const ab = await res.arrayBuffer();
                if (ab.byteLength > maxBytes) return null;
                return Buffer.from(ab);
              } catch {
                return null;
              }
            };
            for (const url of urls) {
              const buf = await fetchImageBuffer(url);
              if (!buf) continue;
              try {
                const hash = await computeAHash64(buf);
                await supabase
                  .from("listing_image_hashes")
                  .upsert({
                    listing_id: listingId,
                    image_url: url,
                    ahash_64: hash,
                  }, { onConflict: "listing_id,image_url" });
              } catch {
                // ignore
              }
            }

            // Index first image to ANN service for visual search
            try {
              const imgUrl = urls[0];
              const buf = await fetchImageBuffer(imgUrl);
              if (buf) {
                const svcIndex = process.env.IMAGE_SEARCH_INDEX_URL ||
                  (process.env.IMAGE_SEARCH_URL
                    ? String(process.env.IMAGE_SEARCH_URL).replace(
                      "/search",
                      "/index",
                    )
                    : "") ||
                  "http://localhost:9000/index";
                const fd = new FormData();
                fd.append("listing_id", listingId);
                fd.append("image_url", imgUrl);
                fd.append("file", new Blob([new Uint8Array(buf)]), "image.jpg");
                await fetch(svcIndex, { method: "POST", body: fd });
              }
            } catch {
              // best-effort
            }
          }
        } catch {
          // best-effort; do not fail upload on hashing issues
        }

        results.push({
          row: rowNum,
          ok: true,
          listingId: insertedId ? String(insertedId) : undefined,
        });
      } catch (e: unknown) {
        const msg = safeErrMessage(e);
        results.push({ row: rowNum, ok: false, error: msg || "Ongeldige rij" });
      }
    }

    return NextResponse.json({ ok: true, processed: rows.length, results });
  } catch (e: unknown) {
    const msg = safeErrMessage(e);
    return NextResponse.json({ error: msg || "Upload fout" }, { status: 500 });
  }
}

function safeErrMessage(e: unknown) {
  if (!e) return "";
  if (typeof e === "string") return e;
  if (typeof e === "object") {
    const maybe = e as Record<string, unknown>;
    if ("message" in maybe && typeof maybe.message === "string") {
      return maybe.message;
    }
    return JSON.stringify(maybe);
  }
  return String(e);
}
