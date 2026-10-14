// LabelSeek side panel
'use strict';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const q = (s) => '“' + s + '”';

const CATS = [
  ['forms', 'Form controls', 'Forms'],
  ['actions', 'Links & buttons', 'Links & buttons'],
  ['images', 'Images', 'Images'],
  ['tables', 'Tables', 'Tables']
];

const ICON = {
  eye: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>',
  eyeOff: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/></svg>',
  error: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B42318" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="No name"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>',
  warn: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B78300" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Warning"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
  ok: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#026E6C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Looks good"><circle cx="12" cy="12" r="10"/><path d="m16 9-5.5 5.5L8 12"/></svg>',
  deco: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4B5160" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Decorative"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/></svg>',
  optional: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4B5160" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="No name, optional"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/></svg>',
  chevDown20: '<svg class="chev" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4B5160" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
  chevDown16: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3A404D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
  crosshair: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="22" x2="18" y1="12" y2="12"/><line x1="6" x2="2" y1="12" y2="12"/><line x1="12" x2="12" y1="6" y2="2"/><line x1="12" x2="12" y1="22" y2="18"/></svg>',
  copy: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>',
  check: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7FD8CC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m16 9-5.5 5.5L8 12"/></svg>',
  loader: '<svg class="spin" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>',
  lock: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  search: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/></svg>'
};

// ---------- state ----------
const S = {
  status: 'loading', // loading | ready | blocked
  blockedMsg: null,
  items: [],
  title: '',
  url: '',
  filter: 'all',
  sev: null, // null | 'good' | 'warn' | 'error'
  query: '',
  searchOpen: false,
  collapsed: {},
  openId: null,
  shownCats: { forms: true, actions: true, images: true, tables: true }, // names are on by default
  paused: false,
  pageHover: null
};

let port = null;
let tabId = null;
let windowId = null;
let gen = 0;
const fixedTab = new URLSearchParams(location.search).get('tab');

// ---------- derived ----------
const kind = (it) => (it.sev ? it.sev : it.decorative ? 'deco' : it.optional ? 'optional' : 'ok');
function matchQ(it) {
  const t = S.query.trim().toLowerCase();
  if (!t) return true;
  return [it.name, it.role, it.src, it.sel, it.issue, it.code].some((s) => (s || '').toLowerCase().includes(t));
}
const sevMatch = (it) => !S.sev || (S.sev === 'good' ? !it.sev : it.sev === S.sev);
function visibleItems() {
  return S.items.filter((it) => (S.filter === 'all' || it.cat === S.filter) && sevMatch(it) && matchQ(it));
}
function counts() {
  const errors = S.items.filter((i) => i.sev === 'error').length;
  const warnings = S.items.filter((i) => i.sev === 'warn').length;
  return { errors, warnings, good: S.items.length - errors - warnings, issues: errors + warnings };
}
const presentCats = () => CATS.map(([id]) => id).filter((id) => S.items.some((i) => i.cat === id));
const anyShown = () => presentCats().some((id) => S.shownCats[id]);
const allShown = () => presentCats().length > 0 && presentCats().every((id) => S.shownCats[id]);
function cleanTitle() {
  return (S.title || '').replace(/^\(\d+\+?\)\s*/, '').trim(); // drop unread counts like "(6) YouTube"
}
function pageName() {
  const t = cleanTitle();
  if (!t) { try { return new URL(S.url).hostname || 'This page'; } catch (e) { return 'This page'; } }
  const first = t.split(/\s+[|–—·:-]\s+/)[0].trim();
  return first.length >= 3 ? first : t;
}

