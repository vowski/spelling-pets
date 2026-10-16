import { copyFileSync, readFileSync, writeFileSync } from 'node:fs'
import { Resvg } from '@resvg/resvg-js'

const here = (p: string) => new URL(p, import.meta.url)
const svg = readFileSync(here('../public/icon.svg'), 'utf8')
const render = (size: number, source = svg) => new Resvg(source, { fitTo: { mode: 'width', value: size }, font: { loadSystemFonts: true } }).render().asPng()

writeFileSync(here('../public/pwa-192.png'), render(192))
writeFileSync(here('../public/pwa-512.png'), render(512))
writeFileSync(here('../public/apple-touch-icon.png'), render(180))
// Maskable: put the art inside the 80% safe zone on a full-bleed background.
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#5fb88f"/><g transform="translate(51 51) scale(0.8)">${svg.replace(/^<svg[^>]*>|<\/svg>\s*$/g, '')}</g></svg>`
writeFileSync(here('../public/maskable-512.png'), render(512, maskable))
copyFileSync(here('../public/icon.svg'), here('../public/favicon.svg'))
console.log('icons written')
