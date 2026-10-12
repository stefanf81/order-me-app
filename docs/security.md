# Security model

OrderMe is a static web app: no app backend, account or tokens. Saved state stays on-device by default. When the Operator chooses to share a Catalog or Round, its selected contents are encoded in the link fragment; browsers omit fragments from HTTP requests to the app host. Before a reset, the app makes a cache-busted request to its own URL to check that the host is reachable; if it isn't, reset stops (`src/settings/reset.ts`). Normal page loads, Workbox precaching and service-worker update checks also make same-origin requests for app assets. That removes most of what a client-server app has to defend (credentials, API validation, rate limiting); what is left is below.

## What is untrusted

| Input | Where it comes from | Defence |
| --- | --- | --- |
| A shared link (`#items=…`, `#round=…`) | Anyone who can show a QR code or send a link | `shareLink.ts` accepts only base64url of at most 96 KB that inflates to at most 64 KB and decodes as UTF-8; `MAX_LINK_ITEMS` (200) caps the Items. A Round's count above 999 travels as repeated rows of the same Item, merged by the receiver and split again when re-shared; a Round whose counts would need more than 200 rows is not shareable. A link is used whole or not at all. Names and emoji are rendered as text by React, never as HTML. |
| The saved state (`localStorage`: `order-me`, `order-me.round`) | An older or newer version of the app, another project on the same GitHub Pages origin, or damage | `storage.ts` checks the version and shape of both keys, then `validate.ts` checks every Item, placed Round, count, pin and setting. Bad entries are dropped, the rest is kept, so one bad entry can't crash the app on every launch. |

## How a taken-in link is applied

A recognized shared-link fragment is cleared immediately, so a reload won't take it in again. Decoding is whole-or-nothing; an invalid link is ignored with a toast (`src/app/useSharedLinks.ts`). A Shared Catalog silently replaces the starter Catalog only when the app is first opened directly from that link; otherwise, the app asks for confirmation (ADR-0004). A shared Round is applied without confirmation: it replaces the Round, Show order, table and remark, and adds any Items missing from the receiver's Catalog. The Undo toast restores the previous Round (including its table and remark), restores the Show order and removes those added Items.

## Two saves, so a tap stays cheap

The composing Round (`order-me.round`) is written on every tap; the slow-changing state (`order-me`: Catalog, History, settings, pins, Show order) only when one of those changes. A tap therefore never rewrites History, and a phone with a long History still saves quickly. Saves from before v7 (everything in one key) are migrated on load: the Round is written first, so a failed write leaves the old save untouched.

## Never lose the Operator's data silently

When a saved state can't be used (unknown version after a rollback, unreadable JSON) or something had to be dropped from it, the original text is first copied to a backup key (`order-me.unreadable`, `order-me.unreadable.round`), then the app carries on. Reset app removes those copies too, so a reset leaves nothing behind. Only one copy per key is kept: a later unusable save replaces it.

## Content-Security-Policy

GitHub Pages can't send headers, so `vite.config.ts` adds a `<meta>` policy to the build. It starts from `default-src 'none'`, so anything not named is refused, and names only what the app uses: its own scripts and styles, `data:` images (the QR codes), the manifest, the service worker, and the one same-origin request Reset app makes to check whether the host answers. Fonts, media, frames, objects, `<base>` and form submission are all `none`. The one inline script (the theme, applied before first paint) is allowed by its hash.

`e2e/security.spec.ts` checks three things: that the policy blocks nothing the app itself does, that it contains exactly the expected directives (no repeats, no extras), and that an inline script it does not name is genuinely blocked rather than merely absent from the list. This is defence in depth, not a guarantee — `'self'` covers the whole shared GitHub Pages origin (below).

What a `<meta>` policy can't do: `frame-ancestors` is ignored there, so the page can be framed by another site. Fixing that needs response headers, which means hosting that can send them. Accepted for now: there are no sessions or credentials to steal, and the worst a framed tap can reach is an in-app action with its own confirm or Undo.

## The shared origin

GitHub Pages serves every project of an account from one origin (`peteriron.github.io`), which shares storage, Cache Storage and service workers. The app defends the data it can: it validates everything it reads (above), and a reset only touches its own scope and keys. A sibling project at the account root could, however, register a service worker that controls this app's pages; that is a hosting-level risk accepted for now, and the reason a per-app domain would be the better long-term home. ADR-0004 records the related iOS storage-separation limitation.

## Crashes

`ErrorBoundary` (in `src/shared/ui/`) sits above the app. A render error shows a message, a Reload button and a **Reset the app** button instead of a blank screen. The Round is saved on every tap, so reloading loses nothing; Reset clears only this app's keys (`APP_KEYS` in `src/app/storage.ts`) and reloads, which is the way out when the crash comes from the saved state itself.

When a save fails (storage blocked or full), the app says so once with a toast instead of silently not saving.

## In CI

- **CodeQL** (`.github/workflows/codeql.yml`): JavaScript/TypeScript and the workflow files, with the `security-extended` queries, on pull requests, on `main` and weekly.
- **Gitleaks** (`.github/workflows/gitleaks.yml`): scans the full history for secrets. The binary is downloaded and checked against its published SHA-256.
- **Dependency review** (`.github/workflows/dependency-review.yml`): refuses a pull request that adds a high or critical advisory.
- **npm audit** (`ci.yml`): known advisories in anything we ship fail the build; Dependabot proposes the fix.
- **zizmor** (`ci.yml`): static analysis of the workflow files themselves, on top of actionlint and CodeQL.
- **OpenSSF Scorecard** (`.github/workflows/scorecard.yml`): grades the repository's supply-chain practices weekly and on `main`.
- **SBOM** (`ci.yml`): every run attaches a CycloneDX SBOM of the dependency tree.
- **actionlint**: lints the workflow files in `ci.yml`.
- **Actions pinned to commits**, with Dependabot proposing updates monthly.
- **Accessibility** (`e2e/a11y.spec.ts`): axe-core on all four pages in both themes, failing on serious or critical violations.
- **Budgets**: a unit-test coverage floor (`vite.config.ts`), and gzip size of both the JS and CSS in `dist/assets` and the whole of `dist/` (`scripts/check-bundle-size.mjs`). The second exists because the icons are most of the precached build and are not in `dist/assets`. Both are compressed sizes of the built files, not a measured transfer.

## Not applicable here

Token storage, certificate pinning, auth and 401 handling, idempotency keys and rate limiting all belong to an app with a backend. If OrderMe ever gets one, they come back on the list.
