/* ============================================================================
   siteNav.js — shared site navigation
   ----------------------------------------------------------------------------
   Standard nav component. The ENGINE below is identical across sites; only the
   CONFIG block changes. To reuse on another site, copy this file and edit the
   `pages` array — nothing else.

   Behaviour: a centred bar showing the CURRENT page's title between arrows.
   Click it to drop down the full page list; the current page is marked and not
   clickable. Clicking anywhere else, or pressing Escape, closes it.

   Paths: page hrefs are written site-absolute ('/help.html'). The engine
   detects a GitHub Pages project subdirectory automatically, so the same file
   works at a domain root (example.com/help.html) and under a repo subpath
   (user.github.io/repo/help.html) with no edits.

   Requires: nothing. Injects its own styles and loads IBM Plex Mono if absent.
   ========================================================================== */

(function () {
  'use strict';

  // ══ CONFIG ═════════════════════════════════════════════════════════════
  // The first entry is treated as home and is the fallback title.

  var pages = [
    { title: 'PubMed Citation Bar',    href: '/' },
    { title: 'Help — Bar Reference',   href: '/help.html' },
    { title: 'Support',                href: '/support.html' },
    { title: 'PubMed Summary Report',  href: '/pubmed-summary/pubmed-summary.html' },
    { title: 'PubMed Filters Report',  href: '/filters/filters.html' },
    { title: 'PubMed MeSH Counts',     href: '/mesh/mesh.html' },
    { title: 'PubMed Journal Ranking', href: '/journal-ranking/journal-ranking.html' },
    { title: 'Privacy',                href: '/privacy.html' }
  ];

  // ══ ENGINE ═════════════════════════════════════════════════════════════
  // Identical across sites. No edits needed below this line.

  if (document.getElementById('site-nav-bar')) return;   // never inject twice

  // ── Styles, injected once ────────────────────────────────────────────
  var styleId = 'siteNavStyles';
  if (!document.getElementById(styleId)) {
    var style = document.createElement('style');
    style.id = styleId;
    style.textContent = [
      '#site-nav-bar {',
      '  background: #f4f3ef;',
      '  border-bottom: 2px solid #d8d5cc;',
      '  padding: 12px 24px;',
      '  font-family: "IBM Plex Mono", monospace;',
      '  position: relative;',
      '  z-index: 10000;',
      '  box-sizing: border-box;',
      '}',
      '#site-nav-bar * { box-sizing: border-box; }',
      '#site-nav-bar .site-nav-inner {',
      '  max-width: 1400px;',
      '  margin: 0 auto;',
      '  position: relative;',
      '  text-align: center;',
      '}',
      '#site-nav-bar .site-nav-title {',
      '  font-size: 22px;',
      '  font-weight: 600;',
      '  letter-spacing: -0.5px;',
      '  color: #005a8c;',
      '  cursor: pointer;',
      '  display: inline-flex;',
      '  align-items: center;',
      '  gap: 8px;',
      '  user-select: none;',
      '  transition: color 0.15s;',
      '  margin: 0;',
      '  padding: 0;',
      '  background: none;',
      '  border: none;',
      '  font-family: inherit;',
      '}',
      '#site-nav-bar .site-nav-title:hover { color: #004470; }',
      '#site-nav-bar .site-nav-title:focus-visible {',
      '  outline: 2px solid #005a8c;',
      '  outline-offset: 4px;',
      '}',
      '#site-nav-bar .site-nav-arrow {',
      '  font-size: 13px;',
      '  color: #005a8c;',
      '  transition: transform 0.25s;',
      '}',
      '#site-nav-bar .site-nav-hint {',
      '  font-size: 12px;',
      '  font-weight: 400;',
      '  color: #888880;',
      '  margin-left: 40px;',
      '  letter-spacing: 0;',
      '}',
      '#site-nav-bar .site-nav-menu {',
      '  display: none;',
      '  position: absolute;',
      '  top: calc(100% + 14px);',
      '  left: 50%;',
      '  transform: translateX(-50%);',
      '  background: #fff;',
      '  border: 1.5px solid #d8d5cc;',
      '  box-shadow: 0 6px 20px rgba(0,0,0,0.12);',
      '  z-index: 10001;',
      '  min-width: 290px;',
      '  overflow: hidden;',
      '  text-align: left;',
      '}',
      '#site-nav-bar.open .site-nav-menu { display: block; }',
      '#site-nav-bar .site-nav-menu a {',
      '  display: block;',
      '  padding: 10px 16px;',
      '  font-family: "IBM Plex Mono", monospace;',
      '  font-size: 13px;',
      '  font-weight: 400;',
      '  color: #1a1a18;',
      '  text-decoration: none;',
      '  border-bottom: 1px solid #d8d5cc;',
      '  transition: background 0.1s, color 0.1s;',
      '  white-space: nowrap;',
      '}',
      '#site-nav-bar .site-nav-menu a:last-child { border-bottom: none; }',
      '#site-nav-bar .site-nav-menu a:hover { background: #005a8c; color: #fff; }',
      '#site-nav-bar .site-nav-menu a.current {',
      '  color: #005a8c;',
      '  font-weight: 600;',
      '  pointer-events: none;',
      '}',
      '#site-nav-bar .site-nav-menu a.current::before { content: "\\25B8 "; }',
      '@media (max-width: 620px) {',
      '  #site-nav-bar { padding: 10px 14px; }',
      '  #site-nav-bar .site-nav-title { font-size: 17px; }',
      '  #site-nav-bar .site-nav-hint { display: none; }',
      '  #site-nav-bar .site-nav-menu { min-width: 0; width: calc(100vw - 28px); }',
      '}'
    ].join('\n');
    document.head.appendChild(style);

    // Load IBM Plex Mono if not already present
    if (!document.querySelector('link[href*="IBM+Plex+Mono"]')) {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&display=swap';
      document.head.appendChild(link);
    }
  }

  // ── Detect base path (handles a GitHub Pages project subdirectory) ────
  // On a custom domain (example.com):     base = ''
  // On Pages (user.github.io/repo-name):  base = '/repo-name'
  var basePath = '';
  (function detectBase() {
    var path = window.location.pathname;
    for (var i = 0; i < pages.length; i++) {
      var href = pages[i].href;
      if (href === '/') continue;
      var idx = path.indexOf(href);
      if (idx > 0) { basePath = path.substring(0, idx); return; }
    }
    if (path !== '/' && path !== '/index.html') {
      var cleaned = path.replace(/\/index\.html$/, '').replace(/\/+$/, '');
      var isPage = false;
      for (var j = 0; j < pages.length; j++) {
        var ph = pages[j].href.replace(/\/+$/, '') || '/';
        if (cleaned === ph) { isPage = true; break; }
      }
      if (!isPage && cleaned) {
        // The path is not a listed page (a 404, or any page absent from
        // `pages`). If it still ends in a filename, that filename is NOT part
        // of the base — drop it. Without this the base becomes e.g.
        // '/404.html' and every nav link is built as '/404.html/help.html'.
        var seg = cleaned.split('/').pop();
        if (seg.indexOf('.') !== -1) {
          cleaned = cleaned.slice(0, cleaned.length - seg.length).replace(/\/+$/, '');
        }
        basePath = cleaned;
      }
    }
  })();

  // ── Detect current page ──────────────────────────────────────────────
  var path = window.location.pathname;
  var relativePath = basePath ? path.replace(basePath, '') : path;
  if (relativePath === '/index.html') relativePath = '/';
  var pathClean = relativePath.replace(/\/+$/, '') || '/';

  function isCurrent(href) {
    var h = href.replace(/\/+$/, '') || '/';
    return h === pathClean;
  }

  var currentTitle = pages[0].title;
  for (var i = 0; i < pages.length; i++) {
    if (isCurrent(pages[i].href)) { currentTitle = pages[i].title; break; }
  }

  // ── Build the nav bar ────────────────────────────────────────────────
  var bar = document.createElement('div');
  bar.id = 'site-nav-bar';

  var inner = document.createElement('div');
  inner.className = 'site-nav-inner';

  var title = document.createElement('button');
  title.className = 'site-nav-title';
  title.type = 'button';
  title.setAttribute('aria-haspopup', 'true');
  title.setAttribute('aria-expanded', 'false');
  title.innerHTML = '<span class="site-nav-arrow">▶</span> ' + currentTitle +
                    ' <span class="site-nav-arrow">◀</span>' +
                    '<span class="site-nav-hint">more pages</span>';

  function setOpen(open) {
    bar.classList.toggle('open', open);
    title.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  title.addEventListener('click', function (e) {
    e.stopPropagation();
    setOpen(!bar.classList.contains('open'));
  });

  var menu = document.createElement('div');
  menu.className = 'site-nav-menu';

  for (var k = 0; k < pages.length; k++) {
    var a = document.createElement('a');
    a.href = basePath + pages[k].href;
    a.textContent = pages[k].title;
    if (isCurrent(pages[k].href)) {
      a.className = 'current';
      a.setAttribute('aria-current', 'page');
    }
    menu.appendChild(a);
  }

  inner.appendChild(title);
  inner.appendChild(menu);
  bar.appendChild(inner);

  // ── Close on outside click or Escape ─────────────────────────────────
  document.addEventListener('click', function () { setOpen(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' || e.key === 'Esc') setOpen(false);
  });

  // ── Insert at the very top of body ───────────────────────────────────
  function inject() {
    if (document.body && !document.getElementById('site-nav-bar')) {
      document.body.insertBefore(bar, document.body.firstChild);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
