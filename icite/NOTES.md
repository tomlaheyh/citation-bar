# iCite reports: notes

Everything iCite lives in `C:\_data\iCite_Report`. Notes up to 2026-11-12 are
also in `C:\_data\pubmed_local\Notes\pubmed_db_notes.md`, in the ICITE section
(full history). From 2026-11-12 on, this file is the main reference.

## Folder

| Path | What |
|---|---|
| `report_icite.py` (v1.6) | Fetches and extracts monthly iCite snapshots (`--fetch YYYY-MM,...`). Also writes `iCite_Top200_Citations.csv`, `iCite_Top200_Gains.csv` and `iCite_Rising_by_Band.csv` |
| `report_icite_monthly.py` (v2.7) | The rolling 12-month report: `iCite_Last12M.csv` + `icite_version.json` |
| `icite_extract.py`, `icite_gains_analysis.sql`, `icite_spike_check.sql` | Early exploration tools |
| `downloads\` | `icite_<YYYY-MM>_pmid_counts.csv` (pmid, citation_count; ~500 MB each) and `icite_snapshots.csv` (manifest with publish dates) |
| `archive\` | Dated copies of each report |
| `versions\` | `-vUTC-MMDD-HHMM` twins of scripts and notes |
| `extension\` | Browser extension code (IndexedDB) and its README |

Drive copies go to `G:\My Drive\_Claude-cowork\Reports\iCite`. The database
connection (`pmid_core`) comes from `C:\_data\pubmed_local\pubmed_config.py`.

## Monthly run

Wait for NIH to publish the next snapshot. The Figshare collection is
10.35092/yhjc.c.4586573, about monthly. Then:

```
py report_icite.py --fetch 2026-11        (download + extract, ~35-50 min)
py report_icite_monthly.py                (~3 min; writes the CSV + version JSON, copies to Drive)
```

Then push `iCite_Last12M.csv` and `icite_version.json` to `icite/` in the
`tomlaheyh/citation-bar` repo. The local clone is in
`C:\_data\Journal_Ranking\GitHub Push\citation-bar`. There is no push script
for iCite yet.

Nothing needs editing at the change of year. If a month in the 13-month range
is missing, the script stops and prints the `--fetch` line to run.

## iCite_Last12M.csv

- **Window:** papers with a PubMed entry date (crdt) in the 36 months up to the
  newest snapshot's publish date. Papers with crdt_year − pub_year ≥ 2 are left
  out: they are old papers newly loaded into PubMed (backfill). Tom kept 36
  months on 2026-11-12.
- **Range:** the baseline is the snapshot 12 months before the newest one,
  followed by 12 monthly gains.
- **Ranking:** by 12-month gain. Ties are kept at the cut (rank ≤ `TOP_N` =
  40,000), so there are 41,547 rows on 2026-10.
- **Columns (19):**

  | Column | Content |
  |---|---|
  | Rank | Position by 12-month gain; ties share a rank |
  | PMID | |
  | Title | English title; 8 papers have none, so the original-language title is used |
  | Pub Date | `pmid_core.pub_date` at its precision: `YYYY-MM-DD`, `YYYY-MM` or `YYYY` |
  | `<baseline> Citations` | Total at the baseline month |
  | 12 × `<Mon YYYY> Gains` | Gain over the previous snapshot; negative = an iCite correction |
  | High Trend | See below |
  | Note | Normally empty |

  The 12-month gain and the end total are not columns: they can be calculated
  (Tom). The script still checks them.
- **Missing counts:** a PMID not yet in iCite counts as 0 (Tom accepts this
  assumption). A blank count carries the previous value forward.
- **High Trend:**
  - `Yes`: citations per day in the second 6 months are at least 1.5× those in
    the first 6. It's per day because snapshot gaps run 33–45 days.
  - `New`: not in iCite at the baseline.
  - Below rank ~20,000 about 30% are `Yes`, so at small numbers it is mostly
    noise.
- **Note:** filled when the newest snapshot's own count is missing, or differs
  from baseline + gains by more than 10. It has been 0 on every run so far.

### Results on 2026-10 (Oct 2025 → Oct 2026)

| Rank | 12-month gain | | Gain at least | Papers |
|---|---|---|---|---|
| 1 | 18,304 | | 100 | 2,421 |
| 1,000 | 157 | | 50 | 9,642 |
| 10,000 | 49 | | 40 | 15,096 |
| 20,000 | 34 | | 30 | 26,879 |
| 30,000 | 28 | | 25 | 38,304 |
| 40,000 | 24 | | | |

| Papers | CSV | Gzipped |
|---|---|---|
| Top 10,000 | 1.6 MB | 0.6 MB |
| Top 20,000 | 3.2 MB | 1.2 MB |
| Top 30,000 | 4.8 MB | 1.8 MB |
| Top 40,000 | 6.7 MB | 2.4 MB |

Titles are about 4.3 MB of the 6.7 MB.

Report papers by crdt age (top 20,000 run): last 6 months 23, 6–12 months 321,
1–2 years 7,377, 2–3 years 13,078. iCite lags about a month, and young papers
have had little time to be cited.

**Watch:**
- 42683092 (ICD revision paper)
- 41342507 (J Chem Phys, "Monte Carlo methods, 70 years after...")

Both are `New` with sudden spikes. Probably iCite is crediting citations of a
classic work to these new papers. Kept for now (Tom).

## icite_version.json

This small file is what the extension polls. It holds:
- `format` (1)
- `version` (newest snapshot, YYYY-MM), `snapshot_date`, `baseline`, `months`
- `built_utc`, `rows`, `top_n`
- `csv_file`, `csv_bytes`, `csv_sha256`
- `columns`

A same-month rerun changes `csv_sha256` but not `version`, so the extension
compares the hash. If a column changes meaning, bump `format` here
(`report_icite_monthly.py`) and `FORMAT` in `extension\icite_db.js`.

## Extension (decided 2026-11-12)

Static files on GitHub Pages plus IndexedDB in the background service worker.
This option has no new permissions.
- **No server or API:** nothing to run, and no record of who reads what.
- **Not bundled in the extension:** no Chrome Web Store release each month.
- **No host permission:** GitHub Pages sends `Access-Control-Allow-Origin: *`,
  checked on the ror-ranking page and the journal-ranking CSV. It also gzips
  the CSV on the fly (`Content-Encoding: gzip`) and the browser expands it
  automatically. Caching is `max-age=600`.
- **No `unlimitedStorage`:** that permission shows no user warning, but it
  needs a store justification. `chrome.storage.local` is capped at about
  10 MB, while IndexedDB has a large quota and needs no permission.

Code and wiring are in `extension\README.md`. Browser test on 2026-11-12:
- loading 41,547 records took 0.7 s
- the sums match Python
- titles with quotes and commas parse correctly
- a bad SHA-256 was refused and the old data kept

## Snapshot gotchas

- **2026-04:** the CSV zip is a copy of February. Its counts come from the
  `.tar.gz` (JSON lines) instead: `USE_JSON` in `report_icite.py`.
- **2025-11:** there is no CSV zip. The `.tar.gz` holds `icite_metadata.csv`,
  not JSON. `_extract_json` reads either format (v1.6).
- **Zip names vary:** `icite_metadata.zip` vs `icite_metadata.csv.zip`.
- **Blank counts:** 12k–22k per month; kept blank in the counts files.
