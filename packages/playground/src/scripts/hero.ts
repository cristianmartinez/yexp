import { type ASTNode, compile, evaluate, parse, tokenize } from '@cristianmartinez/yexp';
import gsap from 'gsap';
import { formatInstruction } from '../../lib/format-instruction';

const presets = {
  total: { source: '$.price * $.quantity', data: { price: 50, quantity: 3 } },
  rule: { source: '$.total >= 100 && $.member', data: { total: 150, member: true } },
  query: { source: '$.items[*].name', data: { items: [{ name: 'Ada' }, { name: 'Lin' }] } },
};
const hero = document.querySelector<HTMLElement>('#hero');
const canvas = document.querySelector<HTMLCanvasElement>('#hero-shader');
const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
const toggle = document.querySelector<HTMLButtonElement>('#motion-toggle');
const state = { progress: 0, pointer: 0.5 };
let paused = motion.matches;
let visible = true;
let trace: number[] = [];
let currentInstruction = -1;
let shaderTime = 0;
const timeline = gsap.timeline({ repeat: -1, repeatDelay: 0.5, paused: true });
timeline.to(state, { progress: 1, duration: 10, ease: 'none' });
const letters = gsap.timeline({ repeat: -1, paused: true });
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789$.*>=&[]{}';

function spinExpression(source: string, result: string) {
  const display = document.querySelector<HTMLElement>('#source-code');
  const phase = document.querySelector('#display-phase');
  if (!display) return;
  letters.pause().clear();
  display.classList.remove('settled-result');
  if (motion.matches) {
    display.textContent = `${source} → ${result}`;
    if (phase) phase.textContent = 'expression → result';
    return;
  }
  const count = Math.max(source.length, result.length);
  const slots: HTMLElement[] = [];
  const reels: HTMLElement[] = [];
  const steps = 12;
  const rows = steps + 1;
  const randomSequence = () =>
    Array.from({ length: steps }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join(
      '',
    );
  for (let index = 0; index < count; index++) {
    const slot = document.createElement('span');
    slot.className = 'spinner-slot';
    const reel = document.createElement('span');
    reel.className = 'spinner-reel';
    const sequence = `${source[index] ?? ' '}${randomSequence()}${result[index] ?? ' '}${randomSequence()}${source[index] ?? ' '}`;
    for (const character of sequence) {
      const glyph = document.createElement('span');
      glyph.className = 'spinner-glyph';
      glyph.textContent = character === ' ' ? '\u00a0' : character;
      reel.append(glyph);
    }
    slot.append(reel);
    slots.push(slot);
    reels.push(reel);
  }
  display.replaceChildren(...slots);
  const trailing = slots.slice(result.length);
  const sourceOnly = slots.slice(source.length);
  const setPhase = (text: string, settled: boolean) => {
    if (phase) phase.textContent = text;
    display.classList.toggle('settled-result', settled);
  };
  letters
    .set(reels, { '--row': 0 })
    .set(slots, { '--slot-width': 1, opacity: 1 })
    .set(sourceOnly, { '--slot-width': 0, opacity: 0 })
    .call(() => setPhase('expression.yexp', false))
    .to({}, { duration: 2 })
    .call(() => setPhase('executing bytecode…', false))
    .set(sourceOnly, { '--slot-width': 1 })
    .to(reels, {
      '--row': rows,
      duration: 0.5,
      stagger: { each: 0.008, from: 'random' },
      ease: 'power1.out',
    })
    .to(trailing, { opacity: 0, duration: 0.28, stagger: 0.006, ease: 'power1.out' }, '<')
    .to(sourceOnly, { opacity: 1, duration: 0.3 }, '<')
    .to(trailing, { '--slot-width': 0, duration: 0.22, ease: 'power2.inOut' }, '>')
    .call(() => setPhase('VM / result', true))
    .to({}, { duration: 2.5 })
    .call(() => setPhase('expression.yexp', false))
    .to(slots, { '--slot-width': 1, duration: 0.22, ease: 'power2.inOut' })
    .to(
      reels,
      {
        '--row': rows * 2,
        duration: 0.5,
        stagger: { each: 0.008, from: 'random' },
        ease: 'power1.out',
      },
      '<',
    )
    .to(trailing, { opacity: 1, duration: 0.35, stagger: 0.006, ease: 'power1.in' }, '<')
    .set(sourceOnly, { '--slot-width': 0, opacity: 0 });
  letters.eventCallback('onRepeat', () => {
    for (const reel of reels) {
      for (let index = 1; index < rows * 2; index++) {
        if (index === rows) continue;
        reel.children[index].textContent = alphabet[Math.floor(Math.random() * alphabet.length)];
      }
    }
  });
  letters.restart();
}

function describe(node: ASTNode): string {
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'Literal') return node.raw;
  if (node.type === 'MemberAccess') return `${describe(node.object)}.${node.property}`;
  if ('left' in node && 'right' in node && 'operator' in node)
    return `${describe(node.left)} ${node.operator} ${describe(node.right)}`;
  if (node.type === 'WildcardIndex') return `${describe(node.object)}[*]`;
  return node.type;
}

