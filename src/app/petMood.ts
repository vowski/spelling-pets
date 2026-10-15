import { create } from 'zustand'

export type PetMood = 'idle' | 'happy' | 'watch' | 'dance' | 'eat' | 'sleep' | 'encourage'

let timer: ReturnType<typeof setTimeout> | undefined

export const usePetMood = create<{ mood: PetMood; setMood: (m: PetMood, ms?: number) => void }>(set => ({
  mood: 'idle',
  setMood: (mood, ms) => {
    clearTimeout(timer)
    set({ mood })
    if (ms) timer = setTimeout(() => set({ mood: 'idle' }), ms)
  },
}))
