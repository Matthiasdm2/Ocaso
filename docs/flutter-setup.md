# Flutter gebruiken in deze repo (macOS + Next.js)

Deze handleiding beschrijft praktische manieren om Flutter toe te voegen aan deze Next.js-monorepo, plus een korte set-up op macOS.

## Opties om Flutter te gebruiken

1) Losse mobiele app (aanbevolen)
- Doel: iOS/Android app naast je Next.js web.
- Structuur: `apps/mobile/` in deze repo (monorepo), of in een aparte repo.
- Voordelen: duidelijke scheiding, volledige Flutter-mogelijkheden (push, camera, native UI).
- Nadelen: losse codebasis t.o.v. web, maar wel overzichtelijk.

2) Flutter Web in Next.js insluiten
- Doel: Flutter-app als webbuild (HTML/JS/CSS) serveren via Next.
- Werkwijze: bouw Flutter Web en plaats de build in `public/flutter/`, embed via `<iframe>` of link naar `/flutter/`.
- Voordelen: snel te integreren, host je Flutter Web naast je Next.js site.
- Nadelen: twee frontend stacks, let op bundlegrootte en SEO (Flutter Web is client-side rendered).

3) Gescheiden deployment (subdomein)
- Doel: Flutter Web op bijv. `app.jouwdomein.tld`, Next.js op `www.jouwdomein.tld`.
- Voordelen: deploys en caching gescheiden, minder koppelwerk.
- Nadelen: aparte hosting/CI/CD.

Kies 1 voor een volwaardige mobiele app; kies 2 of 3 als je een specifieke Flutter-ervaring in de webapp wil tonen.

---

## macOS installatie (Flutter + toolchains)

1) Flutter SDK
- Homebrew (snelste):
  - `brew install --cask flutter`
- Of handmatig: download van flutter.dev en voeg `flutter/bin` toe aan PATH.

2) Xcode (iOS)
- Installeer Xcode via App Store.
- Open Xcode één keer, accepteer licenties.
- `sudo xcode-select --switch /Applications/Xcode.app` (als nodig)
- `sudo xcodebuild -license` (accepteren)

3) Android (Android Studio)
- Installeer Android Studio + Android SDK + Platform Tools.
- Start Android Studio, installeer aanbevolen componenten.
- In terminal: `flutter doctor --android-licenses` en accepteer alles.

4) CocoaPods
- `sudo gem install cocoapods`

5) Controle
- `flutter doctor` moet vrijwel groen zijn (eventuele waarschuwingen oplossen).

---

## Project aanmaken (aanbevolen structuur)

- In deze repo: `apps/mobile` voor iOS/Android en (optioneel) web.
- Voorbeeld:
  - `flutter create --org com.jouworg apps/mobile`
  - Schakel web in (optioneel): `flutter config --enable-web`

Run lokaal:
- iOS simulator of Android emulator: `flutter run`
- Web (optioneel): `flutter run -d chrome`

Ignoreren (maak een `.gitignore` in `apps/mobile` indien nodig):
- `.dart_tool/`, `build/`, `.flutter-plugins`, `.flutter-plugins-dependencies`, `.packages`, `pubspec.lock` (optioneel voor lib-packages), `ios/Pods/`, `android/.gradle/`.

---

## Flutter Web integreren in Next.js (optie 2)

1) Zorg dat web aan staat:
- `flutter config --enable-web`

2) Build Flutter Web met base path
- `flutter build web --release --base-href /flutter/ --pwa-strategy=none`
  - `--base-href /flutter/` is belangrijk als je het onder `/public/flutter/` serveert.
  - `--pwa-strategy=none` voorkomt service worker conflicts met Next.

3) Kopieer de web-build naar Next public
- Kopieer `build/web/` naar `public/flutter/`.
  - Resultaat: `public/flutter/index.html`, `public/flutter/assets/`, etc.

4) Embed in Next.js
- Simpel via iframe, maak bijv. een pagina `app/flutter/page.tsx` die een iframe toont:

  - Iframe src: `/flutter/index.html`
  - Zorg dat de pagina full-height kan tonen (CSS) indien gewenst.

5) Deploy
- De Flutter-bestanden staan in `public/` en worden automatisch door Next.js geserveerd. URL: `/flutter/`.

Tips
- Houd de Flutter build uit Git door een kopie-stap in je CI/CD te doen.
- Voeg een npm-script toe om te kopiëren (optioneel), of gebruik een simpele shell copy.

---

## Gescheiden deployment (optie 3)

- Host Flutter Web (bijv. op S3/CloudFront of Vercel/Netlify), en link ernaartoe vanuit Next.js.
- Voordeel: Next.js bundle blijft klein; onafhankelijke caching en rollbacks.

--- 

## Snelle keuzes

- Alleen mobiele app nodig? -> Optie 1 (apps/mobile).
- Web-widget/ervaring in bestaande site? -> Optie 2 (public/flutter + iframe).
- Maximale scheiding en performance? -> Optie 3 (subdomein).

---

## Veelvoorkomende issues

- Wit scherm in Flutter Web onder subpad: controleer `--base-href /flutter/` en dat assets onder `public/flutter/` staan.
- Service worker conflicten: gebruik `--pwa-strategy=none` of verwijder `flutter_service_worker.js` bij problemen.
- iOS build faalt om pods: run `cd ios && pod install`, of installeer CocoaPods opnieuw.
- `flutter doctor` toont Xcode- of Android-issues: volg de aanbevelingen en herstart IDE/terminal.

---

## Vervolgstappen

- Kies optie en maak de map: `apps/mobile` of `apps/flutter_web`.
- Zet `.gitignore` op de juiste plekken.
- (Optioneel) Voeg scripts toe in `package.json` om Flutter builds te kopiëren naar `public/flutter/` bij web-embed.

Heb je voorkeur (mobiel vs. web), dan kunnen we dit direct scaffolden in deze repo.
