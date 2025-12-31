/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing env vars. Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

type CategorySeed = {
  name: string;
  slug: string;
  sort_order: number;
  subcategories: {
    name: string;
    slug: string;
    sort_order: number;
  }[];
};

/**
 * Complete category structure from lib/categories.ts
 * Converted to Phase 16 canonical format
 */
const CATEGORIES: CategorySeed[] = [
  {
    name: "Auto's",
    slug: "autos",
    sort_order: 1,
    subcategories: [
      { name: "Personenwagens", slug: "personenwagens", sort_order: 1 },
      { name: "Bestelwagens", slug: "bestelwagens", sort_order: 2 },
      { name: "Oldtimers", slug: "oldtimers", sort_order: 3 },
      { name: "Auto-onderdelen & toebehoren", slug: "auto-onderdelen", sort_order: 4 },
    ],
  },
  {
    name: "Motoren", 
    slug: "motos",
    sort_order: 2,
    subcategories: [
      { name: "Motorfietsen", slug: "motorfietsen", sort_order: 1 },
      { name: "Scooters & Brommers", slug: "scooters-brommers", sort_order: 2 },
      { name: "Onderdelen & Accessoires", slug: "motor-onderdelen", sort_order: 3 },
    ],
  },
  {
    name: "Bedrijfsvoertuigen",
    slug: "bedrijfsvoertuigen", 
    sort_order: 3,
    subcategories: [
      { name: "Bestelwagens", slug: "bestelwagens-commercial", sort_order: 1 },
      { name: "Vrachtwagens", slug: "vrachtwagens", sort_order: 2 },
      { name: "Bussen", slug: "bussen", sort_order: 3 },
      { name: "Landbouwvoertuigen", slug: "landbouw", sort_order: 4 },
    ],
  },
  {
    name: "Campers & Caravans",
    slug: "campers",
    sort_order: 4,
    subcategories: [
      { name: "Campers", slug: "campers-sub", sort_order: 1 },
      { name: "Caravans", slug: "caravans", sort_order: 2 },
      { name: "Onderdelen & Accessoires", slug: "camper-onderdelen", sort_order: 3 },
    ],
  },
  {
    name: "Fietsen & Brommers",
    slug: "fietsen-brommers",
    sort_order: 5,
    subcategories: [
      { name: "Stadsfietsen", slug: "stadsfietsen", sort_order: 1 },
      { name: "Racefietsen", slug: "racefietsen", sort_order: 2 },
      { name: "MTB", slug: "mountainbikes", sort_order: 3 },
      { name: "Elektrische fietsen", slug: "e-bikes", sort_order: 4 },
      { name: "Brommers & Scooters", slug: "brommers", sort_order: 5 },
      { name: "Onderdelen & Accessoires", slug: "fiets-onderdelen", sort_order: 6 },
    ],
  },
  {
    name: "Huis & Inrichting",
    slug: "huis-inrichting",
    sort_order: 6,
    subcategories: [
      { name: "Meubels", slug: "meubels", sort_order: 1 },
      { name: "Verlichting", slug: "verlichting", sort_order: 2 },
      { name: "Decoratie", slug: "decoratie", sort_order: 3 },
      { name: "Wonen & Keuken", slug: "wonen-keuken", sort_order: 4 },
      { name: "Huishoudtoestellen", slug: "huishoudtoestellen", sort_order: 5 },
    ],
  },
  {
    name: "Tuin & Terras",
    slug: "tuin-terras",
    sort_order: 7,
    subcategories: [
      { name: "Tuinmeubelen", slug: "tuinmeubelen", sort_order: 1 },
      { name: "Gereedschap", slug: "tuingereedschap", sort_order: 2 },
      { name: "BBQ & Buitenkeuken", slug: "bbq", sort_order: 3 },
      { name: "Zwembad & Wellness", slug: "zwembad", sort_order: 4 },
    ],
  },
  {
    name: "Elektronica, TV & Audio",
    slug: "elektronica",
    sort_order: 8,
    subcategories: [
      { name: "Televisies", slug: "tv", sort_order: 1 },
      { name: "Audio & HiFi", slug: "audio-hifi", sort_order: 2 },
      { name: "Koptelefoons", slug: "headphones", sort_order: 3 },
      { name: "Camera's", slug: "cameras", sort_order: 4 },
    ],
  },
  {
    name: "Computers & Software",
    slug: "computers",
    sort_order: 9,
    subcategories: [
      { name: "Laptops", slug: "laptops", sort_order: 1 },
      { name: "Desktops", slug: "desktops", sort_order: 2 },
      { name: "Randapparatuur", slug: "randapparatuur", sort_order: 3 },
      { name: "Componenten", slug: "componenten", sort_order: 4 },
    ],
  },
  {
    name: "Telefoons & Tablets",
    slug: "phones-tablets",
    sort_order: 10,
    subcategories: [
      { name: "Smartphones", slug: "smartphones", sort_order: 1 },
      { name: "Tablets", slug: "tablets", sort_order: 2 },
      { name: "Accessoires", slug: "phone-accessoires", sort_order: 3 },
    ],
  },
  {
    name: "Kleding & Accessoires",
    slug: "kleding",
    sort_order: 11,
    subcategories: [
      { name: "Dames", slug: "dames", sort_order: 1 },
      { name: "Heren", slug: "heren", sort_order: 2 },
      { name: "Schoenen", slug: "schoenen", sort_order: 3 },
      { name: "Tassen & Juwelen", slug: "tassen-juwelen", sort_order: 4 },
    ],
  },
  {
    name: "Kinderen & Baby's",
    slug: "kinderen-baby",
    sort_order: 12,
    subcategories: [
      { name: "Kinderkleding", slug: "kinderkleding", sort_order: 1 },
      { name: "Kinderwagens", slug: "kinderwagens", sort_order: 2 },
      { name: "Speelgoed", slug: "speelgoed", sort_order: 3 },
    ],
  },
  {
    name: "Sport & Fitness",
    slug: "sport-fitness",
    sort_order: 13,
    subcategories: [
      { name: "Fitnessapparatuur", slug: "fitnessapparatuur", sort_order: 1 },
      { name: "Teamsport", slug: "teamsport", sort_order: 2 },
      { name: "Buiten & Hiking", slug: "buiten-hiking", sort_order: 3 },
    ],
  },
  {
    name: "Hobby's & Vrije tijd",
    slug: "hobbys",
    sort_order: 14,
    subcategories: [
      { name: "Modelbouw", slug: "modelbouw", sort_order: 1 },
      { name: "Verzamelen", slug: "verzamelen", sort_order: 2 },
      { name: "Creatief & Handwerk", slug: "handwerk", sort_order: 3 },
    ],
  },
  {
    name: "Muziek, Boeken & Films",
    slug: "muziek-boeken-films",
    sort_order: 15,
    subcategories: [
      { name: "Boeken", slug: "boeken", sort_order: 1 },
      { name: "Muziekinstrumenten", slug: "muziekinstrumenten", sort_order: 2 },
      { name: "LP's & CD's", slug: "lp-cd", sort_order: 3 },
      { name: "Films", slug: "films", sort_order: 4 },
    ],
  },
  {
    name: "Games & Consoles",
    slug: "games",
    sort_order: 16,
    subcategories: [
      { name: "Consoles", slug: "consoles", sort_order: 1 },
      { name: "Games", slug: "games-items", sort_order: 2 },
      { name: "Accessoires", slug: "game-accessoires", sort_order: 3 },
    ],
  },
  {
    name: "Dieren & Toebehoren",
    slug: "dieren",
    sort_order: 17,
    subcategories: [
      { name: "Honden & Katten", slug: "honden-katten", sort_order: 1 },
      { name: "Vogels & Knaagdieren", slug: "vogels-knaagdieren", sort_order: 2 },
      { name: "Verzorging & Benodigdheden", slug: "verzorging", sort_order: 3 },
    ],
  },
  {
    name: "Doe-het-zelf & Bouw",
    slug: "bouw",
    sort_order: 18,
    subcategories: [
      { name: "Bouwmaterialen", slug: "bouwmaterialen", sort_order: 1 },
      { name: "Gereedschap", slug: "gereedschap", sort_order: 2 },
      { name: "Sanitair & Keuken", slug: "sanitair-keuken", sort_order: 3 },
    ],
  },
  {
    name: "Boten & Watersport",
    slug: "boten",
    sort_order: 19,
    subcategories: [
      { name: "Boten", slug: "boten-items", sort_order: 1 },
      { name: "Watersport", slug: "watersport", sort_order: 2 },
      { name: "Onderdelen & Accessoires", slug: "boot-onderdelen", sort_order: 3 },
    ],
  },
  {
    name: "Tickets & Evenementen",
    slug: "tickets",
    sort_order: 20,
    subcategories: [
      { name: "Concerten", slug: "concerten", sort_order: 1 },
      { name: "Pretparken", slug: "pretparken", sort_order: 2 },
      { name: "Sportevenementen", slug: "sportevenementen", sort_order: 3 },
    ],
  },
  {
    name: "Diensten & Vakmensen",
    slug: "diensten",
    sort_order: 21,
    subcategories: [
      { name: "Herstellingen", slug: "herstellingen", sort_order: 1 },
      { name: "Verhuis & Transport", slug: "verhuis-transport", sort_order: 2 },
      { name: "Tuinonderhoud", slug: "tuinonderhoud", sort_order: 3 },
    ],
  },
  {
    name: "Huizen & Immo",
    slug: "immo",
    sort_order: 22,
    subcategories: [
      { name: "Te koop", slug: "te-koop", sort_order: 1 },
      { name: "Te huur", slug: "te-huur", sort_order: 2 },
      { name: "Vakantieverhuur", slug: "vakantie", sort_order: 3 },
    ],
  },
  {
    name: "Gratis af te halen",
    slug: "gratis",
    sort_order: 23,
    subcategories: [
      { name: "Alles gratis", slug: "alles-gratis", sort_order: 1 }
    ],
  },
];