// ---------- rendering ----------
function renderHeader() {
  const pb = $('pageBtn');
  const name = S.status === 'loading' && !S.title ? 'Loading…' : pageName();
  pb.textContent = name;
  pb.setAttribute('aria-label', name + ': copy page URL');
  pb.title = (S.title ? S.title + '\n' : '') + 'Click to copy page URL';
  pb.disabled = !S.url;

  const c = counts();
  const ready = S.status === 'ready';
  $('nGood').textContent = ready ? c.good : '–';
  $('nWarn').textContent = ready ? c.warnings : '–';
  $('nErr').textContent = ready ? c.errors : '–';
  document.querySelectorAll('[data-sev]').forEach((b) => { b.setAttribute('aria-pressed', S.sev === b.dataset.sev ? 'true' : 'false'); b.disabled = !ready; });

  document.querySelector('.app').classList.toggle('paused', S.paused);
  const pauseB = $('pauseBtn');
  const pLabel = S.paused ? 'Resume scanning' : 'Pause scanning';
  pauseB.setAttribute('aria-label', pLabel);
  pauseB.title = pLabel;
  $('pausedBanner').inert = !S.paused;

  $('chips').hidden = S.searchOpen;
  $('searchBox').hidden = !S.searchOpen;

  const pool = S.items.filter(sevMatch);
  const defs = [['all', 'All', pool.length]]
    .concat(CATS.map(([id, , short]) => [id, short, pool.filter((i) => i.cat === id).length]).filter((d) => S.items.some((i) => i.cat === d[0]) || S.filter === d[0]));
  keepFocus(() => {
    $('pills').innerHTML = defs.map(([id, label, n]) =>
      `<button type="button" class="pill" data-filter="${id}" data-key="pill-${id}" aria-pressed="${S.filter === id}">${esc(label)} <span class="count">${ready ? n : ''}</span></button>`
    ).join('');
  });

  $('exportCsv').disabled = !ready || !S.items.length;
  const ca = $('copyAll');
  ca.setAttribute('aria-disabled', !ready || !c.issues ? 'true' : 'false');
}

function keepFocus(fn) {
  const a = document.activeElement;
  const key = a && a.dataset ? a.dataset.key : null;
  fn();
  if (key) {
    const el = document.querySelector(`[data-key="${CSS.escape(key)}"]`);
    if (el && el !== document.activeElement) el.focus({ preventScroll: true });
  }
}

function renderList() {
  const list = $('list');
  if (S.status === 'loading') {
    list.innerHTML = `<div class="empty">${ICON.loader}<h2>Scanning the page</h2><p>Working out the accessible name of every control, link and image.</p></div>`;
    return;
  }
  if (S.status === 'blocked') {
    list.innerHTML = `<div class="empty">${ICON.lock}<h2>Can’t scan this page</h2><p>${esc(S.blockedMsg)}</p></div>`;
    return;
  }
  if (!S.items.length) {
    list.innerHTML = `<div class="empty">${ICON.search}<h2>Nothing to check here</h2><p>This page has no form controls, links, buttons, images or tables that are visible.</p></div>`;
    return;
  }
  const vis = visibleItems();
  if (!vis.length) {
    list.innerHTML = S.query.trim()
      ? `<p class="empty"><span>No elements match ${esc(q(S.query.trim()))}</span></p>`
      : S.sev === 'warn' ? `<div class="empty"><h2>No warnings here</h2><p>Nothing in this view needs a second look.</p></div>`
      : S.sev === 'error' ? `<div class="empty"><h2>Nothing is missing a name</h2><p>Every element in this view has an accessible name. Nice.</p></div>`
      : `<div class="empty"><h2>Nothing to show</h2><p>No elements match this combination of filters.</p></div>`;
    return;
  }
  let html = '';
  let gi = 0;
  for (const [key, title] of CATS) {
    const rows = vis.filter((i) => i.cat === key);
    if (!rows.length) continue;
    const collapsed = !!S.collapsed[key];
    html += `<div class="group${gi === 0 ? ' first' : ''}">` +
      (collapsed ? '' : '<span class="trunk" aria-hidden="true"></span>') +
      `<div class="ghead-row"><h2 class="gh"><button type="button" class="ghead" data-group="${key}" data-key="g-${key}" aria-expanded="${!collapsed}">${ICON.chevDown16}<span class="gtitle">${esc(title)} <span class="count">${rows.length}</span></span></button></h2>` +
      `<button type="button" class="eye" data-eye="${key}" data-key="e-${key}" aria-pressed="${!!S.shownCats[key]}" aria-label="Show ${esc(title)} on page" title="${S.shownCats[key] ? 'Hide' : 'Show'} ${esc(title.toLowerCase())} on page">${S.shownCats[key] ? ICON.eye : ICON.eyeOff}</button></div></div>`;
    gi++;
    if (collapsed) continue;
    rows.forEach((it, idx) => { html += rowHtml(it, idx < rows.length - 1); });
  }
  keepFocus(() => { list.innerHTML = html; });
}