function selectPreset(key: keyof typeof presets) {
  const { source, data } = presets[key];
  const program = compile(source);
  const ast = parse(tokenize(source));
  trace = [0];
  const result = evaluate(program, data, { onStep: (step) => trace.push(step.ip) });
  const inputEl = document.querySelector('#input-data');
  const typeEl = document.querySelector('#result-type');
  const description = document.querySelector('#expression-description');
  const output = JSON.stringify(result);
  const type = Array.isArray(result) ? 'array' : typeof result;
  if (inputEl) inputEl.textContent = JSON.stringify(data);
  if (typeEl) typeEl.textContent = `source → ${type}`;
  if (description) description.textContent = `${source} evaluates to ${output} (${type}).`;
  spinExpression(source, output);
  const list = document.querySelector('#bytecode-list');
  list?.replaceChildren(
    ...program.code.map((instruction, i) => {
      const row = document.createElement('div');
      row.className = 'instruction';
      const index = document.createElement('span');
      index.textContent = String(i).padStart(2, '0');
      const code = document.createElement('code');
      code.textContent = formatInstruction(instruction, program);
      row.append(index, code);
      return row;
    }),
  );
  const root = document.querySelector('.tree-root');
  const branches = document.querySelector('.tree-branches');
  if (root)
    root.textContent =
      'operator' in ast ? `${ast.type.replace('Op', '')} · ${ast.operator}` : ast.type;
  const children =
    'left' in ast && 'right' in ast ? [ast.left, ast.right] : 'object' in ast ? [ast.object] : [];
  branches?.replaceChildren(
    ...children.map((child) => {
      const span = document.createElement('span');
      span.textContent = describe(child);
      return span;
    }),
  );
  document.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.preset === key));
  });
  currentInstruction = -1;
  timeline.restart();
  syncMotion();
}