async function upsertCategories(): Promise<Map<string, string>> {
  console.log("Seeding categories...");

  const categoryPayload = CATEGORIES.map(cat => ({
    name: cat.name,
    slug: cat.slug,
    sort_order: cat.sort_order,
    is_active: true,
  }));

  const { data: categories, error: catError } = await supabase
    .from("categories")
    .upsert(categoryPayload, { onConflict: "slug" })
    .select("id,slug");

  if (catError) throw catError;

  const categoryMap = new Map<string, string>();
  (categories || []).forEach((cat: any) => categoryMap.set(cat.slug, cat.id));
  
  console.log(`✅ Upserted ${categoryMap.size} categories`);
  return categoryMap;
}

async function upsertSubcategories(categoryMap: Map<string, string>): Promise<void> {
  console.log("Seeding subcategories...");
  
  const subcategoryPayload: any[] = [];
  
  for (const cat of CATEGORIES) {
    const categoryId = categoryMap.get(cat.slug);
    if (!categoryId) {
      console.warn(`[WARN] Category '${cat.slug}' not found, skipping subcategories`);
      continue;
    }

    for (const sub of cat.subcategories) {
      subcategoryPayload.push({
        category_id: categoryId,
        name: sub.name,
        slug: sub.slug,
        sort_order: sub.sort_order,
        is_active: true,
      });
    }
  }

  if (subcategoryPayload.length === 0) {
    console.log("No subcategories to seed");
    return;
  }

  // Upsert in chunks to avoid payload limits
  const chunkSize = 50;
  for (let i = 0; i < subcategoryPayload.length; i += chunkSize) {
    const chunk = subcategoryPayload.slice(i, i + chunkSize);
    
    const { error } = await supabase
      .from("subcategories")
      .upsert(chunk, { onConflict: "category_id,slug" });

    if (error) throw error;
  }

  console.log(`✅ Upserted ${subcategoryPayload.length} subcategories`);
}

async function main() {
  console.log("== OCASO | Seed Categories & Subcategories ==");
  
  try {
    // Step 1: Seed categories
    const categoryMap = await upsertCategories();

    // Step 2: Seed subcategories
    await upsertSubcategories(categoryMap);

    console.log("\n== Seed Complete ==");
    console.log("Verification queries:");
    console.log(" - SELECT COUNT(*) FROM categories;");
    console.log(" - SELECT COUNT(*) FROM subcategories;");
    console.log(" - SELECT c.name, COUNT(s.id) FROM categories c LEFT JOIN subcategories s ON s.category_id=c.id GROUP BY c.id, c.name ORDER BY c.sort_order;");

  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }
}

main();
