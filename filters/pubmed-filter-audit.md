# PubMed Filter Audit — `GitHub-doi-lookup/filters`

**Audited:** 2026-09-06 22:30 UTC
**Against:** NLM Technical Bulletin, *PubMed Update: MeSH and Article Type Filter Changes*, effective **2026-03-31**
**Files reviewed:** `filters-config.json`, `filters.html`, `pubmed-filters-data.csv` (report dated 2026-09-05, window Jan–Aug 2026)
**Method:** all 103 live filter tokens in `filters-config.json` were re-run against NCBI E-utilities `esearch` on 2026-09-06, over the same `2026/01/01:2026/08/31[crdt]` window, capturing `ErrorList/PhraseNotFound` as well as `Count`.

---

## 1. The mechanism — why the breakage is invisible

`filters.html`, line ~357:

```js
const text = await resp.text();
const match = text.match(/<Count>(\d+)<\/Count>/);
if (match) return parseInt(match[1]);
```

When a filter token no longer exists, E-utilities does **not** return an HTTP error. It returns:

```xml
<Count>0</Count>
<ErrorList><PhraseNotFound>congress</PhraseNotFound></ErrorList>
```

The regex matches `<Count>0</Count>`, the `ErrorList` is never read, and the row is written to the CSV as a clean `0`. A retired filter is therefore **indistinguishable from a genuine zero** in every report this tool has produced since 2026-03-31.

A reference probe with a deliberately fake token (`zzzznotarealthing[Filter]`) returned exactly the same shape as `congress[Filter]`: `Count=0` + `PhraseNotFound`. That is the confirmation that these are dead tokens, not empty result sets.

---

## 2. Broken rows — 4 dead tokens

These four rows in `filters-config.json` query names PubMed no longer recognises. Each has been silently reporting `0` since the 2026-03-31 changeover.

| Config `id` | Label in report | Dead token | Correct token | True Jan–Aug 2026 | Report says |
|---|---|---|---|---|---|
| `at_congress` | Congress | `congress[Filter]` | `conferenceproceedings[Filter]` | **1,442** | 0 |
| `at_retraction_of` | Retraction of Publication | `retractionofpublication[Filter]` | `retractionnotice[Filter]` | **3,576** | 0 |
| `at_consensus` | Consensus Development Conference | `consensusdevelopmentconference[Filter]` | `consensusstatement[Filter]` | **1,169** | 0 |
| `at_classical` | Classical Article | `classicalarticle[Filter]` | `seminalarticle[Filter]` | **1** | 0 |

**Understated by 6,187 article-type assignments** in the Jan–Aug 2026 report.

### The old names are gone completely, not just from the menu

The bulletin's advice — "discontinued publication types … are still searchable using the `[pt]` field tag" — applies only to the *removed* types (§3). It does **not** rescue these four. Verified all-time counts:

| Query | All-time count |
|---|---|
| `"Congress"[pt]` | 0 |
| `"Retraction of Publication"[pt]` | 0 |
| `"Consensus Development Conference"[pt]` | 0 |
| `"Classical Article"[pt]` | 0 |

NLM re-tagged the existing citations under the new names. There is no `[pt]` fallback — the config must carry the new tokens.

### `at_classical` is not in the bulletin

Classical Article → **Seminal Article** is an *earlier* NLM rename that this config never picked up; `classicalarticle[Filter]` has been dead longer than the March 2026 change. `seminalarticle[Filter]` returns 6,749 all-time. Note the sting in the tail: Seminal Article is itself on the March 2026 discontinued list (§3), so the correct fix here buys you a row that will flatline anyway — 1 record in eight months.

---

## 3. Missing row — Evidence Synthesis

New publication type added 2026-03-31. No row exists in `filters-config.json`.

- `evidencesynthesis[Filter]` → **29,805** for Jan–Aug 2026 (535,559 all-time)

**Before adding it, understand what it is.** It is not a new independent bucket:

| Query | Jan–Aug 2026 |
|---|---|
| `evidencesynthesis[Filter]` | 29,805 |
| `"Evidence Synthesis"[pt] AND review[Filter]` | 29,805 — **complete subset of Review** |
| `"Evidence Synthesis"[pt] AND systematicreview[Filter]` | 22,084 |
| `"Evidence Synthesis"[pt] NOT systematicreview[Filter]` | 7,721 |

Every Evidence Synthesis record is already counted under Review (153,634), and 74% of them are already counted under Systematic Review (36,481). Adding the row adds **zero new citations** to the report — it re-slices ones already there.

