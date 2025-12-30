# SEO_SETUP.md

## SEO Setup voor OCASO Platform

### Sitemap Configuration
- **File**: `/v4/app/sitemap.ts`
- **URL**: `https://ocaso.be/sitemap.xml`
- **Content**:
  - Homepage (priority 1.0, daily updates)
  - Marketplace (priority 0.9, hourly updates)
  - Static pages: About, Contact, Help, Privacy, Terms, Safety
- **Dynamic URLs**: Listings worden niet opgenomen (noindex)

### Robots.txt Configuration
- **File**: `/v4/app/robots.ts`
- **URL**: `https://ocaso.be/robots.txt`
- **Rules**:
  - Allow all crawlers on public content
  - Disallow: /admin/, /api/, /auth/, /checkout/, /seller/
  - Sitemap reference included

### Meta Tags & OpenGraph
- **Implementation**: Root layout metadata
- **OpenGraph Tags**:
  - og:title: "OCASO - Online Marketplace"
  - og:description: "C2C & B2C marketplace voor tweedehands en professionele verkoop"
  - og:url: "https://ocaso.be"
  - og:site_name: "OCASO"
  - og:image: "https://ocaso.be/og-image.jpg"
  - og:locale: "nl_BE"
  - og:type: "website"
- **Twitter Cards**: Summary large image variant

### Canonical URLs
- **Implementation**: Automatic via Next.js App Router
- **Pattern**: All routes have canonical URLs
- **Cross-domain**: No cross-domain canonicals needed

### 404 & 410 Pages
- **404 Page**: `/v4/app/not-found.tsx`
  - User-friendly error page
  - Navigation options to marketplace/home
  - Proper HTTP 404 status
- **410 Page**: Not implemented (no permanent deletions)

### Technical SEO
- **Page Speed**: Next.js optimization, image optimization
- **Mobile-Friendly**: Responsive design via Tailwind
- **HTTPS**: Enforced via security headers
- **Structured Data**: Not implemented (future enhancement)
- **Hreflang**: Not needed (Dutch-only site)

### Content SEO
- **Title Tags**: Descriptive, keyword-rich titles
- **Meta Descriptions**: Compelling descriptions under 160 chars
- **Heading Structure**: Proper H1-H6 hierarchy
- **Alt Text**: Images have descriptive alt attributes
- **Internal Linking**: Logical site structure

### Indexability
- **Public Pages**: All public content is indexable
- **Private Pages**: Admin/seller areas blocked via robots.txt
- **Noindex Tags**: Not used (rely on robots.txt)
- **Dynamic Content**: Listings not indexed (performance choice)

### SEO Monitoring
- **Google Search Console**: Setup required
  - Sitemap submission
  - Index coverage monitoring
  - Search performance tracking
  - Mobile usability reports
- **Core Web Vitals**: Monitor via Search Console
- **Ranking Tracking**: Manual monitoring for key terms

### Local SEO (Future)
- **Google My Business**: Setup for physical locations
- **Local Schema Markup**: For business listings
- **Local Citations**: Consistent NAP (Name, Address, Phone)

### International SEO
- **Language**: Dutch (nl)
- **Region**: Belgium (BE)
- **Hreflang**: Not needed (single language/region)
- **Currency**: Euro (€) - correct for Belgian market

### SEO Tools & Resources
- **Primary Tools**:
  - Google Search Console
  - Google Analytics
  - Screaming Frog SEO Spider
  - GTmetrix (performance)
- **Keyword Research**: Google Keyword Planner, SEMrush
- **Competitor Analysis**: Similar Belgian marketplaces

### SEO Checklist
- [x] Sitemap.xml generated and accessible
- [x] Robots.txt configured and accessible
- [x] OpenGraph tags implemented
- [x] Twitter Card tags implemented
- [x] Canonical URLs automatic
- [x] 404 page user-friendly
- [x] HTTPS enforced
- [x] Mobile-responsive design
- [x] Fast loading times
- [x] Descriptive title tags
- [x] Compelling meta descriptions
- [x] Proper heading structure
- [x] Image alt text
- [x] Internal linking structure

### Performance Optimization
- **Core Web Vitals**:
  - Largest Contentful Paint (LCP): <2.5s
  - First Input Delay (FID): <100ms
  - Cumulative Layout Shift (CLS): <0.1
- **Next.js Optimizations**:
  - Automatic image optimization
  - Font optimization
  - Script optimization
  - CSS optimization

### Future SEO Enhancements
- **Structured Data**: Product schema for listings
- **Video SEO**: For product videos
- **Voice Search**: Long-tail keyword optimization
- **Local SEO**: Google My Business integration
- **E-commerce SEO**: Product feed optimization

### SEO Maintenance
- **Monthly Tasks**:
  - Check Google Search Console for issues
  - Monitor Core Web Vitals
  - Update sitemap for new pages
  - Review and update meta tags
- **Quarterly Tasks**:
  - Keyword performance review
  - Competitor analysis
  - Technical SEO audit
  - Content optimization

### Contact
Voor SEO gerelateerde vragen: seo@ocaso.be
