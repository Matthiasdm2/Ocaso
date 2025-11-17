// lib/categoryDetection.ts
// Automatische categorie detectie op basis van titel en beschrijving

export interface DetectedCategory {
    categoryId: number;
    categorySlug: string;
    subcategorySlug?: string;
    confidence: number;
    detectedLabel?: string;
}

// Mapping van categorie slugs naar database IDs
const categorySlugToId: Record<string, number> = {
    "auto-s": 1, // Auto's
    "motoren-en-scooters": 2, // Motoren & Scooters
    "fietsen": 3, // Fietsen
    "caravans-en-kamperen": 4, // Caravans & Kamperen
    "watersport": 5, // Watersport
    "huis-en-inrichting": 6, // Huis & Inrichting
    "tuin-en-doe-het-zelf": 7, // Tuin & Doe-het-zelf
    "elektronica": 8, // Elektronica
    "gaming": 9, // Gaming
    "foto-en-video": 10, // Foto & Video
    "huishoudelijk": 11, // Huishoudelijk
    "kleding-en-accessoires": 12, // Kleding & Accessoires
    "sieraden-en-horloges": 13, // Sieraden & Horloges
    "beauty-en-gezondheid": 14, // Beauty & Gezondheid
    "kinderen-en-baby-s": 15, // Kinderen & Baby's
    "sport-en-vrije-tijd": 16, // Sport & Vrije tijd
    "muziek": 17, // Muziek
    "boeken-en-media": 18, // Boeken & Media
    "film-en-series": 19, // Film & Series
    "kunst-en-antiek": 20, // Kunst & Antiek
    "verzamelen": 21, // Verzamelen
    "dieren": 22, // Dieren
    "zakelijk": 23, // Zakelijk
    "bouw-en-gereedschap": 24, // Bouw & Gereedschap
    "horeca-en-keuken": 25, // Horeca & Keuken
    "agrarisch": 26, // Agrarisch
    "evenementen": 27, // Evenementen
    "reizen": 28, // Reizen
    "gratis-en-ruilen": 29, // Gratis & Ruilen
    "diensten": 30, // Diensten
    "software": 31, // Software
    "domotica": 32, // Domotica
    "audio-pro": 33, // Audio Pro
    "medisch-en-zorg": 34, // Medisch & Zorg
    "beveiliging": 35, // Beveiliging
    "energie": 36, // Energie
};

// Keywords mapping naar categorieën en subcategorieën
const categoryKeywords: Record<
    string,
    { categorySlug: string; subcategorySlug?: string; keywords: string[] }
