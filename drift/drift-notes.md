# Drift Report: Working Notes

Running log for the drift report rework (ver2). Newest entry at the top.

## Files

| Role | Path |
|---|---|
| Collector | `scripts/pull_drift_data.py` (v1.4) |
| Data | `drift/drift-data.csv` |
| Report | `drift/drift-report.html` |
| Schedule | `.github/workflows/drift-collect.yml` (daily 13:00 UTC, plus manual run) |

## Log

### 2026-10-04: delete.bat (repo root)

- **What it does:** moves every `*-vUTC-*` twin into a `_to_delete` folder beside it. It skips `.git` and anything already in a `_to_delete`. It lists everything and asks Y/N first, never overwrites (a name clash is skipped and listed), and checks that each move landed.
- **Who runs it:** Tom only. Never run by an assistant.
- **Read-only dry check before writing it:** 49 twins (3 in the root, 38 in `drift/`, 7 in `scripts/`, 1 in `pubmed-summary/`), and 0 name clashes in the target folders.

### 2026-10-04: site menu

- **Change:** added "PubMed Drift Report" (`/drift/drift-report.html`) to `siteNav.js`, right after PubMed Journal Ranking.
- **Verified:** rendered under a `/citation-bar/` subpath. The menu lists it in the right place, and the link resolves to `/citation-bar/drift/drift-report.html`.
- **Not changed:** the report still has `noindex`, and it isn't in `sitemap.xml`.

### 2026-10-04: wording (report edit 4)

- **Change:** "Click any date…" is now "Click any column heading to make it the focus", both in the top bar and in the grid note. Columns after the focus show Day +N, not dates. The hover text on headings is unchanged.

### 2026-10-04: report wording (report edit 3)

- **Rule (Tom):** report text uses general concepts and no real dates, because dates confuse users. An example date is fine, but never "first real collection".
- **Change:** the hand-run note no longer names 9/27 or 9/28. It now says: "The report uses only runs from the current collector; earlier runs are left out."
- **Verified:** no m/d/yy dates remain in the report text, and the diff against the previous build is that one line only.

### 2026-10-04: new grid built (report edit 2)

- **31 fixed columns,** ending on the latest data day (the newest cohort in the file). Today that is 9/1 to 10/1.
- **Focus by clicking:** click any date header to make that day the focus. The slider is removed.
- **Focus column:** shows the age-2 baseline, or N/A if none exists (strict). Before the focus the cells show `-` on grey. After it they read +1, +2 and so on, with no date.
- **Cell rules:** N/A = failed pull or no baseline; `-` = not collected yet, or no baseline to measure from.
- **Runs before 9/28** are ignored (`FIRST_RUN`). The data file is unchanged.
- **Default focus:** the oldest day with a baseline, which carries the most drift. Today that is 9/26, with 5 days of drift.
- **Label fix:** "N days of drift" now counts real readings.
- **Export:** CSV follows the same rules.
- **Text:** the help note, legend and the 9/27 line are updated.
- **Verified:** rendered locally against the data. The 9/26 values match the CSV (for example `medline_automated` 2084 → 1839 = -245). Clicked 9/4 (no baseline: N/A plus dashes) and 9/30 (1 day of drift). After writing, the checksum on the device matches the build.
- **By design:** in a fixed grid that ends on the latest data day, every column after a focus that has a baseline is already collected. Gaps can only come from failed pulls.

### 2026-10-04 (Sun, day session): build decisions (Tom)

- **Focus:** click a date column header to make it the focus. The slider goes.
- **9/27 run:** hidden in the report (runs before 9/28 are ignored). The data file stays as collected.
- **Check columns:** later, after the new grid is right.

### 2026-10-04: grid design decisions (Tom)

1. **Window:** 30 days.
2. **Strict baselines:** a ref with no age-2 baseline shows N/A. Lots of N/A is fine until the data builds up.
3. **Fixed columns:** the first column is the latest day minus the window, and the last column is the latest day. The focus (ref) column moves along them. Tom's example: move the focus to Day +8 and it becomes 9/9/26, followed by Day +1 to Day +21.
4. **N/A** is kept for a failed pull. `-` means no data yet, or before the focus.

**Confirmed:**

- **31 fixed columns:** the first column is the latest data day minus 30. The columns run Day +0 to Day +30.
- **Latest data day** = the newest cohort in the data, set by the data and not by today's date. Cohorts are first read at age 2, when the data has mostly settled, so to a user it can look 2 or 3 days behind. With runs through 10/3, the latest data day is 10/1, and the window is 9/1 to 10/1.
- **It fits the collector:** the collector reads cohorts up to age 32, which is baseline + 30, so a full row fills all 31 columns.

### 2026-10-04: Tom's grid design (under discussion, no code yet)

- **Latest day** = the newest closed cohort, always about 2 days behind today. For example, 9/30.
- **Window** = 30 days back from the latest day: about 9/1 to 9/30. Inclusive vs 31 days still to settle.
- **Ref date** = the slider position. The ref column shows full numbers.
- **Columns after the ref** are labelled Day +1, Day +2 and so on, with no dates.
- **Columns before the ref** show `-`.
- **No data** shows `-` instead of N/A everywhere, which is less noisy. Example: today, ref 9/1 has N/A for the ref itself and `-` in the rest.
- **Moving the ref to 9/2:** the column before it becomes `-`, and the columns after it become Day +1 onward.

**Open questions:**

1. 30 columns fixed (9/1 to 9/30), or 31?
2. Fixed calendar grid where Day +N max shrinks as the ref moves right, or always Day +1 to +29 after the ref?
3. What the ref column shows for a cohort without an age-2 baseline (today, refs 9/1 to 9/24): N/A, or its first reading flagged?
4. Keep N/A for a failed pull, and `-` for not-collected-yet or out of range?
5. Slider or something else?