function rowHtml(it, notLast) {
  const k = kind(it);
  const open = S.openId === it.id;
  let nameHtml;
  if (k === 'error' && !it.name) nameHtml = '<span class="rname missing">No accessible name</span>';
  else if (k === 'deco') nameHtml = '<span class="rname quiet">Decorative image</span>';
  else if (k === 'optional') nameHtml = '<span class="rname quiet">No name (optional here)</span>';
  else if (!it.name) nameHtml = '<span class="rname missing">No accessible name</span>';
  else nameHtml = `<span class="rname" title="${esc(it.name)}">${esc(q(it.name))}</span>`;
  const icon = ICON[k];
  let h = `<div class="item">` +
    '<span class="t-up" aria-hidden="true"></span><span class="t-elbow" aria-hidden="true"></span>' +
    (notLast ? '<span class="t-down" aria-hidden="true"></span><span class="t-rule" aria-hidden="true"></span>' : '') +
    `<button type="button" class="row${S.pageHover === it.id ? ' page-hover' : ''}" data-row="${it.id}" data-key="r-${it.id}" aria-expanded="${open}"${open ? ` aria-controls="d-${it.id}"` : ''}>` +
    `<span class="status">${icon}</span>` +
    `<span class="rbody">${nameHtml}<span class="chips-row"><span class="chip-role">${esc(it.role)}</span><span class="chip-src">${esc(it.src)}</span>${it.desc ? '<span class="plus-desc">+ description</span>' : ''}</span>` +
    (it.sev ? `<span class="rissue ${it.sev}">${esc(it.issue)}</span>` : '') +
    `</span>${ICON.chevDown20}</button>`;
  if (open) h += detailHtml(it, k);
  return h + '</div>';
}

function detailHtml(it, k) {
  let hear;
  if (k === 'deco') hear = '<span class="v quiet">Nothing. It’s skipped on purpose.</span>';
  else if (!it.name) hear = `<span class="v${k === 'error' ? ' missing' : ' quiet'}">${esc(q(it.role))} and nothing else</span>`;
  else hear = `<span class="v">${esc(q(it.name))}, ${esc(it.role)}</span>`;
  if (it.desc) hear += `<span class="d">then ${esc(q(it.desc.text))}</span><span class="ds">description from <code>${esc(it.desc.src)}</code></span>`;

  const issue = it.sev ? `<div class="issue-card ${it.sev}"><span class="it">${esc(it.issue)}</span><p>${esc(it.why)}</p><p><strong>Fix:</strong> ${esc(it.fix)}</p><span class="wc">${esc(it.wcag)}</span></div>` : '';

  const steps = it.steps.map((s, i) =>
    `<li class="step ${s.state}"><span class="n">${i + 1}</span><span class="sv"><span class="src">${esc(s.label)}</span><span class="val">${esc(s.value)}</span></span>` +
    (s.state === 'winner' ? '<span class="badge-used">Used</span>' : s.state === 'overridden' ? '<span class="badge-ign">Ignored</span>' : '') + '</li>'
  ).join('');

  return `<div class="detail" id="d-${it.id}">` +
    `<div class="selrow"><span class="sel" title="${esc(it.sel)}">${esc(it.sel)}</span><span class="onpage">${ICON.crosshair}${S.paused ? 'Paused' : 'Highlighted on page'}</span></div>` +
    `<div class="hear"><span class="k">Screen readers hear</span>${hear}</div>` +
    issue +
    `<div class="ladder"><h3>How the name was chosen</h3><ol>${steps}</ol></div>` +
    `<pre class="code">${esc(it.code)}</pre>` +
    `<button type="button" class="btn secondary small" data-copy="${it.id}" data-key="c-${it.id}">${ICON.copy}${it.sev ? 'Copy as ticket' : 'Copy details'}</button>` +
    '</div>';
}

