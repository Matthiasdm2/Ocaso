# VEHICLE CATEGORIES CANONICAL CONTRACT

**Date:** 31 December 2024  
**Status:** FROZEN CONTRACT - SINGLE SOURCE OF TRUTH  
**Authority:** Lead Software Developer + Database Engineer  
**Purpose:** Definitively establish vehicle categorization for OCASO Marketplace

---

## 🔒 FROZEN CONTRACT DECLARATION

This document establishes the **CANONICAL AND IMMUTABLE** vehicle categorization for OCASO Marketplace. These categories and brands are the **SINGLE SOURCE OF TRUTH** and are **AUDIT-PROOF** for investor and external developer review.

**MODIFICATION POLICY:** Any changes to this contract require:

1. Written approval from CTO
2. Full impact assessment
3. Migration strategy with rollback plan
4. Updated verification scripts

---

## 🚗 CANONICAL VEHICLE CATEGORIES

### 1. AUTO & MOTOR (EXACT 45 BRANDS)

**Slug:** `auto-motor`  
**Type:** Personenwagens (consumer vehicles)  
**Icon:** car.svg  
**Sort Order:** 3

**Brands (45):**

1. Abarth
2. Alfa Romeo
3. Audi
4. BMW
5. BYD
6. Citroën
7. Cupra
8. Dacia
9. DS Automobiles
10. Fiat
11. Ford
12. Genesis
13. Honda
14. Hyundai
15. Jaguar
16. Jeep
17. Kia
18. Land Rover
19. Lexus
20. Lynk & Co
21. Mazda
22. Mercedes-Benz
23. MG
24. MINI
25. Mitsubishi
26. Nissan
27. Opel
28. Peugeot
29. Polestar
30. Porsche
31. Renault
32. SEAT
33. Škoda
34. Smart
35. Subaru
36. Suzuki
37. Tesla
38. Toyota
39. Volkswagen
40. Volvo
41. Aiways
42. Leapmotor
43. NIO
44. Ora
45. XPeng

### 2. BEDRIJFSWAGENS (EXACT 25 BRANDS)

**Slug:** `bedrijfswagens`  
**Type:** Commercial vehicles  
**Icon:** truck.svg  
**Sort Order:** 9

**Brands (25):**

1. BYD Commercial
2. Citroën Professional
3. DAF
4. Fiat Professional
5. Ford Commercial
6. Hyundai Commercial
7. Isuzu
8. Iveco
9. MAN
10. Maxus
11. Mercedes-Benz Commercial
12. Mitsubishi Fuso
13. Nissan Commercial
14. Opel Commercial
15. Peugeot Professional
16. Piaggio Commercial
17. RAM
18. Renault Commercial
19. Scania
20. SsangYong
21. Tata
22. Toyota Commercial
23. Volkswagen Commercial
24. Volvo Trucks
25. Vauxhall

### 3. MOTOREN (EXACT 25 BRANDS)

**Slug:** `motoren`  
**Type:** Motorcycles  
**Icon:** motorbike.svg  
**Sort Order:** 11

**Brands (25):**

1. Aprilia
2. Benelli
3. BMW Motorrad
4. CFMOTO
5. Ducati
6. GasGas
7. Harley-Davidson
8. Honda Motorcycles
9. Husqvarna
10. Indian
11. Kawasaki
12. KTM
13. Kymco
14. Moto Guzzi
15. MV Agusta
16. Peugeot Motocycles
17. Piaggio Motorcycles
18. Royal Enfield
19. Suzuki Motorcycles
20. Sym
21. Triumph
22. Vespa
23. Yamaha
24. Zero Motorcycles
25. Zontes

### 4. CAMPER & MOBILHOMES (EXACT 25 BRANDS)

**Slug:** `camper-mobilhomes`  
**Type:** Recreational vehicles  
**Icon:** caravan.svg  
**Sort Order:** 10

**Brands (25):**

