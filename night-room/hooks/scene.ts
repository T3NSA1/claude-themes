// A coder's room at night: a window on a sleeping city, a desk with a lamp, a monitor and a mug,
// and three orange pixel critters whose behaviour follows what Claude is doing (the mood).

export type Mood = 'idle' | 'think' | 'work' | 'fail' | 'merged'
export const MOODS: readonly Mood[] = ['idle', 'think', 'work', 'fail', 'merged']

const ORANGE = '#d97757'
const ORANGE_DARK = '#b45f43'
const EYE = '#1b1411'

// Deterministic randomness so every render of a mood is the same picture.
function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const f = (n: number) => Math.round(n * 10) / 10

// ---- the critter: 12 x 9 pixels of 6 px, 72 x 54 ----
const CELL = 8

function critterDef(id: string, eyes: 'open' | 'shut' | 'x'): string {
  const parts: string[] = []
  const r = (x: number, y: number, w: number, h: number, fill: string) =>
    parts.push(`<rect x="${x * CELL}" y="${y * CELL}" width="${w * CELL}" height="${h * CELL}" fill="${fill}"/>`)

  r(1, 0, 10, 6, ORANGE)
  r(1, 5, 10, 1, ORANGE_DARK)
  r(0, 2, 1, 2, ORANGE)
  r(11, 2, 1, 2, ORANGE)
  for (const x of [2, 4, 7, 9]) r(x, 6, 1, 3, ORANGE)

  if (eyes === 'open') {
    r(3, 1, 1, 2, EYE)
    r(8, 1, 1, 2, EYE)
  } else if (eyes === 'shut') {
    r(2, 2, 2, 1, EYE)
    r(8, 2, 2, 1, EYE)
  } else {
    parts.push(
      [2.5, 7.5]
        .map(x => {
          const a = x * CELL
          const b = (x + 2) * CELL
          return `M${a} ${CELL} L${b} ${3 * CELL} M${b} ${CELL} L${a} ${3 * CELL}`
        })
        .map(d => `<path d="${d}" stroke="${EYE}" stroke-width="${CELL * 0.7}" stroke-linecap="square"/>`)
        .join(''),
    )
  }

  return `<g id="${id}">${parts.join('')}</g>`
}

type Motion = {
  x: number
  y: number
  eyes: 'open' | 'shut' | 'x'
  walk?: { dx: number; dur: number; delay?: number }
  hop?: { h: number; dur: number; delay?: number }
  lying?: boolean
  extra?: string
}

function critter(m: Motion): string {
  const use = `<use href="#crit-${m.eyes}"/>`

  if (m.lying) {
    // Flat on its back, legs in the air.
    return `<g transform="translate(${m.x} ${m.y}) rotate(180 ${6 * CELL} ${4.5 * CELL})">${use}</g>${m.extra ?? ''}`
  }

  const walk = m.walk
    ? `style="--dx:${m.walk.dx}px;animation:walk ${m.walk.dur}s ease-in-out ${m.walk.delay ?? 0}s infinite alternate"`
    : ''
  const hop = m.hop
    ? `class="hop" style="--h:${m.hop.h}px;animation:hop ${m.hop.dur}s ease-in-out ${m.hop.delay ?? 0}s infinite"`
    : ''

  return `<g transform="translate(${m.x} ${m.y})"><g ${walk}>${m.extra ?? ''}<g ${hop}>${use}</g></g></g>`
}