function render() { renderHeader(); renderList(); }

// ---------- toast ----------
let toastTimer = 0;
function toast(text) {
  const t = $('toast');
  t.hidden = false;
  t.innerHTML = ICON.check + '<span></span>';
  t.lastChild.textContent = text;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; t.textContent = ''; }, 2600);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

// ---------- tickets + csv ----------
function ticket(it) {
  const lines = [];
  lines.push('## ' + (it.sev ? it.issue : 'Accessible name: ' + (it.name || it.role)));
  lines.push('');
  lines.push('**Page:** ' + (cleanTitle() || pageName()) + ' (' + S.url + ')');
  lines.push('**Element:** `' + it.sel + '`');
  lines.push('**Role:** ' + it.role);
  lines.push('**Accessible name:** ' + (it.name ? q(it.name) + ' (from ' + it.src + ')' : it.decorative ? 'None, decorative' : 'None'));
  if (it.desc) lines.push('**Description:** ' + q(it.desc.text) + ' (from ' + it.desc.src + ')');
  if (it.sev) {
    lines.push('**Severity:** ' + (it.sev === 'error' ? 'Error' : 'Warning'));
    lines.push('**WCAG:** ' + it.wcag.replace(/^WCAG /, ''));
    lines.push('');
    lines.push('**Problem:** ' + it.why);
    lines.push('');
    lines.push('**Fix:** ' + it.fix);
  }
  lines.push('');
  lines.push('```html');
  lines.push(it.code);
  lines.push('```');
  return lines.join('\n');
}

function allTickets() {
  const issues = S.items.filter((i) => i.sev).sort((a, b) => (a.sev === b.sev ? 0 : a.sev === 'error' ? -1 : 1));
  const head = '# Accessibility issues: ' + (cleanTitle() || pageName()) + '\n\n' + S.url + '\n\n' + issues.length + ' issue' + (issues.length === 1 ? '' : 's') + ' found with LabelSeek.';
  return { text: head + '\n\n' + issues.map(ticket).join('\n\n---\n\n') + '\n', n: issues.length };
}

