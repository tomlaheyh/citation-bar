# Citation Bar demo

A frozen PubMed results page with the real citation bar running over it, so
people can try the extension without installing it. Published at
`https://tomlaheyh.github.io/citation-bar/demo/`.

## Why it exists

Installing a Chrome extension is impossible on many managed hospital and
university machines, which is a large part of the audience. This page removes
that barrier and gives librarians something they can link to in a guide and
authors something they can cite in a paper.

## How it works

`demo.js` supplies everything the bar would normally get from Chrome or the
network:

- **`chrome.*` shim** — in-memory `storage.local`, plus `runtime.getURL` and a
  no-op `sendMessage`. Storage is not persisted, so every visitor gets a clean
  demo.
- **Seeded export cache** — `pcbExportRecords` is pre-filled with the MEDLINE
  record for every article on the page. The export list checks its cache before
  fetching, so ticking an article never touches the network, and the `.nbib` and
  `.ris` downloads produce genuine files.
- **Offline MeSH+** — the MeSH+ modal parses efetch XML. `demo.js` rebuilds that
  XML from the `MH` lines (MeSH terms, including major-topic asterisks and
  subheadings) and the `OTO`/`OT` lines (keywords, grouped by who supplied them)
  already present in the cached MEDLINE records, so everything shown is real.
- **Languages** — the shim's `chrome.i18n.getUILanguage` returns the browser's
  language and `runtime.getURL` serves the language files beside this page, so
  the EN tag works as in the extension. The files are in `locales/`, not
  `_locales/`: GitHub Pages does not publish folders whose name starts with an
  underscore, so `getURL` maps one name to the other. `resultsTranslate.js` is
  loaded after the shim and translates the result titles with Chrome's on-device
  Translator (Chrome 138+); in other browsers titles simply stay in English.
- **Author data** — the first and last authors' ORCIDs, indexes, works, cites
  and retraction counts travel in `fullDataSet`, exactly as the extension stores
  them, so the Author box needs no request. OpenAlex itself is refused.
- **Journal panel (J)** — the bar asks OpenAlex for the journal record by ISSN.
  Those records are in the data file as `journalSources` and are answered
  locally.
- **Monthly citation chart** — the icon after "Cited N" is drawn from
  `iciteData` in the data file, the same shape the extension's background
  worker passes to the bar.
- **Cited link** — the bar asks iCite for a saved-search id, which a web page
  cannot do. The ids are in the data file as `iciteSearchIds`.
- **Key searches (kS)** — `keySearches.js` is passed to the bar as in the
  extension. Each search opens on live PubMed in a new tab.
- **Free full text** — the one live request in the demo: Europe PMC, and PubMed
  Central (`efetch db=pmc`) for NIH author manuscripts, when a visitor opens an
  abstract that has free full text or builds an AI pack.
- **Convert PDF** — `pcbLoadPdfTools` is answered by adding `lib/pdf.min.js`,
  `lib/pdf.worker.min.js`, `lib/pdf-lib.min.js` and `pdfConvert.js` as plain
  scripts, in the order the extension injects them. The visitor's PDF is read in
  their browser and never uploaded.
- **Fetch interception** — PubMed record requests to NCBI are answered locally,
  and iCite, Crossref and the rest of OpenAlex are refused. Apart from free full
  text, nothing reaches an API.

Outbound links (Altmetric, Google Scholar, Semantic Scholar, SJR, PMC, PubMed,
doilookup) are left alone and work normally — a visitor clicking one is ordinary
browsing.

The results appear sorted by score, with PubMed's own result numbers out of
order. That is the bar: it re-sorts every results page that way.

Two features can't be demonstrated because they need a live search: **Xout** and
**Scan 1,000**. The page footer says so.

## Updating the data

The extension generates its own fixtures. Run a search that shows the range of
the bar, let the bar load, then tick every article and wait for every tick to
turn green. That caches a full MEDLINE record (abstract and MeSH included) for
each one.

Then in the extension's service worker console (`chrome://extensions` →
PubMed Citation Bar → "service worker"), with the query filled in:

```js
(async () => {
  const d = await chrome.storage.local.get(['fullDataSet', 'pcbExportRecords']);
  const set = d.fullDataSet || [], recs = d.pcbExportRecords || {};
  const pmids = set.map(x => String(x.PMID));

  const iciteData = await self.ICite.lookup(pmids.map(Number));

  const iciteSearchIds = {};
  for (const pmid of pmids) {
    try {
      const r = await fetch('https://icite.od.nih.gov/iciterest/store-search', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userType: 'app', searchType: 'List of PMIDs input',
          searchRequest: { pubmedQueryStr: '', uploadedFileName: '', pmids: [pmid],
                           activeTab: 'infl', papersSearch: '', filters: [] } }) });
      const j = await r.json();
      if (j.id) iciteSearchIds[pmid] = j.id;
    } catch (e) {}
    await new Promise(r => setTimeout(r, 400));
  }

  const fields = 'display_name,country_code,host_organization_name,is_oa,is_in_doaj,apc_usd,summary_stats,first_publication_year';
  const journalSources = {};
  for (const x of set) {
    const issns = [x.issn, x.essn].map(s => (s || '').trim()).filter(Boolean);
    const key = issns.join('|');
    if (!key || key in journalSources) continue;
    journalSources[key] = null;
    for (const issn of issns) {
      try {
        const r = await fetch(`https://api.openalex.org/sources/issn:${encodeURIComponent(issn)}?select=${fields}`);
        if (r.ok) { journalSources[key] = await r.json(); break; }
      } catch (e) {}
    }
  }

  const missing = pmids.filter(p => !recs[p]);
  globalThis.demoCapture = JSON.stringify({
    capturedUTC: new Date().toISOString(),
    extensionVersion: chrome.runtime.getManifest().version,
    query: 'the search term you used',
    fullDataSet: set, medlineRecords: recs,
    iciteData, iciteSearchIds, journalSources
  }, null, 1);
  console.log('articles', set.length, '| records', pmids.length - missing.length,
    '| missing', missing, '| first:', set[0] && set[0].Title, '| READY');
})();
```

`fullDataSet` holds whichever PubMed page loaded last, so check that `first:`
is the first title on the page and that `missing` is empty. Then, as a second
command, download the capture through the PubMed tab (`copy()` is not available
once the snippet has waited on the network):

```js
chrome.tabs.query({ url: 'https://pubmed.ncbi.nlm.nih.gov/*' }).then(tabs => chrome.scripting.executeScript({
  target: { tabId: tabs[0].id },
  args: [demoCapture],
  func: (text) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    a.download = 'demo-data-new.json';
    a.click();
  }
}))
```

Before it becomes `data/demo-data.json`, drop any `medlineRecords` whose PMID is
not in `fullDataSet`: the export cache also holds articles ticked on earlier
pages.

## Keeping it current

`citationBarContentScript.js`, `helpContent.js`, `keySearches.js`,
`resultsTranslate.js`, `pdfConvert.js`, `connections-preview.png`, the `lib`
folder and the `locales` folder (the extension's `_locales`) here are **copies**
taken from the extension. They do not update themselves. When the bar changes in
a way a visitor would notice, copy all of them again and set `BAR_VERSION` at
the top of `demo.js` to match. If the bar gains an argument, a message or a
request, `demo.js` has to supply it. Recapture the data only if the bar needs
fields the old data lacks.

Bar code: PubMed Citation Bar **v3.900**. Data captured with **v3.900** on
2026-11-14 (UTC), query `2025 [crdt] heart disease`.
