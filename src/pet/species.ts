import type { PetSpecies } from '../storage/db'

export const SPECIES: Record<PetSpecies, { label: string; emoji: string; body: string; accent: string; defaultName: string }> = {
  puppy: { label: 'Puppy', emoji: '🐶', body: '#d9a066', accent: '#8b5a2b', defaultName: 'Biscuit' },
  kitten: { label: 'Kitten', emoji: '🐱', body: '#f4b183', accent: '#c86b3c', defaultName: 'Ginger' },
  bunny: { label: 'Bunny', emoji: '🐰', body: '#f2eee9', accent: '#f4a7b9', defaultName: 'Clover' },
  fox: { label: 'Fox', emoji: '🦊', body: '#f08a3c', accent: '#fff4e6', defaultName: 'Rusty' },
  panda: { label: 'Panda', emoji: '🐼', body: '#ffffff', accent: '#2d2a32', defaultName: 'Bamboo' },
}
export const SPECIES_ORDER: PetSpecies[] = ['puppy', 'kitten', 'bunny', 'fox', 'panda']