function csv() {
  const catName = Object.fromEntries(CATS.map(([id, t]) => [id, t]));
  const cell = (v) => {
    let s = String(v ?? '');
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // keep spreadsheets from running it as a formula
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const wc = (w) => {
    const m = /WCAG\s+([\d.]+)\s+(.*?)\s+·\s+Level\s+(\w+)/.exec(w || '');
    return m ? [m[1], m[2], m[3]] : ['', '', ''];
  };
  const scanned = new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  const title = cleanTitle() || pageName();
  const noteFor = (it) => ({ deco: 'Decorative, skipped on purpose', optional: 'No name needed here' }[kind(it)] || '');
  const hear = (it) => (kind(it) === 'deco' ? 'Nothing (skipped)' : it.name ? '"' + it.name + '", ' + it.role : '"' + it.role + '" and nothing else');
  const raw = (it) => it.raw || {};
  const common = [
    ['Category', (it) => catName[it.cat]],
    ['Role', (it) => it.role],
    ['Accessible name', (it) => it.name],
    ['Name comes from', (it) => (it.name ? it.src : 'None')],
    ['Screen readers hear', hear],
    ['Description', (it) => (it.desc ? it.desc.text : '')],
    ['Description comes from', (it) => (it.desc ? it.desc.src : '')],
    ['aria-labelledby text', (it) => raw(it).labelledby],
    ['aria-label', (it) => raw(it).label],
    ['Native label (label, legend, alt…)', (it) => (raw(it).native ? raw(it).native + (raw(it).nativeHow ? ' (' + raw(it).nativeHow + ')' : '') : '')],
    ['Visible text', (it) => raw(it).text],
    ['title', (it) => raw(it).title],
    ['placeholder', (it) => raw(it).placeholder],
    ['Selector', (it) => it.sel],
    ['HTML', (it) => it.code],
    ['Link or image URL', (it) => { const u = it.href || it.imgSrc || ''; return /^data:/i.test(u) ? '(embedded image data)' : u; }]
  ];
  const issueCols = [
    ['Issue', (it) => it.issue],
    ['WCAG', (it) => wc(it.wcag)[0]],
    ['WCAG criterion', (it) => wc(it.wcag)[1]],
    ['Level', (it) => wc(it.wcag)[2]],
    ['Why it matters', (it) => it.why],
    ['How to fix', (it) => it.fix]
  ];
  const sections = [
    ['Good', S.items.filter((i) => !i.sev), [['Note', noteFor], ...common]],
    ['Warnings', S.items.filter((i) => i.sev === 'warn'), [...issueCols, ...common]],
    ['No name', S.items.filter((i) => i.sev === 'error'), [...issueCols, ...common]]
  ];
  const lines = [
    ['LabelSeek report'],
    ['Page', title],
    ['URL', S.url],
    ['Scanned', scanned],
    ['Totals', sections.map(([n, rows]) => n + ': ' + rows.length).join(', ')]
  ];
  for (const [name, rows, cols] of sections) {
    lines.push([]);
    lines.push([name.toUpperCase() + ' (' + rows.length + ')']);
    if (!rows.length) { lines.push(['None on this page']); continue; }
    lines.push(['#', ...cols.map((c) => c[0])]);
    rows.forEach((it, i) => lines.push([i + 1, ...cols.map((c) => c[1](it))]));
  }
  return '﻿' + lines.map((r) => r.map(cell).join(',')).join('\r\n');
}

function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// ---------- talking to the page ----------
function post(msg) {
  if (!port) return;
  try { port.postMessage(msg); } catch (e) { /* closed */ }
}
function syncOverlay() {
  const on = anyShown();
  post({ t: 'show', on, ids: on ? visibleItems().filter((i) => S.shownCats[i.cat]).map((i) => i.id) : null });
}

function disconnect() {
  if (port) { try { port.disconnect(); } catch (e) { /* ignore */ } }
  port = null;
}

function blocked(msg) {
  S.status = 'blocked';
  S.blockedMsg = msg;
  S.items = [];
  render();
}

async function currentTab() {
  if (fixedTab) { try { return await chrome.tabs.get(+fixedTab); } catch (e) { return null; } }
  const [t] = await chrome.tabs.query({ active: true, windowId });
  return t || null;
}

async function attach() {
  if (S.paused) return;
  const my = ++gen;
  disconnect();
  const tab = await currentTab();
  if (my !== gen) return;
  if (!tab) { blocked('No page is open in this window.'); return; }
  const changedTab = tab.id !== tabId;
  tabId = tab.id;
  S.title = tab.title || '';
  S.url = tab.url || '';
  S.pageHover = null;
  if (changedTab) S.openId = null;
  const url = S.url;
  if (!url || /^(chrome|edge|about|chrome-extension|devtools|view-source):/i.test(url) || /^https:\/\/(chromewebstore\.google\.com|chrome\.google\.com\/webstore)/i.test(url)) {
    blocked('Chrome doesn’t let extensions read its own pages or the Web Store. Open a website and LabelSeek will scan it.');
    return;
  }
  if (S.status !== 'ready') S.status = 'loading';
  render();
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
  } catch (e) {
    if (my !== gen) return;
    if (/^file:/i.test(url)) blocked('To scan files on your computer, open chrome://extensions, click Details on LabelSeek, and turn on “Allow access to file URLs”.');
    else blocked('This page blocked LabelSeek. Some pages, like other extensions and browser settings, can’t be scanned.');
    return;
  }
  if (my !== gen) return;
  const p = chrome.tabs.connect(tab.id, { name: 'labelseek' });
  port = p;
  p.onMessage.addListener((m) => onPageMessage(m, p));
  p.onDisconnect.addListener(() => { if (port === p) port = null; });
  post({ t: 'scan' });
  if (anyShown()) syncOverlay();
  if (S.openId != null) post({ t: 'select', id: S.openId, scroll: false });
}

