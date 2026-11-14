// resultsTranslate.js - translates the titles and snippets of PubMed's search
// results into the bar language (barLanguage) with Chrome's on-device
// Translator (Chrome 138+).
//
// Loaded with every PubMed page (manifest content_scripts), so it starts at
// page load instead of waiting for the citation bar, and it reacts to a
// language change by itself. It only changes result titles and snippets,
// never the bar.
//
// All titles and snippets go to the translator as one text per batch of 25
// results, each piece behind a numbered marker line ([[1]], [[2]], ...). The
// answer is split back on the markers and each piece put back in place. A
// piece whose marker does not come back cleanly is translated on its own, so
// a translation never lands on the wrong article. Two batches run at once.
//
// The English original of each piece is kept on its element
// (data-pcb-orig-raw / -text / -html). getPMID-DOI-Title-Journal.js reads the
// title from data-pcb-orig-raw, so the stored data stays in English.
//
// Stands aside while the browser translates the whole page itself (Chrome's
// or Edge's page translation), and exposes window.__pcbBrowserTranslated so
// the abstract popup can do the same.
//
// Shares window.__pcbTranslators with the abstract popup's translation in
// citationBarContentScript.js; the bar's language menu calls
// window.__pcbStartResultsTranslator so Chrome's first-time language
// download starts from the click.

