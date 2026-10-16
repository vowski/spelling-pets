// The app's test hooks as seen from inside page.evaluate / addInitScript (see src/app/testHooks.ts).
interface Window {
  __SPELLING_TEST__?: { now?: string; speechLog?: string[]; noSpeech?: boolean; fast?: boolean }
  __SPELLING_REPO__?: { savePlacement(levels: { level: string; sampledIds: string[]; answers: Record<string, boolean>; status: 'done'; placed: boolean }[]): Promise<void> }
}
