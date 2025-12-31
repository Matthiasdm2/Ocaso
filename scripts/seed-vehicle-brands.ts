import { createClient } from "@supabase/supabase-js";

type VehicleGroup = "cars" | "motos" | "lcv" | "campers";

type BrandSeed = {
  name: string;
  slug: string;
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing env vars. Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

/**
 * PAS DEZE SLUGS AAN aan jouw categories.slug in Supabase.
 * We laten meerdere mogelijke slugs toe als fallback.
 */
const VEHICLE_CATEGORY_SLUGS: Record<VehicleGroup, string[]> = {
  cars: ["autos", "auto-s", "auto", "cars"],
  motos: ["motos", "motoren", "moto-s", "motorcycles"],
  lcv: ["bedrijfsvoertuigen", "bestelwagens", "lcv", "commercial-vehicles"],
  campers: ["campers", "motorhomes", "campervans"],
};

/**
 * Merksets (max 25 per groep)
 */
const BRANDS: Record<VehicleGroup, BrandSeed[]> = {
  cars: [
    { name: "Volkswagen", slug: "volkswagen" },
    { name: "Toyota", slug: "toyota" },
    { name: "BMW", slug: "bmw" },
    { name: "Mercedes-Benz", slug: "mercedes-benz" },
    { name: "Renault", slug: "renault" },
    { name: "Peugeot", slug: "peugeot" },
    { name: "Audi", slug: "audi" },
    { name: "Skoda", slug: "skoda" },
    { name: "Dacia", slug: "dacia" },
    { name: "Hyundai", slug: "hyundai" },
    { name: "Kia", slug: "kia" },
    { name: "Ford", slug: "ford" },
    { name: "Opel", slug: "opel" },
    { name: "Citroën", slug: "citroen" },
    { name: "Fiat", slug: "fiat" },
    { name: "Nissan", slug: "nissan" },
    { name: "SEAT", slug: "seat" },
    { name: "Volvo", slug: "volvo" },
    { name: "Mazda", slug: "mazda" },
    { name: "Suzuki", slug: "suzuki" },
    { name: "Mini", slug: "mini" },
    { name: "Jeep", slug: "jeep" },
    { name: "Tesla", slug: "tesla" },
    { name: "MG", slug: "mg" },
    { name: "Cupra", slug: "cupra" },
  ],
  motos: [
    { name: "Honda", slug: "honda" },
    { name: "Yamaha", slug: "yamaha" },
    { name: "BMW", slug: "bmw" },
    { name: "Kawasaki", slug: "kawasaki" },
    { name: "Suzuki", slug: "suzuki" },
    { name: "Ducati", slug: "ducati" },
    { name: "KTM", slug: "ktm" },
    { name: "Triumph", slug: "triumph" },
    { name: "Harley-Davidson", slug: "harley-davidson" },
    { name: "Aprilia", slug: "aprilia" },
    { name: "Piaggio", slug: "piaggio" },
    { name: "Vespa", slug: "vespa" },
    { name: "Royal Enfield", slug: "royal-enfield" },
    { name: "Moto Guzzi", slug: "moto-guzzi" },
    { name: "Husqvarna", slug: "husqvarna" },
    { name: "Benelli", slug: "benelli" },
    { name: "MV Agusta", slug: "mv-agusta" },
    { name: "Indian", slug: "indian" },
    { name: "CFMOTO", slug: "cfmoto" },
    { name: "Zontes", slug: "zontes" },
    { name: "Brixton", slug: "brixton" },
    { name: "SYM", slug: "sym" },
    { name: "Kymco", slug: "kymco" },
    { name: "Peugeot Motocycles", slug: "peugeot-motocycles" },
    { name: "Zero Motorcycles", slug: "zero-motorcycles" },
  ],
  lcv: [
    { name: "Ford", slug: "ford" },
    { name: "Mercedes-Benz", slug: "mercedes-benz" },
    { name: "Volkswagen", slug: "volkswagen" },
    { name: "Renault", slug: "renault" },
    { name: "Peugeot", slug: "peugeot" },
    { name: "Citroën", slug: "citroen" },
    { name: "Fiat", slug: "fiat" },
    { name: "Opel", slug: "opel" },
    { name: "Iveco", slug: "iveco" },
    { name: "MAN", slug: "man" },
    { name: "Toyota", slug: "toyota" },
    { name: "Nissan", slug: "nissan" },
    { name: "Isuzu", slug: "isuzu" },
    { name: "Mitsubishi", slug: "mitsubishi" },
    { name: "Maxus", slug: "maxus" },
    { name: "LDV", slug: "ldv" },
    { name: "Ram", slug: "ram" },
    { name: "GMC", slug: "gmc" },
    { name: "Chevrolet", slug: "chevrolet" },
    { name: "Hyundai", slug: "hyundai" },
    { name: "Kia", slug: "kia" },
    { name: "Suzuki", slug: "suzuki" },
    { name: "Tata", slug: "tata" },
    { name: "DFSK", slug: "dfsk" },
    { name: "Foton", slug: "foton" },
  ],
  campers: [
    { name: "Hymer", slug: "hymer" },
    { name: "Adria", slug: "adria" },
    { name: "Knaus", slug: "knaus" },
    { name: "Weinsberg", slug: "weinsberg" },
    { name: "Dethleffs", slug: "dethleffs" },
    { name: "Hobby", slug: "hobby" },
    { name: "Bürstner", slug: "burstner" },
    { name: "Carado", slug: "carado" },
    { name: "Sunlight", slug: "sunlight" },
    { name: "Eura Mobil", slug: "eura-mobil" },
    { name: "Chausson", slug: "chausson" },
    { name: "Pilote", slug: "pilote" },
    { name: "Rapido", slug: "rapido" },
    { name: "McLouis", slug: "mclouis" },
    { name: "Roller Team", slug: "roller-team" },
    { name: "Benimar", slug: "benimar" },
    { name: "Laika", slug: "laika" },
    { name: "Rimor", slug: "rimor" },
    { name: "Autostar", slug: "autostar" },
    { name: "Carthago", slug: "carthago" },
    { name: "Malibu", slug: "malibu" },
    { name: "Pössl", slug: "possl" },
    { name: "Globecar", slug: "globecar" },
    { name: "Westfalia", slug: "westfalia" },
    { name: "Bavaria", slug: "bavaria" },
  ],
};

async function getCategoryIdsForGroup(group: VehicleGroup): Promise<string[]> {
  const slugs = VEHICLE_CATEGORY_SLUGS[group];

  const { data, error } = await supabase
    .from("categories")
    .select("id,slug")
    .in("slug", slugs);

  if (error) throw error;

  if (!data || data.length === 0) {
    console.warn(`[WARN] No categories found for group '${group}' with slugs: ${slugs.join(", ")}`);
    return [];
  }

  return data.map((c) => c.id);
}

async function upsertBrands(brands: BrandSeed[]): Promise<Map<string, string>> {
  const payload = brands.map((b) => ({
    name: b.name,
    slug: b.slug || slugify(b.name),
  }));

  const { data, error } = await supabase
    .from("vehicle_brands")
    .upsert(payload, { onConflict: "slug" })
    .select("id,slug");

  if (error) throw error;

  const map = new Map<string, string>();
  (data || []).forEach((row: any) => map.set(row.slug, row.id));
  return map;
}

async function linkBrandsToCategories(categoryIds: string[], brandIds: string[]) {
  if (categoryIds.length === 0 || brandIds.length === 0) return;

  const rows: { category_id: string; brand_id: string }[] = [];
  for (const categoryId of categoryIds) {
    for (const brandId of brandIds) {
      rows.push({ category_id: categoryId, brand_id: brandId });
    }
  }

  const { error } = await supabase
    .from("category_vehicle_brands")
    .upsert(rows, { onConflict: "category_id,brand_id" });

  if (error) throw error;
}

async function main() {
  console.log("== OCASO | Seed Vehicle Brands ==");

  for (const group of Object.keys(BRANDS) as VehicleGroup[]) {
    const brands = BRANDS[group];

    if (brands.length > 25) {
      throw new Error(`Brand list for '${group}' exceeds 25 (${brands.length}). Reduce to max 25.`);
    }

    console.log(`\n-- Group: ${group} | brands: ${brands.length} --`);

    const categoryIds = await getCategoryIdsForGroup(group);
    console.log(`Categories found: ${categoryIds.length}`);

    const brandMap = await upsertBrands(brands);
    console.log(`Brands upserted/selected: ${brandMap.size}`);

    const brandIds = brands.map((b) => brandMap.get(b.slug)).filter(Boolean) as string[];

    await linkBrandsToCategories(categoryIds, brandIds);
    console.log(`Linked ${brandIds.length} brands to ${categoryIds.length} categories.`);
  }

  console.log("\n== Done ==");
  console.log(
    "Run DB checks:\n" +
      " - select count(*) from vehicle_brands;\n" +
      " - select c.slug, count(*) from category_vehicle_brands cvb join categories c on c.id=cvb.category_id group by c.slug;\n"
  );
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
