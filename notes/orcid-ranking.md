# ORCID Ranking: Working Notes

## Purpose

The ten ORCID iDs on the most PubMed research papers each year, by entry date, with how many of those papers they were first or last author on. Click a person to list their papers for that year, with author position and publication type.

## Files

| Role | Path |
|---|---|
| Report | `orcid-ranking/orcid-ranking.html` |
| Data: top 10 | `orcid-ranking/ORCID_Top10_by_Year.csv` |
| Data: papers | `orcid-ranking/ORCID_Top10_Papers.csv` |
| Source | `G:\My Drive\_Claude-cowork\Reports\report_orcid_top.py` (v1.4) on Tom's local copy of PubMed (not in this repo) |
| Schedule | none; refreshed by hand |

## Rules and decisions

- **Years are by PubMed entry date**, not publication year. Each year shows its `Period`, so a partial year reads as partial (Jan-Sep 2026).
- **Research papers only** (Tom, 2026-10-18). A paper counts only if it has none of the script's `EXCLUDED_TYPES`: letters, comments, editorials, news, errata and notices, all reviews incl. systematic reviews and meta-analyses, guidelines, consensus statements, protocols and similar. No column describes the excluded formats. This applies to every figure, including `ORCIDs_That_Year` (shown as "ORCID iDs on research papers") and `Ever_First_or_Last`.
- **Every ORCID on a paper is counted,** at any author position. Names are kept only for first, second and last authors, so a blank name is expected, not an error.
- **Position:** First = author 1; Last = marked first-or-last at a later position; anything else is Middle. A single author is both first and last.
- **`Ever_First_or_Last` is not shown on the page** (Tom, 2026-10-19: the First/last column already says it, e.g. "0 of 242"). It stays in the data and in Export. Meaning since v1.4: first or last author on any research paper, 2014 to the report end.
- **Ties share a rank,** so a year can list more than ten.
- **`noindex`, not in `sitemap.xml`, no `index.html` card** for now (same as Drift).

## Open items

- [ ] Decide on an `index.html` card and indexing once the page is settled

## Log

### 2026-10-19: "never first/last" marker removed

- **Change:** the marker beside the name (and its footnote sentence) is gone; Watanabe K's "0 of 242" says it. Ever stays in Export.

### 2026-10-19: research papers only, author position

- **Data:** new files from `report_orcid_top.py` v1.4: research papers only, plus `Papers_First_or_Last`, `Ever_First_or_Last` (top 10) and `Author_Pos`, `First_or_Last`, `Pub_Types` (papers). Copied from Drive byte for byte. Previous files are in `orcid-ranking/_to_delete/…_pre-research_20261018.csv`.
- **Checked:** 153 top-10 rows over 13 years, 7,825 papers. Papers and first/last counts match the paper rows; no excluded type on any paper; author 1 always first-or-last; first-or-last in a year implies Ever = Y. Of 89 people, 87 Ever = Y; N for Watanabe K and Kim S.
- **Ever fix:** v1.3 computed `Ever_First_or_Last` over all paper types and years, letting letters and reviews back in as a flag. Raised in the Drive note `report_orcid_top_ISSUE_ever_first_or_last.md`; Tom fixed it in v1.4 (option A: research papers, 2014 to report end). Only Kim S changed (Y to N).
- **Ranking changes vs the 10/17 data:** 89 of 141 year/person entries kept, 52 dropped, 64 new. Letter-heavy authors are gone (e.g. Daungsupawong H). Watanabe K stays #1 in 2025 with 242 research papers, first or last on none.
- **Page:** year line says "ORCID iDs on research papers"; new First/last column ("0 of 242"); "never first/last" beside the name when Ever = N; each paper shows Position and Type; Export adds the new columns; note bar and footnote say research papers only and define first/last.
- **Verified:** every year, every person: row count, First/last text and never marker match the file; each person's First + Last papers equal `Papers_First_or_Last`, and every position matches the file; Export carries all papers for the year; no page errors.

### 2026-10-17: report built

- **Change:** new page, menu entry in `siteNav.js` after Drift, this notes file and a row in `notes/README.md`.
- **Data checked:** 141 top-10 rows over 13 years (2014 to Jan-Sep 2026) and 9,409 papers. Every `Papers` count matches its paper rows, there are no orphan or duplicate rows, and every `EntryDate` falls in its `Year`.
- **Verified:** rendered in a browser against both CSVs. Row counts per year match the CSV, every person in every year opens to exactly `Papers` rows and closes cleanly, the two titles with line breaks load, and there is no sideways scroll at phone width.
