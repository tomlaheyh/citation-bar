# Notes

One notes file per report, in this folder, named after the report's folder (`drift/` -> `drift.md`). These are published with the site.

## Reports

| Report | Page | Notes |
|---|---|---|
| PubMed Summary Report | `pubmed-summary/pubmed-summary.html` | not yet |
| PubMed Filters Report | `filters/filters.html` | not yet |
| PubMed MeSH Counts | `mesh/mesh.html` | not yet |
| PubMed Journal Ranking | `journal-ranking/journal-ranking.html` | [journal-ranking.md](journal-ranking.md) |
| PubMed Drift Report | `drift/drift-report.html` | [drift.md](drift.md) |
| PubMed ORCID Ranking | `orcid-ranking/orcid-ranking.html` | [orcid-ranking.md](orcid-ranking.md) |

A report gets its notes file the next time it is worked on.

## Notes template

Every report's notes file has these sections, in this order:

1. **Purpose** - one or two lines: what the report shows and for whom.
2. **Files** - table of page, data, collector or pipeline, and schedule.
3. **Rules and decisions** - standing rules for this report. Edit in place when one changes; the log records when and why.
4. **Open items** - checklist.
5. **Log** - dated entries, newest first. Each says what changed, how it was verified, and what is next.

## Adding a report

- [ ] Folder at the root, named for the report, with the page and its data file inside
- [ ] Menu entry in `siteNav.js` (`pages` list, site-absolute href)
- [ ] Card on `index.html`
- [ ] `sitemap.xml` entry, or `noindex` on the page
- [ ] Workflow in `.github/workflows/` if it needs a scheduled pull
- [ ] Notes file here, and a row in the table above