let pendingRefreshToast = false;
function onPageMessage(m, p) {
  if (p !== port || !m) return;
  if (m.t === 'data') {
    S.items = m.items || [];
    window.__lastScanMs = m.ms;
    S.title = m.title || S.title;
    S.url = m.url || S.url;
    S.status = 'ready';
    if (S.openId != null && !S.items.some((i) => i.id === S.openId)) S.openId = null;
    render();
    if (anyShown()) syncOverlay();
    if (pendingResumeToast) {
      pendingResumeToast = false;
      toast('Scanning resumed: ' + S.items.length + ' elements');
    }
    if (pendingRefreshToast) {
      pendingRefreshToast = false;
      toast('Page rescanned: ' + S.items.length + ' elements' + (m.capped ? ' (first 3,000 only)' : ''));
    }
  } else if (m.t === 'hover') {
    const prev = S.pageHover;
    S.pageHover = m.id;
    if (prev != null) { const r = document.querySelector(`[data-row="${prev}"]`); if (r) r.classList.remove('page-hover'); }
    if (m.id != null) { const r = document.querySelector(`[data-row="${m.id}"]`); if (r) r.classList.add('page-hover'); }
  } else if (m.t === 'pick') {
    const it = S.items.find((i) => i.id === m.id);
    if (!it) return;
    S.openId = it.id;
    S.filter = 'all';
    S.sev = null;
    S.query = '';
    $('find').value = '';
    S.searchOpen = false;
    delete S.collapsed[it.cat];
    render();
    syncOverlay();
    const row = document.querySelector(`[data-row="${it.id}"]`);
    if (row) row.parentElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

// ---------- events ----------
$('list').addEventListener('click', async (e) => {
  const eye = e.target.closest('[data-eye]');
  if (eye) {
    const k = eye.dataset.eye;
    S.shownCats[k] = !S.shownCats[k];
    render();
    syncOverlay();
    return;
  }
  const g = e.target.closest('[data-group]');
  if (g) {
    const k = g.dataset.group;
    S.collapsed[k] = !S.collapsed[k];
    renderList();
    return;
  }
  const r = e.target.closest('[data-row]');
  if (r) {
    const id = +r.dataset.row;
    S.openId = S.openId === id ? null : id;
    renderList();
    post({ t: 'select', id: S.openId, scroll: true });
    if (S.openId != null) {
      const row = document.querySelector(`[data-row="${id}"]`);
      if (row) row.parentElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    return;
  }
  const c = e.target.closest('[data-copy]');
  if (c) {
    const it = S.items.find((i) => i.id === +c.dataset.copy);
    if (!it) return;
    await copyText(ticket(it));
    toast((it.sev ? 'Copied ticket for ' : 'Copied details for ') + q(it.name || it.role));
  }
});

let peekId = null;
$('list').addEventListener('mouseover', (e) => {
  const r = e.target.closest('[data-row]');
  const id = r ? +r.dataset.row : null;
  if (id !== peekId) { peekId = id; post({ t: 'peek', id }); }
});
$('list').addEventListener('mouseleave', () => { peekId = null; post({ t: 'peek', id: null }); });
$('list').addEventListener('focusin', (e) => {
  const r = e.target.closest('[data-row]');
  const id = r ? +r.dataset.row : null;
  if (id !== peekId) { peekId = id; post({ t: 'peek', id }); }
});

document.querySelector('.tiles').addEventListener('click', (e) => {
  const b = e.target.closest('[data-sev]');
  if (!b) return;
  S.sev = S.sev === b.dataset.sev ? null : b.dataset.sev;
  render();
  syncOverlay();
});

$('pills').addEventListener('click', (e) => {
  const b = e.target.closest('[data-filter]');
  if (!b) return;
  S.filter = b.dataset.filter;
  render();
  syncOverlay();
});

// Pause stops scanning completely: the page connection closes, which clears the
// highlights and removes every listener, so the page behaves normally.
function setPaused(on) {
  if (S.paused === on) return;
  S.paused = on;
  if (on) {
    gen++; // cancel any attach in flight
    disconnect();
    S.pageHover = null;
    render();
    toast('Scanning paused. Highlights cleared');
  } else {
    render();
    pendingResumeToast = true;
    attach();
  }
}
let pendingResumeToast = false;
$('pauseBtn').addEventListener('click', () => setPaused(!S.paused));
$('resumeBtn').addEventListener('click', () => { setPaused(false); $('pauseBtn').focus(); });

$('searchOpen').addEventListener('click', () => {
  S.searchOpen = true;
  renderHeader();
  $('find').focus();
});
function closeSearch() {
  S.searchOpen = false;
  S.query = '';
  $('find').value = '';
  render();
  syncOverlay();
  $('searchOpen').focus();
}
$('searchClose').addEventListener('click', closeSearch);
$('find').addEventListener('input', (e) => {
  S.query = e.target.value;
  renderList();
  syncOverlay();
});
$('find').addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); closeSearch(); } });

