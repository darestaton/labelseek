# LabelSeek

![LabelSeek](docs/img/labelseek-wordmark-full.png)

A Chrome side panel that shows the accessible name of every control, link, image and table on a page, where the name came from, and what to fix.

## Folders

- `extension/` is the extension Chrome loads. Everything in it ships as is, except `content.js`, which is built.
- `src/content.src.js` is the source for the page scanner and overlay. It uses [dom-accessibility-api](https://github.com/eps1lon/dom-accessibility-api) to compute names.
- `test/` has a demo checkout page with known issues, plus a Playwright script that loads the extension and walks through the flows.

## Build

```
cd build
npm install esbuild dom-accessibility-api playwright
NODE_PATH=$PWD/node_modules npx esbuild ../src/content.src.js --bundle --format=iife --target=chrome116 --outfile=../extension/content.js
```

## Try it

1. Open `chrome://extensions` and turn on Developer mode.
2. Click Load unpacked and pick the `extension` folder.
3. Pin LabelSeek and click its icon on any website.

## How it fits together

- `background.js` opens the side panel from the toolbar icon.
- `panel.html/css/js` is the side panel. When it opens it injects `content.js` into the active tab and connects to it with a port.
- `content.js` scans the page, sends the results to the panel, draws the outline overlay inside a closed shadow root, and rescans when the page changes. When the panel closes the port disconnects and the page is cleaned up.

## Known limits

- Only scans the top frame, not iframes.
- Open shadow roots are scanned. Closed ones can't be.
- Names show on the page by default, and while they do the page is in inspect mode: clicks pick elements (or their tags) and never follow links or press buttons. Press pause in the panel to stop scanning and use the page normally.
- The panel UI is light mode only.

## Privacy

LabelSeek collects nothing and everything stays in your browser. Read the [privacy policy](docs/privacy.html) (published at https://darestaton.github.io/labelseek/privacy.html once Pages is on).
