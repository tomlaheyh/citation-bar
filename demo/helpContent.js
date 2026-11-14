// helpContent.js - Help text and styles for citation bar
// Ver 3.900 Nov-2026

// Short tooltips for hover (1.5s delay). The text lives in
// _locales/<lang>/messages.json as tt_<name>. The language is the user's choice
// from the language tag on the bar (stored as barLanguage); until they choose,
// it follows Chrome's language. Chrome's own chrome.i18n cannot be used here
// because it always follows the browser and cannot be switched per extension.
// Any text missing from a language file falls back to English.
const TOOLTIP_NAMES = [
    'retracted',
    'retractionNotice',
    'highImpact',
    'overallScore',
    'mesh',
    'new',
    'trending',
    'medline',
    'preprint',
    'erratum',
    'erratumNotice',
    'concern',
    'concernErratum',
    'concernNotice',
    'cited',
    'rcr',
    'ic',
    'alt',
    'similar',
    'citedBy',
    'scholar',
    'cp',
    'abstract',
    'link',
    'topJournal',
    'sjr',
    'sjrQuartile',
    'rank',
    'articleCount',
    'medlinePct',
    'freePct',
    'xout',
    'keySearches',
    'citationReport',
    'authors',
    'pubmedReports',
    'pick',
    'pickList',
    'pdfFree',
    'pdfNone',
    'doiLookup',
    'doiNone',
    'help',
    'language',
    'searchEnglish',
    'icite12',
    'icite12None',
    'icite12Loading',
    'icite12Title',
    'icite12Summary',
    'icite12Rising',
    'icite12New',
    'icite12Prior',
    'icite12Gain',
    'icite12Drop',
    'icite12Report',
    'authorRetractions',
    'journal'
];

// Languages offered by the tag on the bar, each named in its own language.
export const BAR_LANGUAGES = [['en', 'English'], ['es', 'Español'], ['zh', '中文'], ['ja', '日本語'], ['ko', '한국어'], ['fr', 'Français'], ['hi', 'हिन्दी'], ['ar', 'العربية'], ['bn', 'বাংলা'], ['pt', 'Português']];

// Chrome only accepts its own locale names as _locales folders, so Chinese
// (Simplified) lives in _locales/zh_CN and Portuguese (Brazil) in
// _locales/pt_BR, while the codes used everywhere are 'zh' and 'pt'.
const LOCALE_FOLDERS = { zh: 'zh_CN', pt: 'pt_BR' };

export function resolveBarLanguage(stored) {
    const codes = BAR_LANGUAGES.map(([code]) => code);
    if (codes.includes(stored)) return stored;
    const browser = (chrome.i18n.getUILanguage() || 'en').toLowerCase().split(/[-_]/)[0];
    return codes.includes(browser) ? browser : 'en';
}

async function readMessages(lang) {
    try {
        const response = await fetch(chrome.runtime.getURL(`_locales/${LOCALE_FOLDERS[lang] || lang}/messages.json`));
        return response.ok ? await response.json() : {};
    } catch (error) {
        console.log(`Could not read ${lang} messages:`, error.message);
        return {};
    }
}

// Every message for a language as { key: text }, English filling any gaps.
// Used for the bar's hover text and for the popup.
export async function loadMessages(lang) {
    const english = await readMessages('en');
    const chosen = lang === 'en' ? english : await readMessages(lang);
    return Object.fromEntries(Object.keys(english).map(key =>
        [key, chosen[key]?.message || english[key]?.message || '']));
}

export async function loadTooltips(lang) {
    const messages = await loadMessages(lang);
    return Object.fromEntries(TOOLTIP_NAMES.map(name => [name, messages['tt_' + name] || '']));
}

// The score code shown in the help panel (same in every language)
const SCORE_CODE = `<code>function calculateScore(item) {
    let score = 0;

    // MEDLINE: 2.25 points
    if (item.recordStatus === 'PubMed - indexed for MEDLINE') {
        score += 2.25;
    }

    const citations = parseInt(item.Citations);
    const crc = parseFloat(item.RelativeCitationRatio);
    
    if (item.PublishCurrent === 'n') {
        // Recent articles (< 2 years)
        
        // Citations scoring
        if (citations > 30) score += 2.25;
        else if (citations > 15) score += 1.75;
        else if (citations > 5) score += 1;
        else if (citations > 2) score += 0.25;
        
        // RCR scoring
        if (crc > 2) score += 1.25;
        
    } else {
        // Older articles (>= 2 years)
        
        // Citations scoring
        if (citations >= 200) score += 3.5;
        else if (citations >= 50) score += 2.75;
        else if (citations >= 10) score += 1.5;

        // RCR scoring
        if (crc > 10) score += 1.25;
        else if (crc > 5) score += 0.75;
    }

    // SJR: 1.25 points
    if (item.SJR !== '-' && item.SJR > 3) {
        score += 1.25;
    }

    // Trending: 1 point
    if (item.isTrending) {
        score += 1;
    }

    // Influential Citations: 0.5 points
    if (item.s2Url && item.influentialCitations >= 1) {
        score += 0.5;
    }

    return score;
}</code>`;

export const helpItems = [
    {
        label: "Retracted = PMID and Retraction PMID (when clicked)",
        description: "Shows if an article has been retracted from the literature.",
        ref: "https://www.nlm.nih.gov/bsd/policy/errata.html"
    },
    {
        label: "* = High impact article (green background)",
        description: `Articles are marked as high impact (green background) when their score meets your threshold (default: 5, adjustable in extension settings). The score is calculated as follows:

${SCORE_CODE}`,
        ref: null
    },
    {
        label: "Overall Score = Numerical article quality score",
        description: "The overall score is a calculated value that represents the article's quality based on multiple factors including MEDLINE indexing, citation counts, Relative Citation Ratio (RCR), journal SJR ranking, trending status, and influential citations. The score is displayed at the top of the citation report and helps quickly assess an article's impact and significance.",
        ref: null
    },
    {
        label: "EN = Language of the bar's hover text",
        description: "The small brown tag after the ? shows the language used for the hover text on the bar (EN = English, ES = Español, ZH = 中文, JA = 日本語, KO = 한국어, FR = Français, HI = हिन्दी, AR = العربية, BN = বাংলা, PT = Português). Click it to choose; the bars redraw straight away without reloading any data, and your choice is remembered. Until you choose, it follows Chrome's language. This help panel and the extension popup (language button beside Citation Bar On) follow the same choice. Choosing a language other than English also translates the titles and snippets of the search results, using Chrome's built-in translator on your computer (Chrome 138 or later; the first time, Chrome downloads the language after one click on the tag). Results are translated 25 at a time from the top of the page, with a status box showing progress, and results added by Show more are translated as they appear. Hover a translated title or snippet to see the English. The text on the bar itself always stays in English.",
        ref: null
    },
    {
        label: "Other languages = Using PubMed in your own language",
        description: `PubMed's pages and search are in English. There are two ways to read them in your own language, and the citation bar works with both:

<ul>
<li><strong>The language tag on the bar</strong> (EN, above): translates the bar's hover text, this help, the extension popup, and the titles and snippets of the search results. The translation is done by Chrome on your computer; nothing is sent elsewhere.</li>
<li><strong>Chrome's own page translation</strong> (right-click → Translate, or the translate icon in the address bar; Edge has the same): translates the whole PubMed page into any language the browser offers. The bar's text stays in English so it keeps to one line, MeSH terms and keywords stay exactly as PubMed indexes them, and the abstract window shows the English original below the translation. While the browser is translating the page, the bar's own results translation steps aside so nothing is translated twice.</li>
</ul>

Exports, the Google Scholar link and the article report always use PubMed's English titles, whichever way the page is translated. PubMed search only understands English, so search with English terms. The Google Translate website version of PubMed (an address ending in translate.goog) is not supported: the bar only runs on pubmed.ncbi.nlm.nih.gov, so use the browser's own translation instead.`,
        ref: null
    },
    {
        label: "doi = Open article in DOI Lookup",
        description: "Opens the article's DOI in DOI Lookup (doilookup.com), a free website that checks retractions, citations, journal metrics, and open access from a dozen sources. Multiple DOIs can be collected (up to 15) and viewed together. If the article has no DOI, the link is grayed out.",
        ref: "https://doilookup.com/"
    },
    {
        label: "MeSH+ = MeSH terms and keywords for the article",
        description: "Shows two lists. MeSH (Medical Subject Headings) are NLM's controlled subject tags, assigned to MEDLINE records (marked m on the bar); other records show 'No MeSH data'. Keywords are the article's own terms, usually supplied by the authors (Author keywords). Keywords occasionally added by an indexer such as NLM are listed separately under their own heading. Keywords are not a controlled vocabulary, but they often name newer concepts that MeSH does not have yet, and they can be searched in PubMed with the [ot] tag. MeSH terms and keywords are never machine-translated: they stay exactly as PubMed indexes them, even when the browser is translating the page, so they can be copied straight into a PubMed search.",
        ref: "https://www.nlm.nih.gov/mesh/meshhome.html"
    },
    {
        label: "n = New, less than 2 years old",
        description: "Based on the create date [crdt] in PubMed when the article was first entered into the system. This date does not change, unlike publish dates which can sometimes change.",
        ref: null
    },
    {
        label: "t = Trending article based on PubMed Trending",
        description: "Trending is based on the top 1,000 PubMed articles. The actual logic is not public (per NIH policy), but think \"new and lots of views\" and you'll be close.",
        ref: "https://pubmed.ncbi.nlm.nih.gov/trending/"
    },
    {
        label: "m = Medline indexed based on PubMed",
        description: "Indicates the article has been indexed for Medline.",
        ref: "https://www.nlm.nih.gov/medline/medline_overview.html"
    },
    {
        label: "p = Preprint",
        description: "Indicates the article is a preprint (not yet peer-reviewed). Preprints allow researchers to share findings quickly before formal peer review. While they provide early access to research, they should be interpreted with caution as they haven't undergone the rigorous peer review process.",
        ref: "https://pmc.ncbi.nlm.nih.gov/about/nihpreprints/"
    },
    {
        label: "e = erratum, E = expression of concern",
        description: "Articles can have updates or corrections — this is not a retraction. Approximately 1% of articles have corrections. When clicked, this shows both the original PMID and the correction PMID. A bold E in the same place means the journal has published an expression of concern: a formal warning about the article that stops short of a retraction. When an article has both, E is shown and the hover text mentions the correction; clicking lists the original article, the concern notice and the correction. The notice itself also shows E. The Report and the \"Excel\" export list the two separately.",
        ref: "https://www.nlm.nih.gov/bsd/policy/errata.html"
    },
    {
        label: "Cited = Citation count from iCite (NIH) or Europe PMC",
        description: "Citation count from iCite, provided by the NIH — the same government agency that runs PubMed. There are several sources of citation counts, including PubMed itself, but I feel iCite is the best overall fit. Occasionally iCite may be down or slow, in which case I pull citation counts from Europe PMC, a long-standing literature database run by EMBL-EBI alongside a group of research funders.",
        ref: "https://icite.od.nih.gov/"
    },
    {
        label: "Chart icon (after Cited) = Citations by month, last 12 months (iCite)",
        description: "Blue when the article has monthly data: click it for a chart of its iCite citations over the last 12 months. The first bar is the citation count at the start; each month after it stacks that month's gain on top of the total before it, with the gain printed above the bar. A dashed red box marks a month where iCite lowered the count (a correction). Hover over a bar for its numbers.\n\nGrey means there is no monthly data for the article. The charts cover only articles added to PubMed in the last 36 months that are among the 40,000 with the most citations gained in the past 12 months, so long-established articles are not included even when they have more citations. The data comes from NIH iCite's monthly snapshots and is updated once a month; the full list is the PubMed iCite Citation Gains report.",
        ref: "https://tomlaheyh.github.io/citation-bar/icite/icite.html"
    },
    {
        label: "RCR = Relative Citation Ratio from iCite",
        description: "The Relative Citation Ratio (RCR) is an iCite measure defined as \"the cites/year of each paper, normalized to the citations per year received by NIH-funded papers in the same field and year.\" It represents a citation-based measure of scientific influence. When iCite is unavailable, RCR will display \"-\" since it is a custom iCite measure not available from other sources. To save space, an RCR above 99 is shown on the bar as a rounded whole number (123.4 shows as 123). The Report and the exports keep the full value.",
        ref: "https://support.icite.nih.gov/hc/en-us/articles/9062490125083-Metrics"
    },
    {
        label: "IC = Influential Citations from Semantic Scholar",
        description: "Semantic Scholar identifies citations where the cited publication has a significant impact on the citing publication. Influential citations are determined using a machine-learning model analyzing factors including the number of citations and the surrounding context for each. Displays \"-\" if not found.",
        ref: "https://www.semanticscholar.org/faq#influential-citations"
    },
    {
        label: "Alt = Altmetric Score",
        description: "The Altmetric Attention Score provides an indicator of the amount of attention a research output has received, including social media, news, and policy documents. The score is derived from an automated algorithm and represents a weighted count of attention. The link goes directly to the Altmetric page for the article.",
        ref: "https://help.altmetric.com/en/articles/9800513"
    },
    {
        label: "s = Similar articles from PubMed",
        description: "A list of similar articles from PubMed. You can also view these by clicking \"Similar Articles\" in the right sidebar on any PubMed article page.",
        ref: "https://www.ncbi.nlm.nih.gov/guide/howto/find-articles-similar/"
    },
    {
        label: "c = Citing articles from PubMed",
        description: "A list from PubMed of articles citing this article. Note this varies slightly from iCite as they use different systems and methods. The NIH focus going forward is on iCite, but PubMed still provides this as an easy way to see citing articles.",
        ref: "https://pubmed.ncbi.nlm.nih.gov/help/#cited-by"
    },
    {
        label: "Gsch = Google Scholar for the DOI",
        description: "Google Scholar is an excellent reference resource for articles, including its own citation counts (which may be slightly inflated). The best way to find an article in Google Scholar is by its DOI (Digital Object Identifier) — a unique string used to identify an article and provide it with a permanent web address. I use the PubMed article's DOI (97% have one) to link directly to Google Scholar.",
        ref: "https://scholar.google.com/intl/en/scholar/about.html"
    },
    {
        label: "Con = Connections citation graph (doilookup.com)",
        description: "Connections opens an interactive citation graph for the article on doilookup.com, built from OpenAlex data. It maps three views — references the article cites (Inside), papers that cite it (Outside), and a combined Mix — with bubbles color-coded by journal quality and tagged for free full text; click any paper for its title, journal, year, citation count, and abstract. You can re-center on any paper or run a multi-level expansion that surfaces the foundational, most co-cited works across the wider neighborhood.",
        ref: "https://doilookup.com/"
    },
    {
        label: "Abstract = Abstract (click to view)",
        description: "The abstract is a short description of the article, present on about 95% of recent journal articles. Normally you have to open the article to read it — this provides a quick way to view the abstract without leaving the search results. If the article has a plain-language summary, it is shown below the abstract (or in its place when there is no abstract). If PubMed also has the abstract in other languages, a note lists them with a link to the article, where you choose the language above the abstract. A Translate row above the abstract translates the title, abstract and plain-language summary with Chrome's built-in translator: one click for the bar's language, or type any language code. When the bar's language is not English, the abstract opens already translated. The English original is shown underneath for comparison, and Show original switches back. If the browser is already translating the whole page, the abstract follows the browser's translation, with the English original underneath.\n\nFull text: below the abstract, after a divider, a line says whether the article's full text can be shown here, and the full text follows when it can. It loads automatically. Open-access articles come from Europe PMC in a second or two; other free-to-read articles that PubMed Central (PMC) releases for text mining come from PMC itself and can take several seconds. When the full text cannot be shown (free only on the publisher's site, or free in PMC but not open access), the line links to where you can read it. Tables appear as plain rows, figures are listed by their captions, and references are left out. The article's publication type (for example Randomized Controlled Trial, Review or Case Reports) is shown under the title.\n\nNote: abstracts are fetched only when you click Abstract, so they are not included in the \"Excel\" or \"Data\" exports.",
        ref: "https://pubmed.ncbi.nlm.nih.gov/18830537/"
    },
    {
        label: "link = Full-text link",
        description: "PubMed provides the abstract and metadata, but not the full article text. It links to the actual article (typically in the top-right of the article page). Some articles require a paid subscription — many university libraries have subscriptions, so if you're logged into their system you can access articles behind the paywall. If a free version is available (e.g., PMC), I provide that link; otherwise I link to the publisher's page. The link turns green when it is free: PMC first, then a free legal copy found through OpenAlex (the publisher's open-access page or a repository copy), then articles PubMed itself marks as free. A preprint is not counted as a free copy of the article. The Report says which kind of free copy it is.",
        ref: "https://www.ncbi.nlm.nih.gov/guide/howto/obtain-full-text/"
    },
    {
        label: "✓ = Add to export list (green when added)",
        description: `The check at the start of the second row adds an article to your export list. Grey means not added, green means added. Click it again to remove it.

Adding an article fetches its complete record from PubMed — all authors, volume, issue, pages, abstract and MeSH terms — so the check turns amber and pulses for a moment while that happens. If the fetch fails the check stays grey and tells you why, rather than turning green with nothing behind it.

<strong>SELECTIONS PERSIST</strong>
<ul>
<li>Articles stay checked as you page through results and run new searches, so you can gather from several searches before exporting</li>
<li>Re-adding an article you removed is instant — its record is kept, so PubMed is not asked twice</li>
<li>The list is cleared when you switch the citation bar off</li>
</ul>

Requests are spaced a second apart, so checking quickly down a page queues them rather than tripping NCBI's rate limit. Clicking one article at a time never waits.`,
        ref: null
    },
    {
        label: "Checklist icon = Open the export list",
        description: `Next to the check, the checklist icon opens your export list. It is grey when nothing is selected, and blue with a count once you have added articles — that count is the same on every bar on the page.

The list shows each article with its title, journal, year and PMID, and an ✕ to remove it. Articles added on an earlier page show as their PMID, since their details are no longer on screen.

<strong>FOUR ACTIONS</strong>
<ul>
<li><strong>Clear all:</strong> empties the list</li>
<li><strong>Open in new tab:</strong> shows the selected articles as a PubMed search, in a new tab so you keep your place in the results you were working through</li>
<li><strong>Download .ris:</strong> RIS format — EndNote, Mendeley, RefWorks, Papers, Zotero</li>
<li><strong>Download .nbib:</strong> MEDLINE format — the same file PubMed's own "Send to → Citation manager" produces; Zotero and EndNote</li>
</ul>

Both downloads carry the full record for every article, including the abstract and MeSH terms. Files are named with the date and time (for example <code>pubmed-citations-2026-09-12-3-04pm.nbib</code>), so exporting several times in a day never overwrites an earlier file.

PubMed accepts at most 200 articles in one search, so "Open in new tab" shows the first 200 if your list is longer — the list says so when that applies. The downloads have no limit.

<strong>SENDING THEM TO ZOTERO, WITH THE PDFs</strong>
Zotero needs two pieces and both must be in place: the <strong>Zotero Connector</strong> browser extension, and the <strong>Zotero desktop app</strong> open on your computer.

With those, open your list in PubMed and click the connector's folder icon. Choose <strong>Select All</strong>, then <strong>OK</strong> — it saves every article at once, and tries to fetch each PDF using whatever journal access you already have. That is something a downloaded file cannot do, because the connector runs in your own browser session.

Without the desktop app open, the connector offers to save to your zotero.org library instead. Zotero says that works for "some pages", so it isn't a reliable substitute.

The .nbib and .ris downloads need none of this, and work with EndNote, Mendeley and RefWorks as well.

<div class='help-ai-pack'><strong>AI PACK (.ZIP) — STILL BEING IMPROVED</strong>
<strong>AI pack (.zip)</strong> puts the articles on your list (up to 40) into one zip file that you can give to an AI tool. Where it can, it adds the full text (open access articles and NIH author manuscripts, from Europe PMC or PubMed Central), otherwise the abstract, plus a README that explains the citation bar data. Unzip the file and point the AI at the folder, or upload the zip itself if your AI tool accepts zip files.

Articles without free full text get an Open button (the free PMC PDF where there is one, otherwise the publisher's page) so you can save a PDF you have access to.

Large documents can be too much for an AI tool to read at once. Long articles (over about 100 pages) are flagged, and each AI tool has its own upload limits.
<ul>
<li><strong>Convert PDF:</strong> turns a saved PDF into text in your browser (nothing is uploaded). The reference lists go to a separate file, and the table pages are kept as a small PDF. A scanned (image-only) PDF has no text to convert, so use Add PDF for it.</li>
<li><strong>Add PDF:</strong> puts the PDF in the zip as it is.</li>
<li><strong>For complex layouts or maths:</strong> technical users can convert PDFs with free tools such as Docling, Marker or MinerU, then add the .md files to the unzipped folder.</li>
</ul></div>

<strong>AI TABLE — NEW, EXPERIMENTAL</strong>
<strong>AI table</strong> reads the title and abstract of each article on your list with Chrome's built-in AI, on your own computer (nothing is uploaded), and fills one row per article: study design, population, sample size, intervention or exposure, and main finding. <strong>Copy table</strong> gives tab-separated text for Excel or Google Sheets. It can be wrong: a blank cell means the abstract does not say, a sample size is shown only when that number is in the abstract, and every row should be checked against the article. The first use downloads Chrome's AI model (several GB). The button appears only in Chrome 138 or later, and the model needs about 22 GB of free disk space and either a graphics card with more than 4 GB of memory or 16 GB of RAM.`,
        ref: null
    },
    {
        label: "Author = Author Information",
        description: `Shows first and last authors (in academic convention, first author typically leads the work, last author leads the lab; if an organization is listed last, the last person is used).

<strong>SEARCH LINKS</strong>
<ul>
<li><strong>PubMed:</strong> Uses ORCID (a widely used author ID, Ref: <a href="https://orcid.org/" target="_blank">https://orcid.org/</a>) when available; otherwise uses last name and first initial</li>
<li><strong>ORCID Profile:</strong> Provides detailed author information with unique researcher ID - more reliable than name-based searches (not all articles include ORCIDs)</li>
</ul>

<em>Note: Name-based searches may include other researchers with similar names. ORCID provides accurate identification.</em>

<strong>METRICS (from OpenAlex, requires ORCID)</strong>
<ul>
<li><strong>h-index:</strong> Minimum number of citations across papers. Example: 12 papers all with ≥12 citations = h-index of 12 (Ref: <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC10771139/" target="_blank">https://pmc.ncbi.nlm.nih.gov/articles/PMC10771139/</a>)</li>
<li><strong>i10-index:</strong> Number of papers with ≥10 citations</li>
<li><strong>2yr citation rate:</strong> Average citations per paper over 2 years</li>
</ul>

<em>Note: Different sources (Google Scholar, Scopus, Web of Science) calculate these metrics slightly differently due to varying citation databases. See Ref: <a href="https://en.wikipedia.org/wiki/Author-level_metrics" target="_blank">https://en.wikipedia.org/wiki/Author-level_metrics</a></em>

<strong>AFFILIATIONS</strong>
Lists institutional affiliations from the article.

<strong>ROR (institution ID)</strong>
Each author has a ROR line: the Research Organization Registry ID of the author's institution, linked to ror.org (Ref: <a href="https://ror.org/" target="_blank">https://ror.org/</a>). The ROR is taken from PubMed when the publisher deposited one there; PubMed rarely has them, so when it has none, OpenAlex is tried (only when OpenAlex's author has the same surname). Other sources may be added later. Institution names are never matched to RORs, so when no source has an ID the line reads "not available". The line is always shown, so the field is easy to find.

Note: the first and last author's ORCID, ROR, h-index and i10-index are pulled for every article (from OpenAlex) and are included in the "Excel" and "Data" exports. The ROR in the exports is OpenAlex's only, so in rare cases where PubMed has one it can differ from the Author panel. Affiliations are fetched only when you click Author, so they are not in the exports.

WORKS, CITATIONS AND RETRACTIONS (OpenAlex, requires ORCID): works is the number of works in the author's OpenAlex profile and citations is the total citations to them. Retracted papers are checked for the first and last authors: the count is the author's other retracted papers in OpenAlex, not counting this article. When any of them has one or more, Author on the bar gets a red outline. In the Author panel, a count of 1 or more links to that author's retracted papers in OpenAlex (the list can include this article; retraction notices are not counted). "–" means not checked (no ORCID, a name that did not match OpenAlex, OpenAlex unavailable, or too many results to count), never zero. All of these, and the 2yr citation rate, are also in the Excel export (Author Retractions is the higher count of the two; blank when someone could not be checked and nobody has one).`,
        ref: null
    },
    {
        label: "J = Journal Information",
        description: "Click J for the journal: full name, print and electronic ISSN, NLM ID (linked to the NLM Catalog), SJR and Top-J. From the extension's Journal Ranking data: the journal's rank and its articles added to PubMed this year; growth versus the same months last year; its Medline %, free full text % and ORCID % this year; and its retractions: papers from the journal, of any publication year, that PubMed marked as retracted in the same months this year and last (or withdrawn preprints, for preprint servers). The same lines are in the Report. OpenAlex adds the journal's country, publisher, open access and DOAJ status, APC, h-index, 2-year mean citations and first year, looked up once per journal when J or the Report is opened. The panel starts with the article's title and publication type, and the SJR line includes the journal's best quartile.",
        ref: "https://tomlaheyh.github.io/citation-bar/journal-ranking/journal-ranking.html"
    },
    {
        label: "Top-J = Top Journal",
        description: "My own curated list of top medical journals, including associated journals within publisher umbrellas (e.g., JAMA family). Matched by ISSN — displays \"Yes\" if the journal matches. The list is intentionally small and highly selective. Current list: Annals of Internal Medicine, British Medical Journal (BMJ), European Heart Journal, Journal of the American College of Cardiology, JAMA, Lancet, Nature, New England Journal of Medicine. I'm open to suggestions, but it's designed to be a super-MVP list.",
        ref: null
    },
    {
        label: "SJR = SCImago Journal Rank",
        description: "A widely respected, free journal ranking. The SCImago Journal Rank (SJR) measures journal visibility using an algorithm similar to Google's PageRank™. SCImago is a research group affiliated with several Spanish universities and the CSIC, specializing in information analysis and visualization. New rankings are published once a year (usually in April). Where SCImago gives one, the journal's best quartile (Q1 to Q4) is shown in the hover text, the J panel, the Report and the \"Excel\" export. SCImago ranks a journal within each of its subject areas, and this is the best of those: Q1 means the top 25% in at least one area.",
        ref: "https://www.scimagojr.com/aboutus.php"
    },
    {
        label: "YTD = Journal articles year-to-date",
        description: "The number of articles this journal (by ISSN) published over the period covered by the extension's ranking data. I pull all PubMed data (typically monthly) and rank journals by total articles, free articles, and Medline-indexed articles for the year. That ranking data ships with the extension and is refreshed with each release, so the figures cover the period stated in the ranking file. When I was learning PubMed, something like this would have been very helpful — I hope it is for you too.",
        ref: null
    },
    {
        label: "Medline % = Percentage of journal articles Medline YTD",
        description: "The percentage of a journal's articles (by ISSN) that have been indexed for Medline over the same period. This is from my own ranking data. Note that this reflects indexing rather than journal quality: recently published articles may not be indexed yet, so a journal that publishes frequently can show a lower percentage than its eventual rate.",
        ref: null
    },
    {
        label: "Free % = Percentage of journal articles with free full text YTD",
        description: "The percentage of a journal's articles (by ISSN) available as free full text over the same period. This is from the same ranking data as the YTD count and Medline %.",
        ref: null
    },
    {
        label: "Xout = Exclusion Search",
        description: `Re-search PubMed with filters to exclude non-primary research. Opens a dialog with your current search pre-filled and checkboxes to exclude publication types that collectively represent approximately 25% of all PubMed articles:

<ul>
<li><strong>Has Abstract:</strong> Requires articles to have an abstract (recommended — articles without abstracts are rarely peer-reviewed primary research)</li>
<li><strong>No Retracted Publications:</strong> Excludes retracted articles and their retraction notices</li>
<li><strong>No Published Errata:</strong> Excludes correction/erratum notices</li>
<li><strong>No Letters:</strong> Excludes letters to the editor</li>
<li><strong>No Editorials:</strong> Excludes editorial pieces</li>
<li><strong>No Comments:</strong> Excludes commentary articles</li>
<li><strong>No Systematic Reviews:</strong> Excludes systematic reviews</li>
<li><strong>No Meta-Analyses:</strong> Excludes meta-analyses</li>
<li><strong>No Reviews:</strong> Excludes review articles</li>
</ul>

All filters are checked by default. Uncheck any filter to allow that type through. The full query preview updates live as you adjust filters. You can search directly (navigates current tab), copy the query, or cancel. View Expanded shows your search beside PubMed's own reading of it (its E-utilities query translation), so you can see how untagged words were expanded by automatic term mapping.`,
        ref: null
    },
    {
        label: "kS = Key Searches",
        description: "Prebuilt PubMed searches on high-volume and fast-growing topics, grouped by area. Click kS to see the groups, point to or click a group to see its searches, then click a search to open it in a new tab. Each search requires the topic to be the article's main subject (MeSH Major Topic or the title) and an abstract, and excludes retracted articles and their retraction notices, errata, letters, editorials and comments. Reviews, systematic reviews and meta-analyses are kept. The full query appears in PubMed's search box. Group and search names are in English because the search terms are. The Years row at the bottom of the menu adds a rolling publication-date limit to the search, such as \"last 5 years\"[dp] for the last 1, 5 or 10 years, or none for All. It is part of the query, so it is kept when the query is copied. Your choice is remembered.",
        ref: null
    },
    {
        label: "pR = PubMed Reports (key overviews)",
        description: "Opens a menu with eight PubMed report tools on the PubMed Citation Bar site: PubMed Summary Report (overview of a PubMed search), PubMed Filters Report (filter analysis), PubMed MeSH Counts (MeSH term frequency counts), PubMed Journal Ranking (journal ranking data), PubMed Drift Report (day-by-day changes in PubMed citation-status measures), PubMed ORCID Ranking (the ORCID iDs on the most PubMed papers each year), PubMed ROR Ranking (organizations ranked by articles added this year, from author affiliations) and PubMed iCite Citation Gains (articles added in the last 36 months with the most citations gained in the past 12 months). Each opens in a new tab.",
        ref: "https://tomlaheyh.github.io/citation-bar/"
    },
    {
        label: "/Report = Citation report",
        description: "A report listing all key measures and links for an article in an easy-to-copy format. Two buttons on the popup export the whole page of results: \"Excel\" gives a tab-separated table of exactly what the bar shows — one row per article, ready to paste straight into Excel or Google Sheets — while \"Data\" dumps everything, PMIDs first, then all measures, extension timestamps and internal fields. That second one is full disclosure of all data the extension uses. There is zero user tracking.\n\nNote: first and last author ORCIDs, h-index and i10-index are pulled for every article and are included in the \"Excel\" and \"Data\" exports. Some other data is fetched only when you click an item on the bar, because pulling it for every article would take too long. This includes abstracts (Abstract), grants and author affiliations. That data is not included in the exports.",
        ref: null
    },
    {
        label: "Memory = free system memory (turns red when low)",
        description: "Shown at the bottom of the extension popup. Chrome (not the extension) keeps your most recent pages in a tab held in memory so that Back is instant, and a tab used for many searches tends to hold on to more memory over time. This happens with or without this extension; the citation bar adds its own share to each page.<br><br>To stop that building up, the extension reopens your tab on the same page after the citation bar has run six times. You stay on the results you were looking at and nothing needs retyping; what you lose is that tab's Back history, which is a fair trade for the memory it frees. It never does this in the middle of a Scan 1,000, or while you are on a High Impact or Scan 1,000 results page.<br><br>The Memory line turns red when free memory drops below 2 GB, which is where Chrome starts to struggle on any size of machine. When it does, closing applications you are not using is usually enough. The Reset Extension button also clears the extension's stored data and Chrome's cache and reopens the tab, if you want to do it by hand. Reset Extension clears site data only for PubMed and NCBI pages. Other websites' data, and your history, cookies and passwords, are not touched.",
        ref: null
    },
    {
        label: "Copy icon (popup) = Reference for this search",
        description: "The small copy icon at the start of the citation line at the top of the popup copies a reference for the PubMed search in the current tab: the database, the date searched, the search exactly as run, any sidebar filters, the number of results and the URL. This follows PRISMA-S, the standard for reporting literature searches. The date matters because MeSH and PubMed's automatic term mapping change over time, so the same search can return different results later. The copied text is in English, for use in papers and protocols.",
        ref: null
    }
];

// Spanish help panel: same items, same order and refs as helpItems.
// Button and checkbox names that still appear in English on screen are kept
// in English here so they match what the user sees.
export const helpItemsEs = [
    {
        label: "Retracted = PMID y PMID de la retractación (al hacer clic)",
        description: "Indica si un artículo ha sido retractado de la literatura científica.",
        ref: "https://www.nlm.nih.gov/bsd/policy/errata.html"
    },
    {
        label: "* = Artículo de alto impacto (fondo verde)",
        description: `Los artículos se marcan como de alto impacto (fondo verde) cuando su puntuación alcanza su umbral (valor predeterminado: 5, ajustable en la configuración de la extensión). La puntuación se calcula así:

${SCORE_CODE}`,
        ref: null
    },
    {
        label: "Overall Score = Puntuación numérica de calidad del artículo",
        description: "La puntuación general es un valor calculado que representa la calidad del artículo a partir de varios factores: indexación en MEDLINE, número de citas, Relative Citation Ratio (RCR), clasificación SJR de la revista, tendencia (trending) y citas influyentes. La puntuación se muestra al principio del informe de citas y ayuda a valorar rápidamente el impacto y la relevancia de un artículo.",
        ref: null
    },
    {
        label: "ES = Idioma del texto emergente de la barra",
        description: "La pequeña etiqueta marrón después del ? muestra el idioma del texto emergente de la barra (EN = English, ES = Español, ZH = 中文, JA = 日本語, KO = 한국어, FR = Français, HI = हिन्दी, AR = العربية, BN = বাংলা, PT = Português). Haga clic en ella para elegir; las barras se vuelven a dibujar al instante sin volver a cargar los datos, y su elección se recuerda. Hasta que elija, sigue el idioma de Chrome. Este panel de ayuda y la ventana emergente de la extensión (botón de idioma junto a -Barra de citas activada-) siguen la misma elección. Elegir un idioma distinto del inglés también traduce los títulos y fragmentos de los resultados de búsqueda, con el traductor integrado de Chrome en su ordenador (Chrome 138 o posterior; la primera vez, Chrome descarga el idioma tras un clic en la etiqueta). Los resultados se traducen de 25 en 25 desde la parte superior de la página, con un cuadro de estado que muestra el progreso, y los resultados añadidos con Show more se traducen a medida que aparecen. Pase el cursor sobre un título o fragmento traducido para ver el inglés. El texto de la propia barra siempre se mantiene en inglés.",
        ref: null
    },
    {
        label: "Otros idiomas = Usar PubMed en su propio idioma",
        description: `Las páginas y la búsqueda de PubMed están en inglés. Hay dos formas de leerlas en su propio idioma, y la barra de citas funciona con ambas:

<ul>
<li><strong>La etiqueta de idioma de la barra</strong> (ES, arriba): traduce el texto emergente de la barra, esta ayuda, la ventana emergente de la extensión y los títulos y fragmentos de los resultados de búsqueda. La traducción la hace Chrome en su ordenador; no se envía nada a ningún otro sitio.</li>
<li><strong>La traducción de páginas propia de Chrome</strong> (clic derecho → Traducir, o el icono de traducción de la barra de direcciones; Edge tiene lo mismo): traduce toda la página de PubMed a cualquier idioma que ofrezca el navegador. El texto de la barra se mantiene en inglés para que quepa en una línea, los términos MeSH y las palabras clave se mantienen exactamente como los indexa PubMed, y la ventana del resumen muestra el original en inglés debajo de la traducción. Mientras el navegador traduce la página, la traducción de resultados de la propia barra se hace a un lado para que nada se traduzca dos veces.</li>
</ul>

Las exportaciones, el enlace a Google Scholar y el informe del artículo siempre usan los títulos en inglés de PubMed, se traduzca la página como se traduzca. La búsqueda de PubMed solo entiende inglés, así que busque con términos en inglés. La versión de PubMed del sitio web de Google Translate (una dirección que termina en translate.goog) no es compatible: la barra solo funciona en pubmed.ncbi.nlm.nih.gov, así que use en su lugar la traducción propia del navegador.`,
        ref: null
    },
    {
        label: "doi = Abrir el artículo en DOI Lookup",
        description: "Abre el DOI del artículo en DOI Lookup (doilookup.com), un sitio web gratuito que consulta retractaciones, citas, métricas de la revista y acceso abierto en una docena de fuentes. Se pueden reunir varios DOI (hasta 15) y verlos juntos. Si el artículo no tiene DOI, el enlace aparece en gris.",
        ref: "https://doilookup.com/"
    },
    {
        label: "MeSH+ = Términos MeSH y palabras clave del artículo",
        description: "Muestra dos listas. Los MeSH (Medical Subject Headings) son los descriptores temáticos controlados de la NLM, asignados a los registros de MEDLINE (marcados con m en la barra); los demás registros muestran 'No MeSH data'. Las palabras clave (keywords) son los términos propios del artículo, normalmente aportados por los autores (Author keywords). Las palabras clave que a veces añade un indizador, como la NLM, aparecen por separado bajo su propio encabezado. Las palabras clave no son un vocabulario controlado, pero a menudo nombran conceptos nuevos que MeSH aún no tiene, y se pueden buscar en PubMed con la etiqueta [ot]. Los términos MeSH y las palabras clave nunca se traducen automáticamente: se mantienen exactamente como los indexa PubMed, incluso cuando el navegador traduce la página, para poder copiarlos directamente en una búsqueda de PubMed.",
        ref: "https://www.nlm.nih.gov/mesh/meshhome.html"
    },
    {
        label: "n = Nuevo, menos de 2 años",
        description: "Se basa en la fecha de creación [crdt] de PubMed, es decir, cuando el artículo se registró por primera vez en el sistema. Esta fecha no cambia, a diferencia de las fechas de publicación, que a veces sí cambian.",
        ref: null
    },
    {
        label: "t = Artículo en tendencia según PubMed Trending",
        description: "La tendencia se basa en los 1000 artículos principales de PubMed. La lógica exacta no es pública (por política de los NIH), pero piense en \"nuevo y con muchas visitas\" y se acercará bastante.",
        ref: "https://pubmed.ncbi.nlm.nih.gov/trending/"
    },
    {
        label: "m = Indexado en Medline según PubMed",
        description: "Indica que el artículo ha sido indexado en Medline.",
        ref: "https://www.nlm.nih.gov/medline/medline_overview.html"
    },
    {
        label: "p = Preprint",
        description: "Indica que el artículo es un preprint (aún no revisado por pares). Los preprints permiten a los investigadores compartir resultados rápidamente antes de la revisión formal por pares. Aunque dan acceso temprano a la investigación, deben interpretarse con cautela porque no han pasado por el riguroso proceso de revisión por pares.",
        ref: "https://pmc.ncbi.nlm.nih.gov/about/nihpreprints/"
    },
    {
        label: "e = Fe de erratas, E = expresión de preocupación",
        description: "Los artículos pueden tener actualizaciones o correcciones; esto no es una retractación. Aproximadamente el 1 % de los artículos tiene correcciones. Al hacer clic, se muestran tanto el PMID original como el PMID de la corrección. Una E en negrita en el mismo lugar significa que la revista ha publicado una expresión de preocupación: una advertencia formal sobre el artículo que no llega a ser una retractación. Cuando un artículo tiene ambas, se muestra la E y el texto emergente menciona la corrección; al hacer clic se listan el artículo original, el aviso de preocupación y la corrección. El propio aviso también muestra la E. El Report y la exportación \"Excel\" las indican por separado.",
        ref: "https://www.nlm.nih.gov/bsd/policy/errata.html"
    },
    {
        label: "Cited = Número de citas de iCite (NIH) o Europe PMC",
        description: "Número de citas de iCite, proporcionado por los NIH, la misma agencia gubernamental que gestiona PubMed. Hay varias fuentes de recuentos de citas, incluido el propio PubMed, pero considero que iCite es la mejor opción en general. A veces iCite puede estar caído o lento; en ese caso tomo los recuentos de citas de Europe PMC, una base de datos bibliográfica consolidada que gestiona EMBL-EBI junto con un grupo de financiadores de la investigación.",
        ref: "https://icite.od.nih.gov/"
    },
    {
        label: "Icono de gráfico (después de Cited) = Citas por mes, últimos 12 meses (iCite)",
        description: "Azul cuando el artículo tiene datos mensuales: haga clic para ver un gráfico de sus citas en iCite durante los últimos 12 meses. La primera barra es el número de citas al inicio; cada mes siguiente apila lo ganado ese mes sobre el total anterior, con la ganancia escrita encima de la barra. Un recuadro rojo discontinuo marca un mes en que iCite redujo el recuento (una corrección). Pase el ratón sobre una barra para ver sus cifras.\n\nGris significa que no hay datos mensuales para el artículo. Los gráficos solo incluyen artículos añadidos a PubMed en los últimos 36 meses que están entre los 40.000 con más citas ganadas en los últimos 12 meses, así que los artículos ya consolidados no aparecen aunque tengan más citas. Los datos proceden de las instantáneas mensuales de iCite (NIH) y se actualizan una vez al mes; la lista completa es el informe PubMed iCite Citation Gains.",
        ref: "https://tomlaheyh.github.io/citation-bar/icite/icite.html"
    },
    {
        label: "RCR = Relative Citation Ratio de iCite",
        description: "El Relative Citation Ratio (RCR) es una medida de iCite definida como \"las citas por año de cada artículo, normalizadas respecto a las citas por año que reciben los artículos financiados por los NIH del mismo campo y año\". Es una medida de influencia científica basada en citas. Cuando iCite no está disponible, el RCR muestra \"-\", ya que es una medida propia de iCite que no ofrecen otras fuentes. Para ahorrar espacio, un RCR superior a 99 se muestra en la barra como número entero redondeado (123,4 aparece como 123). El Report y las exportaciones conservan el valor completo.",
        ref: "https://support.icite.nih.gov/hc/en-us/articles/9062490125083-Metrics"
    },
    {
        label: "IC = Citas influyentes de Semantic Scholar",
        description: "Semantic Scholar identifica las citas en las que la publicación citada tiene un impacto significativo en la publicación que la cita. Las citas influyentes se determinan con un modelo de aprendizaje automático que analiza factores como el número de citas y el contexto en que aparece cada una. Muestra \"-\" si no se encuentra.",
        ref: "https://www.semanticscholar.org/faq#influential-citations"
    },
    {
        label: "Alt = Puntuación Altmetric",
        description: "El Altmetric Attention Score indica cuánta atención ha recibido un resultado de investigación, incluidas redes sociales, noticias y documentos de políticas públicas. La puntuación procede de un algoritmo automático y representa un recuento ponderado de esa atención. El enlace lleva directamente a la página de Altmetric del artículo.",
        ref: "https://help.altmetric.com/en/articles/9800513"
    },
    {
        label: "s = Artículos similares de PubMed",
        description: "Una lista de artículos similares de PubMed. También puede verlos haciendo clic en \"Similar Articles\" en la barra lateral derecha de cualquier página de artículo de PubMed.",
        ref: "https://www.ncbi.nlm.nih.gov/guide/howto/find-articles-similar/"
    },
    {
        label: "c = Artículos de PubMed que lo citan",
        description: "Una lista de PubMed con los artículos que citan este artículo. Puede variar ligeramente respecto a iCite, ya que usan sistemas y métodos distintos. De cara al futuro los NIH se centran en iCite, pero PubMed sigue ofreciendo esta forma sencilla de ver los artículos que lo citan.",
        ref: "https://pubmed.ncbi.nlm.nih.gov/help/#cited-by"
    },
    {
        label: "Gsch = Google Scholar (Google Académico) mediante el DOI",
        description: "Google Scholar es un excelente recurso de referencia para artículos, con sus propios recuentos de citas (que pueden estar algo inflados). La mejor forma de encontrar un artículo en Google Scholar es por su DOI (Digital Object Identifier), una cadena única que identifica un artículo y le da una dirección web permanente. Uso el DOI del artículo de PubMed (el 97 % tiene uno) para enlazar directamente con Google Scholar.",
        ref: "https://scholar.google.com/intl/en/scholar/about.html"
    },
    {
        label: "Con = Gráfico de citas Connections (doilookup.com)",
        description: "Connections abre un gráfico interactivo de citas del artículo en doilookup.com, construido con datos de OpenAlex. Muestra tres vistas: las referencias que cita el artículo (Inside), los artículos que lo citan (Outside) y una vista combinada (Mix), con burbujas coloreadas según la calidad de la revista y marcadas cuando hay texto completo gratuito; haga clic en cualquier artículo para ver su título, revista, año, número de citas y resumen. Puede volver a centrar el gráfico en cualquier artículo o hacer una expansión de varios niveles que saca a la luz los trabajos fundamentales y más cocitados de todo el entorno.",
        ref: "https://doilookup.com/"
    },
    {
        label: "Abstract = Resumen (haga clic para verlo)",
        description: "El resumen es una breve descripción del artículo, presente en aproximadamente el 95 % de los artículos de revista recientes. Normalmente hay que abrir el artículo para leerlo; esto ofrece una forma rápida de ver el resumen sin salir de los resultados de búsqueda. Si el artículo tiene un resumen en lenguaje sencillo, se muestra debajo del resumen (o en su lugar si no hay resumen). Si PubMed también tiene el resumen en otros idiomas, una nota los enumera con un enlace al artículo, donde se elige el idioma encima del resumen. Una fila Translate encima del resumen traduce el título, el resumen y el resumen en lenguaje sencillo con el traductor integrado de Chrome: un clic para el idioma de la barra, o escriba cualquier código de idioma. Cuando el idioma de la barra no es el inglés, el resumen se abre ya traducido. El original en inglés se muestra debajo para comparar, y Show original vuelve a él. Si el navegador ya está traduciendo toda la página, el resumen sigue la traducción del navegador, con el original en inglés debajo.\n\nTexto completo: debajo del resumen, tras una línea divisoria, una línea indica si el texto completo del artículo se puede mostrar aquí, y a continuación aparece el texto completo cuando es posible. Se carga automáticamente. Los artículos de acceso abierto llegan desde Europe PMC en uno o dos segundos; otros artículos de lectura gratuita que PubMed Central (PMC) publica para minería de textos llegan desde el propio PMC y pueden tardar varios segundos. Cuando el texto completo no se puede mostrar (gratuito solo en el sitio del editor, o gratuito en PMC pero sin acceso abierto), la línea enlaza a donde se puede leer. Las tablas aparecen como filas de texto, las figuras se indican por su leyenda y se omiten las referencias. El tipo de publicación del artículo (por ejemplo, Randomized Controlled Trial, Review o Case Reports) se muestra debajo del título.\n\nNota: los resúmenes solo se obtienen al hacer clic en Abstract, por lo que no se incluyen en las exportaciones \"Excel\" ni \"Datos\".",
        ref: "https://pubmed.ncbi.nlm.nih.gov/18830537/"
    },
    {
        label: "link = Enlace al texto completo",
        description: "PubMed ofrece el resumen y los metadatos, pero no el texto completo del artículo. Enlaza con el artículo real (normalmente arriba a la derecha en la página del artículo). Algunos artículos requieren una suscripción de pago; muchas bibliotecas universitarias tienen suscripciones, así que si ha iniciado sesión en su sistema puede acceder a los artículos de pago. Si hay una versión gratuita (por ejemplo, en PMC), doy ese enlace; si no, enlazo con la página del editor. El enlace se pone verde cuando es gratuito: primero PMC, luego una copia legal gratuita localizada mediante OpenAlex (la página de acceso abierto del editor o una copia en un repositorio) y, por último, los artículos que el propio PubMed marca como gratuitos. Un preprint no cuenta como copia gratuita del artículo. El Report indica de qué tipo de copia gratuita se trata.",
        ref: "https://www.ncbi.nlm.nih.gov/guide/howto/obtain-full-text/"
    },
    {
        label: "✓ = Añadir a la lista de exportación (verde cuando está añadido)",
        description: `La marca al principio de la segunda fila añade un artículo a su lista de exportación. Gris significa no añadido; verde, añadido. Vuelva a hacer clic para quitarlo.

Al añadir un artículo se descarga su registro completo de PubMed (todos los autores, volumen, número, páginas, resumen y términos MeSH), por lo que la marca se vuelve ámbar y parpadea un momento mientras tanto. Si la descarga falla, la marca queda en gris e indica el motivo, en lugar de ponerse verde sin nada detrás.

<strong>LAS SELECCIONES SE CONSERVAN</strong>
<ul>
<li>Los artículos siguen marcados al pasar de página y al hacer búsquedas nuevas, así que puede reunir artículos de varias búsquedas antes de exportar</li>
<li>Volver a añadir un artículo que quitó es instantáneo: su registro se guarda, así que no se consulta PubMed dos veces</li>
<li>La lista se vacía al desactivar la barra de citas</li>
</ul>

Las solicitudes se espacian un segundo entre sí, de modo que marcar rápidamente toda una página las pone en cola en lugar de superar el límite de solicitudes de NCBI. Marcar los artículos de uno en uno nunca tiene espera.`,
        ref: null
    },
    {
        label: "Icono de lista = Abrir la lista de exportación",
        description: `Junto a la marca, el icono de lista abre su lista de exportación. Está en gris cuando no hay nada seleccionado y en azul con un número cuando ha añadido artículos; ese número es el mismo en todas las barras de la página.

La lista muestra cada artículo con su título, revista, año y PMID, y una ✕ para quitarlo. Los artículos añadidos en una página anterior aparecen con su PMID, ya que sus datos ya no están en pantalla.

<strong>CUATRO ACCIONES</strong>
<ul>
<li><strong>Clear all:</strong> vacía la lista</li>
<li><strong>Open in new tab:</strong> muestra los artículos seleccionados como una búsqueda de PubMed, en una pestaña nueva para que no pierda su sitio en los resultados que estaba revisando</li>
<li><strong>Download .ris:</strong> formato RIS: EndNote, Mendeley, RefWorks, Papers, Zotero</li>
<li><strong>Download .nbib:</strong> formato MEDLINE: el mismo archivo que genera la opción "Send to → Citation manager" de PubMed; Zotero y EndNote</li>
</ul>

Ambas descargas incluyen el registro completo de cada artículo, con el resumen y los términos MeSH. Los archivos se nombran con la fecha y la hora (por ejemplo <code>pubmed-citations-2026-09-12-3-04pm.nbib</code>), así que exportar varias veces en un día nunca sobrescribe un archivo anterior.

PubMed acepta como máximo 200 artículos en una búsqueda, así que "Open in new tab" muestra los 200 primeros si su lista es más larga; la lista lo indica cuando ocurre. Las descargas no tienen límite.

<strong>ENVIARLOS A ZOTERO, CON LOS PDF</strong>
Zotero necesita dos piezas y ambas deben estar presentes: la extensión de navegador <strong>Zotero Connector</strong> y la <strong>aplicación de escritorio de Zotero</strong> abierta en su ordenador.

Con ellas, abra su lista en PubMed y haga clic en el icono de carpeta del conector. Elija <strong>Select All</strong> y luego <strong>OK</strong>: guarda todos los artículos a la vez e intenta obtener cada PDF con el acceso a revistas que ya tenga. Eso es algo que un archivo descargado no puede hacer, porque el conector funciona dentro de su propia sesión del navegador.

Sin la aplicación de escritorio abierta, el conector ofrece guardar en su biblioteca de zotero.org. Zotero dice que eso funciona en "algunas páginas", así que no es un sustituto fiable.

Las descargas .nbib y .ris no necesitan nada de esto y también funcionan con EndNote, Mendeley y RefWorks.

<div class='help-ai-pack'><strong>AI PACK (.ZIP) — AÚN EN DESARROLLO</strong>
<strong>AI pack (.zip)</strong> reúne los artículos de su lista (hasta 40) en un único archivo zip que puede entregar a una herramienta de IA. Cuando puede, añade el texto completo (artículos de acceso abierto y manuscritos de autor de los NIH, desde Europe PMC o PubMed Central); si no, el resumen, además de un README que explica los datos de la barra de citas. Descomprima el archivo y dirija la IA a la carpeta, o suba el zip directamente si su herramienta de IA acepta archivos zip.

Los artículos sin texto completo gratuito tienen un botón Open (el PDF gratuito de PMC si existe; si no, la página del editor) para que guarde un PDF al que tenga acceso.

Los documentos grandes pueden ser demasiado para que una herramienta de IA los lea de una vez. Los artículos largos (más de unas 100 páginas) se señalan, y cada herramienta de IA tiene sus propios límites de carga.
<ul>
<li><strong>Convert PDF:</strong> convierte un PDF guardado en texto dentro de su navegador (no se sube nada). Las listas de referencias van a un archivo aparte y las páginas con tablas se conservan como un PDF pequeño. Un PDF escaneado (solo imágenes) no tiene texto que convertir; para ese caso use Add PDF.</li>
<li><strong>Add PDF:</strong> incluye el PDF en el zip tal como está.</li>
<li><strong>Para diseños complejos o fórmulas matemáticas:</strong> los usuarios con conocimientos técnicos pueden convertir los PDF con herramientas gratuitas como Docling, Marker o MinerU y luego añadir los archivos .md a la carpeta descomprimida.</li>
</ul></div>

<strong>AI TABLE — NUEVO, EXPERIMENTAL</strong>
<strong>AI table</strong> lee el título y el resumen de cada artículo de su lista con la IA integrada de Chrome, en su propio ordenador (no se envía nada), y rellena una fila por artículo: diseño del estudio, población, tamaño de la muestra, intervención o exposición y hallazgo principal. <strong>Copy table</strong> copia el texto separado por tabuladores para Excel o Google Sheets. Puede equivocarse: una celda vacía significa que el resumen no lo dice, el tamaño de la muestra solo se muestra cuando ese número figura en el resumen, y conviene comprobar cada fila con el artículo. El primer uso descarga el modelo de IA de Chrome (varios GB). El botón solo aparece en Chrome 138 o posterior, y el modelo necesita unos 22 GB de espacio libre en disco y una tarjeta gráfica con más de 4 GB de memoria o 16 GB de RAM.`,
        ref: null
    },
    {
        label: "Author = Información de los autores",
        description: `Muestra el primer y el último autor (por convención académica, el primer autor suele dirigir el trabajo y el último autor dirige el laboratorio; si una organización figura en último lugar, se usa la última persona).

<strong>ENLACES DE BÚSQUEDA</strong>
<ul>
<li><strong>PubMed:</strong> usa ORCID (un identificador de autor muy extendido, Ref: <a href="https://orcid.org/" target="_blank">https://orcid.org/</a>) cuando está disponible; si no, usa el apellido y la inicial del nombre</li>
<li><strong>Perfil ORCID:</strong> ofrece información detallada del autor con un identificador único de investigador, más fiable que las búsquedas por nombre (no todos los artículos incluyen ORCID)</li>
</ul>

<em>Nota: las búsquedas por nombre pueden incluir a otros investigadores con nombres parecidos. ORCID ofrece una identificación precisa.</em>

<strong>MÉTRICAS (de OpenAlex, requieren ORCID)</strong>
<ul>
<li><strong>Índice h:</strong> el número h de artículos que tienen al menos h citas cada uno. Ejemplo: 12 artículos con ≥12 citas cada uno = índice h de 12 (Ref: <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC10771139/" target="_blank">https://pmc.ncbi.nlm.nih.gov/articles/PMC10771139/</a>)</li>
<li><strong>Índice i10:</strong> número de artículos con ≥10 citas</li>
<li><strong>Tasa de citas a 2 años:</strong> media de citas por artículo en 2 años</li>
</ul>

<em>Nota: distintas fuentes (Google Scholar, Scopus, Web of Science) calculan estas métricas de forma algo diferente porque usan bases de datos de citas distintas. Véase Ref: <a href="https://en.wikipedia.org/wiki/Author-level_metrics" target="_blank">https://en.wikipedia.org/wiki/Author-level_metrics</a></em>

<strong>AFILIACIONES</strong>
Enumera las afiliaciones institucionales que figuran en el artículo.

Nota: el ORCID, el índice h y el índice i10 del primer y del último autor se obtienen para todos los artículos (desde OpenAlex) y se incluyen en las exportaciones "Excel" y "Datos". Las afiliaciones solo se obtienen al hacer clic en Author, por lo que no se incluyen en las exportaciones.

OBRAS, CITAS Y RETRACTACIONES (OpenAlex, requiere ORCID): works es el número de obras del perfil del autor en OpenAlex y citations el total de citas que han recibido. Los artículos retractados se comprueban para el primer y el último autor: el número indica los otros artículos retractados del autor en OpenAlex, sin contar este artículo. Si alguno tiene uno o más, Author en la barra aparece con un contorno rojo. En el panel Author, un recuento de 1 o más enlaza con los artículos retractados de ese autor en OpenAlex (la lista puede incluir este artículo; los avisos de retractación no se cuentan). "–" significa que no se pudo comprobar (sin ORCID, nombre que no coincide con OpenAlex, OpenAlex no disponible o demasiados resultados para contar), nunca cero. Todos estos datos, y la tasa de citas a 2 años, también están en la exportación a Excel (Author Retractions es el número más alto de los dos; queda en blanco si alguno no se pudo comprobar y ninguno tiene retractaciones).`,
        ref: null
    },
    {
        label: "J = Información de la revista",
        description: "Haga clic en J para ver la revista: nombre completo, ISSN impreso y electrónico, NLM ID (enlazado al NLM Catalog), SJR y Top-J. Con los datos del Journal Ranking de la extensión: el puesto de la revista y sus artículos añadidos a PubMed este año; el crecimiento frente a los mismos meses del año anterior; su % de Medline, % de texto completo gratuito y % de ORCID de este año; y sus retractaciones: artículos de la revista, de cualquier año de publicación, que PubMed marcó como retractados en los mismos meses de este año y del anterior (o preprints retirados, en los servidores de preprints). Las mismas líneas aparecen en el Report. OpenAlex añade el país de la revista, la editorial, si es de acceso abierto y está en DOAJ, el APC, el índice h, la media de citas a 2 años y el primer año; se consulta una vez por revista al abrir J o el Report. El panel empieza con el título y el tipo de publicación del artículo, y la línea de SJR incluye el mejor cuartil de la revista.",
        ref: "https://tomlaheyh.github.io/citation-bar/journal-ranking/journal-ranking.html"
    },
    {
        label: "Top-J = Revista principal",
        description: "Mi propia lista seleccionada de las principales revistas médicas, incluidas las revistas asociadas bajo el mismo sello editorial (por ejemplo, la familia JAMA). La coincidencia se hace por ISSN y muestra \"Yes\" si la revista coincide. La lista es deliberadamente corta y muy selectiva. Lista actual: Annals of Internal Medicine, British Medical Journal (BMJ), European Heart Journal, Journal of the American College of Cardiology, JAMA, Lancet, Nature, New England Journal of Medicine. Acepto sugerencias, pero está pensada como una lista mínima.",
        ref: null
    },
    {
        label: "SJR = SCImago Journal Rank",
        description: "Una clasificación de revistas gratuita y muy respetada. El SCImago Journal Rank (SJR) mide la visibilidad de las revistas con un algoritmo similar al PageRank™ de Google. SCImago es un grupo de investigación vinculado a varias universidades españolas y al CSIC, especializado en análisis y visualización de la información. Las clasificaciones nuevas se publican una vez al año (normalmente en abril). Cuando SCImago lo ofrece, el mejor cuartil de la revista (Q1 a Q4) aparece en el texto emergente, en el panel J, en el Report y en la exportación \"Excel\". SCImago clasifica cada revista dentro de cada una de sus áreas temáticas, y este es el mejor de esos cuartiles: Q1 significa el 25 % superior en al menos un área.",
        ref: "https://www.scimagojr.com/aboutus.php"
    },
    {
        label: "YTD = Artículos de la revista en lo que va de año",
        description: "El número de artículos que esta revista (por ISSN) ha publicado durante el período que cubren los datos de clasificación de la extensión. Descargo todos los datos de PubMed (normalmente cada mes) y clasifico las revistas por total de artículos, artículos gratuitos y artículos indexados en Medline del año. Esos datos de clasificación se incluyen en la extensión y se actualizan con cada versión, así que las cifras cubren el período indicado en el archivo de clasificación. Cuando estaba aprendiendo a usar PubMed, algo así me habría sido muy útil; espero que también lo sea para usted.",
        ref: null
    },
    {
        label: "Medline % = Porcentaje de artículos de la revista en Medline en lo que va de año",
        description: "El porcentaje de artículos de una revista (por ISSN) que han sido indexados en Medline durante el mismo período. Procede de mis propios datos de clasificación. Tenga en cuenta que refleja la indexación y no la calidad de la revista: los artículos publicados recientemente pueden no estar indexados todavía, así que una revista que publica con frecuencia puede mostrar un porcentaje inferior a su tasa final.",
        ref: null
    },
    {
        label: "Free % = Porcentaje de artículos de la revista con texto completo gratuito en lo que va de año",
        description: "El porcentaje de artículos de una revista (por ISSN) disponibles con texto completo gratuito durante el mismo período. Procede de los mismos datos de clasificación que el recuento YTD y el Medline %.",
        ref: null
    },
    {
        label: "Xout = Búsqueda con exclusiones",
        description: `Vuelve a buscar en PubMed con filtros que excluyen la investigación no primaria. Abre un cuadro de diálogo con su búsqueda actual ya rellenada y casillas para excluir tipos de publicación que, en conjunto, representan aproximadamente el 25 % de todos los artículos de PubMed:

<ul>
<li><strong>Has Abstract:</strong> exige que los artículos tengan resumen (recomendado: los artículos sin resumen rara vez son investigación primaria revisada por pares)</li>
<li><strong>No Retracted Publications:</strong> excluye los artículos retractados y sus avisos de retractación</li>
<li><strong>No Published Errata:</strong> excluye los avisos de corrección o fe de erratas</li>
<li><strong>No Letters:</strong> excluye las cartas al director</li>
<li><strong>No Editorials:</strong> excluye los editoriales</li>
<li><strong>No Comments:</strong> excluye los artículos de comentario</li>
<li><strong>No Systematic Reviews:</strong> excluye las revisiones sistemáticas</li>
<li><strong>No Meta-Analyses:</strong> excluye los metaanálisis</li>
<li><strong>No Reviews:</strong> excluye los artículos de revisión</li>
</ul>

Todos los filtros están marcados de forma predeterminada. Desmarque cualquier filtro para dejar pasar ese tipo. La vista previa de la consulta completa se actualiza al instante mientras ajusta los filtros. Puede buscar directamente (en la pestaña actual), copiar la consulta o cancelar. View Expanded muestra su búsqueda junto a la lectura que hace PubMed de ella (la traducción de la consulta de E-utilities), para que vea cómo el mapeo automático de términos amplió las palabras sin etiqueta.`,
        ref: null
    },
    {
        label: "kS = Búsquedas clave",
        description: "Búsquedas de PubMed predefinidas sobre temas con mucho volumen o de rápido crecimiento, agrupadas por área. Haga clic en kS para ver los grupos, señale o haga clic en un grupo para ver sus búsquedas y haga clic en una búsqueda para abrirla en una pestaña nueva. Cada búsqueda exige que el tema sea el asunto principal del artículo (MeSH Major Topic o el título) y que tenga resumen, y excluye los artículos retractados y sus avisos de retractación, las erratas, las cartas, los editoriales y los comentarios. Se mantienen las revisiones, las revisiones sistemáticas y los metaanálisis. La consulta completa aparece en el cuadro de búsqueda de PubMed. Los nombres de los grupos y de las búsquedas están en inglés, como los términos de búsqueda. La fila Years, al pie del menú, añade a la búsqueda un límite móvil por fecha de publicación, por ejemplo \"last 5 years\"[dp] para los últimos 1, 5 o 10 años, o ninguno con All. Forma parte de la consulta, por lo que se conserva al copiarla. Su elección se recuerda.",
        ref: null
    },
    {
        label: "pR = Informes de PubMed (resúmenes clave)",
        description: "Abre un menú con ocho herramientas de informes de PubMed en el sitio de PubMed Citation Bar: PubMed Summary Report (visión general de una búsqueda en PubMed), PubMed Filters Report (análisis de filtros), PubMed MeSH Counts (frecuencia de los términos MeSH), PubMed Journal Ranking (datos de clasificación de revistas), PubMed Drift Report (cambios día a día en las medidas de estado de las citas de PubMed), PubMed ORCID Ranking (los ORCID iD presentes en más artículos de PubMed cada año), PubMed ROR Ranking (organizaciones clasificadas por artículos añadidos este año, según las afiliaciones de los autores) y PubMed iCite Citation Gains (artículos añadidos en los últimos 36 meses con más citas ganadas en los últimos 12 meses). Cada una se abre en una pestaña nueva.",
        ref: "https://tomlaheyh.github.io/citation-bar/"
    },
    {
        label: "/Report = Informe de citas",
        description: "Un informe que reúne todas las medidas y enlaces clave de un artículo en un formato fácil de copiar. Dos botones de la ventana emergente exportan toda la página de resultados: \"Excel\" genera una tabla separada por tabulaciones con exactamente lo que muestra la barra (una fila por artículo, lista para pegar directamente en Excel o Google Sheets), mientras que \"Datos\" vuelca todo: primero los PMID y después todas las medidas, las marcas de tiempo de la extensión y los campos internos. Este segundo botón muestra con total transparencia todos los datos que usa la extensión. No hay ningún seguimiento de usuarios.\n\nNota: los ORCID, el índice h y el índice i10 del primer y del último autor se obtienen para todos los artículos y se incluyen en las exportaciones \"Excel\" y \"Datos\". Otros datos solo se obtienen al hacer clic en un elemento de la barra, porque descargarlos para todos los artículos llevaría demasiado tiempo. Esto incluye los resúmenes (Abstract), las subvenciones y las afiliaciones de los autores. Esos datos no se incluyen en las exportaciones.",
        ref: null
    },
    {
        label: "Memoria = Memoria libre del sistema (se pone roja cuando es baja)",
        description: "Se muestra en la parte inferior de la ventana emergente de la extensión. Chrome (no la extensión) guarda en memoria las páginas más recientes de cada pestaña para que el botón Atrás sea instantáneo, y una pestaña usada para muchas búsquedas tiende a retener cada vez más memoria. Esto ocurre con o sin esta extensión; la barra de citas añade su propia parte en cada página.<br><br>Para evitar que eso se acumule, la extensión vuelve a abrir su pestaña en la misma página después de que la barra de citas se haya ejecutado seis veces. Usted sigue en los resultados que estaba viendo y no hay que volver a escribir nada; lo que se pierde es el historial de Atrás de esa pestaña, un precio razonable por la memoria que se libera. Nunca lo hace en medio de un Analizar 1000, ni mientras está en una página de resultados de Solo alto impacto o de Analizar 1000.<br><br>La línea Memoria se pone roja cuando la memoria libre baja de 2 GB, que es cuando Chrome empieza a tener dificultades en cualquier equipo. Cuando ocurra, suele bastar con cerrar las aplicaciones que no esté usando. El botón Reiniciar extensión también borra los datos guardados de la extensión y la caché de Chrome, y vuelve a abrir la pestaña, si prefiere hacerlo a mano. Reset Extension borra los datos de sitio solo de las páginas de PubMed y NCBI. No se tocan los datos de otros sitios web ni su historial, cookies o contraseñas.",
        ref: null
    },
    {
        label: "Icono de copiar (ventana emergente) = Referencia de esta búsqueda",
        description: "El pequeño icono de copiar al comienzo de la línea de cita en la parte superior de la ventana emergente copia una referencia de la búsqueda de PubMed de la pestaña actual: la base de datos, la fecha de búsqueda, la búsqueda tal como se ejecutó, los filtros de la barra lateral, el número de resultados y la URL. Sigue PRISMA-S, el estándar para informar búsquedas bibliográficas. La fecha importa porque MeSH y el mapeo automático de términos de PubMed cambian con el tiempo, así que la misma búsqueda puede dar otros resultados más adelante. El texto copiado está en inglés, para usarlo en artículos y protocolos.",
        ref: null
    }
];

// Chinese (Simplified) help panel: same items, same order and refs as helpItems.
// Button and checkbox names that still appear in English on screen are kept
// in English here so they match what the user sees.
export const helpItemsZh = [
    {
        label: "Retracted = PMID 和撤稿声明的 PMID（点击后显示）",
        description: "显示文章是否已被撤稿。",
        ref: "https://www.nlm.nih.gov/bsd/policy/errata.html"
    },
    {
        label: "* = 高影响力文章（绿色背景）",
        description: `当文章评分达到您设定的阈值（默认 5 分，可在扩展设置中调整）时，会被标记为高影响力文章（绿色背景）。评分计算方法如下：

${SCORE_CODE}`,
        ref: null
    },
    {
        label: "Overall Score = 文章质量的数值评分",
        description: "综合评分是根据多项因素计算出的数值，用于反映文章质量，包括 MEDLINE 收录、被引次数、相对引用比（RCR）、期刊 SJR 排名、是否热门以及有影响力引用。评分显示在引文报告顶部，便于快速判断文章的影响力和重要性。",
        ref: null
    },
    {
        label: "ZH = 引文栏提示文字的语言",
        description: "? 后面的棕色小标签显示引文栏提示文字所用的语言（EN = English，ES = Español，ZH = 中文，JA = 日本語，KO = 한국어，FR = Français，HI = हिन्दी，AR = العربية，BN = বাংলা，PT = Português）。点击即可选择；引文栏会立即重新绘制，无需重新加载数据，并且会记住您的选择。在您选择之前，它会跟随 Chrome 的语言。本帮助面板和扩展弹出窗口（“-引文栏：开-”左侧的语言按钮）也会采用同一选择。选择英语以外的语言时，还会用您电脑上 Chrome 的内置翻译器翻译搜索结果的标题和文本片段（需要 Chrome 138 或更高版本；首次使用时，点击一次标签后 Chrome 会下载该语言）。结果从页面顶部开始每次翻译 25 条，并有一个状态框显示进度；通过“Show more”加载的结果会在出现时随即翻译。将鼠标悬停在已翻译的标题或片段上即可查看英文原文。引文栏本身的文字始终保持英文。",
        ref: null
    },
    {
        label: "其他语言 = 用您自己的语言使用 PubMed",
        description: `PubMed 的页面和搜索都是英文的。有两种方式可以用您自己的语言阅读，引文栏两种都支持：

<ul>
<li><strong>引文栏上的语言标签</strong>（上文的 ZH）：翻译引文栏的提示文字、本帮助、扩展弹出窗口，以及搜索结果的标题和文本片段。翻译由您电脑上的 Chrome 完成，不会发送到其他任何地方。</li>
<li><strong>Chrome 自带的网页翻译</strong>（右键 →“翻译”，或点击地址栏中的翻译图标；Edge 也有同样的功能）：可将整个 PubMed 页面翻译成浏览器提供的任何语言。引文栏的文字保持英文，以便保持在一行内；MeSH 主题词和关键词完全保持 PubMed 标引时的原样；摘要窗口会在译文下方显示英文原文。浏览器翻译页面期间，引文栏自身的结果翻译会暂停让位，避免重复翻译。</li>
</ul>

无论页面以哪种方式翻译，导出、Google Scholar 链接和引文报告始终使用 PubMed 的英文标题。PubMed 搜索只能识别英文，因此请用英文词语搜索。不支持 Google 翻译网站版的 PubMed（网址以 translate.goog 结尾）：引文栏只在 pubmed.ncbi.nlm.nih.gov 上运行，请改用浏览器自带的翻译。`,
        ref: null
    },
    {
        label: "doi = 在 DOI Lookup 中打开文章",
        description: "在 DOI Lookup（doilookup.com）中打开文章的 DOI。这是一个免费网站，可从十几个来源查询撤稿、引用、期刊指标和开放获取情况。最多可收集 15 个 DOI 一起查看。如果文章没有 DOI，该链接显示为灰色。",
        ref: "https://doilookup.com/"
    },
    {
        label: "MeSH+ = 文章的 MeSH 主题词和关键词",
        description: "显示两个列表。MeSH（Medical Subject Headings，医学主题词）是 NLM 的规范主题标引词，用于 MEDLINE 记录（引文栏上标为 m）；其他记录显示“No MeSH data”。关键词是文章自身的术语，通常由作者提供（Author keywords）。由 NLM 等标引机构偶尔添加的关键词会在单独的标题下列出。关键词不是规范词表，但常常能指出 MeSH 尚未收录的新概念，并可在 PubMed 中用 [ot] 标签检索。MeSH 主题词和关键词从不进行机器翻译：即使浏览器正在翻译页面，它们也完全保持 PubMed 标引时的原样，因此可以直接复制到 PubMed 搜索中。",
        ref: "https://www.nlm.nih.gov/mesh/meshhome.html"
    },
    {
        label: "n = 新文章，不足 2 年",
        description: "依据 PubMed 中的创建日期 [crdt]，即文章首次录入系统的日期。该日期不会改变，而出版日期有时会变动。",
        ref: null
    },
    {
        label: "t = 根据 PubMed Trending 判定的热门文章",
        description: "热门依据的是 PubMed 前 1000 篇文章。具体规则未公开（NIH 政策），但可以理解为“新发表且浏览量大”，大致不会错。",
        ref: "https://pubmed.ncbi.nlm.nih.gov/trending/"
    },
    {
        label: "m = 根据 PubMed 判定已被 Medline 收录",
        description: "表示文章已被 Medline 收录。",
        ref: "https://www.nlm.nih.gov/medline/medline_overview.html"
    },
    {
        label: "p = 预印本",
        description: "表示文章是预印本（尚未经过同行评审）。预印本让研究人员能在正式同行评审之前快速分享成果。虽然它们能让人尽早看到研究，但由于尚未经过严格的同行评审，解读时应谨慎。",
        ref: "https://pmc.ncbi.nlm.nih.gov/about/nihpreprints/"
    },
    {
        label: "e = 勘误，E = 关注声明",
        description: "文章可能有更新或更正，这不是撤稿。约 1% 的文章有更正。点击后会同时显示原文 PMID 和更正的 PMID。同一位置出现粗体 E 表示期刊已发布关注声明（expression of concern）：这是对该文章的正式警示，但尚未达到撤稿。文章两者皆有时显示 E，悬停提示会说明另有更正；点击后列出原文、关注声明和更正。关注声明本身也显示 E。Report 和“Excel”导出会分别列出这两项。",
        ref: "https://www.nlm.nih.gov/bsd/policy/errata.html"
    },
    {
        label: "Cited = 来自 iCite（NIH）或 Europe PMC 的被引次数",
        description: "被引次数来自 iCite，由 NIH 提供，NIH 也是运营 PubMed 的政府机构。被引次数有多个来源，包括 PubMed 本身，但我认为 iCite 总体上最合适。iCite 偶尔会宕机或变慢，这时我会改用 Europe PMC 的被引次数。Europe PMC 是由 EMBL-EBI 与一批科研资助机构共同运营的老牌文献数据库。",
        ref: "https://icite.od.nih.gov/"
    },
    {
        label: "图表图标（Cited 之后）= 每月被引次数，最近 12 个月（iCite）",
        description: "蓝色表示该文章有月度数据：点击即可查看其最近 12 个月在 iCite 的被引图表。第一根柱是起始时的被引次数；之后每个月把当月新增叠加在此前的总数之上，新增数显示在柱的上方。红色虚线框表示 iCite 在该月下调了次数（修正）。将鼠标悬停在柱上可查看具体数字。\n\n灰色表示该文章没有月度数据。图表仅涵盖过去 36 个月内收录到 PubMed、且在过去 12 个月新增被引次数排名前 40,000 的文章，因此即使被引更多，较早发表的文章也不在其中。数据来自 NIH iCite 的月度快照，每月更新一次；完整列表见 PubMed iCite Citation Gains 报告。",
        ref: "https://tomlaheyh.github.io/citation-bar/icite/icite.html"
    },
    {
        label: "RCR = iCite 的相对引用比",
        description: "相对引用比（Relative Citation Ratio，RCR）是 iCite 的一项指标，定义为“每篇论文的年均被引次数，按同一领域、同一年份 NIH 资助论文的年均被引次数进行标准化”。它是一种基于引用的科学影响力指标。iCite 不可用时，RCR 显示为“-”，因为这是 iCite 特有的指标，其他来源没有。为节省空间，RCR 超过 99 时在信息栏上显示为四舍五入的整数（123.4 显示为 123）。Report 和导出保留完整数值。",
        ref: "https://support.icite.nih.gov/hc/en-us/articles/9062490125083-Metrics"
    },
    {
        label: "IC = Semantic Scholar 的有影响力引用",
        description: "Semantic Scholar 会识别那些被引文献对施引文献有重要影响的引用。有影响力引用由机器学习模型判定，分析因素包括引用次数以及每次引用的上下文。未找到时显示“-”。",
        ref: "https://www.semanticscholar.org/faq#influential-citations"
    },
    {
        label: "Alt = Altmetric 评分",
        description: "Altmetric 关注度评分反映一项研究成果受到的关注程度，包括社交媒体、新闻和政策文件。评分由自动算法得出，是对关注度的加权计数。链接直接指向该文章的 Altmetric 页面。",
        ref: "https://help.altmetric.com/en/articles/9800513"
    },
    {
        label: "s = PubMed 中的相似文章",
        description: "PubMed 提供的相似文章列表。您也可以在任何 PubMed 文章页面右侧栏点击“Similar Articles”查看。",
        ref: "https://www.ncbi.nlm.nih.gov/guide/howto/find-articles-similar/"
    },
    {
        label: "c = PubMed 中引用本文的文章",
        description: "PubMed 提供的引用本文的文章列表。由于系统和方法不同，结果与 iCite 略有差异。NIH 今后将以 iCite 为重点，但 PubMed 仍提供这种查看施引文章的便捷方式。",
        ref: "https://pubmed.ncbi.nlm.nih.gov/help/#cited-by"
    },
    {
        label: "Gsch = 通过 DOI 访问 Google Scholar（谷歌学术）",
        description: "Google Scholar 是很好的文献参考资源，也有自己的被引次数（可能略偏高）。在 Google Scholar 中查找文章的最佳方式是使用 DOI（数字对象标识符），它是识别文章的唯一字符串，并为文章提供永久网址。我用 PubMed 文章的 DOI（97% 的文章有 DOI）直接链接到 Google Scholar。",
        ref: "https://scholar.google.com/intl/en/scholar/about.html"
    },
    {
        label: "Con = Connections 引用图谱（doilookup.com）",
        description: "Connections 会在 doilookup.com 上打开文章的交互式引用图谱，数据来自 OpenAlex。它提供三种视图：文章引用的参考文献（Inside）、引用该文章的论文（Outside）以及合并视图（Mix）；气泡按期刊质量着色，并标出可免费获取全文的论文；点击任意论文可查看标题、期刊、年份、被引次数和摘要。您可以以任意论文为中心重新展开，或进行多层扩展，找出更大范围内的奠基性、被共同引用最多的文献。",
        ref: "https://doilookup.com/"
    },
    {
        label: "Abstract = 摘要（点击查看）",
        description: "摘要是对文章的简短描述，约 95% 的近期期刊文章都有摘要。通常需要打开文章才能阅读摘要，而这里可以在不离开搜索结果的情况下快速查看。如果文章有通俗语言摘要，会显示在摘要下方（没有摘要时则显示在摘要的位置）。如果 PubMed 还有其他语言的摘要，会有一条说明列出这些语言，并附上文章链接，您可以在文章页面的摘要上方选择语言。摘要上方的“Translate”一行会用 Chrome 的内置翻译器翻译标题、摘要和通俗语言摘要：点击一次即可译成引文栏所选的语言，也可以输入任意语言代码。当引文栏的语言不是英语时，摘要打开时就已翻译好。英文原文显示在下方以便对照，点击“Show original”可切换回原文。如果浏览器已在翻译整个页面，摘要会跟随浏览器的翻译，并在下方显示英文原文。\n\n全文：摘要下方有一条分隔线，随后一行说明能否在此显示文章全文；能显示时，全文紧随其后。全文会自动加载。开放获取文章来自 Europe PMC，只需一两秒；PubMed Central（PMC）为文本挖掘而开放的其他免费阅读文章直接来自 PMC，可能需要几秒钟。无法显示全文时（仅在出版商网站免费，或在 PMC 免费但非开放获取），该行会链接到可阅读全文的位置。表格以纯文本行显示，图片以图注列出，参考文献不包含在内。文章的出版类型（例如 Randomized Controlled Trial、Review 或 Case Reports）显示在标题下方。\n\n注意：摘要只有在点击 Abstract 时才会获取，因此不包含在“Excel”或“数据”导出中。",
        ref: "https://pubmed.ncbi.nlm.nih.gov/18830537/"
    },
    {
        label: "link = 全文链接",
        description: "PubMed 提供摘要和元数据，但不提供文章全文。它会链接到实际文章（通常在文章页面右上角）。有些文章需要付费订阅；许多大学图书馆都有订阅，如果您已登录图书馆系统，就可以访问付费文章。如果有免费版本（例如 PMC），我会提供该链接；否则链接到出版商页面。链接为免费时显示为绿色：首先是 PMC，其次是通过 OpenAlex 找到的合法免费版本（出版商的开放获取页面或存储库中的版本），然后是 PubMed 自身标记为免费的文章。预印本不算作该文章的免费版本。Report 会说明免费版本的类型。",
        ref: "https://www.ncbi.nlm.nih.gov/guide/howto/obtain-full-text/"
    },
    {
        label: "✓ = 加入导出列表（已加入时为绿色）",
        description: `第二行开头的勾选标记可将文章加入导出列表。灰色表示未加入，绿色表示已加入。再次点击即可移除。

加入文章时会从 PubMed 获取其完整记录（所有作者、卷、期、页码、摘要和 MeSH 主题词），因此勾选标记会暂时变成琥珀色并闪烁。如果获取失败，标记会保持灰色并说明原因，而不会在没有数据的情况下变绿。

<strong>选择会被保留</strong>
<ul>
<li>翻页或进行新的搜索时，已选文章仍保持勾选，因此您可以先从多次搜索中收集文章，再统一导出</li>
<li>重新加入已移除的文章是即时的：其记录会被保留，不会再次向 PubMed 请求</li>
<li>关闭引文栏时列表会被清空</li>
</ul>

请求之间间隔一秒，因此在一页上快速连续勾选时，请求会排队，而不会触发 NCBI 的频率限制。一次只点一篇文章则无需等待。`,
        ref: null
    },
    {
        label: "清单图标 = 打开导出列表",
        description: `勾选标记旁边的清单图标用于打开导出列表。未选择任何文章时为灰色，加入文章后变为蓝色并显示数量，该数量在页面上所有引文栏中都相同。

列表显示每篇文章的标题、期刊、年份和 PMID，并有一个 ✕ 用于移除。在之前页面加入的文章只显示 PMID，因为它们的详细信息已不在屏幕上。

<strong>四个操作</strong>
<ul>
<li><strong>Clear all：</strong>清空列表</li>
<li><strong>Open in new tab：</strong>在新标签页中以 PubMed 搜索的形式显示所选文章，这样您不会丢失正在浏览的结果位置</li>
<li><strong>Download .ris：</strong>RIS 格式，适用于 EndNote、Mendeley、RefWorks、Papers、Zotero</li>
<li><strong>Download .nbib：</strong>MEDLINE 格式，与 PubMed 自带的“Send to → Citation manager”生成的文件相同，适用于 Zotero 和 EndNote</li>
</ul>

两种下载都包含每篇文章的完整记录，包括摘要和 MeSH 主题词。文件名包含日期和时间（例如 <code>pubmed-citations-2026-09-12-3-04pm.nbib</code>），因此一天内多次导出也不会覆盖之前的文件。

PubMed 一次搜索最多接受 200 篇文章，所以如果列表更长，“Open in new tab”只显示前 200 篇，列表中会注明这一点。下载没有数量限制。

<strong>发送到 Zotero（含 PDF）</strong>
Zotero 需要两样东西同时就位：<strong>Zotero Connector</strong> 浏览器扩展，以及在电脑上打开的 <strong>Zotero 桌面应用</strong>。

准备好后，在 PubMed 中打开您的列表，点击 Connector 的文件夹图标。选择 <strong>Select All</strong>，再点 <strong>OK</strong>：它会一次保存所有文章，并利用您已有的期刊访问权限尝试获取每篇文章的 PDF。下载的文件做不到这一点，因为 Connector 是在您自己的浏览器会话中运行的。

如果没有打开桌面应用，Connector 会提示保存到您的 zotero.org 在线文库。Zotero 表示这只对“部分页面”有效，因此并不可靠。

.nbib 和 .ris 下载不需要以上任何条件，也适用于 EndNote、Mendeley 和 RefWorks。

<div class='help-ai-pack'><strong>AI PACK (.ZIP) — 仍在改进中</strong>
<strong>AI pack (.zip)</strong> 会把列表中的文章（最多 40 篇）打包成一个 zip 文件，可直接交给 AI 工具使用。能获取全文时会收录全文（开放获取文章和 NIH 作者手稿，来自 Europe PMC 或 PubMed Central），否则收录摘要，另附说明引文栏数据的 README。解压该文件后让 AI 读取该文件夹；如果您的 AI 工具支持 zip 文件，也可以直接上传 zip。

没有免费全文的文章会显示 Open 按钮（有免费 PMC PDF 时打开该 PDF，否则打开出版商页面），方便您保存自己有权访问的 PDF。

大型文档可能超出 AI 工具一次能读取的范围。较长的文章（约 100 页以上）会被标注，而且每种 AI 工具都有自己的上传限制。
<ul>
<li><strong>Convert PDF：</strong>在您的浏览器中把已保存的 PDF 转换为文本（不会上传任何内容）。参考文献列表放在单独的文件中，表格页保留为一个小型 PDF。扫描版（纯图像）PDF 没有可转换的文本，请对其使用 Add PDF。</li>
<li><strong>Add PDF：</strong>把 PDF 原样放入 zip。</li>
<li><strong>复杂排版或数学公式：</strong>技术用户可以用 Docling、Marker 或 MinerU 等免费工具转换 PDF，然后把生成的 .md 文件添加到解压后的文件夹中。</li>
</ul></div>

<strong>AI TABLE — 新功能，试验性</strong>
<strong>AI table</strong> 使用 Chrome 内置的 AI 在您自己的电脑上读取列表中每篇文章的标题和摘要（不会上传任何内容），并为每篇文章填写一行：研究设计、研究人群、样本量、干预或暴露以及主要发现。<strong>Copy table</strong> 复制以制表符分隔的文本，可粘贴到 Excel 或 Google Sheets。它可能出错：空白单元格表示摘要中没有说明，样本量仅在该数字出现在摘要中时才显示，每一行都应对照文章核实。首次使用时会下载 Chrome 的 AI 模型（数 GB）。该按钮仅在 Chrome 138 或更高版本中出现，模型需要约 22 GB 可用磁盘空间，以及显存超过 4 GB 的显卡或 16 GB 内存。`,
        ref: null
    },
    {
        label: "Author = 作者信息",
        description: `显示第一作者和最后作者（按学术惯例，第一作者通常主导这项工作，最后作者通常是实验室负责人；若最后列出的是机构，则使用最后一位个人作者）。

<strong>搜索链接</strong>
<ul>
<li><strong>PubMed：</strong>有 ORCID（一种广泛使用的作者标识符，参见：<a href="https://orcid.org/" target="_blank">https://orcid.org/</a>）时使用 ORCID；否则使用姓氏和名字首字母</li>
<li><strong>ORCID 个人资料：</strong>提供带有唯一研究者 ID 的详细作者信息，比按姓名搜索更可靠（并非所有文章都包含 ORCID）</li>
</ul>

<em>注意：按姓名搜索可能包含姓名相近的其他研究者。ORCID 能准确识别作者。</em>

<strong>指标（来自 OpenAlex，需要 ORCID）</strong>
<ul>
<li><strong>h 指数：</strong>有 h 篇论文各被引用至少 h 次。例如：12 篇论文各被引用 ≥12 次 = h 指数为 12（参见：<a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC10771139/" target="_blank">https://pmc.ncbi.nlm.nih.gov/articles/PMC10771139/</a>）</li>
<li><strong>i10 指数：</strong>被引用 ≥10 次的论文数</li>
<li><strong>2 年引用率：</strong>2 年内每篇论文的平均被引次数</li>
</ul>

<em>注意：不同来源（Google Scholar、Scopus、Web of Science）使用的引文数据库不同，计算出的这些指标略有差异。参见：<a href="https://en.wikipedia.org/wiki/Author-level_metrics" target="_blank">https://en.wikipedia.org/wiki/Author-level_metrics</a></em>

<strong>机构</strong>
列出文章中的作者所属机构。

注意：第一作者和最后作者的 ORCID、h 指数和 i10 指数会为每篇文章获取（来自 OpenAlex），并包含在“Excel”和“数据”导出中。作者所属机构只有在点击 Author 时才会获取，因此不包含在导出中。

作品、被引和撤稿（OpenAlex，需要 ORCID）：works 是作者 OpenAlex 档案中的作品数，citations 是这些作品的总被引次数。撤稿会针对第一作者和最后作者进行检查：数字是该作者在 OpenAlex 中的其他撤稿文章数，不包括本文。只要其中有人有一篇或以上，栏中的 Author 就会加上红色边框。 在 Author 面板中，1 篇或以上的数字链接到该作者在 OpenAlex 中的撤稿论文（列表可能包含本文；撤稿声明不计入）。“–”表示未能检查（没有 ORCID、姓名与 OpenAlex 不符、OpenAlex 不可用或结果太多无法计数），而不是零。以上数据以及 2 年被引率也包含在 Excel 导出中（Author Retractions 为两人中的较高数；若有人无法检查且无人有撤稿，则留空）。`,
        ref: null
    },
    {
        label: "J = 期刊信息",
        description: "点击 J 查看期刊：全称、印刷版和电子版 ISSN、NLM ID（链接到 NLM Catalog）、SJR 和 Top-J。来自扩展程序的 Journal Ranking 数据：该期刊的排名及今年新增到 PubMed 的文章数；与去年同期相比的增长；今年的 Medline 比例、免费全文比例和 ORCID 比例；以及撤稿数：该期刊任何出版年份的论文中，PubMed 在今年和去年同期标记为撤稿的数量（预印本服务器则为撤回的预印本）。Report 中也有相同内容。OpenAlex 补充期刊的国家、出版商、开放获取与 DOAJ 状态、APC、h 指数、2 年平均被引和创刊年份；仅在打开 J 或 Report 时按期刊查询一次。面板开头是文章的标题和出版类型，SJR 一行包含期刊的最佳分区。",
        ref: "https://tomlaheyh.github.io/citation-bar/journal-ranking/journal-ranking.html"
    },
    {
        label: "Top-J = 顶级期刊",
        description: "我个人精选的顶级医学期刊名单，包括同一出版品牌下的相关期刊（例如 JAMA 系列）。按 ISSN 匹配，匹配时显示“Yes”。名单有意保持精简、严格筛选。当前名单：Annals of Internal Medicine、British Medical Journal (BMJ)、European Heart Journal、Journal of the American College of Cardiology、JAMA、Lancet、Nature、New England Journal of Medicine。欢迎提出建议，但它的定位是一份极简名单。",
        ref: null
    },
    {
        label: "SJR = SCImago 期刊排名",
        description: "一个广受认可的免费期刊排名。SCImago Journal Rank（SJR）使用类似 Google PageRank™ 的算法衡量期刊的可见度。SCImago 是隶属于西班牙多所大学和西班牙国家研究委员会（CSIC）的研究团队，专注于信息分析与可视化。新排名每年发布一次（通常在 4 月）。如果 SCImago 提供，期刊的最佳分区（Q1 至 Q4）会显示在悬停提示、J 面板、Report 和“Excel”导出中。SCImago 在期刊所属的每个学科领域内分别排名，这里取其中最好的分区：Q1 表示至少在一个领域位于前 25%。",
        ref: "https://www.scimagojr.com/aboutus.php"
    },
    {
        label: "YTD = 期刊本年度至今的文章数",
        description: "该期刊（按 ISSN）在本扩展排名数据所覆盖期间内发表的文章数。我会下载 PubMed 的全部数据（通常每月一次），按当年的文章总数、免费文章数和被 Medline 收录的文章数对期刊进行排名。这些排名数据随扩展一起发布，并在每次发布新版本时更新，因此这些数字覆盖的是排名文件中注明的期间。我当初学习 PubMed 时，如果有这样的工具会很有帮助，希望它对您也有用。",
        ref: null
    },
    {
        label: "Medline % = 本年度至今期刊文章被 Medline 收录的百分比",
        description: "同一期间内，该期刊（按 ISSN）被 Medline 收录的文章所占百分比，数据来自我自己的排名数据。请注意，它反映的是收录进度而非期刊质量：近期发表的文章可能尚未被收录，因此发文频繁的期刊显示的百分比可能低于其最终收录率。",
        ref: null
    },
    {
        label: "Free % = 本年度至今期刊文章中可免费获取全文的百分比",
        description: "同一期间内，该期刊（按 ISSN）可免费获取全文的文章所占百分比，数据与 YTD 数量和 Medline % 来自同一份排名数据。",
        ref: null
    },
    {
        label: "Xout = 排除式搜索",
        description: `使用筛选条件重新搜索 PubMed，排除非原创研究。会打开一个对话框，预先填入您当前的搜索，并提供复选框用于排除若干出版类型，这些类型合计约占 PubMed 全部文章的 25%：

<ul>
<li><strong>Has Abstract：</strong>要求文章有摘要（推荐：没有摘要的文章很少是经过同行评审的原创研究）</li>
<li><strong>No Retracted Publications：</strong>排除被撤稿的文章及其撤稿声明</li>
<li><strong>No Published Errata：</strong>排除更正/勘误声明</li>
<li><strong>No Letters：</strong>排除致编辑的信</li>
<li><strong>No Editorials：</strong>排除社论</li>
<li><strong>No Comments：</strong>排除评论文章</li>
<li><strong>No Systematic Reviews：</strong>排除系统综述</li>
<li><strong>No Meta-Analyses：</strong>排除荟萃分析</li>
<li><strong>No Reviews：</strong>排除综述文章</li>
</ul>

所有筛选条件默认勾选。取消勾选某项即可允许该类型通过。调整筛选条件时，完整查询的预览会实时更新。您可以直接搜索（在当前标签页中打开）、复制查询或取消。 View Expanded 会将您的检索式与 PubMed 对它的解读（E-utilities 的检索式转换）并排显示，让您看到未加字段标签的词如何被自动术语映射扩展。`,
        ref: null
    },
    {
        label: "kS = 重点检索",
        description: "针对文献量大或增长迅速的主题预设的 PubMed 检索，按领域分组。点击 kS 显示分组，指向或点击某个分组显示其中的检索，再点击某个检索即可在新标签页中打开。每个检索都要求该主题是文章的主要主题（MeSH 主要主题词或标题）并且有摘要，同时排除被撤稿的文章及其撤稿声明、勘误、信件、社论和评论。综述、系统综述和荟萃分析会保留。完整的检索式会显示在 PubMed 的搜索框中。分组和检索名称使用英文，因为检索词本身是英文。 菜单底部的 Years 一行会在检索式中加入按出版日期滚动计算的时间限制，例如 \"last 5 years\"[dp]，可选最近 1 年、5 年或 10 年；选择 All 则不加限制。该限制是检索式的一部分，复制检索式时会一并保留。您的选择会被记住。",
        ref: null
    },
    {
        label: "pR = PubMed 报告（关键概览）",
        description: "打开一个菜单，其中包含 PubMed Citation Bar 网站上的八个 PubMed 报告工具：PubMed Summary Report（PubMed 搜索概览）、PubMed Filters Report（筛选条件分析）、PubMed MeSH Counts（MeSH 主题词频次统计）、PubMed Journal Ranking（期刊排名数据）、PubMed Drift Report（PubMed 引文状态指标的逐日变化）、PubMed ORCID Ranking（每年出现在最多 PubMed 文章中的 ORCID iD）、PubMed ROR Ranking（按今年新增文章数排名的机构，依据作者单位）和 PubMed iCite Citation Gains（过去 36 个月内收录、过去 12 个月新增被引最多的文章）。每个工具都在新标签页中打开。",
        ref: "https://tomlaheyh.github.io/citation-bar/"
    },
    {
        label: "/Report = 引文报告",
        description: "以便于复制的格式列出文章所有关键指标和链接的报告。弹出窗口中的两个按钮可导出整页结果：“Excel”生成制表符分隔的表格，内容与引文栏显示的完全一致（每篇文章一行，可直接粘贴到 Excel 或 Google Sheets）；“数据”则导出全部内容，先是 PMID，然后是所有指标、扩展时间戳和内部字段。后者完整公开了本扩展使用的所有数据。不做任何用户跟踪。\n\n注意：第一作者和最后作者的 ORCID、h 指数和 i10 指数会为每篇文章获取，并包含在“Excel”和“数据”导出中。其他部分数据只有在点击引文栏中的相应项目时才会获取，因为为每篇文章都获取会耗时过长。这包括摘要（Abstract）、基金资助信息和作者所属机构。这些数据不包含在导出中。",
        ref: null
    },
    {
        label: "内存 = 系统可用内存（不足时变红）",
        description: "显示在扩展弹出窗口底部。Chrome（而非本扩展）会把标签页中最近访问的页面保存在内存中，以便“后退”能瞬间完成；用于多次搜索的标签页往往会随时间占用越来越多的内存。无论是否使用本扩展都会这样；引文栏也会在每个页面上占用一部分内存。<br><br>为避免内存不断累积，引文栏运行六次后，扩展会在同一页面重新打开您的标签页。您仍停留在正在查看的结果上，无需重新输入任何内容；损失的只是该标签页的“后退”历史，以此换取释放的内存是值得的。在“扫描 1000 篇”进行中，或您正处于“仅高影响力”或“扫描 1000 篇”的结果页面时，绝不会这样做。<br><br>当可用内存低于 2 GB 时，“内存”一行会变红，这时无论电脑配置如何，Chrome 都会开始吃力。出现这种情况时，通常关闭不用的应用程序就足够了。如果想手动处理，“重置扩展”按钮也会清除本扩展保存的数据和 Chrome 缓存，并重新打开该标签页。重置扩展只清除 PubMed 和 NCBI 页面的网站数据。其他网站的数据以及您的历史记录、Cookie 和密码不受影响。",
        ref: null
    },
    {
        label: "复制图标（弹出窗口）= 此检索的引用信息",
        description: "弹出窗口顶部引用行开头的小复制图标会复制当前标签页中 PubMed 检索的引用信息：数据库、检索日期、实际运行的检索式、侧栏中的任何筛选条件、结果数和网址。其格式遵循 PRISMA-S（报告文献检索的标准）。日期很重要，因为 MeSH 和 PubMed 的自动术语映射会随时间变化，同一检索日后可能得到不同的结果。复制的文本为英文，便于用于论文和研究方案。",
        ref: null
    }
];

// Japanese help panel: same items, same order and refs as helpItems.
// Button and checkbox names that still appear in English on screen are kept
// in English here so they match what the user sees.
export const helpItemsJa = [
    {
        label: "Retracted = PMID と撤回告知の PMID（クリックで表示）",
        description: "論文が撤回されているかどうかを示します。",
        ref: "https://www.nlm.nih.gov/bsd/policy/errata.html"
    },
    {
        label: "* = 高インパクト論文（緑の背景）",
        description: `スコアが設定したしきい値（既定は 5、拡張機能の設定で変更可能）に達した論文は、高インパクト論文（緑の背景）として表示されます。スコアの計算方法は次のとおりです：

${SCORE_CODE}`,
        ref: null
    },
    {
        label: "Overall Score = 論文の品質を表す数値スコア",
        description: "総合スコアは、MEDLINE 収載、被引用数、Relative Citation Ratio（RCR）、ジャーナルの SJR 順位、注目度（トレンド）、影響力のある引用など、複数の要素から計算した論文の品質を表す値です。引用レポートの先頭に表示され、論文の影響力と重要性をすばやく判断するのに役立ちます。",
        ref: null
    },
    {
        label: "JA = 引用バーのツールチップの言語",
        description: "? の後ろにある小さな茶色のタグは、引用バーのツールチップの言語を示します（EN = English、ES = Español、ZH = 中文、JA = 日本語、KO = 한국어、FR = Français、HI = हिन्दी、AR = العربية、BN = বাংলা、PT = Português）。クリックして選ぶと、データを読み込み直さずにすぐ引用バーが再描画され、選択は記憶されます。選ぶまでは Chrome の言語に従います。このヘルプパネルと拡張機能のポップアップ（「-引用バー：オン-」の左の言語ボタン）も同じ選択に従います。英語以外の言語を選ぶと、パソコン上の Chrome の組み込み翻訳機能を使って、検索結果のタイトルとスニペットも翻訳します（Chrome 138 以降。初回は、タグを 1 回クリックすると Chrome がその言語をダウンロードします）。結果はページの上から 25 件ずつ翻訳され、進行状況を示すステータスボックスが表示されます。「Show more」で追加された結果も、表示されるたびに翻訳されます。翻訳されたタイトルやスニペットにマウスを重ねると英語が表示されます。引用バー自体の文字は常に英語のままです。",
        ref: null
    },
    {
        label: "その他の言語 = 自分の言語で PubMed を使う",
        description: `PubMed のページと検索は英語です。自分の言語で読む方法は 2 つあり、引用バーはどちらにも対応しています：

<ul>
<li><strong>引用バーの言語タグ</strong>（上記の JA）：引用バーのツールチップ、このヘルプ、拡張機能のポップアップ、検索結果のタイトルとスニペットを翻訳します。翻訳はパソコン上の Chrome が行い、どこにも送信されません。</li>
<li><strong>Chrome 自体のページ翻訳</strong>（右クリック →「翻訳」、またはアドレスバーの翻訳アイコン。Edge にも同じ機能があります）：PubMed のページ全体を、ブラウザが対応する任意の言語に翻訳します。引用バーの文字は 1 行に収まるよう英語のままで、MeSH 用語とキーワードは PubMed の索引どおりに保たれ、抄録ウィンドウには翻訳の下に英語の原文が表示されます。ブラウザがページを翻訳している間は、二重に翻訳されないよう、引用バー自身の検索結果の翻訳は控えます。</li>
</ul>

ページをどの方法で翻訳しても、エクスポート、Google Scholar のリンク、引用レポートには常に PubMed の英語タイトルが使われます。PubMed の検索は英語しか理解しないので、英語の用語で検索してください。Google 翻訳ウェブサイト版の PubMed（アドレスが translate.goog で終わるもの）には対応していません。引用バーは pubmed.ncbi.nlm.nih.gov でのみ動作するので、代わりにブラウザ自体の翻訳を使ってください。`,
        ref: null
    },
    {
        label: "doi = DOI Lookup で論文を開く",
        description: "論文の DOI を DOI Lookup（doilookup.com）で開きます。撤回、引用、ジャーナル指標、オープンアクセスを十数の情報源から調べられる無料サイトです。DOI は最大 15 件まで集めてまとめて表示できます。DOI がない論文ではリンクが灰色になります。",
        ref: "https://doilookup.com/"
    },
    {
        label: "MeSH+ = 論文の MeSH 用語とキーワード",
        description: "2 つのリストを表示します。MeSH（Medical Subject Headings）は NLM の統制された主題語で、MEDLINE レコード（引用バーで m と表示）に付与されます。それ以外のレコードには「No MeSH data」と表示されます。キーワードは論文自体の用語で、通常は著者が付けたもの（Author keywords）です。NLM などの索引作成者がときどき追加したキーワードは、別の見出しの下に表示されます。キーワードは統制語ではありませんが、MeSH にまだない新しい概念を表していることが多く、PubMed では [ot] タグで検索できます。MeSH 用語とキーワードは機械翻訳されません。ブラウザがページを翻訳している間も PubMed の索引どおりに保たれるので、そのまま PubMed の検索にコピーできます。",
        ref: "https://www.nlm.nih.gov/mesh/meshhome.html"
    },
    {
        label: "n = 新しい論文（2 年未満）",
        description: "PubMed の作成日 [crdt]、つまり論文が最初にシステムに登録された日に基づきます。出版日はときどき変わりますが、この日付は変わりません。",
        ref: null
    },
    {
        label: "t = PubMed Trending による注目論文",
        description: "PubMed の上位 1000 件に基づきます。実際のロジックは非公開（NIH の方針）ですが、「新しくて閲覧数が多い」と考えればほぼ間違いありません。",
        ref: "https://pubmed.ncbi.nlm.nih.gov/trending/"
    },
    {
        label: "m = PubMed による Medline 収載",
        description: "論文が Medline に収載されていることを示します。",
        ref: "https://www.nlm.nih.gov/medline/medline_overview.html"
    },
    {
        label: "p = プレプリント",
        description: "論文がプレプリント（査読前）であることを示します。プレプリントは、正式な査読の前に研究者が成果をすばやく共有するためのものです。研究にいち早く触れられますが、厳格な査読を経ていないため、慎重に解釈する必要があります。",
        ref: "https://pmc.ncbi.nlm.nih.gov/about/nihpreprints/"
    },
    {
        label: "e = 正誤表、E = 懸念表明",
        description: "論文には更新や訂正が出ることがありますが、これは撤回ではありません。約 1% の論文に訂正があります。クリックすると、元の論文の PMID と訂正の PMID の両方を表示します。同じ位置の太字の E は、ジャーナルが懸念表明（expression of concern）を公表していることを示します。これは論文に対する正式な警告で、撤回には至らないものです。両方がある場合は E を表示し、ホバーテキストで訂正があることも示します。クリックすると、元の論文、懸念表明、訂正を一覧表示します。懸念表明そのものにも E を表示します。Report と「Excel」エクスポートでは、この 2 つを別々に示します。",
        ref: "https://www.nlm.nih.gov/bsd/policy/errata.html"
    },
    {
        label: "Cited = iCite（NIH）または Europe PMC の被引用数",
        description: "被引用数は、PubMed を運営する政府機関でもある NIH が提供する iCite のものです。被引用数の情報源は PubMed 自体を含めいくつかありますが、全体として iCite が最適だと考えています。iCite が停止していたり遅かったりする場合は、EMBL-EBI が研究助成機関のグループとともに運営する歴史ある文献データベース Europe PMC から被引用数を取得します。",
        ref: "https://icite.od.nih.gov/"
    },
    {
        label: "グラフのアイコン（Cited の後）= 月別の被引用数、直近 12 か月（iCite）",
        description: "論文に月別データがある場合は青色です。クリックすると、直近 12 か月の iCite 被引用数のグラフが開きます。最初の棒は開始時点の被引用数で、以降の各月は、それまでの合計の上にその月の増加分を積み上げ、増加数を棒の上に表示します。赤い破線の枠は、iCite が件数を下げた月（修正）を示します。棒にマウスを合わせると数値が表示されます。\n\n灰色は、その論文に月別データがないことを意味します。グラフの対象は、過去 36 か月に PubMed に追加され、過去 12 か月の被引用数の増加が上位 40,000 件に入る論文のみです。そのため、被引用数がより多くても、以前から知られている論文は含まれません。データは NIH iCite の月次スナップショットに基づき、月 1 回更新されます。全リストは PubMed iCite Citation Gains レポートにあります。",
        ref: "https://tomlaheyh.github.io/citation-bar/icite/icite.html"
    },
    {
        label: "RCR = iCite の Relative Citation Ratio",
        description: "Relative Citation Ratio（RCR）は iCite の指標で、「各論文の年間被引用数を、同じ分野・同じ年の NIH 助成論文が受ける年間被引用数で標準化したもの」と定義されています。引用に基づく科学的影響力の指標です。iCite が使えないときは、他の情報源にはない iCite 独自の指標のため、RCR は「-」と表示されます。スペースを節約するため、RCR が 99 を超える場合、バーには四捨五入した整数で表示します（123.4 は 123）。Report とエクスポートでは元の値のままです。",
        ref: "https://support.icite.nih.gov/hc/en-us/articles/9062490125083-Metrics"
    },
    {
        label: "IC = Semantic Scholar の影響力のある引用",
        description: "Semantic Scholar は、引用された論文が引用している論文に大きな影響を与えている引用を特定します。影響力のある引用は、引用回数や各引用の前後の文脈などを分析する機械学習モデルで判定されます。見つからない場合は「-」と表示します。",
        ref: "https://www.semanticscholar.org/faq#influential-citations"
    },
    {
        label: "Alt = Altmetric スコア",
        description: "Altmetric Attention Score は、SNS、ニュース、政策文書などで研究成果がどれだけ注目されたかを示す指標です。自動アルゴリズムで算出され、注目度を重み付けして数えたものです。リンクからその論文の Altmetric ページに直接移動します。",
        ref: "https://help.altmetric.com/en/articles/9800513"
    },
    {
        label: "s = PubMed の類似論文",
        description: "PubMed の類似論文の一覧です。PubMed の論文ページ右側のサイドバーにある「Similar Articles」をクリックしても見られます。",
        ref: "https://www.ncbi.nlm.nih.gov/guide/howto/find-articles-similar/"
    },
    {
        label: "c = この論文を引用している PubMed の論文",
        description: "この論文を引用している論文の PubMed による一覧です。仕組みや方法が異なるため、iCite とは少し異なります。NIH は今後 iCite に注力しますが、PubMed も引用論文を手軽に確認する方法として引き続き提供しています。",
        ref: "https://pubmed.ncbi.nlm.nih.gov/help/#cited-by"
    },
    {
        label: "Gsch = DOI で Google Scholar を開く",
        description: "Google Scholar は論文を調べるのに優れた情報源で、独自の被引用数もあります（やや多めに出ることがあります）。Google Scholar で論文を見つける最良の方法は DOI（Digital Object Identifier）です。DOI は論文を識別し、恒久的なウェブアドレスを与える一意の文字列です。PubMed の論文の DOI（97% にあります）を使って Google Scholar に直接リンクしています。",
        ref: "https://scholar.google.com/intl/en/scholar/about.html"
    },
    {
        label: "Con = Connections 引用グラフ（doilookup.com）",
        description: "Connections は、OpenAlex のデータを使った論文のインタラクティブな引用グラフを doilookup.com で開きます。論文が引用している文献（Inside）、論文を引用している論文（Outside）、その両方（Mix）の 3 つの表示があり、バブルはジャーナルの質で色分けされ、無料全文があるものには印が付きます。論文をクリックすると、タイトル、ジャーナル、年、被引用数、抄録が表示されます。任意の論文を中心に表示し直したり、複数階層に広げて、周辺全体で基礎となる最も共引用の多い文献を見つけたりできます。",
        ref: "https://doilookup.com/"
    },
    {
        label: "Abstract = 抄録（クリックで表示）",
        description: "抄録は論文の短い説明で、最近のジャーナル論文の約 95% にあります。通常は論文を開かないと読めませんが、ここでは検索結果から離れずにすばやく抄録を見られます。論文に平易な要約があれば、抄録の下（抄録がない場合はその位置）に表示します。PubMed に他の言語の抄録もある場合は、その言語を挙げた注記と論文へのリンクを表示します。論文ページの抄録の上で言語を選べます。抄録の上にある「Translate」の行で、Chrome の組み込み翻訳機能を使ってタイトル、抄録、平易な要約を翻訳できます。1 回のクリックで引用バーの言語に翻訳するか、任意の言語コードを入力します。引用バーの言語が英語以外のときは、抄録は最初から翻訳された状態で開きます。比較できるよう英語の原文が下に表示され、「Show original」で元に戻せます。ブラウザがすでにページ全体を翻訳している場合、抄録はブラウザの翻訳に従い、その下に英語の原文が表示されます。\n\n全文：抄録の下に区切り線があり、その後の 1 行で論文の全文をここに表示できるかどうかを示します。表示できる場合は、続けて全文が表示されます。全文は自動的に読み込まれます。オープンアクセスの論文は Europe PMC から 1〜2 秒で届きます。PubMed Central（PMC）がテキストマイニング用に公開しているその他の無料論文は PMC から直接取得するため、数秒かかることがあります。全文を表示できない場合（出版社のサイトでのみ無料、または PMC で無料だがオープンアクセスではない場合）は、読める場所へのリンクを示します。表はプレーンな行として、図はキャプションで示し、参考文献は省略します。論文の出版タイプ（例：Randomized Controlled Trial、Review、Case Reports）をタイトルの下に表示します。\n\n注：抄録は Abstract をクリックしたときにだけ取得されるため、「Excel」と「データ」のエクスポートには含まれません。",
        ref: "https://pubmed.ncbi.nlm.nih.gov/18830537/"
    },
    {
        label: "link = 全文リンク",
        description: "PubMed は抄録とメタデータを提供しますが、論文の全文は提供しません。実際の論文へのリンクがあります（通常は論文ページの右上）。有料購読が必要な論文もありますが、多くの大学図書館が購読しているので、そのシステムにログインしていれば有料の論文も読めます。無料版（PMC など）があればそのリンクを、なければ出版社のページへのリンクを示します。リンクは無料の場合に緑色になります。まず PMC、次に OpenAlex で見つかった合法的な無料版（出版社のオープンアクセスページ、またはリポジトリ上の版）、その次に PubMed 自体が無料と表示している論文の順です。プレプリントは、その論文の無料版としては扱いません。Report には無料版の種類を示します。",
        ref: "https://www.ncbi.nlm.nih.gov/guide/howto/obtain-full-text/"
    },
    {
        label: "✓ = エクスポートリストに追加（追加済みは緑）",
        description: `2 行目の先頭のチェックで、論文をエクスポートリストに追加します。灰色は未追加、緑は追加済みです。もう一度クリックすると削除されます。

論文を追加すると、PubMed から完全なレコード（全著者、巻、号、ページ、抄録、MeSH 用語）を取得するため、その間チェックが琥珀色になり点滅します。取得に失敗した場合は、中身がないまま緑になるのではなく、灰色のまま理由を表示します。

<strong>選択は保持されます</strong>
<ul>
<li>ページを移動したり新しい検索をしたりしても論文はチェックされたままなので、複数の検索から集めてからエクスポートできます</li>
<li>削除した論文を再び追加するのは一瞬です。レコードが保持されているため、PubMed に二度問い合わせることはありません</li>
<li>引用バーをオフにするとリストは消去されます</li>
</ul>

リクエストは 1 秒ずつ間隔をあけるので、ページ内を素早く次々チェックしてもキューに入り、NCBI のレート制限に引っかかりません。1 件ずつクリックする場合は待ち時間はありません。`,
        ref: null
    },
    {
        label: "チェックリストのアイコン = エクスポートリストを開く",
        description: `チェックの隣のチェックリストのアイコンで、エクスポートリストを開きます。何も選択していないときは灰色、論文を追加すると件数付きの青になり、その件数はページ上のすべての引用バーで同じです。

リストには各論文のタイトル、ジャーナル、年、PMID と、削除用の ✕ が表示されます。前のページで追加した論文は、詳細がもう画面にないため PMID で表示されます。

<strong>4 つの操作</strong>
<ul>
<li><strong>Clear all：</strong>リストを空にします</li>
<li><strong>Open in new tab：</strong>選んだ論文を PubMed の検索として新しいタブに表示します。作業中の検索結果の位置はそのまま残ります</li>
<li><strong>Download .ris：</strong>RIS 形式。EndNote、Mendeley、RefWorks、Papers、Zotero 用</li>
<li><strong>Download .nbib：</strong>MEDLINE 形式。PubMed の「Send to → Citation manager」で作られるのと同じファイルで、Zotero と EndNote 用</li>
</ul>

どちらのダウンロードにも、抄録と MeSH 用語を含む各論文の完全なレコードが入ります。ファイル名には日時が付くので（例：<code>pubmed-citations-2026-09-12-3-04pm.nbib</code>）、1 日に何度エクスポートしても以前のファイルが上書きされることはありません。

PubMed は 1 回の検索で最大 200 件しか受け付けないため、リストがそれより長い場合「Open in new tab」は最初の 200 件を表示し、リストにその旨が表示されます。ダウンロードに上限はありません。

<strong>PDF とともに Zotero へ送る</strong>
Zotero には 2 つのものが両方必要です：<strong>Zotero Connector</strong> ブラウザ拡張機能と、パソコンで開いている <strong>Zotero デスクトップアプリ</strong>です。

それらがあれば、PubMed でリストを開き、コネクタのフォルダアイコンをクリックします。<strong>Select All</strong>、続いて <strong>OK</strong> を選ぶと、すべての論文を一度に保存し、すでにお持ちのジャーナルへのアクセス権を使って各論文の PDF の取得を試みます。コネクタはご自身のブラウザセッション内で動くので、ダウンロードしたファイルではこれはできません。

デスクトップアプリが開いていないと、コネクタは zotero.org のライブラリへの保存を提案します。Zotero によればこれは「一部のページ」でしか機能しないため、確実な代わりにはなりません。

.nbib と .ris のダウンロードにはこれらは不要で、EndNote、Mendeley、RefWorks でも使えます。

<div class='help-ai-pack'><strong>AI PACK (.ZIP) — 改良中</strong>
<strong>AI pack (.zip)</strong> は、リストの論文（最大 40 件）を 1 つの zip ファイルにまとめ、そのまま AI ツールに渡せるようにします。可能な場合は全文（オープンアクセスの論文と NIH の著者原稿、Europe PMC または PubMed Central から）、それ以外は抄録を収録し、引用バーのデータを説明する README も含みます。ファイルを展開して AI にそのフォルダーを読ませるか、AI ツールが zip に対応していれば zip をそのままアップロードしてください。

無料の全文がない論文には Open ボタン（無料の PMC PDF があればそれを、なければ出版社のページを開きます）が表示され、アクセスできる PDF を保存できます。

大きな文書は、AI ツールが一度に読み切れないことがあります。長い論文（約 100 ページ超）には印が付きます。また、AI ツールごとにアップロードの上限があります。
<ul>
<li><strong>Convert PDF：</strong>保存した PDF をブラウザ内でテキストに変換します（何もアップロードされません）。参考文献リストは別ファイルに、表のページは小さな PDF として残します。スキャンした（画像のみの）PDF には変換できるテキストがないため、Add PDF を使ってください。</li>
<li><strong>Add PDF：</strong>PDF をそのまま zip に入れます。</li>
<li><strong>複雑なレイアウトや数式がある場合：</strong>技術に詳しい方は、Docling、Marker、MinerU などの無料ツールで PDF を変換し、できた .md ファイルを展開したフォルダーに追加できます。</li>
</ul></div>

<strong>AI TABLE — 新機能・試験的</strong>
<strong>AI table</strong> は、Chrome 内蔵の AI を使って、リスト内の各論文のタイトルと抄録をお使いのコンピューター上で読み取り（何もアップロードされません）、論文ごとに 1 行を作成します：研究デザイン、対象集団、サンプルサイズ、介入または曝露、主な結果。<strong>Copy table</strong> は、Excel や Google Sheets に貼り付けられるタブ区切りテキストをコピーします。誤ることがあります。空欄は抄録に記載がないことを意味し、サンプルサイズはその数値が抄録にある場合のみ表示します。各行は論文と照合してください。初回使用時に Chrome の AI モデル（数 GB）をダウンロードします。ボタンは Chrome 138 以降でのみ表示され、モデルには約 22 GB の空きディスク容量と、4 GB を超えるメモリを持つグラフィックカードまたは 16 GB の RAM が必要です。`,
        ref: null
    },
    {
        label: "Author = 著者情報",
        description: `筆頭著者と責任（最終）著者を表示します（学術上の慣例では、筆頭著者が研究を主導し、最終著者が研究室を率いることが多いです。最後に組織名がある場合は、最後の個人著者を使います）。

<strong>検索リンク</strong>
<ul>
<li><strong>PubMed：</strong>ORCID（広く使われている著者 ID、参照：<a href="https://orcid.org/" target="_blank">https://orcid.org/</a>）があればそれを使い、なければ姓と名のイニシャルを使います</li>
<li><strong>ORCID プロフィール：</strong>固有の研究者 ID による詳しい著者情報で、名前による検索より信頼できます（ORCID がない論文もあります）</li>
</ul>

<em>注：名前による検索には、名前が似ている別の研究者が含まれることがあります。ORCID なら正確に特定できます。</em>

<strong>指標（OpenAlex より、ORCID が必要）</strong>
<ul>
<li><strong>h 指数：</strong>h 本の論文がそれぞれ h 回以上引用されているときの h。例：12 本の論文がそれぞれ 12 回以上引用 = h 指数 12（参照：<a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC10771139/" target="_blank">https://pmc.ncbi.nlm.nih.gov/articles/PMC10771139/</a>）</li>
<li><strong>i10 指数：</strong>10 回以上引用された論文の数</li>
<li><strong>2 年引用率：</strong>2 年間の論文 1 本あたりの平均被引用数</li>
</ul>

<em>注：情報源（Google Scholar、Scopus、Web of Science）によって引用データベースが異なるため、これらの指標の計算結果は少しずつ異なります。参照：<a href="https://en.wikipedia.org/wiki/Author-level_metrics" target="_blank">https://en.wikipedia.org/wiki/Author-level_metrics</a></em>

<strong>所属</strong>
論文に記載された所属機関を表示します。

注：筆頭著者と最終著者の ORCID、h 指数、i10 指数はすべての論文について（OpenAlex から）取得され、「Excel」と「データ」のエクスポートに含まれます。所属機関は Author をクリックしたときにだけ取得されるため、エクスポートには含まれません。

論文数・被引用数・撤回（OpenAlex、ORCID が必要）：works は著者の OpenAlex プロフィールにある論文数、citations はそれらへの被引用数の合計です。撤回論文は 筆頭著者と最終著者について確認します。数値は OpenAlex にあるその著者のほかの撤回論文の数で、この論文は含みません。いずれかが 1 件以上あると、バーの Author に赤い枠が付きます。 Author パネルでは、1 件以上の件数が OpenAlex のその著者の撤回論文一覧にリンクします（一覧にはこの論文が含まれる場合があります。撤回通知は数えません）。「–」は確認できなかったこと（ORCID なし、名前が OpenAlex と一致しない、OpenAlex が利用できない、結果が多すぎて数えられない）を意味し、0 ではありません。これらと 2 年間の被引用率は Excel エクスポートにも含まれます（Author Retractions は 2 人のうち大きいほうの件数。確認できなかった人がいて、誰にも撤回がない場合は空欄）。`,
        ref: null
    },
    {
        label: "J = ジャーナル情報",
        description: "J をクリックするとジャーナルの情報を表示します：正式名、印刷版と電子版の ISSN、NLM ID（NLM Catalog へのリンク）、SJR、Top-J。拡張機能の Journal Ranking データから：ジャーナルの順位と今年 PubMed に追加された論文数、昨年同期と比べた増減、今年の Medline の割合・無料全文の割合・ORCID の割合、撤回数：出版年を問わず、今年と昨年の同じ月に PubMed が撤回と記録したこのジャーナルの論文数（プレプリントサーバーでは取り下げられたプレプリント）。同じ内容は Report にもあります。OpenAlex からジャーナルの国、出版社、オープンアクセスと DOAJ の状況、APC、h 指数、2 年平均被引用数、創刊年を追加します。J または Report を開いたときにジャーナルごとに 1 回だけ取得します。パネルの先頭には論文のタイトルと出版タイプを表示し、SJR の行にはジャーナルの最良クォータイルを含めます。",
        ref: "https://tomlaheyh.github.io/citation-bar/journal-ranking/journal-ranking.html"
    },
    {
        label: "Top-J = 主要ジャーナル",
        description: "私が独自に選んだ主要医学ジャーナルのリストで、同じ出版グループの関連誌（例：JAMA ファミリー）も含みます。ISSN で照合し、一致すれば「Yes」と表示します。リストは意図的に少なく、厳選しています。現在のリスト：Annals of Internal Medicine、British Medical Journal (BMJ)、European Heart Journal、Journal of the American College of Cardiology、JAMA、Lancet、Nature、New England Journal of Medicine。ご提案は歓迎しますが、最小限のリストとして作っています。",
        ref: null
    },
    {
        label: "SJR = SCImago Journal Rank",
        description: "広く信頼されている無料のジャーナル順位です。SCImago Journal Rank（SJR）は、Google の PageRank™ に似たアルゴリズムでジャーナルの可視性を測ります。SCImago は、スペインの複数の大学と CSIC（スペイン高等科学研究院）に所属する、情報分析と可視化を専門とする研究グループです。新しいランキングは年に 1 回公開されます（通常は 4 月）。SCImago が提供している場合、ジャーナルの最良クォータイル（Q1～Q4）をホバーテキスト、J パネル、Report、「Excel」エクスポートに表示します。SCImago はジャーナルを所属する分野ごとに順位付けしており、これはその中で最も良いものです。Q1 は、少なくとも 1 つの分野で上位 25% であることを意味します。",
        ref: "https://www.scimagojr.com/aboutus.php"
    },
    {
        label: "YTD = ジャーナルの年初来の論文数",
        description: "このジャーナル（ISSN 単位）が、本拡張機能の順位データの対象期間に掲載した論文数です。PubMed の全データを（通常は毎月）取得し、その年の総論文数、無料論文数、Medline 収載論文数でジャーナルを順位付けしています。この順位データは拡張機能に同梱され、リリースごとに更新されるので、数値は順位ファイルに記載された期間のものです。私が PubMed を学んでいた頃にこういうものがあればとても助かったので、皆さんのお役にも立てば幸いです。",
        ref: null
    },
    {
        label: "Medline % = 年初来のジャーナル論文の Medline 収載率",
        description: "同じ期間に、ジャーナル（ISSN 単位）の論文のうち Medline に収載された割合です。私自身の順位データによります。これはジャーナルの質ではなく収載状況を表す点に注意してください。最近の論文はまだ収載されていないことがあるため、掲載頻度の高いジャーナルは最終的な収載率より低く表示されることがあります。",
        ref: null
    },
    {
        label: "Free % = 年初来のジャーナル論文のうち無料全文がある割合",
        description: "同じ期間に、ジャーナル（ISSN 単位）の論文のうち無料で全文が読める割合です。YTD の件数や Medline % と同じ順位データによります。",
        ref: null
    },
    {
        label: "Xout = 除外検索",
        description: `一次研究以外を除外するフィルタを付けて PubMed を再検索します。現在の検索があらかじめ入力されたダイアログが開き、合わせて PubMed 全論文の約 25% を占める出版タイプを除外するチェックボックスがあります：

<ul>
<li><strong>Has Abstract：</strong>抄録がある論文に限ります（推奨：抄録のない論文が査読済みの一次研究であることはまれです）</li>
<li><strong>No Retracted Publications：</strong>撤回された論文とその撤回告知を除外します</li>
<li><strong>No Published Errata：</strong>訂正・正誤表の告知を除外します</li>
<li><strong>No Letters：</strong>編集者への手紙を除外します</li>
<li><strong>No Editorials：</strong>論説を除外します</li>
<li><strong>No Comments：</strong>コメント記事を除外します</li>
<li><strong>No Systematic Reviews：</strong>システマティックレビューを除外します</li>
<li><strong>No Meta-Analyses：</strong>メタアナリシスを除外します</li>
<li><strong>No Reviews：</strong>総説を除外します</li>
</ul>

すべてのフィルタは既定でチェックされています。チェックを外すと、そのタイプも含まれます。フィルタを変えると、検索式全体のプレビューがその場で更新されます。そのまま検索（現在のタブで開く）、検索式のコピー、キャンセルができます。 View Expanded では、検索式と PubMed による解釈（E-utilities のクエリ変換）を並べて表示し、タグのない語が自動用語マッピングでどう展開されたかを確認できます。`,
        ref: null
    },
    {
        label: "kS = キー検索",
        description: "文献数が多い、または急増しているトピックについて定義済みの PubMed 検索を、分野ごとにまとめています。kS をクリックするとグループが表示され、グループをポイントまたはクリックするとその検索が表示されます。検索をクリックすると新しいタブで開きます。各検索では、そのトピックが論文の主題であること（MeSH Major Topic またはタイトル）と抄録があることを条件とし、撤回された論文とその撤回告知、正誤表、レター、論説、コメントを除外します。レビュー、システマティックレビュー、メタアナリシスは含めます。完全な検索式は PubMed の検索ボックスに表示されます。検索語が英語のため、グループ名と検索名は英語です。 メニュー下部の Years の行では、検索式に出版日による直近期間の条件（例：\"last 5 years\"[dp]）を追加します。直近 1 年、5 年、10 年から選べ、All では条件を付けません。条件は検索式の一部なので、検索式をコピーしても保たれます。選択は保存されます。",
        ref: null
    },
    {
        label: "pR = PubMed レポート（主要な概要）",
        description: "PubMed Citation Bar のサイトにある 8 つの PubMed レポートツールのメニューを開きます：PubMed Summary Report（PubMed 検索の概要）、PubMed Filters Report（フィルタ分析）、PubMed MeSH Counts（MeSH 用語の頻度）、PubMed Journal Ranking（ジャーナル順位データ）、PubMed Drift Report（PubMed の引用ステータス指標の日ごとの変化）、PubMed ORCID Ranking（毎年もっとも多くの PubMed 論文に付いている ORCID iD）、PubMed ROR Ranking（今年追加された論文数による機関のランキング、著者の所属から集計）、PubMed iCite Citation Gains（過去 36 か月に追加され、過去 12 か月で被引用数が最も増えた論文）。それぞれ新しいタブで開きます。",
        ref: "https://tomlaheyh.github.io/citation-bar/"
    },
    {
        label: "/Report = 引用レポート",
        description: "論文の主要な指標とリンクをすべて、コピーしやすい形式でまとめたレポートです。ポップアップの 2 つのボタンで結果のページ全体をエクスポートできます：「Excel」は引用バーの表示内容そのままのタブ区切りの表（1 論文 1 行、Excel や Google Sheets にそのまま貼り付け可能）、「データ」はすべて（まず PMID、次にすべての指標、拡張機能のタイムスタンプ、内部フィールド）を出力します。後者は本拡張機能が使うすべてのデータの完全な開示です。ユーザーの追跡は一切ありません。\n\n注：筆頭著者と最終著者の ORCID、h 指数、i10 指数はすべての論文について取得され、「Excel」と「データ」のエクスポートに含まれます。その他の一部のデータは、引用バーの項目をクリックしたときにだけ取得されます。すべての論文について取得すると時間がかかりすぎるためです。抄録（Abstract）、研究助成情報、著者の所属機関がこれに当たります。これらのデータはエクスポートには含まれません。",
        ref: null
    },
    {
        label: "メモリ = システムの空きメモリ（少ないと赤）",
        description: "拡張機能のポップアップの下部に表示されます。「戻る」をすぐに行えるよう、Chrome（拡張機能ではありません）はタブで最近開いたページをメモリに保持しており、多くの検索に使ったタブは時間とともにメモリを多く抱えがちです。これは本拡張機能の有無にかかわらず起こり、引用バーもページごとに一定のメモリを使います。<br><br>メモリがたまり続けないよう、引用バーが 6 回実行されると、拡張機能はタブを同じページで開き直します。見ていた結果はそのままで、入力し直す必要はありません。失われるのはそのタブの「戻る」履歴だけで、解放されるメモリを考えれば妥当な代償です。「1000件スキャン」の実行中や、「高インパクトのみ」や「1000件スキャン」の結果ページにいるときは決して行いません。<br><br>空きメモリが 2 GB を下回ると「メモリ」の行が赤くなります。どんなパソコンでも Chrome が苦しくなり始める目安です。そのときは、使っていないアプリを閉じれば通常は十分です。手動で行いたい場合は、「拡張機能をリセット」ボタンでも本拡張機能の保存データと Chrome のキャッシュを消去し、タブを開き直せます。拡張機能のリセットで消去されるサイトデータは、PubMed と NCBI のページのものだけです。他のウェブサイトのデータや、履歴、Cookie、パスワードには影響しません。",
        ref: null
    },
    {
        label: "コピーアイコン（ポップアップ）= この検索の記録",
        description: "ポップアップ上部の引用行の先頭にある小さなコピーアイコンは、現在のタブの PubMed 検索の記録をコピーします：データベース、検索日、実行したとおりの検索式、サイドバーのフィルター、件数、URL。文献検索の報告基準である PRISMA-S に沿っています。MeSH や PubMed の自動用語マッピングは時間とともに変わるため、同じ検索でも後で結果が変わることがあり、日付が重要です。論文やプロトコルで使えるよう、コピーされる文は英語です。",
        ref: null
    }
];

// Korean help panel: same items, same order and refs as helpItems.
// Button and checkbox names that still appear in English on screen are kept
// in English here so they match what the user sees.
export const helpItemsKo = [
    {
        label: "Retracted = PMID와 철회 공지의 PMID(클릭 시 표시)",
        description: "논문이 철회되었는지 보여 줍니다.",
        ref: "https://www.nlm.nih.gov/bsd/policy/errata.html"
    },
    {
        label: "* = 고영향 논문(녹색 배경)",
        description: `점수가 설정한 기준값(기본값 5, 확장 프로그램 설정에서 변경 가능)에 도달한 논문은 고영향 논문(녹색 배경)으로 표시됩니다. 점수는 다음과 같이 계산합니다:

${SCORE_CODE}`,
        ref: null
    },
    {
        label: "Overall Score = 논문 품질을 나타내는 숫자 점수",
        description: "종합 점수는 MEDLINE 등재, 피인용 수, Relative Citation Ratio(RCR), 저널 SJR 순위, 인기 여부, 영향력 있는 인용 등 여러 요소로 계산한 논문의 품질 값입니다. 인용 보고서 맨 위에 표시되며, 논문의 영향력과 중요성을 빠르게 판단하는 데 도움이 됩니다.",
        ref: null
    },
    {
        label: "KO = 인용 바 도움말 텍스트의 언어",
        description: "? 뒤의 작은 갈색 태그는 인용 바에 마우스를 올렸을 때 나오는 텍스트의 언어를 보여 줍니다(EN = English, ES = Español, ZH = 中文, JA = 日本語, KO = 한국어, FR = Français, HI = हिन्दी, AR = العربية, BN = বাংলা, PT = Português). 클릭해서 고르면 데이터를 다시 불러오지 않고 바로 인용 바가 다시 그려지며, 선택은 기억됩니다. 고르기 전까지는 Chrome의 언어를 따릅니다. 이 도움말 패널과 확장 프로그램 팝업('-인용 바: 켜짐-' 왼쪽의 언어 버튼)도 같은 선택을 따릅니다. 영어가 아닌 언어를 고르면 컴퓨터에서 실행되는 Chrome 내장 번역기로 검색 결과의 제목과 스니펫도 번역합니다(Chrome 138 이상. 처음에는 태그를 한 번 클릭하면 Chrome이 해당 언어를 내려받습니다). 결과는 페이지 맨 위부터 25개씩 번역되며 진행 상황을 보여 주는 상태 상자가 표시되고, 'Show more'로 추가된 결과는 나타나는 대로 번역됩니다. 번역된 제목이나 스니펫에 마우스를 올리면 영어 원문을 볼 수 있습니다. 인용 바 자체의 텍스트는 항상 영어로 유지됩니다.",
        ref: null
    },
    {
        label: "다른 언어 = 자신의 언어로 PubMed 사용하기",
        description: `PubMed의 페이지와 검색은 영어로 되어 있습니다. 자신의 언어로 읽는 방법은 두 가지이며, 인용 바는 두 방법 모두와 함께 작동합니다:

<ul>
<li><strong>인용 바의 언어 태그</strong>(위의 KO): 인용 바에 마우스를 올렸을 때 나오는 텍스트, 이 도움말, 확장 프로그램 팝업, 검색 결과의 제목과 스니펫을 번역합니다. 번역은 컴퓨터에서 Chrome이 하며, 아무것도 외부로 보내지 않습니다.</li>
<li><strong>Chrome 자체의 페이지 번역</strong>(마우스 오른쪽 버튼 클릭 → 번역, 또는 주소창의 번역 아이콘. Edge에도 같은 기능이 있습니다): PubMed 페이지 전체를 브라우저가 제공하는 어떤 언어로든 번역합니다. 인용 바의 텍스트는 한 줄에 들어가도록 영어로 유지되고, MeSH 용어와 키워드는 PubMed가 색인한 그대로 유지되며, 초록 창에는 번역 아래에 영어 원문이 표시됩니다. 브라우저가 페이지를 번역하는 동안에는 인용 바 자체의 검색 결과 번역이 비켜서므로 같은 내용이 두 번 번역되지 않습니다.</li>
</ul>

내보내기, Google Scholar 링크, 인용 보고서는 페이지를 어떤 방식으로 번역하든 항상 PubMed의 영어 제목을 사용합니다. PubMed 검색은 영어만 이해하므로 영어 용어로 검색하세요. PubMed의 Google 번역 웹사이트 버전(주소가 translate.goog로 끝나는 것)은 지원되지 않습니다. 인용 바는 pubmed.ncbi.nlm.nih.gov에서만 실행되므로 대신 브라우저 자체 번역을 사용하세요.`,
        ref: null
    },
    {
        label: "doi = DOI Lookup에서 논문 열기",
        description: "논문의 DOI를 DOI Lookup(doilookup.com)에서 엽니다. 철회, 인용, 저널 지표, 오픈 액세스를 십여 개 출처에서 확인하는 무료 웹사이트입니다. DOI를 최대 15개까지 모아 함께 볼 수 있습니다. DOI가 없는 논문은 링크가 회색으로 표시됩니다.",
        ref: "https://doilookup.com/"
    },
    {
        label: "MeSH+ = 논문의 MeSH 용어와 키워드",
        description: "두 가지 목록을 보여 줍니다. MeSH(Medical Subject Headings)는 NLM의 통제된 주제어로, MEDLINE 레코드(인용 바에 m으로 표시)에 부여됩니다. 다른 레코드에는 'No MeSH data'가 표시됩니다. 키워드는 논문 자체의 용어로, 보통 저자가 제공합니다(Author keywords). NLM 같은 색인 기관이 가끔 추가한 키워드는 별도 제목 아래에 따로 표시됩니다. 키워드는 통제 어휘가 아니지만 MeSH에 아직 없는 새로운 개념을 나타내는 경우가 많고, PubMed에서 [ot] 태그로 검색할 수 있습니다. MeSH 용어와 키워드는 기계 번역되지 않습니다. 브라우저가 페이지를 번역하는 중에도 PubMed가 색인한 그대로 유지되므로 PubMed 검색에 바로 복사해 넣을 수 있습니다.",
        ref: "https://www.nlm.nih.gov/mesh/meshhome.html"
    },
    {
        label: "n = 새 논문, 2년 미만",
        description: "PubMed의 생성일 [crdt], 즉 논문이 처음 시스템에 등록된 날을 기준으로 합니다. 출판일은 가끔 바뀌지만 이 날짜는 바뀌지 않습니다.",
        ref: null
    },
    {
        label: "t = PubMed Trending 기준 인기 논문",
        description: "PubMed 상위 1,000편을 기준으로 합니다. 실제 로직은 공개되지 않지만(NIH 정책), '새로우면서 조회 수가 많은 논문'으로 생각하면 거의 맞습니다.",
        ref: "https://pubmed.ncbi.nlm.nih.gov/trending/"
    },
    {
        label: "m = PubMed 기준 Medline 등재",
        description: "논문이 Medline에 등재되었음을 나타냅니다.",
        ref: "https://www.nlm.nih.gov/medline/medline_overview.html"
    },
    {
        label: "p = 프리프린트",
        description: "논문이 프리프린트(아직 동료 심사 전)임을 나타냅니다. 프리프린트는 연구자가 정식 동료 심사 전에 결과를 빠르게 공유할 수 있게 해 줍니다. 연구를 일찍 접할 수 있지만, 엄격한 동료 심사를 거치지 않았으므로 신중하게 해석해야 합니다.",
        ref: "https://pmc.ncbi.nlm.nih.gov/about/nihpreprints/"
    },
    {
        label: "e = 정오표, E = 우려 표명",
        description: "논문에는 업데이트나 정정이 있을 수 있으며, 이는 철회가 아닙니다. 약 1%의 논문에 정정이 있습니다. 클릭하면 원래 논문의 PMID와 정정의 PMID를 함께 보여 줍니다. 같은 자리의 굵은 E는 학술지가 우려 표명(expression of concern)을 게재했음을 뜻합니다. 이는 논문에 대한 공식 경고이며 철회까지는 아닙니다. 둘 다 있는 경우 E를 표시하고 호버 텍스트에 정정도 있음을 알립니다. 클릭하면 원 논문, 우려 표명 공지, 정정을 함께 보여 줍니다. 우려 표명 공지 자체에도 E가 표시됩니다. Report와 'Excel' 내보내기에는 두 가지가 따로 표시됩니다.",
        ref: "https://www.nlm.nih.gov/bsd/policy/errata.html"
    },
    {
        label: "Cited = iCite(NIH) 또는 Europe PMC의 피인용 수",
        description: "피인용 수는 PubMed를 운영하는 정부 기관이기도 한 NIH가 제공하는 iCite에서 가져옵니다. PubMed 자체를 포함해 피인용 수의 출처는 여러 가지지만, 전반적으로 iCite가 가장 적합하다고 봅니다. iCite가 중단되거나 느린 경우에는, EMBL-EBI가 연구 지원 기관들과 함께 운영하는 오래된 문헌 데이터베이스인 Europe PMC에서 피인용 수를 가져옵니다.",
        ref: "https://icite.od.nih.gov/"
    },
    {
        label: "차트 아이콘(Cited 뒤) = 월별 피인용 수, 최근 12개월(iCite)",
        description: "논문에 월별 데이터가 있으면 파란색입니다. 클릭하면 최근 12개월 동안의 iCite 피인용 차트가 열립니다. 첫 번째 막대는 시작 시점의 피인용 수이고, 이후 각 달은 그 전까지의 합계 위에 해당 월 증가분을 쌓으며 증가 수를 막대 위에 표시합니다. 빨간 점선 상자는 iCite가 수치를 낮춘 달(수정)을 나타냅니다. 막대에 마우스를 올리면 숫자가 표시됩니다.\n\n회색은 해당 논문에 월별 데이터가 없다는 뜻입니다. 차트는 최근 36개월 안에 PubMed에 추가되었고 최근 12개월 피인용 증가가 상위 40,000편에 드는 논문만 포함하므로, 피인용이 더 많더라도 오래전에 자리 잡은 논문은 들어 있지 않습니다. 데이터는 NIH iCite의 월간 스냅숏에서 가져오며 한 달에 한 번 갱신됩니다. 전체 목록은 PubMed iCite Citation Gains 보고서에 있습니다.",
        ref: "https://tomlaheyh.github.io/citation-bar/icite/icite.html"
    },
    {
        label: "RCR = iCite의 Relative Citation Ratio",
        description: "Relative Citation Ratio(RCR)는 iCite의 지표로, '각 논문의 연간 피인용 수를 같은 분야·같은 해의 NIH 지원 논문이 받는 연간 피인용 수로 표준화한 값'으로 정의됩니다. 인용에 기반한 과학적 영향력 지표입니다. iCite를 사용할 수 없으면 RCR은 다른 출처에는 없는 iCite 고유 지표이므로 '-'로 표시됩니다. 공간을 아끼기 위해 RCR이 99를 넘으면 바에는 반올림한 정수로 표시합니다(123.4는 123). Report와 내보내기에는 원래 값이 그대로 들어갑니다.",
        ref: "https://support.icite.nih.gov/hc/en-us/articles/9062490125083-Metrics"
    },
    {
        label: "IC = Semantic Scholar의 영향력 있는 인용",
        description: "Semantic Scholar는 인용된 논문이 인용한 논문에 큰 영향을 준 인용을 찾아냅니다. 영향력 있는 인용은 인용 횟수와 각 인용의 앞뒤 문맥 등을 분석하는 머신러닝 모델로 판단합니다. 찾지 못하면 '-'로 표시합니다.",
        ref: "https://www.semanticscholar.org/faq#influential-citations"
    },
    {
        label: "Alt = Altmetric 점수",
        description: "Altmetric 관심도 점수는 소셜 미디어, 뉴스, 정책 문서 등에서 연구 결과가 얼마나 주목받았는지 보여 주는 지표입니다. 자동 알고리즘으로 산출되며 관심을 가중치로 센 값입니다. 링크는 해당 논문의 Altmetric 페이지로 바로 연결됩니다.",
        ref: "https://help.altmetric.com/en/articles/9800513"
    },
    {
        label: "s = PubMed의 유사 논문",
        description: "PubMed의 유사 논문 목록입니다. PubMed 논문 페이지 오른쪽 사이드바의 'Similar Articles'를 클릭해도 볼 수 있습니다.",
        ref: "https://www.ncbi.nlm.nih.gov/guide/howto/find-articles-similar/"
    },
    {
        label: "c = 이 논문을 인용한 PubMed 논문",
        description: "이 논문을 인용한 논문의 PubMed 목록입니다. 사용하는 시스템과 방법이 달라 iCite와 약간 차이가 납니다. NIH는 앞으로 iCite에 집중하지만, PubMed도 인용 논문을 쉽게 보는 방법으로 계속 제공합니다.",
        ref: "https://pubmed.ncbi.nlm.nih.gov/help/#cited-by"
    },
    {
        label: "Gsch = DOI로 Google Scholar 열기",
        description: "Google Scholar는 논문을 찾기에 좋은 자료원이며, 자체 피인용 수도 있습니다(다소 높게 나올 수 있음). Google Scholar에서 논문을 찾는 가장 좋은 방법은 DOI(Digital Object Identifier)입니다. DOI는 논문을 식별하고 영구적인 웹 주소를 부여하는 고유한 문자열입니다. PubMed 논문의 DOI(97%에 있음)를 사용해 Google Scholar로 바로 연결합니다.",
        ref: "https://scholar.google.com/intl/en/scholar/about.html"
    },
    {
        label: "Con = Connections 인용 그래프(doilookup.com)",
        description: "Connections는 OpenAlex 데이터로 만든 논문의 대화형 인용 그래프를 doilookup.com에서 엽니다. 논문이 인용한 참고문헌(Inside), 논문을 인용한 논문(Outside), 둘을 합친 보기(Mix)의 세 가지 보기가 있으며, 버블은 저널 품질에 따라 색이 다르고 무료 전문이 있으면 표시됩니다. 논문을 클릭하면 제목, 저널, 연도, 피인용 수, 초록을 볼 수 있습니다. 아무 논문이나 중심으로 다시 보거나, 여러 단계로 확장해 주변 전체에서 기초가 되는, 가장 많이 함께 인용된 문헌을 찾을 수 있습니다.",
        ref: "https://doilookup.com/"
    },
    {
        label: "Abstract = 초록(클릭해서 보기)",
        description: "초록은 논문에 대한 짧은 설명으로, 최근 저널 논문의 약 95%에 있습니다. 보통은 논문을 열어야 읽을 수 있지만, 여기서는 검색 결과를 벗어나지 않고 빠르게 초록을 볼 수 있습니다. 논문에 쉬운 말 요약이 있으면 초록 아래(초록이 없으면 그 자리)에 표시합니다. PubMed에 다른 언어의 초록도 있으면 해당 언어를 나열한 안내와 논문 링크를 보여 주며, 논문 페이지의 초록 위에서 언어를 고를 수 있습니다. 초록 위의 'Translate' 줄은 Chrome 내장 번역기로 제목, 초록, 쉬운 말 요약을 번역합니다. 인용 바의 언어는 한 번 클릭하면 되고, 다른 언어는 언어 코드를 입력하면 됩니다. 인용 바의 언어가 영어가 아니면 초록이 이미 번역된 상태로 열립니다. 비교할 수 있도록 영어 원문이 아래에 표시되며, 'Show original'을 누르면 원문으로 돌아갑니다. 브라우저가 이미 페이지 전체를 번역하고 있으면 초록은 브라우저의 번역을 따르고, 그 아래에 영어 원문이 표시됩니다.\n\n전문: 초록 아래 구분선 다음에, 논문 전문을 여기서 보여 줄 수 있는지 알려 주는 한 줄이 있고, 보여 줄 수 있으면 그 아래에 전문이 이어집니다. 전문은 자동으로 불러옵니다. 오픈 액세스 논문은 Europe PMC에서 1~2초 만에 가져오고, PubMed Central(PMC)이 텍스트 마이닝용으로 공개하는 그 밖의 무료 논문은 PMC에서 직접 가져오므로 몇 초 걸릴 수 있습니다. 전문을 보여 줄 수 없을 때(출판사 사이트에서만 무료이거나, PMC에서는 무료지만 오픈 액세스가 아닌 경우)에는 읽을 수 있는 곳으로 가는 링크를 보여 줍니다. 표는 일반 텍스트 줄로, 그림은 캡션으로 표시하며 참고문헌은 생략합니다. 논문의 출판 유형(예: Randomized Controlled Trial, Review, Case Reports)을 제목 아래에 표시합니다.\n\n참고: 초록은 Abstract를 클릭할 때만 가져오므로 'Excel'과 '데이터' 내보내기에 포함되지 않습니다.",
        ref: "https://pubmed.ncbi.nlm.nih.gov/18830537/"
    },
    {
        label: "link = 전문 링크",
        description: "PubMed는 초록과 메타데이터를 제공하지만 논문 전문은 제공하지 않습니다. 실제 논문으로 연결되는 링크가 있습니다(보통 논문 페이지 오른쪽 위). 유료 구독이 필요한 논문도 있지만, 많은 대학 도서관이 구독하고 있으므로 도서관 시스템에 로그인되어 있으면 유료 논문도 볼 수 있습니다. 무료 버전(예: PMC)이 있으면 그 링크를, 없으면 출판사 페이지 링크를 제공합니다. 링크는 무료일 때 초록색이 됩니다. 먼저 PMC, 다음으로 OpenAlex에서 찾은 합법적인 무료 사본(출판사의 오픈 액세스 페이지 또는 리포지토리 사본), 그다음 PubMed가 직접 무료로 표시한 논문 순입니다. 프리프린트는 해당 논문의 무료 사본으로 치지 않습니다. Report에는 무료 사본의 종류가 표시됩니다.",
        ref: "https://www.ncbi.nlm.nih.gov/guide/howto/obtain-full-text/"
    },
    {
        label: "✓ = 내보내기 목록에 추가(추가되면 녹색)",
        description: `두 번째 줄 맨 앞의 체크로 논문을 내보내기 목록에 추가합니다. 회색은 추가 안 됨, 녹색은 추가됨입니다. 다시 클릭하면 제거됩니다.

논문을 추가하면 PubMed에서 전체 레코드(모든 저자, 권, 호, 쪽, 초록, MeSH 용어)를 가져오므로, 그동안 체크가 잠시 호박색으로 바뀌며 깜박입니다. 가져오기에 실패하면 내용 없이 녹색이 되는 대신 회색으로 남아 이유를 알려 줍니다.

<strong>선택이 유지됩니다</strong>
<ul>
<li>페이지를 넘기거나 새로 검색해도 논문이 체크된 채로 남으므로, 여러 검색에서 모은 뒤 한꺼번에 내보낼 수 있습니다</li>
<li>제거한 논문을 다시 추가하면 즉시 됩니다. 레코드가 보관되어 있어 PubMed에 두 번 요청하지 않습니다</li>
<li>인용 바를 끄면 목록이 비워집니다</li>
</ul>

요청은 1초 간격으로 보내므로, 한 페이지에서 빠르게 연달아 체크해도 대기열에 들어가 NCBI의 요청 제한에 걸리지 않습니다. 한 번에 하나씩 클릭하면 기다릴 필요가 없습니다.`,
        ref: null
    },
    {
        label: "체크리스트 아이콘 = 내보내기 목록 열기",
        description: `체크 옆의 체크리스트 아이콘으로 내보내기 목록을 엽니다. 아무것도 선택하지 않았으면 회색이고, 논문을 추가하면 개수와 함께 파란색이 되며 그 개수는 페이지의 모든 인용 바에서 같습니다.

목록에는 각 논문의 제목, 저널, 연도, PMID와 제거용 ✕가 표시됩니다. 이전 페이지에서 추가한 논문은 세부 정보가 화면에 없으므로 PMID로 표시됩니다.

<strong>네 가지 작업</strong>
<ul>
<li><strong>Clear all:</strong> 목록을 비웁니다</li>
<li><strong>Open in new tab:</strong> 선택한 논문을 PubMed 검색으로 새 탭에 보여 줍니다. 작업 중이던 결과의 위치는 그대로 유지됩니다</li>
<li><strong>Download .ris:</strong> RIS 형식 - EndNote, Mendeley, RefWorks, Papers, Zotero</li>
<li><strong>Download .nbib:</strong> MEDLINE 형식 - PubMed의 'Send to → Citation manager'가 만드는 것과 같은 파일, Zotero와 EndNote</li>
</ul>

두 다운로드 모두 초록과 MeSH 용어를 포함한 각 논문의 전체 레코드가 들어 있습니다. 파일 이름에 날짜와 시간이 붙으므로(예: <code>pubmed-citations-2026-09-12-3-04pm.nbib</code>) 하루에 여러 번 내보내도 이전 파일을 덮어쓰지 않습니다.

PubMed는 한 번의 검색에서 최대 200편만 받으므로, 목록이 더 길면 'Open in new tab'은 처음 200편을 보여 주며 목록에 그 사실이 표시됩니다. 다운로드에는 제한이 없습니다.

<strong>PDF와 함께 Zotero로 보내기</strong>
Zotero에는 두 가지가 모두 필요합니다: <strong>Zotero Connector</strong> 브라우저 확장 프로그램과, 컴퓨터에서 열려 있는 <strong>Zotero 데스크톱 앱</strong>입니다.

이 두 가지가 있으면 PubMed에서 목록을 열고 커넥터의 폴더 아이콘을 클릭하세요. <strong>Select All</strong>을 고른 뒤 <strong>OK</strong>를 누르면 모든 논문을 한 번에 저장하고, 이미 가진 저널 접근 권한으로 각 논문의 PDF를 가져오려고 시도합니다. 커넥터는 사용자 자신의 브라우저 세션에서 작동하므로, 다운로드한 파일로는 이렇게 할 수 없습니다.

데스크톱 앱이 열려 있지 않으면 커넥터는 zotero.org 라이브러리에 저장하겠다고 제안합니다. Zotero에 따르면 이는 '일부 페이지'에서만 작동하므로 믿을 만한 대안은 아닙니다.

.nbib와 .ris 다운로드에는 이런 것이 필요 없으며, EndNote, Mendeley, RefWorks에서도 쓸 수 있습니다.

<div class='help-ai-pack'><strong>AI PACK (.ZIP) — 개선 중</strong>
<strong>AI pack (.zip)</strong>은 목록의 논문(최대 40편)을 하나의 zip 파일로 묶어 AI 도구에 바로 넘길 수 있게 합니다. 가능하면 전문(오픈 액세스 논문과 NIH 저자 원고, Europe PMC 또는 PubMed Central 제공)을, 그렇지 않으면 초록을 담고, 인용 바 데이터를 설명하는 README도 함께 넣습니다. 파일의 압축을 풀고 AI가 그 폴더를 읽게 하거나, AI 도구가 zip 파일을 받는다면 zip을 그대로 업로드하세요.

무료 전문이 없는 논문에는 Open 버튼(무료 PMC PDF가 있으면 그 PDF, 없으면 출판사 페이지)이 표시되어, 접근 권한이 있는 PDF를 저장할 수 있습니다.

큰 문서는 AI 도구가 한 번에 읽기에 너무 많을 수 있습니다. 긴 논문(약 100쪽 이상)은 표시되며, AI 도구마다 업로드 한도가 따로 있습니다.
<ul>
<li><strong>Convert PDF:</strong> 저장한 PDF를 브라우저 안에서 텍스트로 변환합니다(아무것도 업로드되지 않습니다). 참고문헌 목록은 별도 파일로, 표가 있는 페이지는 작은 PDF로 남깁니다. 스캔한(이미지뿐인) PDF에는 변환할 텍스트가 없으므로 Add PDF를 사용하세요.</li>
<li><strong>Add PDF:</strong> PDF를 있는 그대로 zip에 넣습니다.</li>
<li><strong>복잡한 레이아웃이나 수식이 있는 경우:</strong> 기술에 익숙한 사용자는 Docling, Marker, MinerU 같은 무료 도구로 PDF를 변환한 뒤, 만들어진 .md 파일을 압축을 푼 폴더에 추가할 수 있습니다.</li>
</ul></div>

<strong>AI TABLE — 새 기능, 실험적</strong>
<strong>AI table</strong>은 Chrome에 내장된 AI로 목록에 있는 각 논문의 제목과 초록을 사용자의 컴퓨터에서 읽고(아무것도 업로드되지 않습니다) 논문마다 한 행을 채웁니다: 연구 설계, 대상 집단, 표본 크기, 중재 또는 노출, 주요 결과. <strong>Copy table</strong>은 Excel이나 Google Sheets에 붙여 넣을 수 있는 탭 구분 텍스트를 복사합니다. 틀릴 수 있습니다. 빈 칸은 초록에 해당 내용이 없다는 뜻이고, 표본 크기는 그 숫자가 초록에 있을 때만 표시되며, 각 행은 논문과 대조해 확인해야 합니다. 처음 사용할 때 Chrome의 AI 모델(수 GB)을 내려받습니다. 버튼은 Chrome 138 이상에서만 나타나며, 모델에는 약 22GB의 여유 디스크 공간과 메모리 4GB 초과 그래픽 카드 또는 16GB RAM이 필요합니다.`,
        ref: null
    },
    {
        label: "Author = 저자 정보",
        description: `제1저자와 마지막 저자를 보여 줍니다(학계 관례상 제1저자는 보통 연구를 주도하고, 마지막 저자는 연구실을 이끕니다. 마지막에 기관이 올라 있으면 마지막 개인 저자를 사용합니다).

<strong>검색 링크</strong>
<ul>
<li><strong>PubMed:</strong> ORCID(널리 쓰이는 저자 ID, 참고: <a href="https://orcid.org/" target="_blank">https://orcid.org/</a>)가 있으면 사용하고, 없으면 성과 이름 첫 글자를 사용합니다</li>
<li><strong>ORCID 프로필:</strong> 고유한 연구자 ID로 자세한 저자 정보를 제공하며, 이름 검색보다 정확합니다(모든 논문에 ORCID가 있는 것은 아닙니다)</li>
</ul>

<em>참고: 이름 검색에는 이름이 비슷한 다른 연구자가 포함될 수 있습니다. ORCID는 정확하게 식별합니다.</em>

<strong>지표(OpenAlex 제공, ORCID 필요)</strong>
<ul>
<li><strong>h-지수:</strong> 논문 h편이 각각 h회 이상 인용되었을 때의 h. 예: 논문 12편이 각각 12회 이상 인용 = h-지수 12(참고: <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC10771139/" target="_blank">https://pmc.ncbi.nlm.nih.gov/articles/PMC10771139/</a>)</li>
<li><strong>i10-지수:</strong> 10회 이상 인용된 논문 수</li>
<li><strong>2년 인용률:</strong> 2년간 논문 1편당 평균 피인용 수</li>
</ul>

<em>참고: 출처(Google Scholar, Scopus, Web of Science)마다 인용 데이터베이스가 달라 이 지표를 조금씩 다르게 계산합니다. 참고: <a href="https://en.wikipedia.org/wiki/Author-level_metrics" target="_blank">https://en.wikipedia.org/wiki/Author-level_metrics</a></em>

<strong>소속</strong>
논문에 적힌 소속 기관을 보여 줍니다.

참고: 제1저자와 마지막 저자의 ORCID, h-index, i10-index는 모든 논문에 대해 (OpenAlex에서) 가져오며 'Excel'과 '데이터' 내보내기에 포함됩니다. 소속 기관은 Author를 클릭할 때만 가져오므로 내보내기에 포함되지 않습니다.

논문 수, 피인용, 철회(OpenAlex, ORCID 필요): works는 저자의 OpenAlex 프로필에 있는 논문 수이고 citations는 그 논문들의 총 피인용 수입니다. 철회 논문은 제1저자와 마지막 저자에 대해 확인합니다. 숫자는 OpenAlex에 있는 해당 저자의 다른 철회 논문 수이며 이 논문은 포함하지 않습니다. 한 명이라도 1편 이상이면 바의 Author에 빨간 테두리가 표시됩니다. Author 패널에서 1편 이상의 건수는 OpenAlex의 해당 저자 철회 논문 목록으로 연결됩니다(목록에 이 논문이 포함될 수 있으며, 철회 공지는 세지 않음). "–"는 확인하지 못했다는 뜻이며(ORCID 없음, 이름이 OpenAlex와 불일치, OpenAlex 사용 불가, 결과가 너무 많아 셀 수 없음) 0이 아닙니다. 이 값들과 2년 피인용률은 Excel 내보내기에도 포함됩니다(Author Retractions는 두 명 중 더 큰 값이며, 확인하지 못한 저자가 있고 아무도 철회 논문이 없으면 빈칸).`,
        ref: null
    },
    {
        label: "J = 저널 정보",
        description: "J를 클릭하면 저널 정보를 볼 수 있습니다: 정식 이름, 인쇄판·전자판 ISSN, NLM ID(NLM Catalog 링크), SJR, Top-J. 확장 프로그램의 Journal Ranking 데이터에서: 저널 순위와 올해 PubMed에 추가된 논문 수, 작년 같은 기간 대비 증감, 올해의 Medline 비율·무료 전문 비율·ORCID 비율, 철회 건수: 출판 연도와 관계없이 올해와 작년 같은 기간에 PubMed가 철회로 표시한 이 저널의 논문 수(프리프린트 서버는 철회된 프리프린트). 같은 내용이 Report에도 있습니다. OpenAlex에서 저널의 국가, 출판사, 오픈 액세스 및 DOAJ 여부, APC, h-index, 2년 평균 피인용, 창간 연도를 추가합니다. J나 Report를 열 때 저널당 한 번만 조회합니다. 패널은 논문의 제목과 출판 유형으로 시작하며, SJR 줄에는 저널의 최고 분위가 포함됩니다.",
        ref: "https://tomlaheyh.github.io/citation-bar/journal-ranking/journal-ranking.html"
    },
    {
        label: "Top-J = 주요 저널",
        description: "제가 직접 고른 주요 의학 저널 목록으로, 같은 출판 그룹의 관련 저널(예: JAMA 계열)도 포함합니다. ISSN으로 대조하며, 일치하면 'Yes'로 표시합니다. 목록은 일부러 작고 엄선했습니다. 현재 목록: Annals of Internal Medicine, British Medical Journal (BMJ), European Heart Journal, Journal of the American College of Cardiology, JAMA, Lancet, Nature, New England Journal of Medicine. 제안은 환영하지만, 최소한의 목록으로 만들었습니다.",
        ref: null
    },
    {
        label: "SJR = SCImago Journal Rank",
        description: "널리 인정받는 무료 저널 순위입니다. SCImago Journal Rank(SJR)는 Google의 PageRank™와 비슷한 알고리즘으로 저널의 가시성을 측정합니다. SCImago는 스페인의 여러 대학과 CSIC(스페인 국립연구위원회)에 소속된 연구 그룹으로, 정보 분석과 시각화를 전문으로 합니다. 새 순위는 1년에 한 번 발표됩니다(보통 4월). SCImago가 제공하는 경우 저널의 최고 분위(Q1~Q4)를 호버 텍스트, J 패널, Report, 'Excel' 내보내기에 표시합니다. SCImago는 저널을 각 주제 분야 안에서 순위를 매기며, 이 값은 그중 가장 좋은 분위입니다. Q1은 적어도 한 분야에서 상위 25%라는 뜻입니다.",
        ref: "https://www.scimagojr.com/aboutus.php"
    },
    {
        label: "YTD = 저널의 연초 대비 논문 수",
        description: "이 저널(ISSN 기준)이 확장 프로그램 순위 데이터가 다루는 기간에 게재한 논문 수입니다. PubMed 전체 데이터를 (보통 매월) 받아 그해의 전체 논문 수, 무료 논문 수, Medline 등재 논문 수로 저널 순위를 매깁니다. 이 순위 데이터는 확장 프로그램에 포함되어 출시될 때마다 갱신되므로, 수치는 순위 파일에 적힌 기간을 기준으로 합니다. 제가 PubMed를 배울 때 이런 것이 있었다면 큰 도움이 되었을 텐데, 여러분께도 도움이 되길 바랍니다.",
        ref: null
    },
    {
        label: "Medline % = 연초 대비 저널 논문의 Medline 등재 비율",
        description: "같은 기간에 저널(ISSN 기준) 논문 중 Medline에 등재된 비율입니다. 제 순위 데이터에서 가져온 값입니다. 저널의 품질이 아니라 등재 현황을 나타낸다는 점에 유의하세요. 최근 출판된 논문은 아직 등재되지 않았을 수 있어, 자주 게재하는 저널은 최종 등재율보다 낮게 나올 수 있습니다.",
        ref: null
    },
    {
        label: "Free % = 연초 대비 무료 전문이 있는 저널 논문의 비율",
        description: "같은 기간에 저널(ISSN 기준) 논문 중 무료 전문으로 볼 수 있는 비율입니다. YTD 수, Medline %와 같은 순위 데이터에서 가져온 값입니다.",
        ref: null
    },
    {
        label: "Xout = 제외 검색",
        description: `1차 연구가 아닌 것을 제외하는 필터로 PubMed를 다시 검색합니다. 현재 검색이 미리 입력된 대화 상자가 열리며, 합쳐서 PubMed 전체 논문의 약 25%를 차지하는 출판 유형을 제외하는 체크박스가 있습니다:

<ul>
<li><strong>Has Abstract:</strong> 초록이 있는 논문만 포함합니다(권장: 초록이 없는 논문이 동료 심사를 거친 1차 연구인 경우는 드뭅니다)</li>
<li><strong>No Retracted Publications:</strong> 철회된 논문과 그 철회 공지를 제외합니다</li>
<li><strong>No Published Errata:</strong> 정정/정오표 공지를 제외합니다</li>
<li><strong>No Letters:</strong> 편집자에게 보내는 편지를 제외합니다</li>
<li><strong>No Editorials:</strong> 사설을 제외합니다</li>
<li><strong>No Comments:</strong> 논평 기사를 제외합니다</li>
<li><strong>No Systematic Reviews:</strong> 체계적 문헌고찰을 제외합니다</li>
<li><strong>No Meta-Analyses:</strong> 메타분석을 제외합니다</li>
<li><strong>No Reviews:</strong> 리뷰 논문을 제외합니다</li>
</ul>

모든 필터는 기본으로 선택되어 있습니다. 필터를 해제하면 해당 유형도 포함됩니다. 필터를 바꾸면 전체 검색식 미리보기가 즉시 갱신됩니다. 바로 검색(현재 탭에서 열기), 검색식 복사, 취소를 할 수 있습니다. View Expanded는 검색식과 PubMed가 이를 해석한 결과(E-utilities 검색식 변환)를 나란히 보여 주어, 태그가 없는 단어가 자동 용어 매핑으로 어떻게 확장되었는지 볼 수 있습니다.`,
        ref: null
    },
    {
        label: "kS = 핵심 검색",
        description: "문헌이 많거나 빠르게 늘고 있는 주제에 대해 미리 만든 PubMed 검색을 분야별로 묶었습니다. kS를 클릭하면 그룹이 표시되고, 그룹을 가리키거나 클릭하면 그 검색이 표시되며, 검색을 클릭하면 새 탭에서 열립니다. 각 검색은 해당 주제가 논문의 주요 주제(MeSH Major Topic 또는 제목)이고 초록이 있을 것을 요구하며, 철회된 논문과 그 철회 공지, 정정, 서신, 사설, 논평을 제외합니다. 리뷰, 체계적 문헌고찰, 메타분석은 포함됩니다. 전체 검색식은 PubMed 검색창에 표시됩니다. 검색어가 영어이므로 그룹 이름과 검색 이름은 영어로 표시됩니다. 메뉴 아래쪽의 Years 줄은 검색식에 출판일 기준 최근 기간 조건(예: \"last 5 years\"[dp])을 추가합니다. 최근 1년, 5년, 10년 중에서 고를 수 있고 All은 조건을 붙이지 않습니다. 조건이 검색식의 일부이므로 검색식을 복사해도 유지됩니다. 선택은 기억됩니다.",
        ref: null
    },
    {
        label: "pR = PubMed 보고서(주요 개요)",
        description: "PubMed Citation Bar 사이트의 PubMed 보고서 도구 여덟 가지가 있는 메뉴를 엽니다: PubMed Summary Report(PubMed 검색 개요), PubMed Filters Report(필터 분석), PubMed MeSH Counts(MeSH 용어 빈도), PubMed Journal Ranking(저널 순위 데이터), PubMed Drift Report(PubMed 인용 상태 지표의 일별 변화), PubMed ORCID Ranking(매년 가장 많은 PubMed 논문에 있는 ORCID iD), PubMed ROR Ranking(올해 추가된 논문 수에 따른 기관 순위, 저자 소속 기준), PubMed iCite Citation Gains(최근 36개월 안에 추가되었고 최근 12개월 동안 피인용이 가장 많이 늘어난 논문). 각각 새 탭에서 열립니다.",
        ref: "https://tomlaheyh.github.io/citation-bar/"
    },
    {
        label: "/Report = 인용 보고서",
        description: "논문의 주요 지표와 링크를 모두 복사하기 쉬운 형식으로 정리한 보고서입니다. 팝업의 두 버튼으로 결과 페이지 전체를 내보낼 수 있습니다: 'Excel'은 인용 바에 보이는 내용 그대로의 탭 구분 표(논문 1편당 1행, Excel이나 Google Sheets에 바로 붙여 넣기 가능)를, '데이터'는 모든 것(먼저 PMID, 그다음 모든 지표, 확장 프로그램 타임스탬프, 내부 필드)을 내보냅니다. 후자는 확장 프로그램이 사용하는 모든 데이터를 완전히 공개합니다. 사용자 추적은 전혀 없습니다.\n\n참고: 제1저자와 마지막 저자의 ORCID, h-index, i10-index는 모든 논문에 대해 가져오며 'Excel'과 '데이터' 내보내기에 포함됩니다. 그 밖의 일부 데이터는 바의 항목을 클릭할 때만 가져옵니다. 모든 논문에 대해 가져오면 시간이 너무 오래 걸리기 때문입니다. 초록(Abstract), 연구비 정보, 저자 소속 기관이 여기에 해당합니다. 이 데이터는 내보내기에 포함되지 않습니다.",
        ref: null
    },
    {
        label: "메모리 = 시스템 여유 메모리(부족하면 빨간색)",
        description: "확장 프로그램 팝업 아래쪽에 표시됩니다. '뒤로'가 즉시 되도록 Chrome(확장 프로그램이 아님)은 탭의 최근 페이지를 메모리에 보관하며, 검색을 많이 한 탭은 시간이 지날수록 메모리를 더 많이 차지하는 경향이 있습니다. 이는 이 확장 프로그램이 있든 없든 일어나며, 인용 바도 페이지마다 일정한 메모리를 씁니다.<br><br>메모리가 계속 쌓이지 않도록, 인용 바가 여섯 번 실행되면 확장 프로그램이 탭을 같은 페이지로 다시 엽니다. 보던 결과에 그대로 머물며 다시 입력할 것도 없습니다. 잃는 것은 그 탭의 '뒤로' 기록뿐이며, 확보되는 메모리를 생각하면 합리적인 대가입니다. '1,000건 스캔' 도중이나 '고영향만 보기' 또는 '1,000건 스캔' 결과 페이지에 있을 때는 절대 이렇게 하지 않습니다.<br><br>여유 메모리가 2GB 아래로 떨어지면 '메모리' 줄이 빨간색으로 바뀝니다. 어떤 컴퓨터든 Chrome이 버거워지기 시작하는 지점입니다. 그럴 때는 보통 쓰지 않는 앱을 닫는 것으로 충분합니다. 직접 하고 싶다면 '확장 재설정' 버튼으로도 확장 프로그램의 저장 데이터와 Chrome 캐시를 지우고 탭을 다시 열 수 있습니다. 확장 프로그램 재설정은 PubMed와 NCBI 페이지의 사이트 데이터만 지웁니다. 다른 웹사이트의 데이터와 방문 기록, 쿠키, 비밀번호는 건드리지 않습니다.",
        ref: null
    },
    {
        label: "복사 아이콘(팝업) = 이 검색의 기록",
        description: "팝업 맨 위 인용 줄 맨 앞의 작은 복사 아이콘은 현재 탭의 PubMed 검색 기록을 복사합니다: 데이터베이스, 검색 날짜, 실행된 그대로의 검색식, 사이드바 필터, 결과 수, URL. 문헌 검색 보고 표준인 PRISMA-S를 따릅니다. MeSH와 PubMed의 자동 용어 매핑은 시간이 지나며 바뀌므로 같은 검색도 나중에는 결과가 달라질 수 있어 날짜가 중요합니다. 복사되는 글은 논문과 프로토콜에 쓰도록 영어로 되어 있습니다.",
        ref: null
    }
];

export const helpItemsFr = [
    {
        label: "Retracted = PMID et PMID de la rétractation (au clic)",
        description: "Indique si un article a été rétracté de la littérature scientifique.",
        ref: "https://www.nlm.nih.gov/bsd/policy/errata.html"
    },
    {
        label: "* = Article à fort impact (fond vert)",
        description: `Les articles sont signalés comme à fort impact (fond vert) lorsque leur score atteint votre seuil (par défaut : 5, réglable dans les paramètres de l'extension). Le score est calculé comme suit :

${SCORE_CODE}`,
        ref: null
    },
    {
        label: "Overall Score = Score numérique de qualité de l'article",
        description: "Le score global est une valeur calculée qui représente la qualité de l'article à partir de plusieurs facteurs : indexation MEDLINE, nombre de citations, Relative Citation Ratio (RCR), classement SJR de la revue, présence dans les tendances (trending) et citations influentes. Le score est affiché en haut du rapport de citation et permet d'évaluer rapidement l'impact et la portée d'un article.",
        ref: null
    },
    {
        label: "FR = Langue du texte d'infobulle de la barre",
        description: "La petite étiquette marron après le ? indique la langue du texte d'infobulle de la barre (EN = English, ES = Español, ZH = 中文, JA = 日本語, KO = 한국어, FR = Français, HI = हिन्दी, AR = العربية, BN = বাংলা, PT = Português). Cliquez dessus pour choisir ; les barres sont redessinées immédiatement sans recharger les données, et votre choix est mémorisé. Tant que vous n'avez pas choisi, la langue de Chrome est utilisée. Ce panneau d'aide et la fenêtre contextuelle de l'extension (bouton de langue à côté de -Barre de citations activée-) suivent le même choix. Choisir une langue autre que l'anglais traduit aussi les titres et les extraits des résultats de recherche, à l'aide du traducteur intégré de Chrome sur votre ordinateur (Chrome 138 ou version ultérieure ; la première fois, Chrome télécharge la langue après un clic sur l'étiquette). Les résultats sont traduits par lots de 25 à partir du haut de la page, avec un encadré d'état qui indique la progression, et les résultats ajoutés par Show more sont traduits au fur et à mesure de leur affichage. Survolez un titre ou un extrait traduit pour voir l'anglais. Le texte de la barre elle-même reste toujours en anglais.",
        ref: null
    },
    {
        label: "Autres langues = Utiliser PubMed dans votre langue",
        description: `Les pages et la recherche de PubMed sont en anglais. Il existe deux façons de les lire dans votre langue, et la barre de citations fonctionne avec les deux :

<ul>
<li><strong>L'étiquette de langue de la barre</strong> (FR, ci-dessus) : traduit le texte d'infobulle de la barre, cette aide, la fenêtre contextuelle de l'extension, ainsi que les titres et les extraits des résultats de recherche. La traduction est effectuée par Chrome sur votre ordinateur ; rien n'est envoyé ailleurs.</li>
<li><strong>La traduction de page intégrée à Chrome</strong> (clic droit → Traduire, ou l'icône de traduction dans la barre d'adresse ; Edge propose la même chose) : traduit toute la page PubMed dans n'importe quelle langue proposée par le navigateur. Le texte de la barre reste en anglais afin de tenir sur une seule ligne, les termes MeSH et les mots-clés restent exactement tels que PubMed les indexe, et la fenêtre du résumé affiche l'original anglais sous la traduction. Pendant que le navigateur traduit la page, la traduction des résultats propre à la barre s'efface afin que rien ne soit traduit deux fois.</li>
</ul>

Les exports, le lien Google Scholar et le rapport d'article utilisent toujours les titres anglais de PubMed, quelle que soit la façon dont la page est traduite. La recherche PubMed ne comprend que l'anglais : faites donc vos recherches avec des termes anglais. La version de PubMed proposée par le site Google Traduction (une adresse se terminant par translate.goog) n'est pas prise en charge : la barre ne fonctionne que sur pubmed.ncbi.nlm.nih.gov, utilisez donc plutôt la traduction intégrée du navigateur.`,
        ref: null
    },
    {
        label: "doi = Ouvrir l'article dans DOI Lookup",
        description: "Ouvre le DOI de l'article dans DOI Lookup (doilookup.com), un site web gratuit qui vérifie les rétractations, les citations, les indicateurs de la revue et le libre accès auprès d'une douzaine de sources. Plusieurs DOI peuvent être rassemblés (jusqu'à 15) et consultés ensemble. Si l'article n'a pas de DOI, le lien est grisé.",
        ref: "https://doilookup.com/"
    },
    {
        label: "MeSH+ = Termes MeSH et mots-clés de l'article",
        description: "Affiche deux listes. Les MeSH (Medical Subject Headings) sont les descripteurs contrôlés de la NLM, attribués aux notices MEDLINE (signalées par m sur la barre) ; les autres notices affichent 'No MeSH data'. Les mots-clés (keywords) sont les termes propres à l'article, généralement fournis par les auteurs (Author keywords). Les mots-clés parfois ajoutés par un indexeur tel que la NLM sont listés à part sous leur propre intitulé. Les mots-clés ne constituent pas un vocabulaire contrôlé, mais ils désignent souvent des concepts récents que MeSH ne couvre pas encore, et ils peuvent être recherchés dans PubMed avec la balise [ot]. Les termes MeSH et les mots-clés ne sont jamais traduits automatiquement : ils restent exactement tels que PubMed les indexe, même lorsque le navigateur traduit la page, afin de pouvoir être copiés tels quels dans une recherche PubMed.",
        ref: "https://www.nlm.nih.gov/mesh/meshhome.html"
    },
    {
        label: "n = Nouveau, moins de 2 ans",
        description: "Fondé sur la date de création [crdt] dans PubMed, c'est-à-dire la date de première saisie de l'article dans le système. Cette date ne change pas, contrairement aux dates de publication, qui peuvent parfois changer.",
        ref: null
    },
    {
        label: "t = Article en tendance selon PubMed Trending",
        description: "Les tendances reposent sur les 1 000 premiers articles de PubMed. La logique exacte n'est pas publique (conformément à la politique des NIH), mais pensez « récent et très consulté » et vous n'en serez pas loin.",
        ref: "https://pubmed.ncbi.nlm.nih.gov/trending/"
    },
    {
        label: "m = Indexé dans Medline selon PubMed",
        description: "Indique que l'article a été indexé dans Medline.",
        ref: "https://www.nlm.nih.gov/medline/medline_overview.html"
    },
    {
        label: "p = Prépublication (preprint)",
        description: "Indique que l'article est une prépublication (preprint), pas encore évaluée par les pairs. Les prépublications permettent aux chercheurs de partager rapidement leurs résultats avant l'évaluation formelle par les pairs. Si elles donnent un accès précoce à la recherche, elles doivent être interprétées avec prudence, car elles n'ont pas encore fait l'objet d'une évaluation rigoureuse par les pairs.",
        ref: "https://pmc.ncbi.nlm.nih.gov/about/nihpreprints/"
    },
    {
        label: "e = Erratum, E = mise en garde (expression of concern)",
        description: "Les articles peuvent faire l'objet de mises à jour ou de corrections — il ne s'agit pas d'une rétractation. Environ 1 % des articles comportent des corrections. Au clic, le PMID d'origine et le PMID de la correction sont tous deux affichés. Un E en gras au même endroit signifie que la revue a publié une « expression of concern » : une mise en garde formelle sur l’article, sans aller jusqu’à la rétractation. Lorsqu’un article a les deux, c’est le E qui s’affiche et l’infobulle mentionne la correction ; un clic liste l’article original, l’avis de mise en garde et la correction. L’avis lui-même affiche aussi le E. Le Report et l’export « Excel » les indiquent séparément.",
        ref: "https://www.nlm.nih.gov/bsd/policy/errata.html"
    },
    {
        label: "Cited = Nombre de citations selon iCite (NIH) ou Europe PMC",
        description: "Nombre de citations selon iCite, fourni par les NIH — l'agence gouvernementale qui gère également PubMed. Il existe plusieurs sources de comptage des citations, dont PubMed lui-même, mais iCite me semble globalement la plus adaptée. Il arrive qu'iCite soit indisponible ou lent ; dans ce cas, je récupère les nombres de citations depuis Europe PMC, une base de données bibliographique de référence gérée par l'EMBL-EBI avec un groupe d'organismes de financement de la recherche.",
        ref: "https://icite.od.nih.gov/"
    },
    {
        label: "Icône de graphique (après Cited) = Citations par mois, 12 derniers mois (iCite)",
        description: "Bleue quand l’article a des données mensuelles : cliquez pour afficher un graphique de ses citations iCite sur les 12 derniers mois. La première barre est le nombre de citations au départ ; chaque mois suivant empile le gain du mois sur le total précédent, avec le gain inscrit au-dessus de la barre. Un cadre rouge en pointillés signale un mois où iCite a abaissé le nombre (une correction). Survolez une barre pour voir ses chiffres.\n\nGrise signifie qu’il n’y a pas de données mensuelles pour l’article. Les graphiques ne couvrent que les articles ajoutés à PubMed au cours des 36 derniers mois qui figurent parmi les 40 000 ayant gagné le plus de citations sur les 12 derniers mois ; les articles plus anciens n’y figurent donc pas, même s’ils ont davantage de citations. Les données proviennent des instantanés mensuels d’iCite (NIH) et sont mises à jour une fois par mois ; la liste complète est le rapport PubMed iCite Citation Gains.",
        ref: "https://tomlaheyh.github.io/citation-bar/icite/icite.html"
    },
    {
        label: "RCR = Relative Citation Ratio selon iCite",
        description: "Le Relative Citation Ratio (RCR) est un indicateur d'iCite défini comme « le nombre de citations par an de chaque article, normalisé par rapport au nombre de citations par an reçues par les articles financés par les NIH du même domaine et de la même année ». Il s'agit d'une mesure de l'influence scientifique fondée sur les citations. Lorsqu'iCite est indisponible, le RCR affiche « - », car il s'agit d'un indicateur propre à iCite que les autres sources ne proposent pas. Pour gagner de la place, un RCR supérieur à 99 est affiché sur la barre sous forme de nombre entier arrondi (123,4 devient 123). Le Report et les exports conservent la valeur complète.",
        ref: "https://support.icite.nih.gov/hc/en-us/articles/9062490125083-Metrics"
    },
    {
        label: "IC = Citations influentes selon Semantic Scholar",
        description: "Semantic Scholar repère les citations pour lesquelles la publication citée a un impact important sur la publication citante. Les citations influentes sont déterminées par un modèle d'apprentissage automatique qui analyse notamment le nombre de citations et le contexte de chacune. Affiche « - » si aucune donnée n'est trouvée.",
        ref: "https://www.semanticscholar.org/faq#influential-citations"
    },
    {
        label: "Alt = Score Altmetric",
        description: "L'Altmetric Attention Score indique l'attention qu'a reçue un travail de recherche, notamment sur les réseaux sociaux, dans la presse et dans les documents de politique publique. Le score est issu d'un algorithme automatisé et représente un décompte pondéré de cette attention. Le lien mène directement à la page Altmetric de l'article.",
        ref: "https://help.altmetric.com/en/articles/9800513"
    },
    {
        label: "s = Articles similaires dans PubMed",
        description: "Une liste d'articles similaires issue de PubMed. Vous pouvez aussi les consulter en cliquant sur « Similar Articles » dans la colonne de droite de n'importe quelle page d'article PubMed.",
        ref: "https://www.ncbi.nlm.nih.gov/guide/howto/find-articles-similar/"
    },
    {
        label: "c = Articles de PubMed qui le citent",
        description: "Une liste PubMed des articles qui citent cet article. Elle peut différer légèrement d'iCite, car les deux utilisent des systèmes et des méthodes différents. À l'avenir, les NIH privilégient iCite, mais PubMed continue de proposer ce moyen simple de voir les articles citants.",
        ref: "https://pubmed.ncbi.nlm.nih.gov/help/#cited-by"
    },
    {
        label: "Gsch = Google Scholar via le DOI",
        description: "Google Scholar est une excellente ressource de référence pour les articles, avec ses propres nombres de citations (parfois légèrement surestimés). Le meilleur moyen de trouver un article dans Google Scholar est son DOI (Digital Object Identifier) — un identifiant unique qui désigne un article et lui attribue une adresse web permanente. J'utilise le DOI de l'article PubMed (97 % en ont un) pour créer un lien direct vers Google Scholar.",
        ref: "https://scholar.google.com/intl/en/scholar/about.html"
    },
    {
        label: "Con = Graphe de citations Connections (doilookup.com)",
        description: "Connections ouvre un graphe interactif des citations de l'article sur doilookup.com, construit à partir des données d'OpenAlex. Il propose trois vues — les références citées par l'article (Inside), les articles qui le citent (Outside) et une vue combinée (Mix) — avec des bulles colorées selon la qualité de la revue et signalées lorsque le texte intégral est gratuit ; cliquez sur un article pour afficher son titre, sa revue, son année, son nombre de citations et son résumé. Vous pouvez recentrer le graphe sur n'importe quel article ou lancer une expansion sur plusieurs niveaux qui fait ressortir les travaux fondateurs et les plus co-cités de l'ensemble du voisinage.",
        ref: "https://doilookup.com/"
    },
    {
        label: "Abstract = Résumé (cliquez pour l'afficher)",
        description: "Le résumé est une brève description de l'article, présente dans environ 95 % des articles de revues récents. Normalement, il faut ouvrir l'article pour le lire — ceci permet de consulter rapidement le résumé sans quitter les résultats de recherche. Si l'article dispose d'un résumé en langage simple, celui-ci s'affiche sous le résumé (ou à sa place en l'absence de résumé). Si PubMed propose aussi le résumé dans d'autres langues, une note les énumère avec un lien vers l'article, où vous choisissez la langue au-dessus du résumé. Une ligne Translate au-dessus du résumé traduit le titre, le résumé et le résumé en langage simple avec le traducteur intégré de Chrome : un clic pour la langue de la barre, ou saisissez n'importe quel code de langue. Lorsque la langue de la barre n'est pas l'anglais, le résumé s'ouvre déjà traduit. L'original anglais s'affiche en dessous pour comparaison, et Show original permet d'y revenir. Si le navigateur traduit déjà toute la page, le résumé suit la traduction du navigateur, avec l'original anglais en dessous.\n\nTexte intégral : sous le résumé, après une ligne de séparation, une ligne indique si le texte intégral de l'article peut être affiché ici, et le texte intégral suit lorsque c'est possible. Il se charge automatiquement. Les articles en libre accès arrivent d'Europe PMC en une ou deux secondes ; les autres articles en lecture gratuite que PubMed Central (PMC) diffuse pour la fouille de textes viennent directement de PMC et peuvent prendre plusieurs secondes. Lorsque le texte intégral ne peut pas être affiché (gratuit seulement sur le site de l'éditeur, ou gratuit dans PMC mais pas en libre accès), la ligne renvoie vers l'endroit où le lire. Les tableaux apparaissent en lignes de texte simples, les figures sont indiquées par leur légende et les références sont omises. Le type de publication de l’article (par exemple Randomized Controlled Trial, Review ou Case Reports) est affiché sous le titre.\n\nRemarque : les résumés ne sont récupérés que lorsque vous cliquez sur Abstract ; ils ne figurent donc pas dans les exports « Excel » et « Données ».",
        ref: "https://pubmed.ncbi.nlm.nih.gov/18830537/"
    },
    {
        label: "link = Lien vers le texte intégral",
        description: "PubMed fournit le résumé et les métadonnées, mais pas le texte intégral de l'article. Il renvoie vers l'article lui-même (généralement en haut à droite de la page de l'article). Certains articles nécessitent un abonnement payant — de nombreuses bibliothèques universitaires sont abonnées ; si vous êtes connecté à leur système, vous pouvez accéder aux articles payants. Si une version gratuite existe (par exemple dans PMC), je fournis ce lien ; sinon, je renvoie vers la page de l'éditeur. Le lien devient vert lorsqu’il est gratuit : d’abord PMC, puis une copie légale gratuite trouvée via OpenAlex (la page en libre accès de l’éditeur ou une copie dans un dépôt), puis les articles que PubMed signale lui-même comme gratuits. Un preprint n’est pas compté comme copie gratuite de l’article. Le Report précise de quel type de copie gratuite il s’agit.",
        ref: "https://www.ncbi.nlm.nih.gov/guide/howto/obtain-full-text/"
    },
    {
        label: "✓ = Ajouter à la liste d'export (vert une fois ajouté)",
        description: "La coche au début de la deuxième ligne ajoute un article à votre liste d'export. Gris signifie non ajouté, vert signifie ajouté. Cliquez de nouveau pour le retirer.\n\nL'ajout d'un article récupère sa notice complète dans PubMed — tous les auteurs, volume, numéro, pages, résumé et termes MeSH — si bien que la coche devient orange et clignote un instant pendant l'opération. Si la récupération échoue, la coche reste grise et en indique la raison, plutôt que de passer au vert sans rien derrière.\n\n<strong>LES SÉLECTIONS SONT CONSERVÉES</strong>\n<ul>\n<li>Les articles restent cochés lorsque vous parcourez les pages de résultats et lancez de nouvelles recherches ; vous pouvez donc rassembler des articles issus de plusieurs recherches avant d'exporter</li>\n<li>Rajouter un article que vous avez retiré est instantané — sa notice est conservée, PubMed n'est donc pas interrogé deux fois</li>\n<li>La liste est vidée lorsque vous désactivez la barre de citations</li>\n</ul>\n\nLes requêtes sont espacées d'une seconde : cocher rapidement toute une page les met en file d'attente au lieu de dépasser la limite de requêtes du NCBI. Cocher les articles un par un n'entraîne jamais d'attente.",
        ref: null
    },
    {
        label: "Icône de liste = Ouvrir la liste d'export",
        description: "À côté de la coche, l'icône de liste ouvre votre liste d'export. Elle est grise lorsque rien n'est sélectionné, et bleue avec un compteur dès que vous avez ajouté des articles — ce compteur est le même sur toutes les barres de la page.\n\nLa liste affiche chaque article avec son titre, sa revue, son année et son PMID, ainsi qu'un ✕ pour le retirer. Les articles ajoutés depuis une page précédente apparaissent sous leur PMID, car leurs détails ne sont plus à l'écran.\n\n<strong>QUATRE ACTIONS</strong>\n<ul>\n<li><strong>Clear all :</strong> vide la liste</li>\n<li><strong>Open in new tab :</strong> affiche les articles sélectionnés sous forme de recherche PubMed, dans un nouvel onglet afin que vous gardiez votre place dans les résultats que vous étiez en train de parcourir</li>\n<li><strong>Download .ris :</strong> format RIS — EndNote, Mendeley, RefWorks, Papers, Zotero</li>\n<li><strong>Download .nbib :</strong> format MEDLINE — le même fichier que produit la fonction « Send to → Citation manager » de PubMed ; Zotero et EndNote</li>\n</ul>\n\nLes deux téléchargements contiennent la notice complète de chaque article, y compris le résumé et les termes MeSH. Les fichiers sont nommés avec la date et l'heure (par exemple <code>pubmed-citations-2026-09-12-3-04pm.nbib</code>), de sorte qu'exporter plusieurs fois dans la journée n'écrase jamais un fichier précédent.\n\nPubMed accepte au maximum 200 articles dans une recherche ; « Open in new tab » affiche donc les 200 premiers si votre liste est plus longue — la liste le signale le cas échéant. Les téléchargements n'ont pas de limite.\n\n<strong>LES ENVOYER VERS ZOTERO, AVEC LES PDF</strong>\nZotero nécessite deux éléments, qui doivent être tous deux en place : l'extension de navigateur <strong>Zotero Connector</strong> et l'<strong>application de bureau Zotero</strong> ouverte sur votre ordinateur.\n\nUne fois ces éléments en place, ouvrez votre liste dans PubMed et cliquez sur l'icône de dossier du connecteur. Choisissez <strong>Select All</strong>, puis <strong>OK</strong> — tous les articles sont enregistrés en une fois, et le connecteur tente de récupérer chaque PDF grâce aux accès aux revues dont vous disposez déjà. Un fichier téléchargé ne peut pas le faire, car le connecteur fonctionne dans votre propre session de navigateur.\n\nSi l'application de bureau n'est pas ouverte, le connecteur propose plutôt d'enregistrer dans votre bibliothèque zotero.org. Zotero indique que cela fonctionne pour « certaines pages » ; ce n'est donc pas une solution de remplacement fiable.\n\nLes téléchargements .nbib et .ris ne nécessitent rien de tout cela et fonctionnent aussi avec EndNote, Mendeley et RefWorks.\n\n<div class='help-ai-pack'><strong>AI PACK (.ZIP) — EN COURS D'AMÉLIORATION</strong>\n<strong>AI pack (.zip)</strong> réunit les articles de votre liste (jusqu'à 40) dans un seul fichier zip à confier à un outil d'IA. Quand c'est possible, il ajoute le texte intégral (articles en accès ouvert et manuscrits d'auteur des NIH, depuis Europe PMC ou PubMed Central), sinon le résumé, avec un README qui explique les données de la barre de citations. Décompressez le fichier et indiquez le dossier à l'IA, ou envoyez directement le zip si votre outil d'IA accepte les fichiers zip.\n\nLes articles sans texte intégral gratuit ont un bouton Open (le PDF gratuit de PMC s'il existe, sinon la page de l'éditeur) pour enregistrer un PDF auquel vous avez accès.\n\nUn document volumineux peut être trop long pour qu'un outil d'IA le lise en une fois. Les articles longs (plus d'une centaine de pages) sont signalés, et chaque outil d'IA a ses propres limites d'envoi.\n<ul>\n<li><strong>Convert PDF :</strong> transforme un PDF enregistré en texte, dans votre navigateur (rien n'est envoyé). Les listes de références vont dans un fichier à part, et les pages de tableaux sont conservées dans un petit PDF. Un PDF numérisé (images seulement) n'a pas de texte à convertir : utilisez Add PDF pour celui-ci.</li>\n<li><strong>Add PDF :</strong> met le PDF tel quel dans le zip.</li>\n<li><strong>Pour les mises en page complexes ou les formules mathématiques :</strong> les utilisateurs à l'aise avec la technique peuvent convertir les PDF avec des outils gratuits comme Docling, Marker ou MinerU, puis ajouter les fichiers .md au dossier décompressé.</li>\n</ul></div>\n\n<strong>AI TABLE — NOUVEAU, EXPÉRIMENTAL</strong>\n<strong>AI table</strong> lit le titre et le résumé de chaque article de votre liste avec l’IA intégrée à Chrome, sur votre propre ordinateur (rien n’est envoyé), et remplit une ligne par article : type d’étude, population, taille de l’échantillon, intervention ou exposition et résultat principal. <strong>Copy table</strong> copie un texte séparé par des tabulations pour Excel ou Google Sheets. Il peut se tromper : une cellule vide signifie que le résumé ne le dit pas, la taille de l’échantillon n’est affichée que si ce nombre figure dans le résumé, et chaque ligne doit être vérifiée dans l’article. La première utilisation télécharge le modèle d’IA de Chrome (plusieurs Go). Le bouton n’apparaît que dans Chrome 138 ou version ultérieure, et le modèle demande environ 22 Go d’espace disque libre et soit une carte graphique de plus de 4 Go de mémoire, soit 16 Go de RAM.",
        ref: null
    },
    {
        label: "Author = Informations sur les auteurs",
        description: "Affiche le premier et le dernier auteur (selon l'usage académique, le premier auteur conduit généralement le travail et le dernier auteur dirige le laboratoire ; si une organisation figure en dernier, la dernière personne est utilisée).\n\n<strong>LIENS DE RECHERCHE</strong>\n<ul>\n<li><strong>PubMed :</strong> utilise l'ORCID (un identifiant d'auteur très répandu, Réf. : <a href=\"https://orcid.org/\" target=\"_blank\">https://orcid.org/</a>) lorsqu'il est disponible ; sinon, utilise le nom de famille et l'initiale du prénom</li>\n<li><strong>Profil ORCID :</strong> fournit des informations détaillées sur l'auteur avec un identifiant unique de chercheur — plus fiable que les recherches par nom (tous les articles n'indiquent pas d'ORCID)</li>\n</ul>\n\n<em>Remarque : les recherches par nom peuvent inclure d'autres chercheurs portant un nom similaire. L'ORCID permet une identification précise.</em>\n\n<strong>INDICATEURS (issus d'OpenAlex, ORCID requis)</strong>\n<ul>\n<li><strong>Indice h :</strong> le nombre h d'articles ayant chacun au moins h citations. Exemple : 12 articles ayant chacun ≥12 citations = indice h de 12 (Réf. : <a href=\"https://pmc.ncbi.nlm.nih.gov/articles/PMC10771139/\" target=\"_blank\">https://pmc.ncbi.nlm.nih.gov/articles/PMC10771139/</a>)</li>\n<li><strong>Indice i10 :</strong> nombre d'articles ayant ≥10 citations</li>\n<li><strong>Taux de citation sur 2 ans :</strong> nombre moyen de citations par article sur 2 ans</li>\n</ul>\n\n<em>Remarque : les différentes sources (Google Scholar, Scopus, Web of Science) calculent ces indicateurs de manière légèrement différente, car elles s'appuient sur des bases de citations distinctes. Voir Réf. : <a href=\"https://en.wikipedia.org/wiki/Author-level_metrics\" target=\"_blank\">https://en.wikipedia.org/wiki/Author-level_metrics</a></em>\n\n<strong>AFFILIATIONS</strong>\nListe les affiliations institutionnelles mentionnées dans l'article.\n\nRemarque : l'ORCID, l'indice h et l'indice i10 du premier et du dernier auteur sont récupérés pour chaque article (depuis OpenAlex) et figurent dans les exports « Excel » et « Données ». Les affiliations ne sont récupérées que lorsque vous cliquez sur Author ; elles ne figurent donc pas dans les exports.\n\nTRAVAUX, CITATIONS ET RÉTRACTATIONS (OpenAlex, ORCID requis) : works est le nombre de travaux du profil OpenAlex de l’auteur et citations le total des citations qu’ils ont reçues. Les articles rétractés sont vérifiés pour le premier et le dernier auteur : le nombre correspond aux autres articles rétractés de l’auteur dans OpenAlex, sans compter cet article. Si l’un d’eux en a un ou plus, Author est entouré de rouge sur la barre. Dans le panneau Author, un nombre de 1 ou plus renvoie aux articles rétractés de cet auteur dans OpenAlex (la liste peut inclure cet article ; les avis de rétractation ne sont pas comptés). « – » signifie que la vérification n’a pas pu être faite (pas d’ORCID, nom différent dans OpenAlex, OpenAlex indisponible ou trop de résultats pour compter), jamais zéro. Toutes ces données, ainsi que le taux de citation sur 2 ans, figurent aussi dans l’export Excel (Author Retractions est le nombre le plus élevé des deux ; vide si l’un d’eux n’a pas pu être vérifié et qu’aucun n’en a).",
        ref: null
    },
    {
        label: "J = Informations sur la revue",
        description: "Cliquez sur J pour la revue : nom complet, ISSN papier et électronique, NLM ID (lien vers le NLM Catalog), SJR et Top-J. D’après les données Journal Ranking de l’extension : le rang de la revue et ses articles ajoutés à PubMed cette année ; la croissance par rapport aux mêmes mois de l’an dernier ; ses % Medline, % de texte intégral gratuit et % ORCID de l’année ; et ses rétractations : articles de la revue, quelle que soit leur année de publication, marqués comme rétractés par PubMed au cours des mêmes mois cette année et l’an dernier (ou les prépublications retirées, pour les serveurs de prépublications). Les mêmes lignes figurent dans le Report. OpenAlex ajoute le pays de la revue, l’éditeur, le libre accès et la présence dans le DOAJ, l’APC, l’indice h, la moyenne des citations sur 2 ans et la première année ; une seule requête par revue, à l’ouverture de J ou du Report. Le panneau commence par le titre et le type de publication de l’article, et la ligne SJR inclut le meilleur quartile de la revue.",
        ref: "https://tomlaheyh.github.io/citation-bar/journal-ranking/journal-ranking.html"
    },
    {
        label: "Top-J = Grande revue",
        description: "Ma propre liste sélectionnée de grandes revues médicales, y compris les revues associées relevant d'un même éditeur (par exemple, la famille JAMA). La correspondance se fait par ISSN — « Yes » s'affiche si la revue figure dans la liste. La liste est volontairement courte et très sélective. Liste actuelle : Annals of Internal Medicine, British Medical Journal (BMJ), European Heart Journal, Journal of the American College of Cardiology, JAMA, Lancet, Nature, New England Journal of Medicine. Je suis ouvert aux suggestions, mais elle est conçue comme une liste minimale.",
        ref: null
    },
    {
        label: "SJR = SCImago Journal Rank",
        description: "Un classement de revues gratuit et largement reconnu. Le SCImago Journal Rank (SJR) mesure la visibilité des revues à l'aide d'un algorithme semblable au PageRank™ de Google. SCImago est un groupe de recherche rattaché à plusieurs universités espagnoles et au CSIC, spécialisé dans l'analyse et la visualisation de l'information. Les nouveaux classements sont publiés une fois par an (généralement en avril). Lorsque SCImago en fournit un, le meilleur quartile de la revue (Q1 à Q4) apparaît dans l’infobulle, le panneau J, le Report et l’export « Excel ». SCImago classe une revue dans chacun de ses domaines, et celui-ci est le meilleur de ces quartiles : Q1 signifie les 25 % supérieurs dans au moins un domaine.",
        ref: "https://www.scimagojr.com/aboutus.php"
    },
    {
        label: "YTD = Articles de la revue depuis le début de l'année",
        description: "Le nombre d'articles publiés par cette revue (par ISSN) sur la période couverte par les données de classement de l'extension. Je récupère l'ensemble des données PubMed (généralement chaque mois) et je classe les revues par nombre total d'articles, d'articles gratuits et d'articles indexés dans Medline sur l'année. Ces données de classement sont fournies avec l'extension et mises à jour à chaque version ; les chiffres couvrent donc la période indiquée dans le fichier de classement. Quand j'apprenais à utiliser PubMed, un tel outil m'aurait été très utile — j'espère qu'il le sera aussi pour vous.",
        ref: null
    },
    {
        label: "Medline % = Pourcentage d'articles de la revue dans Medline depuis le début de l'année",
        description: "Le pourcentage d'articles d'une revue (par ISSN) indexés dans Medline sur la même période. Ces chiffres proviennent de mes propres données de classement. Notez que cela reflète l'indexation et non la qualité de la revue : les articles publiés récemment peuvent ne pas encore être indexés, si bien qu'une revue qui publie fréquemment peut afficher un pourcentage inférieur à son taux définitif.",
        ref: null
    },
    {
        label: "Free % = Pourcentage d'articles de la revue en texte intégral gratuit depuis le début de l'année",
        description: "Le pourcentage d'articles d'une revue (par ISSN) disponibles en texte intégral gratuit sur la même période. Ces chiffres proviennent des mêmes données de classement que le nombre YTD et le Medline %.",
        ref: null
    },
    {
        label: "Xout = Recherche avec exclusions",
        description: "Relance la recherche PubMed avec des filtres excluant la recherche non primaire. Ouvre une boîte de dialogue reprenant votre recherche actuelle, avec des cases à cocher pour exclure des types de publication qui représentent au total environ 25 % de l'ensemble des articles PubMed :\n\n<ul>\n<li><strong>Has Abstract :</strong> exige que les articles aient un résumé (recommandé — les articles sans résumé sont rarement des travaux de recherche primaire évalués par les pairs)</li>\n<li><strong>No Retracted Publications :</strong> exclut les articles rétractés et leurs avis de rétractation</li>\n<li><strong>No Published Errata :</strong> exclut les avis de correction ou d'erratum</li>\n<li><strong>No Letters :</strong> exclut les lettres à la rédaction</li>\n<li><strong>No Editorials :</strong> exclut les éditoriaux</li>\n<li><strong>No Comments :</strong> exclut les commentaires</li>\n<li><strong>No Systematic Reviews :</strong> exclut les revues systématiques</li>\n<li><strong>No Meta-Analyses :</strong> exclut les méta-analyses</li>\n<li><strong>No Reviews :</strong> exclut les articles de synthèse (revues de la littérature)</li>\n</ul>\n\nTous les filtres sont cochés par défaut. Décochez un filtre pour laisser passer le type correspondant. L'aperçu de la requête complète se met à jour en direct à mesure que vous ajustez les filtres. Vous pouvez lancer la recherche directement (dans l'onglet actuel), copier la requête ou annuler. View Expanded affiche votre recherche à côté de la lecture qu'en fait PubMed (la traduction de requête d'E-utilities), pour voir comment le mappage automatique des termes a étendu les mots sans balise.",
        ref: null
    },
    {
        label: "kS = Recherches clés",
        description: "Recherches PubMed prédéfinies sur des thèmes à fort volume ou en forte croissance, regroupées par domaine. Cliquez sur kS pour afficher les groupes, pointez ou cliquez sur un groupe pour voir ses recherches, puis cliquez sur une recherche pour l'ouvrir dans un nouvel onglet. Chaque recherche exige que le thème soit le sujet principal de l'article (MeSH Major Topic ou titre) et qu'il ait un résumé, et exclut les articles rétractés et leurs avis de rétractation, les errata, les lettres, les éditoriaux et les commentaires. Les revues, revues systématiques et méta-analyses sont conservées. La requête complète s'affiche dans la zone de recherche de PubMed. Les noms des groupes et des recherches sont en anglais, comme les termes de recherche. La ligne Years, en bas du menu, ajoute à la recherche une limite glissante sur la date de publication, par exemple \"last 5 years\"[dp] pour les 1, 5 ou 10 dernières années, ou aucune avec All. Elle fait partie de la requête et reste donc présente quand la requête est copiée. Votre choix est mémorisé.",
        ref: null
    },
    {
        label: "pR = Rapports PubMed (vues d'ensemble clés)",
        description: "Ouvre un menu proposant huit outils de rapports PubMed sur le site PubMed Citation Bar : PubMed Summary Report (vue d'ensemble d'une recherche PubMed), PubMed Filters Report (analyse des filtres), PubMed MeSH Counts (fréquence des termes MeSH), PubMed Journal Ranking (données de classement des revues), PubMed Drift Report (évolution jour après jour des indicateurs de statut des citations PubMed), PubMed ORCID Ranking (les identifiants ORCID présents sur le plus d'articles PubMed chaque année), PubMed ROR Ranking (organismes classés selon les articles ajoutés cette année, d'après les affiliations des auteurs) et PubMed iCite Citation Gains (articles ajoutés au cours des 36 derniers mois ayant gagné le plus de citations sur les 12 derniers mois). Chacun s'ouvre dans un nouvel onglet.",
        ref: "https://tomlaheyh.github.io/citation-bar/"
    },
    {
        label: "/Report = Rapport de citation",
        description: "Un rapport regroupant tous les indicateurs et liens clés d'un article dans un format facile à copier. Deux boutons de la fenêtre contextuelle exportent toute la page de résultats : « Excel » produit un tableau séparé par des tabulations contenant exactement ce qu'affiche la barre — une ligne par article, prêt à coller directement dans Excel ou Google Sheets —, tandis que « Données » exporte tout : d'abord les PMID, puis tous les indicateurs, les horodatages de l'extension et les champs internes. Ce second bouton offre une transparence totale sur toutes les données utilisées par l'extension. Il n'y a aucun suivi des utilisateurs.\n\nRemarque : les ORCID, l'indice h et l'indice i10 du premier et du dernier auteur sont récupérés pour chaque article et figurent dans les exports « Excel » et « Données ». D'autres données ne sont récupérées que lorsque vous cliquez sur un élément de la barre, car les récupérer pour chaque article prendrait trop de temps. Cela comprend les résumés (Abstract), les financements et les affiliations des auteurs. Ces données ne figurent pas dans les exports.",
        ref: null
    },
    {
        label: "Mémoire = Mémoire système libre (devient rouge lorsqu'elle est faible)",
        description: "Affichée en bas de la fenêtre contextuelle de l'extension. Chrome (et non l'extension) conserve en mémoire les pages récentes de chaque onglet afin que le retour arrière soit instantané, et un onglet utilisé pour de nombreuses recherches a tendance à occuper de plus en plus de mémoire. Cela se produit avec ou sans cette extension ; la barre de citations ajoute sa propre part sur chaque page.<br><br>Pour éviter cette accumulation, l'extension rouvre votre onglet sur la même page après six exécutions de la barre de citations. Vous restez sur les résultats que vous consultiez et rien n'est à ressaisir ; vous perdez seulement l'historique de retour arrière de cet onglet, un compromis raisonnable au regard de la mémoire libérée. Cela ne se produit jamais au milieu d'un Analyser 1 000, ni lorsque vous êtes sur une page de résultats Fort impact uniquement ou Analyser 1 000.<br><br>La ligne Mémoire devient rouge lorsque la mémoire libre descend sous 2 Go, seuil à partir duquel Chrome commence à peiner, quelle que soit la machine. Dans ce cas, fermer les applications inutilisées suffit généralement. Le bouton Réinitialiser l'extension efface aussi les données enregistrées par l'extension et le cache de Chrome, puis rouvre l'onglet, si vous préférez le faire manuellement. Reset Extension n’efface les données de site que pour les pages PubMed et NCBI. Les données des autres sites, ainsi que votre historique, vos cookies et vos mots de passe, ne sont pas touchés.",
        ref: null
    },
    {
        label: "Icône copier (fenêtre) = Référence de cette recherche",
        description: "La petite icône copier au début de la ligne de citation en haut de la fenêtre copie une référence de la recherche PubMed de l'onglet actuel : la base de données, la date de recherche, la requête telle qu'exécutée, les filtres de la barre latérale, le nombre de résultats et l'URL. Elle suit PRISMA-S, la norme de compte rendu des recherches bibliographiques. La date compte, car MeSH et le mappage automatique des termes de PubMed évoluent, si bien que la même recherche peut donner d'autres résultats plus tard. Le texte copié est en anglais, pour les articles et les protocoles.",
        ref: null
    }
];

export const helpItemsHi = [
    {
        label: "Retracted = PMID और Retraction PMID (क्लिक करने पर)",
        description: "दिखाता है कि क्या कोई लेख साहित्य से वापस ले लिया गया है (retracted)।",
        ref: "https://www.nlm.nih.gov/bsd/policy/errata.html"
    },
    {
        label: "* = उच्च प्रभाव वाला लेख (हरी पृष्ठभूमि)",
        description: `जब किसी लेख का स्कोर आपकी तय सीमा (threshold) तक पहुँचता है (डिफ़ॉल्ट: 5, एक्सटेंशन की सेटिंग में बदला जा सकता है), तो उसे उच्च प्रभाव वाले लेख (हरी पृष्ठभूमि) के रूप में चिह्नित किया जाता है। स्कोर की गणना इस प्रकार होती है:

${SCORE_CODE}`,
        ref: null
    },
    {
        label: "Overall Score = लेख की गुणवत्ता का संख्यात्मक स्कोर",
        description: "Overall score एक गणना किया गया मान है जो कई कारकों के आधार पर लेख की गुणवत्ता दर्शाता है: MEDLINE इंडेक्सिंग, साइटेशन की संख्या, Relative Citation Ratio (RCR), जर्नल की SJR रैंकिंग, ट्रेंडिंग स्थिति और प्रभावशाली साइटेशन (influential citations)। यह स्कोर साइटेशन रिपोर्ट में सबसे ऊपर दिखाया जाता है और लेख के प्रभाव और महत्व का जल्दी आकलन करने में मदद करता है।",
        ref: null
    },
    {
        label: "HI = बार के होवर टेक्स्ट की भाषा",
        description: "? के बाद वाला छोटा भूरा टैग बताता है कि बार के होवर टेक्स्ट के लिए कौन-सी भाषा उपयोग हो रही है (EN = English, ES = Español, ZH = 中文, JA = 日本語, KO = 한국어, FR = Français, HI = हिन्दी, AR = العربية, BN = বাংলা, PT = Português)। भाषा चुनने के लिए इस पर क्लिक करें; बार तुरंत दोबारा बन जाते हैं, कोई डेटा फिर से लोड नहीं होता, और आपकी पसंद याद रखी जाती है। जब तक आप कोई भाषा नहीं चुनते, यह Chrome की भाषा का पालन करता है। यह सहायता पैनल और एक्सटेंशन का पॉपअप (-साइटेशन बार चालू- के पास वाला भाषा बटन) भी इसी पसंद का पालन करते हैं। अंग्रेज़ी के अलावा कोई और भाषा चुनने पर खोज परिणामों के शीर्षक और स्निपेट भी अनुवादित हो जाते हैं — इसके लिए आपके कंप्यूटर पर Chrome के बिल्ट-इन अनुवादक का उपयोग होता है (Chrome 138 या बाद का संस्करण; पहली बार टैग पर एक क्लिक के बाद Chrome वह भाषा डाउनलोड करता है)। परिणाम पेज के ऊपर से एक बार में 25 करके अनुवादित होते हैं और एक स्टेटस बॉक्स प्रगति दिखाता है; Show more से जुड़े परिणाम दिखते ही अनुवादित हो जाते हैं। अंग्रेज़ी मूल देखने के लिए किसी अनुवादित शीर्षक या स्निपेट पर होवर करें। बार पर लिखा टेक्स्ट हमेशा अंग्रेज़ी में ही रहता है।",
        ref: null
    },
    {
        label: "अन्य भाषाएँ = अपनी भाषा में PubMed का उपयोग",
        description: `PubMed के पेज और खोज अंग्रेज़ी में हैं। इन्हें अपनी भाषा में पढ़ने के दो तरीके हैं, और साइटेशन बार दोनों के साथ काम करता है:

<ul>
<li><strong>बार पर भाषा टैग</strong> (HI, ऊपर): बार का होवर टेक्स्ट, यह सहायता, एक्सटेंशन का पॉपअप, और खोज परिणामों के शीर्षक और स्निपेट अनुवादित करता है। अनुवाद आपके कंप्यूटर पर Chrome करता है; कुछ भी कहीं और नहीं भेजा जाता।</li>
<li><strong>Chrome का अपना पेज अनुवाद</strong> (राइट-क्लिक → अनुवाद करें, या एड्रेस बार में अनुवाद आइकन; Edge में भी यही सुविधा है): पूरे PubMed पेज को ब्राउज़र में उपलब्ध किसी भी भाषा में अनुवादित करता है। बार का टेक्स्ट अंग्रेज़ी में रहता है ताकि वह एक ही पंक्ति में रहे, MeSH शब्द और कीवर्ड ठीक वैसे ही रहते हैं जैसे PubMed उन्हें इंडेक्स करता है, और एब्स्ट्रैक्ट विंडो अनुवाद के नीचे अंग्रेज़ी मूल दिखाती है। जब ब्राउज़र पेज का अनुवाद कर रहा होता है, तब बार का अपना परिणाम-अनुवाद अलग हट जाता है, ताकि कुछ भी दो बार अनुवादित न हो।</li>
</ul>

पेज का अनुवाद चाहे जिस तरीके से हो, एक्सपोर्ट, Google Scholar लिंक और साइटेशन रिपोर्ट हमेशा PubMed के अंग्रेज़ी शीर्षकों का उपयोग करते हैं। PubMed खोज केवल अंग्रेज़ी समझती है, इसलिए अंग्रेज़ी शब्दों से खोजें। PubMed का Google Translate वेबसाइट वाला संस्करण (जिसका पता translate.goog पर ख़त्म होता है) समर्थित नहीं है: बार केवल pubmed.ncbi.nlm.nih.gov पर चलता है, इसलिए इसके बजाय ब्राउज़र का अपना अनुवाद उपयोग करें।`,
        ref: null
    },
    {
        label: "doi = लेख को DOI Lookup में खोलें",
        description: "लेख के DOI को DOI Lookup (doilookup.com) में खोलता है — यह एक मुफ़्त वेबसाइट है जो दर्जन भर स्रोतों से retraction, साइटेशन, जर्नल मेट्रिक्स और ओपन एक्सेस की जाँच करती है। कई DOI (15 तक) इकट्ठा करके एक साथ देखे जा सकते हैं। यदि लेख का कोई DOI नहीं है, तो लिंक धूसर (ग्रे) दिखता है।",
        ref: "https://doilookup.com/"
    },
    {
        label: "MeSH+ = लेख के MeSH शब्द और कीवर्ड",
        description: "दो सूचियाँ दिखाता है। MeSH (Medical Subject Headings) NLM के नियंत्रित विषय-टैग हैं, जो MEDLINE रिकॉर्ड को दिए जाते हैं (बार पर m से चिह्नित); अन्य रिकॉर्ड में 'No MeSH data' दिखता है। कीवर्ड लेख के अपने शब्द होते हैं, जो आमतौर पर लेखक देते हैं (Author keywords)। NLM जैसे किसी इंडेक्सर द्वारा कभी-कभी जोड़े गए कीवर्ड अपने अलग शीर्षक के नीचे सूचीबद्ध होते हैं। कीवर्ड नियंत्रित शब्दावली नहीं हैं, लेकिन वे अक्सर ऐसी नई अवधारणाओं के नाम बताते हैं जो अभी MeSH में नहीं हैं, और इन्हें PubMed में [ot] टैग से खोजा जा सकता है। MeSH शब्दों और कीवर्ड का कभी मशीनी अनुवाद नहीं किया जाता: वे ठीक वैसे ही रहते हैं जैसे PubMed उन्हें इंडेक्स करता है, तब भी जब ब्राउज़र पेज का अनुवाद कर रहा हो, ताकि उन्हें सीधे PubMed खोज में कॉपी किया जा सके।",
        ref: "https://www.nlm.nih.gov/mesh/meshhome.html"
    },
    {
        label: "n = नया, 2 वर्ष से कम पुराना",
        description: "PubMed की create date [crdt] पर आधारित, यानी जब लेख पहली बार सिस्टम में दर्ज किया गया था। यह तारीख नहीं बदलती, जबकि प्रकाशन की तारीखें कभी-कभी बदल सकती हैं।",
        ref: null
    },
    {
        label: "t = PubMed Trending के आधार पर ट्रेंडिंग लेख",
        description: "ट्रेंडिंग PubMed के शीर्ष 1,000 लेखों पर आधारित है। इसका सटीक तर्क सार्वजनिक नहीं है (NIH नीति के अनुसार), लेकिन \"नया और बहुत ज़्यादा देखा गया\" मानकर चलें तो आप काफ़ी हद तक सही होंगे।",
        ref: "https://pubmed.ncbi.nlm.nih.gov/trending/"
    },
    {
        label: "m = PubMed के अनुसार Medline में इंडेक्स",
        description: "बताता है कि लेख Medline में इंडेक्स किया गया है।",
        ref: "https://www.nlm.nih.gov/medline/medline_overview.html"
    },
    {
        label: "p = प्रीप्रिंट",
        description: "बताता है कि लेख एक प्रीप्रिंट है (अभी peer review नहीं हुआ)। प्रीप्रिंट शोधकर्ताओं को औपचारिक peer review से पहले ही अपने निष्कर्ष जल्दी साझा करने देते हैं। हालाँकि ये शोध तक जल्दी पहुँच देते हैं, फिर भी इन्हें सावधानी से समझना चाहिए क्योंकि ये कठोर peer review प्रक्रिया से नहीं गुज़रे हैं।",
        ref: "https://pmc.ncbi.nlm.nih.gov/about/nihpreprints/"
    },
    {
        label: "e = erratum (सुधार), E = चिंता की अभिव्यक्ति",
        description: "लेखों में अपडेट या सुधार हो सकते हैं — यह retraction नहीं है। लगभग 1% लेखों में सुधार होते हैं। क्लिक करने पर मूल PMID और सुधार (correction) PMID दोनों दिखते हैं। उसी जगह मोटा E बताता है कि जर्नल ने expression of concern (चिंता की अभिव्यक्ति) प्रकाशित की है: यह लेख के बारे में एक औपचारिक चेतावनी है, जो retraction नहीं है। जब किसी लेख में दोनों हों, तो E दिखता है और होवर टेक्स्ट में सुधार का भी ज़िक्र होता है; क्लिक करने पर मूल लेख, चिंता की सूचना और सुधार तीनों दिखते हैं। चिंता की सूचना पर भी E दिखता है। Report और \"Excel\" एक्सपोर्ट में दोनों अलग-अलग दर्ज होते हैं।",
        ref: "https://www.nlm.nih.gov/bsd/policy/errata.html"
    },
    {
        label: "Cited = iCite (NIH) या Europe PMC से साइटेशन संख्या",
        description: "साइटेशन संख्या iCite से ली जाती है, जिसे NIH उपलब्ध कराता है — वही सरकारी संस्था जो PubMed चलाती है। साइटेशन संख्या के कई स्रोत हैं, जिनमें स्वयं PubMed भी शामिल है, लेकिन मेरे विचार से कुल मिलाकर iCite सबसे उपयुक्त है। कभी-कभी iCite बंद या धीमा हो सकता है; ऐसे में मैं साइटेशन संख्या Europe PMC से लेता हूँ, जो EMBL-EBI द्वारा शोध-वित्तपोषकों के एक समूह के साथ मिलकर चलाया जाने वाला एक पुराना और स्थापित साहित्य डेटाबेस है।",
        ref: "https://icite.od.nih.gov/"
    },
    {
        label: "चार्ट आइकन (Cited के बाद) = महीने के अनुसार साइटेशन, पिछले 12 महीने (iCite)",
        description: "जब लेख का मासिक डेटा होता है तो आइकन नीला होता है: पिछले 12 महीनों के iCite साइटेशन का चार्ट देखने के लिए उस पर क्लिक करें। पहला बार शुरुआत में साइटेशन की संख्या है; उसके बाद हर महीना पिछले कुल के ऊपर उस महीने मिले साइटेशन जोड़ता है, और यह संख्या बार के ऊपर लिखी होती है। लाल डैश वाला बॉक्स उस महीने को दिखाता है जब iCite ने संख्या घटाई (सुधार)। किसी बार पर माउस ले जाने से उसकी संख्याएँ दिखती हैं।\n\nधूसर का अर्थ है कि लेख का मासिक डेटा नहीं है। चार्ट केवल उन लेखों के लिए हैं जो पिछले 36 महीनों में PubMed में जोड़े गए और पिछले 12 महीनों में सबसे अधिक साइटेशन पाने वाले 40,000 लेखों में शामिल हैं, इसलिए पुराने स्थापित लेख इसमें नहीं हैं, भले ही उनके साइटेशन अधिक हों। डेटा NIH iCite के मासिक स्नैपशॉट से आता है और महीने में एक बार अपडेट होता है; पूरी सूची PubMed iCite Citation Gains रिपोर्ट में है।",
        ref: "https://tomlaheyh.github.io/citation-bar/icite/icite.html"
    },
    {
        label: "RCR = iCite से Relative Citation Ratio",
        description: "Relative Citation Ratio (RCR) iCite का एक माप है, जिसकी परिभाषा है: \"हर पेपर के प्रति वर्ष साइटेशन, जिन्हें उसी क्षेत्र और वर्ष के NIH-वित्तपोषित पेपरों को प्रति वर्ष मिलने वाले साइटेशन के अनुसार सामान्यीकृत किया गया हो।\" यह वैज्ञानिक प्रभाव का साइटेशन-आधारित माप है। जब iCite उपलब्ध नहीं होता, तो RCR \"-\" दिखाता है, क्योंकि यह iCite का अपना माप है जो अन्य स्रोतों से उपलब्ध नहीं है। जगह बचाने के लिए 99 से अधिक RCR बार पर पूर्णांक में (राउंड करके) दिखता है (123.4 की जगह 123)। Report और एक्सपोर्ट में पूरा मान रहता है।",
        ref: "https://support.icite.nih.gov/hc/en-us/articles/9062490125083-Metrics"
    },
    {
        label: "IC = Semantic Scholar से प्रभावशाली साइटेशन",
        description: "Semantic Scholar उन साइटेशन की पहचान करता है जिनमें साइट किए गए प्रकाशन का साइट करने वाले प्रकाशन पर उल्लेखनीय प्रभाव होता है। प्रभावशाली साइटेशन एक मशीन-लर्निंग मॉडल से तय किए जाते हैं, जो साइटेशन की संख्या और हर साइटेशन के आसपास के संदर्भ जैसे कारकों का विश्लेषण करता है। न मिलने पर \"-\" दिखाता है।",
        ref: "https://www.semanticscholar.org/faq#influential-citations"
    },
    {
        label: "Alt = Altmetric स्कोर",
        description: "Altmetric Attention Score बताता है कि किसी शोध-कार्य को कितना ध्यान मिला है, जिसमें सोशल मीडिया, समाचार और नीति दस्तावेज़ शामिल हैं। यह स्कोर एक स्वचालित एल्गोरिदम से निकाला जाता है और ध्यान की भारित (weighted) गणना दर्शाता है। लिंक सीधे लेख के Altmetric पेज पर ले जाता है।",
        ref: "https://help.altmetric.com/en/articles/9800513"
    },
    {
        label: "s = PubMed से मिलते-जुलते लेख",
        description: "PubMed से मिलते-जुलते लेखों की सूची। आप इन्हें किसी भी PubMed लेख पेज के दाएँ साइडबार में \"Similar Articles\" पर क्लिक करके भी देख सकते हैं।",
        ref: "https://www.ncbi.nlm.nih.gov/guide/howto/find-articles-similar/"
    },
    {
        label: "c = PubMed से साइट करने वाले लेख",
        description: "PubMed से उन लेखों की सूची जो इस लेख को साइट करते हैं। ध्यान दें कि यह iCite से थोड़ा अलग हो सकता है, क्योंकि दोनों अलग प्रणालियों और तरीकों का उपयोग करते हैं। आगे चलकर NIH का ध्यान iCite पर है, लेकिन PubMed अब भी साइट करने वाले लेख देखने का यह आसान तरीका देता है।",
        ref: "https://pubmed.ncbi.nlm.nih.gov/help/#cited-by"
    },
    {
        label: "Gsch = DOI के लिए Google Scholar",
        description: "Google Scholar लेखों के लिए एक बेहतरीन संदर्भ स्रोत है, जिसमें उसकी अपनी साइटेशन संख्या भी होती है (जो थोड़ी बढ़ी हुई हो सकती है)। Google Scholar में किसी लेख को खोजने का सबसे अच्छा तरीका उसका DOI (Digital Object Identifier) है — एक अनोखी स्ट्रिंग जो लेख की पहचान करती है और उसे स्थायी वेब पता देती है। मैं PubMed लेख के DOI (97% लेखों में होता है) का उपयोग करके सीधे Google Scholar से लिंक करता हूँ।",
        ref: "https://scholar.google.com/intl/en/scholar/about.html"
    },
    {
        label: "Con = Connections साइटेशन ग्राफ़ (doilookup.com)",
        description: "Connections, doilookup.com पर लेख का एक इंटरैक्टिव साइटेशन ग्राफ़ खोलता है, जो OpenAlex डेटा से बना है। इसमें तीन व्यू हैं — लेख जिन संदर्भों को साइट करता है (Inside), जो पेपर इसे साइट करते हैं (Outside), और दोनों को मिलाकर Mix — जिनमें बबल जर्नल की गुणवत्ता के अनुसार रंगीन होते हैं और मुफ़्त फ़ुल टेक्स्ट होने पर चिह्नित होते हैं; किसी भी पेपर पर क्लिक करके उसका शीर्षक, जर्नल, वर्ष, साइटेशन संख्या और एब्स्ट्रैक्ट देखें। आप किसी भी पेपर को केंद्र में रखकर ग्राफ़ दोबारा बना सकते हैं, या बहु-स्तरीय विस्तार चला सकते हैं जो व्यापक दायरे में सबसे बुनियादी और सबसे ज़्यादा साथ-साथ साइट (co-cited) किए गए कार्यों को सामने लाता है।",
        ref: "https://doilookup.com/"
    },
    {
        label: "Abstract = एब्स्ट्रैक्ट (देखने के लिए क्लिक करें)",
        description: "एब्स्ट्रैक्ट लेख का संक्षिप्त विवरण है, जो हाल के लगभग 95% जर्नल लेखों में होता है। सामान्यतः इसे पढ़ने के लिए लेख खोलना पड़ता है — यह खोज परिणाम छोड़े बिना एब्स्ट्रैक्ट जल्दी देखने का तरीका देता है। यदि लेख में सरल भाषा का सारांश (plain-language summary) है, तो वह एब्स्ट्रैक्ट के नीचे दिखाया जाता है (या एब्स्ट्रैक्ट न होने पर उसकी जगह)। यदि PubMed में एब्स्ट्रैक्ट अन्य भाषाओं में भी है, तो एक नोट उन भाषाओं को लेख के लिंक के साथ सूचीबद्ध करता है, जहाँ आप एब्स्ट्रैक्ट के ऊपर भाषा चुन सकते हैं। एब्स्ट्रैक्ट के ऊपर एक Translate पंक्ति Chrome के बिल्ट-इन अनुवादक से शीर्षक, एब्स्ट्रैक्ट और सरल भाषा का सारांश अनुवादित करती है: बार की भाषा के लिए एक क्लिक, या कोई भी भाषा कोड टाइप करें। जब बार की भाषा अंग्रेज़ी नहीं होती, तो एब्स्ट्रैक्ट पहले से अनुवादित खुलता है। तुलना के लिए अंग्रेज़ी मूल नीचे दिखाया जाता है, और Show original से वापस मूल पर जा सकते हैं। यदि ब्राउज़र पहले से पूरे पेज का अनुवाद कर रहा है, तो एब्स्ट्रैक्ट ब्राउज़र के अनुवाद का पालन करता है, और अंग्रेज़ी मूल नीचे रहता है।\n\nपूरा पाठ: एब्स्ट्रैक्ट के नीचे एक विभाजक रेखा के बाद एक पंक्ति बताती है कि लेख का पूरा पाठ यहाँ दिखाया जा सकता है या नहीं, और जब दिखाया जा सकता है तो पूरा पाठ उसके बाद आता है। यह अपने आप लोड होता है। ओपन-एक्सेस लेख Europe PMC से एक-दो सेकंड में आते हैं; PubMed Central (PMC) द्वारा टेक्स्ट माइनिंग के लिए जारी किए गए अन्य मुफ़्त लेख सीधे PMC से आते हैं और इनमें कुछ सेकंड लग सकते हैं। जब पूरा पाठ नहीं दिखाया जा सकता (केवल प्रकाशक की साइट पर मुफ़्त, या PMC में मुफ़्त लेकिन ओपन एक्सेस नहीं), तो पंक्ति उस जगह का लिंक देती है जहाँ इसे पढ़ा जा सकता है। तालिकाएँ सादी पंक्तियों के रूप में और चित्र उनके कैप्शन से दिखाए जाते हैं, और संदर्भ शामिल नहीं होते। लेख का प्रकाशन प्रकार (जैसे Randomized Controlled Trial, Review या Case Reports) शीर्षक के नीचे दिखता है।\n\nनोट: एब्स्ट्रैक्ट केवल Abstract पर क्लिक करने पर लाए जाते हैं, इसलिए वे \"Excel\" या \"डेटा\" एक्सपोर्ट में शामिल नहीं होते।",
        ref: "https://pubmed.ncbi.nlm.nih.gov/18830537/"
    },
    {
        label: "link = फ़ुल-टेक्स्ट लिंक",
        description: "PubMed एब्स्ट्रैक्ट और मेटाडेटा देता है, लेकिन लेख का पूरा टेक्स्ट नहीं। यह असली लेख से लिंक करता है (आमतौर पर लेख पेज के ऊपर दाईं ओर)। कुछ लेखों के लिए सशुल्क सदस्यता (subscription) चाहिए — कई विश्वविद्यालय पुस्तकालयों के पास सदस्यता होती है, इसलिए यदि आप उनके सिस्टम में लॉग इन हैं तो paywall वाले लेख भी पढ़ सकते हैं। यदि कोई मुफ़्त संस्करण उपलब्ध है (जैसे PMC), तो मैं वह लिंक देता हूँ; अन्यथा प्रकाशक के पेज से लिंक करता हूँ। लिंक मुफ़्त होने पर हरा हो जाता है: पहले PMC, फिर OpenAlex से मिली वैध मुफ़्त प्रति (प्रकाशक का ओपन-एक्सेस पेज या किसी रिपॉज़िटरी की प्रति), फिर वे लेख जिन्हें PubMed ख़ुद मुफ़्त बताता है। प्रीप्रिंट को लेख की मुफ़्त प्रति नहीं माना जाता। Report बताती है कि मुफ़्त प्रति किस प्रकार की है।",
        ref: "https://www.ncbi.nlm.nih.gov/guide/howto/obtain-full-text/"
    },
    {
        label: "✓ = एक्सपोर्ट सूची में जोड़ें (जोड़ने पर हरा)",
        description: "दूसरी पंक्ति की शुरुआत में बना चेक किसी लेख को आपकी एक्सपोर्ट सूची में जोड़ता है। ग्रे का अर्थ है नहीं जोड़ा गया, हरे का अर्थ है जोड़ दिया गया। हटाने के लिए इस पर फिर से क्लिक करें।\n\nलेख जोड़ने पर PubMed से उसका पूरा रिकॉर्ड लाया जाता है — सभी लेखक, वॉल्यूम, अंक, पृष्ठ, एब्स्ट्रैक्ट और MeSH शब्द — इसलिए इस दौरान चेक कुछ पल के लिए एम्बर (नारंगी-पीला) होकर टिमटिमाता है। यदि रिकॉर्ड लाना विफल हो जाए, तो चेक ग्रे ही रहता है और कारण बताता है, बजाय इसके कि बिना किसी डेटा के हरा हो जाए।\n\n<strong>चयन बने रहते हैं</strong>\n<ul>\n<li>परिणामों के पेज बदलने और नई खोजें करने पर भी लेख चेक किए हुए रहते हैं, इसलिए आप एक्सपोर्ट करने से पहले कई खोजों से लेख इकट्ठा कर सकते हैं</li>\n<li>हटाए गए लेख को दोबारा जोड़ना तुरंत होता है — उसका रिकॉर्ड रखा रहता है, इसलिए PubMed से दो बार नहीं माँगा जाता</li>\n<li>साइटेशन बार बंद करने पर सूची साफ़ हो जाती है</li>\n</ul>\n\nअनुरोधों के बीच एक-एक सेकंड का अंतर रखा जाता है, इसलिए किसी पेज पर जल्दी-जल्दी कई चेक करने पर वे कतार में लग जाते हैं और NCBI की rate limit पार नहीं होती। एक-एक करके लेख चुनने पर कभी इंतज़ार नहीं करना पड़ता।",
        ref: null
    },
    {
        label: "चेकलिस्ट आइकन = एक्सपोर्ट सूची खोलें",
        description: "चेक के बगल में बना चेकलिस्ट आइकन आपकी एक्सपोर्ट सूची खोलता है। कुछ भी चयनित न होने पर यह ग्रे होता है, और लेख जोड़ने के बाद संख्या के साथ नीला हो जाता है — यह संख्या पेज के हर बार पर एक जैसी होती है।\n\nसूची में हर लेख उसके शीर्षक, जर्नल, वर्ष और PMID के साथ दिखता है, और उसे हटाने के लिए एक ✕ होता है। पिछले पेज पर जोड़े गए लेख केवल उनके PMID से दिखते हैं, क्योंकि उनका विवरण अब स्क्रीन पर नहीं है।\n\n<strong>चार क्रियाएँ</strong>\n<ul>\n<li><strong>Clear all:</strong> सूची खाली करता है</li>\n<li><strong>Open in new tab:</strong> चयनित लेखों को PubMed खोज के रूप में नए टैब में दिखाता है, ताकि आप जिन परिणामों पर काम कर रहे थे उनमें आपकी जगह बनी रहे</li>\n<li><strong>Download .ris:</strong> RIS प्रारूप — EndNote, Mendeley, RefWorks, Papers, Zotero</li>\n<li><strong>Download .nbib:</strong> MEDLINE प्रारूप — वही फ़ाइल जो PubMed का अपना \"Send to → Citation manager\" बनाता है; Zotero और EndNote</li>\n</ul>\n\nदोनों डाउनलोड में हर लेख का पूरा रिकॉर्ड होता है, एब्स्ट्रैक्ट और MeSH शब्दों सहित। फ़ाइलों के नाम में तारीख और समय होता है (उदाहरण के लिए <code>pubmed-citations-2026-09-12-3-04pm.nbib</code>), इसलिए एक ही दिन में कई बार एक्सपोर्ट करने पर पिछली फ़ाइल कभी ओवरराइट नहीं होती।\n\nPubMed एक खोज में अधिकतम 200 लेख स्वीकार करता है, इसलिए यदि आपकी सूची लंबी है तो \"Open in new tab\" पहले 200 दिखाता है — ऐसा होने पर सूची यह बताती है। डाउनलोड की कोई सीमा नहीं है।\n\n<strong>PDF सहित इन्हें ZOTERO में भेजना</strong>\nZotero के लिए दो चीज़ें ज़रूरी हैं और दोनों मौजूद होनी चाहिए: <strong>Zotero Connector</strong> ब्राउज़र एक्सटेंशन, और आपके कंप्यूटर पर खुला <strong>Zotero डेस्कटॉप ऐप</strong>।\n\nइनके साथ, अपनी सूची PubMed में खोलें और कनेक्टर के फ़ोल्डर आइकन पर क्लिक करें। <strong>Select All</strong> चुनें, फिर <strong>OK</strong> — यह सभी लेख एक साथ सहेज लेता है, और आपके पास पहले से मौजूद जर्नल एक्सेस से हर PDF लाने का प्रयास करता है। डाउनलोड की गई फ़ाइल ऐसा नहीं कर सकती, क्योंकि कनेक्टर आपके अपने ब्राउज़र सेशन में चलता है।\n\nडेस्कटॉप ऐप खुला न होने पर, कनेक्टर इसके बजाय आपकी zotero.org लाइब्रेरी में सहेजने का विकल्प देता है। Zotero के अनुसार यह \"कुछ पेजों\" पर काम करता है, इसलिए यह भरोसेमंद विकल्प नहीं है।\n\n.nbib और .ris डाउनलोड के लिए इनमें से कुछ भी ज़रूरी नहीं है, और ये EndNote, Mendeley और RefWorks के साथ भी काम करते हैं।\n\n<div class='help-ai-pack'><strong>AI PACK (.ZIP) — अभी सुधार जारी है</strong>\n<strong>AI pack (.zip)</strong> आपकी सूची के लेखों (अधिकतम 40) को एक zip फ़ाइल में रखता है, जिसे आप किसी AI टूल को दे सकते हैं। जहाँ संभव हो, यह पूरा पाठ जोड़ता है (ओपन-एक्सेस लेख और NIH लेखक पांडुलिपियाँ, Europe PMC या PubMed Central से), वरना एब्स्ट्रैक्ट, साथ में साइटेशन बार के डेटा को समझाने वाली एक README। फ़ाइल को अनज़िप करें और AI को उस फ़ोल्डर पर लगाएँ, या अगर आपका AI टूल zip फ़ाइलें स्वीकार करता है तो zip ही अपलोड कर दें।\n\nजिन लेखों का मुफ़्त पूरा पाठ नहीं है, उनके लिए Open बटन होता है (मुफ़्त PMC PDF हो तो वह, वरना प्रकाशक का पेज), ताकि आप वह PDF सहेज सकें जिस तक आपकी पहुँच है।\n\nबड़े दस्तावेज़ किसी AI टूल के लिए एक बार में पढ़ने को बहुत ज़्यादा हो सकते हैं। लंबे लेख (लगभग 100 पन्नों से अधिक) चिह्नित किए जाते हैं, और हर AI टूल की अपनी अपलोड सीमाएँ होती हैं।\n<ul>\n<li><strong>Convert PDF:</strong> सहेजी गई PDF को आपके ब्राउज़र में ही पाठ में बदलता है (कुछ भी अपलोड नहीं होता)। संदर्भ सूचियाँ एक अलग फ़ाइल में जाती हैं, और तालिका वाले पन्ने एक छोटी PDF के रूप में रखे जाते हैं। स्कैन की गई (केवल चित्र वाली) PDF में बदलने लायक पाठ नहीं होता, इसलिए उसके लिए Add PDF का उपयोग करें।</li>\n<li><strong>Add PDF:</strong> PDF को जैसी है वैसी ही zip में रखता है।</li>\n<li><strong>जटिल लेआउट या गणित के लिए:</strong> तकनीकी उपयोगकर्ता Docling, Marker या MinerU जैसे मुफ़्त टूल से PDF बदल सकते हैं, फिर बनी .md फ़ाइलें अनज़िप किए गए फ़ोल्डर में जोड़ सकते हैं।</li>\n</ul></div>\n\n<strong>AI TABLE — नया, प्रायोगिक</strong>\n<strong>AI table</strong> आपकी सूची के हर लेख का शीर्षक और एब्स्ट्रैक्ट Chrome के बिल्ट-इन AI से आपके अपने कंप्यूटर पर पढ़ता है (कुछ भी अपलोड नहीं होता) और हर लेख के लिए एक पंक्ति भरता है: अध्ययन का डिज़ाइन, जनसंख्या, सैंपल साइज़, हस्तक्षेप या एक्सपोज़र, और मुख्य निष्कर्ष। <strong>Copy table</strong> Excel या Google Sheets के लिए टैब से अलग किया गया टेक्स्ट कॉपी करता है। यह ग़लत हो सकता है: खाली सेल का अर्थ है कि एब्स्ट्रैक्ट में यह नहीं लिखा, सैंपल साइज़ तभी दिखता है जब वह संख्या एब्स्ट्रैक्ट में हो, और हर पंक्ति को लेख से मिलाकर जाँचना चाहिए। पहली बार इस्तेमाल पर Chrome का AI मॉडल (कई GB) डाउनलोड होता है। बटन केवल Chrome 138 या उसके बाद के संस्करण में दिखता है, और मॉडल के लिए लगभग 22 GB खाली डिस्क स्पेस और 4 GB से अधिक मेमोरी वाला ग्राफ़िक्स कार्ड या 16 GB RAM चाहिए।",
        ref: null
    },
    {
        label: "Author = लेखक की जानकारी",
        description: "पहले और अंतिम लेखक को दिखाता है (अकादमिक परंपरा में, पहला लेखक आमतौर पर काम का नेतृत्व करता है, और अंतिम लेखक लैब का प्रमुख होता है; अगर अंत में कोई संगठन है, तो अंतिम व्यक्ति लिया जाता है)।\n\n<strong>खोज लिंक</strong>\n<ul>\n<li><strong>PubMed:</strong> उपलब्ध होने पर ORCID (व्यापक रूप से उपयोग होने वाली लेखक ID, Ref: <a href=\"https://orcid.org/\" target=\"_blank\">https://orcid.org/</a>) का उपयोग करता है; अन्यथा उपनाम और पहले नाम का पहला अक्षर उपयोग करता है</li>\n<li><strong>ORCID प्रोफ़ाइल:</strong> अनोखी शोधकर्ता ID के साथ लेखक की विस्तृत जानकारी देती है - नाम-आधारित खोजों से अधिक भरोसेमंद (सभी लेखों में ORCID नहीं होते)</li>\n</ul>\n\n<em>नोट: नाम-आधारित खोजों में मिलते-जुलते नाम वाले अन्य शोधकर्ता भी आ सकते हैं। ORCID सटीक पहचान देता है।</em>\n\n<strong>मेट्रिक्स (OpenAlex से, ORCID आवश्यक)</strong>\n<ul>\n<li><strong>h-index:</strong> पेपरों में साइटेशन की न्यूनतम संख्या। उदाहरण: 12 पेपर, सभी के ≥12 साइटेशन = h-index 12 (Ref: <a href=\"https://pmc.ncbi.nlm.nih.gov/articles/PMC10771139/\" target=\"_blank\">https://pmc.ncbi.nlm.nih.gov/articles/PMC10771139/</a>)</li>\n<li><strong>i10-index:</strong> ≥10 साइटेशन वाले पेपरों की संख्या</li>\n<li><strong>2 वर्ष की साइटेशन दर:</strong> 2 वर्षों में प्रति पेपर औसत साइटेशन</li>\n</ul>\n\n<em>नोट: अलग-अलग स्रोत (Google Scholar, Scopus, Web of Science) अलग साइटेशन डेटाबेस के कारण इन मेट्रिक्स की गणना थोड़ी अलग तरह से करते हैं। देखें Ref: <a href=\"https://en.wikipedia.org/wiki/Author-level_metrics\" target=\"_blank\">https://en.wikipedia.org/wiki/Author-level_metrics</a></em>\n\n<strong>संबद्धताएँ (AFFILIATIONS)</strong>\nलेख में दी गई संस्थागत संबद्धताओं को सूचीबद्ध करता है।\n\nनोट: पहले और अंतिम लेखक का ORCID, h-index और i10-index हर लेख के लिए (OpenAlex से) लाया जाता है और \"Excel\" तथा \"डेटा\" एक्सपोर्ट में शामिल होता है। संबद्धताएँ (affiliations) केवल Author पर क्लिक करने पर लाई जाती हैं, इसलिए वे एक्सपोर्ट में शामिल नहीं होतीं।\n\nकार्य, साइटेशन और वापसी (OpenAlex, ORCID ज़रूरी): works लेखक की OpenAlex प्रोफ़ाइल में कार्यों की संख्या है और citations उन पर मिले कुल साइटेशन। वापस लिए गए लेखों की जाँच पहले और अंतिम लेखक के लिए होती है: संख्या OpenAlex में उस लेखक के अन्य वापस लिए गए लेख हैं, यह लेख शामिल नहीं। अगर किसी के एक या अधिक हों, तो बार पर Author के चारों ओर लाल रेखा दिखती है। Author पैनल में 1 या अधिक की संख्या OpenAlex में उस लेखक के वापस लिए गए पेपरों से लिंक होती है (सूची में यह लेख भी हो सकता है; वापसी सूचनाएँ नहीं गिनी जातीं)। \"–\" का अर्थ है जाँच नहीं हो सकी (ORCID नहीं, नाम OpenAlex से मेल नहीं खाता, OpenAlex उपलब्ध नहीं, या गिनने के लिए बहुत अधिक परिणाम), शून्य नहीं। ये सभी और 2 साल की साइटेशन दर Excel निर्यात में भी हैं (Author Retractions दोनों में बड़ी संख्या है; अगर किसी की जाँच नहीं हो सकी और किसी के पास वापसी नहीं है तो खाली)।",
        ref: null
    },
    {
        label: "J = जर्नल की जानकारी",
        description: "जर्नल की जानकारी के लिए J पर क्लिक करें: पूरा नाम, प्रिंट और इलेक्ट्रॉनिक ISSN, NLM ID (NLM Catalog से लिंक), SJR और Top-J। एक्सटेंशन के Journal Ranking डेटा से: जर्नल की रैंक और इस साल PubMed में जोड़े गए उसके लेख; पिछले साल के उन्हीं महीनों की तुलना में वृद्धि; इस साल का Medline %, मुफ़्त पूर्ण पाठ % और ORCID %; और वापसियाँ: जर्नल के किसी भी प्रकाशन वर्ष के लेख जिन्हें PubMed ने इस साल और पिछले साल के उन्हीं महीनों में वापस लिया गया (retracted) दर्ज किया (प्रीप्रिंट सर्वरों के लिए वापस लिए गए प्रीप्रिंट)। यही पंक्तियाँ Report में भी हैं। OpenAlex जर्नल का देश, प्रकाशक, ओपन एक्सेस और DOAJ स्थिति, APC, h-index, 2 साल का औसत साइटेशन और पहला वर्ष जोड़ता है; J या Report खोलने पर हर जर्नल के लिए एक बार ही देखा जाता है। पैनल लेख के शीर्षक और प्रकाशन प्रकार से शुरू होता है, और SJR की पंक्ति में जर्नल का सर्वश्रेष्ठ चतुर्थक शामिल है।",
        ref: "https://tomlaheyh.github.io/citation-bar/journal-ranking/journal-ranking.html"
    },
    {
        label: "Top-J = शीर्ष जर्नल",
        description: "शीर्ष मेडिकल जर्नलों की मेरी अपनी चुनी हुई सूची, जिसमें एक ही प्रकाशक-समूह के संबद्ध जर्नल भी शामिल हैं (जैसे JAMA परिवार)। मिलान ISSN से होता है — जर्नल मेल खाने पर \"Yes\" दिखता है। सूची जानबूझकर छोटी और बहुत चयनात्मक रखी गई है। वर्तमान सूची: Annals of Internal Medicine, British Medical Journal (BMJ), European Heart Journal, Journal of the American College of Cardiology, JAMA, Lancet, Nature, New England Journal of Medicine। मैं सुझावों के लिए तैयार हूँ, लेकिन इसे एक बेहद न्यूनतम सूची के रूप में बनाया गया है।",
        ref: null
    },
    {
        label: "SJR = SCImago Journal Rank",
        description: "एक व्यापक रूप से सम्मानित, मुफ़्त जर्नल रैंकिंग। SCImago Journal Rank (SJR) Google के PageRank™ जैसे एल्गोरिदम से जर्नल की दृश्यता मापता है। SCImago कई स्पेनिश विश्वविद्यालयों और CSIC से संबद्ध एक शोध समूह है, जो सूचना विश्लेषण और विज़ुअलाइज़ेशन में विशेषज्ञ है। नई रैंकिंग साल में एक बार प्रकाशित होती है (आमतौर पर अप्रैल में)। जहाँ SCImago देता है, वहाँ जर्नल का सर्वश्रेष्ठ चतुर्थक (Q1 से Q4) होवर टेक्स्ट, J पैनल, Report और \"Excel\" एक्सपोर्ट में दिखता है। SCImago जर्नल को उसके हर विषय क्षेत्र में अलग से रैंक करता है, और यह उनमें सबसे अच्छा है: Q1 का अर्थ है कम से कम एक क्षेत्र में शीर्ष 25%।",
        ref: "https://www.scimagojr.com/aboutus.php"
    },
    {
        label: "YTD = वर्ष में अब तक के जर्नल लेख",
        description: "इस जर्नल (ISSN के अनुसार) ने एक्सटेंशन के रैंकिंग डेटा की अवधि में कितने लेख प्रकाशित किए, उनकी संख्या। मैं PubMed का पूरा डेटा (आमतौर पर हर महीने) लेता हूँ और जर्नलों को वर्ष के कुल लेखों, मुफ़्त लेखों और Medline-इंडेक्स लेखों के आधार पर रैंक करता हूँ। यह रैंकिंग डेटा एक्सटेंशन के साथ आता है और हर रिलीज़ के साथ अपडेट होता है, इसलिए आँकड़े रैंकिंग फ़ाइल में बताई गई अवधि के होते हैं। जब मैं PubMed सीख रहा था, तब ऐसा कुछ बहुत मददगार होता — आशा है यह आपके लिए भी उपयोगी होगा।",
        ref: null
    },
    {
        label: "Medline % = वर्ष में अब तक Medline में इंडेक्स जर्नल लेखों का प्रतिशत",
        description: "किसी जर्नल के लेखों (ISSN के अनुसार) में से कितने प्रतिशत उसी अवधि में Medline में इंडेक्स हुए हैं। यह मेरे अपने रैंकिंग डेटा से है। ध्यान दें कि यह जर्नल की गुणवत्ता नहीं बल्कि इंडेक्सिंग को दर्शाता है: हाल में प्रकाशित लेख शायद अभी इंडेक्स न हुए हों, इसलिए बार-बार प्रकाशित करने वाला जर्नल अपनी अंतिम दर से कम प्रतिशत दिखा सकता है।",
        ref: null
    },
    {
        label: "Free % = वर्ष में अब तक मुफ़्त फ़ुल टेक्स्ट वाले जर्नल लेखों का प्रतिशत",
        description: "किसी जर्नल के लेखों (ISSN के अनुसार) में से कितने प्रतिशत उसी अवधि में मुफ़्त फ़ुल टेक्स्ट के रूप में उपलब्ध हैं। यह उसी रैंकिंग डेटा से है जिससे YTD संख्या और Medline % आते हैं।",
        ref: null
    },
    {
        label: "Xout = बहिष्करण खोज (Exclusion Search)",
        description: "गैर-प्राथमिक शोध को बाहर करने वाले फ़िल्टर के साथ PubMed में फिर से खोजें। एक डायलॉग खुलता है जिसमें आपकी मौजूदा खोज पहले से भरी होती है और उन प्रकाशन प्रकारों को बाहर करने के लिए चेकबॉक्स होते हैं, जो मिलकर PubMed के सभी लेखों का लगभग 25% हैं:\n\n<ul>\n<li><strong>Has Abstract:</strong> लेखों में एब्स्ट्रैक्ट होना ज़रूरी करता है (अनुशंसित — बिना एब्स्ट्रैक्ट वाले लेख शायद ही कभी peer-reviewed प्राथमिक शोध होते हैं)</li>\n<li><strong>No Retracted Publications:</strong> retract किए गए लेखों और उनकी retraction सूचनाओं को बाहर करता है</li>\n<li><strong>No Published Errata:</strong> सुधार/erratum सूचनाओं को बाहर करता है</li>\n<li><strong>No Letters:</strong> संपादक को लिखे पत्रों को बाहर करता है</li>\n<li><strong>No Editorials:</strong> संपादकीय लेखों को बाहर करता है</li>\n<li><strong>No Comments:</strong> टिप्पणी लेखों को बाहर करता है</li>\n<li><strong>No Systematic Reviews:</strong> systematic review को बाहर करता है</li>\n<li><strong>No Meta-Analyses:</strong> meta-analysis को बाहर करता है</li>\n<li><strong>No Reviews:</strong> review लेखों को बाहर करता है</li>\n</ul>\n\nसभी फ़िल्टर डिफ़ॉल्ट रूप से चेक होते हैं। किसी प्रकार को शामिल करने के लिए उसके फ़िल्टर का चेक हटा दें। फ़िल्टर बदलते समय पूरी क्वेरी का प्रीव्यू तुरंत अपडेट होता है। आप सीधे खोज सकते हैं (मौजूदा टैब में), क्वेरी कॉपी कर सकते हैं, या रद्द कर सकते हैं। View Expanded आपकी खोज को PubMed द्वारा उसकी व्याख्या (E-utilities का query translation) के साथ दिखाता है, ताकि आप देख सकें कि बिना टैग वाले शब्दों को automatic term mapping ने कैसे बढ़ाया।",
        ref: null
    },
    {
        label: "kS = मुख्य खोजें (Key Searches)",
        description: "बहुत अधिक प्रकाशनों वाले या तेज़ी से बढ़ रहे विषयों पर पहले से बनी PubMed खोजें, क्षेत्र के अनुसार समूहों में। समूह देखने के लिए kS पर क्लिक करें, किसी समूह की खोजें देखने के लिए उस पर पॉइंटर ले जाएँ या क्लिक करें, फिर किसी खोज को नए टैब में खोलने के लिए उस पर क्लिक करें। हर खोज में ज़रूरी है कि विषय लेख का मुख्य विषय हो (MeSH Major Topic या शीर्षक) और लेख में एब्स्ट्रैक्ट हो; retract किए गए लेख और उनकी retraction सूचनाएँ, erratum, पत्र, संपादकीय और टिप्पणियाँ बाहर रहती हैं। review, systematic review और meta-analysis शामिल रहते हैं। पूरी क्वेरी PubMed के सर्च बॉक्स में दिखती है। समूहों और खोजों के नाम अंग्रेज़ी में हैं, क्योंकि खोज शब्द अंग्रेज़ी में हैं। मेनू के नीचे की Years पंक्ति खोज में प्रकाशन तिथि की चलती सीमा जोड़ती है, जैसे पिछले 1, 5 या 10 वर्षों के लिए \"last 5 years\"[dp]; All चुनने पर कोई सीमा नहीं। यह क्वेरी का हिस्सा है, इसलिए क्वेरी कॉपी करने पर भी बनी रहती है। आपकी पसंद याद रखी जाती है।",
        ref: null
    },
    {
        label: "pR = PubMed रिपोर्ट (मुख्य अवलोकन)",
        description: "PubMed Citation Bar साइट पर आठ PubMed रिपोर्ट टूल वाला मेनू खोलता है: PubMed Summary Report (किसी PubMed खोज का अवलोकन), PubMed Filters Report (फ़िल्टर विश्लेषण), PubMed MeSH Counts (MeSH शब्दों की आवृत्ति गणना), PubMed Journal Ranking (जर्नल रैंकिंग डेटा), PubMed Drift Report (PubMed साइटेशन-स्थिति मापों में दिन-प्रतिदिन बदलाव), PubMed ORCID Ranking (हर साल सबसे अधिक PubMed लेखों पर मौजूद ORCID iD), PubMed ROR Ranking (इस साल जोड़े गए लेखों के अनुसार संस्थानों की रैंकिंग, लेखकों की संबद्धता से) और PubMed iCite Citation Gains (पिछले 36 महीनों में जोड़े गए वे लेख जिन्हें पिछले 12 महीनों में सबसे अधिक साइटेशन मिले)। हर टूल नए टैब में खुलता है।",
        ref: "https://tomlaheyh.github.io/citation-bar/"
    },
    {
        label: "/Report = साइटेशन रिपोर्ट",
        description: "एक रिपोर्ट जो किसी लेख के सभी मुख्य माप और लिंक आसानी से कॉपी होने वाले प्रारूप में सूचीबद्ध करती है। पॉपअप के दो बटन परिणामों का पूरा पेज एक्सपोर्ट करते हैं: \"Excel\" ठीक वही दिखाने वाली टैब-से-अलग तालिका देता है जो बार पर दिखता है — हर लेख की एक पंक्ति, सीधे Excel या Google Sheets में पेस्ट करने के लिए तैयार — जबकि \"डेटा\" सब कुछ निकाल देता है: पहले PMID, फिर सभी माप, एक्सटेंशन के टाइमस्टैम्प और आंतरिक फ़ील्ड। दूसरा बटन एक्सटेंशन द्वारा उपयोग किए जाने वाले सारे डेटा का पूरा खुलासा है। उपयोगकर्ता की कोई ट्रैकिंग बिल्कुल नहीं होती।\n\nनोट: पहले और अंतिम लेखक के ORCID, h-index और i10-index हर लेख के लिए लाए जाते हैं और \"Excel\" तथा \"डेटा\" एक्सपोर्ट में शामिल होते हैं। कुछ अन्य डेटा केवल तभी लाया जाता है जब आप बार पर किसी आइटम पर क्लिक करते हैं, क्योंकि हर लेख के लिए इसे लाने में बहुत समय लगेगा। इसमें एब्स्ट्रैक्ट (Abstract), अनुदान (grants) और लेखकों की संबद्धताएँ शामिल हैं। यह डेटा एक्सपोर्ट में शामिल नहीं होता।",
        ref: null
    },
    {
        label: "मेमोरी = सिस्टम की खाली मेमोरी (कम होने पर लाल हो जाती है)",
        description: "एक्सटेंशन पॉपअप के सबसे नीचे दिखती है। Chrome (एक्सटेंशन नहीं) हर टैब के सबसे हाल के पेज मेमोरी में रखता है ताकि Back तुरंत काम करे, और कई खोजों में इस्तेमाल हुआ टैब समय के साथ ज़्यादा मेमोरी घेरता जाता है। यह इस एक्सटेंशन के साथ या उसके बिना, दोनों स्थितियों में होता है; साइटेशन बार हर पेज पर अपना हिस्सा जोड़ता है।<br><br>इसे बढ़ने से रोकने के लिए, साइटेशन बार के छह बार चलने के बाद एक्सटेंशन आपका टैब उसी पेज पर दोबारा खोल देता है। आप उन्हीं परिणामों पर रहते हैं जिन्हें देख रहे थे और कुछ भी दोबारा टाइप नहीं करना पड़ता; बस उस टैब की Back हिस्ट्री चली जाती है, जो खाली होने वाली मेमोरी के बदले उचित सौदा है। यह कभी भी '1,000 स्कैन करें' के बीच में, या जब आप 'केवल उच्च प्रभाव' या '1,000 स्कैन करें' के परिणाम पेज पर हों, तब ऐसा नहीं करता।<br><br>जब खाली मेमोरी 2 GB से कम हो जाती है, तो 'मेमोरी' पंक्ति लाल हो जाती है — इसी स्तर पर किसी भी आकार की मशीन पर Chrome को दिक्कत होने लगती है। ऐसा होने पर, जिन ऐप्लिकेशन का आप उपयोग नहीं कर रहे उन्हें बंद करना आमतौर पर काफ़ी होता है। यदि आप इसे ख़ुद करना चाहें, तो 'एक्सटेंशन रीसेट करें' बटन भी एक्सटेंशन का संग्रहीत डेटा और Chrome का कैश साफ़ करके टैब दोबारा खोल देता है। Reset Extension केवल PubMed और NCBI पेजों का साइट डेटा साफ़ करता है। दूसरी वेबसाइटों का डेटा और आपकी हिस्ट्री, कुकी और पासवर्ड नहीं छुए जाते।",
        ref: null
    },
    {
        label: "कॉपी आइकन (पॉपअप) = इस खोज का संदर्भ",
        description: "पॉपअप के सबसे ऊपर उद्धरण पंक्ति की शुरुआत में छोटा कॉपी आइकन मौजूदा टैब की PubMed खोज का संदर्भ कॉपी करता है: डेटाबेस, खोज की तारीख, ठीक वैसी क्वेरी जैसी चलाई गई, साइडबार के फ़िल्टर, परिणामों की संख्या और URL। यह PRISMA-S का पालन करता है, जो साहित्य खोज की रिपोर्टिंग का मानक है। तारीख ज़रूरी है, क्योंकि MeSH और PubMed की automatic term mapping समय के साथ बदलती है, इसलिए वही खोज बाद में अलग परिणाम दे सकती है। कॉपी किया गया पाठ अंग्रेज़ी में है, ताकि लेखों और प्रोटोकॉल में इस्तेमाल हो सके।",
        ref: null
    }
];

export const helpItemsAr = [
    {
        label: "Retracted = رقم PMID ورقم PMID لإشعار السحب (عند النقر)",
        description: "يبيّن ما إذا كانت المقالة قد سُحبت من الأدبيات العلمية.",
        ref: "https://www.nlm.nih.gov/bsd/policy/errata.html"
    },
    {
        label: "* = مقالة عالية التأثير (خلفية خضراء)",
        description: `تُعلَّم المقالات بأنها عالية التأثير (خلفية خضراء) عندما تبلغ درجتها الحدّ الذي حددته (الافتراضي: 5، ويمكن تعديله في إعدادات الإضافة). تُحسب الدرجة على النحو التالي:

<div dir="ltr" style="text-align:left">${SCORE_CODE}</div>`,
        ref: null
    },
    {
        label: "Overall Score = درجة رقمية لجودة المقالة",
        description: "الدرجة الإجمالية قيمة محسوبة تمثل جودة المقالة استنادًا إلى عدة عوامل، منها الفهرسة في MEDLINE، وعدد الاستشهادات، ونسبة الاستشهاد النسبية (RCR)، وتصنيف SJR للمجلة، وحالة الرواج (trending)، والاستشهادات المؤثرة. تظهر الدرجة في أعلى تقرير الاستشهادات، وتساعد على تقييم تأثير المقالة وأهميتها بسرعة.",
        ref: null
    },
    {
        label: "AR = لغة النص المنبثق في الشريط",
        description: "تُظهر العلامة البنية الصغيرة بعد ? اللغة المستخدمة في النص المنبثق على الشريط (EN = English, ES = Español, ZH = 中文, JA = 日本語, KO = 한국어, FR = Français, HI = हिन्दी, AR = العربية, BN = বাংলা, PT = Português). انقر عليها للاختيار؛ يُعاد رسم الأشرطة فورًا دون إعادة تحميل أي بيانات، ويُحفظ اختيارك. وإلى أن تختار، تتبع لغة Chrome. وتتبع لوحة المساعدة هذه والنافذة المنبثقة للإضافة (زر اللغة بجوار -شريط الاستشهادات مُفعَّل-) الاختيار نفسه. ويؤدي اختيار لغة غير الإنجليزية أيضًا إلى ترجمة عناوين نتائج البحث ومقتطفاتها، باستخدام المترجم المدمج في Chrome على حاسوبك (Chrome 138 أو أحدث؛ في المرة الأولى، ينزّل Chrome اللغة بعد نقرة واحدة على العلامة). تُترجَم النتائج 25 نتيجة في كل مرة بدءًا من أعلى الصفحة، مع مربع حالة يعرض التقدم، وتُترجَم النتائج التي يضيفها Show more فور ظهورها. مرّر المؤشر فوق عنوان أو مقتطف مترجَم لرؤية النص الإنجليزي. أما النص الظاهر على الشريط نفسه فيبقى دائمًا بالإنجليزية.",
        ref: null
    },
    {
        label: "لغات أخرى = استخدام PubMed بلغتك",
        description: `صفحات PubMed وبحثه باللغة الإنجليزية. هناك طريقتان لقراءتها بلغتك، ويعمل شريط الاستشهادات مع كلتيهما:

<ul>
<li><strong>علامة اللغة على الشريط</strong> (AR، أعلاه): تترجم النص المنبثق في الشريط، ولوحة المساعدة هذه، والنافذة المنبثقة للإضافة، وعناوين نتائج البحث ومقتطفاتها. يُجري Chrome الترجمة على حاسوبك؛ ولا يُرسَل أي شيء إلى أي مكان آخر.</li>
<li><strong>ترجمة الصفحة المدمجة في Chrome</strong> (انقر بزر الماوس الأيمن → Translate، أو أيقونة الترجمة في شريط العناوين؛ وفي Edge الميزة نفسها): تترجم صفحة PubMed كاملةً إلى أي لغة يتيحها المتصفح. يبقى نص الشريط بالإنجليزية كي يظل في سطر واحد، وتبقى مصطلحات MeSH والكلمات المفتاحية كما يفهرسها PubMed تمامًا، وتعرض نافذة الملخص النص الإنجليزي الأصلي أسفل الترجمة. وأثناء ترجمة المتصفح للصفحة، تتنحّى ترجمة الشريط للنتائج جانبًا حتى لا يُترجَم شيء مرتين.</li>
</ul>

تستخدم عمليات التصدير ورابط Google Scholar وتقرير المقالة دائمًا عناوين PubMed الإنجليزية، أيًّا كانت طريقة ترجمة الصفحة. لا يفهم بحث PubMed إلا الإنجليزية، لذا ابحث بمصطلحات إنجليزية. نسخة PubMed على موقع Google Translate (عنوان ينتهي بـ translate.goog) غير مدعومة: فالشريط لا يعمل إلا على pubmed.ncbi.nlm.nih.gov، لذا استخدم ترجمة المتصفح نفسه بدلًا من ذلك.`,
        ref: null
    },
    {
        label: "doi = فتح المقالة في DOI Lookup",
        description: "يفتح معرّف DOI الخاص بالمقالة في DOI Lookup (doilookup.com)، وهو موقع مجاني يتحقق من حالات السحب والاستشهادات ومقاييس المجلة والوصول المفتوح من نحو اثني عشر مصدرًا. يمكن جمع عدة معرّفات DOI (حتى 15) وعرضها معًا. إذا لم يكن للمقالة DOI، يظهر الرابط باللون الرمادي.",
        ref: "https://doilookup.com/"
    },
    {
        label: "MeSH+ = مصطلحات MeSH والكلمات المفتاحية للمقالة",
        description: "يعرض قائمتين. مصطلحات MeSH (Medical Subject Headings) هي واصفات الموضوعات المضبوطة لدى NLM، وتُسند إلى سجلات MEDLINE (المعلَّمة بالحرف m على الشريط)؛ أما السجلات الأخرى فتعرض 'No MeSH data'. والكلمات المفتاحية هي مصطلحات المقالة نفسها، ويقدمها المؤلفون عادةً (Author keywords). أما الكلمات المفتاحية التي يضيفها أحيانًا مُفهرِس مثل NLM فتُدرج منفصلةً تحت عنوانها الخاص. الكلمات المفتاحية ليست مفردات مضبوطة، لكنها كثيرًا ما تسمّي مفاهيم أحدث لا تتضمنها MeSH بعد، ويمكن البحث بها في PubMed باستخدام الوسم [ot]. لا تُترجَم مصطلحات MeSH والكلمات المفتاحية آليًا أبدًا: فهي تبقى كما يفهرسها PubMed تمامًا، حتى أثناء ترجمة المتصفح للصفحة، لذا يمكن نسخها مباشرةً إلى بحث في PubMed.",
        ref: "https://www.nlm.nih.gov/mesh/meshhome.html"
    },
    {
        label: "n = جديدة، عمرها أقل من سنتين",
        description: "يستند إلى تاريخ الإنشاء [crdt] في PubMed، أي حين أُدخلت المقالة إلى النظام أول مرة. لا يتغير هذا التاريخ، بخلاف تواريخ النشر التي قد تتغير أحيانًا.",
        ref: null
    },
    {
        label: "t = مقالة رائجة وفق PubMed Trending",
        description: "يستند الرواج إلى أعلى 1,000 مقالة في PubMed. المنطق الفعلي غير معلن (وفق سياسة NIH)، لكن فكّر في \"جديدة وكثيرة المشاهدات\" وستكون قريبًا من الصواب.",
        ref: "https://pubmed.ncbi.nlm.nih.gov/trending/"
    },
    {
        label: "m = مفهرسة في Medline وفق PubMed",
        description: "يشير إلى أن المقالة مفهرسة في Medline.",
        ref: "https://www.nlm.nih.gov/medline/medline_overview.html"
    },
    {
        label: "p = ما قبل الطباعة (Preprint)",
        description: "يشير إلى أن المقالة من نوع ما قبل الطباعة (لم تخضع بعد لمراجعة الأقران). تتيح هذه المقالات للباحثين مشاركة نتائجهم بسرعة قبل المراجعة الرسمية من الأقران. ومع أنها توفر وصولًا مبكرًا إلى البحث، ينبغي تفسيرها بحذر لأنها لم تمر بعملية مراجعة الأقران الصارمة.",
        ref: "https://pmc.ncbi.nlm.nih.gov/about/nihpreprints/"
    },
    {
        label: "e = استدراك (erratum)، E = إبداء قلق",
        description: "قد تخضع المقالات لتحديثات أو تصحيحات — وهذا ليس سحبًا. نحو 1% من المقالات لها تصحيحات. عند النقر، يُعرض رقم PMID الأصلي ورقم PMID الخاص بالتصحيح. ظهور حرف E عريض في المكان نفسه يعني أن المجلة نشرت إبداء قلق (expression of concern): وهو تحذير رسمي بشأن المقالة لا يصل إلى حد السحب. عندما يكون للمقالة الاثنان معًا يظهر E ويذكر نص التلميح وجود التصحيح؛ وعند النقر تُعرض المقالة الأصلية وإشعار القلق والتصحيح. ويظهر E أيضًا على إشعار القلق نفسه. ويُدرج Report وتصدير \"Excel\" كلًّا منهما على حدة.",
        ref: "https://www.nlm.nih.gov/bsd/policy/errata.html"
    },
    {
        label: "Cited = عدد الاستشهادات من iCite (NIH) أو Europe PMC",
        description: "عدد الاستشهادات من iCite، الذي توفره NIH — وهي الجهة الحكومية نفسها التي تدير PubMed. توجد عدة مصادر لأعداد الاستشهادات، منها PubMed نفسه، لكنني أرى أن iCite هو الأنسب عمومًا. قد يتعطل iCite أو يبطئ أحيانًا، وفي هذه الحالة أجلب أعداد الاستشهادات من Europe PMC، وهي قاعدة بيانات أدبيات عريقة تديرها EMBL-EBI بالتعاون مع مجموعة من مموّلي البحث العلمي.",
        ref: "https://icite.od.nih.gov/"
    },
    {
        label: "أيقونة الرسم البياني (بعد Cited) = الاستشهادات حسب الشهر، آخر 12 شهرًا (iCite)",
        description: "تكون زرقاء عندما تتوفر للمقالة بيانات شهرية: انقر عليها لعرض رسم بياني لاستشهاداتها في iCite خلال آخر 12 شهرًا. العمود الأول هو عدد الاستشهادات في البداية؛ وكل شهر بعده يضيف ما اكتُسب في ذلك الشهر فوق الإجمالي السابق، مع كتابة الزيادة فوق العمود. يشير المربع الأحمر المتقطع إلى شهر خفّض فيه iCite العدد (تصحيح). مرّر المؤشر فوق أي عمود لرؤية أرقامه.\n\nاللون الرمادي يعني عدم وجود بيانات شهرية للمقالة. تشمل الرسوم البيانية فقط المقالات المضافة إلى PubMed خلال آخر 36 شهرًا والتي تقع ضمن أعلى 40,000 مقالة من حيث الاستشهادات المكتسبة خلال آخر 12 شهرًا، لذلك لا تظهر المقالات الراسخة الأقدم حتى لو كانت استشهاداتها أكثر. تأتي البيانات من اللقطات الشهرية لـ iCite التابع لـ NIH وتُحدَّث مرة كل شهر؛ والقائمة الكاملة في تقرير PubMed iCite Citation Gains.",
        ref: "https://tomlaheyh.github.io/citation-bar/icite/icite.html"
    },
    {
        label: "RCR = نسبة الاستشهاد النسبية من iCite",
        description: "نسبة الاستشهاد النسبية (RCR) مقياس من iCite يُعرَّف بأنه \"عدد الاستشهادات سنويًا لكل ورقة، مُعايَرًا إلى عدد الاستشهادات السنوية التي تتلقاها الأوراق الممولة من NIH في المجال والسنة نفسيهما\". وهو مقياس للتأثير العلمي قائم على الاستشهادات. عندما يكون iCite غير متاح، تعرض RCR العلامة \"-\" لأنها مقياس خاص بـ iCite لا يتوفر من مصادر أخرى. لتوفير المساحة، تُعرض قيمة RCR التي تزيد على 99 في الشريط كعدد صحيح مقرَّب (123.4 تظهر 123). ويحتفظ Report والتصديرات بالقيمة الكاملة.",
        ref: "https://support.icite.nih.gov/hc/en-us/articles/9062490125083-Metrics"
    },
    {
        label: "IC = الاستشهادات المؤثرة من Semantic Scholar",
        description: "يحدد Semantic Scholar الاستشهادات التي يكون فيها للمنشور المستشهَد به أثر كبير في المنشور المستشهِد. تُحدَّد الاستشهادات المؤثرة باستخدام نموذج تعلّم آلي يحلل عوامل منها عدد الاستشهادات والسياق المحيط بكل منها. يعرض \"-\" إذا لم يُعثر عليها.",
        ref: "https://www.semanticscholar.org/faq#influential-citations"
    },
    {
        label: "Alt = درجة Altmetric",
        description: "توفر درجة الاهتمام Altmetric (Altmetric Attention Score) مؤشرًا على مقدار الاهتمام الذي حظي به ناتج بحثي، بما في ذلك وسائل التواصل الاجتماعي والأخبار ووثائق السياسات. تُستخلص الدرجة من خوارزمية آلية وتمثل عدًّا مرجّحًا للاهتمام. يقود الرابط مباشرة إلى صفحة Altmetric الخاصة بالمقالة.",
        ref: "https://help.altmetric.com/en/articles/9800513"
    },
    {
        label: "s = مقالات مشابهة من PubMed",
        description: "قائمة بمقالات مشابهة من PubMed. يمكنك أيضًا عرضها بالنقر على \"Similar Articles\" في الشريط الجانبي الأيمن في أي صفحة مقالة على PubMed.",
        ref: "https://www.ncbi.nlm.nih.gov/guide/howto/find-articles-similar/"
    },
    {
        label: "c = مقالات من PubMed تستشهد بها",
        description: "قائمة من PubMed بالمقالات التي تستشهد بهذه المقالة. لاحظ أنها تختلف قليلًا عن iCite لأنهما يستخدمان أنظمة وطرقًا مختلفة. تركيز NIH مستقبلًا منصبّ على iCite، لكن PubMed لا يزال يوفر هذه الطريقة السهلة لرؤية المقالات المستشهِدة.",
        ref: "https://pubmed.ncbi.nlm.nih.gov/help/#cited-by"
    },
    {
        label: "Gsch = Google Scholar عبر DOI",
        description: "يُعد Google Scholar مرجعًا ممتازًا للمقالات، ويتضمن أعداد استشهادات خاصة به (قد تكون مضخّمة قليلًا). أفضل طريقة للعثور على مقالة في Google Scholar هي عبر معرّف DOI (Digital Object Identifier) — وهو سلسلة فريدة تُستخدم لتعريف المقالة ومنحها عنوان ويب دائمًا. أستخدم DOI الخاص بمقالة PubMed (97% منها لها DOI) للربط مباشرة بـ Google Scholar.",
        ref: "https://scholar.google.com/intl/en/scholar/about.html"
    },
    {
        label: "Con = مخطط الاستشهادات Connections (doilookup.com)",
        description: "يفتح Connections مخطط استشهادات تفاعليًا للمقالة على doilookup.com، مبنيًا على بيانات OpenAlex. يعرض ثلاث طرق عرض — المراجع التي تستشهد بها المقالة (Inside)، والأوراق التي تستشهد بها (Outside)، وعرضًا مدمجًا (Mix) — مع فقاعات ملوّنة حسب جودة المجلة ومعلَّمة عند توفر النص الكامل المجاني؛ انقر أي ورقة لرؤية عنوانها ومجلتها وسنتها وعدد استشهاداتها وملخصها. يمكنك إعادة توسيط المخطط على أي ورقة، أو تشغيل توسيع متعدد المستويات يُبرز الأعمال التأسيسية الأكثر استشهادًا مشتركًا في المحيط الأوسع.",
        ref: "https://doilookup.com/"
    },
    {
        label: "Abstract = الملخص (انقر للعرض)",
        description: "الملخص وصف قصير للمقالة، ويوجد في نحو 95% من مقالات المجلات الحديثة. عادةً يتعين فتح المقالة لقراءته — أما هذا فيتيح طريقة سريعة لعرض الملخص دون مغادرة نتائج البحث. إذا كان للمقالة ملخص مبسّط، فإنه يظهر أسفل الملخص (أو مكانه إذا لم يوجد ملخص). وإذا كان لدى PubMed الملخص بلغات أخرى أيضًا، تُدرجها ملاحظة مع رابط إلى المقالة، حيث تختار اللغة أعلى الملخص. يترجم صف Translate أعلى الملخص العنوانَ والملخصَ والملخصَ المبسّط باستخدام المترجم المدمج في Chrome: نقرة واحدة للغة الشريط، أو اكتب رمز أي لغة. وعندما لا تكون لغة الشريط هي الإنجليزية، يُفتح الملخص مترجَمًا مسبقًا. ويُعرض النص الإنجليزي الأصلي أسفله للمقارنة، ويعيدك Show original إليه. وإذا كان المتصفح يترجم الصفحة كاملةً بالفعل، يتبع الملخص ترجمة المتصفح، مع النص الإنجليزي الأصلي أسفلها.\n\nالنص الكامل: أسفل الملخص، بعد خط فاصل، يوضّح سطر ما إذا كان يمكن عرض النص الكامل للمقالة هنا، ثم يليه النص الكامل عندما يكون ذلك ممكنًا. يُحمَّل تلقائيًا. تصل المقالات مفتوحة الوصول من Europe PMC خلال ثانية أو ثانيتين؛ أما المقالات الأخرى المجانية للقراءة التي تتيحها PubMed Central (PMC) للتنقيب في النصوص فتُجلب من PMC مباشرة وقد تستغرق عدة ثوانٍ. وعندما يتعذر عرض النص الكامل (مجاني فقط على موقع الناشر، أو مجاني في PMC لكنه ليس مفتوح الوصول)، يتضمن السطر رابطًا إلى المكان الذي يمكن قراءته فيه. تظهر الجداول كأسطر نصية بسيطة، وتُذكر الأشكال بتعليقاتها، ولا تُضمَّن المراجع. يظهر نوع النشر للمقالة (مثل Randomized Controlled Trial أو Review أو Case Reports) تحت العنوان.\n\nملاحظة: لا تُجلب الملخصات إلا عند النقر على Abstract، لذا لا تُضمَّن في تصدير \"Excel\" أو \"البيانات\".",
        ref: "https://pubmed.ncbi.nlm.nih.gov/18830537/"
    },
    {
        label: "link = رابط النص الكامل",
        description: "يوفر PubMed الملخص والبيانات الوصفية، لكن ليس النص الكامل للمقالة. فهو يربط بالمقالة الفعلية (عادةً في أعلى يمين صفحة المقالة). بعض المقالات تتطلب اشتراكًا مدفوعًا — ولدى كثير من المكتبات الجامعية اشتراكات، فإذا كنت مسجّل الدخول إلى نظامها يمكنك الوصول إلى المقالات المحجوبة خلف جدار الدفع. إذا توفرت نسخة مجانية (مثل PMC)، أقدّم ذلك الرابط؛ وإلا أربط بصفحة الناشر. يصبح الرابط أخضر عندما يكون مجانيًا: أولًا PMC، ثم نسخة مجانية قانونية يُعثر عليها عبر OpenAlex (صفحة الوصول المفتوح لدى الناشر أو نسخة في مستودع)، ثم المقالات التي يصنّفها PubMed نفسه مجانية. ولا تُحتسب النسخة الأولية (preprint) نسخةً مجانية من المقالة. ويذكر Report نوع النسخة المجانية.",
        ref: "https://www.ncbi.nlm.nih.gov/guide/howto/obtain-full-text/"
    },
    {
        label: "✓ = إضافة إلى قائمة التصدير (خضراء عند الإضافة)",
        description: "علامة الاختيار في بداية الصف الثاني تضيف المقالة إلى قائمة التصدير. الرمادي يعني غير مضافة، والأخضر يعني مضافة. انقر عليها مرة أخرى لإزالتها.\n\nتؤدي إضافة مقالة إلى جلب سجلها الكامل من PubMed — جميع المؤلفين والمجلد والعدد والصفحات والملخص ومصطلحات MeSH — لذا تتحول العلامة إلى اللون الكهرماني وتنبض لحظة أثناء ذلك. إذا فشل الجلب تبقى العلامة رمادية وتوضح السبب، بدلًا من أن تتحول إلى الأخضر دون شيء وراءها.\n\n<strong>التحديدات تبقى محفوظة</strong>\n<ul>\n<li>تبقى المقالات محددة أثناء التنقل بين صفحات النتائج وإجراء عمليات بحث جديدة، فيمكنك الجمع من عدة عمليات بحث قبل التصدير</li>\n<li>إعادة إضافة مقالة أزلتها فورية — إذ يُحتفظ بسجلها، فلا يُسأل PubMed مرتين</li>\n<li>تُفرَّغ القائمة عند إيقاف شريط الاستشهادات</li>\n</ul>\n\nتُرسل الطلبات بفاصل ثانية واحدة بينها، لذا فإن التحديد السريع على امتداد صفحة يضعها في طابور بدلًا من تجاوز حد الطلبات لدى NCBI. أما النقر على مقالة واحدة في كل مرة فلا ينتظر أبدًا.",
        ref: null
    },
    {
        label: "أيقونة القائمة = فتح قائمة التصدير",
        description: "بجوار علامة الاختيار، تفتح أيقونة القائمة قائمة التصدير. تكون رمادية عندما لا يكون هناك شيء محدد، وزرقاء مع عدد بمجرد إضافة مقالات — وهذا العدد هو نفسه في كل شريط على الصفحة.\n\nتعرض القائمة كل مقالة بعنوانها ومجلتها وسنتها ورقم PMID، مع ✕ لإزالتها. المقالات المضافة من صفحة سابقة تظهر برقم PMID فقط، لأن تفاصيلها لم تعد على الشاشة.\n\n<strong>أربعة إجراءات</strong>\n<ul>\n<li><strong>Clear all:</strong> يفرّغ القائمة</li>\n<li><strong>Open in new tab:</strong> يعرض المقالات المحددة كبحث في PubMed، في علامة تبويب جديدة حتى تحتفظ بموضعك في النتائج التي كنت تراجعها</li>\n<li><strong>Download .ris:</strong> صيغة RIS — EndNote وMendeley وRefWorks وPapers وZotero</li>\n<li><strong>Download .nbib:</strong> صيغة MEDLINE — الملف نفسه الذي يُنتجه خيار \"Send to → Citation manager\" في PubMed؛ Zotero وEndNote</li>\n</ul>\n\nيتضمن كلا التنزيلين السجل الكامل لكل مقالة، بما في ذلك الملخص ومصطلحات MeSH. تُسمّى الملفات بالتاريخ والوقت (مثلًا <code>pubmed-citations-2026-09-12-3-04pm.nbib</code>)، لذا فإن التصدير عدة مرات في اليوم لا يستبدل ملفًا سابقًا أبدًا.\n\nيقبل PubMed 200 مقالة كحد أقصى في البحث الواحد، لذا يعرض \"Open in new tab\" أول 200 مقالة إذا كانت قائمتك أطول — وتنبّه القائمة إلى ذلك عند حدوثه. أما التنزيلات فلا حد لها.\n\n<strong>إرسالها إلى Zotero مع ملفات PDF</strong>\nيحتاج Zotero إلى عنصرين ويجب توفرهما معًا: إضافة المتصفح <strong>Zotero Connector</strong>، و<strong>تطبيق Zotero لسطح المكتب</strong> مفتوحًا على حاسوبك.\n\nبوجودهما، افتح قائمتك في PubMed وانقر أيقونة المجلد الخاصة بالموصل. اختر <strong>Select All</strong> ثم <strong>OK</strong> — فيحفظ جميع المقالات دفعة واحدة، ويحاول جلب كل ملف PDF باستخدام أي وصول إلى المجلات متاح لك أصلًا. وهذا ما لا يستطيعه ملف مُنزَّل، لأن الموصل يعمل ضمن جلسة متصفحك أنت.\n\nإذا لم يكن تطبيق سطح المكتب مفتوحًا، يعرض الموصل الحفظ في مكتبتك على zotero.org بدلًا من ذلك. يقول Zotero إن ذلك يعمل مع \"بعض الصفحات\"، لذا فهو ليس بديلًا موثوقًا.\n\nلا تحتاج تنزيلات .nbib و.ris إلى أي من هذا، وتعمل أيضًا مع EndNote وMendeley وRefWorks.\n\n<div class='help-ai-pack'><strong>AI PACK (.ZIP) — لا يزال قيد التحسين</strong>\nيضع <strong>AI pack (.zip)</strong> مقالات قائمتك (حتى 40 مقالة) في ملف zip واحد يمكنك تقديمه إلى أداة ذكاء اصطناعي. حيثما أمكن يضيف النص الكامل (المقالات مفتوحة الوصول ومخطوطات المؤلفين لدى المعاهد الوطنية للصحة NIH، من Europe PMC أو PubMed Central)، وإلا فالملخص، مع ملف README يشرح بيانات شريط الاستشهادات. فُكّ ضغط الملف ووجّه أداة الذكاء الاصطناعي إلى المجلد، أو ارفع ملف zip نفسه إذا كانت أداتك تقبل ملفات zip.\n\nوتظهر للمقالات التي لا يتوفر نصها الكامل مجانًا زرّ Open (ملف PDF المجاني في PMC إن وُجد، وإلا صفحة الناشر) لتحفظ ملف PDF يمكنك الوصول إليه.\n\nقد تكون المستندات الكبيرة أكثر مما تستطيع أداة الذكاء الاصطناعي قراءته دفعة واحدة. يُشار إلى المقالات الطويلة (أكثر من 100 صفحة تقريبًا)، ولكل أداة ذكاء اصطناعي حدود رفع خاصة بها.\n<ul>\n<li><strong>Convert PDF:</strong> يحوّل ملف PDF محفوظًا إلى نص داخل متصفحك (لا يُرفع أي شيء). تذهب قوائم المراجع إلى ملف منفصل، وتُحفظ صفحات الجداول في ملف PDF صغير. أما ملف PDF الممسوح ضوئيًا (صور فقط) فلا يحتوي على نص يمكن تحويله، لذا استخدم Add PDF معه.</li>\n<li><strong>Add PDF:</strong> يضع ملف PDF في ملف zip كما هو.</li>\n<li><strong>للتنسيقات المعقدة أو الرياضيات:</strong> يمكن للمستخدمين ذوي الخبرة التقنية تحويل ملفات PDF بأدوات مجانية مثل Docling أو Marker أو MinerU، ثم إضافة ملفات .md الناتجة إلى المجلد بعد فك ضغطه.</li>\n</ul></div>\n\n<strong>AI TABLE — جديد، تجريبي</strong>\n<strong>AI table</strong> يقرأ عنوان وملخص كل مقالة في قائمتك باستخدام الذكاء الاصطناعي المدمج في Chrome، على حاسوبك أنت (لا يُرفع أي شيء)، ويملأ صفًّا لكل مقالة: تصميم الدراسة، والفئة المدروسة، وحجم العينة، والتدخل أو التعرّض، والنتيجة الرئيسية. <strong>Copy table</strong> ينسخ نصًّا مفصولًا بعلامات جدولة للصقه في Excel أو Google Sheets. قد يخطئ: الخلية الفارغة تعني أن الملخص لا يذكر ذلك، ولا يظهر حجم العينة إلا إذا ورد ذلك الرقم في الملخص، وينبغي التحقق من كل صف بالرجوع إلى المقالة. عند أول استخدام يُنزَّل نموذج الذكاء الاصطناعي الخاص بـ Chrome (عدة غيغابايت). لا يظهر الزر إلا في Chrome 138 أو أحدث، ويحتاج النموذج إلى نحو 22 غيغابايت من المساحة الحرة على القرص وإلى بطاقة رسومات بذاكرة تزيد على 4 غيغابايت أو 16 غيغابايت من الذاكرة RAM.",
        ref: null
    },
    {
        label: "Author = معلومات المؤلفين",
        description: "يعرض المؤلف الأول والأخير (وفق العُرف الأكاديمي، يقود المؤلف الأول العمل عادةً، ويقود المؤلف الأخير المختبر؛ وإذا أُدرجت مؤسسة في الموضع الأخير، يُستخدم آخر شخص).\n\n<strong>روابط البحث</strong>\n<ul>\n<li><strong>PubMed:</strong> يستخدم ORCID (معرّف مؤلف واسع الانتشار، المرجع: <a href=\"https://orcid.org/\" target=\"_blank\">https://orcid.org/</a>) عند توفره؛ وإلا يستخدم اسم العائلة والحرف الأول من الاسم</li>\n<li><strong>ملف ORCID الشخصي:</strong> يقدم معلومات مفصلة عن المؤلف بمعرّف باحث فريد - أكثر موثوقية من البحث بالاسم (لا تتضمن كل المقالات معرّفات ORCID)</li>\n</ul>\n\n<em>ملاحظة: قد يشمل البحث بالاسم باحثين آخرين بأسماء مشابهة. يوفر ORCID تعريفًا دقيقًا.</em>\n\n<strong>المقاييس (من OpenAlex، وتتطلب ORCID)</strong>\n<ul>\n<li><strong>مؤشر h:</strong> أكبر عدد h من الأوراق التي حصلت كل منها على h استشهادًا على الأقل. مثال: 12 ورقة لكل منها ≥12 استشهادًا = مؤشر h يساوي 12 (المرجع: <a href=\"https://pmc.ncbi.nlm.nih.gov/articles/PMC10771139/\" target=\"_blank\">https://pmc.ncbi.nlm.nih.gov/articles/PMC10771139/</a>)</li>\n<li><strong>مؤشر i10:</strong> عدد الأوراق التي حصلت على ≥10 استشهادات</li>\n<li><strong>معدل الاستشهاد لسنتين:</strong> متوسط الاستشهادات لكل ورقة على مدى سنتين</li>\n</ul>\n\n<em>ملاحظة: تحسب المصادر المختلفة (Google Scholar وScopus وWeb of Science) هذه المقاييس بطرق مختلفة قليلًا بسبب اختلاف قواعد بيانات الاستشهادات. انظر المرجع: <a href=\"https://en.wikipedia.org/wiki/Author-level_metrics\" target=\"_blank\">https://en.wikipedia.org/wiki/Author-level_metrics</a></em>\n\n<strong>الانتماءات</strong>\nيسرد الانتماءات المؤسسية الواردة في المقالة.\n\nملاحظة: يُجلب معرّف ORCID ومؤشر h ومؤشر i10 للمؤلف الأول والأخير لكل مقالة (من OpenAlex)، وتُضمَّن في تصدير \"Excel\" و\"البيانات\". أما الانتماءات فلا تُجلب إلا عند النقر على Author، لذا لا تُضمَّن في التصدير.\n\nالأعمال والاستشهادات والسحب (OpenAlex، يتطلب ORCID): works هو عدد أعمال المؤلف في ملفه على OpenAlex، وcitations إجمالي الاستشهادات بها. يُفحص سحب المقالات للمؤلفَين الأول والأخير: العدد هو مقالات المؤلف الأخرى المسحوبة في OpenAlex، دون احتساب هذه المقالة. إذا كان لدى أي منهم مقالة واحدة أو أكثر، يظهر إطار أحمر حول Author في الشريط. في لوحة Author، يرتبط العدد 1 أو أكثر بالأوراق المسحوبة لذلك المؤلف في OpenAlex (قد تتضمن القائمة هذه المقالة؛ ولا تُحتسب إشعارات السحب). تعني \"–\" أن الفحص لم يتم (لا يوجد ORCID، أو الاسم لا يطابق OpenAlex، أو OpenAlex غير متاح، أو النتائج أكثر من أن تُعد)، ولا تعني صفرًا. كل هذه البيانات، ومعدل الاستشهاد لعامين، موجودة أيضًا في تصدير Excel (Author Retractions هو الأعلى بين الاثنين؛ ويُترك فارغًا إذا تعذّر فحص أحدهم ولم يكن لدى أي منهم مقالة مسحوبة).",
        ref: null
    },
    {
        label: "J = معلومات المجلة",
        description: "انقر على J لعرض المجلة: الاسم الكامل وISSN المطبوع والإلكتروني وNLM ID (مع رابط إلى NLM Catalog) وSJR وTop-J. ومن بيانات Journal Ranking في الإضافة: ترتيب المجلة وعدد مقالاتها المضافة إلى PubMed هذا العام؛ والنمو مقارنةً بالأشهر نفسها من العام الماضي؛ ونسب Medline والنص الكامل المجاني وORCID لهذا العام؛ وعدد المقالات المسحوبة: مقالات المجلة من أي سنة نشر، التي سجّلها PubMed مسحوبةً في الأشهر نفسها من هذا العام والعام الماضي (أو المسودات المسحوبة لخوادم المسودات). تظهر الأسطر نفسها في Report. يضيف OpenAlex بلد المجلة والناشر وحالة الوصول المفتوح وDOAJ ورسوم APC ومؤشر h ومتوسط الاستشهادات لعامين وسنة البدء؛ ويُستعلم عنه مرة واحدة لكل مجلة عند فتح J أو Report. تبدأ اللوحة بعنوان المقالة ونوع النشر، ويتضمن سطر SJR أفضل ربع للمجلة.",
        ref: "https://tomlaheyh.github.io/citation-bar/journal-ranking/journal-ranking.html"
    },
    {
        label: "Top-J = مجلة بارزة",
        description: "قائمتي المختارة لأبرز المجلات الطبية، بما في ذلك المجلات المرتبطة تحت مظلة الناشر نفسه (مثل عائلة JAMA). تتم المطابقة عبر ISSN — ويُعرض \"Yes\" إذا طابقت المجلة. القائمة صغيرة وانتقائية جدًا عن قصد. القائمة الحالية: Annals of Internal Medicine، وBritish Medical Journal (BMJ)، وEuropean Heart Journal، وJournal of the American College of Cardiology، وJAMA، وLancet، وNature، وNew England Journal of Medicine. أرحّب بالاقتراحات، لكنها مصممة لتكون قائمة مختصرة للغاية.",
        ref: null
    },
    {
        label: "SJR = تصنيف SCImago للمجلات (SCImago Journal Rank)",
        description: "تصنيف مجلات مجاني يحظى باحترام واسع. يقيس SCImago Journal Rank (SJR) حضور المجلة باستخدام خوارزمية مشابهة لخوارزمية PageRank™ من Google. وSCImago مجموعة بحثية تابعة لعدة جامعات إسبانية والمجلس الأعلى للبحث العلمي (CSIC)، متخصصة في تحليل المعلومات وتصويرها. تُنشر التصنيفات الجديدة مرة واحدة في السنة (عادةً في أبريل). حيثما يوفّره SCImago، يظهر أفضل ربع للمجلة (من Q1 إلى Q4) في نص التلميح ولوحة J و Report وتصدير \"Excel\". يصنّف SCImago المجلة ضمن كل مجال من مجالاتها الموضوعية، وهذا أفضل تلك الأرباع: Q1 تعني أعلى 25% في مجال واحد على الأقل.",
        ref: "https://www.scimagojr.com/aboutus.php"
    },
    {
        label: "YTD = مقالات المجلة منذ بداية العام",
        description: "عدد المقالات التي نشرتها هذه المجلة (حسب ISSN) خلال الفترة التي تغطيها بيانات الترتيب في الإضافة. أجلب جميع بيانات PubMed (شهريًا عادةً) وأرتّب المجلات حسب إجمالي المقالات والمقالات المجانية والمقالات المفهرسة في Medline خلال العام. تُرفق بيانات الترتيب هذه مع الإضافة وتُحدَّث مع كل إصدار، لذا تغطي الأرقام الفترة المذكورة في ملف الترتيب. عندما كنت أتعلم PubMed، كان شيء كهذا سيفيدني كثيرًا — وآمل أن يفيدك أيضًا.",
        ref: null
    },
    {
        label: "Medline % = نسبة مقالات المجلة المفهرسة في Medline منذ بداية العام",
        description: "نسبة مقالات المجلة (حسب ISSN) التي فُهرست في Medline خلال الفترة نفسها. وهي من بيانات الترتيب الخاصة بي. لاحظ أن هذا يعكس الفهرسة لا جودة المجلة: فالمقالات المنشورة حديثًا قد لا تكون مفهرسة بعد، لذا قد تُظهر مجلة كثيرة النشر نسبة أقل من معدلها النهائي.",
        ref: null
    },
    {
        label: "Free % = نسبة مقالات المجلة ذات النص الكامل المجاني منذ بداية العام",
        description: "نسبة مقالات المجلة (حسب ISSN) المتاحة بنص كامل مجاني خلال الفترة نفسها. وهي من بيانات الترتيب نفسها التي يأتي منها عدد YTD ونسبة Medline %.",
        ref: null
    },
    {
        label: "Xout = بحث مع الاستبعاد",
        description: "يعيد البحث في PubMed مع مرشحات لاستبعاد الأبحاث غير الأولية. يفتح مربع حوار تُملأ فيه عملية بحثك الحالية مسبقًا، مع مربعات اختيار لاستبعاد أنواع منشورات تمثل مجتمعةً نحو 25% من جميع مقالات PubMed:\n\n<ul>\n<li><strong>Has Abstract:</strong> يشترط أن يكون للمقالات ملخص (موصى به — نادرًا ما تكون المقالات بلا ملخص أبحاثًا أولية خضعت لمراجعة الأقران)</li>\n<li><strong>No Retracted Publications:</strong> يستبعد المقالات المسحوبة وإشعارات سحبها</li>\n<li><strong>No Published Errata:</strong> يستبعد إشعارات التصحيح/الاستدراك</li>\n<li><strong>No Letters:</strong> يستبعد الرسائل إلى المحرر</li>\n<li><strong>No Editorials:</strong> يستبعد المقالات الافتتاحية</li>\n<li><strong>No Comments:</strong> يستبعد مقالات التعليق</li>\n<li><strong>No Systematic Reviews:</strong> يستبعد المراجعات المنهجية</li>\n<li><strong>No Meta-Analyses:</strong> يستبعد التحليلات التلوية</li>\n<li><strong>No Reviews:</strong> يستبعد مقالات المراجعة</li>\n</ul>\n\nجميع المرشحات محددة افتراضيًا. ألغِ تحديد أي مرشح للسماح بمرور ذلك النوع. تتحدّث معاينة الاستعلام الكامل مباشرةً أثناء ضبط المرشحات. يمكنك البحث مباشرةً (في علامة التبويب الحالية)، أو نسخ الاستعلام، أو الإلغاء. يعرض View Expanded بحثك بجانب قراءة PubMed له (ترجمة الاستعلام من E-utilities)، لترى كيف وسّع التعيين التلقائي للمصطلحات الكلمات غير الموسومة.",
        ref: null
    },
    {
        label: "kS = عمليات البحث الرئيسية",
        description: "عمليات بحث جاهزة في PubMed عن موضوعات غزيرة النشر أو سريعة النمو، مجمّعة حسب المجال. انقر kS لعرض المجموعات، ثم أشِر إلى مجموعة أو انقرها لعرض عمليات البحث فيها، ثم انقر عملية بحث لفتحها في علامة تبويب جديدة. تشترط كل عملية بحث أن يكون الموضوع هو الموضوع الرئيسي للمقالة (MeSH Major Topic أو العنوان) وأن يكون للمقالة ملخص، وتستبعد المقالات المسحوبة وإشعارات سحبها وإشعارات التصحيح والرسائل والمقالات الافتتاحية والتعليقات. تبقى المراجعات والمراجعات المنهجية والتحليلات التلوية. يظهر الاستعلام الكامل في مربع البحث في PubMed. أسماء المجموعات وعمليات البحث بالإنجليزية لأن مصطلحات البحث بالإنجليزية. يضيف صف Years في أسفل القائمة إلى البحث حدًا متحركًا لتاريخ النشر، مثل \"last 5 years\"[dp] لآخر سنة أو 5 أو 10 سنوات، أو لا شيء مع All. وهو جزء من الاستعلام، لذا يبقى عند نسخ الاستعلام. يُحفَظ اختيارك.",
        ref: null
    },
    {
        label: "pR = تقارير PubMed (نظرات عامة رئيسية)",
        description: "يفتح قائمة بثماني أدوات لتقارير PubMed على موقع PubMed Citation Bar: PubMed Summary Report (نظرة عامة على بحث في PubMed)، وPubMed Filters Report (تحليل المرشحات)، وPubMed MeSH Counts (أعداد تكرار مصطلحات MeSH)، وPubMed Journal Ranking (بيانات ترتيب المجلات)، وPubMed Drift Report (التغيرات اليومية في مقاييس حالة الاستشهادات في PubMed)، وPubMed ORCID Ranking (معرّفات ORCID الموجودة في أكبر عدد من مقالات PubMed كل عام)، وPubMed ROR Ranking (ترتيب المؤسسات حسب المقالات المضافة هذا العام، وفق انتماءات المؤلفين)، وPubMed iCite Citation Gains (المقالات المضافة خلال آخر 36 شهرًا الأكثر اكتسابًا للاستشهادات خلال آخر 12 شهرًا). تُفتح كل منها في علامة تبويب جديدة.",
        ref: "https://tomlaheyh.github.io/citation-bar/"
    },
    {
        label: "/Report = تقرير الاستشهادات",
        description: "تقرير يسرد جميع المقاييس والروابط الرئيسية للمقالة بصيغة سهلة النسخ. يصدّر زران في النافذة المنبثقة صفحة النتائج كاملة: \"Excel\" يعطي جدولًا مفصولًا بعلامات الجدولة لما يعرضه الشريط تمامًا — صف واحد لكل مقالة، جاهز للصق مباشرة في Excel أو Google Sheets — بينما \"البيانات\" يُفرغ كل شيء: أرقام PMID أولًا، ثم جميع المقاييس والطوابع الزمنية للإضافة والحقول الداخلية. ويمثل الزر الثاني إفصاحًا كاملًا عن جميع البيانات التي تستخدمها الإضافة. لا يوجد أي تتبّع للمستخدمين.\n\nملاحظة: تُجلب معرّفات ORCID ومؤشر h ومؤشر i10 للمؤلف الأول والأخير لكل مقالة، وتُضمَّن في تصدير \"Excel\" و\"البيانات\". أما بعض البيانات الأخرى فلا تُجلب إلا عند النقر على عنصر في الشريط، لأن جلبها لكل مقالة سيستغرق وقتًا طويلًا. ويشمل ذلك الملخصات (Abstract)، والمنح، وانتماءات المؤلفين. ولا تُضمَّن هذه البيانات في التصدير.",
        ref: null
    },
    {
        label: "الذاكرة = الذاكرة المتاحة في النظام (تتحول إلى الأحمر عند انخفاضها)",
        description: "تظهر في أسفل النافذة المنبثقة للإضافة. يحتفظ Chrome (وليس الإضافة) بأحدث صفحاتك في علامة التبويب في الذاكرة ليكون زر الرجوع فوريًا، وتميل علامة التبويب المستخدمة لعمليات بحث كثيرة إلى الاحتفاظ بمزيد من الذاكرة مع الوقت. يحدث هذا بوجود هذه الإضافة أو بدونها؛ ويضيف شريط الاستشهادات حصته الخاصة في كل صفحة.<br><br>لمنع تراكم ذلك، تعيد الإضافة فتح علامة التبويب على الصفحة نفسها بعد أن يعمل شريط الاستشهادات ست مرات. تبقى على النتائج التي كنت تشاهدها ولا حاجة لإعادة كتابة أي شيء؛ وما تخسره هو سجل الرجوع لتلك العلامة، وهو ثمن معقول مقابل الذاكرة التي يحررها. ولا يفعل ذلك أبدًا في منتصف «فحص 1,000»، أو أثناء وجودك في صفحة نتائج «عالي التأثير فقط» أو «فحص 1,000».<br><br>يتحول سطر الذاكرة إلى الأحمر عندما تنخفض الذاكرة المتاحة عن 2 GB، وهو الحد الذي يبدأ عنده Chrome بالتعثر على أي جهاز مهما كان حجمه. عندها يكفي عادةً إغلاق التطبيقات التي لا تستخدمها. كما يمسح زر «إعادة ضبط الإضافة» البيانات المخزنة للإضافة وذاكرة Chrome المؤقتة ويعيد فتح علامة التبويب، إذا أردت فعل ذلك يدويًا. يمسح Reset Extension بيانات المواقع لصفحات PubMed و NCBI فقط. أما بيانات المواقع الأخرى وسجلّ التصفح وملفات تعريف الارتباط وكلمات المرور فلا تُمس.",
        ref: null
    },
    {
        label: "أيقونة النسخ (النافذة المنبثقة) = مرجع هذا البحث",
        description: "تنسخ أيقونة النسخ الصغيرة في بداية سطر الاقتباس أعلى النافذة المنبثقة مرجعًا لبحث PubMed في علامة التبويب الحالية: قاعدة البيانات وتاريخ البحث والاستعلام كما نُفِّذ ومرشحات الشريط الجانبي وعدد النتائج والرابط. وهي تتبع PRISMA-S، معيار الإبلاغ عن عمليات البحث في الأدبيات. التاريخ مهم لأن MeSH والتعيين التلقائي للمصطلحات في PubMed يتغيران مع الوقت، فقد يعطي البحث نفسه نتائج مختلفة لاحقًا. النص المنسوخ بالإنجليزية لاستخدامه في الأبحاث والبروتوكولات.",
        ref: null
    }
];

export const helpItemsBn = [
    {
        label: "Retracted = PMID এবং প্রত্যাহারের (Retraction) PMID (ক্লিক করলে)",
        description: "নিবন্ধটি বৈজ্ঞানিক সাহিত্য থেকে প্রত্যাহার (retract) করা হয়েছে কি না তা দেখায়।",
        ref: "https://www.nlm.nih.gov/bsd/policy/errata.html"
    },
    {
        label: "* = উচ্চ প্রভাবসম্পন্ন নিবন্ধ (সবুজ ব্যাকগ্রাউন্ড)",
        description: `কোনো নিবন্ধের স্কোর আপনার নির্ধারিত সীমা (থ্রেশহোল্ড) ছুঁলে সেটিকে উচ্চ প্রভাবসম্পন্ন (সবুজ ব্যাকগ্রাউন্ড) হিসেবে চিহ্নিত করা হয় (ডিফল্ট: 5, এক্সটেনশনের সেটিংসে পরিবর্তনযোগ্য)। স্কোরটি এভাবে হিসাব করা হয়:

${SCORE_CODE}`,
        ref: null
    },
    {
        label: "Overall Score = নিবন্ধের সংখ্যাভিত্তিক মান স্কোর",
        description: "সামগ্রিক স্কোর একটি হিসাবকৃত মান, যা একাধিক বিষয়ের ভিত্তিতে নিবন্ধের মান নির্দেশ করে: MEDLINE ইনডেক্সিং, সাইটেশন সংখ্যা, Relative Citation Ratio (RCR), জার্নালের SJR র‍্যাঙ্কিং, ট্রেন্ডিং অবস্থা এবং প্রভাবশালী সাইটেশন। স্কোরটি সাইটেশন রিপোর্টের শুরুতে দেখানো হয় এবং একটি নিবন্ধের প্রভাব ও গুরুত্ব দ্রুত যাচাই করতে সাহায্য করে।",
        ref: null
    },
    {
        label: "BN = বারের হোভার টেক্সটের ভাষা",
        description: "? চিহ্নের পরের ছোট বাদামি ট্যাগটি বারের হোভার টেক্সটের ভাষা দেখায় (EN = English, ES = Español, ZH = 中文, JA = 日本語, KO = 한국어, FR = Français, HI = हिन्दी, AR = العربية, BN = বাংলা, PT = Português)। ভাষা বেছে নিতে এতে ক্লিক করুন; কোনো ডেটা আবার লোড না করেই বারগুলো সঙ্গে সঙ্গে নতুন করে আঁকা হয়, এবং আপনার পছন্দ মনে রাখা হয়। আপনি বেছে না নেওয়া পর্যন্ত এটি Chrome-এর ভাষা অনুসরণ করে। এই সাহায্য প্যানেল এবং এক্সটেনশনের পপআপ (-সাইটেশন বার চালু- বোতামের পাশের ভাষা বোতাম) একই পছন্দ অনুসরণ করে। ইংরেজি ছাড়া অন্য কোনো ভাষা বেছে নিলে সার্চের ফলাফলের শিরোনাম ও স্নিপেটও অনুবাদ হয়, আপনার কম্পিউটারে Chrome-এর বিল্ট-ইন অনুবাদক ব্যবহার করে (Chrome 138 বা পরবর্তী সংস্করণ; প্রথমবার ট্যাগে একবার ক্লিক করার পর Chrome ভাষাটি ডাউনলোড করে)। পেজের ওপর থেকে একবারে 25টি করে ফলাফল অনুবাদ হয়, একটি স্ট্যাটাস বক্সে অগ্রগতি দেখায়, এবং Show more দিয়ে যোগ হওয়া ফলাফলগুলো দেখা দেওয়ার সঙ্গে সঙ্গেই অনুবাদ হয়। ইংরেজিটি দেখতে অনূদিত শিরোনাম বা স্নিপেটের ওপর হোভার করুন। বারের নিজের টেক্সট সবসময় ইংরেজিতেই থাকে।",
        ref: null
    },
    {
        label: "অন্যান্য ভাষা = নিজের ভাষায় PubMed ব্যবহার",
        description: `PubMed-এর পেজ ও সার্চ ইংরেজিতে। নিজের ভাষায় এগুলো পড়ার দুটি উপায় আছে, এবং সাইটেশন বার দুটোর সঙ্গেই কাজ করে:

<ul>
<li><strong>বারের ভাষা ট্যাগ</strong> (BN, ওপরে): বারের হোভার টেক্সট, এই সাহায্য, এক্সটেনশনের পপআপ এবং সার্চের ফলাফলের শিরোনাম ও স্নিপেট অনুবাদ করে। অনুবাদটি Chrome আপনার কম্পিউটারেই করে; কিছুই অন্য কোথাও পাঠানো হয় না।</li>
<li><strong>Chrome-এর নিজস্ব পেজ অনুবাদ</strong> (রাইট-ক্লিক → Translate, অথবা অ্যাড্রেস বারের অনুবাদ আইকন; Edge-এও একই সুবিধা আছে): পুরো PubMed পেজটি ব্রাউজারে উপলব্ধ যেকোনো ভাষায় অনুবাদ করে। বারের টেক্সট ইংরেজিতেই থাকে যাতে এটি এক লাইনে থাকে, MeSH টার্ম ও কীওয়ার্ড ঠিক যেভাবে PubMed ইনডেক্স করে সেভাবেই থাকে, এবং অ্যাবস্ট্রাক্ট উইন্ডো অনুবাদের নিচে মূল ইংরেজি দেখায়। ব্রাউজার যখন পেজ অনুবাদ করছে, তখন বারের নিজস্ব ফলাফল-অনুবাদ সরে দাঁড়ায়, যাতে কিছুই দুবার অনুবাদ না হয়।</li>
</ul>

পেজ যেভাবেই অনুবাদ করা হোক, এক্সপোর্ট, Google Scholar লিংক এবং নিবন্ধের রিপোর্ট সবসময় PubMed-এর ইংরেজি শিরোনাম ব্যবহার করে। PubMed সার্চ শুধু ইংরেজি বোঝে, তাই ইংরেজি টার্ম দিয়ে সার্চ করুন। Google Translate ওয়েবসাইটের PubMed সংস্করণ (যে ঠিকানার শেষে translate.goog থাকে) সমর্থিত নয়: বার শুধু pubmed.ncbi.nlm.nih.gov-এ চলে, তাই এর বদলে ব্রাউজারের নিজস্ব অনুবাদ ব্যবহার করুন।`,
        ref: null
    },
    {
        label: "doi = DOI Lookup-এ নিবন্ধটি খুলুন",
        description: "নিবন্ধের DOI-টি DOI Lookup (doilookup.com)-এ খোলে — এটি একটি বিনামূল্যের ওয়েবসাইট, যা এক ডজন উৎস থেকে প্রত্যাহার, সাইটেশন, জার্নাল মেট্রিক এবং ওপেন অ্যাক্সেস যাচাই করে। একাধিক DOI সংগ্রহ করে (সর্বোচ্চ 15টি) একসঙ্গে দেখা যায়। নিবন্ধের DOI না থাকলে লিংকটি ধূসর দেখায়।",
        ref: "https://doilookup.com/"
    },
    {
        label: "MeSH+ = নিবন্ধের MeSH টার্ম ও কীওয়ার্ড",
        description: "দুটি তালিকা দেখায়। MeSH (Medical Subject Headings) হলো NLM-এর নিয়ন্ত্রিত বিষয়-ট্যাগ, যা MEDLINE রেকর্ডে দেওয়া হয় (বারে m দিয়ে চিহ্নিত); অন্য রেকর্ডে 'No MeSH data' দেখায়। কীওয়ার্ড হলো নিবন্ধের নিজস্ব টার্ম, সাধারণত লেখকদের দেওয়া (Author keywords)। NLM-এর মতো কোনো ইনডেক্সার মাঝে মাঝে যেসব কীওয়ার্ড যোগ করে, সেগুলো নিজস্ব শিরোনামের নিচে আলাদাভাবে তালিকাভুক্ত হয়। কীওয়ার্ড কোনো নিয়ন্ত্রিত শব্দভান্ডার নয়, তবে এগুলো প্রায়ই এমন নতুন ধারণার নাম দেয় যা MeSH-এ এখনও নেই, এবং PubMed-এ [ot] ট্যাগ দিয়ে এগুলো সার্চ করা যায়। MeSH টার্ম ও কীওয়ার্ড কখনো মেশিনে অনুবাদ করা হয় না: ব্রাউজার পেজ অনুবাদ করার সময়ও এগুলো ঠিক যেভাবে PubMed ইনডেক্স করে সেভাবেই থাকে, তাই এগুলো সরাসরি PubMed সার্চে কপি করা যায়।",
        ref: "https://www.nlm.nih.gov/mesh/meshhome.html"
    },
    {
        label: "n = নতুন, 2 বছরের কম পুরোনো",
        description: "PubMed-এর তৈরির তারিখ [crdt]-এর ভিত্তিতে, অর্থাৎ যখন নিবন্ধটি প্রথম সিস্টেমে যুক্ত হয়েছিল। প্রকাশের তারিখ মাঝে মাঝে বদলাতে পারে, কিন্তু এই তারিখ বদলায় না।",
        ref: null
    },
    {
        label: "t = PubMed Trending অনুযায়ী ট্রেন্ডিং নিবন্ধ",
        description: "ট্রেন্ডিং PubMed-এর শীর্ষ 1,000টি নিবন্ধের ওপর ভিত্তি করে। আসল যুক্তি প্রকাশ্য নয় (NIH নীতি অনুযায়ী), তবে \"নতুন এবং অনেকবার দেখা হয়েছে\" ভাবলে আপনি কাছাকাছিই থাকবেন।",
        ref: "https://pubmed.ncbi.nlm.nih.gov/trending/"
    },
    {
        label: "m = PubMed অনুযায়ী Medline-এ ইনডেক্স করা",
        description: "নির্দেশ করে যে নিবন্ধটি Medline-এ ইনডেক্স করা হয়েছে।",
        ref: "https://www.nlm.nih.gov/medline/medline_overview.html"
    },
    {
        label: "p = প্রিপ্রিন্ট",
        description: "নির্দেশ করে যে নিবন্ধটি একটি প্রিপ্রিন্ট (এখনও পিয়ার-রিভিউ হয়নি)। প্রিপ্রিন্টের মাধ্যমে গবেষকেরা আনুষ্ঠানিক পিয়ার রিভিউর আগেই দ্রুত তাঁদের ফলাফল শেয়ার করতে পারেন। এগুলো গবেষণায় আগাম প্রবেশাধিকার দিলেও সতর্কভাবে ব্যাখ্যা করা উচিত, কারণ এগুলো কঠোর পিয়ার রিভিউ প্রক্রিয়ার মধ্য দিয়ে যায়নি।",
        ref: "https://pmc.ncbi.nlm.nih.gov/about/nihpreprints/"
    },
    {
        label: "e = erratum (সংশোধনী), E = উদ্বেগ প্রকাশ",
        description: "নিবন্ধের আপডেট বা সংশোধন থাকতে পারে — এটি প্রত্যাহার নয়। প্রায় 1% নিবন্ধে সংশোধনী থাকে। ক্লিক করলে মূল PMID এবং সংশোধনীর PMID দুটোই দেখায়। একই জায়গায় মোটা E মানে জার্নাল একটি expression of concern (উদ্বেগ প্রকাশ) প্রকাশ করেছে: এটি নিবন্ধ সম্পর্কে আনুষ্ঠানিক সতর্কতা, তবে প্রত্যাহার নয়। কোনো নিবন্ধে দুটোই থাকলে E দেখানো হয় এবং হোভার টেক্সটে সংশোধনীর কথাও বলা থাকে; ক্লিক করলে মূল নিবন্ধ, উদ্বেগের নোটিশ ও সংশোধনী দেখায়। নোটিশটিতেও E দেখায়। Report এবং \"Excel\" এক্সপোর্টে দুটো আলাদাভাবে থাকে।",
        ref: "https://www.nlm.nih.gov/bsd/policy/errata.html"
    },
    {
        label: "Cited = iCite (NIH) বা Europe PMC থেকে সাইটেশন সংখ্যা",
        description: "iCite থেকে সাইটেশন সংখ্যা, যা NIH সরবরাহ করে — সেই একই সরকারি সংস্থা যারা PubMed পরিচালনা করে। সাইটেশন সংখ্যার কয়েকটি উৎস আছে, PubMed নিজেও তার একটি, তবে আমার মতে সার্বিকভাবে iCite-ই সবচেয়ে উপযুক্ত। মাঝে মাঝে iCite বন্ধ বা ধীর থাকতে পারে; তখন আমি Europe PMC থেকে সাইটেশন সংখ্যা নিই — এটি EMBL-EBI এবং একদল গবেষণা-অর্থায়নকারী সংস্থা মিলে পরিচালিত একটি দীর্ঘদিনের সাহিত্য ডেটাবেস।",
        ref: "https://icite.od.nih.gov/"
    },
    {
        label: "চার্ট আইকন (Cited-এর পরে) = মাস অনুযায়ী সাইটেশন, গত 12 মাস (iCite)",
        description: "নিবন্ধের মাসিক ডেটা থাকলে আইকনটি নীল: ক্লিক করলে গত 12 মাসে iCite-এ এর সাইটেশনের চার্ট খুলবে। প্রথম বারটি শুরুতে সাইটেশনের সংখ্যা; এরপর প্রতিটি মাস আগের মোটের ওপর সেই মাসে পাওয়া সাইটেশন যোগ করে, আর সেই সংখ্যা বারের ওপরে লেখা থাকে। লাল ড্যাশ দেওয়া বাক্স সেই মাস দেখায় যখন iCite সংখ্যা কমিয়েছে (সংশোধন)। কোনো বারের ওপর মাউস রাখলে তার সংখ্যাগুলো দেখা যায়।\n\nধূসর মানে নিবন্ধটির মাসিক ডেটা নেই। চার্টে শুধু সেই নিবন্ধগুলো আছে যেগুলো গত 36 মাসে PubMed-এ যোগ হয়েছে এবং গত 12 মাসে সবচেয়ে বেশি সাইটেশন পাওয়া 40,000টির মধ্যে রয়েছে, তাই পুরোনো প্রতিষ্ঠিত নিবন্ধগুলো বেশি সাইটেশন থাকলেও এতে নেই। ডেটা NIH iCite-এর মাসিক স্ন্যাপশট থেকে আসে এবং মাসে একবার হালনাগাদ হয়; পূর্ণ তালিকা PubMed iCite Citation Gains রিপোর্টে আছে।",
        ref: "https://tomlaheyh.github.io/citation-bar/icite/icite.html"
    },
    {
        label: "RCR = iCite থেকে Relative Citation Ratio",
        description: "Relative Citation Ratio (RCR) হলো iCite-এর একটি পরিমাপ, যার সংজ্ঞা: \"প্রতিটি পেপারের বছরপ্রতি সাইটেশন, একই ক্ষেত্র ও বছরের NIH-অর্থায়িত পেপারগুলোর বছরপ্রতি সাইটেশনের সাপেক্ষে নর্মালাইজ করা।\" এটি সাইটেশনভিত্তিক বৈজ্ঞানিক প্রভাবের একটি পরিমাপ। iCite উপলব্ধ না থাকলে RCR \"-\" দেখায়, কারণ এটি iCite-এর নিজস্ব পরিমাপ, যা অন্য কোনো উৎসে পাওয়া যায় না। জায়গা বাঁচাতে RCR ৯৯-এর বেশি হলে বারে তা পূর্ণসংখ্যায় (রাউন্ড করে) দেখানো হয় (123.4 হয় 123)। Report ও এক্সপোর্টে পুরো মানটিই থাকে।",
        ref: "https://support.icite.nih.gov/hc/en-us/articles/9062490125083-Metrics"
    },
    {
        label: "IC = Semantic Scholar থেকে প্রভাবশালী সাইটেশন (Influential Citations)",
        description: "Semantic Scholar সেইসব সাইটেশন চিহ্নিত করে যেখানে উদ্ধৃত প্রকাশনাটি উদ্ধৃতকারী প্রকাশনার ওপর উল্লেখযোগ্য প্রভাব ফেলে। প্রভাবশালী সাইটেশন একটি মেশিন-লার্নিং মডেলের মাধ্যমে নির্ধারিত হয়, যা সাইটেশনের সংখ্যা এবং প্রতিটির আশপাশের প্রসঙ্গসহ বিভিন্ন বিষয় বিশ্লেষণ করে। পাওয়া না গেলে \"-\" দেখায়।",
        ref: "https://www.semanticscholar.org/faq#influential-citations"
    },
    {
        label: "Alt = Altmetric স্কোর",
        description: "Altmetric Attention Score নির্দেশ করে একটি গবেষণা-আউটপুট কতটা মনোযোগ পেয়েছে, যার মধ্যে সোশ্যাল মিডিয়া, সংবাদ এবং নীতি-সংক্রান্ত নথি রয়েছে। স্কোরটি একটি স্বয়ংক্রিয় অ্যালগরিদম থেকে আসে এবং মনোযোগের একটি ভারযুক্ত (weighted) গণনা নির্দেশ করে। লিংকটি সরাসরি নিবন্ধের Altmetric পেজে নিয়ে যায়।",
        ref: "https://help.altmetric.com/en/articles/9800513"
    },
    {
        label: "s = PubMed থেকে অনুরূপ নিবন্ধ",
        description: "PubMed থেকে অনুরূপ নিবন্ধের একটি তালিকা। যেকোনো PubMed নিবন্ধের পেজে ডান দিকের সাইডবারে \"Similar Articles\"-এ ক্লিক করেও এগুলো দেখতে পারেন।",
        ref: "https://www.ncbi.nlm.nih.gov/guide/howto/find-articles-similar/"
    },
    {
        label: "c = PubMed থেকে উদ্ধৃতকারী নিবন্ধ",
        description: "PubMed থেকে সেইসব নিবন্ধের তালিকা যেগুলো এই নিবন্ধটিকে সাইট করেছে। লক্ষ করুন, এটি iCite থেকে সামান্য আলাদা হতে পারে, কারণ দুটি ভিন্ন সিস্টেম ও পদ্ধতি ব্যবহার করে। ভবিষ্যতে NIH-এর মনোযোগ iCite-এর ওপর, তবে উদ্ধৃতকারী নিবন্ধ দেখার সহজ উপায় হিসেবে PubMed এখনও এটি দেয়।",
        ref: "https://pubmed.ncbi.nlm.nih.gov/help/#cited-by"
    },
    {
        label: "Gsch = DOI-এর মাধ্যমে Google Scholar",
        description: "Google Scholar নিবন্ধের জন্য একটি চমৎকার রেফারেন্স রিসোর্স, যার নিজস্ব সাইটেশন সংখ্যাও আছে (যা কিছুটা বাড়তি হতে পারে)। Google Scholar-এ কোনো নিবন্ধ খোঁজার সবচেয়ে ভালো উপায় তার DOI (Digital Object Identifier) — একটি অনন্য স্ট্রিং, যা নিবন্ধকে শনাক্ত করে এবং একটি স্থায়ী ওয়েব ঠিকানা দেয়। আমি PubMed নিবন্ধের DOI (97%-এর একটি আছে) ব্যবহার করে সরাসরি Google Scholar-এ লিংক করি।",
        ref: "https://scholar.google.com/intl/en/scholar/about.html"
    },
    {
        label: "Con = Connections সাইটেশন গ্রাফ (doilookup.com)",
        description: "Connections doilookup.com-এ নিবন্ধটির একটি ইন্টারঅ্যাকটিভ সাইটেশন গ্রাফ খোলে, যা OpenAlex-এর ডেটা দিয়ে তৈরি। এটি তিনটি ভিউ দেখায় — নিবন্ধটি যেসব রেফারেন্স সাইট করেছে (Inside), যেসব পেপার এটিকে সাইট করেছে (Outside), এবং দুটি মিলিয়ে Mix — যেখানে বাবলগুলো জার্নালের মান অনুযায়ী রঙে চিহ্নিত এবং বিনামূল্যের পূর্ণ টেক্সট থাকলে ট্যাগ করা; যেকোনো পেপারে ক্লিক করলে তার শিরোনাম, জার্নাল, বছর, সাইটেশন সংখ্যা ও অ্যাবস্ট্রাক্ট দেখা যায়। যেকোনো পেপারকে কেন্দ্রে এনে গ্রাফ নতুন করে সাজাতে পারেন, অথবা বহু-স্তরের সম্প্রসারণ চালাতে পারেন, যা বৃহত্তর পরিসরে মৌলিক ও সবচেয়ে বেশি সহ-উদ্ধৃত (co-cited) কাজগুলো তুলে আনে।",
        ref: "https://doilookup.com/"
    },
    {
        label: "Abstract = অ্যাবস্ট্রাক্ট (দেখতে ক্লিক করুন)",
        description: "অ্যাবস্ট্রাক্ট হলো নিবন্ধের একটি সংক্ষিপ্ত বিবরণ, যা সাম্প্রতিক প্রায় 95% জার্নাল নিবন্ধে থাকে। সাধারণত এটি পড়তে নিবন্ধটি খুলতে হয় — এর মাধ্যমে সার্চের ফলাফল থেকে না সরেই দ্রুত অ্যাবস্ট্রাক্ট দেখা যায়। নিবন্ধে সহজ ভাষার সারাংশ (plain-language summary) থাকলে তা অ্যাবস্ট্রাক্টের নিচে দেখানো হয় (অ্যাবস্ট্রাক্ট না থাকলে তার জায়গায়)। PubMed-এ অন্য ভাষাতেও অ্যাবস্ট্রাক্ট থাকলে, একটি নোটে সেগুলোর তালিকা এবং নিবন্ধের লিংক দেওয়া হয়, যেখানে অ্যাবস্ট্রাক্টের ওপরে ভাষা বেছে নেওয়া যায়। অ্যাবস্ট্রাক্টের ওপরের একটি Translate সারি Chrome-এর বিল্ট-ইন অনুবাদক দিয়ে শিরোনাম, অ্যাবস্ট্রাক্ট ও সহজ ভাষার সারাংশ অনুবাদ করে: বারের ভাষার জন্য একটি ক্লিক, অথবা যেকোনো ভাষার কোড টাইপ করুন। বারের ভাষা ইংরেজি না হলে অ্যাবস্ট্রাক্ট আগে থেকেই অনূদিত অবস্থায় খোলে। তুলনার জন্য নিচে মূল ইংরেজি দেখানো হয়, এবং Show original আবার মূলে ফিরিয়ে নেয়। ব্রাউজার যদি আগে থেকেই পুরো পেজ অনুবাদ করতে থাকে, তাহলে অ্যাবস্ট্রাক্ট ব্রাউজারের অনুবাদ অনুসরণ করে, নিচে মূল ইংরেজিসহ।\n\nপূর্ণ পাঠ: অ্যাবস্ট্রাক্টের নিচে একটি বিভাজক রেখার পরে একটি লাইন জানায় নিবন্ধের পূর্ণ পাঠ এখানে দেখানো যাবে কি না, আর দেখানো গেলে তার পরেই পূর্ণ পাঠ থাকে। এটি স্বয়ংক্রিয়ভাবে লোড হয়। ওপেন-অ্যাক্সেস নিবন্ধ Europe PMC থেকে এক-দুই সেকেন্ডে আসে; PubMed Central (PMC) টেক্সট মাইনিংয়ের জন্য যে অন্যান্য বিনামূল্যের নিবন্ধ প্রকাশ করে, সেগুলো সরাসরি PMC থেকে আসে এবং কয়েক সেকেন্ড লাগতে পারে। পূর্ণ পাঠ দেখানো না গেলে (শুধু প্রকাশকের সাইটে বিনামূল্যে, অথবা PMC-তে বিনামূল্যে কিন্তু ওপেন অ্যাক্সেস নয়), লাইনটি যেখানে পড়া যাবে সেখানে লিংক দেয়। টেবিল সাধারণ লাইন হিসেবে এবং চিত্র তাদের ক্যাপশন দিয়ে দেখানো হয়, আর তথ্যসূত্র বাদ দেওয়া হয়। নিবন্ধের প্রকাশনার ধরন (যেমন Randomized Controlled Trial, Review বা Case Reports) শিরোনামের নিচে দেখায়।\n\nনোট: অ্যাবস্ট্রাক্ট কেবল Abstract-এ ক্লিক করলেই আনা হয়, তাই এটি \"Excel\" বা \"ডেটা\" এক্সপোর্টে থাকে না।",
        ref: "https://pubmed.ncbi.nlm.nih.gov/18830537/"
    },
    {
        label: "link = পূর্ণ টেক্সটের লিংক",
        description: "PubMed অ্যাবস্ট্রাক্ট ও মেটাডেটা দেয়, কিন্তু নিবন্ধের পূর্ণ টেক্সট দেয় না। এটি আসল নিবন্ধের লিংক দেয় (সাধারণত নিবন্ধের পেজের ওপরে ডান দিকে)। কিছু নিবন্ধের জন্য পেইড সাবস্ক্রিপশন লাগে — অনেক বিশ্ববিদ্যালয়ের লাইব্রেরির সাবস্ক্রিপশন আছে, তাই তাদের সিস্টেমে লগ-ইন করা থাকলে আপনি পেওয়ালের পেছনের নিবন্ধও পড়তে পারবেন। বিনামূল্যের সংস্করণ (যেমন, PMC) থাকলে আমি সেই লিংক দিই; না থাকলে প্রকাশকের পেজের লিংক দিই। লিংক বিনামূল্যের হলে সবুজ হয়: প্রথমে PMC, তারপর OpenAlex-এর মাধ্যমে পাওয়া বৈধ বিনামূল্যের কপি (প্রকাশকের ওপেন-অ্যাক্সেস পেজ বা কোনো রিপোজিটরির কপি), তারপর যেসব নিবন্ধ PubMed নিজেই বিনামূল্যের বলে চিহ্নিত করে। প্রিপ্রিন্টকে নিবন্ধের বিনামূল্যের কপি ধরা হয় না। বিনামূল্যের কপিটি কোন ধরনের, তা Report-এ লেখা থাকে।",
        ref: "https://www.ncbi.nlm.nih.gov/guide/howto/obtain-full-text/"
    },
    {
        label: "✓ = এক্সপোর্ট তালিকায় যোগ করুন (যোগ হলে সবুজ)",
        description: "দ্বিতীয় সারির শুরুর টিক চিহ্নটি একটি নিবন্ধকে আপনার এক্সপোর্ট তালিকায় যোগ করে। ধূসর মানে যোগ হয়নি, সবুজ মানে যোগ হয়েছে। সরাতে আবার ক্লিক করুন।\n\nনিবন্ধ যোগ করলে PubMed থেকে তার সম্পূর্ণ রেকর্ড আনা হয় — সব লেখক, ভলিউম, ইস্যু, পৃষ্ঠা, অ্যাবস্ট্রাক্ট ও MeSH টার্ম — তাই এ সময় টিক চিহ্নটি কিছুক্ষণ অ্যাম্বার রঙে জ্বলে-নেভে। আনা ব্যর্থ হলে টিক চিহ্নটি ধূসরই থাকে এবং কারণ জানায়; পেছনে কিছু না থাকা সত্ত্বেও সবুজ হয়ে যায় না।\n\n<strong>বাছাই থেকে যায়</strong>\n<ul>\n<li>ফলাফলের পৃষ্ঠা বদলালে বা নতুন সার্চ চালালেও নিবন্ধগুলো টিক দেওয়া থাকে, তাই এক্সপোর্টের আগে কয়েকটি সার্চ থেকে সংগ্রহ করতে পারেন</li>\n<li>সরিয়ে ফেলা নিবন্ধ আবার যোগ করা তাৎক্ষণিক — এর রেকর্ড রেখে দেওয়া হয়, তাই PubMed-কে দুবার জিজ্ঞেস করা হয় না</li>\n<li>সাইটেশন বার বন্ধ করলে তালিকাটি খালি হয়ে যায়</li>\n</ul>\n\nঅনুরোধগুলো এক সেকেন্ড ব্যবধানে পাঠানো হয়, তাই পৃষ্ঠার নিচ পর্যন্ত দ্রুত টিক দিলে সেগুলো সারিতে অপেক্ষা করে, NCBI-এর রেট লিমিট ছাড়িয়ে যায় না। একবারে একটি নিবন্ধে ক্লিক করলে কখনো অপেক্ষা করতে হয় না।",
        ref: null
    },
    {
        label: "চেকলিস্ট আইকন = এক্সপোর্ট তালিকা খুলুন",
        description: "টিক চিহ্নের পাশে চেকলিস্ট আইকনটি আপনার এক্সপোর্ট তালিকা খোলে। কিছু বাছাই না করা থাকলে এটি ধূসর, আর নিবন্ধ যোগ করলে একটি সংখ্যাসহ নীল হয় — সেই সংখ্যা পেজের প্রতিটি বারে একই।\n\nতালিকায় প্রতিটি নিবন্ধ তার শিরোনাম, জার্নাল, বছর ও PMID-সহ দেখায়, সঙ্গে সরানোর জন্য একটি ✕। আগের কোনো পেজে যোগ করা নিবন্ধ তাদের PMID হিসেবে দেখায়, কারণ তাদের বিবরণ আর স্ক্রিনে নেই।\n\n<strong>চারটি অ্যাকশন</strong>\n<ul>\n<li><strong>Clear all:</strong> তালিকা খালি করে</li>\n<li><strong>Open in new tab:</strong> বাছাই করা নিবন্ধগুলো একটি PubMed সার্চ হিসেবে নতুন ট্যাবে দেখায়, যাতে আপনি যে ফলাফলগুলো দেখছিলেন সেখানে আপনার জায়গা হারিয়ে না যায়</li>\n<li><strong>Download .ris:</strong> RIS ফরম্যাট — EndNote, Mendeley, RefWorks, Papers, Zotero</li>\n<li><strong>Download .nbib:</strong> MEDLINE ফরম্যাট — PubMed-এর নিজস্ব \"Send to → Citation manager\" যে ফাইল তৈরি করে, ঠিক সেটিই; Zotero ও EndNote</li>\n</ul>\n\nদুটি ডাউনলোডেই প্রতিটি নিবন্ধের সম্পূর্ণ রেকর্ড থাকে, অ্যাবস্ট্রাক্ট ও MeSH টার্মসহ। ফাইলের নামে তারিখ ও সময় থাকে (যেমন <code>pubmed-citations-2026-09-12-3-04pm.nbib</code>), তাই একদিনে কয়েকবার এক্সপোর্ট করলেও আগের ফাইল কখনো ওভাররাইট হয় না।\n\nPubMed একটি সার্চে সর্বোচ্চ 200টি নিবন্ধ গ্রহণ করে, তাই আপনার তালিকা এর চেয়ে বড় হলে \"Open in new tab\" প্রথম 200টি দেখায় — এমন হলে তালিকায় তা জানানো হয়। ডাউনলোডের কোনো সীমা নেই।\n\n<strong>PDF-সহ ZOTERO-তে পাঠানো</strong>\nZotero-র জন্য দুটি জিনিস লাগে এবং দুটোই প্রস্তুত থাকতে হবে: <strong>Zotero Connector</strong> ব্রাউজার এক্সটেনশন, এবং আপনার কম্পিউটারে খোলা <strong>Zotero ডেস্কটপ অ্যাপ</strong>।\n\nএগুলো থাকলে, আপনার তালিকা PubMed-এ খুলুন এবং কানেক্টরের ফোল্ডার আইকনে ক্লিক করুন। <strong>Select All</strong> বেছে নিন, তারপর <strong>OK</strong> — এটি সব নিবন্ধ একসঙ্গে সংরক্ষণ করে এবং আপনার বিদ্যমান জার্নাল অ্যাক্সেস ব্যবহার করে প্রতিটির PDF আনার চেষ্টা করে। ডাউনলোড করা ফাইল এটা পারে না, কারণ কানেক্টর আপনার নিজের ব্রাউজার সেশনে চলে।\n\nডেস্কটপ অ্যাপ খোলা না থাকলে, কানেক্টর এর বদলে আপনার zotero.org লাইব্রেরিতে সংরক্ষণের প্রস্তাব দেয়। Zotero বলে এটি \"কিছু পেজে\" কাজ করে, তাই এটি নির্ভরযোগ্য বিকল্প নয়।\n\n.nbib ও .ris ডাউনলোডের জন্য এর কিছুই লাগে না, এবং এগুলো EndNote, Mendeley ও RefWorks-এর সঙ্গেও কাজ করে।\n\n<div class='help-ai-pack'><strong>AI PACK (.ZIP) — এখনও উন্নতির কাজ চলছে</strong>\n<strong>AI pack (.zip)</strong> আপনার তালিকার নিবন্ধগুলো (সর্বোচ্চ 40টি) একটি zip ফাইলে রাখে, যা আপনি কোনো AI টুলে দিতে পারেন। যেখানে সম্ভব সেখানে পূর্ণ পাঠ যোগ করে (ওপেন-অ্যাক্সেস নিবন্ধ ও NIH লেখক পাণ্ডুলিপি, Europe PMC বা PubMed Central থেকে), নইলে অ্যাবস্ট্রাক্ট, সঙ্গে সাইটেশন বারের ডেটা ব্যাখ্যা করা একটি README। ফাইলটি আনজিপ করে AI-কে সেই ফোল্ডারটি দেখান, অথবা আপনার AI টুল zip ফাইল নিলে সরাসরি zip-টিই আপলোড করুন।\n\nযে নিবন্ধের বিনামূল্যের পূর্ণ পাঠ নেই, সেগুলোর জন্য Open বোতাম থাকে (বিনামূল্যের PMC PDF থাকলে সেটি, নইলে প্রকাশকের পেজ), যাতে আপনি নিজের অ্যাক্সেস থাকা PDF সংরক্ষণ করতে পারেন।\n\nবড় নথি একবারে পড়ার জন্য কোনো AI টুলের কাছে বেশি হয়ে যেতে পারে। দীর্ঘ নিবন্ধ (প্রায় 100 পাতার বেশি) চিহ্নিত করা হয়, আর প্রতিটি AI টুলের নিজস্ব আপলোড সীমা আছে।\n<ul>\n<li><strong>Convert PDF:</strong> সংরক্ষিত PDF-কে আপনার ব্রাউজারেই পাঠে রূপান্তর করে (কিছুই আপলোড হয় না)। রেফারেন্স তালিকা যায় আলাদা ফাইলে, আর টেবিলের পাতাগুলো একটি ছোট PDF হিসেবে রাখা হয়। স্ক্যান করা (শুধু ছবির) PDF-এ রূপান্তরের মতো পাঠ থাকে না, তাই সেটির জন্য Add PDF ব্যবহার করুন।</li>\n<li><strong>Add PDF:</strong> PDF-টি যেমন আছে তেমনই zip-এ রাখে।</li>\n<li><strong>জটিল লেআউট বা গণিতের জন্য:</strong> প্রযুক্তিতে দক্ষ ব্যবহারকারীরা Docling, Marker বা MinerU-এর মতো বিনামূল্যের টুল দিয়ে PDF রূপান্তর করে, তৈরি হওয়া .md ফাইলগুলো আনজিপ করা ফোল্ডারে যোগ করতে পারেন।</li>\n</ul></div>\n\n<strong>AI TABLE — নতুন, পরীক্ষামূলক</strong>\n<strong>AI table</strong> আপনার তালিকার প্রতিটি নিবন্ধের শিরোনাম ও অ্যাবস্ট্রাক্ট Chrome-এর বিল্ট-ইন AI দিয়ে আপনার নিজের কম্পিউটারেই পড়ে (কিছুই আপলোড হয় না) এবং প্রতিটি নিবন্ধের জন্য একটি সারি পূরণ করে: গবেষণার নকশা, জনগোষ্ঠী, নমুনার আকার, হস্তক্ষেপ বা এক্সপোজার এবং মূল ফলাফল। <strong>Copy table</strong> Excel বা Google Sheets-এ পেস্ট করার জন্য ট্যাব-বিভক্ত টেক্সট কপি করে। এটি ভুল করতে পারে: ফাঁকা ঘর মানে অ্যাবস্ট্রাক্টে তা বলা নেই, নমুনার আকার তখনই দেখায় যখন সংখ্যাটি অ্যাবস্ট্রাক্টে থাকে, এবং প্রতিটি সারি নিবন্ধের সঙ্গে মিলিয়ে দেখা উচিত। প্রথমবার ব্যবহারে Chrome-এর AI মডেল (কয়েক GB) ডাউনলোড হয়। বোতামটি কেবল Chrome 138 বা তার পরের সংস্করণে দেখা যায়, এবং মডেলের জন্য প্রায় 22 GB খালি ডিস্ক স্পেস এবং 4 GB-র বেশি মেমরির গ্রাফিক্স কার্ড অথবা 16 GB RAM লাগে।",
        ref: null
    },
    {
        label: "Author = লেখকের তথ্য",
        description: "প্রথম ও শেষ লেখককে দেখায় (একাডেমিক রীতিতে প্রথম লেখক সাধারণত কাজটির নেতৃত্ব দেন, আর শেষ লেখক ল্যাবের প্রধান; শেষে কোনো প্রতিষ্ঠান থাকলে শেষ ব্যক্তিকে ধরা হয়)।\n\n<strong>সার্চ লিংক</strong>\n<ul>\n<li><strong>PubMed:</strong> উপলব্ধ থাকলে ORCID ব্যবহার করে (বহুল ব্যবহৃত একটি লেখক আইডি, Ref: <a href=\"https://orcid.org/\" target=\"_blank\">https://orcid.org/</a>); না থাকলে পদবি ও নামের প্রথম অক্ষর ব্যবহার করে</li>\n<li><strong>ORCID প্রোফাইল:</strong> অনন্য গবেষক আইডিসহ লেখকের বিস্তারিত তথ্য দেয় - নামভিত্তিক সার্চের চেয়ে বেশি নির্ভরযোগ্য (সব নিবন্ধে ORCID থাকে না)</li>\n</ul>\n\n<em>নোট: নামভিত্তিক সার্চে একই রকম নামের অন্য গবেষকেরাও চলে আসতে পারেন। ORCID সঠিক শনাক্তকরণ দেয়।</em>\n\n<strong>মেট্রিক (OpenAlex থেকে, ORCID প্রয়োজন)</strong>\n<ul>\n<li><strong>h-index:</strong> এমন সর্বোচ্চ সংখ্যা h, যতগুলো পেপারের প্রতিটি অন্তত h বার সাইট হয়েছে। উদাহরণ: 12টি পেপার, প্রতিটির ≥12 সাইটেশন = h-index 12 (Ref: <a href=\"https://pmc.ncbi.nlm.nih.gov/articles/PMC10771139/\" target=\"_blank\">https://pmc.ncbi.nlm.nih.gov/articles/PMC10771139/</a>)</li>\n<li><strong>i10-index:</strong> ≥10 সাইটেশনসহ পেপারের সংখ্যা</li>\n<li><strong>2 বছরের সাইটেশন হার:</strong> 2 বছরে প্রতি পেপারে গড় সাইটেশন</li>\n</ul>\n\n<em>নোট: বিভিন্ন উৎস (Google Scholar, Scopus, Web of Science) ভিন্ন ভিন্ন সাইটেশন ডেটাবেস ব্যবহার করে বলে এই মেট্রিকগুলো একটু আলাদাভাবে হিসাব করে। দেখুন Ref: <a href=\"https://en.wikipedia.org/wiki/Author-level_metrics\" target=\"_blank\">https://en.wikipedia.org/wiki/Author-level_metrics</a></em>\n\n<strong>প্রাতিষ্ঠানিক সংশ্লিষ্টতা</strong>\nনিবন্ধে উল্লিখিত প্রাতিষ্ঠানিক সংশ্লিষ্টতা (affiliations) তালিকাভুক্ত করে।\n\nনোট: প্রথম ও শেষ লেখকের ORCID, h-index ও i10-index প্রতিটি নিবন্ধের জন্য (OpenAlex থেকে) আনা হয় এবং \"Excel\" ও \"ডেটা\" এক্সপোর্টে থাকে। প্রাতিষ্ঠানিক সংশ্লিষ্টতা কেবল Author-এ ক্লিক করলেই আনা হয়, তাই তা এক্সপোর্টে থাকে না।\n\nকাজ, সাইটেশন ও প্রত্যাহার (OpenAlex, ORCID প্রয়োজন): works হলো লেখকের OpenAlex প্রোফাইলে থাকা কাজের সংখ্যা, আর citations সেগুলোর মোট সাইটেশন। প্রত্যাহার করা নিবন্ধ প্রথম ও শেষ লেখকের জন্য যাচাই করা হয়: সংখ্যাটি OpenAlex-এ সেই লেখকের অন্য প্রত্যাহার করা নিবন্ধ, এই নিবন্ধ বাদে। কারও একটি বা তার বেশি থাকলে বারের Author-এর চারপাশে লাল রেখা দেখা যায়। Author প্যানেলে 1 বা তার বেশি সংখ্যাটি OpenAlex-এ সেই লেখকের প্রত্যাহৃত পেপারের তালিকায় লিংক করে (তালিকায় এই নিবন্ধও থাকতে পারে; প্রত্যাহার নোটিশ গোনা হয় না)। \"–\" মানে যাচাই করা যায়নি (ORCID নেই, নাম OpenAlex-এর সঙ্গে মেলেনি, OpenAlex পাওয়া যায়নি, বা গোনার জন্য ফলাফল অনেক বেশি), শূন্য নয়। এগুলো সবই, আর ২ বছরের সাইটেশন হার, Excel এক্সপোর্টেও আছে (Author Retractions হলো দুজনের মধ্যে বড় সংখ্যাটি; কাউকে যাচাই করা না গেলে এবং কারও প্রত্যাহার না থাকলে ফাঁকা)।",
        ref: null
    },
    {
        label: "J = জার্নালের তথ্য",
        description: "জার্নালের তথ্য দেখতে J-তে ক্লিক করুন: পূর্ণ নাম, মুদ্রিত ও ইলেকট্রনিক ISSN, NLM ID (NLM Catalog-এর লিংক), SJR ও Top-J। এক্সটেনশনের Journal Ranking ডেটা থেকে: জার্নালের অবস্থান ও এ বছর PubMed-এ যোগ হওয়া এর নিবন্ধ; গত বছরের একই মাসগুলোর তুলনায় বৃদ্ধি; এ বছরের Medline %, বিনামূল্যের পূর্ণ পাঠ % ও ORCID %; এবং প্রত্যাহার: যেকোনো প্রকাশনা বছরের জার্নালের নিবন্ধ, যেগুলো PubMed এ বছর ও গত বছরের একই মাসগুলোতে প্রত্যাহৃত হিসেবে চিহ্নিত করেছে (প্রিপ্রিন্ট সার্ভারের ক্ষেত্রে প্রত্যাহার করা প্রিপ্রিন্ট)। একই লাইনগুলো Report-এও আছে। OpenAlex জার্নালের দেশ, প্রকাশক, ওপেন অ্যাক্সেস ও DOAJ অবস্থা, APC, h-index, 2 বছরের গড় সাইটেশন ও প্রথম বছর যোগ করে; J বা Report খুললে প্রতি জার্নালে একবারই খোঁজা হয়। প্যানেলের শুরুতে নিবন্ধের শিরোনাম ও প্রকাশনার ধরন থাকে, আর SJR লাইনে জার্নালের সেরা কোয়ার্টাইল থাকে।",
        ref: "https://tomlaheyh.github.io/citation-bar/journal-ranking/journal-ranking.html"
    },
    {
        label: "Top-J = শীর্ষ জার্নাল",
        description: "শীর্ষ মেডিকেল জার্নালের আমার নিজের বাছাই করা তালিকা, যাতে একই প্রকাশকের ছাতার নিচে থাকা সহযোগী জার্নালও রয়েছে (যেমন, JAMA পরিবার)। ISSN দিয়ে মেলানো হয় — জার্নাল মিললে \"Yes\" দেখায়। তালিকাটি ইচ্ছাকৃতভাবে ছোট ও অত্যন্ত বাছাইকৃত। বর্তমান তালিকা: Annals of Internal Medicine, British Medical Journal (BMJ), European Heart Journal, Journal of the American College of Cardiology, JAMA, Lancet, Nature, New England Journal of Medicine। আমি পরামর্শ গ্রহণে আগ্রহী, তবে এটি একটি অতি-সংক্ষিপ্ত (super-MVP) তালিকা হিসেবেই তৈরি।",
        ref: null
    },
    {
        label: "SJR = SCImago Journal Rank (জার্নাল র‍্যাঙ্ক)",
        description: "একটি বহুল সম্মানিত, বিনামূল্যের জার্নাল র‍্যাঙ্কিং। SCImago Journal Rank (SJR) Google-এর PageRank™-এর মতো একটি অ্যালগরিদম ব্যবহার করে জার্নালের দৃশ্যমানতা পরিমাপ করে। SCImago স্পেনের কয়েকটি বিশ্ববিদ্যালয় ও CSIC-এর সঙ্গে যুক্ত একটি গবেষণা দল, যারা তথ্য বিশ্লেষণ ও ভিজ্যুয়ালাইজেশনে বিশেষজ্ঞ। নতুন র‍্যাঙ্কিং বছরে একবার প্রকাশিত হয় (সাধারণত এপ্রিলে)। SCImago দিলে জার্নালের সেরা কোয়ার্টাইল (Q1 থেকে Q4) হোভার টেক্সট, J প্যানেল, Report এবং \"Excel\" এক্সপোর্টে দেখায়। SCImago জার্নালকে তার প্রতিটি বিষয়ক্ষেত্রে আলাদাভাবে র‍্যাঙ্ক করে, আর এটি সেগুলোর মধ্যে সেরা: Q1 মানে অন্তত একটি ক্ষেত্রে শীর্ষ 25%।",
        ref: "https://www.scimagojr.com/aboutus.php"
    },
    {
        label: "YTD = চলতি বছরে (year-to-date) জার্নালের নিবন্ধ",
        description: "এক্সটেনশনের র‍্যাঙ্কিং ডেটা যে সময়কাল জুড়ে, সেই সময়ে এই জার্নাল (ISSN অনুযায়ী) কতগুলো নিবন্ধ প্রকাশ করেছে তার সংখ্যা। আমি PubMed-এর সব ডেটা নিই (সাধারণত মাসিক) এবং বছরের মোট নিবন্ধ, বিনামূল্যের নিবন্ধ ও Medline-এ ইনডেক্স করা নিবন্ধ অনুযায়ী জার্নালগুলোর র‍্যাঙ্কিং করি। সেই র‍্যাঙ্কিং ডেটা এক্সটেনশনের সঙ্গেই আসে এবং প্রতিটি রিলিজে হালনাগাদ হয়, তাই সংখ্যাগুলো র‍্যাঙ্কিং ফাইলে উল্লিখিত সময়কালকে নির্দেশ করে। আমি যখন PubMed শিখছিলাম, তখন এমন কিছু খুব কাজে লাগত — আশা করি আপনারও কাজে লাগবে।",
        ref: null
    },
    {
        label: "Medline % = চলতি বছরে Medline-এ ইনডেক্স করা জার্নাল নিবন্ধের শতাংশ",
        description: "একই সময়কালে একটি জার্নালের (ISSN অনুযায়ী) কত শতাংশ নিবন্ধ Medline-এ ইনডেক্স করা হয়েছে। এটি আমার নিজস্ব র‍্যাঙ্কিং ডেটা থেকে। লক্ষ করুন, এটি জার্নালের মান নয়, ইনডেক্সিং প্রতিফলিত করে: সাম্প্রতিক প্রকাশিত নিবন্ধ এখনও ইনডেক্স না-ও হতে পারে, তাই ঘন ঘন প্রকাশ করা জার্নালের শতাংশ তার চূড়ান্ত হারের চেয়ে কম দেখাতে পারে।",
        ref: null
    },
    {
        label: "Free % = চলতি বছরে বিনামূল্যে পূর্ণ টেক্সটসহ জার্নাল নিবন্ধের শতাংশ",
        description: "একই সময়কালে একটি জার্নালের (ISSN অনুযায়ী) কত শতাংশ নিবন্ধ বিনামূল্যে পূর্ণ টেক্সট হিসেবে পাওয়া যায়। এটি YTD সংখ্যা ও Medline %-এর মতো একই র‍্যাঙ্কিং ডেটা থেকে।",
        ref: null
    },
    {
        label: "Xout = বাদ দিয়ে সার্চ (Exclusion Search)",
        description: "নন-প্রাইমারি গবেষণা বাদ দেওয়ার ফিল্টারসহ PubMed-এ আবার সার্চ করে। একটি ডায়ালগ খোলে, যেখানে আপনার বর্তমান সার্চ আগে থেকেই লেখা থাকে এবং এমন প্রকাশনার ধরন বাদ দেওয়ার চেকবক্স থাকে, যেগুলো মিলিতভাবে সব PubMed নিবন্ধের প্রায় 25%:\n\n<ul>\n<li><strong>Has Abstract:</strong> নিবন্ধে অ্যাবস্ট্রাক্ট থাকা আবশ্যক করে (প্রস্তাবিত — অ্যাবস্ট্রাক্টবিহীন নিবন্ধ কদাচিৎ পিয়ার-রিভিউড প্রাইমারি গবেষণা হয়)</li>\n<li><strong>No Retracted Publications:</strong> প্রত্যাহার করা নিবন্ধ এবং সেগুলোর প্রত্যাহারের নোটিশ বাদ দেয়</li>\n<li><strong>No Published Errata:</strong> সংশোধনী/erratum নোটিশ বাদ দেয়</li>\n<li><strong>No Letters:</strong> সম্পাদকের কাছে লেখা চিঠি বাদ দেয়</li>\n<li><strong>No Editorials:</strong> সম্পাদকীয় লেখা বাদ দেয়</li>\n<li><strong>No Comments:</strong> মন্তব্যমূলক নিবন্ধ বাদ দেয়</li>\n<li><strong>No Systematic Reviews:</strong> সিস্টেমেটিক রিভিউ বাদ দেয়</li>\n<li><strong>No Meta-Analyses:</strong> মেটা-অ্যানালাইসিস বাদ দেয়</li>\n<li><strong>No Reviews:</strong> রিভিউ নিবন্ধ বাদ দেয়</li>\n</ul>\n\nডিফল্টভাবে সব ফিল্টারে টিক দেওয়া থাকে। কোনো ধরন রাখতে চাইলে সেই ফিল্টারের টিক তুলে দিন। ফিল্টার বদলানোর সঙ্গে সঙ্গে পূর্ণ কোয়েরির প্রিভিউ হালনাগাদ হয়। আপনি সরাসরি সার্চ করতে পারেন (বর্তমান ট্যাবে যায়), কোয়েরি কপি করতে পারেন, বা বাতিল করতে পারেন। View Expanded আপনার সার্চের পাশে PubMed সেটি কীভাবে পড়েছে (E-utilities-এর query translation) তা দেখায়, যাতে বোঝা যায় ট্যাগবিহীন শব্দগুলো automatic term mapping কীভাবে বিস্তৃত করেছে।",
        ref: null
    },
    {
        label: "kS = মূল সার্চ (Key Searches)",
        description: "বেশি প্রকাশনা আছে বা দ্রুত বাড়ছে এমন বিষয়ে আগে থেকে তৈরি PubMed সার্চ, ক্ষেত্র অনুযায়ী গ্রুপে সাজানো। গ্রুপ দেখতে kS-এ ক্লিক করুন, কোনো গ্রুপের সার্চ দেখতে তার ওপর পয়েন্টার রাখুন বা ক্লিক করুন, তারপর কোনো সার্চ নতুন ট্যাবে খুলতে তাতে ক্লিক করুন। প্রতিটি সার্চে বিষয়টিকে নিবন্ধের মূল বিষয় হতে হবে (MeSH Major Topic বা শিরোনাম) এবং নিবন্ধে অ্যাবস্ট্রাক্ট থাকতে হবে; প্রত্যাহার করা নিবন্ধ ও সেগুলোর প্রত্যাহারের নোটিশ, erratum, চিঠি, সম্পাদকীয় ও মন্তব্য বাদ দেওয়া হয়। রিভিউ, সিস্টেমেটিক রিভিউ ও মেটা-অ্যানালাইসিস রাখা হয়। পূর্ণ কোয়েরি PubMed-এর সার্চ বক্সে দেখা যায়। সার্চ শব্দগুলো ইংরেজিতে বলে গ্রুপ ও সার্চের নাম ইংরেজিতে। মেনুর নিচের Years সারি সার্চে প্রকাশের তারিখের একটি চলমান সীমা যোগ করে, যেমন গত 1, 5 বা 10 বছরের জন্য \"last 5 years\"[dp]; All বেছে নিলে কোনো সীমা থাকে না। এটি কোয়েরির অংশ, তাই কোয়েরি কপি করলেও থেকে যায়। আপনার পছন্দ মনে রাখা হয়।",
        ref: null
    },
    {
        label: "pR = PubMed রিপোর্ট (মূল সংক্ষিপ্তসার)",
        description: "PubMed Citation Bar সাইটের আটটি PubMed রিপোর্ট টুলসহ একটি মেনু খোলে: PubMed Summary Report (একটি PubMed সার্চের সংক্ষিপ্ত চিত্র), PubMed Filters Report (ফিল্টার বিশ্লেষণ), PubMed MeSH Counts (MeSH টার্মের ফ্রিকোয়েন্সি গণনা), PubMed Journal Ranking (জার্নাল র‍্যাঙ্কিং ডেটা), PubMed Drift Report (PubMed সাইটেশন-স্ট্যাটাস পরিমাপের দিনভিত্তিক পরিবর্তন), PubMed ORCID Ranking (প্রতি বছর সবচেয়ে বেশি PubMed নিবন্ধে থাকা ORCID iD), PubMed ROR Ranking (এ বছর যোগ হওয়া নিবন্ধ অনুযায়ী প্রতিষ্ঠানের র‍্যাঙ্কিং, লেখকদের অ্যাফিলিয়েশন থেকে) এবং PubMed iCite Citation Gains (গত 36 মাসে যোগ হওয়া যে নিবন্ধগুলো গত 12 মাসে সবচেয়ে বেশি সাইটেশন পেয়েছে)। প্রতিটি নতুন ট্যাবে খোলে।",
        ref: "https://tomlaheyh.github.io/citation-bar/"
    },
    {
        label: "/Report = সাইটেশন রিপোর্ট",
        description: "একটি রিপোর্ট, যেখানে একটি নিবন্ধের সব মূল পরিমাপ ও লিংক সহজে কপি করার মতো ফরম্যাটে তালিকাভুক্ত থাকে। পপআপের দুটি বোতাম ফলাফলের পুরো পেজ এক্সপোর্ট করে: \"Excel\" বার যা দেখায় ঠিক তার একটি ট্যাব-বিভক্ত টেবিল দেয় — প্রতি নিবন্ধে এক সারি, সরাসরি Excel বা Google Sheets-এ পেস্ট করার জন্য প্রস্তুত — আর \"ডেটা\" সবকিছু বের করে দেয়: প্রথমে PMID, তারপর সব পরিমাপ, এক্সটেনশনের টাইমস্ট্যাম্প ও অভ্যন্তরীণ ফিল্ড। দ্বিতীয়টি এক্সটেনশন যে সব ডেটা ব্যবহার করে তার সম্পূর্ণ প্রকাশ। কোনো ধরনের ব্যবহারকারী ট্র্যাকিং নেই।\n\nনোট: প্রথম ও শেষ লেখকের ORCID, h-index ও i10-index প্রতিটি নিবন্ধের জন্য আনা হয় এবং \"Excel\" ও \"ডেটা\" এক্সপোর্টে থাকে। অন্য কিছু ডেটা কেবল বারের কোনো আইটেমে ক্লিক করলেই আনা হয়, কারণ প্রতিটি নিবন্ধের জন্য তা আনতে অনেক সময় লাগবে। এর মধ্যে আছে অ্যাবস্ট্রাক্ট (Abstract), অনুদান (grants) এবং লেখকদের প্রাতিষ্ঠানিক সংশ্লিষ্টতা। এই ডেটা এক্সপোর্টে থাকে না।",
        ref: null
    },
    {
        label: "মেমরি = সিস্টেমের খালি মেমরি (কম হলে লাল হয়)",
        description: "এক্সটেনশন পপআপের নিচে দেখানো হয়। Chrome (এক্সটেনশন নয়) একটি ট্যাবের সাম্প্রতিক পেজগুলো মেমরিতে রেখে দেয়, যাতে Back সঙ্গে সঙ্গে কাজ করে, আর অনেক সার্চে ব্যবহৃত একটি ট্যাব সময়ের সঙ্গে আরও বেশি মেমরি ধরে রাখতে থাকে। এই এক্সটেনশন থাকুক বা না থাকুক, এটি ঘটে; সাইটেশন বার প্রতিটি পেজে নিজের অংশটুকু যোগ করে।<br><br>এটি জমে যাওয়া ঠেকাতে, সাইটেশন বার ছয়বার চলার পর এক্সটেনশন আপনার ট্যাবটি একই পেজে আবার খোলে। আপনি যে ফলাফল দেখছিলেন সেখানেই থাকেন এবং কিছু আবার টাইপ করতে হয় না; যা হারান তা হলো ঐ ট্যাবের Back হিস্ট্রি, যা মুক্ত হওয়া মেমরির তুলনায় ন্যায্য বিনিময়। 1,000 স্ক্যান চলার মাঝখানে, বা আপনি শুধু উচ্চ প্রভাব অথবা 1,000 স্ক্যান-এর ফলাফল পেজে থাকলে এটি কখনো এমন করে না।<br><br>খালি মেমরি 2 GB-এর নিচে নামলে মেমরি লাইনটি লাল হয়ে যায়, কারণ যেকোনো আকারের মেশিনে এই পর্যায়ে Chrome সমস্যায় পড়তে শুরু করে। তখন যেসব অ্যাপ্লিকেশন ব্যবহার করছেন না সেগুলো বন্ধ করাই সাধারণত যথেষ্ট। আপনি নিজে হাতে করতে চাইলে, এক্সটেনশন রিসেট বোতামও এক্সটেনশনের সংরক্ষিত ডেটা ও Chrome-এর ক্যাশ মুছে ট্যাবটি আবার খোলে। Reset Extension কেবল PubMed ও NCBI পেজের সাইট ডেটা মোছে। অন্য ওয়েবসাইটের ডেটা এবং আপনার হিস্ট্রি, কুকি ও পাসওয়ার্ড স্পর্শ করা হয় না।",
        ref: null
    },
    {
        label: "কপি আইকন (পপআপ) = এই সার্চের রেফারেন্স",
        description: "পপআপের একেবারে ওপরের সাইটেশন লাইনের শুরুতে ছোট কপি আইকনটি বর্তমান ট্যাবের PubMed সার্চের রেফারেন্স কপি করে: ডেটাবেস, সার্চের তারিখ, যেমন চালানো হয়েছে ঠিক সেই কোয়েরি, সাইডবারের ফিল্টার, ফলাফলের সংখ্যা ও URL। এটি PRISMA-S অনুসরণ করে, যা সাহিত্য সার্চ রিপোর্ট করার মানদণ্ড। তারিখ গুরুত্বপূর্ণ, কারণ MeSH ও PubMed-এর automatic term mapping সময়ের সঙ্গে বদলায়, তাই একই সার্চ পরে ভিন্ন ফল দিতে পারে। কপি করা লেখা ইংরেজিতে, যাতে গবেষণাপত্র ও প্রোটোকলে ব্যবহার করা যায়।",
        ref: null
    }
];

// Portuguese (Brazil) help panel: same items, same order and refs as helpItems.
// Button and checkbox names that still appear in English on screen are kept
// in English here so they match what the user sees.
export const helpItemsPt = [
    {
        label: "Retracted = PMID e PMID da retratação (ao clicar)",
        description: "Indica se um artigo foi retratado da literatura científica.",
        ref: "https://www.nlm.nih.gov/bsd/policy/errata.html"
    },
    {
        label: "* = Artigo de alto impacto (fundo verde)",
        description: `Os artigos são marcados como de alto impacto (fundo verde) quando a pontuação atinge o seu limite (padrão: 5, ajustável nas configurações da extensão). A pontuação é calculada assim:

${SCORE_CODE}`,
        ref: null
    },
    {
        label: "Overall Score = Pontuação numérica de qualidade do artigo",
        description: "A pontuação geral é um valor calculado que representa a qualidade do artigo com base em vários fatores: indexação no MEDLINE, número de citações, Relative Citation Ratio (RCR), classificação SJR da revista, status de tendência (trending) e citações influentes. A pontuação aparece no topo do relatório de citações e ajuda a avaliar rapidamente o impacto e a relevância de um artigo.",
        ref: null
    },
    {
        label: "PT = Idioma do texto ao passar o mouse na barra",
        description: "A pequena etiqueta marrom depois do ? mostra o idioma do texto exibido ao passar o mouse na barra (EN = English, ES = Español, ZH = 中文, JA = 日本語, KO = 한국어, FR = Français, HI = हिन्दी, AR = العربية, BN = বাংলা, PT = Português). Clique nela para escolher; as barras são redesenhadas na hora, sem recarregar nenhum dado, e a sua escolha fica salva. Até você escolher, ela segue o idioma do Chrome. Este painel de ajuda e o pop-up da extensão (botão de idioma ao lado de -Barra de citações ativada-) seguem a mesma escolha. Escolher um idioma diferente do inglês também traduz os títulos e trechos dos resultados da pesquisa, usando o tradutor integrado do Chrome no seu computador (Chrome 138 ou posterior; na primeira vez, o Chrome baixa o idioma depois de um clique na etiqueta). Os resultados são traduzidos de 25 em 25 a partir do topo da página, com uma caixa de status mostrando o progresso, e os resultados adicionados por Show more são traduzidos à medida que aparecem. Passe o mouse sobre um título ou trecho traduzido para ver o original em inglês. O texto da própria barra permanece sempre em inglês.",
        ref: null
    },
    {
        label: "Outros idiomas = Usar o PubMed no seu idioma",
        description: `As páginas e a pesquisa do PubMed estão em inglês. Há duas formas de lê-las no seu idioma, e a barra de citações funciona com as duas:

<ul>
<li><strong>A etiqueta de idioma na barra</strong> (PT, acima): traduz o texto exibido ao passar o mouse na barra, esta ajuda, o pop-up da extensão e os títulos e trechos dos resultados da pesquisa. A tradução é feita pelo Chrome no seu computador; nada é enviado para outro lugar.</li>
<li><strong>A tradução de página do próprio Chrome</strong> (clique com o botão direito → Traduzir, ou o ícone de tradução na barra de endereços; o Edge tem o mesmo recurso): traduz a página inteira do PubMed para qualquer idioma que o navegador ofereça. O texto da barra permanece em inglês para caber em uma só linha, os termos MeSH e as palavras-chave ficam exatamente como o PubMed os indexa, e a janela do resumo mostra o original em inglês abaixo da tradução. Enquanto o navegador está traduzindo a página, a tradução dos resultados feita pela barra se desativa, para que nada seja traduzido duas vezes.</li>
</ul>

As exportações, o link do Google Scholar e o relatório do artigo sempre usam os títulos em inglês do PubMed, seja qual for a forma de tradução da página. A pesquisa do PubMed só entende inglês, então pesquise com termos em inglês. A versão do PubMed no site do Google Tradutor (um endereço que termina em translate.goog) não é compatível: a barra só funciona em pubmed.ncbi.nlm.nih.gov, então use a tradução do próprio navegador.`,
        ref: null
    },
    {
        label: "doi = Abrir o artigo no DOI Lookup",
        description: "Abre o DOI do artigo no DOI Lookup (doilookup.com), um site gratuito que verifica retratações, citações, métricas da revista e acesso aberto em uma dúzia de fontes. É possível reunir vários DOIs (até 15) e visualizá-los juntos. Se o artigo não tiver DOI, o link aparece em cinza.",
        ref: "https://doilookup.com/"
    },
    {
        label: "MeSH+ = Termos MeSH e palavras-chave do artigo",
        description: "Mostra duas listas. Os MeSH (Medical Subject Headings) são os descritores temáticos controlados da NLM, atribuídos aos registros do MEDLINE (marcados com m na barra); os demais registros mostram 'No MeSH data'. As palavras-chave (keywords) são os termos próprios do artigo, normalmente fornecidos pelos autores (Author keywords). As palavras-chave que às vezes são acrescentadas por um indexador, como a NLM, aparecem separadamente sob um título próprio. As palavras-chave não são um vocabulário controlado, mas muitas vezes nomeiam conceitos novos que o MeSH ainda não tem, e podem ser pesquisadas no PubMed com a tag [ot]. Os termos MeSH e as palavras-chave nunca são traduzidos automaticamente: ficam exatamente como o PubMed os indexa, mesmo quando o navegador está traduzindo a página, para que possam ser copiados diretamente para uma pesquisa no PubMed.",
        ref: "https://www.nlm.nih.gov/mesh/meshhome.html"
    },
    {
        label: "n = Novo, menos de 2 anos",
        description: "Baseia-se na data de criação [crdt] no PubMed, ou seja, quando o artigo foi registrado pela primeira vez no sistema. Essa data não muda, ao contrário das datas de publicação, que às vezes mudam.",
        ref: null
    },
    {
        label: "t = Artigo em alta segundo o PubMed Trending",
        description: "A tendência se baseia nos 1.000 principais artigos do PubMed. A lógica exata não é pública (por política dos NIH), mas pense em \"novo e com muitas visualizações\" e você chegará perto.",
        ref: "https://pubmed.ncbi.nlm.nih.gov/trending/"
    },
    {
        label: "m = Indexado no Medline segundo o PubMed",
        description: "Indica que o artigo foi indexado no Medline.",
        ref: "https://www.nlm.nih.gov/medline/medline_overview.html"
    },
    {
        label: "p = Preprint",
        description: "Indica que o artigo é um preprint (ainda não revisado por pares). Os preprints permitem que os pesquisadores compartilhem resultados rapidamente, antes da revisão formal por pares. Embora deem acesso antecipado à pesquisa, devem ser interpretados com cautela, pois não passaram pelo rigoroso processo de revisão por pares.",
        ref: "https://pmc.ncbi.nlm.nih.gov/about/nihpreprints/"
    },
    {
        label: "e = Errata, E = expressão de preocupação",
        description: "Os artigos podem ter atualizações ou correções; isso não é uma retratação. Aproximadamente 1% dos artigos tem correções. Ao clicar, são mostrados tanto o PMID original quanto o PMID da correção. Um E em negrito no mesmo lugar significa que a revista publicou uma expressão de preocupação: um aviso formal sobre o artigo que não chega a ser uma retratação. Quando um artigo tem os dois, o E é mostrado e o texto ao passar o mouse menciona a correção; ao clicar, são listados o artigo original, o aviso de preocupação e a correção. O próprio aviso também mostra o E. O Report e a exportação \"Excel\" indicam os dois separadamente.",
        ref: "https://www.nlm.nih.gov/bsd/policy/errata.html"
    },
    {
        label: "Cited = Número de citações do iCite (NIH) ou do Europe PMC",
        description: "Número de citações do iCite, fornecido pelos NIH, a mesma agência governamental que mantém o PubMed. Há várias fontes de contagem de citações, incluindo o próprio PubMed, mas considero o iCite a melhor opção em geral. Às vezes o iCite pode estar fora do ar ou lento; nesse caso, obtenho as contagens de citações do Europe PMC, uma base de dados bibliográfica consolidada mantida pelo EMBL-EBI em conjunto com um grupo de financiadores de pesquisa.",
        ref: "https://icite.od.nih.gov/"
    },
    {
        label: "Ícone de gráfico (depois de Cited) = Citações por mês, últimos 12 meses (iCite)",
        description: "Azul quando o artigo tem dados mensais: clique para ver um gráfico das citações dele no iCite nos últimos 12 meses. A primeira barra é o número de citações no início; cada mês seguinte empilha o ganho do mês sobre o total anterior, com o ganho escrito acima da barra. Um quadro vermelho tracejado marca um mês em que o iCite reduziu a contagem (uma correção). Passe o mouse sobre uma barra para ver os números.\n\nCinza significa que não há dados mensais para o artigo. Os gráficos incluem apenas artigos adicionados ao PubMed nos últimos 36 meses que estão entre os 40.000 com mais citações ganhas nos últimos 12 meses; por isso, artigos já consolidados não aparecem, mesmo com mais citações. Os dados vêm dos instantâneos mensais do iCite (NIH) e são atualizados uma vez por mês; a lista completa é o relatório PubMed iCite Citation Gains.",
        ref: "https://tomlaheyh.github.io/citation-bar/icite/icite.html"
    },
    {
        label: "RCR = Relative Citation Ratio do iCite",
        description: "O Relative Citation Ratio (RCR) é uma medida do iCite definida como \"as citações por ano de cada artigo, normalizadas em relação às citações por ano recebidas pelos artigos financiados pelos NIH no mesmo campo e ano\". É uma medida de influência científica baseada em citações. Quando o iCite não está disponível, o RCR mostra \"-\", pois é uma medida própria do iCite que não está disponível em outras fontes. Para economizar espaço, um RCR acima de 99 é mostrado na barra como número inteiro arredondado (123,4 aparece como 123). O Report e as exportações mantêm o valor completo.",
        ref: "https://support.icite.nih.gov/hc/en-us/articles/9062490125083-Metrics"
    },
    {
        label: "IC = Citações influentes do Semantic Scholar",
        description: "O Semantic Scholar identifica as citações em que a publicação citada tem um impacto significativo sobre a publicação que a cita. As citações influentes são determinadas por um modelo de aprendizado de máquina que analisa fatores como o número de citações e o contexto em que cada uma aparece. Mostra \"-\" se não for encontrado.",
        ref: "https://www.semanticscholar.org/faq#influential-citations"
    },
    {
        label: "Alt = Pontuação Altmetric",
        description: "O Altmetric Attention Score indica quanta atenção um resultado de pesquisa recebeu, incluindo redes sociais, notícias e documentos de políticas públicas. A pontuação vem de um algoritmo automático e representa uma contagem ponderada dessa atenção. O link leva diretamente à página do Altmetric para o artigo.",
        ref: "https://help.altmetric.com/en/articles/9800513"
    },
    {
        label: "s = Artigos semelhantes do PubMed",
        description: "Uma lista de artigos semelhantes do PubMed. Você também pode vê-los clicando em \"Similar Articles\" na barra lateral direita de qualquer página de artigo do PubMed.",
        ref: "https://www.ncbi.nlm.nih.gov/guide/howto/find-articles-similar/"
    },
    {
        label: "c = Artigos do PubMed que o citam",
        description: "Uma lista do PubMed com os artigos que citam este artigo. Ela pode variar um pouco em relação ao iCite, pois eles usam sistemas e métodos diferentes. Daqui em diante, o foco dos NIH é o iCite, mas o PubMed continua oferecendo esta forma simples de ver os artigos que o citam.",
        ref: "https://pubmed.ncbi.nlm.nih.gov/help/#cited-by"
    },
    {
        label: "Gsch = Google Scholar (Google Acadêmico) pelo DOI",
        description: "O Google Scholar é um excelente recurso de referência para artigos, com suas próprias contagens de citações (que podem ser um pouco infladas). A melhor forma de encontrar um artigo no Google Scholar é pelo seu DOI (Digital Object Identifier), uma sequência única que identifica um artigo e lhe dá um endereço web permanente. Uso o DOI do artigo do PubMed (97% têm um) para criar um link direto para o Google Scholar.",
        ref: "https://scholar.google.com/intl/en/scholar/about.html"
    },
    {
        label: "Con = Gráfico de citações Connections (doilookup.com)",
        description: "Connections abre um gráfico interativo de citações do artigo no doilookup.com, construído com dados do OpenAlex. Ele mostra três visualizações: as referências que o artigo cita (Inside), os artigos que o citam (Outside) e uma visualização combinada (Mix), com bolhas coloridas de acordo com a qualidade da revista e marcadas quando há texto completo gratuito; clique em qualquer artigo para ver título, revista, ano, número de citações e resumo. Você pode recentralizar o gráfico em qualquer artigo ou fazer uma expansão em vários níveis que revela os trabalhos fundamentais e mais cocitados de toda a vizinhança.",
        ref: "https://doilookup.com/"
    },
    {
        label: "Abstract = Resumo (clique para ver)",
        description: "O resumo é uma breve descrição do artigo, presente em cerca de 95% dos artigos de revista recentes. Normalmente é preciso abrir o artigo para lê-lo; isto oferece uma forma rápida de ver o resumo sem sair dos resultados da pesquisa. Se o artigo tiver um resumo em linguagem simples, ele é mostrado abaixo do resumo (ou no lugar dele, quando não há resumo). Se o PubMed também tiver o resumo em outros idiomas, uma nota os lista com um link para o artigo, onde você escolhe o idioma acima do resumo. Uma linha Translate acima do resumo traduz o título, o resumo e o resumo em linguagem simples com o tradutor integrado do Chrome: um clique para o idioma da barra, ou digite qualquer código de idioma. Quando o idioma da barra não é o inglês, o resumo já abre traduzido. O original em inglês aparece embaixo para comparação, e Show original volta ao original. Se o navegador já estiver traduzindo a página inteira, o resumo segue a tradução do navegador, com o original em inglês embaixo.\n\nTexto completo: abaixo do resumo, depois de uma linha divisória, uma linha informa se o texto completo do artigo pode ser exibido aqui, e o texto completo vem em seguida quando é possível. Ele é carregado automaticamente. Artigos de acesso aberto chegam do Europe PMC em um ou dois segundos; outros artigos de leitura gratuita que o PubMed Central (PMC) libera para mineração de texto vêm do próprio PMC e podem levar alguns segundos. Quando o texto completo não pode ser exibido (gratuito só no site da editora, ou gratuito no PMC mas sem acesso aberto), a linha leva ao lugar onde ele pode ser lido. As tabelas aparecem como linhas de texto simples, as figuras são indicadas pelas legendas e as referências ficam de fora. O tipo de publicação do artigo (por exemplo, Randomized Controlled Trial, Review ou Case Reports) é mostrado abaixo do título.\n\nObservação: os resumos só são obtidos quando você clica em Abstract, por isso não entram nas exportações \"Excel\" e \"Dados\".",
        ref: "https://pubmed.ncbi.nlm.nih.gov/18830537/"
    },
    {
        label: "link = Link para o texto completo",
        description: "O PubMed fornece o resumo e os metadados, mas não o texto completo do artigo. Ele tem um link para o artigo real (normalmente no canto superior direito da página do artigo). Alguns artigos exigem assinatura paga; muitas bibliotecas universitárias têm assinaturas, então, se você estiver conectado ao sistema delas, pode acessar artigos protegidos por paywall. Se houver uma versão gratuita (por exemplo, no PMC), forneço esse link; caso contrário, o link aponta para a página da editora. O link fica verde quando é gratuito: primeiro o PMC, depois uma cópia legal gratuita encontrada pelo OpenAlex (a página de acesso aberto da editora ou uma cópia em repositório) e, por fim, os artigos que o próprio PubMed marca como gratuitos. Um preprint não conta como cópia gratuita do artigo. O Report informa que tipo de cópia gratuita é.",
        ref: "https://www.ncbi.nlm.nih.gov/guide/howto/obtain-full-text/"
    },
    {
        label: "✓ = Adicionar à lista de exportação (verde quando adicionado)",
        description: `A marca no início da segunda linha adiciona um artigo à sua lista de exportação. Cinza significa não adicionado; verde, adicionado. Clique novamente para removê-lo.

Ao adicionar um artigo, o registro completo dele é obtido do PubMed (todos os autores, volume, número, páginas, resumo e termos MeSH), por isso a marca fica âmbar e pisca por um momento enquanto isso acontece. Se a busca falhar, a marca continua cinza e informa o motivo, em vez de ficar verde sem nada por trás.

<strong>AS SELEÇÕES SÃO MANTIDAS</strong>
<ul>
<li>Os artigos continuam marcados enquanto você navega pelas páginas de resultados e faz novas pesquisas, então você pode reunir artigos de várias pesquisas antes de exportar</li>
<li>Adicionar novamente um artigo que você removeu é instantâneo: o registro dele é guardado, então o PubMed não é consultado duas vezes</li>
<li>A lista é esvaziada quando você desativa a barra de citações</li>
</ul>

As solicitações são espaçadas em um segundo, de modo que marcar rapidamente uma página inteira as coloca em fila em vez de ultrapassar o limite de solicitações do NCBI. Clicar em um artigo de cada vez nunca tem espera.`,
        ref: null
    },
    {
        label: "Ícone de lista = Abrir a lista de exportação",
        description: `Ao lado da marca, o ícone de lista abre a sua lista de exportação. Ele fica cinza quando nada está selecionado e azul com um número quando você adicionou artigos; esse número é o mesmo em todas as barras da página.

A lista mostra cada artigo com título, revista, ano e PMID, e um ✕ para removê-lo. Os artigos adicionados em uma página anterior aparecem pelo PMID, já que os detalhes deles não estão mais na tela.

<strong>QUATRO AÇÕES</strong>
<ul>
<li><strong>Clear all:</strong> esvazia a lista</li>
<li><strong>Open in new tab:</strong> mostra os artigos selecionados como uma pesquisa do PubMed, em uma nova aba, para que você não perca o ponto em que estava nos resultados que vinha revisando</li>
<li><strong>Download .ris:</strong> formato RIS: EndNote, Mendeley, RefWorks, Papers, Zotero</li>
<li><strong>Download .nbib:</strong> formato MEDLINE: o mesmo arquivo gerado pela opção "Send to → Citation manager" do próprio PubMed; Zotero e EndNote</li>
</ul>

Os dois downloads trazem o registro completo de cada artigo, incluindo o resumo e os termos MeSH. Os arquivos são nomeados com a data e a hora (por exemplo <code>pubmed-citations-2026-09-12-3-04pm.nbib</code>), então exportar várias vezes no mesmo dia nunca sobrescreve um arquivo anterior.

O PubMed aceita no máximo 200 artigos em uma pesquisa, então "Open in new tab" mostra os 200 primeiros se a sua lista for maior; a lista avisa quando isso acontece. Os downloads não têm limite.

<strong>ENVIAR PARA O ZOTERO, COM OS PDFs</strong>
O Zotero precisa de duas peças, e ambas devem estar presentes: a extensão de navegador <strong>Zotero Connector</strong> e o <strong>aplicativo de desktop do Zotero</strong> aberto no seu computador.

Com elas, abra a sua lista no PubMed e clique no ícone de pasta do conector. Escolha <strong>Select All</strong> e depois <strong>OK</strong>: ele salva todos os artigos de uma vez e tenta obter cada PDF usando o acesso a revistas que você já tem. Isso é algo que um arquivo baixado não consegue fazer, porque o conector funciona dentro da sua própria sessão do navegador.

Sem o aplicativo de desktop aberto, o conector oferece salvar na sua biblioteca do zotero.org. O Zotero diz que isso funciona em "algumas páginas", então não é um substituto confiável.

Os downloads .nbib e .ris não precisam de nada disso e também funcionam com EndNote, Mendeley e RefWorks.

<div class='help-ai-pack'><strong>AI PACK (.ZIP) — AINDA EM APRIMORAMENTO</strong>
O <strong>AI pack (.zip)</strong> reúne os artigos da sua lista (até 40) em um único arquivo zip que você pode entregar a uma ferramenta de IA. Quando possível, inclui o texto completo (artigos de acesso aberto e manuscritos de autor do NIH, do Europe PMC ou do PubMed Central); caso contrário, o resumo, além de um README que explica os dados da barra de citações. Descompacte o arquivo e aponte a IA para a pasta, ou envie o próprio zip se a sua ferramenta de IA aceitar arquivos zip.

Os artigos sem texto completo gratuito têm um botão Open (o PDF gratuito do PMC, se houver; senão, a página da editora) para você salvar um PDF ao qual tem acesso.

Documentos grandes podem ser demais para uma ferramenta de IA ler de uma vez. Artigos longos (mais de cerca de 100 páginas) são sinalizados, e cada ferramenta de IA tem seus próprios limites de envio.
<ul>
<li><strong>Convert PDF:</strong> transforma um PDF salvo em texto no seu navegador (nada é enviado). As listas de referências vão para um arquivo separado, e as páginas de tabelas são mantidas em um PDF pequeno. Um PDF digitalizado (só imagens) não tem texto para converter; use o Add PDF nesse caso.</li>
<li><strong>Add PDF:</strong> coloca o PDF no zip como está.</li>
<li><strong>Para layouts complexos ou matemática:</strong> usuários com conhecimento técnico podem converter os PDFs com ferramentas gratuitas como Docling, Marker ou MinerU e depois adicionar os arquivos .md à pasta descompactada.</li>
</ul></div>

<strong>AI TABLE — NOVO, EXPERIMENTAL</strong>
<strong>AI table</strong> lê o título e o resumo de cada artigo da sua lista com a IA integrada do Chrome, no seu próprio computador (nada é enviado), e preenche uma linha por artigo: desenho do estudo, população, tamanho da amostra, intervenção ou exposição e principal achado. <strong>Copy table</strong> copia o texto separado por tabulações para o Excel ou o Google Sheets. Pode errar: uma célula em branco significa que o resumo não informa, o tamanho da amostra só aparece quando esse número está no resumo, e cada linha deve ser conferida com o artigo. O primeiro uso baixa o modelo de IA do Chrome (vários GB). O botão só aparece no Chrome 138 ou posterior, e o modelo precisa de cerca de 22 GB de espaço livre em disco e de uma placa de vídeo com mais de 4 GB de memória ou 16 GB de RAM.`,
        ref: null
    },
    {
        label: "Author = Informações dos autores",
        description: `Mostra o primeiro e o último autor (por convenção acadêmica, o primeiro autor geralmente conduz o trabalho e o último autor dirige o laboratório; se uma organização aparecer por último, usa-se a última pessoa).

<strong>LINKS DE PESQUISA</strong>
<ul>
<li><strong>PubMed:</strong> usa o ORCID (um identificador de autor amplamente usado, Ref: <a href="https://orcid.org/" target="_blank">https://orcid.org/</a>) quando disponível; caso contrário, usa o sobrenome e a inicial do nome</li>
<li><strong>Perfil ORCID:</strong> oferece informações detalhadas do autor com um identificador único de pesquisador, mais confiável que as pesquisas por nome (nem todos os artigos incluem ORCID)</li>
</ul>

<em>Observação: as pesquisas por nome podem incluir outros pesquisadores com nomes parecidos. O ORCID oferece uma identificação precisa.</em>

<strong>MÉTRICAS (do OpenAlex, exigem ORCID)</strong>
<ul>
<li><strong>Índice h:</strong> o número h de artigos que têm pelo menos h citações cada um. Exemplo: 12 artigos com ≥12 citações cada = índice h de 12 (Ref: <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC10771139/" target="_blank">https://pmc.ncbi.nlm.nih.gov/articles/PMC10771139/</a>)</li>
<li><strong>Índice i10:</strong> número de artigos com ≥10 citações</li>
<li><strong>Taxa de citações em 2 anos:</strong> média de citações por artigo em 2 anos</li>
</ul>

<em>Observação: fontes diferentes (Google Scholar, Scopus, Web of Science) calculam essas métricas de forma um pouco diferente porque usam bases de dados de citações distintas. Veja Ref: <a href="https://en.wikipedia.org/wiki/Author-level_metrics" target="_blank">https://en.wikipedia.org/wiki/Author-level_metrics</a></em>

<strong>AFILIAÇÕES</strong>
Lista as afiliações institucionais que constam no artigo.

Observação: o ORCID, o índice h e o índice i10 do primeiro e do último autor são obtidos para todos os artigos (do OpenAlex) e entram nas exportações "Excel" e "Dados". As afiliações só são obtidas quando você clica em Author, por isso não entram nas exportações.

TRABALHOS, CITAÇÕES E RETRATAÇÕES (OpenAlex, requer ORCID): works é o número de trabalhos no perfil do autor no OpenAlex e citations o total de citações recebidas por eles. Os artigos retratados são verificados para o primeiro e o último autor: o número indica os outros artigos retratados do autor no OpenAlex, sem contar este artigo. Se algum tiver um ou mais, Author na barra ganha um contorno vermelho. No painel Author, uma contagem de 1 ou mais leva aos artigos retratados desse autor no OpenAlex (a lista pode incluir este artigo; avisos de retratação não são contados). "–" significa que não foi possível verificar (sem ORCID, nome que não corresponde ao OpenAlex, OpenAlex indisponível ou resultados demais para contar), nunca zero. Todos esses dados, e a taxa de citações em 2 anos, também estão na exportação para Excel (Author Retractions é o maior número entre os dois; fica em branco se algum não pôde ser verificado e nenhum tem retratação).`,
        ref: null
    },
    {
        label: "J = Informações do periódico",
        description: "Clique em J para ver o periódico: nome completo, ISSN impresso e eletrônico, NLM ID (com link para o NLM Catalog), SJR e Top-J. Com os dados do Journal Ranking da extensão: a posição do periódico e seus artigos adicionados ao PubMed neste ano; o crescimento em relação aos mesmos meses do ano anterior; seu % de Medline, % de texto completo gratuito e % de ORCID deste ano; e suas retratações: artigos do periódico, de qualquer ano de publicação, que o PubMed marcou como retratados nos mesmos meses deste ano e do anterior (ou preprints retirados, nos servidores de preprints). As mesmas linhas estão no Report. O OpenAlex acrescenta o país do periódico, a editora, se é de acesso aberto e está no DOAJ, a APC, o índice h, a média de citações em 2 anos e o primeiro ano; a consulta é feita uma vez por periódico ao abrir J ou o Report. O painel começa com o título e o tipo de publicação do artigo, e a linha do SJR inclui o melhor quartil do periódico.",
        ref: "https://tomlaheyh.github.io/citation-bar/journal-ranking/journal-ranking.html"
    },
    {
        label: "Top-J = Revista de ponta",
        description: "Minha própria lista selecionada das principais revistas médicas, incluindo as revistas associadas sob o mesmo grupo editorial (por exemplo, a família JAMA). A correspondência é feita pelo ISSN e mostra \"Yes\" se a revista corresponder. A lista é intencionalmente pequena e muito seletiva. Lista atual: Annals of Internal Medicine, British Medical Journal (BMJ), European Heart Journal, Journal of the American College of Cardiology, JAMA, Lancet, Nature, New England Journal of Medicine. Aceito sugestões, mas ela foi pensada para ser uma lista mínima.",
        ref: null
    },
    {
        label: "SJR = SCImago Journal Rank",
        description: "Uma classificação de revistas gratuita e muito respeitada. O SCImago Journal Rank (SJR) mede a visibilidade das revistas com um algoritmo semelhante ao PageRank™ do Google. O SCImago é um grupo de pesquisa vinculado a várias universidades espanholas e ao CSIC, especializado em análise e visualização da informação. As novas classificações são publicadas uma vez por ano (normalmente em abril). Quando o SCImago fornece, o melhor quartil do periódico (Q1 a Q4) aparece no texto ao passar o mouse, no painel J, no Report e na exportação \"Excel\". O SCImago classifica o periódico dentro de cada uma de suas áreas temáticas, e este é o melhor desses quartis: Q1 significa os 25% superiores em pelo menos uma área.",
        ref: "https://www.scimagojr.com/aboutus.php"
    },
    {
        label: "YTD = Artigos da revista no ano até agora",
        description: "O número de artigos que esta revista (pelo ISSN) publicou durante o período coberto pelos dados de classificação da extensão. Baixo todos os dados do PubMed (normalmente todo mês) e classifico as revistas pelo total de artigos, artigos gratuitos e artigos indexados no Medline no ano. Esses dados de classificação vêm com a extensão e são atualizados a cada versão, então os números cobrem o período indicado no arquivo de classificação. Quando eu estava aprendendo a usar o PubMed, algo assim teria sido muito útil; espero que seja para você também.",
        ref: null
    },
    {
        label: "Medline % = Porcentagem de artigos da revista no Medline no ano até agora",
        description: "A porcentagem de artigos de uma revista (pelo ISSN) que foram indexados no Medline no mesmo período. Vem dos meus próprios dados de classificação. Observe que isso reflete a indexação, e não a qualidade da revista: artigos publicados recentemente podem ainda não estar indexados, então uma revista que publica com frequência pode mostrar uma porcentagem menor que a sua taxa final.",
        ref: null
    },
    {
        label: "Free % = Porcentagem de artigos da revista com texto completo gratuito no ano até agora",
        description: "A porcentagem de artigos de uma revista (pelo ISSN) disponíveis com texto completo gratuito no mesmo período. Vem dos mesmos dados de classificação que a contagem YTD e o Medline %.",
        ref: null
    },
    {
        label: "Xout = Pesquisa com exclusões",
        description: `Refaz a pesquisa no PubMed com filtros que excluem pesquisas não primárias. Abre uma caixa de diálogo com a sua pesquisa atual já preenchida e caixas de seleção para excluir tipos de publicação que, juntos, representam aproximadamente 25% de todos os artigos do PubMed:

<ul>
<li><strong>Has Abstract:</strong> exige que os artigos tenham resumo (recomendado: artigos sem resumo raramente são pesquisa primária revisada por pares)</li>
<li><strong>No Retracted Publications:</strong> exclui os artigos retratados e seus avisos de retratação</li>
<li><strong>No Published Errata:</strong> exclui os avisos de correção ou errata</li>
<li><strong>No Letters:</strong> exclui as cartas ao editor</li>
<li><strong>No Editorials:</strong> exclui os editoriais</li>
<li><strong>No Comments:</strong> exclui os artigos de comentário</li>
<li><strong>No Systematic Reviews:</strong> exclui as revisões sistemáticas</li>
<li><strong>No Meta-Analyses:</strong> exclui as metanálises</li>
<li><strong>No Reviews:</strong> exclui os artigos de revisão</li>
</ul>

Todos os filtros vêm marcados por padrão. Desmarque qualquer filtro para permitir esse tipo. A pré-visualização da consulta completa é atualizada em tempo real enquanto você ajusta os filtros. Você pode pesquisar diretamente (na aba atual), copiar a consulta ou cancelar. View Expanded mostra sua pesquisa ao lado da leitura que o PubMed faz dela (a tradução da consulta do E-utilities), para você ver como o mapeamento automático de termos expandiu as palavras sem marcação.`,
        ref: null
    },
    {
        label: "kS = Pesquisas-chave",
        description: "Pesquisas prontas no PubMed sobre temas com grande volume ou em rápido crescimento, agrupadas por área. Clique em kS para ver os grupos, aponte para um grupo ou clique nele para ver suas pesquisas e clique em uma pesquisa para abri-la em uma nova aba. Cada pesquisa exige que o tema seja o assunto principal do artigo (MeSH Major Topic ou título) e que haja resumo, e exclui artigos retratados e seus avisos de retratação, erratas, cartas, editoriais e comentários. Revisões, revisões sistemáticas e metanálises são mantidas. A consulta completa aparece na caixa de pesquisa do PubMed. Os nomes dos grupos e das pesquisas estão em inglês, assim como os termos de pesquisa. A linha Years, na parte de baixo do menu, adiciona à pesquisa um limite móvel pela data de publicação, como \"last 5 years\"[dp] para os últimos 1, 5 ou 10 anos, ou nenhum com All. Ele faz parte da consulta, então é mantido quando a consulta é copiada. Sua escolha fica salva.",
        ref: null
    },
    {
        label: "pR = Relatórios do PubMed (visões gerais essenciais)",
        description: "Abre um menu com oito ferramentas de relatórios do PubMed no site do PubMed Citation Bar: PubMed Summary Report (visão geral de uma pesquisa no PubMed), PubMed Filters Report (análise de filtros), PubMed MeSH Counts (frequência dos termos MeSH), PubMed Journal Ranking (dados de classificação de revistas), PubMed Drift Report (mudanças dia a dia nas medidas de status das citações do PubMed), PubMed ORCID Ranking (os ORCID iDs presentes em mais artigos do PubMed a cada ano), PubMed ROR Ranking (organizações classificadas por artigos adicionados neste ano, pelas afiliações dos autores) e PubMed iCite Citation Gains (artigos adicionados nos últimos 36 meses com mais citações ganhas nos últimos 12 meses). Cada uma abre em uma nova aba.",
        ref: "https://tomlaheyh.github.io/citation-bar/"
    },
    {
        label: "/Report = Relatório de citações",
        description: "Um relatório que reúne todas as medidas e links principais de um artigo em um formato fácil de copiar. Dois botões no pop-up exportam a página inteira de resultados: \"Excel\" gera uma tabela separada por tabulações com exatamente o que a barra mostra (uma linha por artigo, pronta para colar diretamente no Excel ou no Google Sheets), enquanto \"Dados\" exporta tudo: primeiro os PMIDs e depois todas as medidas, os registros de data e hora da extensão e os campos internos. Esse segundo botão mostra com total transparência todos os dados que a extensão usa. Não há nenhum rastreamento de usuários.\n\nObservação: os ORCIDs, o índice h e o índice i10 do primeiro e do último autor são obtidos para todos os artigos e entram nas exportações \"Excel\" e \"Dados\". Outros dados só são obtidos quando você clica em um item da barra, porque buscá-los para todos os artigos levaria tempo demais. Isso inclui os resumos (Abstract), os financiamentos e as afiliações dos autores. Esses dados não entram nas exportações.",
        ref: null
    },
    {
        label: "Memória = Memória livre do sistema (fica vermelha quando está baixa)",
        description: "Exibida na parte inferior do pop-up da extensão. O Chrome (não a extensão) mantém na memória as páginas mais recentes de cada aba para que o botão Voltar seja instantâneo, e uma aba usada para muitas pesquisas tende a reter cada vez mais memória com o tempo. Isso acontece com ou sem esta extensão; a barra de citações acrescenta a sua própria parte em cada página.<br><br>Para evitar esse acúmulo, a extensão reabre a sua aba na mesma página depois que a barra de citações é executada seis vezes. Você continua nos resultados que estava vendo e não precisa digitar nada de novo; o que se perde é o histórico de Voltar dessa aba, uma troca justa pela memória liberada. Ela nunca faz isso no meio de um Analisar 1000, nem enquanto você está em uma página de resultados de Só alto impacto ou de Analisar 1000.<br><br>A linha Memória fica vermelha quando a memória livre cai abaixo de 2 GB, que é quando o Chrome começa a ter dificuldades em qualquer computador. Quando isso acontecer, geralmente basta fechar os aplicativos que você não está usando. O botão Redefinir extensão também apaga os dados salvos da extensão e o cache do Chrome e reabre a aba, se você preferir fazer isso manualmente. O Reset Extension apaga os dados de site apenas das páginas do PubMed e do NCBI. Os dados de outros sites e o seu histórico, cookies e senhas não são alterados.",
        ref: null
    },
    {
        label: "Ícone de copiar (janela) = Referência desta pesquisa",
        description: "O pequeno ícone de copiar no início da linha de citação no topo da janela copia uma referência da pesquisa do PubMed na aba atual: a base de dados, a data da pesquisa, a consulta exatamente como foi executada, os filtros da barra lateral, o número de resultados e a URL. Ele segue o PRISMA-S, o padrão para relatar buscas na literatura. A data importa porque o MeSH e o mapeamento automático de termos do PubMed mudam com o tempo, então a mesma pesquisa pode trazer outros resultados depois. O texto copiado fica em inglês, para uso em artigos e protocolos.",
        ref: null
    }
];


// Header, button and score text of the help panel, by language
const HELP_UI = {
    en: { title: "Citation Bar Help", close: "Close", score: "The overall score of this article is" },
    es: { title: "Ayuda de la barra de citas", close: "Cerrar", score: "La puntuación general de este artículo es" },
    zh: { title: "引文栏帮助", close: "关闭", score: "本文的综合评分为" },
    ja: { title: "引用バーのヘルプ", close: "閉じる", score: "この論文の総合スコア：" },
    ko: { title: "인용 바 도움말", close: "닫기", score: "이 논문의 종합 점수:" },
    fr: { title: "Aide de la barre de citations", close: "Fermer", score: "Le score global de cet article est de" },
    hi: { title: "साइटेशन बार सहायता", close: "बंद करें", score: "इस लेख का समग्र स्कोर है:" },
    ar: { title: "مساعدة شريط الاستشهادات", close: "إغلاق", score: "الدرجة الإجمالية لهذه المقالة هي:" },
    bn: { title: "সাইটেশন বার সাহায্য", close: "বন্ধ করুন", score: "এই নিবন্ধের সামগ্রিক স্কোর:" },
    pt: { title: "Ajuda da barra de citações", close: "Fechar", score: "A pontuação geral deste artigo é" }
};

export function getHelpText(lang) {
    return { ...helpText, ...(HELP_UI[lang] || HELP_UI.en) };
}

// Generate HTML for help items in the chosen language (English otherwise)
export function generateHelpHTML(lang = 'en') {
    const items = { es: helpItemsEs, zh: helpItemsZh, ja: helpItemsJa, ko: helpItemsKo, fr: helpItemsFr, hi: helpItemsHi, ar: helpItemsAr, bn: helpItemsBn, pt: helpItemsPt }[lang] || helpItems;
    let html = '';
    items.forEach((item, index) => {
        const refLink = item.ref 
            ? ` <a href="${item.ref}" target="_blank" class="help-ref-link">Ref</a>` 
            : '';
        
        html += `<div class="help-item">
            <div class="help-item-label"><strong>${item.label}</strong>${refLink}</div>
            <div class="help-item-description">${item.description}</div>
        </div>`;
        
        // Add separator between items (except last)
        if (index < items.length - 1) {
            html += '<hr class="help-separator">';
        }
    });
    // Arabic reads right to left
    return lang === 'ar' ? `<div dir="rtl">${html}</div>` : html;
}

export const helpStyles = `
    .citation-help {
        display: inline-block;
        width: 16px;
        height: 16px;
        background-color: #0066cc;
        color: white;
        border-radius: 50%;
        text-align: center;
        line-height: 16px;
        font-size: 12px;
        font-weight: bold;
        cursor: pointer;
        margin-right: 5px;
        position: relative;
    }
    
    .citation-help:hover {
        background-color: #0052a3;
    }

    .help-modal {
        display: none;
        position: fixed;
        z-index: 10001;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
    }

    .help-modal-content {
        background-color: white;
        margin: 5% auto;
        border: 1px solid #888;
        width: 90%;
        max-width: 600px;
        max-height: 80vh;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    .help-modal-header {
        padding: 15px 20px;
        border-bottom: 1px solid #ddd;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background-color: #f5f5f5;
        border-radius: 8px 8px 0 0;
    }

    .help-modal-header h3 {
        margin: 0;
        font-size: 18px;
        color: #333;
    }

    .help-modal-close {
        cursor: pointer;
    }

        .help-modal-body {
        padding: 20px;
        overflow-y: auto;
        flex: 1;
    }

    .help-item {
        margin-bottom: 8px;
    }

    .help-item-label {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin-bottom: 4px;
    }

    .help-item-label strong {
        color: #333;
    }

    .help-item-description {
        color: #555;
        font-size: 13px;
        line-height: 1.5;
        padding-left: 0;
    }

    .help-item-description code {
        display: block;
        background-color: #f4f4f4;
        border: 1px solid #ddd;
        border-radius: 4px;
        padding: 12px;
        margin-top: 8px;
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        font-size: 11px;
        line-height: 1.4;
        overflow-x: auto;
        white-space: pre;
        color: #333;
    }

    .help-ref-link {
        color: #0066cc;
        text-decoration: none;
        font-size: 12px;
        font-weight: normal;
        margin-left: 8px;
    }

    .help-ref-link:hover {
        text-decoration: underline;
    }

    .help-separator {
        border: none;
        border-top: 1px solid #eee;
        margin: 12px 0;
    }

    .help-version {
        text-align: center;
        color: #999;
        font-size: 11px;
        padding: 10px;
        border-top: 1px solid #eee;
        margin-top: 10px;
    }

    /* Tooltip styles for citation bar items */
    [data-tooltip] {
        position: relative;
    }

    [data-tooltip]::after {
        content: attr(data-tooltip);
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        background-color: #333;
        color: white;
        padding: 6px 10px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: normal;
        white-space: nowrap;
        z-index: 10000;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.2s ease, visibility 0.2s ease;
        transition-delay: 0s;
        pointer-events: none;
        box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        margin-bottom: 5px;
    }

    [data-tooltip]:hover::after {
        opacity: 1;
        visibility: visible;
        transition-delay: 1.5s;
    }
`;

// For backward compatibility, also export the old helpText format
export const helpText = {
    title: "Citation Bar Help",
    content: "Click the ? icon for detailed help information."
};
