// Two budgets on the built app. Run after `npm run build`.
//
//  1. The app code: the JS and CSS in dist/assets. A phone on bad bar Wi-Fi downloads these once, then runs from
//     the service worker's cache.
//  2. Everything: the whole of dist/, which is what a first visit actually transfers (the app code, the icons, the
//     web app manifest, the service worker and the Workbox runtime it loads separately). The icons are the reason
//     this second budget exists: they are not in dist/assets, and PNG barely compresses, so they are most of a
//     first visit.
//
// Sizes are gzip, which is what GitHub Pages serves (it does not do brotli). A budget is not a measured transfer:
// HTTP/2 framing and per-request headers are not counted here. Raise a budget on purpose, in the same change that
// adds the weight.
import { readdirSync, readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'

const ASSET_BUDGET_KB = { js: 110, css: 8 } // gzip; today about 93.5 and 4.3
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