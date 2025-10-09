"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import CategorySelect from "@/components/CategorySelect";
import ConfirmModal from "@/components/ConfirmModal";
import ImagePreviewSlider from "@/components/ImagePreviewSlider";
import PhotoUploader from "@/components/PhotoUploader";
import PreviewModal from "@/components/PreviewModal";
import ShippingFields from "@/components/ShippingFields";
import { useToast } from "@/components/Toast";
import Toggle from "@/components/Toggle";
import { createClient } from "@/lib/supabaseClient";

const supabase = createClient();

// --------- constants ----------
const MIN_PHOTOS = 1;
const MAX_PHOTOS = 12;
const BUCKET_NAME = "listing-images";
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_MB = 10;

// Helpers
function randomId() {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (g?.crypto?.randomUUID) return g.crypto.randomUUID();
  return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}
function parsePrice(input: string): number {
  if (input == null) return NaN;
  const normalized = String(input).replace(",", ".").trim();
  return Number(normalized);
}
async function revalidateCategory(category: string, subcategory?: string) {
  try {
    await fetch("/api/revalidate-category", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ category, subcategory }),
      keepalive: true,
    });
  } catch (error) {
    console.error(error);
  }
}
async function revalidateCompany(orgSlugOrId: string) {
  try {
    await fetch("/api/revalidate-company", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ org: orgSlugOrId }),
      keepalive: true,
    });
  } catch {
    // intentionally ignored
  }
}

