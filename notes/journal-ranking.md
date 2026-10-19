# Journal Ranking: Working Notes

## Purpose

Journals ranked by articles added to PubMed this year to date, with SJR, MEDLINE / free full text / ORCID shares, retractions, monthly counts, change vs the same months last year, and (top 1,000) Crossref's DOI count as a cross-check on PubMed.

## Files

| Role | Path |
|---|---|
| Report | `journal-ranking/journal-ranking.html` |
| Data | `journal-ranking/Journal_Ranking_YTD.csv` (evergreen name) |
| SJR lookup | `journal-ranking/SJR.csv` |
| Pipeline | `G:\My Drive\_Claude-cowork\Reports\journal_ranking_*_step00..05.py` (not in this repo), run on Tom's local PubMed copy |
| Schedule | none; refreshed by hand |

## Rules and decisions

- **Current-year ranking.** A journal with no articles this year is not on the page (Total 0 rows are in the file, unranked, and left off).
- **Export is the full data file, byte for byte.** Every column and every row, including Total 0 rows. Users delete what they don't want.
- **The data file has one evergreen name.** The year shown comes from the file's metadata line, first year on it. The line goes on to name the prior-year comparison period, which must not replace it.
- **Columns after the months are read by header name**, not position.
- **% change** beside Total uses the file's `Pct_Chg` as written, in the MeSH Counts style (▲▼, whole %, "—" within 0.5%). "new" when the prior year had none, never a number.
- **Crossref counts are by DOI created date** (step05, 2026-10-18), to match PubMed's create date. Shown only as hover text on Total, only for journals with RA Crossref and a count. Never shown as 0.
- **Header totals** are whole-report figures; the change vs the prior year sums Prior_YTD over every row in the file, including journals with none this year.
- **Journal titles** are cut to one line with an ellipsis; the full name is on hover.
- **Cross-check against the Summary report.** The grand total in the Total header should sit within a fraction of a percent of the Summary report's "# Articles - [crdt] create date" for the same months (`pubmed-summary/pubmed-data.csv`). The two are pulled independently, so a close match supports both; a gap well past about 0.5% means one pipeline has probably broken. Small differences are expected: Journal Ranking counts only records it can tie to a journal, and the two pulls run on different dates.
- **The extension does not read the data file**, only the page URL (Tom, 2026-10-18).

## Open items

- [ ] Use the Crossref ratio to flag journals where PubMed falls behind (Sci Rep: 129% this year vs 100% last). Needs a minimum Prior_YTD and a change threshold.
- [ ] Hover text does not reach phones or tablets.

## Log

### 2026-10-19: Bookshelf added

- **Data:** new `Journal_Ranking_YTD.csv` from the pipeline, now including NCBI Bookshelf as its own row (no ISSN; rank 45; 2,664 records, ▼7%). Same 45 columns; all checks pass (months, prior months, Pct_Chg, every % blank on a zero or missing denominator). Previous file is `journal-ranking/_to_delete/Journal_Ranking_YTD_pre-bookshelf_20261018.csv`.
- **Knock-on:** every rank from 45 down moves one place; Nat Microbiol goes from 1,000 to 1,001 and so loses its Crossref count (top 1,000 only).
- **Grand total** 1,332,120 (▲4.8% on 1,270,609). Against the Summary report's 1,332,050 the gap is now 70 (0.01%), down from 2,594: Bookshelf was most of it.
- **Page:** the Bookshelf title links to PubMed's Books & Documents search (`booksdocs[filter]`) over the report window, which PubMed counts as 2,664, matching the row. A journal-title search would have found nothing.
- **Line endings:** the data file on disk had become CRLF (git); the new one is written CRLF too, as is the page.
- **Verified:** page loads 10,561 journals, header totals and the Bookshelf link correct, Export byte-identical to the file, no page errors.

### 2026-10-19: cross-check with the Summary report

- **Jan-Sep 2026:** Journal Ranking 1,329,456 (file generated 10/18) vs Summary 1,332,050 (`pubmed-data.csv`, Sep YTD, generated 10/05). Gap 2,594, 0.19%. Tom: the close match from two separate pulls reinforces the quality of both. Added as a standing check under Rules.

### 2026-10-19: report-wide figures in the headers

- **Change:** a second header line under Total shows the grand total and its change (1,329,456, ▲4.9%), and under Medline, FreeFull and ORCID the overall share (47%, 64%, 48%). Hover on each header explains it. Whole report always; search does not change them. No column got wider.
- **Rule (Tom):** the change is against the full prior year: Prior_YTD summed over every row in the file, including the 1,723 journals with no articles this year (1,267,734). Leaving them out would show ▲5.5% and overstate growth.
- **Shares** are rebuilt as share x Total summed over ranked journals / grand total, because the file has 2-decimal shares, not counts. Worst-case rounding error is under half a point (Medline 46.4-47.4%, shown 47%).
- **Not totalled:** Retract, because it mixes retraction counts with W withdrawal counts.
- **Line endings:** the page on disk had become CRLF (same content as the 10/18 save, likely from git); this save keeps CRLF.
- **Verified:** header figures match values computed from the file independently; search keeps the whole-report figures; the sort arrow still shows; no page errors.

### 2026-10-18: Total header centred

- **Change:** the Total column header is centred (was right-aligned). Width unchanged.

### 2026-10-18: shorter % headers, Total aligned

- **Change:** headers "Medline %", "FreeFull %", "ORCID %" are now "Medline", "FreeFull", "ORCID" (the cells already show %). Widths 81/81/73px to 66/65/57px. The marker beside Total sits in a fixed 5ch box, so every Total ends at the same point; markers of 1000%+ spill into the cell padding.
- **Verified:** first 1,000 rows (including 6 markers of 1000%+): one right edge for all Total numbers, nothing past the cell edge, no header clipped. At page open the table now fits the screen, Dec included.

### 2026-10-18: Retract column, no help cursor

- **Change:** column header "Retractions" is now "Retract" (cell hover text still says retracted), with the 8px side padding of the % columns: 92px to 62px. Removed the help cursor (the "?") on Total hover.
- **Verified:** header not clipped; all 10,560 rows re-checked against the file; Export still byte-identical.

### 2026-10-18: new data file, % change, Crossref hover

- **Data:** new `Journal_Ranking_YTD.csv` from the pipeline (45 columns; adds prior-year and RA columns, drops `API_Ref`). The old `Journal_Ranking_YTD_2026.csv` and a pre-edit copy of the page are in `journal-ranking/_to_delete/`.
- **Checked:** 10,560 ranked journals (same set as the published file) plus 1,723 with Total 0. Months sum to Total, prior months to Prior_YTD, Pct_Chg is right on every row, every % is blank when its denominator is zero or missing. Existing columns match the 10/15 file except 41 small recounts.
- **Created vs publication date:** journals within 90-110% of PubMed went from 584 to 706 (this year) and 652 to 745 (prior). Sci Rep unchanged at 129%, so its gap is on PubMed's side.
- **Page:** loads the evergreen name; year from the first year in the stamp (it would have read 2025); Withdrawn_URL by header name; ▲▼% beside Total; Crossref hover; title column 170px (was 180, with long names wrapping to four lines); Export hands back the file exactly.
- **Verified:** rendered against the file in a browser. All 10,560 rows match on rank, Total, change marker, hover presence and text (990 hovers), full title and withdrawn link; Export is byte-identical to the file; no page errors.