1. Adria
2. Bailey
3. Bürstner
4. Carado
5. Carthago
6. Challenger
7. Dethleffs
8. Elddis
9. Fendt
10. Hobby
11. Hymer
12. Knaus
13. Laika
14. Lunar
15. McLouis
16. Pilote
17. Rapido
18. Roller Team
19. Sunlight
20. Swift
21. Tabbert
22. Trigano
23. Weinsberg
24. Westfalia
25. XGO

---

## 📊 CANONICAL STATISTICS

- **Total Vehicle Categories:** 4
- **Total Vehicle Brands:** 120 (45 + 25 + 25 + 25)
- **Auto & Motor:** 45 brands (consumer focus)
- **Other Categories:** 25 brands each (specialized focus)

---

## 🏗️ ARCHITECTURAL DECISIONS

### TECHNICAL IMPLEMENTATION:

- **Categories:** Standard `categories` table with vehicle-specific entries
- **Brands:** Implemented as `subcategories` with category_id mapping
- **Filtering:** Brands function as filter layer within vehicle categories
- **Slugs:** Lowercase, kebab-case, stable identifiers

### FUNCTIONAL SCOPE:

- **IN SCOPE:** Vehicle brands as marketplace filters
- **OUT OF SCOPE:** Functional subcategories (SUV, electric, diesel, etc.)
- **RATIONALE:** Brands provide sufficient granularity for marketplace filtering

### DATA INTEGRITY:

- **Uniqueness:** No brand appears in multiple vehicle categories
- **Completeness:** Exact brand counts enforced
- **Stability:** Slugs are immutable once established

---

## 🔍 VERIFICATION CONTRACT

### MANDATORY CHECKS:

1. **Existence:** All 4 categories exist and are active
2. **Brand Counts:** Exact counts (45, 25, 25, 25) enforced
3. **Uniqueness:** No duplicate brand slugs within categories
4. **Exclusivity:** No brand in multiple vehicle categories
5. **Icons:** All categories have valid icon URLs
6. **Total:** Exactly 120 vehicle brands across all categories

### VERIFICATION SCRIPT:

```bash
node scripts/verify-vehicle-categories.mjs
```

**Exit Code 0:** Contract compliance ✅  
**Exit Code 1:** Contract violation ❌

---

## 📁 IMPLEMENTATION FILES

### MIGRATION:

- `supabase/migrations/20241231150000_canonical_vehicle_categories.sql`

### SETUP SCRIPTS:

- `scripts/setup-canonical-vehicles.mjs`

### VERIFICATION:

- `scripts/verify-vehicle-categories.mjs`

---

## 🎯 BUSINESS RATIONALE

### INVESTOR PRESENTATION:

"This marketplace has professionally categorized its vehicle inventory with:

- 4 distinct vehicle categories covering all market segments
- 120 carefully curated brands across automotive spectrum
- Audit-proof data structure with automated compliance verification
- Single source of truth eliminating data inconsistencies"

### DEVELOPER ONBOARDING:

External developers see immediately:

- Clear, documented categorization contract
- Automated verification ensuring data integrity
- Stable API contracts for marketplace integration
- Professional-grade data architecture

### SCALABILITY:

- Each category supports marketplace filtering
- Brand-based filtering provides granular search capability
- Structure supports future expansion within established patterns
- Maintains clean separation of concerns

---

## ✅ COMPLIANCE CERTIFICATION

**Lead Software Developer Certification:**
I certify that the vehicle categorization described in this document:

- ✅ Has been implemented in production database
- ✅ Passes all automated verification tests
- ✅ Maintains data integrity and uniqueness constraints
- ✅ Provides stable API contracts for frontend consumption
- ✅ Is ready for external developer and investor review

**Date:** 31 December 2024  
**Signature:** Database Engineer - OCASO Marketplace  
**Status:** PRODUCTION READY ✅

---

## 🚨 MODIFICATION WARNING

**⚠️ CRITICAL:** This is a FROZEN CONTRACT. Any modifications to vehicle categories or brands must follow the established modification policy. Unauthorized changes may:

- Break marketplace filtering functionality
- Cause data integrity violations
- Fail automated verification checks
- Impact user experience and business metrics

**Contact CTO before making any changes to this contract.**
