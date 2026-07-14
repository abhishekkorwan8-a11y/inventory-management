// <dither-shader> — animated dithering (4x4 Bayer) background, WebGL, transparent bg.
// Framework-agnostic custom element ported from the Quill landing design.
// Attributes:
//   color        (#hex)   — dither ink color
//   speed        (float)  — base animation speed
//   pixel        (px)     — size of each dither cell (larger = chunkier)
//   shape        (warp|ripple) — flow field vs. concentric ripple
//   hover-boost  (float)  — speed multiplier while the pointer is over the
//                           nearest [data-shader-host] ancestor

const VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';

const FS = `precision highp float;
uniform vec2 u_res;uniform float u_t;uniform vec3 u_col;uniform float u_shape;
float bayer2(vec2 a){a=floor(a);return fract(a.x/2.+a.y*a.y*.75);}
float b4(vec2 a){return bayer2(.5*a)*.25+bayer2(a);}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p*=2.03;a*=.5;}return v;}
void main(){
float v;
if(u_shape>0.5){
vec2 c=(gl_FragCoord.xy-.5*u_res)/u_res.y;
float d=length(c);
float n=fbm(c*2.5+u_t*.05);
v=sin(d*16.-u_t*.9+n*3.5)*.5+.5;
v*=smoothstep(1.15,.3,d);
v=smoothstep(.2,.9,v);
}else{
vec2 uv=gl_FragCoord.xy/u_res.y*3.0;
vec2 q=vec2(fbm(uv+vec2(0.,u_t*.08)),fbm(uv+vec2(5.2,1.3)-u_t*.06));
v=fbm(uv+1.8*q+vec2(u_t*.03,0.));
v=smoothstep(.32,.78,v);
}
float a=step(b4(gl_FragCoord.xy),v);
gl_FragColor=vec4(u_col,a);}`;

function hexToRgb(hex: string | null): [number, number, number] {
  const n = parseInt((hex || '#EC4E02').replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

class DitherShader extends HTMLElement {
  private t = Math.random() * 100;
  private curSpeed = 0;
  private hovered = false;
  private visible = true;
  private raf = 0;
  private last = 0;
  private reduced = false;
  private canvas!: HTMLCanvasElement;
  private gl: WebGLRenderingContext | null = null;
  private uRes: WebGLUniformLocation | null = null;
  private uT: WebGLUniformLocation | null = null;
  private uCol: WebGLUniformLocation | null = null;
  private uShape: WebGLUniformLocation | null = null;
  private ro?: ResizeObserver;
  private io?: IntersectionObserver;
  private host?: Element;
  private readonly onEnter = () => { this.hovered = true; };
  private readonly onLeave = () => { this.hovered = false; };

  static get observedAttributes() { return ['color', 'speed', 'pixel', 'shape', 'hover-boost']; }

  get baseSpeed() { return parseFloat(this.getAttribute('speed') || '') || 0.25; }
  get pixel() { return Math.max(1, parseFloat(this.getAttribute('pixel') || '') || 3); }
  get boost() { return parseFloat(this.getAttribute('hover-boost') || '') || 1; }

  connectedCallback() {
    this.style.display = 'block';
    this.style.width = this.style.width || '100%';
    this.style.height = this.style.height || '100%';

    const c = document.createElement('canvas');
    c.style.cssText = 'width:100%;height:100%;display:block;image-rendering:pixelated';
    this.appendChild(c);
    this.canvas = c;

    const gl = c.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: false }) as
      WebGLRenderingContext | null;
    if (!gl) return;
    this.gl = gl;

    const mk = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      return sh;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, mk(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, mk(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    this.uRes = gl.getUniformLocation(prog, 'u_res');
    this.uT = gl.getUniformLocation(prog, 'u_t');
    this.uCol = gl.getUniformLocation(prog, 'u_col');
    this.uShape = gl.getUniformLocation(prog, 'u_shape');

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(this);
    this.io = new IntersectionObserver((es) => { this.visible = es[0].isIntersecting; });
    this.io.observe(this);

    const host = this.closest('[data-shader-host]') || this;
    this.host = host;
    host.addEventListener('pointerenter', this.onEnter);
    host.addEventListener('pointerleave', this.onLeave);

    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.resize();
    this.last = performance.now();

    const loop = (now: number) => {
      this.raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      if (!this.visible || !this.gl) return;
      let target = this.baseSpeed * (this.hovered ? this.boost : 1);
      if (this.reduced) target = 0.03;
      this.curSpeed += (target - this.curSpeed) * Math.min(1, dt * 4);
      this.t += dt * this.curSpeed * 4;
      this.draw();
    };
    this.raf = requestAnimationFrame(loop);
  }

  resize() {
    if (!this.gl) return;
    const r = this.getBoundingClientRect();
    const w = Math.max(2, Math.round(r.width / this.pixel));
    const h = Math.max(2, Math.round(r.height / this.pixel));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      this.gl.viewport(0, 0, w, h);
    }
    this.draw();
  }

  draw() {
    const gl = this.gl;
    if (!gl) return;
    const [r, g, b] = hexToRgb(this.getAttribute('color'));
    gl.uniform2f(this.uRes, this.canvas.width, this.canvas.height);
    gl.uniform1f(this.uT, this.t);
    gl.uniform3f(this.uCol, r, g, b);
    gl.uniform1f(this.uShape, this.getAttribute('shape') === 'ripple' ? 1 : 0);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  attributeChangedCallback(name: string) {
    if (name === 'pixel' && this.gl) this.resize();
  }

  disconnectedCallback() {
    cancelAnimationFrame(this.raf);
    this.ro?.disconnect();
    this.io?.disconnect();
    if (this.host) {
      this.host.removeEventListener('pointerenter', this.onEnter);
      this.host.removeEventListener('pointerleave', this.onLeave);
    }
  }
}

let registered = false;

/** Register the <dither-shader> custom element (idempotent, browser-only). */
export function registerDitherShader() {
  if (registered || typeof window === 'undefined') return;
  registered = true;
  if (!customElements.get('dither-shader')) {
    customElements.define('dither-shader', DitherShader);
  }
}
