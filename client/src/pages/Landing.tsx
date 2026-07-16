import { useEffect, useRef, useState, MouseEvent as ReactMouseEvent, CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { registerDitherShader } from '../lib/ditherShader';
import { initCursor, initPreloader } from '../lib/pageFx';
import './Landing.css';

// Allow the <dither-shader> custom element in JSX (declared once, project-wide).
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'dither-shader': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        color?: string;
        speed?: string | number;
        pixel?: string | number;
        shape?: string;
        'hover-boost'?: string | number;
      };
    }
  }
}

const ACCENT = '#EC4E02';
const SHADER_SPEED = 0.4;
const DITHER_PIXEL = 2;

const NAV_ITEMS = [
  { name: 'Features', url: '#features' },
  { name: 'How it works', url: '#how' },
  { name: 'Work', url: '#work' },
  { name: 'Pricing', url: '#pricing' },
];

const FEATURES = [
  { icon: 'M12 20h9M16.7 3.3a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.7 3.3z', title: 'Design that fits', body: 'No templates. We study your brand — its voice, colors, and customers — and design a site that could only belong to you.' },
  { icon: 'M12 3l1.9 5.7 5.8 1.9-5.8 1.9L12 18.2l-1.9-5.7-5.8-1.9 5.8-1.9L12 3zM19 14.5l1 2.7 2.7 1-2.7 1-1 2.7-1-2.7-2.7-1 2.7-1 1-2.7z', title: 'Fast by default', body: 'Hand-tuned code, no bloat. Every site we ship scores green on Core Web Vitals and loads in under a second.' },
  { icon: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6', title: 'Grows with you', body: 'From launch page to full platform — CMS, e-commerce, integrations — without ever starting over.' },
];

const STEPS = [
  { num: '01', title: 'Tell us what you need', body: 'Start with a free discovery call or a short brief. Share your goals, sketches, sites you admire, and everything your customers should feel — rough notes are more than enough.', tags: ['Free discovery call', 'Written brief', 'Reference sites'] },
  { num: '02', title: 'We shape it into a plan', body: 'Within days you get a fixed-price proposal: sitemap, timeline, and early design directions built around your requirements. Nothing proceeds until you approve.', tags: ['Fixed-price quote', 'Sitemap & timeline', 'Design directions'] },
  { num: '03', title: 'We build, you steer', body: 'You see a live preview from week one and comment directly on it. Every revision follows your feedback — the site converges on your vision, not our template.', tags: ['Weekly live previews', 'Unlimited revisions', 'Direct feedback'] },
  { num: '04', title: 'Launch and beyond', body: 'We ship, hand over a CMS you can edit yourself, and stay on call. As your business grows, the site grows with it.', tags: ['CMS handover', 'Training session', 'Ongoing support'] },
];

// Portfolio pieces shown in the "Our Work" section. Each `file` is a full
// standalone template served from /public/work and opened in a new tab.
const WORK = [
  { file: '/work/taxfolio.html', title: 'Taxfolio', industry: 'Tax planning platform', badge: 'Web design' },
  { file: '/work/orbithr.html', title: 'orbitHR', industry: 'HR SaaS product', badge: 'Web app' },
  { file: '/work/plinth.html', title: 'PLINTH', industry: 'Furniture brand', badge: 'E-commerce' },
];

// ── Footer destinations ───────────────────────────────────────────────────
// Replace the placeholder URLs below with your real profiles / pages.
const SOCIAL_LINKS = {
  x: 'https://x.com/your-handle',
  linkedin: 'https://linkedin.com/company/your-company',
  instagram: 'https://instagram.com/your-handle',
  github: 'https://github.com/your-org',
};
const COMPANY_LINKS = [
  { label: 'About Us', href: '#how' },
  { label: 'Careers', href: '#cta' },
  { label: 'Blog', href: '#top' },
  { label: 'Contact', href: '#cta' },
];
const WORK_LINKS = [
  { label: 'Services', href: '#features' },
  { label: 'Portfolio', href: '#work' },
  { label: 'Industries', href: '#industries' },
  { label: 'Pricing', href: '#pricing' },
];
const LEGAL_LINKS = [
  { label: 'Privacy Policy', href: '#top' },
  { label: 'Terms & Conditions', href: '#top' },
];

// A live, scaled-down thumbnail of a full HTML template. The iframe renders at
// a fixed design width and is scaled to fit its card via a ResizeObserver.
const PREVIEW_DESIGN_W = 1280;
function WorkPreview({ src, title }: { src: string; title: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.33);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / PREVIEW_DESIGN_W);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div className="bl-work-frame" ref={wrapRef}>
      <iframe
        className="bl-work-iframe"
        src={src}
        title={title}
        loading="lazy"
        scrolling="no"
        tabIndex={-1}
        aria-hidden="true"
        style={{ width: PREVIEW_DESIGN_W, height: PREVIEW_DESIGN_W * 10 / 16, transform: `scale(${scale})` }}
      />
    </div>
  );
}

