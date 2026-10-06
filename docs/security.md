# Security model

OrderMe is a static web app: no server, no account, no tokens, no network calls of its own. Everything the Operator enters stays on the phone. That removes most of what a client-server app has to defend (credentials, API validation, rate limiting); what is left is below.

## What is untrusted

| Input | Where it comes from | Defence |
| --- | --- | --- |
| A shared link (`#items=…`, `#round=…`) | Anyone who can show a QR code or send a link | `shareLink.ts` accepts only base64url that inflates to at most 64 KB and decodes as UTF-8; `MAX_LINK_ITEMS` (200) caps the Items. A link is used whole or not at all. Names and emoji are rendered as text by React, never as HTML. |
| The saved state (`localStorage`, key `order-me`) | An older or newer version of the app, another project on the same GitHub Pages origin, or damage | `storage.ts` checks the version and shape, then `validate.ts` checks every Item, placed Round, count, pin and setting. Bad entries are dropped, the rest is kept, so one bad entry can't crash the app on every launch. |

## Never lose the Operator's data silently

When a saved state can't be used (unknown version after a rollback, unreadable JSON) or something had to be dropped from it, the original text is first copied to `order-me.unreadable`, then the app carries on. Reset app removes that copy too, so a reset leaves nothing behind. Only one copy is kept: a later unusable save replaces it.

## Content-Security-Policy

GitHub Pages can't send headers, so `vite.config.ts` adds a `<meta>` policy to the build: only the app's own scripts, styles and connections, `data:` images (the QR codes), no objects, no `<base>`, no forms. The one inline script (the theme, applied before first paint) is allowed by its hash. `e2e/security.spec.ts` fails if the policy blocks anything the app itself does.

What a `<meta>` policy can't do: `frame-ancestors` is ignored there, so the page can be framed by another site. Fixing that needs response headers, which means hosting that can send them.

## Crashes

`ErrorBoundary` (in `src/shared/ui/`) sits above the app. A render error shows a message and a Reload button instead of a blank screen. The Round is saved on every tap, so reloading loses nothing.

## In CI

- **CodeQL** (`.github/workflows/codeql.yml`): JavaScript/TypeScript and the workflow files, with the `security-extended` queries, on pull requests, on `main` and weekly.
- **Gitleaks** (`.github/workflows/gitleaks.yml`): scans the full history for secrets. The binary is downloaded and checked against its published SHA-256.
- **actionlint**: lints the workflow files in `ci.yml`.
- **Actions pinned to commits**, with Dependabot proposing updates monthly.
- **Accessibility** (`e2e/a11y.spec.ts`): axe-core on all four pages in both themes, failing on serious or critical violations.
- **Budgets**: unit-test coverage floor (`vite.config.ts`) and gzip size of the JS and CSS (`scripts/check-bundle-size.mjs`).

## Not applicable here

Token storage, certificate pinning, auth and 401 handling, idempotency keys and rate limiting all belong to an app with a backend. If OrderMe ever gets one, they come back on the list.
