// demo.js - runs the real citation bar over a frozen PubMed results page.
//
// The bar's code here is an unmodified copy of the extension's. Everything it
// normally gets from Chrome or from the network is supplied by the shim below,
// so the demo works with no extension installed. The one live call is an
// article's free full text, fetched from Europe PMC (and PubMed Central for NIH
// manuscripts) only when a visitor opens its abstract or builds an AI pack.
//
// Two things make this possible without touching the bar's own code:
//   1. injectCitationBars() takes all its dependencies as arguments.
//   2. The export list checks its cache before fetching, so seeding the cache
//      with the MEDLINE records means ticking an article never hits the network.

import { injectCitationBars } from './citationBarContentScript.js';
import { helpStyles, generateHelpHTML, getHelpText, loadTooltips,
         resolveBarLanguage, BAR_LANGUAGES } from './helpContent.js';
import { KEY_SEARCHES } from './keySearches.js';

const DATA_URL = './data/demo-data.json';

// Version of the bar code copied into this folder (citationBarContentScript.js,
// helpContent.js, keySearches.js, resultsTranslate.js, locales/, pdfConvert.js,
// lib/). Shown in the banner and written into the AI pack's README; update it
// whenever those copies are refreshed. The data can be older than the bar.
const BAR_VERSION = '3.900';