(() => {
    if (window.__pcbResultsLoaded) return;
    window.__pcbResultsLoaded = true;

    const pcbTranslators = window.__pcbTranslators || (window.__pcbTranslators = new Map());
    const PCB_RTL = ['ar', 'he', 'fa', 'ur'];
    const pcbLangName = (code) => {
        try { return new Intl.DisplayNames([code], { type: 'language' }).of(code) || code; }
        catch { return code; }
    };

    // Translator creations started from a click, by language
    const pcbTranslatorsStarting = window.__pcbTranslatorsStarting || (window.__pcbTranslatorsStarting = new Map());
    // Finished pieces for the page's life, by `${pmid}|${kind}|${lang}`
    const pcbResultsCache = window.__pcbResultsCache || (window.__pcbResultsCache = new Map());

    function pcbStartResultsTranslator(code) {
        if (code === 'en' || !('Translator' in self) || pcbTranslators.has(code) || pcbTranslatorsStarting.has(code)) return;
        const starting = Translator.create({ sourceLanguage: 'en', targetLanguage: code })
            .then(t => { pcbTranslators.set(code, t); return t; })
            .catch(err => { console.log(`[PCB results] could not create en -> ${code} translator:`, err); return null; })
            .finally(() => pcbTranslatorsStarting.delete(code));
        pcbTranslatorsStarting.set(code, starting);
    }

    // Status box at the top centre (below the search notice when that is
    // showing). busy adds a spinner, so a long run doesn't look stuck.
    function pcbResultsStatus(text, hideAfterMs, busy = false) {
        if (!document.getElementById('pcb-results-status-style')) {
            const style = document.createElement('style');
            style.id = 'pcb-results-status-style';
            style.textContent = '@keyframes pcbSpin { to { transform: rotate(360deg); } }';
            document.head.appendChild(style);
        }
        let box = document.getElementById('pcb-results-status');
        if (!box) {
            box = document.createElement('div');
            box.id = 'pcb-results-status';
            box.style.cssText = 'position:fixed; left:50%; transform:translateX(-50%); z-index:10002; display:flex; align-items:center; gap:10px; max-width:560px; background:#fff; border:2px solid #6B3E26; border-radius:6px; box-shadow:0 2px 10px rgba(0,0,0,0.25); padding:10px 16px; font-size:15px; color:#6B3E26;';
            box.innerHTML = '<span class="pcb-spin" style="width:16px; height:16px; flex:none; border:3px solid #F3E9DC; border-top-color:#6B3E26; border-radius:50%; animation:pcbSpin 0.8s linear infinite;"></span><span class="pcb-text"></span>';
            document.body.appendChild(box);
        }
        const notice = document.getElementById('pcb-search-notice');
        box.style.top = notice ? `${notice.getBoundingClientRect().bottom + 8}px` : '12px';
        box.querySelector('.pcb-spin').style.display = busy ? '' : 'none';
        box.querySelector('.pcb-text').textContent = text;
        clearTimeout(box._hide);
        if (hideAfterMs) box._hide = setTimeout(() => box.remove(), hideAfterMs);
    }

    // Page translated by the browser itself: Chrome marks <html> with
    // translated-ltr / translated-rtl, Microsoft's translator (Edge) marks
    // each translated element with _msttexthash.
    const browserTranslated = () =>
        document.documentElement.classList.contains('translated-ltr') ||
        document.documentElement.classList.contains('translated-rtl') ||
        !!document.querySelector('[_msttexthash]');
    window.__pcbBrowserTranslated = browserTranslated;

    // Result titles and snippets that ours has translated. The marker has its
    // own name (data-pcb-tr-lang): the bar's click binding already puts
    // data-pcb-lang on its language tag.
    const TRANSLATED = 'article.full-docsum a.docsum-title[data-pcb-tr-lang], article.full-docsum .full-view-snippet[data-pcb-tr-lang]';

    // Put PubMed's own text (with its highlighting) back wherever ours translated
    const restoreEnglish = () => {
        document.querySelectorAll(TRANSLATED).forEach(el => {
            if (el.dataset.pcbOrigHtml === undefined) return;
            el.innerHTML = el.dataset.pcbOrigHtml;
            el.removeAttribute('title');
            el.dir = '';
            delete el.dataset.pcbTrLang;
        });
    };

    async function translateResultsPage(lang) {
        // One run at a time. A call during a run (Show more, a language
        // change) is remembered, and the run repeats when it finishes.
        if (window.__pcbResultsBusy) { window.__pcbResultsAgain = true; return; }
        // The browser is translating the whole page: stand aside, so nothing is
        // translated twice and the browser's translation is never saved as
        // PubMed's English. What ours had translated goes back to English, so
        // the browser translates from the original.
        if (browserTranslated()) {
            if (document.querySelector(TRANSLATED)) {
                console.log('[PCB results] page translated by the browser - ours restores English and stands aside');
                restoreEnglish();
            }
            return;
        }
        // Every title and snippet on the results page, in page order
        const pieces = [];
        document.querySelectorAll('article.full-docsum').forEach(article => {
            const pmid = article.querySelector('span.docsum-pmid')?.textContent.trim();
            if (!pmid) return;
            [['T', 'a.docsum-title'], ['S', '.full-view-snippet']].forEach(([kind, selector]) => {
                const el = article.querySelector(selector);
                if (!el) return;
                if (el.dataset.pcbOrigHtml === undefined) {
                    el.dataset.pcbOrigHtml = el.innerHTML;
                    el.dataset.pcbOrigRaw = el.textContent;
                    el.dataset.pcbOrigText = el.textContent.replace(/\s+/g, ' ').trim();
                }
                if (el.dataset.pcbOrigText) pieces.push({ pmid, kind, el, text: el.dataset.pcbOrigText });
            });
        });
        if (pieces.length === 0) return;

        // Back to English
        if (lang === 'en') {
            restoreEnglish();
            return;
        }

        const put = (piece, text) => {
            piece.el.textContent = text;
            piece.el.title = piece.text; // hover shows the English
            piece.el.dir = PCB_RTL.includes(lang.split('-')[0]) ? 'rtl' : '';
            piece.el.dataset.pcbTrLang = lang;
        };
        const keyOf = (p) => `${p.pmid}|${p.kind}|${lang}`;
        const pending = [];
        pieces.forEach(p => {
            if (p.el.dataset.pcbTrLang === lang) return;
            if (pcbResultsCache.has(keyOf(p))) put(p, pcbResultsCache.get(keyOf(p)));
            else pending.push(p);
        });
        if (pending.length === 0) return;
        window.__pcbResultsBusy = lang;
        const name = pcbLangName(lang);
        const started = performance.now();
        try {
            if (!('Translator' in self)) {
                console.log('[PCB results] Translator API not available (needs Chrome 138+)');
                pcbResultsStatus('Chrome\'s built-in translator is not available here (needs Chrome 138+).', 8000);
                return;
            }
            let translator = pcbTranslators.get(lang) || await pcbTranslatorsStarting.get(lang);
            if (!translator) {
                const availability = await Translator.availability({ sourceLanguage: 'en', targetLanguage: lang });
                console.log(`[PCB results] en -> ${lang}: ${availability}`);
                if (availability === 'unavailable') {
                    pcbResultsStatus(`Chrome can't translate to ${name}.`, 8000);
                    return;
                }
                if (availability !== 'available' && !navigator.userActivation?.isActive) {
                    pcbResultsStatus(`Choose ${name} on the bar's language tag to set up translation (one-time download).`, 10000);
                    return;
                }
                pcbResultsStatus(availability === 'available' ? `Translating results to ${name}…` : `Downloading ${name} for Chrome (first time only)…`, 0, true);
                translator = await Translator.create({ sourceLanguage: 'en', targetLanguage: lang });
                pcbTranslators.set(lang, translator);
            }

            // One text: a marker line, then the piece, for every piece
            const buildText = (list) => list.map((p, i) => `[[${i + 1}]]\n${p.text}`).join('\n');
            // Batches of 25 results, top of the page first, so the results on
            // screen turn over in a second or two and the counter moves
            const RESULTS_PER_BATCH = 25;
            const pmidOrder = [...new Set(pending.map(p => p.pmid))];
            const totalResults = pmidOrder.length;
            const batches = [];
            for (let i = 0; i < totalResults; i += RESULTS_PER_BATCH) {
                const group = new Set(pmidOrder.slice(i, i + RESULTS_PER_BATCH));
                batches.push({ from: i + 1, to: Math.min(i + RESULTS_PER_BATCH, totalResults), pieces: pending.filter(p => group.has(p.pmid)) });
            }
            // Safety net: halve any batch over Chrome's input limit
            if (translator.inputQuota && translator.measureInputUsage) {
                for (let b = 0; b < batches.length; b++) {
                    const usage = await translator.measureInputUsage(buildText(batches[b].pieces));
                    if (usage > translator.inputQuota && batches[b].pieces.length > 1) {
                        console.log(`[PCB results] batch over input limit (${usage} of ${translator.inputQuota}), halving`);
                        const { from, to, pieces: list } = batches[b];
                        const half = Math.ceil(list.length / 2);
                        batches.splice(b, 1, { from, to, pieces: list.slice(0, half) }, { from, to, pieces: list.slice(half) });
                        b--;
                    }
                }
            }

            // PARALLEL batches at once, each on its own translator (set to 1
            // for one at a time). Each free translator takes the next batch
            // from the top, so the page still fills top-down.
            const PARALLEL = 2;
            const translators = [translator];
            const extraMap = window.__pcbTranslatorsExtra || (window.__pcbTranslatorsExtra = new Map());
            const extras = extraMap.get(lang) || [];
            for (let w = 1; w < Math.min(PARALLEL, batches.length); w++) {
                if (!extras[w - 1]) {
                    try { extras[w - 1] = await Translator.create({ sourceLanguage: 'en', targetLanguage: lang }); }
                    catch (err) { console.log('[PCB results] extra translator not created, running fewer at once:', err); break; }
                }
                translators.push(extras[w - 1]);
            }
            extraMap.set(lang, extras);

            let markersBack = 0, retried = 0, nextBatch = 0, doneResults = 0;
            const showProgress = () => pcbResultsStatus(totalResults <= RESULTS_PER_BATCH
                ? `Translating ${totalResults} results to ${name}…`
                : `Translating ${totalResults} results to ${name}… ${Math.min(doneResults, totalResults)} of ${totalResults} done`, 0, true);
            showProgress();
            const runBatch = async (tr, b) => {
                const batch = batches[b].pieces;
                const answer = await tr.translate(buildText(batch));
                console.log(`[PCB results] batch ${b + 1} raw answer (first 600 chars):\n${answer.slice(0, 600)}`);

                // Break the answer back out by marker number
                // A piece counts only if its marker came back once AND the
                // next marker is the next number (or it ends the text), so a
                // lost marker can't fold one piece's text into another
                const found = new Map();
                const seen = new Map();
                const nextOk = new Map();
                const marks = [...answer.matchAll(/\[\[\s*(\d+)\s*\]\]/g)];
                marks.forEach((m, i) => {
                    const n = Number(m[1]);
                    const next = marks[i + 1];
                    const end = next ? next.index : answer.length;
                    found.set(n, answer.slice(m.index + m[0].length, end).trim());
                    seen.set(n, (seen.get(n) || 0) + 1);
                    nextOk.set(n, next ? Number(next[1]) === n + 1 : n === batch.length);
                });
                for (const [i, piece] of batch.entries()) {
                    const n = i + 1;
                    let text = seen.get(n) === 1 && nextOk.get(n) ? found.get(n) : '';
                    if (text) markersBack++;
                    else {
                        // Marker lost, doubled or empty: translate this piece alone
                        retried++;
                        console.log(`[PCB results] marker [[${n}]] (PMID ${piece.pmid} ${piece.kind}) not clean, translating alone`);
                        text = await tr.translate(piece.text);
                    }
                    pcbResultsCache.set(keyOf(piece), text);
                    put(piece, text);
                }
                doneResults += new Set(batch.map(p => p.pmid)).size;
                showProgress();
            };
            const worker = async (tr) => {
                while (nextBatch < batches.length) await runBatch(tr, nextBatch++);
            };
            await Promise.all(translators.map(worker));
            const ms = Math.round(performance.now() - started);
            console.log(`[PCB results] en -> ${lang}: ${pending.length} pieces, ${batches.length} batch(es), ${translators.length} at once, markers back ${markersBack}/${pending.length}, translated alone ${retried}, ${ms} ms`);
            pcbResultsStatus(`Translated ${totalResults} results to ${name} by Chrome (on this computer). Hover for the English.`, 6000);
        } catch (error) {
            console.log(`[PCB results] en -> ${lang} failed:`, error);
            pcbResultsStatus(`Translation failed (${error.name || 'error'}).`, 8000);
        } finally {
            window.__pcbResultsBusy = null;
            // Something asked during this run: go again with the current language
            if (window.__pcbResultsAgain) {
                window.__pcbResultsAgain = false;
                currentLang().then(translateResultsPage).catch(() => {});
            }
        }
    }

    window.__pcbStartResultsTranslator = pcbStartResultsTranslator;

    // Current language, or 'en' (= no translation) while the bar is turned off
    // Same rule as resolveBarLanguage in helpContent.js (a classic content
    // script can't import it): the language picked on the bar, or until one is
    // picked, Chrome's own language when the bar offers it. Keep this list in
    // step with BAR_LANGUAGES there.
    const BAR_CODES = ['en', 'es', 'zh', 'ja', 'ko', 'fr', 'hi', 'ar', 'bn', 'pt'];
    const currentLang = async () => {
        const { barLanguage, citationBarState } = await chrome.storage.local.get(['barLanguage', 'citationBarState']);
        if (!citationBarState) return 'en';
        if (BAR_CODES.includes(barLanguage)) return barLanguage;
        const browser = (chrome.i18n.getUILanguage() || 'en').toLowerCase().split(/[-_]/)[0];
        return BAR_CODES.includes(browser) ? browser : 'en';
    };

    // At page load
    currentLang().then(translateResultsPage).catch(() => {});

    // The browser's own translation turned on or off ("Show original"):
    // ours stands aside, or takes over again
    let wasTranslated = browserTranslated();
    new MutationObserver(() => {
        const now = browserTranslated();
        if (now === wasTranslated) return;
        wasTranslated = now;
        console.log(`[PCB results] browser translation ${now ? 'on' : 'off'}`);
        currentLang().then(translateResultsPage).catch(() => {});
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    // Language changed (bar tag or popup) or bar turned on/off
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local' || !(changes.barLanguage || changes.citationBarState)) return;
        currentLang().then(translateResultsPage).catch(() => {});
    });

    // PubMed's "Show more" adds results without a page load: translate them
    // as soon as they appear. Ignores the text changes translation makes.
    let timer = null;
    new MutationObserver(mutations => {
        const added = mutations.some(m => [...m.addedNodes].some(node =>
            node.nodeType === Node.ELEMENT_NODE &&
            (node.matches('article.full-docsum') || node.querySelector('article.full-docsum'))));
        if (!added) return;
        clearTimeout(timer);
        timer = setTimeout(() => {
            console.log('[PCB results] new results on the page');
            currentLang().then(translateResultsPage).catch(() => {});
        }, 100);
    }).observe(document.body, { childList: true, subtree: true });
})();
