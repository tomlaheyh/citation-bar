// pdfConvert.js
//
// PDF -> Markdown text, plus a small PDF holding only the pages that carry a
// table. For the AI reading pack's "Convert PDF" button.
//
// background.js injects this on demand (action "pcbLoadPdfTools"), after
// lib/pdf.min.js, lib/pdf.worker.min.js and lib/pdf-lib.min.js, into the same
// isolated world as the citation bar. It defines globalThis.pcbPdfConvert.
//
// Tables are NOT converted. A PDF has no table object, only positioned text,
// and a rebuilt table that is wrong looks exactly like one that is right. So
// the page that holds each "Table N" caption is copied whole into the tables
// PDF, and the Markdown gets a marker at the caption pointing to it. The
// table's own text stays where it falls, flagged as unreliable.
//
// pdf.js runs on the page's own thread here: pdf.worker.min.js is loaded as a
// plain script, which pdf.js picks up in place of a Worker (a content script
// cannot start a Worker from an extension URL). A large PDF can hold the tab
// for a few seconds.

(function () {
    'use strict';

    // A line that opens with "Table 2", "TABLE II", "Supplementary Table S1".
    // Also chapter numbering: "Table 2-1", "Table 7.2".
    const CAPTION = /^(?:Supplementa(?:l|ry)\s+)?Table\s+(?:S?\d+(?:[-.\u2013]\d+)?[A-Za-z]?|[IVXL]+)\b/i;
    // After the label: punctuation, a capital, "(continued)", or nothing.
    // "Table 2 shows that" in running text fails this.
    const CAPTION_REST = /^(?:$|[.:|\u2013\u2014-]|\(|[A-Z])/;
    // Standalone section names, for headings set in the body font.
    // A reference-list heading. Its section goes to a separate list: an AI
    // rarely needs it, and in a long report it is a third of the text.
    const REFS = /^(?:\d+\.?\s+)?(?:references?(?:\s+cited)?|bibliography|literature cited|works cited)\s*:?$/i;
    const SECTION = /^(?:\d+\.?\s+)?(?:abstract|introduction|background|methods?|materials? and methods|patients and methods|study design|results?|discussion|conclusions?|limitations|references|acknowledge?ments?|funding|supplementary materials?|data availability(?: statement)?|conflicts? of interest|author contributions|keywords)\s*:?$/i;

    function median(values) {
        if (!values.length) return 0;
        const sorted = values.slice().sort((a, b) => a - b);
        return sorted[Math.floor(sorted.length / 2)];
    }

    // One page -> rows of text items, top to bottom. Coordinates are in the
    // page's viewport: points, y growing downward, page rotation applied.
    //
    // Text is read in one direction per page. Normally that is upright, and
    // sideways text is a margin stamp ("Author Manuscript", "Downloaded
    // from ...") to drop. But a wide table is often set sideways on an
    // upright page - every table in an NIH author manuscript is - so when
    // sideways text clearly outweighs upright text, the page is read turned
    // and the upright header and footer are what gets dropped.
    async function readRows(page) {
        const view = page.getViewport({ scale: 1 });
        const content = await page.getTextContent();
        const all = [];
        const chars = { '0': 0, '1': 0, '-1': 0 };
        content.items.forEach(it => {
            if (!it.str || !it.str.trim()) return;
            const t = globalThis.pdfjsLib.Util.transform(view.transform, it.transform);
            const angle = Math.atan2(t[1], t[0]) / (Math.PI / 2);
            const turn = Math.round(angle);          // 0 upright, 1 reads downward, -1 reads upward
            if (!(turn in chars) || Math.abs(angle - turn) > 0.12) return;
            const size = Math.hypot(t[2], t[3]);
            if (size < 1) return;
            chars[turn] += it.str.length;
            all.push({ str: it.str, x: t[4], y: t[5], w: it.width, size, turn });
        });
        const side = chars['1'] > chars['-1'] ? 1 : -1;
        const turn = chars[side] > 200 && chars[side] > 3 * chars['0'] ? side : 0;
        const items = all.filter(it => it.turn === turn);
        if (turn) {
            items.forEach(it => {
                const { x, y } = it;
                it.x = turn === 1 ? y : view.height - y;
                it.y = turn === 1 ? view.width - x : x;
            });
        }
        items.sort((a, b) => a.y - b.y || a.x - b.x);
        const rows = [];
        let row = null;
        items.forEach(it => {
            // 0.45 of the font size keeps superscripts on their own line's row.
            if (!row || it.y - row.y > 0.45 * Math.max(row.size, it.size)) {
                row = { y: it.y, size: it.size, items: [] };
                rows.push(row);
            }
            row.items.push(it);
        });
        rows.forEach(r => r.items.sort((a, b) => a.x - b.x));
        return { rows, height: turn ? view.width : view.height, turned: turn !== 0 };
    }

    // The gap between two columns, if the page has one: a vertical strip near
    // the middle that most rows leave empty. Returns { g0, g1 } or null.
    // Rows are counted, not gaps, because the two columns' baselines often do
    // not line up, and then no single row shows a gap at all.
    function findGutter(rows) {
        if (rows.length < 12) return null;
        let x0 = Infinity, x1 = -Infinity;
        rows.forEach(r => r.items.forEach(it => { x0 = Math.min(x0, it.x); x1 = Math.max(x1, it.x + it.w); }));
        const width = x1 - x0;
        if (!(width > 200)) return null;
        const lo = Math.floor(x0 + 0.3 * width);
        const hi = Math.ceil(x0 + 0.7 * width);
        const cover = new Array(hi - lo + 1).fill(0);
        rows.forEach(r => {
            const fill = Math.max(5, 0.6 * r.size);   // a word space is not a gap
            let from = null, to = null;
            const mark = () => {
                if (from === null) return;
                for (let b = Math.max(lo, Math.floor(from)); b <= Math.min(hi, Math.ceil(to)); b++) cover[b - lo]++;
            };
            r.items.forEach(it => {
                if (from !== null && it.x - to <= fill) { to = Math.max(to, it.x + it.w); return; }
                mark();
                from = it.x; to = it.x + it.w;
            });
            mark();
        });
        const min = Math.min(...cover);
        if (min > 0.5 * rows.length) return null;
        const slack = Math.max(1, Math.round(0.02 * rows.length));
        let best = null, start = null;
        for (let i = 0; i <= cover.length; i++) {
            const open = i < cover.length && cover[i] <= min + slack;
            if (open && start === null) start = i;
            if (!open && start !== null) {
                if (!best || i - start > best.g1 - best.g0) best = { g0: lo + start, g1: lo + i - 1 };
                start = null;
            }
        }
        if (!best || best.g1 - best.g0 < 5) return null;
        // Both sides must hold text of their own, or this is one column with
        // short lines.
        const clear = r => !r.items.some(it => it.x < best.g1 - 0.5 && it.x + it.w > best.g0 + 0.5);
        const left = rows.filter(r => clear(r) && r.items.some(it => it.x + it.w <= best.g0 + 0.5)).length;
        const right = rows.filter(r => clear(r) && r.items.some(it => it.x >= best.g1 - 0.5)).length;
        return left >= 5 && right >= 5 ? best : null;
    }

    // Items of one line -> text. A wide gap starts a new cell, so a table row
    // keeps its columns apart.
    function makeLine(items, side, page) {
        const main = items.reduce((a, b) => (b.str.length > a.str.length ? b : a));
        const cellGap = Math.max(7, 0.9 * main.size);
        const cells = [];
        let text = '', end = null;
        items.forEach(it => {
            const gap = end === null ? 0 : it.x - end;
            if (end !== null && gap > cellGap) { cells.push(text.trim()); text = ''; }
            else if (end !== null && gap > 0.15 * main.size && !/\s$/.test(text) && !/^\s/.test(it.str)) text += ' ';
            text += it.str;
            end = it.x + it.w;
        });
        cells.push(text.trim());
        const kept = cells.filter(Boolean);
        return {
            text: kept.join(' ').replace(/\s+/g, ' '), cells: kept, side, page,
            x0: items[0].x, y: main.y, size: main.size
        };
    }

    // Rows -> lines in reading order. With two columns the page is read in
    // bands: a full-width row (title, abstract, wide caption) closes the band
    // above it, and each band is read left column first.
    function orderLines(rows, gutter, page) {
        const out = [];
        let left = [], right = [];
        const flush = () => { out.push(...left, ...right); left = []; right = []; };
        rows.forEach(r => {
            if (!gutter || r.items.some(it => it.x < gutter.g1 - 0.5 && it.x + it.w > gutter.g0 + 0.5)) {
                flush();
                out.push(makeLine(r.items, 'F', page));
                return;
            }
            const mid = (gutter.g0 + gutter.g1) / 2;
            const l = r.items.filter(it => it.x + it.w / 2 < mid);
            const rr = r.items.filter(it => it.x + it.w / 2 >= mid);
            if (l.length) left.push(makeLine(l, 'L', page));
            if (rr.length) right.push(makeLine(rr, 'R', page));
        });
        flush();
        return out.filter(ln => ln.text);
    }

    // Running headers, footers and page numbers: text in the top or bottom
    // margin that repeats across pages (digits ignored), or is only a number.
    function dropMargins(pages) {
        const key = ln => ln.text.replace(/\d+/g, '#').toLowerCase();
        const inMargin = (ln, h) => ln.y < 0.1 * h || ln.y > 0.9 * h;
        const seen = {};
        pages.forEach(p => {
            new Set(p.lines.filter(ln => inMargin(ln, p.height)).map(key)).forEach(k => { seen[k] = (seen[k] || 0) + 1; });
        });
        // On 5 pages or more it is a running line however long the document:
        // a 1,000-page report has headers that differ chapter by chapter.
        const need = Math.min(5, Math.max(2, Math.ceil(0.3 * pages.length)));
        pages.forEach(p => {
            p.lines = p.lines.filter(ln => !inMargin(ln, p.height) ||
                !(/^(?:page\s+)?\d{1,4}(?:\s+of\s+\d+)?$/i.test(ln.text) || seen[key(ln)] >= need));
        });
    }

    // Marks each line with how it relates to the one before it, and whether it
    // is a table caption. Returns the body font size.
    function annotate(lines) {
        const weight = {};
        lines.forEach(ln => { const k = Math.round(ln.size * 2) / 2; weight[k] = (weight[k] || 0) + ln.text.length; });
        const body = Number(Object.keys(weight).sort((a, b) => weight[b] - weight[a])[0]) || 10;
        const gaps = [];
        lines.forEach((ln, i) => {
            const prev = lines[i - 1];
            // jump: a new column or page, so vertical distance means nothing.
            ln.jump = !prev || ln.page !== prev.page || ln.side !== prev.side || ln.y < prev.y;
            ln.gap = ln.jump ? 0 : ln.y - prev.y;
            ln.sizeChange = !!prev && Math.abs(ln.size - prev.size) > 0.6;
            if (!ln.jump && !ln.sizeChange && Math.abs(ln.size - body) < 0.6 && ln.gap > 0 && ln.gap < 2.2 * body) gaps.push(ln.gap);
        });
        const leading = median(gaps) || 1.2 * body;
        lines.forEach((ln, i) => {
            const prev = lines[i - 1];
            ln.bigGap = !ln.jump && ln.gap > 1.45 * leading * Math.max(1, ln.size / body);
            // A bullet or numbered item hangs: its later lines sit further in,
            // and are not new paragraphs.
            ln.indent = !ln.jump && ln.gap > 0 && ln.x0 - prev.x0 > 0.8 * ln.size && ln.x0 - prev.x0 < 4 * ln.size &&
                !/^(?:[\u2022\u2013*-]|\(?\d{1,3}[.)])\s/.test(prev.text);
            const match = CAPTION.exec(ln.text);
            // A caption stands apart from the text above it; "Table 2." at the
            // start of a wrapped line of running text does not.
            if (match && CAPTION_REST.test(ln.text.slice(match[0].length).trim()) &&
                (ln.jump || ln.bigGap || ln.sizeChange || Math.abs(ln.size - body) > 0.4 || /^TABLE/.test(ln.text))) {
                ln.caption = match[0].replace(/\s+/g, ' ');
            }
        });
        return body;
    }

    function joinText(a, b) {
        // "inflam-" + "mation": a word split across lines.
        return /[A-Za-z]{2}-$/.test(a) && /^[a-z]/.test(b) ? a.slice(0, -1) + b : `${a} ${b}`;
    }

    // Returns { markdown, references }. Each reference list leaves a one-line
    // pointer in the text and goes to `references` under the title of the
    // section it closes (a report has one list per chapter, each numbered
    // from 1). The list ends at the next heading, table caption or larger
    // text, so a heading set in body type cannot pull the rest of the
    // document in after it.
    function toMarkdown(lines, body, marker) {
        const out = [];
        const refs = [];
        let target = out;
        let para = null, code = null, head = null;
        let refLines = null, sectionTitle = '', sectionSize = 0;
        const flush = () => {
            if (para !== null) target.push(para);
            if (code) target.push('```text\n' + code.join('\n') + '\n```');
            para = null; code = null;
        };
        const tabular = i => lines[i] && lines[i].cells.length > 1 && !lines[i].caption;
        const isHeading = ln => (ln.size >= 1.15 * body && ln.text.length <= 150) || (ln.text.length <= 40 && SECTION.test(ln.text));
        const refNumber = ln => { const m = /^\[?(\d{1,4})[.)\]]\s/.exec(ln.text); return m ? Number(m[1]) : 0; };
        // A finished list. Numbered: one entry per number that follows on from
        // the last ("2023. Accessed" at the start of a wrapped line is not
        // one), and any text before entry 1 is article text that the page
        // order put after the heading - it goes back into the text. Not
        // numbered: entries split at paragraph gaps.
        const endRefs = () => {
            const first = refLines.findIndex(ln => refNumber(ln) === 1);
            const lead = first > 0 ? refLines.slice(0, first) : [];
            const list = first > 0 ? refLines.slice(first) : refLines;
            lead.forEach((ln, k) => {
                if (para === null || k === 0 || ln.bigGap || ln.indent) { flush(); para = ln.text; }
                else para = joinText(para, ln.text);
            });
            flush();
            target = refs;
            let refNo = 0;
            list.forEach(ln => {
                const num = refNumber(ln);
                const next = first >= 0 && num > 0 && (num === refNo + 1 || num === 1);
                if (next) refNo = num;
                if (para === null || next || (first < 0 && ln.bigGap)) { flush(); para = ln.text; }
                else para = joinText(para, ln.text);
            });
            flush();
            target = out;
            refLines = null;
        };
        lines.forEach((ln, i) => {
            const prev = lines[i - 1];
            if (isHeading(ln) && REFS.test(ln.text)) {
                flush();
                if (refLines) endRefs();
                else out.push('_[References for this section are in the references file.]_');
                refLines = [];
                refs.push(`## References${sectionTitle ? ` - ${sectionTitle}` : ''}`);
                sectionTitle = ''; sectionSize = 0; head = null;
                return;
            }
            if (refLines) {
                if (!(isHeading(ln) || ln.caption || ln.size > body + 0.6)) {
                    refLines.push(ln);
                    return;
                }
                endRefs();
            }
            if (ln.caption) {
                flush();
                out.push(marker(ln));
                para = ln.text;
                head = null;
                return;
            }
            // Two or more consecutive lines with separated cells: table rows.
            // Kept one row per line with the cells apart, which is easier to
            // read than one run of numbers, though still not to be trusted.
            if (tabular(i) && ((tabular(i - 1) && prev.page === ln.page) || (tabular(i + 1) && lines[i + 1].page === ln.page))) {
                if (!code) { flush(); code = []; }
                code.push(ln.cells.join(' | '));
                head = null;
                return;
            }
            if (code) flush();
            if ((ln.size >= 1.15 * body && ln.text.length <= 150) || (ln.text.length <= 40 && SECTION.test(ln.text))) {
                // A heading wrapped over several lines is one heading.
                if (head && head === prev && !ln.jump && !ln.sizeChange && ln.gap < 1.6 * ln.size) {
                    out[out.length - 1] += ` ${ln.text}`;
                    if (sectionTitle && ln.size >= sectionSize) sectionTitle += ` ${ln.text}`;
                } else {
                    flush();
                    out.push(`## ${ln.text}`);
                    // The largest heading since the last list names that list.
                    if (ln.size > sectionSize) { sectionTitle = ln.text; sectionSize = ln.size; }
                }
                head = ln;
                return;
            }
            head = null;
            if (para === null || ln.sizeChange || ln.bigGap || ln.indent) {
                flush();
                para = ln.text;
            } else {
                para = joinText(para, ln.text);
            }
        });
        flush();
        if (refLines) endRefs();
        return { markdown: out.join('\n\n'), references: refs.join('\n\n') };
    }

    // The table pages, copied whole into a new PDF.
    async function copyPages(file, pageNumbers) {
        const source = await globalThis.PDFLib.PDFDocument.load(await file.arrayBuffer(),
            { ignoreEncryption: true, updateMetadata: false });
        // pdf-lib cannot decrypt, and pages copied from a protected PDF come
        // out unreadable.
        if (source.isEncrypted) throw new Error('the PDF is protected');
        const target = await globalThis.PDFLib.PDFDocument.create();
        const copied = await target.copyPages(source, pageNumbers.map(n => n - 1));
        copied.forEach(p => target.addPage(p));
        return target.save();
    }

    // file: a File or Blob holding a PDF. tablesName: the file name the tables
    // PDF will have in the pack, written into the markers.
    // Returns { markdown, referencesMarkdown, words, allWords, pages,
    //           tables: [{ label, page, pdfPage }], tablePages,
    //           tablesPdf (Uint8Array or null), tablesError }.
    globalThis.pcbPdfConvert = async function (file, tablesName) {
        const task = globalThis.pdfjsLib.getDocument({
            data: new Uint8Array(await file.arrayBuffer()),
            // Text only is read here, never drawn, but leave nothing to chance
            // with a file from the web: no generated code, no font loading.
            // isEvalSupported: false also blocks CVE-2024-4367 (code run from a
            // crafted font), which affects this pdf.js version (fixed in 4.2.67).
            isEvalSupported: false,
            disableFontFace: true,
            verbosity: 0
        });
        let pages;
        try {
            const pdf = await task.promise;
            pages = [];
            for (let n = 1; n <= pdf.numPages; n++) {
                const { rows, height, turned } = await readRows(await pdf.getPage(n));
                pages.push({ height, turned, lines: orderLines(rows, findGutter(rows), n) });
            }
        } finally {
            await task.destroy();
        }
        if (pages.length >= 3) dropMargins(pages);
        const lines = pages.flatMap(p => p.lines);
        const body = annotate(lines);
        const allWords = lines.reduce((n, ln) => n + ln.text.split(' ').filter(Boolean).length, 0);

        const captions = lines.filter(ln => ln.caption);
        const captionPages = new Set(captions.map(ln => ln.page));
        // A long table runs on over pages that carry no caption. A page
        // straight after a table page is taken as the same table continuing
        // when it is set sideways, when it opens with table rows, or when it
        // holds little text and the next page starts another table (the last
        // rows and footnotes of the one before).
        const more = {};      // caption page -> number of continuation pages
        const tableSet = new Set(captionPages);
        let from = 0;
        pages.forEach((p, i) => {
            const n = i + 1;
            if (captionPages.has(n)) from = n;
            else if (from && tableSet.has(n - 1) && (p.turned ||
                (p.lines.length >= 3 && p.lines.slice(0, 3).every(ln => ln.cells.length > 1)) ||
                (captionPages.has(n + 1) && p.lines.reduce((w, ln) => w + ln.text.split(' ').length, 0) < 250))) { tableSet.add(n); more[from] = (more[from] || 0) + 1; }
            else from = 0;
        });
        const tablePages = Array.from(tableSet).sort((a, b) => a - b);
        let tablesPdf = null, tablesError = '';
        if (tablePages.length) {
            try {
                tablesPdf = await copyPages(file, tablePages);
            } catch (error) {
                tablesError = error.message || String(error);
            }
        }

        const marker = ln => {
            const span = (first, count) => (count ? `pages ${first}-${first + count}` : `page ${first}`);
            const where = `${span(ln.page, more[ln.page])} of the original PDF`;
            return tablesPdf
                ? `> **${ln.caption}: see \`${tablesName}\`, ${span(tablePages.indexOf(ln.page) + 1, more[ln.page])} (${where}).** ` +
                  "The text below is this table's raw extracted text and may be scrambled. Take values from the PDF page, not from this text."
                : `> **${ln.caption} (${where}): the table page is not in this pack.** ` +
                  "The text below is this table's raw extracted text and may be scrambled. Do not rely on values taken from it.";
        };
        const converted = toMarkdown(lines, body, marker);
        const refWords = converted.references.split(/\s+/).filter(Boolean).length;
        return {
            markdown: converted.markdown,
            // The reference lists, or '' when none were found.
            referencesMarkdown: converted.references,
            // Words of the text itself; allWords includes the reference lists
            // (used to tell a scan from a real PDF).
            words: Math.max(0, allWords - refWords),
            allWords,
            pages: pages.length,
            tables: captions.map(ln => ({ label: ln.caption, page: ln.page, pdfPage: tablesPdf ? tablePages.indexOf(ln.page) + 1 : null })),
            tablePages,
            tablesPdf,
            tablesError
        };
    };
})();
