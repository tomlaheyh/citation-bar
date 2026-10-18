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
- **Journal titles** are cut to one line with an ellipsis; the full name is on hover.
- **The extension does not read the data file**, only the page URL (Tom, 2026-10-18).

## Open items

- [ ] Use the Crossref ratio to flag journals where PubMed falls behind (Sci Rep: 129% this year vs 100% last). Needs a minimum Prior_YTD and a change threshold.
- [ ] Hover text does not reach phones or tablets.

## Log

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
