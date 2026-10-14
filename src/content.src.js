// LabelSeek content script: scans the page, computes accessible names, draws the overlay.
// Injected on demand by the side panel. Talks to the panel through a port.
import { computeAccessibleName, computeAccessibleDescription, getRole } from 'dom-accessibility-api';

(() => {
  if (window.__labelseekLoaded) return;
  window.__labelseekLoaded = true;

  // ---------- helpers ----------
  const txt = (s) => (s || '').replace(/\s+/g, ' ').trim();
  const trunc = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
  const norm = (s) => txt(s).toLowerCase().replace(/[^\p{L}\p{N} ]+/gu, '').replace(/\s+/g, ' ').trim();
  const q = (s) => '“' + s + '”';

  const CATS = [
    ['forms', [
      'input:not([type=hidden]):not([type=button]):not([type=submit]):not([type=reset]):not([type=image])',
      'select', 'textarea', 'fieldset',
      '[role=textbox]', '[role=searchbox]', '[role=combobox]', '[role=checkbox]', '[role=radio]',
      '[role=switch]', '[role=slider]', '[role=spinbutton]', '[role=listbox]', '[role=radiogroup]'
    ].join(',')],
    ['actions', [
      'a[href]', 'area[href]', 'button', 'summary',
      'input[type=button]', 'input[type=submit]', 'input[type=reset]', 'input[type=image]',
      '[role=button]', '[role=link]', '[role=menuitem]', '[role=menuitemcheckbox]', '[role=menuitemradio]', '[role=tab]'
    ].join(',')],
    ['images', 'img, [role=img]'],
    ['tables', 'table, [role=table], [role=grid], [role=treegrid], th, [role=columnheader], [role=rowheader]']
  ];
  const MAX = 3000;

  const CONTENT_ROLES = new Set(['button', 'link', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'tab',
    'checkbox', 'radio', 'switch', 'option', 'columnheader', 'rowheader', 'cell', 'gridcell', 'treeitem', 'heading']);
  const GROUP_ROLES = new Set(['group', 'radiogroup']);
  const VOID = new Set(['input', 'img', 'br', 'hr', 'area', 'meta', 'link', 'source', 'col', 'embed', 'wbr', 'track']);
  const VAGUE = new Set(['click here', 'here', 'read more', 'more', 'learn more', 'link', 'this', 'click', 'details', 'more info']);

  let host = null, shadow = null, layer = null, card = null, inspectStyle = null;
  let port = null;
  const ids = new WeakMap();
  let nextId = 1;
  let byId = new Map();
  let items = [];
  const view = { selected: null, peek: null, hover: null, master: false, shown: null };

  function idFor(el) {
    let id = ids.get(el);
    if (!id) { id = nextId++; ids.set(el, id); }
    return id;
  }

  // ---------- collecting ----------
  function* allRoots(root) {
    yield root;
    for (const el of root.querySelectorAll('*')) if (el.shadowRoot) yield* allRoots(el.shadowRoot);
  }

  function isHidden(el) {
    if (host && (el === host || host.contains(el))) return true;
    if (el.closest('[aria-hidden="true"]')) return true;
    if (typeof el.checkVisibility === 'function') return !el.checkVisibility({ visibilityProperty: true });
    const cs = getComputedStyle(el);
    return cs.display === 'none' || cs.visibility === 'hidden';
  }

  function collect() {
    const found = [];
    const seen = new Set();
    for (const root of allRoots(document)) {
      for (const [cat, sel] of CATS) {
        for (const el of root.querySelectorAll(sel)) {
          if (seen.has(el)) continue;
          seen.add(el);
          if (isHidden(el)) continue;
          found.push({ el, cat });
          if (found.length >= MAX) return found;
        }
      }
    }
    // keep document order so the list reads like the page
    found.sort((a, b) => {
      if (a.el.getRootNode() !== b.el.getRootNode()) return 0;
      const p = a.el.compareDocumentPosition(b.el);
      return p & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : p & Node.DOCUMENT_POSITION_PRECEDING ? 1 : 0;
    });
    return found;
  }

  // ---------- name sources ----------
  function refById(el, id) {
    const r = el.getRootNode();
    return (r.getElementById ? r.getElementById(id) : null) || document.getElementById(id);
  }

  function labelText(label) {
    const c = label.cloneNode(true);
    c.querySelectorAll('input, select, textarea, button').forEach((n) => n.remove());
    return txt(c.textContent);
  }

  function nativeSource(el) {
    const tag = el.localName;
    if ('labels' in el && el.labels && el.labels.length && tag !== 'button') {
      const parts = [...el.labels].map(labelText).filter(Boolean);
      const wraps = [...el.labels].some((l) => l.contains(el));
      return { label: '<label>', how: wraps ? 'wrapping <label>' : 'label[for]', value: parts.join(' ') };
    }
    if (tag === 'fieldset') {
      const lg = [...el.children].find((c) => c.localName === 'legend');
      return { label: '<legend>', how: '<legend>', value: lg ? txt(lg.textContent) : null };
    }
    if (tag === 'table') {
      const cap = el.querySelector(':scope > caption');
      return { label: '<caption>', how: '<caption>', value: cap ? txt(cap.textContent) : null };
    }
    if (tag === 'img' || tag === 'area' || (tag === 'input' && el.type === 'image')) {
      if (!el.hasAttribute('alt')) return { label: 'alt', how: 'alt', value: null, noAlt: true };
      const alt = el.getAttribute('alt');
      return { label: 'alt', how: 'alt', value: txt(alt), emptyAlt: txt(alt) === '' };
    }
    if (tag === 'svg') {
      const t = [...el.children].find((c) => c.localName === 'title');
      return { label: 'SVG <title>', how: 'SVG <title>', value: t ? txt(t.textContent) : null };
    }
    if (tag === 'figure') {
      const fc = el.querySelector(':scope > figcaption');
      return { label: '<figcaption>', how: '<figcaption>', value: fc ? txt(fc.textContent) : null };
    }
    if (tag === 'input' && ['submit', 'reset', 'button'].includes(el.type)) {
      const def = el.type === 'submit' ? 'Submit' : el.type === 'reset' ? 'Reset' : '';
      return { label: 'value', how: 'value', value: txt(el.value) || def || null };
    }
    return { label: 'label, legend, caption or alt', how: null, value: null, na: true };
  }

  function hasIconOnly(el) {
    return !txt(el.innerText || el.textContent) && !!el.querySelector('svg, img, i, [class*="icon"]');
  }

  function analyze(el, cat) {
    let role = null;
    try { role = getRole(el); } catch (e) { /* ignore */ }
    const tag = el.localName;
    if (!role) role = tag === 'svg' ? 'img' : tag === 'summary' ? 'button' : tag;
    let name = '';
    try { name = txt(computeAccessibleName(el)); } catch (e) { name = ''; }
    let descText = '';
    try { descText = txt(computeAccessibleDescription(el)); } catch (e) { descText = ''; }

    // candidates
    const lbAttr = el.getAttribute('aria-labelledby');
    let lb = null, lbMissing = [];
    if (lbAttr && lbAttr.trim()) {
      const list = lbAttr.trim().split(/\s+/);
      const parts = [];
      for (const id of list) {
        const n = refById(el, id);
        if (!n) lbMissing.push(id); else parts.push(txt(n.textContent));
      }
      lb = { ids: list, value: txt(parts.join(' ')) };
    }
    const al = txt(el.getAttribute('aria-label'));
    const nat = nativeSource(el);
    const isTextField = ['textbox', 'searchbox', 'combobox', 'spinbutton'].includes(role) || tag === 'textarea';
    const ph = isTextField ? txt(el.getAttribute('placeholder') || el.getAttribute('aria-placeholder')) : '';
    const tit = txt(el.getAttribute('title'));
    const contentAllowed = CONTENT_ROLES.has(role) || tag === 'button' || tag === 'a' || tag === 'summary';
    const visibleText = contentAllowed && !(tag === 'input') ? txt(el.innerText || el.textContent) : '';

    // the library skips placeholder; browsers use it as a last resort
    if (!name && ph) name = ph;

    const decorative = (cat === 'images') && (role === 'presentation' || role === 'none' || (nat.emptyAlt && !al && !lb && !tit));
    const N = norm(name);
    let win = null;
    if (name) {
      if (lb && lb.value && norm(lb.value) === N) win = 'lb';
      else if (al && norm(al) === N) win = 'al';
      else if (nat.value && norm(nat.value) === N) win = 'nat';
      else if (contentAllowed && tag !== 'input' && (visibleText || el.querySelector('img[alt]:not([alt=""]), [aria-label], [aria-labelledby], svg title'))) win = 'con';
      else if (tit && norm(tit) === N) win = 'tit';
      else if (contentAllowed && tag !== 'input') win = 'con';
      else if (ph && norm(ph) === N) win = 'ph';
      else if (nat.value) win = 'nat';
      else win = 'con';
    }

    const conValue = contentAllowed && tag !== 'input'
      ? (win === 'con' ? name : visibleText)
      : null;
    const steps = [
      ['lb', 'aria-labelledby', lb ? (lb.value ? lb.ids.map((i) => '#' + i).join(' ') + ' → ' + q(lb.value) : 'Points to ' + lb.ids.map((i) => '#' + i).join(' ') + ', nothing found') : null, !!(lb && lb.value)],
      ['al', 'aria-label', al ? q(al) : null, !!al],
      ['nat', nat.label, nat.na ? 'Doesn’t apply to ' + role : nat.noAlt ? 'No alt attribute' : nat.emptyAlt ? 'alt="" marks it decorative' : nat.value ? q(nat.value) + (nat.how && nat.how !== nat.label ? ' via ' + nat.how : '') : 'Not set', !!nat.value],
      ['con', 'text inside', !(contentAllowed && tag !== 'input') ? 'Doesn’t apply to ' + role : conValue ? q(trunc(conValue, 80)) : (hasIconOnly(el) ? 'Only an icon, no text' : 'Empty'), !!conValue],
      ['tit', 'title', tit ? q(tit) : null, !!tit],
      ['ph', 'placeholder', !isTextField ? 'Doesn’t apply to ' + role : ph ? q(ph) : null, !!ph]
    ].map(([key, label, value, has]) => ({
      key, label,
      value: value == null ? 'Not set' : value,
      state: win === key ? 'winner' : has ? 'overridden' : 'absent'
    }));

    const srcLabel = {
      lb: 'aria-labelledby', al: 'aria-label', nat: nat.how || nat.label, con: 'contents', tit: 'title', ph: 'placeholder'
    };
    let src = win ? srcLabel[win] : decorative ? (nat.emptyAlt ? 'alt=""' : 'role="' + role + '"') : 'none found';
    if (win === 'tit' && norm(descText) === N) descText = '';

    // description source
    let descSrc = '';
    if (descText) {
      const db = el.getAttribute('aria-describedby');
      if (db && db.trim()) descSrc = 'aria-describedby → ' + db.trim().split(/\s+/).map((i) => '#' + i).join(' ');
      else if (el.hasAttribute('aria-description')) descSrc = 'aria-description';
      else if (tit && win !== 'tit') descSrc = 'title';
      else descSrc = 'other';
    }

    // ---------- issues (one per element, worst first) ----------
    let sev = null, issue = '', why = '', fix = '', wcag = '';
    const set = (s, i, w, f, c) => { if (!sev) { sev = s; issue = i; why = w; fix = f; wcag = c; } };
    const isGroup = GROUP_ROLES.has(role) || tag === 'fieldset';
    const isTable = ['table', 'grid', 'treegrid'].includes(role) || tag === 'table';
    const isHeader = ['columnheader', 'rowheader'].includes(role) || tag === 'th';
    const missingNote = lbMissing.length ? ' Its aria-labelledby points to ' + lbMissing.map((i) => '#' + i).join(' ') + ', which doesn’t exist.' : '';

    if (!name && !decorative) {
      if (cat === 'images') {
        if (nat.noAlt && (tag === 'img' || tag === 'area')) set('error', 'Image has no alt attribute', 'Some screen readers fall back to reading the file name, like “IMG_4471.jpg”.' + missingNote, 'Add alt text that describes the image, or alt="" if it’s decorative.', 'WCAG 1.1.1 Non-text Content · Level A');
        else set('error', 'Image has no name', 'Screen readers can’t describe this image.' + missingNote, tag === 'svg' ? 'Add aria-label or a <title> inside the SVG. If it’s decorative, add aria-hidden="true".' : 'Add aria-label. If it’s decorative, add aria-hidden="true".', 'WCAG 1.1.1 Non-text Content · Level A');
      } else if (role === 'link') {
        const icon = hasIconOnly(el);
        set('error', icon ? 'Icon link has no name' : 'Link has no name', 'Screen readers announce just “link”, so people can’t tell where it goes.' + missingNote, icon ? 'Add aria-label to the link, or give the image inside it alt text.' : 'Add link text or an aria-label.', 'WCAG 2.4.4 Link Purpose · Level A');
      } else if (cat === 'actions') {
        const icon = hasIconOnly(el);
        const r = role === 'button' ? 'button' : role;
        set('error', icon ? 'Icon ' + r + ' has no name' : r.charAt(0).toUpperCase() + r.slice(1) + ' has no name', 'Screen readers announce this as just “' + r + '”, with no hint of what it does.' + missingNote, icon ? 'Add an aria-label that says what it does, like aria-label="Search".' : 'Add visible text or an aria-label.', 'WCAG 4.1.2 Name, Role, Value · Level A');
      } else if (isGroup) {
        set('warn', 'Group has no name', 'Screen readers won’t announce what this set of options is about.' + missingNote, tag === 'fieldset' ? 'Add a <legend> as the first child of the fieldset.' : 'Add aria-labelledby pointing at the group’s heading.', 'WCAG 1.3.1 Info and Relationships · Level A');
      } else if (isHeader) {
        set('warn', 'Empty table header', 'Screen readers have nothing to announce for this column or row.', 'Add header text, or use <td> if the cell isn’t a header.', 'WCAG 1.3.1 Info and Relationships · Level A');
      } else if (cat === 'forms') {
        set('error', 'Field has no label', 'Screen readers announce only the field type, so people don’t know what to enter.' + missingNote, el.id ? 'Add <label for="' + el.id + '">, or an aria-label.' : 'Add a <label> around or linked to the field, or an aria-label.', 'WCAG 4.1.2 Name, Role, Value · Level A');
      }
    }
    if (lbMissing.length && name) {
      set('warn', 'aria-labelledby points to a missing id', 'It references ' + lbMissing.map((i) => '#' + i).join(' ') + ', which doesn’t exist on the page, so part of the intended name is lost.', 'Fix the id, or remove it from aria-labelledby.', 'WCAG 4.1.2 Name, Role, Value · Level A');
    }
    if (name && (win === 'al' || win === 'lb')) {
      const visible = contentAllowed && tag !== 'input' ? visibleText : (nat.how && nat.how.includes('label') ? nat.value : '');
      if (visible && /[\p{L}\p{N}]{2,}/u.test(visible) && !norm(name).includes(norm(visible))) {
        const attr = win === 'al' ? 'aria-label' : 'aria-labelledby';
        set('warn', 'Visible text isn’t in the name', 'Sighted users see ' + q(trunc(visible, 60)) + ', but the name is ' + q(trunc(name, 60)) + '. Voice control users saying “click ' + trunc(visible, 40) + '” won’t reach it.', 'Remove ' + attr + ', or make it start with ' + q(trunc(visible, 60)) + '.', 'WCAG 2.5.3 Label in Name · Level A');
      }
    }
    if (win === 'ph') {
      set('warn', 'Placeholder is the only name', 'Placeholder text disappears once someone types and isn’t announced consistently across screen readers.', 'Add a visible <label>, or aria-label=' + '"' + trunc(ph, 40) + '".', 'WCAG 3.3.2 Labels or Instructions · Level A');
    }
    if (win === 'tit') {
      set('warn', 'Title is the only name', 'Title tooltips only show on mouse hover, so touch and keyboard users never see them.', cat === 'forms' ? 'Add a visible <label>.' : 'Add visible text or an aria-label.', cat === 'forms' ? 'WCAG 3.3.2 Labels or Instructions · Level A' : 'WCAG 4.1.2 Name, Role, Value · Level A');
    }
    if (cat === 'images' && name && win === 'nat' && /(\.(jpe?g|png|gif|webp|svg|avif|bmp|tiff?)$)|^(img|image|dsc|photo|pic|screenshot)[-_ ]?\d*$/i.test(name)) {
      set('warn', 'Alt text looks like a file name', 'Screen readers will read ' + q(name) + ', which doesn’t describe the image.', 'Describe what the image shows, or use alt="" if it’s decorative.', 'WCAG 1.1.1 Non-text Content · Level A');
    }

    return {
      id: idFor(el), cat, role, name, src, sev, issue, why, fix, wcag,
      decorative: !!decorative && !name,
      optional: !name && !sev && !decorative,
      desc: descText ? { text: descText, src: descSrc } : null,
      steps, sel: selectorFor(el), code: snippet(el),
      href: role === 'link' ? (el.href || el.getAttribute('href') || '') : '',
      imgSrc: tag === 'img' ? (el.currentSrc || el.src || '') : tag === 'input' && el.type === 'image' ? (el.src || '') : '',
      raw: { labelledby: lb ? lb.value : '', label: al, native: nat.value || '', nativeHow: nat.how || '', text: visibleText, title: tit, placeholder: ph },
      vagueCheck: role === 'link' && !sev ? norm(name) : ''
    };
  }

  // link checks that need the whole page
  function pageChecks(list) {
    const groups = new Map();
    for (const it of list) {
      if (it.role !== 'link' || !it.name) continue;
      const k = norm(it.name);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(it);
    }
    for (const [, links] of groups) {
      const hrefs = new Set(links.map((l) => l.href.split('#')[0]));
      if (links.length > 1 && hrefs.size > 1) {
        for (const it of links) if (!it.sev) {
          it.sev = 'warn';
          it.issue = 'Same name, ' + hrefs.size + ' different places';
          it.why = 'In a screen reader’s links list, ' + links.length + ' ' + q(trunc(it.name, 40)) + ' links can’t be told apart, but they go to ' + hrefs.size + ' different pages.';
          it.fix = 'Add context to each, like ' + q(it.name + ' about [topic]') + ', or use aria-describedby.';
          it.wcag = 'WCAG 2.4.4 Link Purpose · Level A';
        }
      }
    }
    for (const it of list) {
      if (!it.sev && it.vagueCheck && VAGUE.has(it.vagueCheck)) {
        it.sev = 'warn';
        it.issue = 'Link text is vague';
        it.why = q(it.name) + ' doesn’t say where the link goes when it’s read on its own.';
        it.fix = 'Say where it goes, like “Read more about shipping”.';
        it.wcag = 'WCAG 2.4.4 Link Purpose · Level A';
      }
      delete it.vagueCheck;
    }
  }

  // ---------- selector + code ----------
  function selectorFor(el) {
    const root = el.getRootNode();
    const tag = el.localName;
    const uniq = (s) => { try { return root.querySelectorAll(s).length === 1; } catch (e) { return false; } };
    if (el.id && uniq('#' + CSS.escape(el.id))) return tag + '#' + CSS.escape(el.id);
    const parts = [];
    let cur = el;
    while (cur && cur.nodeType === 1 && parts.length < 5) {
      let part = cur.localName;
      if (cur.id && uniq('#' + CSS.escape(cur.id))) { parts.unshift(part + '#' + CSS.escape(cur.id)); break; }
      const cls = [...cur.classList].filter((c) => /^[a-zA-Z][\w-]*$/.test(c) && c.length < 28).slice(0, 2);
      if (cls.length) part += '.' + cls.join('.');
      const parent = cur.parentElement;
      if (parent) {
        const same = [...parent.children].filter((c) => c.matches(part));
        if (same.length > 1) part += ':nth-of-type(' + ([...parent.children].filter((c) => c.localName === cur.localName).indexOf(cur) + 1) + ')';
      }
      parts.unshift(part);
      if (uniq(parts.join(' > '))) break;
      cur = parent;
    }
    return parts.join(' > ');
  }

  function snippet(el) {
    const tag = el.localName;
    const attrs = [...el.attributes]
      .filter((a) => a.name !== 'style' && !a.name.startsWith('data-') && !a.name.startsWith('on'))
      .map((a) => (a.value === '' && a.name !== 'alt' ? a.name : a.name + '="' + trunc(a.value.replace(/\s+/g, ' '), 48) + '"'));
    let open = '<' + tag + (attrs.length ? ' ' + attrs[0] + attrs.slice(1).map((a) => (attrs.join(' ').length > 40 ? '\n  ' : ' ') + a).join('') : '') + '>';
    if (VOID.has(tag)) return open;
    let inner;
    const kids = el.children;
    const t = txt(el.textContent);
    if (tag === 'select' || tag === 'textarea' || tag === 'table' || tag === 'fieldset') inner = '…';
    else if (!kids.length) inner = trunc(t, 60);
    else if (kids.length === 1 && !txt(el.innerText || '') ) inner = '<' + kids[0].localName + '>…</' + kids[0].localName + '>';
    else inner = t && t.length <= 60 && kids.length <= 2 ? t : '…';
    const close = '</' + tag + '>';
    if (!open.includes('\n') && (open + inner + close).length <= 56) return open + inner + close;
    return open + '\n  ' + inner + '\n' + close;
  }

  // ---------- scanning ----------
  let lastScanMs = 0;
  function scan() {
    const t0 = performance.now();
    const found = collect();
    const next = new Map();
    const list = [];
    for (const { el, cat } of found) {
      try {
        const it = analyze(el, cat);
        next.set(it.id, el);
        list.push(it);
      } catch (e) { /* skip odd elements */ }
    }
    pageChecks(list);
    lastScanMs = performance.now() - t0;
    byId = next;
    items = list;
    send({ t: 'data', items: list, title: document.title, url: location.href, ms: Math.round(performance.now() - t0), capped: found.length >= MAX });
    render();
  }

  function send(msg) {
    if (!port) return;
    try { port.postMessage(msg); } catch (e) { /* port closed */ }
  }

  // ---------- overlay ----------
  const LOOK = {
    ok: { c: '#026E6C', style: 'solid', tagBg: '#026E6C', tagFg: '#FFFFFF', tagBorder: '#026E6C' },
    warn: { c: '#B78300', style: 'dashed', tagBg: '#FFF8E1', tagFg: '#6B4A00', tagBorder: '#B78300' },
    error: { c: '#B42318', style: 'solid', tagBg: '#B42318', tagFg: '#FFFFFF', tagBorder: '#B42318' },
    deco: { c: '#767C8A', style: 'dotted', tagBg: '#FFFFFF', tagFg: '#3A404D', tagBorder: '#767C8A' }
  };
  const kindOf = (it) => (it.sev ? it.sev : it.decorative ? 'deco' : 'ok');

  function ensureHost() {
    if (host && host.isConnected) return;
    host = document.createElement('labelseek-overlay');
    host.style.cssText = 'all:initial;position:fixed;inset:0;pointer-events:none;z-index:2147483647;display:block;';
    shadow = host.attachShadow({ mode: 'closed' });
    const font = (w, f) => `@font-face{font-family:'LS DM Sans';font-weight:${w};src:url(${chrome.runtime.getURL('fonts/' + f)}) format('woff2');}`;
    const style = document.createElement('style');
    style.textContent = [
      font(500, 'dm-sans-latin-500-normal.woff2'), font(600, 'dm-sans-latin-600-normal.woff2'), font(800, 'dm-sans-latin-800-normal.woff2'),
      `@font-face{font-family:'LS Plex Mono';font-weight:500;src:url(${chrome.runtime.getURL('fonts/ibm-plex-mono-latin-500-normal.woff2')}) format('woff2');}`,
      ':host{all:initial}',
      '.box{position:fixed;box-sizing:border-box;border-radius:6px;pointer-events:none}',
      '.tag{pointer-events:auto;cursor:pointer;position:absolute;left:-2px;max-width:360px;padding:3px 8px;border-radius:6px;border:1px solid;font:500 12px/16px "LS Plex Mono",ui-monospace,monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;box-sizing:border-box}',
      '.card[hidden]{display:none !important}',
      '.card{position:fixed;width:300px;box-sizing:border-box;padding:14px 16px;border-radius:12px;background:#15171C;color:#FFF;box-shadow:0 10px 28px rgba(21,23,28,.3);display:flex;flex-direction:column;gap:6px;font-family:"LS DM Sans",system-ui,sans-serif;pointer-events:none}',
      '.card .role{font:500 12px "LS Plex Mono",ui-monospace,monospace;color:#C4C8D1}',
      '.card .name{font-size:18px;font-weight:800;line-height:1.25;overflow-wrap:anywhere}',
      '.card .src{font-size:14px;color:#C4C8D1}.card .src b{font:500 13px "LS Plex Mono",ui-monospace,monospace;color:#FFF}',
      '.card .issue{font-size:14px;font-weight:600}',
      '.card .foot{border-top:1px solid #3A404D;padding-top:8px;font-size:14px;color:#9FB6FF}'
    ].join('\n');
    layer = document.createElement('div');
    card = document.createElement('div');
    card.className = 'card';
    card.hidden = true;
    shadow.append(style, layer, card);
    // tags float over other page content, so clicking a tag picks its element instead of whatever is under it
    layer.addEventListener('click', (e) => {
      const b = e.target.closest('.box');
      if (!b) return;
      e.preventDefault();
      e.stopPropagation();
      pick(+b.dataset.id);
    });
    layer.addEventListener('mousemove', (e) => {
      const b = e.target.closest('.box');
      setHover(b ? +b.dataset.id : null);
    });
    document.documentElement.appendChild(host);
  }

  function setInspectCursor(on) {
    if (on && !inspectStyle) {
      inspectStyle = document.createElement('style');
      inspectStyle.setAttribute('data-labelseek', '');
      inspectStyle.textContent = '*{cursor:crosshair !important}';
      (document.head || document.documentElement).appendChild(inspectStyle);
    } else if (!on && inspectStyle) {
      inspectStyle.remove();
      inspectStyle = null;
    }
  }

  let raf = 0;
  function render() {
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; draw(); });
  }

  function draw() {
    if (!port) return;
    ensureHost();
    const byItem = new Map(items.map((it) => [it.id, it]));
    const draws = [];
    if (view.master) {
      for (const it of items) if (!view.shown || view.shown.has(it.id)) draws.push({ it, mode: 'all' });
    }
    for (const [id, mode] of [[view.peek, 'peek'], [view.hover, 'hover'], [view.selected, 'selected']]) {
      if (id == null || !byItem.has(id)) continue;
      const i = draws.findIndex((d) => d.it.id === id);
      if (i >= 0) draws.splice(i, 1);
      draws.push({ it: byItem.get(id), mode });
    }
    const vw = innerWidth, vh = innerHeight;
    let n = 0;
    for (const d of draws) {
      const el = byId.get(d.it.id);
      if (!el || !el.isConnected) continue;
      const r = el.getBoundingClientRect();
      if (r.bottom < -4 || r.top > vh + 4 || r.right < -4 || r.left > vw + 4) continue;
      const box = layer.children[n] || layer.appendChild(Object.assign(document.createElement('div'), { className: 'box', innerHTML: '<span class="tag"></span>' }));
      n++;
      const L = LOOK[kindOf(d.it)];
      const sel = d.mode === 'selected';
      const pad = sel ? 4 : 2;
      const w = Math.max(r.width, 6), h = Math.max(r.height, 6);
      box.style.left = (r.left - pad) + 'px';
      box.style.top = (r.top - pad) + 'px';
      box.style.width = (w + pad * 2) + 'px';
      box.style.height = (h + pad * 2) + 'px';
      box.style.border = (sel ? '3px solid ' : d.mode === 'peek' || d.mode === 'hover' ? '2px solid ' : '2px ' + L.style + ' ') + L.c;
      box.style.boxShadow = sel ? '0 0 0 5px rgba(2,110,108,0.22)' : d.mode === 'hover' || d.mode === 'peek' ? '0 0 0 3px rgba(2,110,108,0.14)' : 'none';
      box.style.background = d.mode === 'peek' || d.mode === 'hover' ? 'rgba(2,110,108,0.06)' : 'transparent';
      box.dataset.id = d.it.id;
      const tag = box.firstChild;
      const showTag = d.mode === 'all' || sel;
      tag.style.display = showTag ? 'block' : 'none';
      if (showTag) {
        const it = d.it;
        tag.textContent = it.name ? q(trunc(it.name, 44)) + ' ' + it.role : it.decorative ? 'decorative ' + it.role : 'No name · ' + it.role;
        tag.style.background = L.tagBg; tag.style.color = L.tagFg; tag.style.borderColor = L.tagBorder;
        const big = h > vh * 0.6;
        const below = !big && r.top < 26;
        tag.style.top = big ? '4px' : below ? 'calc(100% + 4px)' : 'auto';
        tag.style.bottom = big || below ? 'auto' : 'calc(100% + 4px)';
        const nearRight = r.left > vw - 240;
        tag.style.left = big ? '4px' : nearRight ? 'auto' : '-2px';
        tag.style.right = nearRight && !big ? '-2px' : 'auto';
        tag.style.fontWeight = sel ? '700' : '500';
      }
    }
    while (layer.children.length > n) layer.lastChild.remove();
    drawCard();
  }

  function drawCard() {
    const it = view.hover != null ? items.find((x) => x.id === view.hover) : null;
    const el = it && byId.get(it.id);
    if (!it || !el || !el.isConnected) { card.hidden = true; return; }
    const r = el.getBoundingClientRect();
    const k = kindOf(it);
    const nameColor = k === 'error' ? '#FF9B8F' : '#FFFFFF';
    const issueColor = k === 'error' ? '#FF9B8F' : '#FFD27A';
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    card.innerHTML =
      '<span class="role">' + esc(it.role) + '</span>' +
      '<span class="name" style="color:' + nameColor + '">' + esc(it.name ? q(trunc(it.name, 120)) : it.decorative ? 'Decorative, skipped' : 'No accessible name') + '</span>' +
      '<span class="src">from <b>' + esc(it.src) + '</b></span>' +
      (it.issue ? '<span class="issue" style="color:' + issueColor + '">' + esc(it.issue) + '</span>' : '') +
      '<span class="foot">' + (view.master ? 'Click to open in LabelSeek' : 'Show names on the page to click and inspect') + '</span>';
    card.hidden = false;
    const ch = card.offsetHeight || 140;
    let top = r.bottom + 10;
    if (top + ch > innerHeight - 8) top = r.top - ch - 10;
    if (top < 8) top = Math.min(innerHeight - ch - 8, Math.max(8, r.top + 10));
    const left = Math.min(Math.max(8, r.left), innerWidth - 308);
    card.style.top = top + 'px';
    card.style.left = left + 'px';
  }

  // ---------- page interaction ----------
  function itemFromEvent(e) {
    for (const n of e.composedPath()) {
      if (n === host) return null;
      if (n.nodeType === 1) {
        const id = ids.get(n);
        if (id && byId.get(id) === n) return id;
      }
    }
    return null;
  }

  // composedPath() is only valid while the event is dispatching, so resolve the id right away
  function setHover(id) {
    if (id === view.hover) return;
    view.hover = id;
    send({ t: 'hover', id });
    render();
  }
  function pick(id) {
    if (id == null || !byId.has(id)) return;
    view.selected = id;
    send({ t: 'pick', id });
    render();
  }
  function onMove(e) {
    if (host && e.composedPath()[0] === host) return; // over a tag, handled inside the overlay
    setHover(itemFromEvent(e));
  }
  function onOut(e) {
    if (!e.relatedTarget && view.hover != null) { view.hover = null; send({ t: 'hover', id: null }); render(); }
  }
  // While names are shown the page is in inspect mode: nothing on it activates,
  // clicks only pick elements, so a near miss never follows a link.
  function swallow(e) {
    if (!view.master) return;
    if (host && e.composedPath()[0] === host) return; // a tag was clicked, the overlay handles it
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    if (e.type === 'click') pick(itemFromEvent(e));
  }
  const onScroll = () => render();

  let mo = null, moTimer = 0, moFirst = 0;
  function onMutations(muts) {
    const isOurs = (m) => {
      if (host && (m.target === host || host.contains(m.target))) return true;
      if (m.type !== 'childList') return false;
      const nodes = [...m.addedNodes, ...m.removedNodes];
      return nodes.length > 0 && nodes.every((n) => n === host || n.nodeName === 'LABELSEEK-OVERLAY' || (n.nodeType === 1 && n.hasAttribute && n.hasAttribute('data-labelseek')));
    };
    if (muts.every(isOurs)) return;
    const now = Date.now();
    if (!moFirst) moFirst = now;
    clearTimeout(moTimer);
    // big pages scan slower, so wait longer between automatic rescans
    const quiet = Math.max(700, lastScanMs * 2), maxWait = Math.max(3000, lastScanMs * 6);
    const wait = now - moFirst > maxWait ? 0 : quiet;
    moTimer = setTimeout(() => { moFirst = 0; scan(); }, wait);
    render();
  }

  function start() {
    addEventListener('mousemove', onMove, { capture: true, passive: true });
    document.addEventListener('mouseout', onOut, true);
    for (const t of ['click', 'mousedown', 'pointerdown', 'mouseup', 'pointerup', 'auxclick', 'dblclick', 'submit']) addEventListener(t, swallow, true);
    addEventListener('scroll', onScroll, { capture: true, passive: true });
    addEventListener('resize', onScroll, { passive: true });
    mo = new MutationObserver(onMutations);
    mo.observe(document.documentElement, {
      subtree: true, childList: true, characterData: true, attributes: true,
      attributeFilter: ['aria-label', 'aria-labelledby', 'aria-describedby', 'aria-description', 'aria-hidden', 'alt', 'title', 'placeholder', 'role', 'hidden', 'id', 'for', 'href', 'value', 'type']
    });
  }

  function stop() {
    removeEventListener('mousemove', onMove, { capture: true });
    document.removeEventListener('mouseout', onOut, true);
    for (const t of ['click', 'mousedown', 'pointerdown', 'mouseup', 'pointerup', 'auxclick', 'dblclick', 'submit']) removeEventListener(t, swallow, true);
    removeEventListener('scroll', onScroll, { capture: true });
    removeEventListener('resize', onScroll);
    if (mo) mo.disconnect();
    mo = null;
    clearTimeout(moTimer);
    Object.assign(view, { selected: null, peek: null, hover: null, master: false, shown: null });
    setInspectCursor(false);
    if (host) host.remove();
    host = null;
  }

  function scrollToItem(id) {
    const el = byId.get(id);
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.top < 60 || r.bottom > innerHeight - 60 || r.left < 0 || r.right > innerWidth) {
      el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
    }
  }

  chrome.runtime.onConnect.addListener((p) => {
    if (p.name !== 'labelseek') return;
    if (port) { try { port.disconnect(); } catch (e) { /* ignore */ } stop(); }
    port = p;
    start();
    p.onDisconnect.addListener(() => { if (port === p) { port = null; stop(); } });
    p.onMessage.addListener((m) => {
      if (!m || port !== p) return;
      if (m.t === 'scan') scan();
      else if (m.t === 'select') { view.selected = m.id; if (m.id != null && m.scroll !== false) scrollToItem(m.id); render(); }
      else if (m.t === 'peek') { view.peek = m.id; render(); }
      else if (m.t === 'show') { view.master = !!m.on; view.shown = m.ids ? new Set(m.ids) : null; setInspectCursor(view.master); render(); }
    });
  });
})();
