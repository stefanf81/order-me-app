// Two budgets on the built app. Run after `npm run build`.
//
//  1. The app code: the JS and CSS in dist/assets.
//  2. Everything: the whole of dist/, which adds the icons, the web app manifest, the service worker and the
//     Workbox runtime it loads separately. The icons are why this second budget exists: they are not in
//     dist/assets, and PNG barely compresses, so they are the larger half of the precached build.
//
// Both are compressed sizes of the built files, which is the right thing to cap: they are what a first visit
// downloads once the service worker has cached the app. It is not a measurement of what any particular phone
// transfers, and it does not model HTTP/2 framing, per-request headers or how much a repeat visit reuses.
// GitHub Pages is asked for gzip, which is what is measured here.
//
// Raise a budget on purpose, in the same change that adds the weight.
import { readdirSync, readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'

const ASSET_BUDGET_KB = { js: 110, css: 8 } // gzip; today about 90.3 and 4.3
const TOTAL_BUDGET_KB = 300 // gzip; today about 283.5

const assets = new URL('../dist/assets/', import.meta.url)
const size = (ext) =>
  readdirSync(assets)
    .filter((f) => f.endsWith(`.${ext}`))
    .reduce((sum, f) => sum + gzipSync(readFileSync(new URL(f, assets))).length, 0) / 1024

/** Every file under `root`, recursively, as URLs. */
function files(root) {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = new URL(entry.name + (entry.isDirectory() ? '/' : ''), root)
    return entry.isDirectory() ? files(path) : [path]
  })
}

let failed = false
const check = (label, kb, budget) => {
  const over = kb > budget
  failed ||= over
  console.log(`${over ? 'FAIL' : 'ok  '} ${label}: ${kb.toFixed(1)} kB gzip (budget ${budget} kB)`)
}

for (const [ext, budget] of Object.entries(ASSET_BUDGET_KB)) check(ext, size(ext), budget)

const dist = new URL('../dist/', import.meta.url)
check('total dist/', files(dist).reduce((sum, f) => sum + gzipSync(readFileSync(f)).length, 0) / 1024, TOTAL_BUDGET_KB)

process.exit(failed ? 1 : 0)