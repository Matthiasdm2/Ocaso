export type SubCategory = { name: string; slug: string };
export type Category = { name: string; slug: string; subs: SubCategory[] };

export const CATEGORIES: Category[] = [
  {
    name: "Auto's",
    slug: "autos",
    subs: [
      { name: "Personenwagens", slug: "personenwagens" },
      { name: "Bestelwagens", slug: "bestelwagens" },
      { name: "Oldtimers", slug: "oldtimers" },
      { name: "Motorfietsen", slug: "motorfietsen" },
      { name: "Auto-onderdelen & toebehoren", slug: "auto-onderdelen" },
    ],
  },
  {
    name: "Fietsen & Brommers",
    slug: "fietsen-brommers",
    subs: [
      { name: "Stadsfietsen", slug: "stadsfietsen" },
      { name: "Racefietsen", slug: "racefietsen" },
      { name: "MTB", slug: "mountainbikes" },
      { name: "Elektrische fietsen", slug: "e-bikes" },
      { name: "Brommers & Scooters", slug: "brommers" },
      { name: "Onderdelen & Accessoires", slug: "fiets-onderdelen" },
    ],
  },
  {
    name: "Huis & Inrichting",
    slug: "huis-inrichting",
    subs: [
      { name: "Meubels", slug: "meubels" },
      { name: "Verlichting", slug: "verlichting" },
      { name: "Decoratie", slug: "decoratie" },
      { name: "Wonen & Keuken", slug: "wonen-keuken" },
      { name: "Huishoudtoestellen", slug: "huishoudtoestellen" },
    ],
  },
  {
    name: "Tuin & Terras",
    slug: "tuin-terras",
    subs: [
      { name: "Tuinmeubelen", slug: "tuinmeubelen" },
      { name: "Gereedschap", slug: "tuingereedschap" },
      { name: "BBQ & Buitenkeuken", slug: "bbq" },
      { name: "Zwembad & Wellness", slug: "zwembad" },
    ],
  },
  {
    name: "Elektronica, TV & Audio",
    slug: "elektronica",
    subs: [
      { name: "Televisies", slug: "tv" },
      { name: "Audio & HiFi", slug: "audio-hifi" },
      { name: "Koptelefoons", slug: "headphones" },
      { name: "Camera's", slug: "cameras" },
    ],
  },
  {
    name: "Computers & Software",
    slug: "computers",
    subs: [
      { name: "Laptops", slug: "laptops" },
      { name: "Desktops", slug: "desktops" },
      { name: "Randapparatuur", slug: "randapparatuur" },
      { name: "Componenten", slug: "componenten" },
    ],
  },
  {
    name: "Telefoons & Tablets",
    slug: "phones-tablets",
    subs: [
      { name: "Smartphones", slug: "smartphones" },
      { name: "Tablets", slug: "tablets" },
      { name: "Accessoires", slug: "phone-accessoires" },
    ],
  },
  {
    name: "Kleding & Accessoires",
    slug: "kleding",
    subs: [
      { name: "Dames", slug: "dames" },
      { name: "Heren", slug: "heren" },
      { name: "Schoenen", slug: "schoenen" },
      { name: "Tassen & Juwelen", slug: "tassen-juwelen" },
    ],
  },
  {
    name: "Kinderen & Baby's",
    slug: "kinderen-baby",
    subs: [
      { name: "Kinderkleding", slug: "kinderkleding" },
      { name: "Kinderwagens", slug: "kinderwagens" },
      { name: "Speelgoed", slug: "speelgoed" },
    ],
  },
  {
    name: "Sport & Fitness",
    slug: "sport-fitness",
    subs: [
      { name: "Fitnessapparatuur", slug: "fitnessapparatuur" },
      { name: "Fietsen", slug: "fietsen" },
      { name: "Teamsport", slug: "teamsport" },
      { name: "Buiten & Hiking", slug: "buiten-hiking" },
    ],
  },
  {
    name: "Hobby's & Vrije tijd",
    slug: "hobbys",
    subs: [
      { name: "Modelbouw", slug: "modelbouw" },
      { name: "Verzamelen", slug: "verzamelen" },
      { name: "Creatief & Handwerk", slug: "handwerk" },
    ],
  },
  {
    name: "Muziek, Boeken & Films",
    slug: "muziek-boeken-films",
    subs: [
      { name: "Boeken", slug: "boeken" },
      { name: "Muziekinstrumenten", slug: "muziekinstrumenten" },
      { name: "LP's & CD's", slug: "lp-cd" },
      { name: "Films", slug: "films" },
    ],
  },
  {
    name: "Games & Consoles",
    slug: "games",
    subs: [
      { name: "Consoles", slug: "consoles" },
      { name: "Games", slug: "games" },
      { name: "Accessoires", slug: "game-accessoires" },
    ],
  },
  {
    name: "Dieren & Toebehoren",
    slug: "dieren",
    subs: [
      { name: "Honden & Katten", slug: "honden-katten" },
      { name: "Vogels & Knaagdieren", slug: "vogels-knaagdieren" },
      { name: "Verzorging & Benodigdheden", slug: "verzorging" },
    ],
  },
  {
    name: "Doe-het-zelf & Bouw",
    slug: "bouw",
    subs: [
      { name: "Bouwmaterialen", slug: "bouwmaterialen" },
      { name: "Gereedschap", slug: "gereedschap" },
      { name: "Sanitair & Keuken", slug: "sanitair-keuken" },
    ],
  },
  {
    name: "Caravans, Campers & Boten",
    slug: "caravans-boten",
    subs: [
      { name: "Caravans & Campers", slug: "caravans-campers" },
      { name: "Boten & Watersport", slug: "boten" },
      { name: "Onderdelen & Accessoires", slug: "onderdelen-accessoires" },
    ],
  },
  {
    name: "Tickets & Evenementen",
    slug: "tickets",
    subs: [
      { name: "Concerten", slug: "concerten" },
      { name: "Pretparken", slug: "pretparken" },
      { name: "Sportevenementen", slug: "sportevenementen" },
    ],
  },
  {
    name: "Diensten & Vakmensen",
    slug: "diensten",
    subs: [
      { name: "Herstellingen", slug: "herstellingen" },
      { name: "Verhuis & Transport", slug: "verhuis-transport" },
      { name: "Tuinonderhoud", slug: "tuinonderhoud" },
    ],
  },
  {
    name: "Huizen & Immo",
    slug: "immo",
    subs: [
      { name: "Te koop", slug: "te-koop" },
      { name: "Te huur", slug: "te-huur" },
      { name: "Vakantieverhuur", slug: "vakantie" },
    ],
  },
  {
    name: "Gratis af te halen",
    slug: "gratis",
    subs: [{ name: "Alles gratis", slug: "alles-gratis" }],
  },
];
