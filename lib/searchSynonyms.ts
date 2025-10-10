// lib/searchSynonyms.ts
// Uitgebreide synoniemen voor alle categorieën

export const categorySynonyms: Record<string, string[]> = {
  // Auto's
  auto: ["auto", "wagen", "personenwagen", "auto's", "wagens", "voertuig", "voertuigen"],
  personenwagen: ["personenwagen", "personenwagens", "auto", "wagen", "sedan", "hatchback", "stationwagen"],
  bestelwagen: ["bestelwagen", "bestelwagens", "busje", "busjes", "van", "transporter"],
  oldtimer: ["oldtimer", "oldtimers", "klassieker", "klassiekers", "vintage auto", "historische auto"],
  motorfiets: ["motorfiets", "motorfietsen", "motor", "motors", "motorrijwiel", "motorrijwielen"],
  "auto-onderdelen": ["auto-onderdelen", "auto onderdelen", "autodelen", "wagenonderdelen", "car parts"],

  // Fietsen & Brommers
  fiets: ["fiets", "fietsen", "rijwiel", "rijwielen", "twee wieler", "tweewieler"],
  stadsfiets: ["stadsfiets", "stadsfietsen", "city bike", "citybike", "stads fiets"],
  racefiets: ["racefiets", "racefietsen", "koersfiets", "koersfietsen", "road bike", "roadbike", "wegfiets", "wegfietsen"],
  mountainbike: ["mountainbike", "mountainbikes", "mtb", "bergfiets", "bergfietsen", "all mountain", "cross country"],
  mtb: ["mtb", "mountainbike", "mountainbikes", "bergfiets", "bergfietsen"],
  ebike: ["e-bike", "ebike", "e bike", "elektrische fiets", "elektrische fietsen", "e-fiets", "e-fietsen"],
  brommer: ["brommer", "brommers", "scooter", "scooters", "bromfiets", "bromfietsen"],
  "fiets-onderdelen": ["fiets-onderdelen", "fiets onderdelen", "fietsaccessoires", "fiets accessoires", "bike parts"],

  // Huis & Inrichting
  meubel: ["meubel", "meubels", "meubilair", "meubels"],
  verlichting: ["verlichting", "lamp", "lampen", "licht", "lichten", "spots", "led"],
  decoratie: ["decoratie", "decoraties", "sieraden", "sier", "ornamenten", "decoratief"],
  "wonen-keuken": ["wonen keuken", "keuken", "kookgerei", "pannen", "servies", "bestek"],
  huishoudtoestellen: ["huishoudtoestellen", "huishoud apparaten", "wasmachine", "droger", "koelkast", "oven", "magnetron"],

  // Tuin & Terras
  tuinmeubelen: ["tuinmeubelen", "tuin meubels", "buitenmeubels", "buiten meubels", "terrassen", "tuinstoelen"],
  tuingereedschap: ["tuingereedschap", "tuin gereedschap", "grasmaaier", "heggenschaar", "tuinapparatuur"],
  bbq: ["bbq", "barbecue", "grill", "grillen", "buitenkeuken", "buiten keuken"],
  zwembad: ["zwembad", "zwembaden", "pool", "jacuzzi", "spa", "wellness"],

  // Elektronica, TV & Audio
  televisie: ["televisie", "tv", "televisies", "beeldscherm", "beeldschermen", "smart tv", "led tv"],
  audio: ["audio", "hifi", "hi-fi", "muziek", "geluid", "speakers", "boxen"],
  koptelefoon: ["koptelefoon", "koptelefoons", "headphones", "headset", "oortjes", "earbuds"],
  camera: ["camera", "camera's", "fotocamera", "videocamera", "digitale camera"],

  // Computers & Software
  laptop: ["laptop", "laptops", "notebook", "notebooks", "draagbare computer"],
  desktop: ["desktop", "desktops", "pc", "computer", "computer's", "toren"],
  randapparatuur: ["randapparatuur", "rand apparatuur", "printer", "scanner", "muis", "toetsenbord", "monitor"],
  componenten: ["componenten", "computer onderdelen", "moederbord", "processor", "ram", "harddisk", "ssd"],

  // Telefoons & Tablets
  smartphone: ["smartphone", "smartphones", "telefoon", "telefoons", "mobiel", "mobiele telefoon", "gsm"],
  tablet: ["tablet", "tablets", "ipad", "android tablet"],
  "phone-accessoires": ["telefoon accessoires", "phone accessoires", "hoesje", "hoesjes", "oplader", "charger"],

  // Kleding & Accessoires
  dames: ["dames", "vrouw", "vrouwen", "dameskleding", "vrouwenkleding"],
  heren: ["heren", "man", "mannen", "herenkleding", "mannenkleding"],
  schoenen: ["schoenen", "schoen", "laarzen", "sneakers", "sneakers", "boots"],
  "tassen-juwelen": ["tassen", "juwelen", "sieraden", "ketting", "ringen", "horloge", "horloges"],

  // Kinderen & Baby's
  kinderkleding: ["kinderkleding", "kinder kleding", "babykleding", "baby kleding"],
  kinderwagen: ["kinderwagen", "kinderwagens", "buggy", "wandelwagen"],
  speelgoed: ["speelgoed", "speelgoed", "speel dingen", "speelspullen", "lego", "speelgoed"],

  // Sport & Fitness
  fitnessapparatuur: ["fitnessapparatuur", "fitness apparatuur", "hometrainer", "crosstrainer", "gewichtheffen"],
  teamsport: ["teamsport", "team sport", "voetbal", "basketbal", "volleybal", "hockey"],
  "buiten-hiking": ["buiten hiking", "wandelen", "trekking", "kamperen", "tent", "rugzak"],

  // Hobby's & Vrije tijd
  modelbouw: ["modelbouw", "model bouw", "modeltreinen", "modelauto's", "schaalmodellen"],
  verzamelen: ["verzamelen", "verzameling", "collectie", "collecties", "postzegels", "munten"],
  "handwerk-creatief": ["handwerk creatief", "knutselen", "tekenen", "schilderen", "breien", "haken"],

  // Muziek, Boeken & Films
  boeken: ["boeken", "boek", "literatuur", "leesboek", "leesboeken"],
  muziekinstrumenten: ["muziekinstrumenten", "instrumenten", "gitaar", "piano", "drum", "viool"],
  "lp-cd": ["lp", "cd", "vinyl", "grammofoonplaat", "muziek cd", "cd's"],
  films: ["films", "film", "dvd", "blu-ray", "blueray", "videoband"],

  // Games & Consoles
  console: ["console", "consoles", "playstation", "xbox", "nintendo", "switch"],
  games: ["games", "spelletjes", "videogames", "computerspel", "computerspellen"],
  "game-accessoires": ["game accessoires", "controller", "gamepad", "headset gaming"],

  // Dieren & Toebehoren
  "honden-katten": ["honden katten", "hond", "honden", "kat", "katten", "huisdier", "huisdieren"],
  "vogels-knaagdieren": ["vogels knaagdieren", "vogel", "vogels", "konijn", "konijnen", "hamster", "cavia"],
  verzorging: ["verzorging", "dierenverzorging", "dieren voeding", "dierenvoeding", "mand", "bench"],

  // Doe-het-zelf & Bouw
  bouwmaterialen: ["bouwmaterialen", "bouw materialen", "hout", "cement", "stenen", "tegels"],
  gereedschap: ["gereedschap", "gereedschappen", "boormachine", "zaag", "hamer", "schroevendraaier"],
  "sanitair-keuken": ["sanitair keuken", "badkamer", "toilet", "kraan", "douche"],

  // Caravans, Campers & Boten
  "caravans-campers": ["caravans campers", "caravan", "camper", "woonwagen", "mobilhome"],
  boten: ["boten", "boot", "vaartuig", "vaartuigen", "zeilboot", "motorboot"],
  "onderdelen-accessoires": ["onderdelen accessoires", "boot onderdelen", "caravan accessoires"],

  // Tickets & Evenementen
  concerten: ["concerten", "concert", "optreden", "optredens", "festival", "festivals"],
  pretparken: ["pretparken", "pretpark", "attractiepark", "disneyland", "efteling"],
  sportevenementen: ["sportevenementen", "wedstrijd", "wedstrijden", "voetbal wedstrijd", "tennis"],

  // Diensten & Vakmensen
  herstellingen: ["herstellingen", "reparatie", "reparaties", "repareren", "fixen"],
  "verhuis-transport": ["verhuis transport", "verhuizen", "verhuizing", "transport", "vervoer"],
  tuinonderhoud: ["tuinonderhoud", "tuin onderhoud", "grasmaaien", "snoeien", "tuinieren"],

  // Huizen & Immo
  "te-koop": ["te koop", "verkopen", "verkoop", "huis verkopen", "appartement verkopen"],
  "te-huur": ["te huur", "huren", "verhuur", "huis huren", "appartement huren"],
  vakantie: ["vakantie", "vakantieverhuur", "vakantiehuis", "vakantie appartement"],

  // Algemene termen
  gratis: ["gratis", "kosteloos", "voor niets", "om niet", "cadeau", "weggeven", "free"],
  nieuw: ["nieuw", "nieuwe", "nieuwstaat", "onbruikbaar", "onberispelijk", "new"],
  gebruikt: ["gebruikt", "tweedehands", "second hand", "gebruikte", "opgebruik", "used"],
  tweedehands: ["tweedehands", "second hand", "gebruikt", "gebruikte", "opgebruik", "used"],
  koop: ["koop", "verkopen", "verkoop", "koopje", "goedkoop", "sale"],
  huur: ["huur", "huren", "verhuur", "rent"],
  verkoop: ["verkoop", "verkopen", "verkoop", "te koop", "for sale"],
  reparatie: ["reparatie", "reparaties", "repareren", "fix", "herstellen", "repair"],
  service: ["service", "dienst", "diensten", "onderhoud", "maintenance"],
  professioneel: ["professioneel", "professional", "vakman", "expert"],
  kwaliteit: ["kwaliteit", "quality", "hoogwaardig", "premium", "top"],
  goedkoop: ["goedkoop", "goedkope", "betaalbaar", "budget", "cheap", "affordable"],
  duur: ["duur", "dure", "luxe", "premium", "expensive", "luxury"],
  modern: ["modern", "moderne", "contemporary", "hedendaags"],
  vintage: ["vintage", "retro", "ouderwets", "klassiek", "antiek"],
  groot: ["groot", "grote", "large", "big"],
  klein: ["klein", "kleine", "small", "compact"],
  snel: ["snel", "snelle", "fast", "rapid"],
  langzaam: ["langzaam", "trage", "slow"],
  licht: ["licht", "lichte", "light", "easy"],
  zwaar: ["zwaar", "zware", "heavy", "difficult"],
};

