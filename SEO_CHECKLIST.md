# SEO Optimization Checklist — PNG LNG Gas Tracker India

## ✅ Completed

### On-Page SEO
- [x] Dynamic meta tags (title, description, keywords)
- [x] Open Graph tags (og:title, og:description, og:image, og:locale)
- [x] Twitter Card meta tags (summary_large_image)
- [x] Canonical URL set to https://png-lng-gas-tracker.in.net/
- [x] Language tags (en-IN, en)
- [x] Theme color meta tag
- [x] Revisit-after tag
- [x] Google Site Verification placeholder
- [x] H1 tag with primary keywords
- [x] H2 tags for section hierarchy
- [x] Hidden SEO content (sr-only) with full description and keywords
- [x] Proper semantic HTML structure

### Technical SEO
- [x] robots.txt created
- [x] sitemap.xml created
- [x] JSON-LD Structured Data (WebApplication schema)
- [x] JSON-LD Structured Data (Dataset schema)
- [x] Mobile meta viewport tag
- [x] Charset meta tag (UTF-8)

### India-Specific SEO
- [x] geo:locality set to India
- [x] Keywords include India-centric terms (PNG, LNG, PNGRB, Petronet, etc.)
- [x] Terminal names included (Dahej, Hazira, Kochi, Dabhol, Ennore, Mundra)
- [x] IST timezone references in data display
- [x] Local company references (GAIL, MGL, IGL, ATGL)

### Content SEO
- [x] One data point per day in trend charts (no intra-day noise)
- [x] Clear, descriptive alt text for charts/images
- [x] Internal linking structure (tabs, sections)
- [x] Fresh content (real-time updates hourly)

---

## 🔄 TODO (Next Steps)

### High Priority
- [ ] Replace `add-your-google-verification-code` with actual Google Search Console verification code
  - Go to Google Search Console → Add/Verify Property → html tag → copy code
  
- [ ] Create og-image.png (1200x630px)
  - Should show PNG LNG Gas Tracker logo + key metrics
  - Use brand colors: orange (#f97316), red (#dc2626), purple (#7c3aed)

- [ ] Add backlinks from authoritative sources
  - PNGRB official website
  - Indian Ministry of Petroleum & Natural Gas
  - Energy news portals (ThinkGeoEnergy, LNG Journal)
  - Business news sites (ET, Business Standard, Mint)

### Medium Priority
- [ ] Configure Google Analytics 4 (GA4)
  - Track event: scroll depth, chart interactions, tab switches
  - Set up Goals: geopolitical alerts viewed, chart interactions

- [ ] Add Schema.org Organization data
  ```json
  {
    "@type": "Organization",
    "name": "PNG Gas Tracker India",
    "url": "https://png-lng-gas-tracker.in.net/",
    "logo": "https://png-lng-gas-tracker.in.net/logo.png",
    "description": "Real-time LNG supply monitoring for India"
  }
  ```

- [ ] Implement BreadcrumbList schema for navigation
  - Home > Dashboard > [Current Section]

- [ ] Add social media links
  - Twitter, LinkedIn profiles (if applicable)

- [ ] Create blog section (optional)
  - "LNG Supply Trends 2026"
  - "Impact of Strait of Hormuz on India's Energy"
  - "Understanding JKM vs Henry Hub Spreads"

### Low Priority
- [ ] Hreflang tags for Hindi translation (when available)
- [ ] AMP (Accelerated Mobile Pages) version
- [ ] Voice search optimization (FAQ schema)
- [ ] Video schema (if adding tutorial videos)

---

## 🎯 SEO Keywords (Target)

### Primary
- LNG India, PNG gas tracker, LNG supply India, natural gas India
- India LNG imports, LNG price India, LNG terminal India

### Secondary
- Petronet LNG, PNGRB, GAIL, Indian gas sector
- Strait of Hormuz, Red Sea shipping, LNG shipping
- Henry Hub price, JKM spot price

### Long-tail
- "Real-time LNG supply monitoring India"
- "India gas terminal reserves tracker"
- "LNG supply disruption risk India"
- "Geopolitical impact on India LNG"

---

## 📊 Performance Targets

- Core Web Vitals (Google PageSpeed Insights)
  - LCP: < 2.5s
  - FID: < 100ms
  - CLS: < 0.1
  
- Target Ranking: Page 1 of Google for "LNG India tracker"
- Monthly Organic Traffic Target: 5,000+ sessions
- CTR Target: 3-5% (depends on search volume)

---

## 🔍 Monitoring

### Tools to Use
1. **Google Search Console** - Monitor indexing, search appearance, mobile usability
2. **Google Analytics 4** - Track user behavior, conversions
3. **Ahrefs / SEMrush** - Monitor backlinks, keyword rankings
4. **PageSpeed Insights** - Monitor Core Web Vitals
5. **Lighthouse** - Audit accessibility, SEO, performance
6. **Screaming Frog** - Crawl site for SEO issues

### Monthly Metrics to Track
- Organic search traffic
- Keyword rankings (top 50 keywords)
- Backlink profile growth
- Bounce rate
- Average session duration
- Geopolitical alert click-through rate

---

## 📝 Notes

- Ensure all timestamps display in IST (India Standard Time)
- Keep terminal reserve data fresh (refetch every 5 minutes)
- Geopolitical events should be indexed for news search
- Consider adding "breaking news" schema when alerts go critical (risk > 80%)