// ---- the window: sky, moon, stars and the city ----
function windowArt(mood: Mood): string {
  const rand = rng(7)
  const X = 120
  const Y = 110
  const W = 400
  const H = 360
  const out: string[] = []

  out.push(`<rect x="${X}" y="${Y}" width="${W}" height="${H}" fill="url(#sky)"/>`)
  out.push(`<circle cx="${X + 320}" cy="${Y + 64}" r="60" fill="url(#moonGlow)"/>`)
  out.push(`<circle cx="${X + 320}" cy="${Y + 64}" r="24" fill="#efe4c4"/>`)
  out.push(`<circle cx="${X + 312}" cy="${Y + 58}" r="5" fill="#ddd0ad"/><circle cx="${X + 328}" cy="${Y + 72}" r="3.5" fill="#ddd0ad"/>`)

  for (let i = 0; i < 28; i++) {
    const sx = X + 10 + rand() * (W - 20)
    const sy = Y + 8 + rand() * 170
    const r = 0.8 + rand() * 1.4
    out.push(
      `<circle cx="${f(sx)}" cy="${f(sy)}" r="${f(r)}" fill="#dfe6ff" style="animation:twinkle ${f(2 + rand() * 4)}s ease-in-out ${f(rand() * 4)}s infinite"/>`,
    )
  }

  // Two rows of buildings, the far one paler.
  for (const [row, base, tint, lit] of [
    [0, Y + H, '#18213d', 0.18],
    [1, Y + H, '#0c1124', 0.32],
  ] as const) {
    let bx = X - 10
    while (bx < X + W) {
      const bw = 34 + rand() * 50
      const bh = (row === 0 ? 140 : 70) + rand() * (row === 0 ? 110 : 120)
      const top = base - bh
      out.push(`<rect x="${f(bx)}" y="${f(top)}" width="${f(bw)}" height="${f(bh)}" fill="${tint}"/>`)
      if (row === 1 && rand() < 0.3) {
        out.push(`<rect x="${f(bx + bw / 2 - 1)}" y="${f(top - 16)}" width="2" height="16" fill="${tint}"/>`)
        out.push(
          `<circle cx="${f(bx + bw / 2)}" cy="${f(top - 17)}" r="2.2" fill="#ff5a4e" style="animation:blink 1.6s steps(1) ${f(rand() * 2)}s infinite"/>`,
        )
      }
      for (let wy = top + 10; wy < base - 10; wy += 14) {
        for (let wx = bx + 6; wx < bx + bw - 8; wx += 11) {
          if (rand() > lit) continue
          const warm = rand() < 0.75 ? '#f2b866' : '#9cc4ff'
          const flick =
            rand() < 0.25
              ? ` style="animation:flicker ${f(4 + rand() * 9)}s steps(1) ${f(rand() * 6)}s infinite"`
              : ''
          out.push(
            `<rect x="${f(wx)}" y="${f(wy)}" width="5" height="7" fill="${warm}" opacity="${row === 0 ? 0.45 : 0.85}"${flick}/>`,
          )
        }
      }
      bx += bw + (row === 0 ? 4 : 2)
    }
  }

  // A merged turn gets fireworks over the city.
  if (mood === 'merged') {
    const bursts = [
      [X + 110, Y + 90, '#ffb36b', 0],
      [X + 250, Y + 60, '#7fe0a0', 0.6],
      [X + 190, Y + 140, '#9cc4ff', 1.2],
    ] as const
    for (const [bxp, byp, col, d] of bursts) {
      const rays: string[] = []
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2
        rays.push(
          `<line x1="${f(Math.cos(a) * 8)}" y1="${f(Math.sin(a) * 8)}" x2="${f(Math.cos(a) * 34)}" y2="${f(Math.sin(a) * 34)}"/>`,
        )
      }
      out.push(
        `<g transform="translate(${bxp} ${byp})"><g class="burst" stroke="${col}" stroke-width="3" stroke-linecap="round" style="animation:burst 1.8s ease-out ${d}s infinite">${rays.join('')}</g></g>`,
      )
    }
  }

  const clip = `<clipPath id="win"><rect x="${X}" y="${Y}" width="${W}" height="${H}"/></clipPath>`
  const frame =
    `<rect x="${X - 7}" y="${Y - 7}" width="${W + 14}" height="${H + 14}" fill="none" stroke="#28304a" stroke-width="14"/>` +
    `<rect x="${X + W / 2 - 4}" y="${Y}" width="8" height="${H}" fill="#28304a"/>` +
    `<rect x="${X}" y="${Y + 150}" width="${W}" height="8" fill="#28304a"/>` +
    `<rect x="${X - 24}" y="${Y + H + 6}" width="${W + 48}" height="14" rx="3" fill="#2d3550"/>` +
    // A cactus on the sill.
    `<rect x="${X + 40}" y="${Y + H - 26}" width="30" height="32" rx="3" fill="#7a4a35"/>` +
    `<rect x="${X + 49}" y="${Y + H - 66}" width="12" height="42" rx="6" fill="#3f7a55"/>` +
    `<rect x="${X + 37}" y="${Y + H - 52}" width="10" height="18" rx="5" fill="#3f7a55"/>`

  return `<defs>${clip}</defs><g clip-path="url(#win)">${out.join('')}</g>${frame}`
}

