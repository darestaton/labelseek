# LabelSeek

Free, open-source Chrome (MV3) side-panel extension that shows the accessible name of every control, link, image and table on a page, where the name came from, and WCAG-referenced issues. Built by Darrien Staton (Dare), a senior product designer and CPACC-certified accessibility advocate. Repo: darestaton/labelseek (all lowercase). Privacy policy: https://darestaton.github.io/labelseek/privacy.html (served from `docs/` via GitHub Pages; the URL is case-sensitive).

## Working with Dare

- LabelSeek is MIT licensed (see `LICENSE`), so calling it open source is accurate. If you add or update a bundled dependency or font, update `THIRD-PARTY-NOTICES.md` too, and ship it inside the extension zip at the next release.
- No em dashes in anything written. Casual, direct tone. Give a recommendation, not a menu of options.
- Dare is an accessibility expert. Do not get WCAG details wrong, and cite criteria accurately.
- LabelSeek must itself meet WCAG 2.2 AA: text contrast 4.5:1, non-text 3:1, 24px minimum targets (aim for 44px), visible focus, keyboard operable, forced-colors support, reduced-motion support, no flashing. Check this on every UI change.

## Layout

- `extension/` is what Chrome loads and what ships to the Web Store. Everything in it ships as is, except `content.js`, which is built.
- `src/content.src.js` is the source for the page scanner and the on-page overlay. Never edit `extension/content.js` by hand.
- `extension/panel.html`, `panel.css`, `panel.js` are the side panel. `background.js` only opens the panel from the toolbar icon.
- `docs/` holds `privacy.html` (published by GitHub Pages) and `store-listing.md` (Web Store copy and permission justifications).
- `test/` holds `demo.html` (checkout page with known issues), `big.html` (stress page), and Playwright scripts.

## Build and test

```
cd build
npm install
NODE_PATH=$PWD/node_modules npx esbuild ../src/content.src.js --bundle --format=iife --target=chrome116 --outfile=../extension/content.js
```

Run Playwright scripts from `build/` so ESM resolution works. Load the extension with `launchPersistentContext` and `--load-extension`, under `xvfb-run` on Linux. Rebuild `content.js` after any change to `src/content.src.js`.

## Design decisions to keep

- Names are drawn on the page by default; each category has an eye toggle. There is no global "show all names" switch.
- Pause stops scanning completely and clears highlights so the page works normally. The paused list is shown in grayscale, never reduced opacity (opacity breaks text contrast).
- While names are shown, the page is in inspect mode: clicks pick elements and never follow links or press buttons.
- Export CSV is a split button. The arrow opens a menu with Copy all issues (warnings and missing names only) and Copy filtered (everything the list shows now, good elements included).
- Warnings mean a name exists but is weak or likely wrong. No name means nothing is announced. LabelSeek only checks naming, not contrast or other WCAG areas.
- The on-page overlay is `aria-hidden` (the panel has the same information), the hover card appears after a short delay and Escape dismisses it, and on-page name tags are clamped to stay inside the viewport.
- The panel is light mode only. Brand teal is #026E6C; the wordmark is "Label" in near-black and "Seek" in teal.

## Releasing to the Chrome Web Store

Live listing: https://chromewebstore.google.com/detail/pnlehnhkjodkhfkianhckhamomjhhgne

1. Bump `version` in `extension/manifest.json`.
2. Rebuild `content.js` and run the tests.
3. Zip the contents of `extension/` (not the folder itself, and not `test/`, `src/` or `build/`).
4. Upload under Package in the Web Store developer dashboard and submit for review. The extension requests `<all_urls>`, so reviews take longer; do not change permissions without a reason.