// The full-hero shader turns flowing source particles into ordered instruction cells.
// The centered copy stays readable while the signal field fills the hero edges.
function createShader(target: HTMLCanvasElement) {
  const gl = target.getContext('webgl', {
    alpha: true,
    premultipliedAlpha: false,
    antialias: false,
    powerPreference: 'low-power',
  });
  if (!gl) return null;
  function shader(type: number, source: string) {
    if (!gl) return null;
    const value = gl.createShader(type);
    if (!value) return null;
    gl.shaderSource(value, source);
    gl.compileShader(value);
    if (!gl.getShaderParameter(value, gl.COMPILE_STATUS)) {
      gl.deleteShader(value);
      return null;
    }
    return value;
  }
  const vertex = shader(
    gl.VERTEX_SHADER,
    'attribute vec2 a_position; void main(){gl_Position=vec4(a_position,0.,1.);}',
  );
  const fragment = shader(
    gl.FRAGMENT_SHADER,
    `
    precision mediump float;
    uniform vec2 u_resolution;
    uniform float u_progress;
    uniform float u_pointer;
    uniform float u_time;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    void main(){
      vec2 uv=gl_FragCoord.xy/u_resolution;
      float t=u_time*.11;
      float spacing=7.;
      vec2 cell=floor(gl_FragCoord.xy/spacing);
      vec2 local=fract(gl_FragCoord.xy/spacing)-.5;
      vec2 sampleUV=(cell+.5)*spacing/u_resolution;
      float field=0.;
      float wires=0.;
      for(int i=0;i<3;i++){
        float fi=float(i);
        float wave=.56+fi*.13+.11*sin(sampleUV.x*6.3+t+fi*.9);
        float d=abs(sampleUV.y-wave);
        field+=exp(-pow(d/(.038+fi*.009),2.));
        float lineWave=.56+fi*.13+.11*sin(uv.x*6.3+t+fi*.9);
        wires+=exp(-abs(uv.y-lineWave)*u_resolution.y*.42);
      }
      float seed=hash(cell);
      float ordered=smoothstep(.35,.8,sampleUV.x);
      float circle=1.-smoothstep(.12,.24,length(local));
      float square=(1.-smoothstep(.12,.2,abs(local.x)))*(1.-smoothstep(.12,.2,abs(local.y)));
      float bit=mix(circle,square,ordered);
      float drift=.6+.4*sin(sampleUV.x*12.-t*4.+seed*5.);
      float density=step(.18,seed);
      float edges=.22+.78*smoothstep(.12,.35,abs(uv.x-.5));
      float fade=smoothstep(0.,.14,uv.y)*(1.-smoothstep(.94,1.,uv.y));
      float pulse=exp(-pow((uv.x-u_progress)*5.,2.));
      float particle=field*bit*density*(.26+drift*.32)*edges;
      float signal=wires*(.1+pulse*.18)*edges;
      float glow=field*.014*edges;
      vec2 mouse=vec2(u_pointer,.65);
      float response=exp(-length((uv-mouse)*vec2(1.6,1.))*9.)*.025;
      float alpha=(particle+signal+glow+response)*fade;
      vec3 ink=mix(vec3(.84,.28,.10),vec3(.57,.34,.17),ordered*.45);
      gl_FragColor=vec4(ink,clamp(alpha,0.,.58));
    }

  `,
  );
  if (!vertex || !fragment) {
    if (vertex) gl.deleteShader(vertex);
    if (fragment) gl.deleteShader(fragment);
    return null;
  }
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW,
  );
  const position = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const resolution = gl.getUniformLocation(program, 'u_resolution');
  const progress = gl.getUniformLocation(program, 'u_progress');
  const pointer = gl.getUniformLocation(program, 'u_pointer');
  const time = gl.getUniformLocation(program, 'u_time');
  function render() {
    if (!gl || gl.isContextLost()) return;
    gl.uniform2f(resolution, target.width, target.height);
    gl.uniform1f(progress, state.progress);
    gl.uniform1f(pointer, state.pointer);
    gl.uniform1f(time, shaderTime);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  const resize = new ResizeObserver(() => {
    const ratio = Math.min(window.devicePixelRatio, 1.5);
    target.width = Math.round(target.clientWidth * ratio);
    target.height = Math.round(target.clientHeight * ratio);
    gl.viewport(0, 0, target.width, target.height);
    render();
  });
  resize.observe(target);
  return {
    render,
    dispose() {
      resize.disconnect();
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
    },
  };
}
const shader = canvas ? createShader(canvas) : null;
function draw(time?: number) {
  if (typeof time === 'number') shaderTime = time;
  shader?.render();
  const next =
    state.progress > 0.5
      ? trace[Math.min(trace.length - 1, Math.floor((state.progress - 0.5) * 2 * trace.length))]
      : -1;
  if (next === currentInstruction) return;
  currentInstruction = next;
  document
    .querySelectorAll('.instruction')
    .forEach((row, index) => row.classList.toggle('active', index === next));
}
function syncMotion() {
  const running = !paused && !motion.matches && visible && !document.hidden;
  timeline.paused(!running);
  letters.paused(!running);
  gsap.ticker.remove(draw);
  if (running) gsap.ticker.add(draw);
  else draw();
  if (toggle) {
    toggle.textContent = paused || motion.matches ? '▶' : 'Ⅱ';
    toggle.setAttribute('aria-pressed', String(paused || motion.matches));
    toggle.setAttribute(
      'aria-label',
      paused || motion.matches ? 'Resume animation' : 'Pause animation',
    );
    toggle.disabled = motion.matches;
  }
}
document.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach((button) => {
  button.addEventListener('click', () =>
    selectPreset(button.dataset.preset as keyof typeof presets),
  );
});
toggle?.addEventListener('click', () => {
  paused = !paused;
  syncMotion();
});
motion.addEventListener('change', () => {
  paused = motion.matches;
  const selected = document.querySelector<HTMLButtonElement>('[data-preset][aria-pressed="true"]');
  selectPreset((selected?.dataset.preset ?? 'total') as keyof typeof presets);
});
document.addEventListener('visibilitychange', syncMotion);
const observer = new IntersectionObserver((entries) => {
  visible = entries[0].isIntersecting;
  syncMotion();
});
if (hero) observer.observe(hero);
hero?.addEventListener('pointermove', (event) => {
  if (motion.matches || paused) return;
  const bounds = hero.getBoundingClientRect();
  gsap.to(state, {
    pointer: (event.clientX - bounds.left) / bounds.width,
    duration: 1,
    overwrite: 'auto',
  });
});
canvas?.addEventListener('webglcontextlost', () => {
  paused = true;
  syncMotion();
});
selectPreset('total');
window.addEventListener('pagehide', (event) => {
  if (event.persisted) {
    timeline.pause();
    letters.pause();
    gsap.ticker.remove(draw);
    return;
  }
  timeline.kill();
  letters.kill();
  gsap.killTweensOf(state);
  gsap.ticker.remove(draw);
  observer.disconnect();
  shader?.dispose();
});
window.addEventListener('pageshow', syncMotion);
const copyButton = document.querySelector<HTMLButtonElement>('#copy-install');
copyButton?.addEventListener('click', async () => {
  const label = document.querySelector('#copy-label');
  try {
    await navigator.clipboard.writeText('npm i @cristianmartinez/yexp');
    if (label) label.textContent = 'Copied';
    copyButton.setAttribute('aria-label', 'Install command copied');
  } catch {
    if (label) label.textContent = 'Select to copy';
    const code = copyButton.querySelector('code');
    if (code) {
      const range = document.createRange();
      range.selectNodeContents(code);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
    }
  }
  window.setTimeout(() => {
    if (label) label.textContent = '⧉';
    copyButton.setAttribute('aria-label', 'Copy npm install command');
  }, 2000);
});