/**
 * Bouwt een OR filter string voor Supabase queries gebaseerd op synoniemen
 * @param term De zoekterm om uit te breiden met synoniemen
 * @returns Een komma-gescheiden string van OR voorwaarden voor title en description
 */
export function buildSynonymOrFilter(term: string): string | undefined {
  const tNorm = term.toLowerCase().trim();
  if (!tNorm || tNorm.length < 2) return undefined;

  const terms = new Set<string>();
  terms.add(tNorm);

  // Voeg individuele woorden toe
  tNorm.split(/\s+/).forEach((t) => {
    if (t.length > 1) terms.add(t);
  });

  // Voeg synoniemen toe gebaseerd op gevonden keywords
  Object.entries(categorySynonyms).forEach(([key, synonyms]) => {
    if (tNorm.includes(key)) {
      synonyms.forEach((synonym: string) => terms.add(synonym));
    }
  });  // Filter en limiet voor performance
  const termList = Array.from(terms)
    .filter((x) => x.length > 1)
    .slice(0, 15); // Max 15 termen om query niet te complex te maken

  if (!termList.length) return undefined;

  const orParts: string[] = [];
  termList.forEach((t) => {
    // Escape speciale karakters voor SQL LIKE
    const esc = t.replace(/[%_]/g, "").replace(/'/g, "''");
    if (esc.length > 1) {
      orParts.push(`title.ilike.%${esc}%`);
      orParts.push(`description.ilike.%${esc}%`);
    }
  });

  return orParts.join(",");
}

/**
 * Vergelijkbare functie maar alleen voor titels (voor suggesties)
 * @param term De zoekterm
 * @returns Array van synoniem termen
 */
export function getSynonymTerms(term: string): string[] {
  const tNorm = term.toLowerCase().trim();
  if (!tNorm || tNorm.length < 2) return [tNorm];

  const terms = new Set<string>();
  terms.add(tNorm);

  // Voeg individuele woorden toe
  tNorm.split(/\s+/).forEach((t) => {
    if (t.length > 1) terms.add(t);
  });

  // Voeg synoniemen toe
  Object.entries(categorySynonyms).forEach(([key, synonyms]) => {
    if (tNorm.includes(key)) {
      synonyms.forEach((synonym: string) => terms.add(synonym));
    }
  });

  return Array.from(terms).filter((x) => x.length > 1).slice(0, 10);
}