### 2026-10-04 (Sun, 12:15 AM PT): paused for the night. No code changes.

**What Tom wants (his words, tidied):**

- The slider date should only cover 30 days of range: the last 30 days.
- With this little data, the blank cells are confusing.
- As the slider moves, it should show data.
- Not sure the slider should stay at all.

**Background for tomorrow (where the confusion came from):**

- The grid shows one cohort (one PubMed day) across the mornings it was re-read. A cohort's row grows by one column per collection run, so it can't have more columns than there have been runs.
- Each date column is labelled with a close date, and the reading under it was taken later. For cohorts first seen at an older age (for example 9/6, first read at age 21 on 9/27), early-September columns show readings actually taken from 9/27 on. That is why 9/6 seemed to have data.
- The first full 30-day row arrives on Oct 28 (cohort 9/26, with a Sep 28 cutoff). Newer anchors always have shorter rows; that is the design.

**Proposed but NOT done (waiting on Tom):**

- Sep 28 data cutoff, dropping the 9/27 run: it was a hand run on the old collector and lacks 4 columns. A dry run is ready: move the current CSV to `_to_delete/drift-data-before-0928-cut.csv` and write 210 kept rows. Push it before 13:00 UTC.
- Limit the slider to cohorts with a true age-2 baseline.
- Change the report line "first real collection, on 9/27/26" if the cutoff goes in.

- **Why the slider reaches back to 8/26:** each run re-reads the last 31 cohorts, ages 2 to 32. The 9/27 run (32 days after 8/26) therefore read 8/26 through 9/25, and the slider lists every cohort ever read. With a Sep 28 cutoff it would start at 8/27, and it moves forward one day with each run.

- **Bug: the "N days of drift" label is wrong.** It counts the date columns to the right of the anchor (`DATES.length - anchorPos - 1`), not the readings that exist. For 8/26 it says "Wed · 36 days of drift" when there are 0. It should count actual readings after the baseline.

**To decide tomorrow:** keep the slider or replace it, and how to show the empty days while data builds up.

### 2026-10-04 (Sun): default anchor (report edit 1)

- **Change:** the report now opens on the newest cohort whose first reading was at age 2 (`BASE_AGE`) and that has at least one day of drift. Today that cohort is 9/30. If none qualifies, it falls back to the newest cohort with any drift, then to the newest cohort of all.
- **Change:** on load the grid scrolls to put the anchor beside the pinned columns, so it opens on data rather than on greyed columns.
- **Verified:** staged the edited file and rendered it locally. The anchor reads 9/30/26 with 1 day of drift, and the values show.
- **Not changed:** dragging the slider still doesn't scroll the grid, so a later anchor can sit off-screen to the right until you scroll.

### 2026-10-04 (Sun): report check against current data

The report was rendered locally against `drift-data.csv` at `08cadb2`. It loads and draws without errors. Findings:

- **Default view is empty.** The slider opens on the oldest cohort (8/26). That cohort was read once, at age 32 on 9/27, and then aged out, so every drift cell shows N/A.
- **True baselines exist for 7 cohorts only.** These are 9/25 through 10/1. Each has a +0 reading at age 2, because collection began 9/27. Older cohorts' "+0" is just their first reading, taken at age 3 to 32, so it is not a locked baseline. The 9/25 baseline came from the 9/27 hand run (about 6:30 PM ET), so it is not like-for-like.
- **YTD/All show "closed 9/30"**, not 10/1. This is by design: the 10/1 range has only one reading so far.
- **Collected but not displayed:** `status_sum`, `unaccounted`, `abstract_unaccounted` and `all_abstract_unaccounted`. `unaccounted` is 0 for cohorts, 1 for YTD and 99 for All. Both abstract checks are 0 in every row.
- **9/27 rows** have blank all-record abstract splits (`nomainabstract`, `nonenglish_only`, `engother_only`, `noabstract_any`, `all_abstract_unaccounted`), because those columns were added in the 9/28 collector. The report shows them as N/A, which is correct.

### 2026-10-03 (Sat): ver2 start

- **Workflow state:** the Drift collect Action is on and should stay on. It has run successfully every day, the latest at 2026-10-03 14:29 UTC. The report had not been switched on yet because there was no data. Now there is, so ver2 starts from real collections.
- **Starting point:** the last local edits to the report and the collector were on 2026-09-28 00:32 UTC (commit `fc4ce3e new update`).
- **Local data (after pull to `08cadb2`, 2026-10-04):** `drift-data.csv` has 243 rows from 7 collections, 2026-09-27 to 2026-10-03, all with status OK. Each run adds 31 cohort rows. The first run (09-27) has 1 ytd row and 1 alltime row, and every run since 09-28 has 2 of each, which lines up with the collector edit of 09-28. The earlier CSV is in `drift/_to_delete/`.
- **Working tree:** git shows 19 files as modified, but the changes are line endings only (CRLF vs LF). There is no content change.

### Open items

- [x] Run `git pull` locally (Tom, in a Windows shell) to bring down the daily collections since 2026-09-27
- [x] Default the anchor to a cohort that has data
- [ ] Show the 4 check columns (later)
- [x] Cohorts without an age-2 baseline show N/A (strict)
- [x] Slider: dropped; click a date instead
- [x] Cut blank-cell confusion while data is thin
- [x] Sep 28 cutoff, done in the report (CSV untouched)
- [x] Fix the "N days of drift" label so it counts real readings
