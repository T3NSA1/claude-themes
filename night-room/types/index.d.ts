export type Mood = 'idle' | 'think' | 'work' | 'fail' | 'merged'

declare module 'claude-code' {
  interface PluginState {
    'night-room': { mood: Mood }
  }
}
