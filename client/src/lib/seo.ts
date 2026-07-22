// SEO helper for the BlackQuill landing route. Injects document title, meta
// tags (description, canonical, robots, Open Graph, Twitter) and JSON-LD
// structured data, and returns a teardown that removes them again — so the
// tags stay scoped to this route and don't leak into the rest of the app.
//
// NOTE: this is client-side injection. Google renders JS and will see it, but
// for guaranteed crawler coverage a marketing site should be server-rendered
// or prerendered. Replace the placeholder URLs / NAP / social links below with
// real values before going live.

const SITE = 'https://blackquill.in';
const PAGE_URL = `${SITE}/`;
const OG_IMAGE = `${SITE}/og-cover.png`;
const CONTACT_EMAIL = 'abhishek@blackquill.in';

export interface LandingFaq {
  q: string;
  a: string;
}

export const LANDING_FAQ: LandingFaq[] = [
  {
    q: 'How much does a custom website cost?',
    a: 'Our plans start at $490 for a polished one-page launch site and scale to full multi-page platforms. Every project gets a fixed-price quote after a free discovery call, so there are no surprises.',
  },
  {
    q: 'How long does it take to build a website?',
    a: 'A single-page site typically launches in about two weeks. Larger sites depend on scope, but you see a live preview from week one and steer every revision.',
  },
  {
    q: 'Do you handle SEO and performance?',
    a: 'Yes. Every site ships hand-tuned for Core Web Vitals, mobile-first, with clean semantic markup and on-page SEO built in — most load in under a second.',
  },
  {
    q: 'Can I edit the site myself after launch?',
    a: 'Absolutely. We hand over a CMS you can edit yourself, run a training session, and stay on call for ongoing support as your business grows.',
  },
];

function meta(attr: 'name' | 'property', key: string, content: string): HTMLMetaElement {
  const el = document.createElement('meta');
  el.setAttribute(attr, key);
  el.setAttribute('content', content);
  return el;
}

export function applyLandingSeo(): () => void {
  const title = 'BlackQuill — Custom Website Design & Development Studio';
  const description =
    'BlackQuill is a web design studio building fast, SEO-ready, high-converting websites for startups, SMEs, and enterprises. Book your free consultation today.';

  const prevTitle = document.title;
  document.title = title;

  const nodes: Element[] = [];
  const add = (el: Element) => { el.setAttribute('data-bq-seo', ''); document.head.appendChild(el); nodes.push(el); };

  const canonical = document.createElement('link');
  canonical.rel = 'canonical';
  canonical.href = PAGE_URL;
  add(canonical);

  add(meta('name', 'description', description));
  add(meta('name', 'robots', 'index, follow, max-image-preview:large'));
  add(meta('name', 'theme-color', '#EC4E02'));

  // Open Graph
  add(meta('property', 'og:type', 'website'));
  add(meta('property', 'og:site_name', 'BlackQuill'));
  add(meta('property', 'og:title', title));
  add(meta('property', 'og:description', description));
  add(meta('property', 'og:url', PAGE_URL));
  add(meta('property', 'og:image', OG_IMAGE));

  // Twitter
  add(meta('name', 'twitter:card', 'summary_large_image'));
  add(meta('name', 'twitter:title', title));
  add(meta('name', 'twitter:description', description));
  add(meta('name', 'twitter:image', OG_IMAGE));

  // JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE}/#organization`,
        name: 'BlackQuill',
        url: SITE,
        description,
        logo: `${SITE}/logo.png`,
        email: CONTACT_EMAIL,
        contactPoint: {
          '@type': 'ContactPoint',
          email: CONTACT_EMAIL,
          contactType: 'customer support',
        },
        sameAs: [
          'https://x.com/BlackQuillin',
          'https://www.instagram.com/blackquill.in',
          'https://www.facebook.com/profile.php?id=61592221862115',
          'https://github.com/abhishekkorwan8-a11y',
        ],
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE}/#website`,
        url: SITE,
        name: 'BlackQuill',
        publisher: { '@id': `${SITE}/#organization` },
      },
      {
        '@type': 'WebPage',
        '@id': `${PAGE_URL}#webpage`,
        url: PAGE_URL,
        name: title,
        description,
        isPartOf: { '@id': `${SITE}/#website` },
        about: { '@id': `${SITE}/#organization` },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
          { '@type': 'ListItem', position: 2, name: 'Web Design', item: PAGE_URL },
        ],
      },
      {
        '@type': 'Service',
        serviceType: 'Website design and development',
        provider: { '@id': `${SITE}/#organization` },
        areaServed: 'Worldwide',
        offers: [
          { '@type': 'Offer', name: 'Launch', price: '490', priceCurrency: 'USD' },
          { '@type': 'Offer', name: 'Studio', price: '990', priceCurrency: 'USD' },
          { '@type': 'Offer', name: 'Partner', price: '2400', priceCurrency: 'USD' },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: LANDING_FAQ.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
    ],
  };
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(jsonLd);
  add(script);

  return () => {
    document.title = prevTitle;
    nodes.forEach((n) => n.remove());
  };
}
