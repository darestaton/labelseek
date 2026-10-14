# LabelSeek: Chrome Web Store listing

Everything below is ready to paste into the Developer Dashboard.

## Store listing tab

**Name:** LabelSeek

**Category:** Developer Tools (Accessibility is also a good fit if offered)

**Language:** English

### Short description (limit 132 characters)

See the accessible name of every element on a page, where it came from, and what to fix. Free and private.

(106 characters)

### Long description

LabelSeek shows you what screen readers hear.

Open the side panel on any page and LabelSeek lists every form control, link, button, image and table, along with its accessible name, exactly where that name came from, and what to fix when something is missing or off. Names are also drawn right on the page, so you can see the problem in context.

WHAT YOU GET
• The accessible name of every element, plus its role and description
• Where each name came from: aria-labelledby, aria-label, a native label, legend, caption or alt, the element's own contents, title, or placeholder
• A "How the name was chosen" ladder that shows each step and why it won
• Clear issues with the fix and the WCAG reference, such as missing names, placeholder-only names, label-in-name mismatches (2.5.3), broken aria-labelledby ids, duplicate links and vague link text
• Good, Warnings and No name counts that double as filters
• Outlines and name tags on the page. Hover for a quick card, click a tag to jump to its row. Show or hide whole categories with the eye buttons
• Search and category pills to find what you need fast
• Pause scanning any time to use the page normally
• Copy a single issue as a ticket, copy all issues at once, or export everything to a CSV sorted into Good, Warnings and No name

BUILT FOR
Designers checking a build, developers fixing markup, QA testing a release, and anyone learning how accessible names work. You don't need to be an accessibility expert to read the results.

PRIVATE BY DESIGN
LabelSeek has no servers, no analytics, no accounts and no tracking. It reads the page only while the panel is open and scanning, processes everything on your device, and saves nothing. It's free.

HOW TO USE
1. Click the LabelSeek icon in your toolbar to open the side panel.
2. Browse the list, or click a Good, Warnings or No name tile to filter it.
3. Click a row to see the full breakdown and highlight it on the page.
4. Press pause when you want to click around the page normally.

NOTE
While names are shown on the page, clicks select elements instead of following links or pressing buttons, so you never trigger something by accident. Pause to use the page as normal. LabelSeek scans the main page, not iframes, and it can't read closed shadow roots.

LabelSeek is a helpful starting point, not a full audit. Automated checks can't catch everything, so pair it with manual testing and a real screen reader.

## Images

- Promo tile (small): promo-tile-440x280.png
- Screenshots (1280x800, up to 5 allowed, you have 6 to choose from). Suggested order:
  1. screenshot-1-overview.png
  2. screenshot-3-hover.png
  3. screenshot-4-warnings.png
  4. screenshot-5-noname.png
  5. screenshot-6-paused.png
  (screenshot-2-selected.png is a spare)
- Store icon (128x128): extension/icons/icon-128.png

## Privacy practices tab

### Single purpose

LabelSeek shows the accessible name of every form control, link, button, image and table on the current web page, where each name comes from, and which elements are missing a name or need attention, so designers and developers can find and fix accessibility issues.

### Permission justifications

**Host permission: access to all sites (<all_urls>)** (the one reviewers read closely)

LabelSeek is an accessibility inspector. Its single purpose is to show the accessible name of the elements on whatever page the user is checking. People use it on any site: their own production site, staging and internal servers, local development pages, and competitor or client sites. There's no fixed list of sites to limit it to, so it needs access to the page in the active tab.

How the access is used and limited:
- It runs only after the user opens the LabelSeek side panel on a tab. It never runs on its own in the background and never touches tabs the user isn't inspecting.
- It reads element names, attributes and short HTML snippets to compute accessible names, and draws highlight outlines on the page. It does not change page content, fill forms or click anything.
- Scanning stops when the user pauses it or closes the panel, and the highlights are removed.
- All processing happens on the device. Nothing is sent to any server, and nothing is stored.
- It uses no remote code. All scripts ship in the package.

Why a narrower permission doesn't fit: the panel keeps scanning as the page changes and as the user moves between pages and tabs, so it needs standing access to the tab being inspected rather than a one-time grant. Asking for access site by site would add a prompt on every new page, which defeats a tool meant to be opened on any page.

**scripting**

When the user opens the side panel, LabelSeek injects its scanner script into the active tab to read the page's elements, compute their accessible names, and draw highlight outlines. It's only injected on the tab being inspected, and it's removed when the panel closes.

**sidePanel**

LabelSeek's whole interface lives in Chrome's side panel so it can sit next to the page being inspected.

**clipboardWrite**

Used only when the user clicks a copy button, to copy a page address, a single issue, or all issues as text.

### Remote code

No, I am not using remote code. All JavaScript ships inside the extension package.

### Data usage

Check **Website content** only. LabelSeek reads page text, attributes and HTML snippets in the active tab to compute accessible names. It's processed on the device and never transmitted or stored, but Chrome asks you to disclose data handled on the device as well. Leave everything else unchecked.

Check all three certifications:
- I do not sell or transfer user data to third parties, outside of the approved use cases
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- I do not use or transfer user data to determine creditworthiness or for lending purposes

### Privacy policy URL

The public address where you host privacy.html, for example https://YOUR-GITHUB-USERNAME.github.io/labelseek/privacy.html

## Before you submit

1. Fill in [CONTACT EMAIL] and [YOUR NAME OR COMPANY] in privacy.html.
2. Host privacy.html at a public address and paste it above.
3. Upload the extension zip (labelseek-extension-v0.5.zip), not the source zip.
4. Add a support email or site on the Account tab if the dashboard asks for one.