const INDUSTRIES = [
  { name: 'Healthcare', icon: 'M12 6v12M6 12h12M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z' },
  { name: 'Manufacturing', icon: 'M2 20h20M4 20V10l5 3V10l5 3V7l6-3v16' },
  { name: 'Education', icon: 'M22 10L12 5 2 10l10 5 10-5zM6 12v5c0 1 3 3 6 3s6-2 6-3v-5' },
  { name: 'Finance', icon: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
  { name: 'Hospitality', icon: 'M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6' },
  { name: 'Travel', icon: 'M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z' },
  { name: 'Legal', icon: 'M12 3v18M8 21h8M6 7l-4 7a4 4 0 0 0 8 0L6 7zM18 7l-4 7a4 4 0 0 0 8 0l-4-7zM4 7h16' },
  { name: 'Construction', icon: 'M2 20h20M6 20V9l6-5 6 5v11M10 20v-4h4v4' },
  { name: 'Real Estate', icon: 'M3 21h18M9 8h1M9 12h1M9 16h1M14 8h1M14 12h1M14 16h1M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16' },
  { name: 'IT', icon: 'M4 17l6-5-6-5M12 19h8' },
  { name: 'Retail', icon: 'M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4H6zM3 6h18M16 10a4 4 0 0 1-8 0' },
  { name: 'Automotive', icon: 'M5 17H3v-5l2-5h12l4 5v5h-2M7 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0zM15 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0z' },
];

const PLANS = [
  { name: 'Launch', description: 'A polished single-page site for startups that need to be live yesterday.', price: 490, yearlyPrice: 4900, popular: false, includesLabel: 'Launch includes:', features: ['One-page custom design', 'Mobile-first build', 'Basic SEO setup', 'Launch in 2 weeks'] },
  { name: 'Studio', description: 'Best value for growing businesses — a full site with ongoing care.', price: 990, yearlyPrice: 9900, popular: true, includesLabel: 'Everything in Launch, plus:', features: ['Up to 10 custom pages', 'CMS you can edit yourself', 'Performance & SEO tuning', 'Monthly updates & support'] },
  { name: 'Partner', description: 'A dedicated web team for companies that ship constantly.', price: 2400, yearlyPrice: 24000, popular: false, includesLabel: 'Everything in Studio, plus:', features: ['Unlimited design requests', 'Custom web apps & integrations', 'A/B testing & analytics', 'Same-week turnaround'] },
];

const TECHNOLOGIES = [
  { name: 'HTML', dot: '#E44D26' }, { name: 'CSS', dot: '#264DE4' }, { name: 'JavaScript', dot: '#F0DB4F' },
  { name: 'React', dot: '#61DAFB' }, { name: 'Next.js', dot: '#888888' }, { name: 'Vue', dot: '#42B883' },
  { name: 'Node.js', dot: '#68A063' }, { name: 'Laravel', dot: '#FF2D20' }, { name: 'WordPress', dot: '#21759B' },
  { name: 'Shopify', dot: '#95BF47' }, { name: 'WooCommerce', dot: '#96588A' }, { name: 'MongoDB', dot: '#4DB33D' },
  { name: 'PostgreSQL', dot: '#336791' }, { name: 'AWS', dot: '#FF9900' }, { name: 'Vercel', dot: '#888888' },
  { name: 'Cloudflare', dot: '#F58220' },
];

function ArrowIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

function Badge() {
  return (
    <div className="bl-badge">
      <span className="bl-badge-dot">
        <span className="bl-badge-ping" />
        <span className="bl-badge-core" />
      </span>
      Now taking new projects
    </div>
  );
}

export function Landing() {
  const [dark, setDark] = useState(() => localStorage.getItem('bq-theme') === 'dark');
  const [yearly, setYearly] = useState(false);
  const [activeNav, setActiveNav] = useState('Features');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    registerDitherShader();
    const root = rootRef.current ?? document.body;
    initPreloader(root);
    return initCursor(root);
  }, []);

  const toggleTheme = () => {
    setDark((d) => {
      const next = !d;
      localStorage.setItem('bq-theme', next ? 'dark' : 'light');
      return next;
    });
  };

  const cardMove = (e: ReactMouseEvent<HTMLElement>) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
    el.style.setProperty('--go', '1');
  };
  const cardLeave = (e: ReactMouseEvent<HTMLElement>) => {
    e.currentTarget.style.setProperty('--go', '0');
  };

  return (
    <div className="bl-root" id="top" data-theme={dark ? 'dark' : 'light'} ref={rootRef}>
      <div className="bl-nav-spacer" />

      {/* Nav */}
      <nav className="bl-nav">
        <a href="#top" className="bl-nav-logo">BlackQuill<span className="bl-dot">.</span></a>
        <div className="bl-nav-links">
          {NAV_ITEMS.map((n) => {
            const active = activeNav === n.name;
            return (
              <a
                key={n.name}
                href={n.url}
                className={`bl-nav-item${active ? ' active' : ''}`}
                onClick={() => setActiveNav(n.name)}
              >
                {n.name}
                {active && (
                  <span className="bl-nav-indicator">
                    <span className="bl-nav-glow1" />
                    <span className="bl-nav-glow2" />
                  </span>
                )}
              </a>
            );
          })}
        </div>
        <Link to="/signin" className="bl-nav-cta">Get started</Link>
      </nav>

      {/* Hero */}
      <section className="bl-hero">
        <div className="bl-shader-host" data-shader-host="true">
          <div className="bl-shader-layer">
            <dither-shader color={ACCENT} speed={SHADER_SPEED} pixel={DITHER_PIXEL} hover-boost={3} style={{ width: '100%', height: '100%' }} />
          </div>
          <div className="bl-hero-inner">
            <Badge />
            <h1 className="bl-hero-h1">Websites that turn<br />visitors into customers.</h1>
            <p className="bl-hero-p">We design and develop premium websites for startups, SMEs, and enterprises — optimized for speed, SEO, and conversions.</p>
            <div className="bl-btn-row">
              <Link to="/signin" className="bl-btn bl-btn-primary">Book Free Consultation<ArrowIcon size={18} /></Link>
              <a href="#pricing" className="bl-btn bl-btn-secondary">Get a Free Quote</a>
              <a href="#work" className="bl-btn bl-btn-ghost">View Our Work →</a>
            </div>
            <div className="bl-hero-note">Free discovery call · Fixed-price quotes</div>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="bl-trust">
        <div className="bl-trust-inner">
          <div className="bl-trust-stat">
            <div className="bl-trust-num">100<span className="bl-dot">+</span></div>
            <div className="bl-trust-label">Businesses served</div>
          </div>
          <div className="bl-trust-divider" />
          <div className="bl-trust-logos">
            <span className="bl-trust-logo">Google</span>
            <span className="bl-trust-logo">Meta</span>
            <span className="bl-trust-logo">Microsoft</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bl-features">
        <div className="bl-head-left">
          <span className="bl-eyebrow">Why BlackQuill</span>
          <h2 className="bl-h2">Craftsmanship for brands that care about the web.</h2>
        </div>
        <div className="bl-grid-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="bl-card" onMouseMove={cardMove} onMouseLeave={cardLeave}>
              <div className="bl-glow" />
              <div className="bl-border" />
              <div className="bl-card-body">
                <div className="bl-card-icon">
                  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                    <path d={f.icon} />
                  </svg>
                </div>
                <h3 className="bl-card-h3">{f.title}</h3>
                <p className="bl-card-p">{f.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bl-how">
        <div className="bl-head-center">
          <span className="bl-eyebrow">How it works</span>
          <h2 className="bl-h2">You bring the vision. We build it your way.</h2>
          <p className="bl-section-sub">Every site starts with your requirements — your goals, your taste, your customers.</p>
        </div>
        <div className="bl-steps">
          {STEPS.map((s, i) => (
            <div
              key={s.num}
              className="bl-step"
              style={{ top: `${96 + i * 30}px` }}
              onMouseMove={cardMove}
              onMouseLeave={cardLeave}
            >
              <div className="bl-glow" />
              <div className="bl-border" />
              <div className="bl-step-num">{s.num}</div>
              <div className="bl-step-body">
                <h3 className="bl-step-h3">{s.title}</h3>
                <p className="bl-step-p">{s.body}</p>
                <div className="bl-tags">
                  {s.tags.map((tag) => <span key={tag} className="bl-tag">{tag}</span>)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Our work */}
      <section id="work" className="bl-work">
        <div className="bl-head-center">
          <span className="bl-eyebrow">Our work</span>
          <h2 className="bl-h2">Recent builds, real results.</h2>
          <p className="bl-section-sub">A few of the sites we've designed and shipped for our clients.</p>
        </div>
        <div className="bl-grid-work">
          {WORK.map((w) => (
            <a
              key={w.file}
              href={w.file}
              target="_blank"
              rel="noopener noreferrer"
              className="bl-work-card"
              onMouseMove={cardMove}
              onMouseLeave={cardLeave}
            >
              <div className="bl-glow bl-glow--work" />
              <div className="bl-border bl-border--work" />
              <div className="bl-work-body">
                <WorkPreview src={w.file} title={w.title} />
                <div className="bl-work-meta">
                  <div>
                    <h3 className="bl-work-title">{w.title}</h3>
                    <div className="bl-work-industry">{w.industry}</div>
                  </div>
                  <span className="bl-work-badge">{w.badge}</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bl-pricing">
        <div className="bl-head-center">
          <span className="bl-eyebrow">Pricing</span>
          <h2 className="bl-h2">Plans that work best for you.</h2>
          <p className="bl-section-sub">Trusted by teams around the world. Explore which option is right for you.</p>
          <div className="bl-toggle-wrap">
            <div className="bl-toggle">
              <div className="bl-toggle-pill" style={{ transform: `translateX(${yearly ? '100%' : '0%'})` }} />
              <button className="bl-toggle-btn" style={{ color: yearly ? 'var(--navlink)' : '#fff' }} onClick={() => setYearly(false)}>Monthly</button>
              <button className="bl-toggle-btn" style={{ color: yearly ? '#fff' : 'var(--navlink)' }} onClick={() => setYearly(true)}>Yearly</button>
            </div>
          </div>
        </div>
        <div className="bl-plans">
          {PLANS.map((p) => {
            const planStyle: CSSProperties = {
              borderColor: p.popular ? 'color-mix(in srgb, var(--accent) 45%, rgba(32,29,24,0.18))' : 'var(--line)',
              boxShadow: p.popular ? '0 18px 50px -18px color-mix(in srgb, var(--accent) 45%, transparent)' : '0 1px 2px rgba(32,29,24,0.05)',
            };
            const btnStyle: CSSProperties = {
              background: p.popular ? 'var(--accent)' : 'transparent',
              color: p.popular ? '#fff' : 'var(--ink)',
              border: `1px solid ${p.popular ? 'var(--accent)' : 'var(--line-strong)'}`,
            };
            return (
              <div key={p.name} className="bl-plan" style={planStyle}>
                {p.popular && <div className="bl-plan-badge">Most popular</div>}
                <h3 className="bl-plan-name">{p.name}</h3>
                <div className="bl-plan-price-row">
                  <span className="bl-plan-price">${yearly ? p.yearlyPrice : p.price}</span>
                  <span className="bl-plan-per">{yearly ? '/year' : '/month'}</span>
                </div>
                <p className="bl-plan-desc">{p.description}</p>
                <Link to="/signin" className="bl-plan-btn" style={btnStyle}>Get started</Link>
                <div className="bl-plan-includes">
                  <div className="bl-plan-includes-label">{p.includesLabel}</div>
                  {p.features.map((feat) => (
                    <div key={feat} className="bl-plan-feat">
                      <span className="bl-plan-feat-dot" />
                      <span className="bl-plan-feat-text">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Industries */}
      <section id="industries" className="bl-industries">
        <div className="bl-head-center">
          <span className="bl-eyebrow">Industries we serve</span>
          <h2 className="bl-h2">Whatever you do, we build for it.</h2>
        </div>
        <div className="bl-grid-ind">
          {INDUSTRIES.map((ind) => (
            <div key={ind.name} className="bl-ind-card" onMouseMove={cardMove} onMouseLeave={cardLeave}>
              <div className="bl-glow bl-glow--ind" />
              <div className="bl-border bl-border--ind" />
              <div className="bl-ind-icon">
                <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                  <path d={ind.icon} />
                </svg>
              </div>
              <div className="bl-ind-name">{ind.name}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section id="cta" className="bl-cta">
        <div className="bl-shader-host" data-shader-host="true">
          <div className="bl-shader-layer">
            <dither-shader color={ACCENT} speed={SHADER_SPEED} pixel={DITHER_PIXEL} shape="ripple" hover-boost={3} style={{ width: '100%', height: '100%' }} />
          </div>
          <div className="bl-cta-inner">
            <Badge />
            <h2 className="bl-cta-h2">Ready to build<br /><span className="bl-cta-h2-muted">your next website?</span></h2>
            <p className="bl-cta-p">Book your free strategy call today. Clean, fast, and uniquely yours.</p>
            <Link to="/signin" className="bl-btn bl-btn-cta">Let's Build Together<ArrowIcon size={19} /></Link>
          </div>
        </div>
      </section>

      {/* Technologies */}
      <section className="bl-tech">
        <div className="bl-tech-head">
          <span className="bl-eyebrow">Technologies</span>
          <h2 className="bl-h2-sm">Built on the tools you trust.</h2>
        </div>
        <div className="bl-tech-list">
          {TECHNOLOGIES.map((t) => (
            <span key={t.name} className="bl-tech-pill">
              <span className="bl-tech-dot" style={{ background: t.dot }} />
              {t.name}
            </span>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bl-footer">
        <div className="bl-footer-top">
          <div className="bl-footer-brand">
            <div className="bl-footer-logo">BlackQuill<span className="bl-dot">.</span></div>
            <p className="bl-footer-desc">A web studio that designs, builds, and ships handcrafted websites for brands that care about the details.</p>
            <div className="bl-socials">
              <a href={SOCIAL_LINKS.x} target="_blank" rel="noopener noreferrer" aria-label="X / Twitter" className="bl-social"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3l-4.9-6.4L6.4 22H3.3l7.3-8.3L2.5 2h6.4l4.4 5.9L18.9 2zm-1.1 18h1.7L7.1 3.9H5.3L17.8 20z" /></svg></a>
              <a href={SOCIAL_LINKS.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="bl-social"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8h4V24h-4V8zm7.5 0h3.8v2.2h.05c.53-1 1.83-2.2 3.77-2.2 4.03 0 4.78 2.65 4.78 6.1V24h-4v-8.5c0-2-.04-4.6-2.8-4.6-2.8 0-3.2 2.2-3.2 4.45V24H8V8z" /></svg></a>
              <a href={SOCIAL_LINKS.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="bl-social"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" /></svg></a>
              <a href={SOCIAL_LINKS.github} target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="bl-social"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.2.8-.6v-2c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.4-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0C17.3 4.9 18.3 5.2 18.3 5.2c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .4.2.7.8.6 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.7 18.3.5 12 .5z" /></svg></a>
            </div>
          </div>
          <div className="bl-footer-col">
            <div className="bl-footer-col-title">Company</div>
            {COMPANY_LINKS.map((l) => <a key={l.label} href={l.href} className="bl-footer-link">{l.label}</a>)}
          </div>
          <div className="bl-footer-col">
            <div className="bl-footer-col-title">Work</div>
            {WORK_LINKS.map((l) => <a key={l.label} href={l.href} className="bl-footer-link">{l.label}</a>)}
          </div>
          <div className="bl-footer-col">
            <div className="bl-footer-col-title">Legal</div>
            {LEGAL_LINKS.map((l) => <a key={l.label} href={l.href} className="bl-footer-link">{l.label}</a>)}
          </div>
        </div>
        <div className="bl-footer-bottom">
          <div>BlackQuill © 2026 — Websites, done right.</div>
          <div>Crafted with care, shipped with pride.</div>
        </div>
      </footer>

      {/* Theme toggle */}
      <button className="bl-theme-toggle" aria-label="Toggle dark mode" title="Toggle dark mode" onClick={toggleTheme}>
        {dark ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
        )}
      </button>
    </div>
  );
}
