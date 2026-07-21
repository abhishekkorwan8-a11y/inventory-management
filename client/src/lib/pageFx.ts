// BlackQuill page effects — ported from the design's page-fx.js.
// A custom cursor (accent dot + trailing ring) and a logo preloader.
// Elements are appended to a supplied root so they inherit its theme vars.

export function initCursor(root: HTMLElement = document.body): () => void {
  const noop = () => {};
  if (matchMedia('(hover:none),(pointer:coarse)').matches) return noop;
  if (root.querySelector('#bq-cursor-dot')) return noop;

  const dot = document.createElement('div');
  dot.id = 'bq-cursor-dot';
  dot.style.cssText =
    'position:fixed;top:0;left:0;width:9px;height:9px;border-radius:50%;background:var(--accent,#EC4E02);' +
    'box-shadow:0 0 8px color-mix(in srgb, var(--accent,#EC4E02) 70%, transparent);' +
    'pointer-events:none;z-index:9999;transform:translate(-50%,-50%);opacity:0';

  const ring = document.createElement('div');
  ring.id = 'bq-cursor-ring';
  ring.style.cssText =
    'position:fixed;top:0;left:0;width:34px;height:34px;border-radius:50%;border:1.5px solid var(--accent,#EC4E02);' +
    'pointer-events:none;z-index:9999;transform:translate(-50%,-50%);opacity:0;' +
    'transition:width .25s ease, height .25s ease, border-color .25s ease, background .25s ease';

  root.append(ring, dot);

  // Hide the native cursor while the custom one is active.
  const hide = document.createElement('style');
  hide.id = 'bq-cursor-hide';
  hide.textContent = 'html, body, a, button, input, select, textarea, label, * { cursor: none !important; }';
  document.head.appendChild(hide);

  let mx = 0, my = 0, rx = 0, ry = 0, seen = false, raf = 0;
  const onMove = (e: MouseEvent) => {
    mx = e.clientX; my = e.clientY;
    dot.style.left = mx + 'px'; dot.style.top = my + 'px';
    if (!seen) { seen = true; rx = mx; ry = my; dot.style.opacity = '1'; ring.style.opacity = '1'; }
  };
  window.addEventListener('mousemove', onMove);

  const loop = () => {
    rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
    ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  const HOVER = 'a, button, input, select, textarea, label, [data-cursor-hover]';
  const onOver = (e: MouseEvent) => {
    const t = e.target as HTMLElement;
    if (t.closest && t.closest(HOVER)) {
      ring.style.width = '56px'; ring.style.height = '56px';
      ring.style.background = 'color-mix(in srgb, var(--accent,#EC4E02) 12%, transparent)';
      ring.style.borderColor = 'var(--accent,#EC4E02)';
    }
  };
  const onOut = (e: MouseEvent) => {
    const t = e.target as HTMLElement;
    const rel = e.relatedTarget as HTMLElement | null;
    if (t.closest && t.closest(HOVER) && !(rel && rel.closest && rel.closest(HOVER))) {
      ring.style.width = '34px'; ring.style.height = '34px';
      ring.style.background = 'transparent';
      ring.style.borderColor = 'var(--accent,#EC4E02)';
    }
  };
  document.addEventListener('mouseover', onOver);
  document.addEventListener('mouseout', onOut);

  return () => {
    window.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseover', onOver);
    document.removeEventListener('mouseout', onOut);
    cancelAnimationFrame(raf);
    dot.remove(); ring.remove(); hide.remove();
  };
}

// ScrollStack: sticky "how it works" cards get scale + blur as later cards
// stack on top of them. Returns a teardown that removes listeners.
export function initScrollStack(): () => void {
  let raf = 0;
  const update = () => {
    raf = 0;
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-stack-card]'));
    if (!els.length) return;
    const progress = els.map((el) => {
      const top = parseFloat(getComputedStyle(el).top) || 96;
      const d = el.getBoundingClientRect().top - top;
      return Math.max(0, Math.min(1, 1 - d / 320));
    });
    els.forEach((el, i) => {
      let depth = 0;
      for (let j = i + 1; j < els.length; j++) depth += progress[j];
      const scale = Math.max(0.85, 1 - depth * 0.04);
      const blur = depth > 0.05 ? Math.min(4, depth * 1.1) : 0;
      el.style.setProperty('--stack-scale', String(Math.round(scale * 1000) / 1000));
      el.style.setProperty('--stack-blur', Math.round(blur * 100) / 100 + 'px');
    });
  };
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  update();
  return () => {
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onScroll);
    cancelAnimationFrame(raf);
  };
}

export function initPreloader(root: HTMLElement = document.body, logoSrc?: string): void {
  if (root.querySelector('#bq-preloader')) return;
  const wrap = document.createElement('div');
  wrap.id = 'bq-preloader';
  wrap.style.cssText =
    'position:fixed;inset:0;z-index:10000;background:#0A0908;display:flex;align-items:center;justify-content:center;' +
    'transition:transform .9s cubic-bezier(.76,0,.24,1)';

  let mark: HTMLElement;
  if (logoSrc) {
    const img = document.createElement('img');
    img.src = logoSrc;
    img.alt = 'BlackQuill';
    img.style.cssText = 'max-width:min(46vw,300px);max-height:38vh;border-radius:24%';
    mark = img;
  } else {
    mark = document.createElement('div');
    mark.style.cssText =
      "font-family:'Newsreader',serif;font-weight:500;font-size:clamp(48px,9vw,120px);color:#F1EADB;letter-spacing:0.02em";
    mark.innerHTML = 'BlackQuill<span style="color:var(--accent,#EC4E02)">.</span>';
  }
  wrap.appendChild(mark);
  root.appendChild(wrap);

  mark.animate(
    [
      { opacity: 0, letterSpacing: '0.3em', filter: 'blur(8px)', transform: 'scale(0.96)' },
      { opacity: 1, letterSpacing: logoSrc ? 'normal' : '0.02em', filter: 'blur(0)', transform: 'scale(1)' },
    ],
    { duration: 1100, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' },
  );

  setTimeout(() => {
    wrap.style.transform = 'translateY(-100%)';
    setTimeout(() => wrap.remove(), 950);
  }, 1400);
}