// ---- the monitor's code, scrolling ----
function codeLines(): string {
  const colors = ['#7aa2f7', '#e0af68', '#9ece6a', '#bb9af7', '#d97757', '#8a93a8', '#8a93a8']
  const rows: string[] = []
  const N = 24
  for (let copy = 0; copy < 2; copy++) {
    let indent = 0
    const r2 = rng(42)
    for (let i = 0; i < N; i++) {
      indent = Math.max(0, Math.min(3, indent + Math.floor(r2() * 3) - 1))
      let x = 1186 + indent * 14
      const y = 528 + (copy * N + i) * 12
      const segs = 1 + Math.floor(r2() * 3)
      for (let s = 0; s < segs && x < 1420; s++) {
        const w = Math.min(14 + r2() * 60, 1424 - x)
        rows.push(`<rect x="${f(x)}" y="${y}" width="${f(w)}" height="5" rx="1" fill="${colors[Math.floor(r2() * colors.length)]}"/>`)
        x += w + 6
      }
    }
  }
  return rows.join('')
}

const CODE = codeLines()

type ScreenLook = { glow: string; code: number; scroll: number; overlay?: string; badge?: string }

const SCREEN: Record<Mood, ScreenLook> = {
  idle: { glow: '#3a5a9a', code: 0.45, scroll: 40 },
  think: { glow: '#4b6cb5', code: 0.75, scroll: 16 },
  work: { glow: '#5b8fe0', code: 1, scroll: 3.5 },
  fail: { glow: '#c2444c', code: 0.35, scroll: 0, overlay: '#ff3b3b', badge: '✕' },
  merged: { glow: '#4caf6a', code: 0.6, scroll: 8, overlay: '#3ddc84', badge: '✓' },
}

// ---- the desk ----
function deskArt(mood: Mood): string {
  const s = SCREEN[mood]
  const out: string[] = []

  // Light the screen throws on the wall.
  out.push(
    `<ellipse cx="1444" cy="600" rx="300" ry="220" fill="${s.glow}" opacity="0.22" filter="url(#soft)" style="animation:glow 5s ease-in-out infinite"/>`,
  )
  // The lamp's warm pool.
  out.push(`<ellipse cx="1110" cy="740" rx="200" ry="120" fill="url(#lampGlow)"/>`)

  // Desk.
  out.push(`<rect x="1030" y="760" width="640" height="20" rx="3" fill="#33251d"/>`)
  out.push(`<rect x="1030" y="760" width="640" height="4" fill="#4a362a"/>`)
  out.push(`<rect x="1052" y="780" width="16" height="160" fill="#2a1e18"/><rect x="1572" y="780" width="16" height="160" fill="#2a1e18"/>`)

  // Lamp.
  out.push(`<g transform="translate(128 0)">` +
    `<rect x="912" y="748" width="56" height="12" rx="4" fill="#3b3f52"/>` +
      `<path d="M940 750 L926 664 L1000 628" stroke="#3b3f52" stroke-width="7" fill="none" stroke-linecap="round"/>` +
      `<path d="M984 612 L1030 632 L1012 668 L968 646 Z" fill="#4a4f66"/>` +
      `<ellipse cx="1012" cy="660" rx="14" ry="5" fill="#ffd79a" opacity="0.9"/>` +
      `</g>`,
  )

  // Monitor and keyboard, moved right as one.
  out.push(`<g transform="translate(134 0)">`)

  // Monitor.
  out.push(`<rect x="1295" y="690" width="30" height="58" fill="#252b3c"/><rect x="1265" y="746" width="90" height="8" rx="3" fill="#252b3c"/>`)
  out.push(`<rect x="1166" y="508" width="290" height="186" rx="9" fill="#1c2232"/>`)
  out.push(`<rect x="1176" y="518" width="270" height="166" rx="3" fill="#0a1120"/>`)
  out.push(`<clipPath id="scr"><rect x="1176" y="518" width="270" height="166"/></clipPath>`)
  const scroll = s.scroll > 0 ? `style="animation:scroll ${s.scroll}s linear infinite"` : ''
  out.push(`<g clip-path="url(#scr)"><g opacity="${s.code}"><g ${scroll}>${CODE}</g></g>`)
  if (mood === 'think' || mood === 'work') {
    out.push(`<rect x="1186" y="668" width="9" height="11" fill="#d97757" style="animation:blink 1s steps(1) infinite"/>`)
  }
  if (s.overlay) {
    out.push(`<rect x="1176" y="518" width="270" height="166" fill="${s.overlay}" opacity="0.18"/>`)
    out.push(
      `<text x="1311" y="625" text-anchor="middle" font-size="84" font-family="monospace" font-weight="700" fill="${s.overlay}" style="animation:pulse 1.2s ease-in-out infinite">${s.badge}</text>`,
    )
  }
  out.push(`</g>`)
  out.push(`<rect x="1176" y="518" width="270" height="166" rx="3" fill="url(#screenSheen)"/>`)

  // Keyboard.
  out.push(`<rect x="1170" y="748" width="150" height="12" rx="3" fill="#262e43"/>`)
  for (let k = 0; k < 12; k++) out.push(`<rect x="${1176 + k * 12}" y="751" width="8" height="3" fill="#3a4561"/>`)

  out.push(`</g>`)

  // Mug with steam, between the lamp and the monitor.
  out.push(`<g transform="translate(-308 0)">`)
  out.push(
    `<path d="M1540 716 q22 0 22 18 q0 18 -22 18" stroke="#2e4a5c" stroke-width="7" fill="none"/>` +
      `<rect x="1488" y="704" width="54" height="56" rx="6" fill="#2e4a5c"/>` +
      `<rect x="1488" y="704" width="54" height="7" rx="3" fill="#3d6176"/>`,
  )
  if (mood !== 'fail') {
    for (let i = 0; i < 3; i++) {
      out.push(
        `<path d="M${1500 + i * 14} 698 q-8 -14 0 -28 q8 -14 0 -28" stroke="#c9d2e6" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.28" style="animation:steam 3.6s ease-in ${i * 1.2}s infinite"/>`,
      )
    }
  }

  out.push(`</g>`)

  out.push(critters(mood))
  return out.join('')
}

