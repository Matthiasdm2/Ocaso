"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";

import CategorySelect from "@/components/CategorySelect";
import ConfirmModal from "@/components/ConfirmModal";
import ImagePreviewSlider from "@/components/ImagePreviewSlider";
import LocationSelect from "@/components/LocationSelect";
import PhotoUploader from "@/components/PhotoUploader";
import PreviewModal from "@/components/PreviewModal";
import ShippingFields from "@/components/ShippingFields";
import { useToast } from "@/components/Toast";
import Toggle from "@/components/Toggle";
import { detectCategorySmart } from "@/lib/categoryDetection";
import { createClient } from "@/lib/supabaseClient";

const supabase = createClient();
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
  const [categoryName, setCategoryName] = useState<string>("");
  const [subcategoryName, setSubcategoryName] = useState<string>("");

  // Haal categorie namen op wanneer categorie/subcategorie verandert
  useEffect(() => {
    const fetchCategoryNames = async () => {
      if (!category) {
        setCategoryName("");
        setSubcategoryName("");
        return;
      }

      try {
        // Haal categorie naam op
        const categoryId = parseInt(category);
        if (isNaN(categoryId)) {
          setCategoryName("");
          setSubcategoryName("");
          return;
        }

        const { data: catData } = await supabase
          .from("categories")
          .select("name")
          .eq("id", categoryId)
          .maybeSingle();

        setCategoryName(catData?.name || category);

        // Haal subcategorie naam op als er een subcategorie is
        if (subcategory) {
          const subcategoryId = parseInt(subcategory);
          if (!isNaN(subcategoryId)) {
            const { data: subData } = await supabase
              .from("subcategories")
              .select("name")
              .eq("id", subcategoryId)
              .maybeSingle();

            setSubcategoryName(subData?.name || subcategory);
          } else {
            setSubcategoryName("");
          }
        } else {
          setSubcategoryName("");
        }
      } catch (error) {
        console.error("Error fetching category names:", error);
        setCategoryName(category);
        setSubcategoryName(subcategory);
      }
    };

    fetchCategoryNames();
  }, [category, subcategory]);

  // Foto’s
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [mainIndex, setMainIndex] = useState<number>(0);
  const dragFrom = useRef<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Shipping (optioneel)
  const [shipping, setShipping] = useState<{ length?: number; width?: number; height?: number; weight?: number; }>({});

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isBusiness, setIsBusiness] = useState<boolean>(false);
  const [kycApproved, setKycApproved] = useState<boolean>(false);
  const [showKycModal, setShowKycModal] = useState<boolean>(false);

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
      // Als gebruiker KYC approved is, zet verzenden uit (ze gebruiken alleen veilig betalen)
      if (kycApproved) {
        setAllowShipping(false);
      }
    };

    checkBusinessAndKycStatus();
  }, [userEmail]);

  // Automatische categorie detectie op basis van titel en afbeeldingen
  const prevImageCountRef = useRef(0);
  useEffect(() => {
    // Alleen toepassen als nog geen categorie geselecteerd is
    if (category) return;

    // Controleer of er nieuwe afbeeldingen zijn toegevoegd en of ze Supabase URLs zijn
    const imageCountIncreased = imageUrls.length > prevImageCountRef.current;
    const hasSupabaseImages = imageUrls.some(url => url.startsWith('https://'));
    prevImageCountRef.current = imageUrls.length;

    // Probeer te detecteren op basis van titel, afbeeldingen, of beide
    const hasTitle = title.trim().length > 0;
    const hasImages = hasSupabaseImages && imageCountIncreased; // Alleen als er nieuwe Supabase afbeeldingen zijn

    if (!hasTitle && !hasImages) return; // Niets om te detecteren

    // Async functie voor categorie detectie
    const detectCategory = async () => {
      // Gebruik alleen Supabase URLs voor image analysis
      const supabaseImageUrls = imageUrls.filter(url => url.startsWith('https://'));
      const detected = await detectCategorySmart(title, supabaseImageUrls);
      if (detected && detected.confidence > 0.2) { // Alleen toepassen bij redelijke confidence
        const categoryId = detected.categoryId.toString(); // Convert to string for CategorySelect
        setCategory(categoryId);
        if (detected.subcategorySlug) {
          setSubcategory(detected.subcategorySlug);
        }
        console.log('Auto-detected category:', detected, 'from:', { hasTitle, hasImages, supabaseUrls: supabaseImageUrls.length }); // Debug logging
      }
    };

    // Kleine delay om ervoor te zorgen dat uploads compleet zijn
    setTimeout(detectCategory, 500);
  }, [title, imageUrls, category]);  const translate = async (targetLang: string) => {
    if (!desc.trim()) {
      push("Geen tekst om te vertalen.");
      return;
    }

    push("Vertaling wordt geladen...");
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: desc,
          targetLang,
        }),
      });

      if (!response.ok) {
        throw new Error('Vertaling mislukt');
      }

      const data = await response.json();
      const translatedText = data.translatedText;

      // Insert translation below the original text
      setDesc((d) => d + `\n\n${targetLang.toUpperCase()}: ${translatedText}`);
      push(`Vertaling naar ${targetLang.toUpperCase()} toegevoegd.`);
    } catch (error) {
      console.error('Translation error:', error);
      push("Vertaling mislukt. Probeer opnieuw.");
    }
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

  // Automatisch categorie invullen
  const [autoDetecting, setAutoDetecting] = useState(false);
  const autoFillCategory = async () => {
    if (!title.trim() && imageUrls.length === 0) {
      push("Vul eerst een titel in of upload foto’s om de categorie automatisch te detecteren.");
      return;
    }

    setAutoDetecting(true);
    try {
      // Gebruik alleen Supabase URLs voor image analysis
      const supabaseImageUrls = imageUrls.filter(url => url.startsWith('https://'));
      const detected = await detectCategorySmart(title, supabaseImageUrls);

      if (detected && detected.confidence > 10) { // Lagere threshold voor handmatige actie
        setCategory(detected.categoryId.toString());
        if (detected.subcategorySlug) {
          setSubcategory(detected.subcategorySlug);
        }
        push(`Categorie automatisch ingesteld: ${detected.detectedLabel || 'Onbekend'} (zekerheid: ${Math.round(detected.confidence)}%)`);
      } else {
        push("Kon geen categorie detecteren. Probeer een duidelijker titel of betere foto’s.");
      }
    } catch (error) {
      console.error('Auto category detection failed:', error);
      push("Fout bij automatisch detecteren van categorie. Probeer het opnieuw.");
    } finally {
      setAutoDetecting(false);
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
  function onDragStart(i: number) {
    dragFrom.current = i;
    setDraggedIndex(i);
  }
  function onDragOver(e: React.DragEvent, i: number) {
    e.preventDefault();
    setDragOverIndex(i);
  }
  function onDragEnd() {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }
  function onDrop(e: React.DragEvent, i: number) {
    e.preventDefault();
    const from = dragFrom.current;
    if (from === null || from === i) return;

    setImageUrls((prev) => {
      const newUrls = [...prev];
      const [moved] = newUrls.splice(from, 1);
      newUrls.splice(i, 0, moved);

      // Update mainIndex if it was affected
      let newMainIndex = mainIndex;
      if (from === mainIndex) {
        newMainIndex = i;
      } else if (from < mainIndex && i >= mainIndex) {
        newMainIndex = mainIndex - 1;
      } else if (from > mainIndex && i <= mainIndex) {
        newMainIndex = mainIndex + 1;
      }
      setMainIndex(newMainIndex);

      return newUrls;
    });

    dragFrom.current = null;
    setDraggedIndex(null);
    setDragOverIndex(null);
  }
  function markAsMain(i: number) { setMainIndex(i); }
  const trackRef = useRef<HTMLDivElement | null>(null);
  function scrollByCards(dir: "left" | "right") {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLDivElement>("[data-thumb]");
    const step = card ? card.getBoundingClientRect().width + 12 : 220;
    el.scrollBy({ left: dir === "left" ? -step : step, behavior: "smooth" });
  }

  // Verwijder individuele foto
  function removeImage(index: number) {
    setImageUrls((prev) => {
      const newUrls = prev.filter((_, i) => i !== index);
      // Als de hoofdafbeelding wordt verwijderd, selecteer de eerste resterende foto als hoofdafbeelding
      if (index === mainIndex && newUrls.length > 0) {
        setMainIndex(0);
      } else if (index < mainIndex && mainIndex > 0) {
        // Als een foto voor de hoofdafbeelding wordt verwijderd, verschuif de index
        setMainIndex(mainIndex - 1);
      }
      return newUrls;
    });
    push("Foto verwijderd.");
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

      // Prepare categories payload - convert to integer array for database
      const categoryId = category && !isNaN(parseInt(category)) ? parseInt(category) : null;
      const subcategoryId = subcategory && !isNaN(parseInt(subcategory)) ? parseInt(subcategory) : null;
      const categoriesPayload = [];
      if (categoryId) categoriesPayload.push(String(categoryId));
      if (subcategoryId) categoriesPayload.push(String(subcategoryId));

  const basePayload: {
    created_by: string;
    seller_id: string;
    title: string;
    description: string | null;
    price: number;
    allowoffers: boolean;
    allow_offers?: boolean; // Duplicate column
    allowOffers?: boolean; // Another duplicate column
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
    categories?: string[];
    status?: string;
    organization_id?: string | null;
    stock: number;
    category_id?: number | null;
    subcategory_id?: number | null;
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
    status: "actief", // Zorg dat elk nieuw zoekertje zichtbaar is in queries
    stock: stock,
    promo_featured: false,
    promo_top: false,
    category_id: categoryId,
    subcategory_id: subcategoryId,
  };
      if (isBusiness && orgId) {
        basePayload.organization_id = orgId; // als kolom bestaat
      }

      // Insert + fallback (join-table)
      // Debug: log the payload before inserting so we can see shape issues in client console
      // (in development only — avoid logging sensitive info in production)
      try {
        if (process.env.NODE_ENV !== "production") console.debug("[sell] basePayload:", { ...basePayload, images: basePayload.images?.length });
      } catch (e) {
        // ignore logging errors
      }
      // Temporarily use safe payload to avoid aggregate error
      const safePayload = {
        seller_id: basePayload.seller_id,
        created_by: basePayload.created_by,
        title: basePayload.title,
        description: basePayload.description,
        price: basePayload.price,
        images: basePayload.images,
        main_photo: basePayload.main_photo,
        category_id: basePayload.category_id,
        subcategory_id: basePayload.subcategory_id,
        stock: basePayload.stock,
        status: basePayload.status,
        allow_offers: basePayload.allowoffers,
        state: basePayload.state,
        location: basePayload.location,
        allow_shipping: basePayload.allow_shipping,
        shipping_length: basePayload.shipping_length,
        shipping_width: basePayload.shipping_width,
        shipping_height: basePayload.shipping_height,
        shipping_weight: basePayload.shipping_weight,
        min_bid: basePayload.min_bid,
        secure_pay: basePayload.secure_pay,
      };

      // Use API route for server-side validation and logging
      const response = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(safePayload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[sell] API error:', errorData);
        push(`Er ging iets mis: ${errorData.error || 'Onbekende fout'}`);
        return;
      }

      const result = await response.json();
      const listingId = result.id;

      await revalidateCategory(category, subcategory);
      if (isBusiness && orgSlug) await revalidateCompany(String(orgSlug));

      push("Zoekertje geplaatst!");

      // Redirect naar het nieuwe zoekertje zelf
      if (listingId) {
        // Fetch category and subcategory data for correct redirect URL
        let categorySlug = category;
        let subcategoryName = subcategory;

        try {
          // Get category slug
          if (categoryId) {
            const { data: catData } = await supabase
              .from("categories")
              .select("slug")
              .eq("id", categoryId)
              .maybeSingle();
            if (catData?.slug) {
              categorySlug = catData.slug;
            }
          }

          // Get subcategory name
          if (subcategoryId) {
            const { data: subData } = await supabase
              .from("subcategories")
              .select("name")
              .eq("id", subcategoryId)
              .maybeSingle();
            if (subData?.name) {
              subcategoryName = subData.name;
            }
          }
        } catch (error) {
          console.warn("Failed to fetch category/subcategory data for redirect:", error);
        }

        // Redirect naar categoriepagina met zoekertje-id als anchor
        const baseUrl = `/categories?cat=${encodeURIComponent(categorySlug)}`;
        const url = subcategoryName
          ? `${baseUrl}&sub=${encodeURIComponent(subcategoryName)}#listing-${listingId}`
          : `${baseUrl}#listing-${listingId}`;
        router.replace(url);
      } else {
        // fallback: categoriepagina
        let categorySlug = category;
        try {
          if (categoryId) {
            const { data: catData } = await supabase
              .from("categories")
              .select("slug")
              .eq("id", categoryId)
              .maybeSingle();
            if (catData?.slug) {
              categorySlug = catData.slug;
            }
          }
        } catch (error) {
          console.warn("Failed to fetch category data for fallback redirect:", error);
        }

        const baseUrl = `/categories?cat=${encodeURIComponent(categorySlug)}`;
        const url = subcategory
          ? `${baseUrl}&sub=${encodeURIComponent(subcategory)}`
          : baseUrl;
        router.replace(url);
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
                  onDragOver={onDragOver}
                  onDragEnd={onDragEnd}
                  onDrop={onDrop}
                  draggedIndex={draggedIndex}
                  dragOverIndex={dragOverIndex}
                  scrollByCards={scrollByCards}
                  trackRef={trackRef}
                  onRemove={removeImage}
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
                <button
                  onClick={autoFillCategory}
                  disabled={autoDetecting}
                  className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 shadow-sm hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {autoDetecting ? 'Detecteren...' : 'Vul categorie automatisch in'}
                </button>
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
                <button onClick={() => translate('fr')} type="button" className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm shadow-sm hover:bg-gray-50">
                  FR
                </button>
                <button onClick={() => translate('en')} type="button" className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm shadow-sm hover:bg-gray-50">
                  EN
                </button>
                <button onClick={() => translate('de')} type="button" className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm shadow-sm hover:bg-gray-50">
                  DE
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
                <LocationSelect
                  value={location}
                  onChange={setLocation}
                  placeholder="Zoek op postcode of gemeente..."
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
            {userEmail && <Toggle checked={allowSecurePay} onChange={handleSecurePayToggle} label="Veilig betalen via OCASO" />}
            {/* Verzenden via OCASO alleen tonen voor niet-KYC geverifieerde gebruikers */}
            {!kycApproved && <Toggle checked={allowShipping} onChange={setAllowShipping} label="Verzenden via OCASO" />}
            {!kycApproved && <p className="text-sm text-gray-500 mt-1">Aan de integratie wordt gewerkt - binnenkort beschikbaar</p>}
            {!kycApproved && allowShipping && (
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
                  Nog geen prijs
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
                    {categoryName || "—"}{subcategoryName ? ` / ${subcategoryName}` : ""}
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

              <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    onClick={handlePreview}
                    className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm hover:bg-gray-50"
                  >
                    Preview
                  </button>
                  <button
                    type="submit"
                    disabled={saving || uploading}
                    className="flex-1 rounded-xl bg-emerald-600 text-white px-4 py-2.5 text-sm font-medium shadow-sm hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {saving ? "Bezig…" : uploading ? "Upload…" : "Plaatsen"}
                  </button>
                </div>
              </form>

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