That matters for the `at_total` row (`"type": "sum_all_at"`). Adding Evidence Synthesis inflates that sum by 29,805 without a single new record behind it. The row is already labelled "sum, overlaps" and is not a unique-record count, but this is the largest single overlap in the table and worth a footnote in the rendered report if you keep the row.

---

## 4. Rows that still work but are now terminal — 16 discontinued types

These tokens **still resolve** (historical citations remain tagged and searchable), so no fix is required. But the publication type is no longer assigned to new records, so each of these rows will decay toward 0 and stay there. Treat a future 0 here as "no longer assigned", not as a data problem.

| Config `id` | Label | Jan–Aug 2026 |
|---|---|---|
| `at_clinical_conf` | Clinical Conference | 3 |
| `at_legal_case` | Legal Case | 1 |
| `at_periodical` | Periodical Index | 1 |
| `at_autobiography` | Autobiography | 0 |
| `at_bibliography` | Bibliography | 0 |
| `at_consensus_nih` | Consensus Development Conference, NIH | 0 |
| `at_dictionary` | Dictionary | 0 |
| `at_directory` | Directory | 0 |
| `at_gov_pub` | Government Publication | 0 |
| `at_interactive` | Interactive Tutorial | 0 |
| `at_legislation` | Legislation | 0 |
| `at_newspaper` | Newspaper Article | 0 |
| `at_overall` | Overall | 0 |
| `at_portrait` | Portrait | 0 |
| `at_sci_integrity` | Scientific Integrity Review | 0 |
| `at_tech_report` | Technical Report | 0 |

The counts above are real zeros — the tokens resolved cleanly, with no `PhraseNotFound`.

**Recommendation:** keep the rows (they hold historical value for older date windows) and add a marker in the config — e.g. `"discontinued": "2026-03-31"` — so the renderer can annotate them rather than presenting a bare 0 that reads as "nothing published".

---

## 5. Rows verified clean — 99 of 103

Every other token in the config resolved without error, including all Medline/Preprint, Text Availability, Associated Data, Language, Species, Sex, and Age rows, and the remaining article types. No further breakage found.

Small drift between the 2026-09-05 report and today's re-run (e.g. MEDLINE 532,453 → 533,617; Humans 403,057 → 403,793) is normal PubMed backfill into the same `[crdt]` window, not an error.

---

## 6. Recommended fixes

**A. Repoint the four dead tokens** in `filters-config.json` — labels and terms both:

| `id` | New `label` | New `term` |
|---|---|---|
| `at_congress` | `Conference Proceedings` | `{daterange} [crdt] AND (conferenceproceedings[Filter])` |
| `at_retraction_of` | `Retraction Notice` | `{daterange} [crdt] AND (retractionnotice[Filter])` |
| `at_consensus` | `Consensus Statement` | `{daterange} [crdt] AND (consensusstatement[Filter])` |
| `at_classical` | `Seminal Article` | `{daterange} [crdt] AND (seminalarticle[Filter])` |

Consider renaming the `id`s to match (`at_conf_proceedings`, `at_retraction_notice`, `at_consensus_statement`, `at_seminal`) — but only if nothing downstream keys off the old ids.

**B. Add the Evidence Synthesis row**, with a note that it is a subset of Review:

```json
{ "id": "at_evidence_synth", "label": "Evidence Synthesis (subset of Review)",
  "term": "{daterange} [crdt] AND (evidencesynthesis[Filter])", "type": "count" }
```

**C. Fix the silent-zero hole in `filters.html`** — this is the fix that matters most, because it stops the *next* NLM rename from going unnoticed for five months. In `fetchCount`, detect `PhraseNotFound` and return a distinct sentinel rather than a number:

```js
const text = await resp.text();
if (/<PhraseNotFound>/.test(text)) return 'DEAD';   // token no longer exists
const match = text.match(/<Count>(\d+)<\/Count>/);
if (match) return parseInt(match[1]);
```

Then render `DEAD` as a visible marker in the table — never as `0`, and never as a blank that could be read as zero. A dead filter is *no data*; a real 0 is *no records*. They must not print the same.

**D. Add a pre-flight validation pass.** Before each monthly refresh, run every token once with no date range. Any token returning `PhraseNotFound` is a filter NLM has retired since the last run — surface it at the top of the report instead of burying a 0 in row 62.

---

## Source

NLM Technical Bulletin — *PubMed Update: MeSH and Article Type Filter Changes* (2026 Mar–Apr):
https://www.nlm.nih.gov/pubs/techbull/ma26/ma26_pubmed_update_MeSH_changes.html

All counts independently verified against `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi` on 2026-09-06.