const DOTS =
  `<g transform="translate(80 -42)">` +
  [0, 1, 2]
    .map(i => `<circle cx="${i * 14}" cy="0" r="4.5" fill="#e8e2d6" style="animation:dot 1.2s ease-in-out ${i * 0.2}s infinite"/>`)
    .join('') +
  `</g>`

const ZZZ = [0, 1, 2]
  .map(
    i =>
      `<text x="${1196 + i * 16}" y="${616 - i * 26}" font-family="monospace" font-weight="700" font-size="${18 + i * 5}" fill="#9fb0d8" opacity="${0.9 - i * 0.2}" style="animation:zzz 4.5s ease-out ${i * 1.5}s infinite">z</text>`,
  )
  .join('')

function critters(mood: Mood): string {
  // Feet on the desk top (760), the monitor top (508), the mug top (704); a critter is 72 tall.
  const A = { x: 1300, y: 688 }
  const B = { x: 1310, y: 436 }
  const C = { x: 1159, y: 632 }
  switch (mood) {
    case 'idle':
      // Posed to read as a moment even when the app shows the picture still:
      // A mid-jump over the desk, B sitting on the monitor with its legs over the bezel,
      // C asleep on the mug, D on the windowsill looking at the moon.
      return (
        `<g stroke="#d97757" stroke-opacity=".45" stroke-width="5" stroke-linecap="round">` +
        `<line x1="1336" y1="712" x2="1336" y2="740"/><line x1="1378" y1="706" x2="1378" y2="742"/><line x1="1420" y1="712" x2="1420" y2="740"/>` +
        `</g>` +
        `<ellipse cx="1378" cy="758" rx="40" ry="5" fill="#000" opacity=".35"/>` +
        critter({ x: 1330, y: 612, eyes: 'open', hop: { h: 18, dur: 1.7 } }) +
        critter({ x: 1352, y: 460, eyes: 'open', hop: { h: 6, dur: 2.6, delay: 0.5 } }) +
        critter({ ...C, eyes: 'shut', hop: { h: 2, dur: 3.5 } }) +
        ZZZ +
        critter({ x: 404, y: 404, eyes: 'open', hop: { h: 4, dur: 3.2, delay: 1 } })
      )
    case 'think':
      return (
        critter({ ...A, eyes: 'open', walk: { dx: 180, dur: 1.4 }, hop: { h: 30, dur: 0.42 } }) +
        critter({ ...B, eyes: 'open', walk: { dx: 170, dur: 1.9, delay: -0.6 }, hop: { h: 20, dur: 0.5, delay: 0.1 }, extra: DOTS }) +
        critter({ ...C, eyes: 'open', hop: { h: 16, dur: 0.6, delay: 0.2 } })
      )
    case 'work':
      return (
        critter({ x: 1340, y: A.y, eyes: 'open', hop: { h: 5, dur: 0.16 } }) +
        critter({ ...B, eyes: 'open', walk: { dx: 170, dur: 4 }, hop: { h: 14, dur: 0.7 } }) +
        critter({ ...C, eyes: 'open', hop: { h: 9, dur: 1.1 } })
      )
    case 'fail':
      return (
        `<g style="animation:shake .5s ease-in-out 2">` +
        critter({ x: 1380, y: A.y, eyes: 'x', lying: true }) +
        critter({ x: 1400, y: B.y, eyes: 'x', lying: true }) +
        critter({ ...C, eyes: 'x', lying: true }) +
        `<text x="1488" y="716" font-family="monospace" font-weight="700" font-size="48" fill="#ff5a5f" style="animation:pulse 1s ease-in-out infinite">!</text>` +
        `</g>`
      )
    case 'merged':
      return (
        critter({ x: 1340, y: A.y, eyes: 'open', hop: { h: 100, dur: 0.75 } }) +
        critter({ x: 1400, y: B.y, eyes: 'open', hop: { h: 80, dur: 0.75, delay: 0.25 } }) +
        critter({ ...C, eyes: 'open', hop: { h: 90, dur: 0.75, delay: 0.5 } })
      )
  }
}