$('pageBtn').addEventListener('click', async () => {
  if (!S.url) return;
  await copyText(S.url);
  toast('Page URL copied');
});

async function copyAllIssues() {
  const { text, n } = allTickets();
  if (!n) return;
  await copyText(text);
  toast('Copied ' + n + ' issue' + (n === 1 ? '' : 's') + ' as Markdown tickets');
}

$('exportCsv').addEventListener('click', () => {
  let host = 'page';
  try { host = new URL(S.url).hostname.replace(/^www\./, '') || 'page'; } catch (e) { /* ignore */ }
  const d = new Date();
  const stamp = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  download(`labelseek-${host}-${stamp}.csv`, csv(), 'text/csv;charset=utf-8');
  toast('Exported ' + S.items.length + ' elements to CSV');
});

// menu
const menuBtn = $('menuBtn');
const menu = $('menu');
const menuItems = () => [...menu.querySelectorAll('[role^=menuitem]')];
function openMenu(focusIdx = 0) {
  menu.hidden = false;
  menuBtn.setAttribute('aria-expanded', 'true');
  menuItems()[focusIdx].focus();
}
function closeMenu(refocus = true) {
  if (menu.hidden) return;
  menu.hidden = true;
  menuBtn.setAttribute('aria-expanded', 'false');
  if (refocus) menuBtn.focus();
}
menuBtn.addEventListener('click', () => (menu.hidden ? openMenu() : closeMenu()));
menuBtn.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown') { e.preventDefault(); openMenu(0); }
  if (e.key === 'ArrowUp') { e.preventDefault(); openMenu(menuItems().length - 1); }
});
menu.addEventListener('keydown', (e) => {
  const items = menuItems();
  const i = items.indexOf(document.activeElement);
  if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
  else if (e.key === 'Home') { e.preventDefault(); items[0].focus(); }
  else if (e.key === 'End') { e.preventDefault(); items[items.length - 1].focus(); }
  else if (e.key === 'Escape') { e.preventDefault(); closeMenu(); }
  else if (e.key === 'Tab') closeMenu(false);
});
document.addEventListener('mousedown', (e) => {
  if (!menu.hidden && !menu.contains(e.target) && !menuBtn.contains(e.target)) closeMenu(false);
});
menu.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-menu]');
  if (!b) return;
  if (b.getAttribute('aria-disabled') === 'true') return;
  closeMenu();
  if (b.dataset.menu === 'copyAll') { copyAllIssues(); return; }
  if (b.dataset.menu === 'refresh') {
    if (S.paused) { setPaused(false); return; }
    pendingRefreshToast = true;
    if (port) post({ t: 'scan' }); else attach();
  } else if (b.dataset.menu === 'close') {
    disconnect();
    try { if (chrome.sidePanel.close) { await chrome.sidePanel.close({ windowId }); return; } } catch (err) { /* fall through */ }
    window.close();
  }
});

// ---------- tab tracking ----------
chrome.tabs.onActivated.addListener((info) => {
  if (fixedTab || S.paused) return;
  if (info.windowId === windowId) attach();
});
chrome.tabs.onUpdated.addListener((id, info, tab) => {
  if (id !== tabId || S.paused) return;
  if (info.title) { S.title = info.title; renderHeader(); }
  if (info.status === 'loading' && info.url) { S.status = 'loading'; S.items = []; S.openId = null; render(); }
  if (info.status === 'complete') attach();
});

(async () => {
  render();
  try { windowId = (await chrome.windows.getCurrent()).id; } catch (e) { windowId = null; }
  attach();
})();
