# ORCID Ranking: Working Notes

## Purpose

The ten ORCID iDs on the most PubMed records each year, by entry date. Click a person to list their papers for that year.

## Files

| Role | Path |
|---|---|
| Report | `orcid-ranking/orcid-ranking.html` |
| Data: top 10 | `orcid-ranking/ORCID_Top10_by_Year.csv` |
| Data: papers | `orcid-ranking/ORCID_Top10_Papers.csv` |
| Source | Tom's local copy of PubMed (not in this repo) |
| Schedule | none; refreshed by hand |

## Rules and decisions

- **Years are by PubMed entry date**, not publication year. Each year shows its `Period`, so a partial year reads as partial (Jan-Sep 2026).
- **Every ORCID on a record is counted.** Names are kept only for first, second and last authors, so a blank name is expected, not an error.
- **Ties share a rank,** so a year can list more than ten.
- **`noindex`, not in `sitemap.xml`, no `index.html` card** for now (same as Drift).

## Open items

- [ ] Decide on an `index.html` card and indexing once the page is settled

## Log

### 2026-10-17: report built

- **Change:** new page, menu entry in `siteNav.js` after Drift, this notes file and a row in `notes/README.md`.
- **Data checked:** 141 top-10 rows over 13 years (2014 to Jan-Sep 2026) and 9,409 papers. Every `Papers` count matches its paper rows, there are no orphan or duplicate rows, and every `EntryDate` falls in its `Year`.
- **Verified:** rendered in a browser against both CSVs. Row counts per year match the CSV, every person in every year opens to exactly `Papers` rows and closes cleanly, the two titles with line breaks load, and there is no sideways scroll at phone width.