function floorArt(): string {
  const out: string[] = []
  // A striped rug under the desk.
  out.push(`<ellipse cx="1240" cy="1010" rx="420" ry="60" fill="#2b1f33"/>`)
  out.push(`<ellipse cx="1240" cy="1010" rx="380" ry="48" fill="none" stroke="#d97757" stroke-opacity=".35" stroke-width="5"/>`)
  out.push(`<ellipse cx="1240" cy="1010" rx="320" ry="36" fill="none" stroke="#e0af68" stroke-opacity=".25" stroke-width="4"/>`)
  // The monitor's cable down the desk leg and along the floor.
  out.push(`<path d="M1440 780 C 1450 860, 1430 920, 1470 960 S 1560 980, 1610 990" stroke="#1d2233" stroke-width="5" fill="none"/>`)
  // A bin and the paper balls that missed it.
  out.push(`<path d="M820 900 L830 980 L890 980 L900 900 Z" fill="#2a3148"/><rect x="814" y="894" width="92" height="10" rx="3" fill="#353d58"/>`)
  out.push(`<circle cx="842" cy="892" r="12" fill="#d8d2c4"/><circle cx="866" cy="888" r="10" fill="#cfc8b8"/>`)
  out.push(`<circle cx="930" cy="972" r="11" fill="#d8d2c4"/><circle cx="790" cy="976" r="9" fill="#cfc8b8"/><circle cx="960" cy="984" r="8" fill="#d8d2c4"/>`)
  // A backpack leaning on the wall.
  out.push(`<rect x="610" y="860" width="100" height="120" rx="22" fill="#3a4a6b"/><rect x="626" y="912" width="68" height="44" rx="10" fill="#33415f"/>`)
  out.push(`<path d="M630 864 q30 -40 60 0" stroke="#2c3854" stroke-width="8" fill="none"/>`)
  out.push(`<rect x="652" y="924" width="16" height="6" rx="2" fill="#d97757"/>`)
  return out.join('')
}