> = {
    // Auto's
    "auto": {
        categorySlug: "auto-s",
        subcategorySlug: "personenauto-s",
        keywords: [
            "auto",
            "wagen",
            "personenwagen",
            "sedan",
            "hatchback",
            "stationwagen",
            "auto's",
            "wagens",
        ],
    },
    "bestelwagen": {
        categorySlug: "auto-s",
        subcategorySlug: "bedrijfswagens",
        keywords: [
            "bestelwagen",
            "bestelwagens",
            "busje",
            "busjes",
            "van",
            "transporter",
        ],
    },
    "oldtimer": {
        categorySlug: "auto-s",
        subcategorySlug: "oldtimers",
        keywords: [
            "oldtimer",
            "oldtimers",
            "klassieker",
            "klassiekers",
            "vintage auto",
            "historische auto",
        ],
    },
    "motorfiets": {
        categorySlug: "auto-s",
        subcategorySlug: "motoren",
        keywords: [
            "motorfiets",
            "motorfietsen",
            "motor",
            "motors",
            "motorrijwiel",
        ],
    },
    "auto-onderdelen": {
        categorySlug: "auto-s",
        subcategorySlug: "onderdelen-auto-s",
        keywords: [
            "auto-onderdelen",
            "auto onderdelen",
            "autodelen",
            "wagenonderdelen",
            "car parts",
        ],
    },

    // Fietsen
    "fiets": {
        categorySlug: "fietsen",
        subcategorySlug: "stadsfietsen",
        keywords: [
            "fiets",
            "fietsen",
            "rijwiel",
            "rijwielen",
            "twee wieler",
            "tweewieler",
        ],
    },
    "racefiets": {
        categorySlug: "fietsen",
        subcategorySlug: "racefietsen",
        keywords: [
            "racefiets",
            "racefietsen",
            "koersfiets",
            "koersfietsen",
            "road bike",
            "roadbike",
            "wegfiets",
            "wegfietsen",
        ],
    },
    "mountainbike": {
        categorySlug: "fietsen",
        subcategorySlug: "mountainbikes",
        keywords: [
            "mountainbike",
            "mountainbikes",
            "mtb",
            "bergfiets",
            "bergfietsen",
            "all mountain",
            "cross country",
        ],
    },
    "ebike": {
        categorySlug: "fietsen",
        subcategorySlug: "elektrische-fietsen",
        keywords: [
            "e-bike",
            "ebike",
            "e bike",
            "elektrische fiets",
            "elektrische fietsen",
            "e-fiets",
            "e-fietsen",
        ],
    },
    "brommer": {
        categorySlug: "fietsen",
        subcategorySlug: "brommers",
        keywords: [
            "brommer",
            "brommers",
            "scooter",
            "scooters",
            "bromfiets",
            "bromfietsen",
        ],
    },
    "fiets-onderdelen": {
        categorySlug: "fietsen",
        subcategorySlug: "onderdelen-fietsen",
        keywords: [
            "fiets-onderdelen",
            "fiets onderdelen",
            "fietsaccessoires",
            "fiets accessoires",
            "bike parts",
        ],
    },

    // Huis & Inrichting
    "meubel": {
        categorySlug: "huis-en-inrichting",
        subcategorySlug: "meubels",
        keywords: [
            "meubel",
            "meubels",
            "meubilair",
            "tafel",
            "stoel",
            "kast",
            "bed",
            "bank",
        ],
    },
    "verlichting": {
        categorySlug: "huis-en-inrichting",
        subcategorySlug: "decoratie",
        keywords: [
            "verlichting",
            "lamp",
            "lampen",
            "licht",
            "lichten",
            "spots",
            "led",
            "hanglamp",
        ],
    },
    "decoratie": {
        categorySlug: "huis-en-inrichting",
        subcategorySlug: "decoratie",
        keywords: [
            "decoratie",
            "decoraties",
            "sieraden",
            "sier",
            "ornamenten",
            "decoratief",
            "vaas",
            "kussen",
        ],
    },
    "keuken": {
        categorySlug: "huis-en-inrichting",
        subcategorySlug: "keuken",
        keywords: [
            "keuken",
            "kookgerei",
            "pannen",
            "servies",
            "bestek",
            "oven",
            "kookplaat",
        ],
    },
    "huishoudtoestellen": {
        categorySlug: "huishoudelijk",
        subcategorySlug: "wassen-en-drogen",
        keywords: [
            "wasmachine",
            "droger",
            "koelkast",
            "oven",
            "magnetron",
            "stofzuiger",
            "huishoud apparaat",
        ],
    },

    // Tuin & Doe-het-zelf
    "tuinmeubelen": {
        categorySlug: "tuin-en-doe-het-zelf",
        subcategorySlug: "tuingereedschap",
        keywords: [
            "tuinmeubelen",
            "tuin meubels",
            "buitenmeubels",
            "buiten meubels",
            "terrassen",
            "tuinstoelen",
            "tuintafel",
        ],
    },
    "tuingereedschap": {
        categorySlug: "tuin-en-doe-het-zelf",
        subcategorySlug: "tuingereedschap",
        keywords: [
            "grasmaaier",
            "heggenschaar",
            "tuinapparatuur",
            "tuingereedschap",
            "schop",
            "hark",
        ],
    },
    "bbq": {
        categorySlug: "tuin-en-doe-het-zelf",
        subcategorySlug: "tuingereedschap",
        keywords: [
            "bbq",
            "barbecue",
            "grill",
            "grillen",
            "buitenkeuken",
            "buiten keuken",
        ],
    },
    "zwembad": {
        categorySlug: "tuin-en-doe-het-zelf",
        subcategorySlug: "tuingereedschap",
        keywords: [
            "zwembad",
            "zwembaden",
            "pool",
            "jacuzzi",
            "spa",
            "wellness",
        ],
    },

    // Elektronica
    "televisie": {
        categorySlug: "elektronica",
        subcategorySlug: "audio-en-tv",
        keywords: [
            "televisie",
            "tv",
            "televisies",
            "beeldscherm",
            "beeldschermen",
            "smart tv",
            "led tv",
            "oled",
        ],
    },
    "audio": {
        categorySlug: "elektronica",
        subcategorySlug: "audio-en-tv",
        keywords: [
            "audio",
            "hifi",
            "hi-fi",
            "muziek",
            "geluid",
            "speakers",
            "boxen",
            "versterker",
        ],
    },
    "koptelefoon": {
        categorySlug: "elektronica",
        subcategorySlug: "telefonie",
        keywords: [
            "koptelefoon",
            "koptelefoons",
            "headphones",
            "headset",
            "oortjes",
            "earbuds",
        ],
    },
    "camera": {
        categorySlug: "foto-en-video",
        subcategorySlug: "camera-s",
        keywords: [
            "camera",
            "camera's",
            "fotocamera",
            "videocamera",
            "digitale camera",
            "dslr",
        ],
    },

    // Computers
    "laptop": {
        categorySlug: "elektronica",
        subcategorySlug: "computers",
        keywords: [
            "laptop",
            "laptops",
            "notebook",
            "notebooks",
            "draagbare computer",
        ],
    },
    "desktop": {
        categorySlug: "elektronica",
        subcategorySlug: "computers",
        keywords: [
            "desktop",
            "desktops",
            "pc",
            "computer",
            "computer's",
            "toren",
            "tower",
        ],
    },
    "randapparatuur": {
        categorySlug: "elektronica",
        subcategorySlug: "computers",
        keywords: [
            "printer",
            "scanner",
            "muis",
            "toetsenbord",
            "monitor",
            "webcam",
        ],
    },
    "componenten": {
        categorySlug: "elektronica",
        subcategorySlug: "computers",
        keywords: [
            "moederbord",
            "processor",
            "ram",
            "harddisk",
            "ssd",
            "videokaart",
        ],
    },

    // Telefoons & Tablets
    "smartphone": {
        categorySlug: "elektronica",
        subcategorySlug: "telefonie",
        keywords: [
            "smartphone",
            "smartphones",
            "telefoon",
            "telefoons",
            "mobiel",
            "mobiele telefoon",
            "gsm",
            "iphone",
            "samsung",
        ],
    },
    "tablet": {
        categorySlug: "elektronica",
        subcategorySlug: "computers",
        keywords: ["tablet", "tablets", "ipad", "android tablet", "surface"],
    },
    "phone-accessoires": {
        categorySlug: "elektronica",
        subcategorySlug: "telefonie",
        keywords: [
            "hoesje",
            "hoesjes",
            "oplader",
            "charger",
            "telefoon accessoires",
            "phone case",
        ],
    },

    // Kleding
    "dames": {
        categorySlug: "kleding-en-accessoires",
        subcategorySlug: "dames",
        keywords: [
            "dames",
            "vrouw",
            "vrouwen",
            "dameskleding",
            "vrouwenkleding",
            "jurk",
            "bloes",
        ],
    },
    "heren": {
        categorySlug: "kleding-en-accessoires",
        subcategorySlug: "heren",
        keywords: [
            "heren",
            "man",
            "mannen",
            "herenkleding",
            "mannenkleding",
            "broek",
            "shirt",
        ],
    },
    "schoenen": {
        categorySlug: "kleding-en-accessoires",
        subcategorySlug: "schoenen",
        keywords: [
            "schoenen",
            "schoen",
            "laarzen",
            "sneakers",
            "sneakers",
            "boots",
            "sandals",
        ],
    },
    "tassen": {
        categorySlug: "kleding-en-accessoires",
        subcategorySlug: "heren",
        keywords: ["tassen", "tas", "handtas", "rugzak", "koffer"],
    },

    // Kinderen & Baby's
    "kinderkleding": {
        categorySlug: "kinderen-en-baby-s",
        subcategorySlug: "kleding",
        keywords: [
            "kinderkleding",
            "kinder kleding",
            "babykleding",
            "baby kleding",
        ],
    },
    "kinderwagen": {
        categorySlug: "kinderen-en-baby-s",
        subcategorySlug: "kinderwagens",
        keywords: [
            "kinderwagen",
            "kinderwagens",
            "buggy",
            "wandelwagen",
            "maxicosi",
        ],
    },
    "speelgoed": {
        categorySlug: "kinderen-en-baby-s",
        subcategorySlug: "speelgoed",
        keywords: [
            "speelgoed",
            "speelgoed",
            "speel dingen",
            "speelspullen",
            "lego",
            "speelgoed",
            "knuffel",
        ],
    },

    // Sport & Fitness
    "fitness": {
        categorySlug: "sport-en-vrije-tijd",
        subcategorySlug: "fitness",
        keywords: [
            "fitnessapparatuur",
            "fitness apparatuur",
            "hometrainer",
            "crosstrainer",
            "gewichtheffen",
            "dumbbells",
        ],
    },
    "teamsport": {
        categorySlug: "sport-en-vrije-tijd",
        subcategorySlug: "teamsporten",
        keywords: [
            "voetbal",
            "basketbal",
            "volleybal",
            "hockey",
            "bal",
            "sportkleding",
        ],
    },
    "buiten": {
        categorySlug: "sport-en-vrije-tijd",
        subcategorySlug: "fitness",
        keywords: [
            "wandelen",
            "trekking",
            "kamperen",
            "tent",
            "rugzak",
            "slaapzak",
        ],
    },

    // Hobby's
    "modelbouw": {
        categorySlug: "verzamelen",
        subcategorySlug: "modelbouw",
        keywords: [
            "modelbouw",
            "model bouw",
            "modeltreinen",
            "modelauto's",
            "schaalmodellen",
        ],
    },
    "verzamelen": {
        categorySlug: "verzamelen",
        subcategorySlug: "munten",
        keywords: [
            "verzamelen",
            "verzameling",
            "collectie",
            "postzegels",
            "munten",
            "stamps",
        ],
    },
    "handwerk": {
        categorySlug: "verzamelen",
        subcategorySlug: "modelbouw",
        keywords: [
            "handwerk",
            "knutselen",
            "tekenen",
            "schilderen",
            "breien",
            "haken",
            "creatief",
        ],
    },

    // Muziek, Boeken & Films
    "boeken": {
        categorySlug: "boeken-en-media",
        subcategorySlug: "romans",
        keywords: [
            "boeken",
            "boek",
            "literatuur",
            "leesboek",
            "leesboeken",
            "roman",
            "thriller",
        ],
    },
    "instrumenten": {
        categorySlug: "muziek",
        subcategorySlug: "snaarinstrumenten",
        keywords: [
            "gitaar",
            "piano",
            "drum",
            "viool",
            "instrument",
            "muziek instrument",
        ],
    },
    "vinyl": {
        categorySlug: "muziek",
        subcategorySlug: "drums",
        keywords: ["lp", "cd", "vinyl", "grammofoonplaat", "muziek cd", "cd's"],
    },
    "films": {
        categorySlug: "film-en-series",
        subcategorySlug: "dvd",
        keywords: ["films", "film", "dvd", "blu-ray", "blueray", "videoband"],
    },

    // Games & Consoles
    "console": {
        categorySlug: "gaming",
        subcategorySlug: "consoles",
        keywords: [
            "console",
            "consoles",
            "playstation",
            "xbox",
            "nintendo",
            "switch",
            "ps5",
            "ps4",
        ],
    },
    "games": {
        categorySlug: "gaming",
        subcategorySlug: "games",
        keywords: [
            "games",
            "spelletjes",
            "videogames",
            "computerspel",
            "computerspellen",
        ],
    },
    "game-accessoires": {
        categorySlug: "gaming",
        subcategorySlug: "accessoires",
        keywords: ["controller", "gamepad", "headset gaming", "gaming muis"],
    },

    // Dieren
    "hond": {
        categorySlug: "dieren",
        subcategorySlug: "honden",
        keywords: [
            "hond",
            "honden",
            "kat",
            "katten",
            "huisdier",
            "huisdieren",
            "puppy",
        ],
    },
    "vogel": {
        categorySlug: "dieren",
        subcategorySlug: "vogels",
        keywords: [
            "vogel",
            "vogels",
            "konijn",
            "konijnen",
            "hamster",
            "cavia",
            "parkiet",
        ],
    },
    "dierenverzorging": {
        categorySlug: "dieren",
        subcategorySlug: "honden",
        keywords: [
            "mand",
            "bench",
            "dieren voeding",
            "dierenvoeding",
            "hondenvoer",
            "kattenvoer",
        ],
    },

    // Doe-het-zelf
    "bouwmaterialen": {
        categorySlug: "bouw-en-gereedschap",
        subcategorySlug: "bouwmaterialen",
        keywords: ["hout", "cement", "stenen", "tegels", "bouw materiaal"],
    },
    "gereedschap": {
        categorySlug: "bouw-en-gereedschap",
        subcategorySlug: "gereedschap",
        keywords: [
            "boormachine",
            "zaag",
            "hamer",
            "schroevendraaier",
            "gereedschap",
        ],
    },
    "sanitair": {
        categorySlug: "bouw-en-gereedschap",
        subcategorySlug: "afwerking",
        keywords: ["badkamer", "toilet", "kraan", "douche", "sanitair"],
    },

    // Caravans & Boten
    "caravan": {
        categorySlug: "caravans-en-kamperen",
        subcategorySlug: "caravans",
        keywords: [
            "caravan",
            "camper",
            "woonwagen",
            "mobilhome",
            "caravans",
            "campers",
        ],
    },
    "boot": {
        categorySlug: "watersport",
        subcategorySlug: "motorboten",
        keywords: [
            "boot",
            "boten",
            "vaartuig",
            "vaartuigen",
            "zeilboot",
            "motorboot",
        ],
    },
    "caravan-onderdelen": {
        categorySlug: "caravans-en-kamperen",
        subcategorySlug: "onderdelen-accessoires",
        keywords: [
            "boot onderdelen",
            "caravan accessoires",
            "onderdelen accessoires",
        ],
    },

    // Tickets & Evenementen
    "concert": {
        categorySlug: "evenementen",
        subcategorySlug: "concerten",
        keywords: [
            "concert",
            "concerten",
            "optreden",
            "optredens",
            "festival",
            "festivals",
        ],
    },
    "pretpark": {
        categorySlug: "evenementen",
        subcategorySlug: "pretparken",
        keywords: [
            "pretpark",
            "pretparken",
            "attractiepark",
            "disneyland",
            "efteling",
        ],
    },
    "sportevenement": {
        categorySlug: "evenementen",
        subcategorySlug: "sportevenementen",
        keywords: [
            "wedstrijd",
            "wedstrijden",
            "voetbal wedstrijd",
            "tennis",
            "sport event",
        ],
    },

    // Diensten
    "reparatie": {
        categorySlug: "diensten",
        subcategorySlug: "herstellingen",
        keywords: [
            "reparatie",
            "reparaties",
            "repareren",
            "fix",
            "herstellen",
            "repair",
        ],
    },
    "verhuis": {
        categorySlug: "diensten",
        subcategorySlug: "verhuis-transport",
        keywords: [
            "verhuis",
            "verhuizing",
            "transport",
            "vervoer",
            "verhuizing",
        ],
    },
    "tuinonderhoud": {
        categorySlug: "diensten",
        subcategorySlug: "tuinonderhoud",
        keywords: [
            "tuinonderhoud",
            "tuin onderhoud",
            "grasmaaien",
            "snoeien",
            "tuinieren",
        ],
    },

    // Zakelijk
    "te-koop": {
        categorySlug: "zakelijk",
        subcategorySlug: "te-koop",
        keywords: [
            "te koop",
            "verkopen",
            "verkoop",
            "huis verkopen",
            "appartement verkopen",
        ],
    },
    "te-huur": {
        categorySlug: "zakelijk",
        subcategorySlug: "te-huur",
        keywords: [
            "te huur",
            "huren",
            "verhuur",
            "huis huren",
            "appartement huren",
        ],
    },
    "vakantie": {
        categorySlug: "reizen",
        subcategorySlug: "vakantie",
        keywords: [
            "vakantie",
            "vakantieverhuur",
            "vakantiehuis",
            "vakantie appartement",
        ],
    },

    // Gratis
    "gratis": {
        categorySlug: "gratis-en-ruilen",
        subcategorySlug: "alles-gratis",
        keywords: [
            "gratis",
            "kosteloos",
            "voor niets",
            "om niet",
            "cadeau",
            "weggeven",
            "free",
        ],
    },
};

