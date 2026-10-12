# OrderMe: "This round is on me"

A phone app for the person getting the round. Friends call out what they want, you tap it in, and at the counter you read the order out (or turn the phone to the bartender) instead of trying to remember who wanted what.

**Open it:** <https://peteriron.github.io/order-me-app/>

**Latest release:** [5.3.0](https://github.com/peteriron/order-me-app/releases/tag/v5.3.0): safer share edges and type-aware linting. What changed in each version: [CHANGELOG.md](CHANGELOG.md).

It's a web app you install on your home screen. It works offline, so bad bar Wi-Fi doesn't matter, and everything stays on your phone: no account, no server, no prices or payments. Sharing a Round or your Items puts them in the link itself, so they never pass through a server either. It speaks English and Dutch.

## What it does

- **Tap to count.** Big tiles for every drink and snack, each softly tinted in its emoji's colour so you spot drinks at a glance; each tap adds one, and a small − takes one off. Tiles in the Round get a stronger tint and an amber border. The Round is saved on every tap, so locking the phone or closing the app loses nothing.
- **Search.** Type a few letters to find a drink in a long list: the tiles filter as you type ("rose" finds "Rosé wine"), and tapping one still counts it.
- **Show page.** One tap or swipe shows the whole Round in large type ("3 × 🍺 Duvel") with the total, and keeps the screen awake while you read it out. Counts can still be fixed there, a **Table** number (next to the table icon, under Text and QR) and a **Remark** (below the total) go along with the Round, and the bar at the bottom has **Clear**, the item count and **✓ Ordered**, like the Round page's.
- **Pass the Round on.** Whoever goes to the counter can take over your Round: tap **QR** on the Show page, they scan it, and their app opens with the same drinks and counts, in your order. You can also copy the link, or tap **Text** to send the Round as plain text to a chat.
- **History.** Placed Rounds are kept, grouped by day. "Order again" repeats last week's Round in one tap.
- **Your own Items.** Add, rename or delete drinks and snacks, each with an emoji; swipe a row left to delete it. It starts with a list of common Belgian bar drinks, shown in the app's language: switch to Dutch and "Still water" becomes "Water plat". Drinks you add or rename keep the name you typed.
- **Order that suits you.** The drinks your group orders most move to the front over time, but never while you're tapping. Pin your favourites to keep them first, in the order you drag them into.
- **Share your Items.** Show a QR code (or copy a link) and a friend opens the app with the same drinks and snacks.
- **Undo for the quick actions.** Clearing the Round, deleting an Item, marking a Round as ordered and receiving a friend's Round all happen at once, with **Undo** for 5 seconds instead of an "Are you sure?".
- **Always up to date.** When you're online the app checks for a new version, also while it stays open, and asks whether to update: one tap, and nothing is lost. The bottom of Settings shows which version you're running.
- **Settings.** Language (follows the phone, or pick Nederlands or English), theme (dark by default, light, or follow the phone), an **Add to Home Screen** button, clear history, and reset the app to a fresh install.

## How to use it

### Install it

1. Open <https://peteriron.github.io/order-me-app/> on your phone.
2. Add it to the home screen. The quickest way is the **Add to Home Screen** button at the bottom of the **Settings** page:
   - **Android (Chrome):** the button opens Chrome's install prompt; tap **Install**. The button shows once Chrome offers to install the app, which may not be on your very first visit. Without it: menu (⋮), then **Install app** or **Add to Home screen**.
   - **iPhone (Safari):** the button shows the steps: tap **Share** (on newer iPhones it's under •••), choose **Add to Home Screen**, then tap **Add**.
   - Once the app runs from the home screen, the button is gone.
3. Open **OrderMe** from the home screen. From now on it also works without a connection.

### Get a round

1. The app opens on the **Round** page. As friends call out their order, tap the tiles: one tap is one drink. Each tile is softly tinted in its emoji's colour; once a drink is in the Round, its tile's colour gets stronger and it gets an amber border and a count. Tap − on a tile to take one off, or **Clear** to start over (**Undo** brings it back for 5 seconds).
2. Can't spot a drink in a long list? Tap the **search** icon next to the title and type a few letters: the tiles filter as you type, and tapping one still counts it. The **×** closes the search.
3. Something missing? Tap **+ New** at the end of the grid to add it to your Items and to the Round in one go.
4. At the counter, tap **Show** (or swipe to it). Read the list out, or show the screen to the bartender. Fix counts with − and + if someone changes their mind.
5. Optionally, fill in the **Table** number (the field next to the table icon, under **Text** and **QR**) and a **Remark** (below the total) on the Show page. They're kept in History and sent along when you share the Round as **Text** or **QR**; **Clear** empties them.
6. Tap **✓ Ordered** at the bottom of the Show page when it's done. The Round moves to History and you're back on an empty grid. Tapped it too early? **Undo** appears for 5 seconds.

### Move around

Swipe sideways between the four pages, or tap their tabs at the bottom of the screen. The page you're on is highlighted in amber.

**History** ← **Round** → **Show** → **Settings**

- **Round:** the tiles. Tap to count; the **search** icon next to the title filters them as you type, until you close it with **×**.
- **History:** past Rounds by day. **Order again** puts a past Round back on the grid, and the bin icon deletes one.
- **Show:** the Round in large type, to read out at the counter. Fix counts with − and +, send it as **Text** or pass it on by **QR**, and tap **✓ Ordered** in the bar at the bottom when it's done. The bar also has **Clear** and the item count, like on the Round page.
- **Settings:** first your **Items** (drinks and snacks), then the general settings.
  - Tap a row to edit that Item, or **Add Item** to create one.
  - Swipe a row to the left and tap the red **×** to delete it (or use **Delete** in its edit sheet). Deleted by mistake? Tap **Undo** in the message within 5 seconds.
  - Tap the pin on a row to pin it. Pinned Items come first; drag them by their handle (⠿) to change the order.
  - **Share** shows your Items as a QR code, with **Copy link**.
  - **General**, at the bottom: language, theme, **Add to Home Screen** (only while the app isn't installed yet), and the red **Clear history** and **Reset app** buttons.
  - At the very bottom: the version, build number and date of the app.

### Pass the Round to a friend

When someone else goes to the counter, hand them your Round:

1. On the **Show** page, tap **QR**. The **Share Round** sheet opens.
2. Your friend scans the QR code with their phone camera. Or tap **Copy link** (it says **✓ Copied**) and send it. To put "3× Cola … Total: 5" in a chat instead, tap **Text** on the Show page.
3. Their app opens on **Show** with the same drinks and counts:
   - Drinks they don't have yet are added to their Items.
   - Their own Round is replaced straight away. If that was a mistake, tap **Undo** in the "Round received" message within 5 seconds.
   - On a phone that has never used the app, they first get the starter drinks in their own language.

It's a copy at that moment, not a live link: taps on either phone stay on that phone. Share again to send an update.

Their phone also keeps your order: from then on, its Show page lists those drinks first in the order you had them, also for their next Rounds, so you both read the same list. The next Round they receive replaces that order, and **Reset app** clears it.

### Share your Items with a friend

1. On the **Settings** page, tap **Share** in the Items section.
2. Your friend scans the QR code with their phone camera, or opens the link you copied to them.
3. On a phone that has never used the app, it opens with your Items straight away. If they already have Items, they're asked whether to replace them. Their History is always kept.

Only the Items travel: not your History, Round, pins or settings. Starter drinks arrive in your friend's language.

> **iPhone note:** a link or QR code always opens in Safari, and a home-screen app on iPhone keeps its data separate from Safari. So a friend who already installed the app on an iPhone gets your Round or Items in Safari, not in their installed app. On Android, and for friends who don't have the app yet, it just works.

### Stay up to date

When a new version of OrderMe is out, the app notices by itself while you're online: when you open it, when you come back to it, when the connection returns, and every half hour while it stays open. It then asks **"A new version of OrderMe is available."**

- **Update** loads the new version straight away. Your Round, Items and History are kept.
- **Later** closes the question. The bottom of the Settings page then shows **Update available · Update**, and the next time you open the app it's on the new version anyway.

Without a connection there's nothing to check, and the app keeps working as it is. The bottom of the Settings page always shows the version you're running, its build number and date (for example "Version 5.3.0 · build 117 · 8 Oct 2026").

### Start fresh

In **General**, at the bottom of the Settings page:

- **Clear history** deletes all past Rounds and keeps your Items.
- **Reset app** puts everything back to a fresh install with the newest version (to just get a new version, see [Stay up to date](#stay-up-to-date)): starter Items, no pins, Round, History or settings. It needs an internet connection and asks first.

## For developers

A React + TypeScript + Vite PWA, deployed to GitHub Pages by GitHub Actions on every push to `main`.

- What and why: [docs/prd.md](docs/prd.md). Words used in code and docs: [CONTEXT.md](CONTEXT.md). Design: [docs/look-and-feel.md](docs/look-and-feel.md). Decisions: [docs/adr/](docs/adr/).
- Code is grouped by feature, one folder per tab: `src/round/`, `src/show/`, `src/history/`, `src/settings/` (with the Items section and Catalog rules in `src/items/`). `src/app/` wires them together (app state, saved state, opening share links, the update check); `src/shared/` holds i18n, link packing and common UI.

```sh
# Node 24 (see .node-version / package.json engines) and npm 11 are required.
npm ci             # install exactly what package-lock.json pins
npx playwright install chromium webkit   # once, before the e2e tests
npm run dev        # local dev server
npm test           # unit tests (Vitest)
npm run test:e2e   # end-to-end tests (Playwright: Chromium phone and iPhone/WebKit), against a production build
npm run typecheck && npm run lint
npm run build && npm run preview   # the production build, as deployed
```

### Versions and releases

- The version shown at the bottom of Settings is `version` in `package.json` (semantic versioning; `package.json` is the source of truth). Every release is in [CHANGELOG.md](CHANGELOG.md) and on [GitHub Releases](https://github.com/peteriron/order-me-app/releases).
- Bump it in every PR that changes the app: minor for a feature, patch for a fix, major for a big milestone. Docs- or CI-only changes don't bump it. Always bump with `npm version`, which changes only the app's own version in `package.json` and `package-lock.json` (a text replace can also hit a dependency that happens to have the same version, and CI's `npm ci` then refuses the lock file):

  ```sh
  # e.g. the next feature release after 5.3.0
  npm version 5.4.0 --no-git-tag-version
  npm ci   # check the lock file still installs
  ```
- The build number is the GitHub Actions run number of the deploy (`dev` locally) and the date is the build date; both are filled in at build time (`__BUILD__` in `vite.config.ts`).
- Every push to `main` that passes CI deploys, except one that only changes docs (Markdown files, `docs/`, `LICENSE`, `.github/dependabot.yml`): that would give installed apps an update pop-up with nothing new in it. Open apps notice the new version on their next check (start, coming back to the app, coming back online, or every 30 minutes) and offer **Update**; see `src/app/updates.ts`.
- Making a GitHub release: PRs are squash-merged, which creates a new commit on `main`, so the tag must be made after the merge.
  1. In the release PR, bump the version, add its notes at the top of `CHANGELOG.md`, and update the **Latest release** line at the top of this README.
  2. Create a draft release (no tag yet): `gh release create v5.3.0 --draft --target main --title "OrderMe 5.3.0" --notes-file notes.md`.
  3. After the PR is merged and deployed, publish it on the merge commit, which creates the tag there: `gh release edit v5.3.0 --target <merge commit> --draft=false --latest`.

### Security

- Share links are untrusted input: `src/shared/shareLink.ts` and the two link formats accept a link whole or not at all, with limits on size, Items, names and counts.
- The built page carries a Content-Security-Policy (`vite.config.ts`): only the app's own scripts, styles and connections, plus `data:` images for the QR codes. The inline theme script, `src/settings/themeBeforePaint.js`, is allowed by its hash, so editing it needs nothing else.
- CI's GitHub Actions are pinned to commits; Dependabot proposes npm and Actions updates monthly (`.github/dependabot.yml`), keeping `@types/node` on the Node major CI runs on.
- Pull requests are checked for vulnerable dependencies (dependency review), CI fails on known advisories in shipped packages, and zizmor, CodeQL, gitleaks and OpenSSF Scorecard guard the workflows and the history. Every run attaches a CycloneDX SBOM.
- Node and npm are pinned (`.node-version`, `engines`, `packageManager`), and CI reads the same version file.
- More in the PRD's *Security* and *Updates and version* notes.
