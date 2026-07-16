import { useEffect, useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { registerDitherShader } from '../lib/ditherShader';
import './SignIn.css';

// Shader defaults from the design's prop definitions.
const ACCENT = '#EC4E02';
const SHADER_SPEED = 0.65;

const TESTIMONIALS = [
  { initials: 'SC', name: 'Sarah Chen', handle: '@sarahbuilds', text: 'Our conversion rate doubled within a month of launch.' },
  { initials: 'MR', name: 'Marcus Reid', handle: '@reidco', text: 'Fastest, cleanest site we have ever shipped. Zero regrets.' },
];

function EyeIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-2.641-.21-5.236-.611-7.743z" />
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.022 35.026 44 30.038 44 24c0-2.641-.21-5.236-.611-7.743z" />
    </svg>
  );
}

export function SignIn() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [showPw, setShowPw] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem('bq-theme') === 'dark');

  useEffect(() => {
    registerDitherShader();
  }, []);

  const toggleTheme = () => {
    setDark((d) => {
      const next = !d;
      localStorage.setItem('bq-theme', next ? 'dark' : 'light');
      return next;
    });
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
  };

  const login = mode === 'login';
  const headline = login ? 'Welcome back.' : 'Create your account.';
  const subline = login
    ? 'Sign in to pick up right where you left off.'
    : 'Start your project with BlackQuill — it takes under a minute.';
  const submitLabel = login ? 'Sign in' : 'Create account';
  const switchPrompt = login ? 'New to BlackQuill?' : 'Already have an account?';
  const switchLabel = login ? 'Create account' : 'Sign in';

  return (
    <div className="bq-root" data-theme={dark ? 'dark' : 'light'}>
      <section className="bq-form-col">
        <div className="bq-form-wrap">
          <Link to="/landing" className="bq-logo bq-rise" style={{ animationDelay: '0s' }}>
            BlackQuill<span className="bq-dot">.</span>
          </Link>

          <div className="bq-head bq-rise" style={{ animationDelay: '0.06s' }}>
            <h1 className="bq-h1">{headline}</h1>
            <p className="bq-sub">{subline}</p>
          </div>

          <form className="bq-form bq-rise" style={{ animationDelay: '0.12s' }} onSubmit={submit}>
            {!login && (
              <label className="bq-label">
                Full name
                <input className="bq-input" name="name" type="text" placeholder="Jane Appleseed" />
              </label>
            )}

            <label className="bq-label">
              Email address
              <input className="bq-input" name="email" type="email" placeholder="you@company.com" />
            </label>

            <label className="bq-label">
              Password
              <span className="bq-pw-wrap">
                <input
                  className="bq-input bq-input-pw"
                  name="password"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="bq-pw-toggle"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPw((s) => !s)}
                >
                  {showPw ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </span>
            </label>

            {login && (
              <div className="bq-remember-row">
                <label className="bq-remember">
                  <input className="bq-checkbox" type="checkbox" name="rememberMe" />
                  Keep me signed in
                </label>
                <a href="#reset" className="bq-reset">Reset password</a>
              </div>
            )}

            <button type="submit" className="bq-submit">{submitLabel}</button>
          </form>

          <div className="bq-divider bq-rise" style={{ animationDelay: '0.18s' }}>
            <span className="bq-divider-line" />
            <span className="bq-divider-text">Or continue with</span>
          </div>

          <button type="button" className="bq-google bq-rise" style={{ animationDelay: '0.24s' }}>
            <GoogleIcon />
            Continue with Google
          </button>

          <p className="bq-switch bq-rise" style={{ animationDelay: '0.3s' }}>
            {switchPrompt}{' '}
            <a
              href="#switch"
              className="bq-switch-link"
              onClick={(e) => { e.preventDefault(); setMode(login ? 'signup' : 'login'); }}
            >
              {switchLabel}
            </a>
          </p>
        </div>
      </section>

      <section className="bq-aside">
        <div className="bq-aside-panel" data-shader-host="true">
          <div className="bq-aside-shader">
            <dither-shader
              color={ACCENT}
              speed={SHADER_SPEED}
              pixel={3}
              shape="ripple"
              hover-boost={3}
              style={{ width: '100%', height: '100%' }}
            />
          </div>
          <div className="bq-aside-content">
            <div className="bq-aside-title">
              Every pixel earns its place<span className="bq-dot">.</span>
            </div>
            <div className="bq-testimonials">
              {TESTIMONIALS.map((t) => (
                <div key={t.handle} className="bq-testimonial">
                  <div className="bq-avatar">{t.initials}</div>
                  <div className="bq-testimonial-body">
                    <div className="bq-testimonial-name">{t.name}</div>
                    <div className="bq-testimonial-handle">{t.handle}</div>
                    <div className="bq-testimonial-text">{t.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <button
        type="button"
        className="bq-theme-toggle"
        aria-label="Toggle dark mode"
        title="Toggle dark mode"
        onClick={toggleTheme}
      >
        {dark ? <SunIcon /> : <MoonIcon />}
      </button>
    </div>
  );
}