export default function SellPage() {
  const router = useRouter();
  const { push } = useToast();

  // Opties
  const [allowOffers, setAllowOffers] = useState(true);
  const [allowSecurePay, setAllowSecurePay] = useState(false);
  const [allowShipping, setAllowShipping] = useState(false);

  // Basis
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState<string>("");
  const [condition, setCondition] = useState("nieuw");
  const [location, setLocation] = useState("Gent");
  const [minBid, setMinBid] = useState("");
  const [stock, setStock] = useState<number>(1);

  // Categorie + Subcategorie
  const [category, setCategory] = useState<string>("");
  const [subcategory, setSubcategory] = useState<string>("");

  // Foto’s
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [mainIndex, setMainIndex] = useState<number>(0);
  const dragFrom = useRef<number | null>(null);

  // Shipping (optioneel)
  const [shipping, setShipping] = useState<{ length?: number; width?: number; height?: number; weight?: number; }>({});

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isBusiness, setIsBusiness] = useState<boolean>(false);
  const [kycApproved, setKycApproved] = useState<boolean>(false);
  const [showKycModal, setShowKycModal] = useState<boolean>(false);

  // Prijsanalyse
  const [priceScore, setPriceScore] = useState<number | null>(null);
  const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));
  const analyzePrice = useCallback((n: number) => {
    let score = 60;
    if (condition === "nieuw") score += 15;
    else if (condition === "bijna nieuw") score += 8;
    else if (condition === "in goede staat") score += 2;
    else if (condition === "gebruikt") score -= 8;
    if (desc.length > 200) score += 8;
    else if (desc.length > 80) score += 4;
    if (n <= 5) score -= 20;
    if (n >= 2000) score -= 10;
    return clamp(score);
  }, [condition, desc]);
  const ratingMeta = (score: number | null) => {
    if (score === null) return { label: "Nog geen prijs", bar: "bg-gray-300" };
    if (score < 40) return { label: "Te laag", bar: "bg-red-500" };
    if (score < 70) return { label: "Correct", bar: "bg-amber-500" };
    return { label: "Uitstekend", bar: "bg-emerald-500" };
  };
  useEffect(() => {
    const n = parsePrice(price);
    if (!price || !isFinite(n) || n <= 0) { setPriceScore(null); return; }
    const t = setTimeout(() => setPriceScore(analyzePrice(n)), 400);
    return () => clearTimeout(t);
  }, [price, condition, desc, analyzePrice]);

  // Auth badge
  useEffect(() => {
    supabase.auth.getUser()
      .then(({ data }) => setUserEmail(data.user?.email ?? null))
      .catch(() => setUserEmail(null));
  }, []);

  // Check if user is business and has approved KYC
  useEffect(() => {
    const checkBusinessAndKycStatus = async () => {
      if (!userEmail) return; // Wacht tot gebruiker is opgehaald

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, account_type, stripe_account_id")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        setIsBusiness(false);
        setKycApproved(false);
        return;
      }

      if (!profile) {
        console.log('No profile found for user:', user.id);
        setIsBusiness(false);
        setKycApproved(false);
        return;
      }

      const business =
        (profile.account_type && (
          String(profile.account_type).toLowerCase().includes("business") ||
          String(profile.account_type).toLowerCase().includes("zakelijk") ||
          String(profile.account_type).toLowerCase().includes("company")
        )) ||
        !!profile.stripe_account_id; // Als Stripe account bestaat, beschouw als business

      let kycApproved = false;
      if (business && profile.stripe_account_id) {
        try {
          // Check KYC status via API
          const response = await fetch('/api/stripe/custom/status', {
            headers: {
              'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            },
          });
          if (response.ok) {
            const statusData = await response.json();
            kycApproved = statusData.status === 'approved';
            console.log('KYC status response:', statusData);
          } else {
            console.log('KYC status fetch failed:', response.status);
          }
        } catch (error) {
          console.warn('Failed to check KYC status:', error);
        }
      } else {
        console.log('Not checking KYC because:', { business, hasStripeId: !!profile.stripe_account_id });
      }

      console.log('Business and KYC check:', { profile: { id: profile.id, account_type: profile.account_type, stripe_account_id: profile.stripe_account_id }, business, kycApproved });
      setIsBusiness(business);
      setKycApproved(kycApproved);
      // Als gebruiker niet zakelijk is of KYC niet approved, zet veilig betalen uit
      if (!business || !kycApproved) {
        setAllowSecurePay(false);
      }
    };

    checkBusinessAndKycStatus();
  }, [userEmail]);

  const translate = () => {
    push("Automatische vertaling toegevoegd.");
    setDesc((d) => d + "\n\nFR: Description automatique\nEN: Automatic description\nDE: Automatische Beschrijving");
  };

  const handleSecurePayToggle = (value: boolean) => {
    console.log('Secure pay toggle:', { value, isBusiness, kycApproved, userEmail });
    if (value && (!isBusiness || !kycApproved)) {
      console.log('Showing modal because:', { notBusiness: !isBusiness, notKycApproved: !kycApproved });
      // Probeert in te schakelen maar niet zakelijk of KYC niet approved
      setShowKycModal(true);
    } else {
      console.log('Setting allowSecurePay to:', value);
      // Normaal gedrag
      setAllowSecurePay(value);
    }
  };

  // ---------- Validatie & upload helpers ----------
  function validateFiles(fs: File[]) {
    for (const f of fs) {
      if (!ACCEPTED_TYPES.includes(f.type)) throw new Error(`Bestandstype niet toegestaan: ${f.type || f.name}`);
      const sizeMb = f.size / (1024 * 1024);
      if (sizeMb > MAX_FILE_MB) throw new Error(`Bestand > ${MAX_FILE_MB}MB: ${f.name}`);
    }
  }
  async function uploadOne(file: File, userId: string): Promise<string> {
    const original = file.name || "image.jpg";
    const ext = (original.includes(".") ? original.split(".").pop() : "") || "jpg";
    const path = `${userId}/${randomId()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET_NAME).upload(path, file, { upsert: false, contentType: file.type || undefined });
    if (error) throw error;
    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
    return data.publicUrl;
  }
  async function handleFilesSelected(fs: File[]) {
    try {
      setUploading(true);
      if (!fs.length) return;
      validateFiles(fs);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { push("Log eerst in voor je foto’s uploadt."); return; }

      const remaining = Math.max(0, MAX_PHOTOS - imageUrls.length);
      if (remaining <= 0) { push(`Maximaal ${MAX_PHOTOS} foto’s bereikt.`); return; }

      const slice = fs.slice(0, remaining);
      if (slice.length < fs.length) push(`Je kunt er nog ${remaining} toevoegen (max. ${MAX_PHOTOS}).`);

      const newUrls: string[] = [];
      for (const f of slice) newUrls.push(await uploadOne(f, user.id));

      setImageUrls((prev) => {
        const next = [...prev, ...newUrls];
        if (next.length && (mainIndex < 0 || mainIndex >= next.length)) setMainIndex(0);
        return next;
      });
      push(`${newUrls.length} foto’s opgeladen.`);
    } catch (e) {
      console.error(e);
      if (e instanceof Error) push(`Upload mislukt: ${e.message}`); else push("Upload mislukt: onbekende fout");
    } finally {
      setUploading(false);
    }
  }
  function handleUrlsSelected(urls: string[]) {
    if (!urls?.length) return;
    const remaining = Math.max(0, MAX_PHOTOS - imageUrls.length);
    if (remaining <= 0) { push(`Maximaal ${MAX_PHOTOS} foto’s bereikt.`); return; }
    const slice = urls.slice(0, remaining);
    if (slice.length < urls.length) push(`Je kunt er nog ${remaining} toevoegen (max. ${MAX_PHOTOS}).`);
    setImageUrls((prev) => {
      const next = [...prev, ...slice];
      if (next.length && (mainIndex < 0 || mainIndex >= next.length)) setMainIndex(0);
      return next;
    });
    push(`${slice.length} foto’s toegevoegd.`);
  }

  // DnD / slider
  function onDragStart(i: number) { dragFrom.current = i; }
  function markAsMain(i: number) { setMainIndex(i); }
  const trackRef = useRef<HTMLDivElement | null>(null);
  function scrollByCards(dir: "left" | "right") {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLDivElement>("[data-thumb]");
    const step = card ? card.getBoundingClientRect().width + 12 : 220;
    el.scrollBy({ left: dir === "left" ? -step : step, behavior: "smooth" });
  }

  // Preview
  const previewImages = imageUrls.length ? [imageUrls[mainIndex], ...imageUrls.filter((_, i) => i !== mainIndex)] : [];
  const [openPreview, setOpenPreview] = useState(false);
  function handlePreview() {
    const p = parsePrice(price);
    if (!title.trim()) { push("Vul een titel in voor je preview."); return; }
    if (!isFinite(p) || p <= 0) { push("Vul een geldige prijs in voor je preview."); return; }
    if (imageUrls.length < 1) { push("Voeg minstens 1 foto toe voor je preview."); return; }
    setOpenPreview(true);
  }

  const previewData = {
    title,
    description: desc,
    price: parsePrice(price),
    condition,
    allowOffers,
    minBid,
    shippingEnabled: allowShipping,
    shipping: allowShipping ? { length: shipping.length, width: shipping.width, height: shipping.height, weight: shipping.weight, service: "OCASO", price: 6.0 } : undefined,
    location: location ? { city: location, country: "België" } : undefined,
    images: previewImages,
  };

  async function handleSubmit() {
    try {
      setSaving(true);

      // Validatie
      if (!title.trim()) { push("Vul een titel in."); return; }
      const priceNum = parsePrice(price);
      if (!isFinite(priceNum) || priceNum <= 0) { push("Vul een geldige prijs in."); return; }
      if (stock < 1) { push("Voorraad moet minimaal 1 zijn."); return; }
      if (!category) { push("Kies een categorie."); return; }

      // Auth
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) { push("Je moet ingelogd zijn om te plaatsen."); return; }

      if (imageUrls.length < MIN_PHOTOS) { push(`Upload minstens ${MIN_PHOTOS} foto.`); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, account_type, company_slug, org_slug, business_slug, stripe_account_id")
        .eq("id", user.id)
        .maybeSingle();

      const isBusiness =
        (profile?.account_type && (
          String(profile.account_type).toLowerCase().includes("business") ||
          String(profile.account_type).toLowerCase().includes("zakelijk") ||
          String(profile.account_type).toLowerCase().includes("company")
        )) ||
        !!profile?.stripe_account_id; // Als Stripe account bestaat, beschouw als business

      // Check KYC status voor zakelijke accounts
      let kycApproved = false;
      if (isBusiness && profile?.stripe_account_id) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const authToken = session?.access_token;
          if (authToken) {
            const response = await fetch('/api/stripe/custom/status', {
              headers: { 'Authorization': `Bearer ${authToken}` },
            });
            if (response.ok) {
              const statusData = await response.json();
              kycApproved = statusData.status === 'approved';
            }
          }
        } catch (error) {
          console.warn('Failed to check KYC status:', error);
        }
      }

      const hasSecurePayPermission = isBusiness && kycApproved;

      if (allowSecurePay && !hasSecurePayPermission) {
        push("Veilig betalen is alleen beschikbaar voor goedgekeurde zakelijke verkopers met volledige KYC verificatie.");
        return;
      }

      const orgId = null;

      const orgSlug =
        profile?.org_slug ?? profile?.business_slug ?? profile?.company_slug ?? (orgId ? String(orgId) : null);

      const main_photo = imageUrls[mainIndex] ?? imageUrls[0];
      const sLen = allowShipping ? Number(shipping.length) : NaN;
      const sWid = allowShipping ? Number(shipping.width) : NaN;
      const sHei = allowShipping ? Number(shipping.height) : NaN;
      const sWei = allowShipping ? Number(shipping.weight) : NaN;

      // Prepare categories payload
      const categoriesPayload = subcategory ? [category, subcategory] : [category];

  const basePayload: {
    created_by: string;
    seller_id: string;
    title: string;
    description: string | null;
    price: number;
    allowoffers: boolean;
    state: string;
    location: string | null;
    allow_shipping: boolean;
    shipping_length: number | null;
    shipping_width: number | null;
    shipping_height: number | null;
    shipping_weight: number | null;
    images: string[];
    main_photo: string;
    promo_featured: boolean;
    promo_top: boolean;
    min_bid: number | null;
    secure_pay: boolean;
    categories: string[];
    status?: string;
    organization_id?: string | null;
    stock: number;
  } = {
    created_by: user.id,
    seller_id: user.id,
    title: title.trim(),
    description: desc || null,
    price: priceNum,
    allowoffers: !!allowOffers,
    state: condition,
    location: location || null,
    allow_shipping: !!allowShipping,
    shipping_length: isFinite(sLen) ? sLen : null,
    shipping_width: isFinite(sWid) ? sWid : null,
    shipping_height: isFinite(sHei) ? sHei : null,
    shipping_weight: isFinite(sWei) ? sWei : null,
    images: imageUrls,
    main_photo,
    min_bid: minBid ? parsePrice(minBid) : null,
    secure_pay: !!allowSecurePay && hasSecurePayPermission,
    categories: categoriesPayload,
    status: "active", // Zorg dat elk nieuw zoekertje actief is
    stock: stock,
    promo_featured: false,
    promo_top: false
  };

      let tryWithOrg = false;
      if (isBusiness && orgId) {
        basePayload.organization_id = orgId; // als kolom bestaat
        tryWithOrg = true;
      }

      // Insert + fallback (join-table)
      let ins = await supabase.from("listings").insert([basePayload]).select("id").maybeSingle();
      if (ins.error && tryWithOrg) {
        // Fallback: remove organization_id and try again
        const fallbackPayload = { ...basePayload };
        delete fallbackPayload.organization_id;
        ins = await supabase.from("listings").insert([fallbackPayload]).select("id").maybeSingle();
        if (!ins.error && orgId) {
          await supabase
            .from("organization_listings")
            .insert([{ organization_id: orgId, listing_id: ins.data?.id }]);
        }
      }
      if (ins.error) { push(`Plaatsen mislukt: ${ins.error.message}`); return; }

      await revalidateCategory(category, subcategory);
      if (isBusiness && orgSlug) await revalidateCompany(String(orgSlug));

      push("Zoekertje geplaatst!");

      // Redirect naar het nieuwe zoekertje zelf
      if (ins.data?.id) {
        // Redirect naar categoriepagina met zoekertje-id als anchor
        if (subcategory) {
          router.replace(`/categorien/${encodeURIComponent(category)}/${encodeURIComponent(subcategory)}#listing-${ins.data.id}`);
        } else {
          router.replace(`/categorien/${encodeURIComponent(category)}#listing-${ins.data.id}`);
        }
      } else {
        // fallback: categoriepagina
        if (subcategory) {
          router.replace(`/categorien/${encodeURIComponent(category)}/${encodeURIComponent(subcategory)}`);
        } else {
          router.replace(`/categorien/${encodeURIComponent(category)}`);
        }
      }
    } finally {
      setSaving(false);
    }
  }

  // --- Moderne layout: 2 kolommen met sticky samenvatting rechts ---
  return (
    <div className="container py-8">
      <div className="grid lg:grid-cols-12 gap-6">
        {/* LINKERKOLOM: Form inhoud */}
        <div className="lg:col-span-8 space-y-8">
          {/* Header */}
          <div className="rounded-2xl border border-gray-200 bg-white/60 backdrop-blur-sm shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-semibold">Plaats een zoekertje</h1>
                <p className="text-sm text-gray-500 mt-1">Stap 1/2 — Gegevens</p>
              </div>
              {!userEmail && (
                <span className="inline-flex items-center rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 text-sm">
                  Inloggen vereist
                </span>
              )}
            </div>
          </div>

          {/* Foto's */}
          <section className="rounded-2xl border border-gray-200 bg-white/60 backdrop-blur-sm shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">Foto’s</h2>
              <span className="text-sm text-gray-500">
                {imageUrls.length}/{MAX_PHOTOS} geselecteerd
              </span>
            </div>

            <PhotoUploader
              onFilesChange={handleFilesSelected}
              onUrlsChange={handleUrlsSelected}
              uploading={uploading}
              currentCount={imageUrls.length}
              maxCount={MAX_PHOTOS}
            />

            {imageUrls.length > 0 && (
              <div className="pt-2">
                <ImagePreviewSlider
                  imageUrls={imageUrls}
                  mainIndex={mainIndex}
                  markAsMain={markAsMain}
                  onDragStart={onDragStart}
                  scrollByCards={scrollByCards}
                  trackRef={trackRef}
                />
              </div>
            )}

            {imageUrls.length < MIN_PHOTOS && (
              <div className="text-sm text-amber-600">Voeg minstens {MIN_PHOTOS} duidelijke foto toe.</div>
            )}
          </section>

          {/* Basisgegevens */}
          <section className="rounded-2xl border border-gray-200 bg-white/60 backdrop-blur-sm shadow-sm p-6 space-y-6">
            <h2 className="text-sm font-medium">Basisgegevens</h2>
            <div className="grid md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600">Titel</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-gray-300 focus:ring-2 focus:ring-emerald-100"
                  placeholder="Titel van je product"
                />
              </div>

              <CategorySelect
                valueCategory={category}
                valueSubcategory={subcategory}
                onChangeCategory={(val) => { setCategory(val); setSubcategory(""); }}
                onChangeSubcategory={setSubcategory}
              />
            </div>
          </section>

          {/* Omschrijving */}
          <section className="rounded-2xl border border-gray-200 bg-white/60 backdrop-blur-sm shadow-sm p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">Omschrijving</h2>
              <div className="flex items-center gap-2">
                <button onClick={translate} type="button" className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm shadow-sm hover:bg-gray-50">
                  Vertaal naar FR/EN/DE
                </button>
              </div>
            </div>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-gray-300 focus:ring-2 focus:ring-emerald-100"
              rows={5}
              placeholder="Beschrijf je product..."
            />
          </section>

          {/* Prijs & staat */}
          <section className="rounded-2xl border border-gray-200 bg-white/60 backdrop-blur-sm shadow-sm p-6 space-y-6">
            <h2 className="text-sm font-medium">Prijs & staat</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600">Prijs (€)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-gray-300 focus:ring-2 focus:ring-emerald-100"
                  placeholder="0,00"
                />
                <div className="mt-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Prijsanalyse</span>
                    <span className="font-medium">{ratingMeta(priceScore).label}</span>
                  </div>
                  <div className="mt-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${ratingMeta(priceScore).bar}`}
                      style={{ width: `${priceScore ?? 0}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600">Voorraad</label>
                <input
                  type="number"
                  min="1"
                  max="9999"
                  value={stock}
                  onChange={(e) => setStock(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-gray-300 focus:ring-2 focus:ring-emerald-100"
                  placeholder="Aantal beschikbaar (bijv. 5)"
                />
                <p className="text-sm text-gray-500">Hoeveel stuks heb je beschikbaar voor verkoop?</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600">Staat</label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-gray-300 focus:ring-2 focus:ring-emerald-100"
                >
                  <option>nieuw</option>
                  <option>bijna nieuw</option>
                  <option>in goede staat</option>
                  <option>gebruikt</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600">Locatie</label>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-gray-300 focus:ring-2 focus:ring-emerald-100"
                  placeholder="Gent"
                />
              </div>
            </div>
          </section>

          {/* Opties */}
          <section className="rounded-2xl border border-gray-200 bg-white/60 backdrop-blur-sm shadow-sm p-6 space-y-4">
            <h2 className="text-sm font-medium">Opties</h2>
            <Toggle checked={allowOffers} onChange={setAllowOffers} label="Bieden toestaan" />
            {allowOffers && (
              <div className="ml-6 mt-2 space-y-2">
                <label className="text-sm font-medium text-gray-600">Minimum bod (optioneel)</label>
                <input
                  value={minBid}
                  onChange={(e) => setMinBid(e.target.value)}
                  className="w-full max-w-xs rounded-2xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-gray-300 focus:ring-2 focus:ring-emerald-100"
                  placeholder="Optioneel"
                />
              </div>
            )}
            {userEmail && <Toggle checked={allowSecurePay} onChange={handleSecurePayToggle} label="Veilig betalen via OCASO (3% transactiekosten)" />}
            <Toggle checked={allowShipping} onChange={setAllowShipping} label="Verzenden via OCASO (6,00€)" />
            {allowShipping && (
              <div className="mt-2">
                <ShippingFields
                  onChange={(vals: { length?: string; width?: string; height?: string; weight?: string }) =>
                    setShipping({
                      length: vals.length ? Number(vals.length) : undefined,
                      width: vals.width ? Number(vals.width) : undefined,
                      height: vals.height ? Number(vals.height) : undefined,
                      weight: vals.weight ? Number(vals.weight) : undefined,
                    })
                  }
                />
              </div>
            )}
          </section>
        </div>

        {/* RECHTERKOLOM: Sticky Samenvatting / Actieknoppen */}
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-8 space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-white/70 backdrop-blur-sm shadow-sm p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Samenvatting</h3>
                <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-sm">
                  {ratingMeta(priceScore).label}
                </span>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Prijs</span>
                  <span className="font-medium text-gray-900">{price ? `€ ${price}` : "—"}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Categorie</span>
                  <span className="font-medium text-gray-900">
                    {category || "—"}{subcategory ? ` / ${subcategory}` : ""}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Staat</span>
                  <span className="font-medium text-gray-900">{condition}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Locatie</span>
                  <span className="font-medium text-gray-900">{location || "—"}</span>
                </div>
              </div>

              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={handlePreview}
                  className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm hover:bg-gray-50"
                >
                  Preview
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={saving || uploading}
                  className="flex-1 rounded-xl bg-emerald-600 text-white px-4 py-2.5 text-sm font-medium shadow-sm hover:bg-emerald-700 disabled:opacity-60"
                >
                  {saving ? "Bezig…" : uploading ? "Upload…" : "Plaatsen"}
                </button>
              </div>

              {!userEmail && (
                <p className="mt-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Je moet ingelogd zijn om te plaatsen.
                </p>
              )}
            </div>

            {/* Tipkaart */}
            <div className="rounded-2xl border border-gray-200 bg-white/70 backdrop-blur-sm shadow-sm p-4 text-sm text-gray-600">
              Tip: een duidelijke titel en 3+ foto’s vergroten je kans op verkoop.
            </div>
          </div>
        </div>
      </div>

      <PreviewModal open={openPreview} onClose={() => setOpenPreview(false)} data={previewData} />

      <ConfirmModal
        open={showKycModal}
        onClose={() => setShowKycModal(false)}
        onConfirm={() => {
          // Redirect naar business tab voor KYC of upgrade
          router.push('/profile/business?open=betaalterminal');
        }}
        title={!isBusiness ? "Zakelijk account vereist" : "KYC verificatie vereist"}
        message={!isBusiness
          ? "Veilig betalen is alleen beschikbaar voor zakelijke verkopers. Upgrade naar een zakelijk account om deze functie te gebruiken."
          : "Om veilig betalen te kunnen gebruiken, moet je KYC verificatie eerst afronden. Ga naar je bedrijfsprofiel om dit te voltooien."
        }
        confirmText={!isBusiness ? "Naar account instellingen" : "Naar KYC"}
        cancelText="Annuleren"
        confirmButtonClass="bg-primary hover:bg-primary/80 text-black"
      />
    </div>
  );
}
