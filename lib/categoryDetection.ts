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
    "auto-motor": 1, // Auto's (canonical slug)
    "auto-s": 1, // Auto's (legacy alias - voor backward compatibility)
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
        categorySlug: "auto-motor", // Canonical slug voor vehicle details
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
            // Automerken
            "bmw",
            "mercedes",
            "mercedes-benz",
            "audi",
            "volkswagen",
            "vw",
            "ford",
            "opel",
            "peugeot",
            "renault",
            "citroën",
            "citroen",
            "fiat",
            "toyota",
            "honda",
            "nissan",
            "hyundai",
            "kia",
            "mazda",
            "suzuki",
            "skoda",
            "seat",
            "volvo",
            "tesla",
            "porsche",
            "jaguar",
            "land rover",
            "mini",
            "smart",
            "dacia",
            "mitsubishi",
            "subaru",
            "alfa romeo",
            "jeep",
            "lexus",
            "genesis",
            "byd",
            "cupra",
            "mg",
            "polestar",
            "abarth",
            "ds automobiles",
            "lynk & co",
            "aiways",
            "leapmotor",
            "nio",
            "ora",
            "xpeng",
            // Auto-gerelateerde termen
            "diesel",
            "benzine",
            "elektrisch",
            "hybride",
            "suv",
            "coupé",
            "coupe",
            "cabrio",
            "cabriolet",
            "berline",
            "monovolume",
            "mpv",
            "personenauto",
            "tweedehands",
            "occasie",
            "occasion",
            "km stand",
            "kilometerstand",
            "km-stand",
        ],
    },
    "bestelwagen": {
        categorySlug: "bedrijfswagens", // Bedrijfswagens heeft eigen categorie
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
        categorySlug: "auto-motor",
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
        categorySlug: "motoren-en-scooters", // Of "motoren" afhankelijk van database
        subcategorySlug: "motoren",
        keywords: [
            "motorfiets",
            "motorfietsen",
            "motor",
            "motors",
            "motorrijwiel",
            // Motorfietsmerken
            "yamaha",
            "honda",
            "kawasaki",
            "suzuki",
            "ducati",
            "aprilia",
            "ktm",
            "harley",
            "harley-davidson",
            "triumph",
            "bmw motorrad",
            "benelli",
            "moto guzzi",
            "mv agusta",
            "royal enfield",
            "vespa",
            "piaggio",
            "cfmoto",
            "gasgas",
            "husqvarna",
            "indian",
            "kymco",
            "sym",
            "zero",
            "zontes",
            // Motor types
            "chopper",
            "cruiser",
            "sportmotor",
            "naked bike",
            "enduro",
            "crossmotor",
            "scooter",
            "bromfiets",
        ],
    },
    "auto-onderdelen": {
        categorySlug: "auto-motor",
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
            // Fietsmerken
            "gazelle",
            "batavus",
            "sparta",
            "koga",
            "cortina",
            "giant",
            "trek",
            "specialized",
            "cannondale",
            "scott",
            "cube",
            "merida",
            "kona",
            "orbea",
            "bianchi",
            "pinarello",
            "cervelo",
            "colnago",
            "vanmoof",
            "cowboy",
            "omafiets",
            "damesfiets",
            "herenfiets",
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
            "eettafel",
            "salontafel",
            "bureautafel",
            "stoel",
            "eetstoel",
            "bureaustoel",
            "kast",
            "boekenkast",
            "kledingkast",
            "bed",
            "bedframe",
            "matras",
            "bank",
            "zitbank",
            "sofa",
            "fauteuil",
            "bureau",
            "kast",
            "dressoir",
            "vitrinekast",
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
            "koekenpan",
            "kookpan",
            "servies",
            "borden",
            "kommen",
            "bestek",
            "mes",
            "vork",
            "lepel",
            "oven",
            "kookplaat",
            "fornuis",
            "afwasmachine",
            "vaatwasser",
            "koelkast",
            "vriezer",
            "keukenmachine",
            "blender",
            "mixer",
        ],
    },
    "huishoudtoestellen": {
        categorySlug: "huishoudelijk",
        subcategorySlug: "wassen-en-drogen",
        keywords: [
            "wasmachine",
            "droger",
            "wasdroger",
            "koelkast",
            "vriezer",
            "diepvriezer",
            "oven",
            "magnetron",
            "stofzuiger",
            "robotstofzuiger",
            "dyson",
            "huishoud apparaat",
            "huishoudapparaat",
            "afzuigkap",
            "vaatwasser",
            "afwasmachine",
            "koffiezetapparaat",
            "nespresso",
            "senseo",
            "koffiemachine",
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
            // TV merken
            "samsung tv",
            "lg tv",
            "sony tv",
            "philips tv",
            "panasonic tv",
            "tcl",
            "hisense",
            "sharp",
            "toshiba",
            "jvc",
            "qled",
            "qled tv",
            "4k",
            "8k",
            "uhd",
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
            // Audio merken
            "bose",
            "sonos",
            "jbl",
            "sony audio",
            "philips audio",
            "bang & olufsen",
            "harman kardon",
            "yamaha audio",
            "pioneer",
            "denon",
            "marantz",
            "onkyo",
            "klipsch",
            "kef",
            "bowers & wilkins",
            "soundbar",
            "subwoofer",
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
            // Headphone merken
            "airpods",
            "airpods pro",
            "airpods max",
            "beats",
            "sony headphones",
            "bose headphones",
            "sennheiser",
            "audio-technica",
            "jbl headphones",
            "jabra",
            "anker",
            "soundcore",
            "wireless",
            "bluetooth",
            "noise cancelling",
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
            // Camera merken
            "canon",
            "nikon",
            "sony camera",
            "fujifilm",
            "panasonic camera",
            "olympus",
            "leica",
            "gopro",
            "instax",
            "polaroid",
            "kodak",
            "pentax",
            // Camera types
            "spiegelreflex",
            "spiegelreflexcamera",
            "mirrorless",
            "compact camera",
            "action camera",
            "drone",
            "dji",
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
            // Laptop merken
            "macbook",
            "dell",
            "hp",
            "lenovo",
            "asus",
            "acer",
            "msi",
            "razer",
            "alienware",
            "surface",
            "thinkpad",
            "xps",
            "pavilion",
            "inspiron",
            "zenbook",
            "vivobook",
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
            // Telefoonmerken
            "iphone",
            "samsung",
            "huawei",
            "xiaomi",
            "oneplus",
            "oppo",
            "vivo",
            "google pixel",
            "nokia",
            "sony",
            "lg",
            "motorola",
            "realme",
            "honor",
            // Modellen
            "galaxy",
            "note",
            "fold",
            "pro max",
            "se",
            "mini",
        ],
    },
    "tablet": {
        categorySlug: "elektronica",
        subcategorySlug: "computers",
        keywords: [
            "tablet",
            "tablets",
            "ipad",
            "ipad pro",
            "ipad air",
            "ipad mini",
            "android tablet",
            "surface",
            "samsung tablet",
            "galaxy tab",
            "kindle",
            "ebook reader",
            "e-reader",
        ],
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
            "broek",
            "jeans",
            "shirt",
            "t-shirt",
            "trui",
            "sweater",
            "rok",
            "blazer",
            "jas",
            "jassen",
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
            "jeans",
            "shirt",
            "t-shirt",
            "trui",
            "sweater",
            "polo",
            "overhemd",
            "blazer",
            "jas",
            "jassen",
            "pak",
            "kostuum",
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
            "boots",
            "sandals",
            // Schoenmerken
            "nike",
            "adidas",
            "puma",
            "reebok",
            "converse",
            "vans",
            "new balance",
            "asics",
            "jordan",
            "air max",
            "air force",
            "stan smith",
            "superstar",
            "all star",
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
            "halter",
            "halters",
            "barbell",
            "kettlebell",
            "loopband",
            "treadmill",
            "roeimachine",
            "rowing machine",
            "fiets hometrainer",
            "spinning bike",
            "bench",
            "bankje",
            "fitnessbank",
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
            "voetbalschoenen",
            "voetbaltenue",
            "basketbaltenue",
            "hockeytenue",
            "tennis",
            "tennisracket",
            "badminton",
            "squash",
            "padel",
            "voetbal",
            "voetbalveld",
            "voetbalgoal",
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
            "kookboek",
            "stripboek",
            "stripverhaal",
            "comic",
            "manga",
            "encyclopedie",
            "woordenboek",
            "atlas",
            "biografie",
            "autobiografie",
            "geschiedenis",
            "fictie",
            "non-fictie",
        ],
    },
    "instrumenten": {
        categorySlug: "muziek",
        subcategorySlug: "snaarinstrumenten",
        keywords: [
            "gitaar",
            "elektrische gitaar",
            "akoestische gitaar",
            "basgitaar",
            "piano",
            "vleugel",
            "keyboard",
            "synthesizer",
            "drum",
            "drumstel",
            "viool",
            "cello",
            "contrabas",
            "harp",
            "instrument",
            "muziek instrument",
            // Muziekinstrument merken
            "fender",
            "gibson",
            "yamaha instrument",
            "roland",
            "korg",
            "casio",
            "steinway",
            "pearl",
            "zildjian",
            "sabian",
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
            "ps5",
            "ps4",
            "ps3",
            "playstation 5",
            "playstation 4",
            "xbox",
            "xbox series",
            "xbox one",
            "xbox 360",
            "nintendo",
            "switch",
            "nintendo switch",
            "wii",
            "wii u",
            "gamecube",
            "steam deck",
            "oculus",
            "vr",
            "virtual reality",
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
            "puppy",
            "pup",
            "kat",
            "katten",
            "kitten",
            "poes",
            "huisdier",
            "huisdieren",
            // Hondenrassen
            "labrador",
            "golden retriever",
            "duitse herder",
            "bulldog",
            "beagle",
            "border collie",
            "chihuahua",
            "yorkshire",
            "boxer",
            "rottweiler",
            // Kattenrassen
            "pers",
            "britse korthaar",
            "main coon",
            "siamees",
            "ragdoll",
            "bengaal",
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
 * Detecteert contextuele hints in de tekst die helpen bij categorisatie
 */
function detectContextualHints(text: string): {
    isVehicle: boolean;
    isElectronics: boolean;
    isAudio: boolean;
    isMusic: boolean;
} {
    const lowerText = text.toLowerCase();
    
    // Auto/motor hints: modelnummers (bijv. "520D", "A4", "C220", "320i")
    const vehicleModelPattern = /\b([a-z]\d{2,4}[a-z]?|\d{3,4}[a-z]{1,2})\b/i;
    const hasVehicleModel = vehicleModelPattern.test(text);
    
    // Auto-specifieke termen
    const vehicleTerms = ['km', 'kilometer', 'km stand', 'km-stand', 'benzine', 'diesel', 'elektrisch', 'hybride', 
                         'occasie', 'occasion', 'tweedehands', 'apk', 'keuring', 'schadevrij', 'onderhoudsboekje'];
    const hasVehicleTerms = vehicleTerms.some(term => lowerText.includes(term));
    
    // Audio/elektronica hints
    const audioTerms = ['speaker', 'box', 'versterker', 'amplifier', 'hifi', 'hi-fi', 'soundbar', 'subwoofer'];
    const hasAudioTerms = audioTerms.some(term => lowerText.includes(term));
    
    // Muziek instrument hints
    const musicTerms = ['gitaar', 'piano', 'drum', 'viool', 'keyboard', 'synthesizer'];
    const hasMusicTerms = musicTerms.some(term => lowerText.includes(term));
    
    // Elektronica hints
    const electronicsTerms = ['gb', 'ram', 'processor', 'ssd', 'harddisk', 'batterij', 'accu', 'charger', 'oplader'];
    const hasElectronicsTerms = electronicsTerms.some(term => lowerText.includes(term));
    
    return {
        isVehicle: hasVehicleModel || hasVehicleTerms,
        isElectronics: hasElectronicsTerms && !hasVehicleTerms,
        isAudio: hasAudioTerms,
        isMusic: hasMusicTerms,
    };
}

/**
 * Detecteert automatisch categorie en subcategorie op basis van titel en beschrijving
 */
export function detectCategory(text: string): DetectedCategory | null {
    if (!text) return null;

    const lowerText = text.toLowerCase();
    const contextualHints = detectContextualHints(text);
    
    let bestMatch: DetectedCategory | null = null;
    let highestConfidence = 0;
    const matches: Array<{ match: DetectedCategory; confidence: number }> = [];

    // Zoek naar keyword matches
    for (const [key, categoryData] of Object.entries(categoryKeywords)) {
        for (const keyword of categoryData.keywords) {
            const lowerKeyword = keyword.toLowerCase();
            if (lowerText.includes(lowerKeyword)) {
                // Basis confidence voor het vinden van een keyword match
                let confidence = 50; // Basis 50% confidence
                
                // Boost voor langere keywords (meer specifiek)
                if (keyword.length >= 5) {
                    confidence += 15;
                }
                if (keyword.length >= 10) {
                    confidence += 10;
                }
                
                // Boost als keyword vroeg in de tekst voorkomt (eerste 30 karakters)
                const keywordIndex = lowerText.indexOf(lowerKeyword);
                if (keywordIndex >= 0 && keywordIndex < 30) {
                    confidence += 10;
                }
                
                // Boost als keyword een exact woord is (niet deel van een ander woord)
                const beforeChar = keywordIndex > 0 ? lowerText[keywordIndex - 1] : ' ';
                const afterChar = keywordIndex + keyword.length < lowerText.length 
                    ? lowerText[keywordIndex + keyword.length] 
                    : ' ';
                const isWordBoundary = !/[a-z0-9]/.test(beforeChar) && !/[a-z0-9]/.test(afterChar);
                if (isWordBoundary) {
                    confidence += 5;
                }
                
                // CONTEXTUELE BOOSTS - Belangrijkste verbetering!
                const categorySlug = categoryData.categorySlug;
                
                // Als er vehicle hints zijn, boost auto/motor categorieën
                if (contextualHints.isVehicle) {
                    if (categorySlug === "auto-motor" || categorySlug === "auto-s" || 
                        categorySlug === "motoren-en-scooters" || categorySlug === "motoren" ||
                        categorySlug === "fietsen" || categorySlug === "caravans-en-kamperen" ||
                        categorySlug === "bedrijfswagens") {
                        confidence += 30; // Grote boost voor vehicle categorieën
                    } else if (categorySlug === "elektronica" || categorySlug === "muziek") {
                        confidence -= 20; // Verminder confidence voor niet-vehicle categorieën
                    }
                }
                
                // Als er audio hints zijn, boost audio categorieën
                if (contextualHints.isAudio && !contextualHints.isVehicle) {
                    if (categorySlug === "elektronica" && (key.includes("audio") || key.includes("koptelefoon"))) {
                        confidence += 25;
                    } else if (categorySlug === "auto-motor" || categorySlug === "auto-s" || 
                               categorySlug === "motoren-en-scooters" || categorySlug === "motoren") {
                        confidence -= 15; // Verminder als het duidelijk audio is
                    }
                }
                
                // Als er muziek instrument hints zijn, boost muziek categorieën
                if (contextualHints.isMusic && !contextualHints.isVehicle) {
                    if (categorySlug === "muziek") {
                        confidence += 25;
                    } else if (categorySlug === "elektronica" && !key.includes("audio")) {
                        confidence -= 15;
                    }
                }
                
                // Specifieke merk context: BMW, Yamaha, Sony, etc.
                // Als alleen een merk wordt genoemd zonder context, gebruik hints
                if (keyword.match(/^(bmw|mercedes|audi|volkswagen|ford|opel|peugeot|renault|toyota|honda|nissan)$/i)) {
                    if (contextualHints.isVehicle) {
                        confidence += 20; // Boost als er vehicle hints zijn
                    } else if (categorySlug === "elektronica" || categorySlug === "muziek") {
                        confidence -= 10; // Verminder voor niet-vehicle categorieën zonder context
                    }
                }
                
                // Yamaha specifiek: kan auto, motor, audio, of muziek zijn
                if (keyword.toLowerCase() === "yamaha") {
                    if (contextualHints.isVehicle) {
                        if (categorySlug === "auto-motor" || categorySlug === "auto-s" || 
                            categorySlug === "motoren-en-scooters" || categorySlug === "motoren") {
                            confidence += 25;
                        } else {
                            confidence -= 20;
                        }
                    } else if (contextualHints.isAudio) {
                        if (categorySlug === "elektronica" && key.includes("audio")) {
                            confidence += 25;
                        } else {
                            confidence -= 15;
                        }
                    } else if (contextualHints.isMusic) {
                        if (categorySlug === "muziek") {
                            confidence += 25;
                        } else {
                            confidence -= 15;
                        }
                    }
                    // Als geen hints: standaard naar motor (meest voorkomend)
                    else if (categorySlug === "motoren-en-scooters" || categorySlug === "motoren") {
                        confidence += 10;
                    }
                }
                
                // Sony specifiek: kan elektronica of audio zijn
                if (keyword.toLowerCase() === "sony") {
                    if (contextualHints.isVehicle) {
                        confidence -= 30; // Sony maakt geen voertuigen
                    }
                    if (contextualHints.isAudio && categorySlug === "elektronica") {
                        confidence += 15;
                    }
                }
                
                // Cap confidence op 100%
                confidence = Math.min(confidence, 100);
                
                // Verzamel alle matches
                const categoryId = categorySlugToId[categoryData.categorySlug];
                if (categoryId && confidence > 0) {
                    matches.push({
                        match: {
                            categoryId,
                            categorySlug: categoryData.categorySlug,
                            subcategorySlug: categoryData.subcategorySlug,
                            confidence,
                            detectedLabel: key,
                        },
                        confidence,
                    });
                }
            }
        }
    }
    
    // Kies het beste match (hoogste confidence)
    if (matches.length > 0) {
        matches.sort((a, b) => b.confidence - a.confidence);
        bestMatch = matches[0].match;
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
 * Gebruikt AI (OpenAI) voor categorisatie als beschikbaar
 * Fallback naar keyword-based detectie als AI niet beschikbaar is
 * 
 * KOSTEN: ~$0.0001-0.0002 per detectie (zeer goedkoop)
 * - GPT-4o-mini: $0.15 per 1M input tokens, $0.60 per 1M output tokens
 * - Per request: ~100-200 tokens ≈ $0.0001-0.0002
 * - 10.000 detecties ≈ $1-2
 * 
 * OPTIONEEL: Werkt ook perfect zonder AI - de verbeterde keyword detectie is al zeer goed!
 */
async function detectCategoryWithAI(text: string): Promise<DetectedCategory | null> {
    // Check of OpenAI API key beschikbaar is
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
        return null; // Geen AI beschikbaar - geen probleem, keyword detectie werkt ook
    }

    // KOSTENBESPARING: Alleen AI gebruiken als tekst kort is (< 100 karakters)
    // Lange teksten zijn duurder en keyword detectie werkt daar beter
    if (text.length > 100) {
        return null; // Gebruik keyword detectie voor lange teksten
    }

    try {
        // Compacte system prompt om tokens te besparen
        const categories = [
            'auto-s', 'motoren-en-scooters', 'fietsen', 'caravans-en-kamperen',
            'huis-en-inrichting', 'tuin-en-doe-het-zelf', 'elektronica', 'gaming',
            'foto-en-video', 'huishoudelijk', 'kleding-en-accessoires', 'sieraden-en-horloges',
            'beauty-en-gezondheid', 'kinderen-en-baby-s', 'sport-en-vrije-tijd', 'muziek',
            'boeken-en-media', 'film-en-series', 'kunst-en-antiek', 'verzamelen',
            'dieren', 'zakelijk', 'bouw-en-gereedschap', 'horeca-en-keuken',
            'agrarisch', 'evenementen', 'reizen', 'gratis-en-ruilen',
            'diensten', 'software', 'domotica', 'audio-pro',
            'medisch-en-zorg', 'beveiliging', 'energie'
        ].join(', ');

        // Gebruik OpenAI voor categorisatie met minimale tokens
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openaiKey}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini', // Goedkoopste model
                messages: [
                    {
                        role: 'system',
                        content: `Categoriseer producttitel. Antwoord alleen met slug: ${categories}`
                    },
                    {
                        role: 'user',
                        content: text.substring(0, 200) // Limiteer input lengte
                    }
                ],
                temperature: 0.1, // Lager = meer voorspelbaar = minder tokens
                max_tokens: 20, // Minimale output (alleen slug)
            }),
        });

        if (!response.ok) {
            console.error('OpenAI API error:', await response.text());
            return null;
        }

        const data = await response.json();
        const categorySlug = data.choices[0]?.message?.content?.trim().toLowerCase().replace(/['"]/g, '');
        
        if (categorySlug && categorySlugToId[categorySlug]) {
            return {
                categoryId: categorySlugToId[categorySlug],
                categorySlug: categorySlug,
                confidence: 85, // Hoge confidence voor AI resultaten
                detectedLabel: 'AI detectie',
            };
        }
    } catch (error) {
        console.error('AI category detection failed:', error);
        // Fallback naar keyword-based detectie - geen probleem!
    }

    return null;
}

/**
 * Combineert tekst- en image-detectie voor de beste categorie detectie
 * Gebruikt AI als fallback bij lage confidence
 */
export async function detectCategorySmart(
    text: string,
    images?: string[],
): Promise<DetectedCategory | null> {
    // Probeer eerst tekst-detectie
    const textResult = detectCategory(text);

    // Als confidence laag is (< 40%), probeer AI als fallback
    if ((!textResult || textResult.confidence < 40) && text.trim().length > 0) {
        const aiResult = await detectCategoryWithAI(text);
        if (aiResult) {
            return aiResult;
        }
    }

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