// ---------------------------------------------------------------------------
// chrome.* shim
//
// Storage is in-memory and seeded with the MEDLINE records, so the export list
// behaves exactly as it does in the extension - ticking, untickng, the count,
// the modal and both downloads - with nothing to fetch. It is deliberately not
// persisted: every reload gives the next visitor a clean demo.
function installChromeShim(medlineRecords) {
    const store = {
        pcbExportPMIDs: [],
        pcbExportRecords: medlineRecords || {},
        citationBarState: true,
        filterState: false
    };

    // resultsTranslate.js listens for a language change through onChanged,
    // exactly as it does in the extension, so set() reports what it changed.
    const changeListeners = [];

    const pick = (keys) => {
        if (keys == null) return { ...store };
        const list = Array.isArray(keys) ? keys : [keys];
        const out = {};
        list.forEach(k => { if (k in store) out[k] = store[k]; });
        return out;
    };

    window.chrome = {
        storage: {
            local: {
                get: (keys, cb) => {
                    const result = pick(typeof keys === 'string' || Array.isArray(keys) ? keys : null);
                    if (cb) { cb(result); return; }
                    return Promise.resolve(result);
                },
                set: (obj, cb) => {
                    const changes = {};
                    Object.keys(obj).forEach(k => { changes[k] = { oldValue: store[k], newValue: obj[k] }; });
                    Object.assign(store, obj);
                    changeListeners.forEach(fn => { try { fn(changes, 'local'); } catch (e) { console.log(e); } });
                    if (cb) { cb(); return; }
                    return Promise.resolve();
                },
                remove: (keys, cb) => {
                    (Array.isArray(keys) ? keys : [keys]).forEach(k => { delete store[k]; });
                    if (cb) { cb(); return; }
                    return Promise.resolve();
                },
                getBytesInUse: () => Promise.resolve(0)
            },
            onChanged: { addListener: (fn) => { changeListeners.push(fn); } }
        },
        // The bar language follows the browser's until the visitor picks one,
        // the same rule the extension applies with Chrome's language.
        i18n: { getUILanguage: () => navigator.language || 'en' },
        runtime: {
            // Everything the bar asks for sits beside this page. The language
            // files are in locales/, not _locales/: GitHub Pages does not
            // publish folders whose name starts with an underscore.
            getURL: (path) => {
                const clean = String(path).replace(/^\/+/, '').replace(/^_locales\//, 'locales/');
                return new URL('./' + clean, import.meta.url).href;
            },
            sendMessage: (message) => handleRuntimeMessage(message),
            getManifest: () => ({ version: BAR_VERSION }),
            lastError: null
        }
    };
}

// ---------------------------------------------------------------------------
// Background-worker messages
//
// The `doi` link does not open a URL directly. It asks the background worker to
// COLLECT the DOI, which finds an existing DOI-Ref-Lookup tab, appends this DOI
// to the ones already in its address bar (up to 15), and re-points that one tab
// at the combined list. Clicking `doi` on five articles gathers all five into a
// single lookup, and that is the feature worth demonstrating.
//
// Reproduced here with the same rules: the extension reuses one tab by tab id,
// this reuses one by window NAME, which has the same effect - window.open with
// a name re-points the existing window rather than opening another.
const REF_LOOKUP_URL = 'https://doilookup.com/';
const MAX_REF_DOIS = 15;
const collectedDois = [];

function handleRuntimeMessage(message) {
    const action = message && message.action;

    if (action === 'openInRefLookup') {
        const doi = message.doi;
        if (!doi) return Promise.resolve({ status: 'error' });

        if (collectedDois.length >= MAX_REF_DOIS && !collectedDois.includes(doi)) {
            return Promise.resolve({ status: 'max' });
        }
        if (!collectedDois.includes(doi)) collectedDois.push(doi);

        // Opened synchronously, inside the click, so the browser still counts
        // it as user-initiated and no popup blocker intervenes.
        window.open(`${REF_LOOKUP_URL}?doi=${encodeURIComponent(collectedDois.join(','))}`,
                    'pcbRefLookup');
        return Promise.resolve({ status: 'ok' });
    }

    // Altmetric scores come through the worker to dodge CORS. Returning the
    // same shape a failed lookup returns leaves the bar's own handling intact.
    if (action === 'getAltmetricScore') {
        return Promise.resolve({ score: null });
    }

    // Choosing a language on the bar saves barLanguage and asks the worker to
    // redraw the bars from the data already loaded. Same here, with no fetch
    // beyond the language file.
    if (action === 'injectCitationBarCustom') {
        return injectBars().then(() => ({ message: 'ok' }));
    }

    // AI pack "Convert PDF": the worker injects pdf.js, pdf-lib and the
    // converter into the tab on first use. Here they are added as plain
    // scripts from this folder, in the same order, and the answer has the
    // same shape. The PDF is read in the visitor's browser; nothing is sent.
    if (action === 'pcbLoadPdfTools') {
        return loadPdfTools().then(() => ({ ok: true }), error => ({ error: error.message }));
    }

    return Promise.resolve({ success: false, demo: true });
}

const PDF_TOOLS = ['lib/pdf.min.js', 'lib/pdf.worker.min.js', 'lib/pdf-lib.min.js', 'pdfConvert.js'];
let pdfToolsLoading = null;

function loadPdfTools() {
    if (!pdfToolsLoading) {
        pdfToolsLoading = PDF_TOOLS.reduce((ready, file) => ready.then(() => new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = new URL('./' + file, import.meta.url).href;
            script.onload = resolve;
            script.onerror = () => reject(new Error('could not load ' + file));
            document.head.appendChild(script);
        })), Promise.resolve());
        pdfToolsLoading.catch(() => { pdfToolsLoading = null; });
    }
    return pdfToolsLoading;
}

// ---------------------------------------------------------------------------
// Offline author and MeSH data, both rebuilt from the cached MEDLINE records.
//
// MEDLINE wraps long values onto continuation lines indented by six spaces, so
// affiliations in particular arrive in pieces. This returns the record as an
// ordered list of [tag, value] with continuations rejoined, which is what the
// author parsing below needs - authors are defined by the ORDER of the lines,
// not just their tags.
function medlineFields(medline) {
    const fields = [];
    let current = null;
    String(medline || '').split(/\r?\n/).forEach(line => {
        if (!line.trim()) return;
        const start = line.match(/^([A-Z][A-Z0-9]{0,3})\s*-\s?(.*)$/);
        if (start) {
            current = { tag: start[1], value: start[2].trim() };
            fields.push(current);
        } else if (/^\s+/.test(line) && current) {
            current.value += ' ' + line.trim();
        }
    });
    return fields;
}

