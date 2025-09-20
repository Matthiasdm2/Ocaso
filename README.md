# OCASO — Frontend MVP (Next.js 14 + App Router + Tailwind)

Dit is een **compileerbare** starterskit die je wensen bundelt:

- Header-zoekbalk verschijnt **pas bij scroll** (sticky).
- 40 categorieën in 2 rijen met pijlen en **verborgen scrollbalk**.
- Gesponsorde zoekertjes bovenaan, aanbevolen sectie.
- Detailpagina met **biedings- en verzendopties** en affiliate-ruimte.
- **Zoekertje plaatsen** met AI-mock (titel/omschrijving/prijs), foto-uploader, sliders, verzendcontrole (mock Sendcloud check).
- **Profielpagina** met statistieken en actieve zoekertjes.
- **Bedrijfspagina** (abonnement €75/maand) als mini-shop.
- **API routes** leveren mockdata en vormen duidelijke scheiding voor latere backend/Supabase-integratie.

## Snel starten

```bash
npm install
npm run dev
# open http://localhost:3000
```

> Tip: Zet `NEXT_PUBLIC_BASE_URL=http://localhost:3000` in `.env.local` voor fetches naar de mock API.

## Structuur

- `app/` App Router pagina's en API mock routes.
- `components/` UI-componenten.
- `lib/` types en toekomstige client (Supabase placeholder).
- `public/` assets.
- Tailwind vooraf geconfigureerd met OCASO-kleuren.

## Volgende integraties (hooks voorzien)

- Vervang `app/api/*` door echte backend endpoints of Supabase Edge Functions.
- Vul `lib/supabaseClient.ts` met je Supabase connectie.
- AI: koppel je endpoints voor fotomatch, prijsvoorstel en vertaling in `sell/page.tsx`.

Veel succes! ✨

## Extra routes

/over, /help, /safety, /contact, /terms, /privacy, /cookies, /categories, /explore, /sponsored, /recent, /search, /login, /business

# Ocaso-portaal

## Zoeken (search bars)

Status huidige implementatie:

- `HeroSearch` en `StickySearch` sturen bij submit naar `/search?q=<term>`.
- Hero suggesties (mock array) navigeren direct naar de zoekresultaten.
- Search page leest nu zowel `q`, `catId`, `subId` als legacy `cat`, `sub` en roept `/api/search` aan.
- API (`app/api/search/route.ts`) retourneert `{ items, page, limit, total }`.
- Eenvoudige categorie-herkenning: zoektermen zoals "fiets", "mountainbike", "e-bike" tonen alle listings in relevante fiets-categorieën (zonder titel filter).
- Uitgebreide synoniemen (racefiets/koersfiets/mtb/e-bike) worden als extra OR-termen toegevoegd zodat gerelateerde zoekertjes verschijnen.

Toekomstige verbeteringen (suggesties):

1. Debounced live zoeken (router.replace) i.p.v. submit.
2. Supabase full-text of trigram index voor relevantere resultaten.
3. Server-side suggesties i.p.v. mock lijst.
4. Caching layer / ISR voor populaire queries.
5. Recent/gepopulariseerde zoekopdrachten (localStorage + server aggregatie).
6. Foto-zoek koppelen aan vision endpoint en mapping naar query.
