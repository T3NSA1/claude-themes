import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, ThemeSetArgs, Timer } from 'claude-code'

import { makeColors } from './make-colors.js'
import { scene } from './scene'
import type { Mood } from '../types'

const PLUGIN = 'night-room'
// One scene name for the whole session: the look is set once, and the mood only redraws the backdrop.
// (Setting the theme again for every mood repainted the whole window, which flickered.)
const SCENE = 'night-room'
const MERGED = /\bmerged\b/i
const FAIL_MS = 4000
const MERGED_MS = 8000

const moodAtom = atom({ plugin: 'night-room', key: 'mood' } as const, 'idle' as Mood)

// Night-blue surfaces, warm off-white words, the critters' orange as the accent.
const { theme: colors, problems } = makeColors({
  label: 'Night room',
  only: 'dark',
  roles: { accent: '#d97757', danger: '#e0565b', success: '#6fbf73', warning: '#e0af68', pro: '#9d8cd8' },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#0f1322',
        'surface-1': '#151a2b',
        'surface-2': '#1a2033',
        'surface-3': '#20273b',
        'text-primary': '#ece6dc',
        'text-secondary': '#c6c1b8',
        'text-muted': '#a09fab',
      },
    },
  },
})

// No blur, only a faint tint for the words' sake, so the critters behind the chat stay sharp.
const GLASS = { blur: 0, tint: '#0d1220', opacity: 0.22 }

const LOOK: ThemeSetArgs = {
  colors,
  overrideColorScheme: 'dark',
  backdrop: { scene: SCENE, glass: GLASS },
}

// The module's own variables start over on a reload; the mood itself lives in the session's state.
let base: Mood = 'idle'
let flash: Timer | undefined

async function setLook($: EngineInterface): Promise<void> {
  try {
    const set = await $.theme.set(LOOK)
    if (!set.isDrawn && set.reason !== undefined) $.ui.status(set.reason)
  } catch (error) {
    $.ui.toast(`night-room: the theme was not set (${String(error)})`)
  }
}

async function show($: EngineInterface, mood: Mood): Promise<void> {
  try {
    if ((await read($, moodAtom)) !== mood) await update($, moodAtom, () => mood)
  } catch {
    // A mood that cannot be shown must never hold up a prompt or a tool call.
  }
}

// Every change of mood reloads the backdrop's frame, which flashes the window for a moment. So the everyday
// moods (thinking, working) are left out and the room stays as it is through a turn; only the rare events,
// a failed tool call and "merged", change it. Set to false for the full set of reactions, flash and all.
const CALM = true

async function settle($: EngineInterface, mood: Mood): Promise<void> {
  if (CALM) mood = 'idle'
  base = mood
  if (flash === undefined) await show($, mood)
}

async function flashMood($: EngineInterface, mood: Mood, ms: number): Promise<void> {
  flash?.cancel()
  await show($, mood)
  flash = $.clock.after(ms, () => {
    flash = undefined
    void show($, base)
  })
}

const ALT: Record<Mood, string> = {
  idle: "A coder's room at night; orange pixel critters hop on the desk, one asleep on a mug",
  think: 'The critters run and bounce about the desk while Claude thinks',
  work: 'One critter types at the keyboard while code scrolls on the monitor',
  fail: 'The critters have fallen over and the monitor shows a red cross',
  merged: 'The critters jump for joy under confetti and fireworks',
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))
    if (unpainted !== undefined) $.ui.toast(unpainted)
    await setLook($)
    await show($, base)
    return next(e)
  })

  // A prompt: the critters run about while Claude thinks.
  on('prompt.submit', async ($, e, next) => {
    // Set the look again every turn: a reload's outgoing copy, or another plugin's $.theme.clear(), may have
    // taken it away since. The same scene and the same drawing, so nothing visible changes when it stands.
    await setLook($)
    await settle($, 'think')
    return next(e)
  })

  // A tool runs: one sits at the keyboard and types. A failed call knocks them all over for a moment.
  on('tool.call', async ($, e, next) => {
    await settle($, 'work')
    const result = await next(e)
    if ('isError' in result && result.isError === true) {
      await flashMood($, 'fail', FAIL_MS)
    }
    return result
  })

  // The main turn is over: back to the quiet room, one of them asleep on the mug.
  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      if (e.reason === 'error') await flashMood($, 'fail', FAIL_MS)
      await settle($, 'idle')
    }
    return next(e)
  })

  // "merged" in Claude's reply: everyone jumps, confetti and fireworks.
  on('session.append', { door: 'response' }, async ($, e, next) => {
    const said = e.message.content.some(
      block => block.type === 'text' && typeof block.text === 'string' && MERGED.test(block.text),
    )
    if (said) await flashMood($, 'merged', MERGED_MS)
    return next(e)
  })

  on('ui.render', { component: 'Backdrop' }, async ($, e, next) => {
    // Matched by the scene alone: where two copies of this mod are loaded (a draft and the installed one) the
    // engine may name the one that set the look differently, and neither would draw it.
    if (e.props.scene !== SCENE || (e.surface !== 'desktop' && e.surface !== 'mobile')) {
      return next(e)
    }
    const mood = await read($, moodAtom)
    const { Svg } = $.ui.resolve(e)
    // The desktop draws a backdrop only in the interactive frame. That frame reloads blank whenever the source
    // changes, so the mood changes rarely: see CALM.
    return <Svg isInteractive alt={ALT[mood]} source={scene(mood)} />
  })
}