function confetti(): string {
  const rand = rng(99)
  const cols = ['#d97757', '#f2b866', '#7fe0a0', '#9cc4ff', '#e8e2d6', '#bb9af7']
  const out: string[] = []
  for (let i = 0; i < 60; i++) {
    const x = rand() * 1600
    out.push(
      `<g transform="translate(${f(x)} -30)"><rect width="${f(6 + rand() * 6)}" height="${f(10 + rand() * 6)}" fill="${cols[i % cols.length]}" style="animation:fall ${f(2.6 + rand() * 2.4)}s linear ${f(rand() * 3)}s infinite"/></g>`,
    )
  }
  return out.join('')
}

const STYLE = `
@keyframes walk{from{transform:translateX(0)}to{transform:translateX(var(--dx))}}
.hop{transform-box:fill-box;transform-origin:50% 100%}
@keyframes hop{0%,100%{transform:translateY(0) scale(1.08,.9)}15%{transform:translateY(0) scale(1,1)}50%{transform:translateY(calc(-1 * var(--h))) scale(.96,1.05)}85%{transform:translateY(0) scale(1,1)}}
@keyframes twinkle{0%,100%{opacity:.25}50%{opacity:1}}
@keyframes blink{0%{opacity:1}50%{opacity:0}}
@keyframes flicker{0%{opacity:.85}70%{opacity:0}85%{opacity:.85}}
@keyframes scroll{from{transform:translateY(0)}to{transform:translateY(-288px)}}
@keyframes glow{0%,100%{opacity:.2}50%{opacity:.28}}
@keyframes steam{0%{opacity:0;transform:translateY(8px)}30%{opacity:.35}100%{opacity:0;transform:translateY(-30px)}}
@keyframes zzz{0%{opacity:0;transform:translate(0,0)}20%{opacity:.9}100%{opacity:0;transform:translate(26px,-70px)}}
@keyframes dot{0%,100%{opacity:.25;transform:translateY(0)}50%{opacity:1;transform:translateY(-5px)}}
@keyframes pulse{0%,100%{opacity:.6}50%{opacity:1}}
@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}
.burst{transform-box:fill-box;transform-origin:50% 50%}
@keyframes burst{0%{transform:scale(.1);opacity:0}10%{opacity:1}70%{opacity:.9}100%{transform:scale(1.5);opacity:0}}
@keyframes fall{from{transform:translateY(0) rotate(0)}to{transform:translateY(1080px) rotate(540deg)}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}`

function build(mood: Mood): string {
  const defs =
    `<defs>` +
    `<linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0c1020"/><stop offset="1" stop-color="#141a2d"/></linearGradient>` +
    `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#070d22"/><stop offset="1" stop-color="#1b2550"/></linearGradient>` +
    `<radialGradient id="moonGlow"><stop offset="0" stop-color="#efe4c4" stop-opacity=".35"/><stop offset="1" stop-color="#efe4c4" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="lampGlow"><stop offset="0" stop-color="#ffb867" stop-opacity=".28"/><stop offset="1" stop-color="#ffb867" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="vignette" cx=".5" cy=".32" r=".8"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>` +
    `<linearGradient id="screenSheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".06"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
    `<linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#121624"/><stop offset=".4" stop-color="#0b0e18"/><stop offset="1" stop-color="#06080f"/></linearGradient>` +
    `<filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="40"/></filter>` +
    critterDef('crit-open', 'open') +
    critterDef('crit-shut', 'shut') +
    critterDef('crit-x', 'x') +
    `</defs>`

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1700" width="100%" height="100%" preserveAspectRatio="xMidYMin slice">` +
    `<style>${STYLE}</style>` +
    defs +
    `<rect width="1600" height="1000" fill="url(#wall)"/>` +
    `<rect y="930" width="1600" height="10" fill="#1b2135"/><rect y="940" width="1600" height="760" fill="url(#floor)"/>` +
    floorArt() +
    `<g class="win">${windowArt(mood)}</g>` +
    `<g class="desk">${deskArt(mood)}</g>` +
    (mood === 'merged' ? confetti() : '') +
    `<rect width="1600" height="1700" fill="url(#vignette)"/>` +
    `</svg>`
  )
}

const CACHE = new Map<Mood, string>()

export function scene(mood: Mood): string {
  let svg = CACHE.get(mood)
  if (svg === undefined) {
    svg = build(mood)
    CACHE.set(mood, svg)
  }
  return svg
}
