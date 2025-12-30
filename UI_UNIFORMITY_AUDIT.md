# UI_UNIFORMITY_AUDIT.md

## UI Uniformity Audit OCASO Portal

### Design System
- **CSS Framework**: Tailwind CSS voor utility-first styling (volgens SYSTEM_MANIFEST.md verplicht).
- **Icons**: Lucide React icons consistent gebruikt in veel componenten.
- **Animations**: Framer Motion voor motion effects in sommige pagina's (bijv. about, contact).
- **Color Scheme**: Gebaseerd op Tailwind defaults met custom OCASO groen (primary), neutrals voor backgrounds.
- **Typography**: Systeem fonts (vermoedelijk Inter of standaard), headings met font-semibold, body text neutral-700/900.

### Component Consistency
- **Buttons**: Verschillende stijlen (primary bg-primary, secondary border, etc.), maar inconsistent gebruik - sommige componenten hebben eigen button styling.
- **Forms**: Field component gebruikt in veel plaatsen, maar niet overal consistent (bijv. input styling varieert).
- **Modals**: ConfirmModal, EditListingModal, CreditsModal, etc., styling varieert (sommige met rounded-xl, andere rounded-2xl).
- **Cards**: ListingCard consistent, maar andere cards (bijv. in about, safety) hebben verschillende border-radius en padding.
- **Navigation**: Header en Footer consistent, mobile menu via MobileFooter, maar responsive gedrag kan variëren.

### Responsive Design
- **Breakpoints**: Gebruikt Tailwind's sm:, md:, lg: breakpoints consistent.
- **Mobile First**: Ja, grid-cols-2 sm:grid-cols-3 md:grid-cols-4 etc., maar sommige componenten kunnen desktop-first zijn (bijv. grote modals).
- **Mobile Footer**: MobileFooter component voor bottom navigation.
- **Touch Targets**: 44px minimum in sommige plaatsen, maar niet consistent gecontroleerd.

### Accessibility
- **ARIA Labels**: Niet consistent - sommige buttons missen aria-label, forms missen labels.
- **Keyboard Navigation**: Niet gecontroleerd - focus states zichtbaar maar niet getest.
- **Color Contrast**: Niet gecontroleerd - primary op white waarschijnlijk ok, maar andere combinaties niet gecheckt.
- **Screen Readers**: Geen zichtbare aria-describedby of role attributes.

### Issues Found
- Inconsistent spacing tussen componenten (sommige py-4, andere py-6).
- Verschillende button stijlen zonder centrale definitie (geen shadcn/ui geïmplementeerd).
- Sommige componenten missen loading states (bijv. geen skeletons bij data fetching).
- Dark mode niet geïmplementeerd.
- Inconsistent use of motion.div vs gewone divs.
- Border radius varieert (rounded-xl vs rounded-2xl).
- Padding en margins niet gestandaardiseerd.
- Error handling UI inconsistent (sommige plaatsen alert(), andere custom modals).
- Loading states ontbreken in veel async operaties.

### Recommendations
- Implementeer shadcn/ui + Radix UI als verplicht (volgens SYSTEM_MANIFEST.md).
- Creëer design tokens systeem met CVA + clsx + tailwind-merge.
- Gebruik centrale componenten voor buttons, forms, modals, cards.
- Implementeer consistent error handling UI en loading skeletons.
- Voeg dark mode support toe.
- Voer accessibility audit uit en fix ARIA issues.
- Standaardiseer spacing, border-radius, en typography.
- Gebruik design system voor alle nieuwe componenten in /v4.</content>
<parameter name="filePath">/Users/matthiasdemey/Desktop/Ocasso /Ocasso  back up/Ocaso Rewrite/UI_UNIFORMITY_AUDIT.md
