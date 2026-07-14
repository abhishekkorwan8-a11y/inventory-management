import { useEffect, MouseEvent as ReactMouseEvent } from 'react';
import { registerDitherShader } from '../lib/ditherShader';
import './Landing.css';

// Allow the <dither-shader> custom element in JSX.
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

// Shader defaults from the design's prop definitions.
const ACCENT = '#EC4E02';
const SHADER_SPEED = 0.4;
const DITHER_PIXEL = 2;

const FEATURES = [
  {
    icon: 'M12 20h9M16.7 3.3a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.7 3.3z',
    title: 'Voice match',
    body: 'Quill studies the way you already write — cadence, vocabulary, punctuation habits — and drafts new copy that passes for yours, because it is.',
  },
  {
    icon: 'M12 3l1.9 5.7 5.8 1.9-5.8 1.9L12 18.2l-1.9-5.7-5.8-1.9 5.8-1.9L12 3zM19 14.5l1 2.7 2.7 1-2.7 1-1 2.7-1-2.7-2.7-1 2.7-1 1-2.7z',
    title: 'Inline rewrite',
    body: 'Highlight any sentence and ask for tighter, warmer, or braver. Quill rewrites in place without flattening what made it yours.',
  },
  {
    icon: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
    title: 'Tone dial',
    body: 'Slide from boardroom to group chat. One draft, every register — without retyping a word.',
  },
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
    <div className="ql-badge">
      <span className="ql-badge-dot">
        <span className="ql-badge-ping" />
        <span className="ql-badge-core" />
      </span>
      AI-Powered Writing
    </div>
  );
}

export function Landing() {
  useEffect(() => {
    registerDitherShader();
  }, []);

  const cardMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
    el.style.setProperty('--go', '1');
  };
  const cardLeave = (e: ReactMouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.setProperty('--go', '0');
  };

  return (
    <div className="ql-root">
      {/* Nav */}
      <nav className="ql-nav">
        <div className="ql-logo">Quill<span className="ql-logo-dot">.</span></div>
        <div className="ql-nav-links">
          <a href="#features" className="ql-nav-link">Features</a>
          <a href="#cta" className="ql-nav-link">Pricing</a>
          <a href="#cta" className="ql-nav-link">Blog</a>
          <a href="#cta" className="ql-nav-cta">Start writing</a>
        </div>
      </nav>

      {/* Hero */}
      <section className="ql-hero">
        <div className="ql-shader-host" data-shader-host="true">
          <div className="ql-shader-layer">
            <dither-shader
              color={ACCENT}
              speed={SHADER_SPEED}
              pixel={DITHER_PIXEL}
              hover-boost={3}
              style={{ width: '100%', height: '100%' }}
            />
          </div>
          <div className="ql-hero-inner">
            <Badge />
            <h1 className="ql-hero-h1">Your voice,<br />only sharper.</h1>
            <p className="ql-hero-p">
              Quill learns how you write — then drafts emails, essays, and posts that
              sound unmistakably like you.
            </p>
            <div className="ql-btn-row">
              <a href="#cta" className="ql-btn ql-btn-primary">Start Typing<ArrowIcon size={18} /></a>
              <a href="#features" className="ql-btn ql-btn-secondary">See how it works</a>
            </div>
            <div className="ql-hero-note">Free for 30 days · No card required</div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="ql-features">
        <div className="ql-features-head">
          <div className="ql-eyebrow">Why Quill</div>
          <h2 className="ql-features-h2">Precision tools for people who care about words.</h2>
        </div>
        <div className="ql-features-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="ql-card" onMouseMove={cardMove} onMouseLeave={cardLeave}>
              <div className="ql-card-glow" />
              <div className="ql-card-border" />
              <div className="ql-card-body">
                <div className="ql-card-icon">
                  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                    <path d={f.icon} />
                  </svg>
                </div>
                <h3 className="ql-card-h3">{f.title}</h3>
                <p className="ql-card-p">{f.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section id="cta" className="ql-cta">
        <div className="ql-shader-host" data-shader-host="true">
          <div className="ql-shader-layer">
            <dither-shader
              color={ACCENT}
              speed={SHADER_SPEED}
              pixel={DITHER_PIXEL}
              shape="ripple"
              hover-boost={3}
              style={{ width: '100%', height: '100%' }}
            />
          </div>
          <div className="ql-cta-inner">
            <Badge />
            <h2 className="ql-cta-h2">
              Your words,<br /><span className="ql-cta-h2-muted">delivered perfectly.</span>
            </h2>
            <p className="ql-cta-p">
              Join 2,847 founders using the only AI that understands the nuance of your
              voice. Clean, precise, and uniquely yours.
            </p>
            <a href="#cta" className="ql-btn ql-btn-cta">Start Typing<ArrowIcon size={19} /></a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="ql-footer">
        <div>Quill © 2026 — Words, kept yours.</div>
        <div className="ql-footer-links">
          <a href="#features" className="ql-footer-link">Privacy</a>
          <a href="#features" className="ql-footer-link">Terms</a>
          <a href="#features" className="ql-footer-link">Twitter</a>
        </div>
      </footer>
    </div>
  );
}
