// Fails when the built app grows past its budget. A phone on bad bar Wi-Fi loads this once, then runs from the
// service worker's cache: the gzip size of the JS and CSS is what a first visit or an update downloads.
// Run after `npm run build`. Raise a budget on purpose, in the same change that adds the weight.
import { readdirSync, readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'

const BUDGET_KB = { js: 110, css: 8 } // gzip; today about 89 and 4.3

const dir = new URL('../dist/assets/', import.meta.url)
const size = (ext) =>
  readdirSync(dir)
    .filter((f) => f.endsWith(`.${ext}`))
    .reduce((sum, f) => sum + gzipSync(readFileSync(new URL(f, dir))).length, 0) / 1024

let failed = false
for (const [ext, budget] of Object.entries(BUDGET_KB)) {
  const kb = size(ext)
  const over = kb > budget
  failed ||= over
  console.log(`${over ? 'FAIL' : 'ok  '} ${ext}: ${kb.toFixed(1)} kB gzip (budget ${budget} kB)`)
}
process.exit(failed ? 1 : 0)