/**
 * Detecteert automatisch categorie en subcategorie op basis van titel en beschrijving
 */
export function detectCategory(text: string): DetectedCategory | null {
    if (!text) return null;

    const lowerText = text.toLowerCase();
    let bestMatch: DetectedCategory | null = null;
    let highestScore = 0;

    // Zoek naar keyword matches
    for (const [key, categoryData] of Object.entries(categoryKeywords)) {
        for (const keyword of categoryData.keywords) {
            if (lowerText.includes(keyword.toLowerCase())) {
                const score = keyword.length / text.length; // Lengte-gebaseerde score
                if (score > highestScore) {
                    highestScore = score;
                    const categoryId =
                        categorySlugToId[categoryData.categorySlug];
                    if (categoryId) {
                        bestMatch = {
                            categoryId,
                            categorySlug: categoryData.categorySlug,
                            subcategorySlug: categoryData.subcategorySlug,
                            confidence: Math.min(score * 100, 100), // Max 100%
                            detectedLabel: key,
                        };
                    }
                }
            }
        }
    }

    return bestMatch;
}

/**
 * Detecteert categorie op basis van afbeeldingen via de image service
 */
export async function detectCategoryFromImages(
): Promise<DetectedCategory | null> {
    // Temporarily disabled image classification, return null to use text-based
    return null;
}

/**
 * Combineert tekst- en image-detectie voor de beste categorie detectie
 */
export async function detectCategorySmart(
    text: string,
    images?: string[],
): Promise<DetectedCategory | null> {
    // Probeer eerst tekst-detectie
    const textResult = detectCategory(text);

    // Als we images hebben, probeer ook image-detectie
    let imageResult: DetectedCategory | null = null;
    if (images && images.length > 0) {
        imageResult = await detectCategoryFromImages();
    }

    // Kies het beste resultaat gebaseerd op confidence
    if (textResult && imageResult) {
        return textResult.confidence >= imageResult.confidence
            ? textResult
            : imageResult;
    }

    return textResult || imageResult;
}