// The Author modal fetches efetch XML and reads Author / LastName / ForeName /
// Initials / Identifier[Source=ORCID] / AffiliationInfo. All of that is in the
// cached MEDLINE record, grouped by position:
//
//   FAU - Thiene, Gaetano      <- starts an author
//   AU  - Thiene G             <- initials for that author
//   AUID- ORCID: 0000-0002-... <- their ORCID, when present
//   AD  - Cardiovascular ...   <- their affiliation
//
// so the XML is rebuilt by walking the fields in order and attaching each
// AU / AUID / AD to the FAU that preceded it.
function authorXmlFromMedline(medline) {
    const authors = [];
    let current = null;

    medlineFields(medline).forEach(field => {
        if (field.tag === 'FAU') {
            const comma = field.value.indexOf(',');
            current = {
                last: comma === -1 ? field.value : field.value.slice(0, comma).trim(),
                fore: comma === -1 ? '' : field.value.slice(comma + 1).trim(),
                initials: '',
                orcid: '',
                affiliations: []
            };
            authors.push(current);
            return;
        }
        if (!current) return;
        if (field.tag === 'AU') {
            const bits = field.value.trim().split(/\s+/);
            current.initials = bits.length > 1 ? bits[bits.length - 1] : '';
        } else if (field.tag === 'AUID') {
            // Stored as "ORCID: 0000-0002-4909-9246"; the modal builds
            // orcid.org and OpenAlex URLs from the bare identifier.
            current.orcid = field.value.replace(/^ORCID:\s*/i, '')
                                       .replace(/^https?:\/\/orcid\.org\//i, '')
                                       .trim();
        } else if (field.tag === 'AD') {
            current.affiliations.push(field.value);
        }
    });

    return authors.map(a => {
        let xml = `<Author ValidYN="Y"><LastName>${escapeXml(a.last)}</LastName>`;
        if (a.fore) xml += `<ForeName>${escapeXml(a.fore)}</ForeName>`;
        if (a.initials) xml += `<Initials>${escapeXml(a.initials)}</Initials>`;
        if (a.orcid) xml += `<Identifier Source="ORCID">${escapeXml(a.orcid)}</Identifier>`;
        a.affiliations.forEach(aff => {
            xml += `<AffiliationInfo><Affiliation>${escapeXml(aff)}</Affiliation></AffiliationInfo>`;
        });
        return xml + '</Author>';
    }).join('');
}

// The MeSH modal reads MeshHeading / DescriptorName / QualifierName from the
// same efetch XML. Every term is in the record as MH lines:
//
//   MH  - Heart Diseases/*epidemiology/therapy
//   MH  - *Frail Elderly
//
// A leading * marks the descriptor as a major topic; a * after a slash marks
// that qualifier as major. Both are reproduced faithfully below.
function meshXmlFromMedline(medline) {
    const lines = String(medline || '').split(/\r?\n/);
    const headings = [];

    lines.forEach(line => {
        const match = line.match(/^MH\s*-\s*(.+)$/);
        if (!match) return;
        const parts = match[1].trim().split('/');
        const rawDescriptor = parts.shift();
        const descriptorMajor = rawDescriptor.startsWith('*');
        const descriptor = rawDescriptor.replace(/^\*/, '');

        let xml = `<MeshHeading><DescriptorName MajorTopicYN="${descriptorMajor ? 'Y' : 'N'}">` +
                  `${escapeXml(descriptor)}</DescriptorName>`;
        parts.forEach(rawQualifier => {
            const qualifierMajor = rawQualifier.startsWith('*');
            const qualifier = rawQualifier.replace(/^\*/, '');
            xml += `<QualifierName MajorTopicYN="${qualifierMajor ? 'Y' : 'N'}">` +
                   `${escapeXml(qualifier)}</QualifierName>`;
        });
        headings.push(xml + '</MeshHeading>');
    });

    // Keywords (the "+" in MeSH+) are in the record too, as an OTO line naming
    // who supplied them (NOTNLM = the authors) followed by its OT lines:
    //
    //   OTO - NOTNLM
    //   OT  - Bicuspid aortic valve
    //
    // Each OTO starts a KeywordList with that Owner, as efetch returns them.
    const keywordLists = [];
    medlineFields(medline).forEach(field => {
        if (field.tag === 'OTO') {
            keywordLists.push({ owner: field.value || 'NOTNLM', terms: [] });
        } else if (field.tag === 'OT') {
            if (!keywordLists.length) keywordLists.push({ owner: 'NOTNLM', terms: [] });
            keywordLists[keywordLists.length - 1].terms.push(field.value);
        }
    });
    const keywordXml = keywordLists.map(list =>
        `<KeywordList Owner="${escapeXml(list.owner)}">` +
        list.terms.map(t => `<Keyword MajorTopicYN="N">${escapeXml(t)}</Keyword>`).join('') +
        '</KeywordList>').join('');

    // One document carries all of it, exactly as a real efetch response does, so
    // the same synthesized XML answers the MeSH+ modal and the Author modal.
    return `<?xml version="1.0"?><PubmedArticleSet><PubmedArticle><MedlineCitation>` +
           `<Article><AuthorList CompleteYN="Y">${authorXmlFromMedline(medline)}</AuthorList></Article>` +
           `<MeshHeadingList>${headings.join('')}</MeshHeadingList>` + keywordXml +
           `</MedlineCitation></PubmedArticle></PubmedArticleSet>`;
}

// The extension ships with SKIP_ABSTRACTS on, so every record arrives with
// Abstract = "No abstract" and the bar fetches on demand when you click. The
// abstract is already sitting in the cached MEDLINE record as AB lines, so it
// is lifted out and written into the dataset before injection - the bar then
// takes its early-return path and never asks the network at all.
function abstractFromMedline(medline) {
    const lines = String(medline || '').split(/\r?\n/);
    const parts = [];
    let collecting = false;
    for (const line of lines) {
        const start = line.match(/^AB\s*-\s*(.*)$/);
        if (start) { collecting = true; parts.push(start[1].trim()); continue; }
        if (collecting) {
            if (/^\s+\S/.test(line)) { parts.push(line.trim()); continue; }
            break;
        }
    }
    return parts.join(' ').trim();
}

function escapeXml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// Anything aimed at NCBI's PubMed records is answered locally. Every other
// fetch is left alone; of the bar's own calls, only free full text (Europe PMC,
// and PubMed Central for NIH manuscripts) goes out, for the abstract box and
// the AI pack.
function installFetchShim(medlineRecords, iciteSearchIds, journalSources) {
    const realFetch = window.fetch.bind(window);
    window.fetch = (input, init) => {
        const url = typeof input === 'string' ? input : (input && input.url) || '';

        // The Cited link POSTs a PMID to iCite, which mints a saved search and
        // returns its id; the bar then opens /results?searchId=<id>. That POST
        // cannot work from a web page - the extension only gets past CORS via
        // its host permissions - and iCite has no GET URL for a single article.
        //
        // So the ids were minted by hand and are answered here. The bar's own
        // code is untouched: it makes the request it always makes, gets the
        // response shape it expects, and opens the genuine iCite view for that
        // article. Articles without a pre-minted id are handled at the click
        // instead, so they never reach this point.
        if (url.includes('icite.od.nih.gov/iciterest/store-search')) {
            let pmid = '';
            try {
                pmid = (JSON.parse(init && init.body).searchRequest.pmids || [])[0] || '';
            } catch (e) { /* fall through to the 503 below */ }
            const id = iciteSearchIds[pmid];
            if (id) {
                return Promise.resolve(new Response(JSON.stringify({ id }), {
                    status: 200, headers: { 'Content-Type': 'application/json' }
                }));
            }
            return Promise.resolve(new Response('{}', { status: 503 }));
        }

        // The abstract box and the AI pack fetch an NIH author manuscript's
        // full text from PMC when Europe PMC has none. That is the live path,
        // not a PubMed record, so it goes to NCBI as it does in the extension.
        if (url.includes('eutils.ncbi.nlm.nih.gov') && url.includes('db=pmc')) {
            return realFetch(input, init);
        }

        if (url.includes('eutils.ncbi.nlm.nih.gov')) {
            const pmid = (url.match(/[?&]id=(\d+)/) || [])[1];
            const record = medlineRecords[pmid];
            const body = url.includes('rettype=medline')
                ? (record || '')
                : meshXmlFromMedline(record);
            return Promise.resolve(new Response(body, {
                status: record ? 200 : 404,
                headers: { 'Content-Type': 'text/plain' }
            }));
        }
        // The J panel asks OpenAlex for the journal's record by ISSN. Those
        // records were captured with the demo data, keyed by the journal's
        // ISSNs joined with "|" (the bar's own cache key), and are answered
        // here; a journal that was not captured gets the bar's "not found".
        const source = url.match(/api\.openalex\.org\/sources\/issn:([^?]+)/);
        if (source) {
            const issn = decodeURIComponent(source[1]);
            const key = Object.keys(journalSources).find(k => k.split('|').includes(issn));
            const record = key ? journalSources[key] : null;
            return Promise.resolve(new Response(JSON.stringify(record || {}), {
                status: record ? 200 : 404, headers: { 'Content-Type': 'application/json' }
            }));
        }

        // Author ORCIDs and indexes travel in the dataset, as they do in the
        // extension. The rest of OpenAlex is refused here, so the Author box
        // shows exactly that capture; an author without one shows the usual
        // "requires ORCID".
        if (url.includes('icite.od.nih.gov') ||
            url.includes('api.crossref.org') ||
            url.includes('api.openalex.org')) {
            return Promise.resolve(new Response('{}', { status: 503 }));
        }
        return realFetch(input, init);
    };
}

// Articles with no pre-minted iCite id are intercepted before the bar's own
// handler runs - capture phase, so stopPropagation keeps the click from
// reaching the element listener. Without this the bar would fall back to
// opening iCite's front page, which looks broken rather than explained.
function installIciteNotice(iciteSearchIds) {
    document.addEventListener('click', (event) => {
        const link = event.target.closest && event.target.closest('.icite-link');
        if (!link) return;
        if (iciteSearchIds[link.getAttribute('data-pmid')]) return;

        event.preventDefault();
        event.stopPropagation();

        document.querySelectorAll('.demo-note').forEach(n => n.remove());
        const note = document.createElement('span');
        note.className = 'demo-note';
        note.textContent = 'iCite opens this exact article in the extension. ' +
                           'Only the top articles are pre-linked in the demo.';
        link.parentNode.insertBefore(note, link.nextSibling);
        setTimeout(() => note.remove(), 5000);
    }, true);
}

// ---------------------------------------------------------------------------
// Build the frozen results list from the captured dataset, using the same
// markup PubMed uses, because the bar finds articles by those class names.
function buildResults(fullDataSet) {
    const list = document.getElementById('search-results');
    list.innerHTML = '';

    fullDataSet.forEach((item, index) => {
        const article = document.createElement('article');
        article.className = 'full-docsum';

        const authors = [item.firstAuthor, item.lastAuthor].filter(Boolean).join(', ');
        const citation = [
            item.Journal && item.Journal !== '0' ? item.Journal + '.' : '',
            item.PublishDate && item.PublishDate !== '0' ? item.PublishDate + '.' : ''
        ].filter(Boolean).join(' ');

        article.innerHTML = `
            <div class="docsum-content">
                <span class="docsum-index">${index + 1}</span>
                <a class="docsum-title" href="https://pubmed.ncbi.nlm.nih.gov/${item.PMID}/" target="_blank" rel="noopener">
                    ${escapeHtml(item.Title && item.Title !== '0' ? item.Title : 'PMID ' + item.PMID)}
                </a>
                <div class="docsum-authors">${escapeHtml(authors || '&nbsp;')}</div>
                <div class="docsum-journal-citation-wrapper">
                    <span class="docsum-journal-citation">${escapeHtml(citation)}</span>
                    <span class="citation-part">PMID: <span class="docsum-pmid">${item.PMID}</span></span>
                </div>
            </div>`;
        list.appendChild(article);
    });
}

function escapeHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
(async function start() {
    const status = document.getElementById('demo-status');
    let payload;

    try {
        const response = await fetch(DATA_URL);
        if (!response.ok) throw new Error('HTTP ' + response.status);
        payload = await response.json();
    } catch (error) {
        status.textContent = 'Demo data could not be loaded (' + error.message + ').';
        status.style.display = 'block';
        return;
    }

    const fullDataSet = payload.fullDataSet || [];
    const medlineRecords = payload.medlineRecords || {};
    const iciteSearchIds = payload.iciteSearchIds || {};

    if (fullDataSet.length === 0) {
        status.textContent = 'Demo data is empty.';
        status.style.display = 'block';
        return;
    }

    fullDataSet.forEach(item => {
        const abstract = abstractFromMedline(medlineRecords[item.PMID]);
        if (abstract) item.Abstract = abstract;
    });

    installChromeShim(medlineRecords);
    installFetchShim(medlineRecords, iciteSearchIds, payload.journalSources || {});
    installIciteNotice(iciteSearchIds);
    buildResults(fullDataSet);

    document.getElementById('result-count').textContent =
        fullDataSet.length.toLocaleString() + ' results';
    document.getElementById('pm-query').value = payload.query || '';

    // Say when the snapshot was taken. Citation counts and scores are frozen at
    // that moment, and presenting them as current would be the one dishonest
    // thing in a tool built on not doing that.
    if (payload.capturedUTC) {
        const captured = new Date(payload.capturedUTC);
        document.getElementById('snapshot-date').textContent =
            captured.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    }
    document.getElementById('snapshot-version').textContent = BAR_VERSION;

    demoDataSet = fullDataSet;
    demoIciteData = payload.iciteData || null;

    // The results translator (titles into the bar language) is the extension's
    // own content script. It reads chrome.* when it loads, so it is added only
    // now that the shim is in place.
    const translator = document.createElement('script');
    translator.src = new URL('./resultsTranslate.js', import.meta.url).href;
    document.head.appendChild(translator);

    await injectBars();
})();

// ---------------------------------------------------------------------------
// Draw (or redraw) the bars in the current bar language, the way the
// extension's insertCitationBar does: help text, help panel and hover text are
// all built for that language before the bar is injected.
let demoDataSet = [];

// Monthly iCite citations for the chart icon after "Cited N", captured with
// the data: {version, baseline, months, papers}. null leaves the icons grey.
let demoIciteData = null;

async function injectBars() {
    const { barLanguage } = await chrome.storage.local.get('barLanguage');
    const lang = resolveBarLanguage(barLanguage);
    const tooltips = await loadTooltips(lang);

    // handlers is a dead parameter in the bar - declared but never read, since
    // functions cannot survive executeScript serialisation. Passed empty.
    injectCitationBars(
        demoDataSet,
        { citationBarEnabled: true, filterEnabled: false, barLanguage: lang, barLanguages: BAR_LANGUAGES },
        getHelpText(lang),
        helpStyles,
        generateHelpHTML(lang),
        tooltips,
        {},
        'demo',
        KEY_SEARCHES,
        demoIciteData
    );
}
