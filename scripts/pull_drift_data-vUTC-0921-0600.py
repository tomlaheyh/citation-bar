#!/usr/bin/env python3
# pull_drift_data.py
# Version: 1.2 (built with python-script-standard v3.10)
# Required Python: 3.8+
# Series: standalone
# Required Libraries: none
# Writes: ../drift/drift-data.csv

import atexit, contextlib, glob, os, re, sys, time
from pathlib import Path

HERE = Path(__file__).resolve().parent
_START = time.monotonic()
NOTHING_TO_DO = 10                      # "fine, but there is nothing further to do"
STOPPED_BY_USER = 130                   # Ctrl-C: a deliberate stop, not a failure
_CHILD = bool(os.environ.get("CHAIN_CHILD") or os.environ.get("LOOP_CHILD"))
_QUIET = _CHILD or bool(os.environ.get("NO_PAUSE"))   # pause only -- never gates dispatch


def _pause_switch(argv):
    """/p30 seconds, /p0 none, /pk keypress. Long forms --pause=30 and --pkey.

    --no-pause is honoured too, for scripts that already accept it as their own flag.
    It is deliberately NOT in _STD_FLAGS: the script's argparse still needs to see it,
    so the one flag silences both its pause and this one."""
    for a in argv:
        if a[:1] not in ("-", "/"):
            continue                    # a bare word is the script's own argument, never ours
        t = a.lower().lstrip("-/")
        if t in ("no-pause", "nopause"):
            return 0
        if t in ("pk", "pkey"):
            return "key"
        if t.startswith("pause=") and t[6:].isdigit():
            return int(t[6:])
        if t.startswith("p") and t[1:].isdigit():
            return int(t[1:])
    return 10


_STD_FLAGS = ("/all", "--all", "/each", "--each", "/pk", "--pk", "/pkey", "--pkey")


def _std_flag(a):
    """True if this argument belongs to the standard rather than to the script."""
    if a.lower() in _STD_FLAGS:
        return True
    if a[:1] not in ("-", "/"):
        return False                    # a bare positional is the script's, even if it reads like p30
    t = a.lower().lstrip("-/")
    return (t.startswith("pause=") and t[6:].isdigit()) or (t.startswith("p") and t[1:].isdigit())


_PAUSE_SECS = _pause_switch(sys.argv[1:])
_CHAIN = any(a.lower() in ("/all", "--all") for a in sys.argv[1:])
_EACH = any(a.lower() in ("/each", "--each") for a in sys.argv[1:])
sys.argv[1:] = [a for a in sys.argv[1:] if not _std_flag(a)]   # leave the rest for argparse


def _fmt(sec):
    if sec >= 90:
        m, s = divmod(int(sec), 60)
        return f"{m}m {s:02d}s"
    return f"{sec:.1f}s"


@atexit.register
def _pause():
    if _QUIET or _PAUSE_SECS == 0:      # a parent launcher, NO_PAUSE, or /p0 told us to stay quiet
        return
    held = "until you press Enter" if _PAUSE_SECS == "key" else f"{_PAUSE_SECS}s"
    print(f"\n{'-' * 52}")
    print(f"total time = {_fmt(time.monotonic() - _START)}  --  window pauses {held} "
          "so you can read the output above")
    if _PAUSE_SECS == "key":
        try:
            input("Finished -- press Enter to close... ")
        except EOFError:                # no console attached (piped/redirected)
            time.sleep(10)
    else:
        time.sleep(_PAUSE_SECS)


def _header(path, cap=40):
    """The leading comment block only. Scanning stops at the first line that is not a
    shebang, comment or blank -- so a long licence header is covered, while a docstring
    that happens to quote this standard is never mistaken for the real header."""
    out = []
    with open(path, encoding="utf-8", errors="replace") as f:
        for line, _ in zip(f, range(cap)):
            if line.strip() and not line.lstrip().startswith("#"):
                break
            out.append(line)
    return "".join(out)


def _tagged(path, tag):
    """The comma-separated values of a header line, [] for 'none', None if absent."""
    m = re.search(rf"^#\s*{tag}:\s*(.+)$", _header(path), re.M | re.I)
    if not m:
        return None                     # no line at all -- not the same as "none"
    v = m.group(1).strip()
    return [] if v.lower() in ("none", "-") else [x.strip() for x in v.split(",") if x.strip()]


def _python_gap(path):
    """The reason this script cannot run on this interpreter, or None."""
    items = _tagged(path, "Required Python")
    if items is None:
        return f"{Path(path).name}: no 'Required Python:' header line"
    if not items:
        return f"{Path(path).name}: 'Required Python:' must name a version, not 'none'"
    want = tuple(int(n) for n in re.findall(r"\d+", items[0])) or (3, 8)
    if sys.version_info[:len(want)] < want:
        return (f"{Path(path).name}: needs Python {'.'.join(map(str, want))}+ "
                f"(running {sys.version.split()[0]})")
    return None


def _check_python(path):
    gap = _python_gap(path)
    if gap:
        raise SystemExit(gap)


def _requires(path):
    items = _tagged(path, "Required Libraries")
    if items is None:
        return None
    out = []
    for part in items:
        b = re.match(r"^(\S+)\s*\(([^)]+)\)$", part)
        out.append((b.group(1), b.group(2).strip()) if b else (part, part))
    return out


def _check(paths):
    import importlib.util
    missing, unstated = {}, set()
    for p in paths:
        req = _requires(p)
        if req is None:
            unstated.add(Path(p).name)
            continue
        for pip_name, mod in req:
            try:
                ok = importlib.util.find_spec(mod) is not None
            except (ImportError, ValueError):
                ok = False
            if not ok:
                missing.setdefault(pip_name, set()).add(Path(p).name)
    if unstated:
        print("no 'Required Libraries:' header line in: " + ", ".join(sorted(unstated)))
        print("  every script needs one -- say 'none' if it only uses the standard library")
    if missing:
        print("missing required libraries:")
        for pip_name in sorted(missing):
            print(f"  {pip_name}  (needed by {', '.join(sorted(missing[pip_name]))})")
        exe = sys.executable or "python"
        if " " in exe:
            exe = f'"{exe}"'
        print(f"\ninstall with:\n  {exe} -m pip install {' '.join(sorted(missing))}")
    if unstated or missing:
        sys.exit(1)


@contextlib.contextmanager
def _atomic(name, mode="w", **kw):
    """Write to <name>.tmp beside the target, then rename over it as the last act."""
    dest = HERE / name
    if not dest.parent.is_dir():
        raise SystemExit(f"output folder does not exist: {dest.parent}\n"
                         f"  create it, or fix the Writes path for {name}")
    tmp = dest.with_name(dest.name + ".tmp")
    if "b" not in mode:
        kw.setdefault("encoding", "utf-8")
    try:
        with open(tmp, mode, **kw) as f:
            yield f
        os.replace(tmp, dest)           # atomic -- readers never see a half file
    except BaseException:
        tmp.unlink(missing_ok=True)
        raise


def _present(name):
    """Does this path exist and hold something? A name may contain * for a pattern --
    used for both declared outputs and step 0 prerequisites, so they mean the same thing."""
    if "*" in name:
        return any(os.path.getsize(p) > 0 for p in glob.glob(str(HERE / name))
                   if os.path.isfile(p))
    p = HERE / name
    return p.exists() and p.stat().st_size > 0


def _done(code=0):
    """Exit. On either success code, confirm every declared output actually landed.
    NOTHING_TO_DO is a success -- an early one -- not a failure.

    A loop child is exempt: Writes: describes what a whole /each run leaves beside the
    script, which is the parent's business. Per-target outputs are produced()'s job."""
    if code in (0, NOTHING_TO_DO) and not os.environ.get("LOOP_CHILD"):
        declared = _tagged(__file__, "Writes")
        if declared is None:
            print("no 'Writes:' header line -- say 'none' if this script writes nothing")
            code = 1
        else:
            bad = [n for n in declared if not _present(n)]
            if bad:
                print("declared outputs missing or empty: " + ", ".join(bad))
                code = 1
    sys.exit(code)


_check_python(__file__)
_check([__file__])

# ---------------------------------------------------------------------------
# What this does
#
# One row per cohort per run, appended to drift-data.csv. Each run measures the
# last 31 cohorts by [crdt] date -- ages 2 through 32 days -- so the Drift Report
# can show any anchor's day-by-day movement from its locked baseline.
#
# Why age 2 is the youngest: full-text links attach in a batch at 07:00 ET, and
# it takes two passes to land ~97% of them (pass 1 ~85%, pass 2 ~12%, pass 3
# under 1%). A cohort measured younger than that has a full-text figure that is
# simply not finished yet. Record counts settle much sooner. Running at 09:00 ET
# puts the run after that day's 07:00 batch and before the midday activity.
#
# It records counts. It does not observe records moving. A count that falls in
# one status while another rises is consistent with records moving between the
# two, and equally consistent with records leaving the cohort while unrelated
# ones appear elsewhere in it. Read the columns as counts, not as transitions.
# ---------------------------------------------------------------------------

import csv
import json
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

# ------------------------------------------------------------- configuration

YOUNGEST_AGE = 2      # days; the cohort whose baseline this run locks
OLDEST_AGE = 32       # days; 31 cohorts inclusive -- the report's 31 columns
DATE_FIELD = "crdt"   # PubMed record create date; NLM never revises it

ENDPOINT = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
TOOL = "citation_bar_drift"

# Never hardcode a real address here: this file lives in a public repository.
EMAIL = os.environ.get("NCBI_EMAIL", "").strip()
API_KEY = os.environ.get("NCBI_API_KEY", "").strip()

# NCBI allows 3 requests/second without a key and 10 with one.
GAP_SECS = 0.15 if API_KEY else 0.40
ATTEMPTS = 3
TIMEOUT = 60

MEASURES = [
    ("all_sb",            "all[sb]"),
    ("medline",           "medline[sb]"),
    ("medline_automated", "medline[sb] AND indexingmethod_automated"),
    ("inprocess",         "inprocess[sb]"),
    ("publisher",         "publisher[sb]"),
    ("pubmednotmedline",  "pubmednotmedline[sb]"),
    ("preprint",          "preprint[pt]"),
    ("hasabstract",       "hasabstract"),
    ("fulltext",          '"full text"[sb]'),
    ("freefulltext",      '"free full text"[sb]'),
]

# The four that partition a cohort. medline_automated is a slice of medline and
# the last four overlap everything, so none of them belong here.
STATUS_PARTS = ("medline", "pubmednotmedline", "inprocess", "publisher")

CSV_NAME = "../drift/drift-data.csv"

# row_type separates the two kinds of row explicitly rather than leaving the page
# to sniff for a colon in cohort_date.
#   cohort - one [crdt] day, aged 2..32
#   ytd    - a year-to-date range, measured on exactly two consecutive mornings
#
# close_date is the day the books are closed on: for a cohort it is the cohort
# itself, for a YTD range it is the range's end. It is always the real ISO date;
# the "Closed through 9/1/26" wording is built from it on the page and never
# stored, so there is only ever one copy of the fact.
COLUMNS = (
    ["observed_et", "observed_utc", "row_type", "cohort_date", "close_date",
     "cohort_dow", "age_days", "status"]
    + [name for name, _ in MEASURES]
    + ["status_sum", "unaccounted"]
)

# --------------------------------------------------------------------- work


def _nth_sunday(year, month, n):
    first = datetime(year, month, 1)
    offset = (6 - first.weekday()) % 7          # Monday is 0, Sunday is 6
    return first.replace(day=1 + offset + 7 * (n - 1))


def _eastern(utc_naive):
    """US Eastern wall clock for a naive-UTC datetime. Stdlib only.

    NLM runs on Eastern and every job we care about is anchored to an Eastern
    hour, so the whole file is stamped in Eastern. zoneinfo is not used: it needs
    3.9+, and on Windows the tzdata package on top -- a dependency this script
    should not carry. The rule below is the US federal one in force since 2007."""
    y = utc_naive.year
    starts = _nth_sunday(y, 3, 2).replace(hour=7)     # 02:00 EST == 07:00 UTC
    ends = _nth_sunday(y, 11, 1).replace(hour=6)      # 02:00 EDT == 06:00 UTC
    return utc_naive - timedelta(hours=4 if starts <= utc_naive < ends else 5)


def _count(term):
    """Records matching term. Retries, then raises -- never invents a fallback.

    A zero conjured by a failed request is indistinguishable from a real zero
    once it is in the CSV, and preprint[pt] really is 0 on many days."""
    params = {
        "db": "pubmed", "rettype": "count", "retmode": "json",
        "term": term, "tool": TOOL,
    }
    if EMAIL:
        params["email"] = EMAIL
    if API_KEY:
        params["api_key"] = API_KEY
    url = ENDPOINT + "?" + urllib.parse.urlencode(params)

    last = None
    for attempt in range(1, ATTEMPTS + 1):
        try:
            with urllib.request.urlopen(url, timeout=TIMEOUT) as r:
                return int(json.load(r)["esearchresult"]["count"])
        except Exception as e:
            last = e
            if attempt < ATTEMPTS:
                time.sleep(2 ** attempt)
    raise RuntimeError(f"esearch failed {ATTEMPTS}x: {term}\n    last error: {last!r}")


def _read_existing(path):
    if not path.exists():
        return []
    with open(path, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def _measure(term_base, row):
    """Fill row with the ten counts for one [crdt] target, or mark it NA.

    One bad target is a hole in that column, not a failed run -- the caller
    decides whether this particular hole matters."""
    try:
        counts = {}
        for name, frag in MEASURES:
            counts[name] = _count(f"{term_base} AND {frag}")
            time.sleep(GAP_SECS)
        ssum = sum(counts[k] for k in STATUS_PARTS)
        row.update(counts)
        row["status"] = "OK"
        row["status_sum"] = ssum
        row["unaccounted"] = counts["all_sb"] - ssum
        return True, None
    except Exception as e:
        row["status"] = "NA"
        return False, e


def _previous_range(existing, kind):
    """The range of this kind that today's run should re-measure: the newest one
    written before today.

    Reading it back rather than recomputing it is what makes the pair robust --
    whatever was written yesterday is exactly what gets re-pulled today, with no
    arithmetic to go wrong at a year boundary."""
    prior = [r for r in existing
             if (r.get("row_type") == kind) and (r.get("cohort_date") or "")]
    if not prior:
        return None
    return max(prior, key=lambda r: r.get("close_date") or "").get("cohort_date")


def main():
    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
    et = _eastern(now_utc)
    today_et = et.date()

    print(f"observed : {et:%Y-%m-%d %H:%M} ET")
    print(f"cohorts  : ages {YOUNGEST_AGE}-{OLDEST_AGE} days "
          f"({OLDEST_AGE - YOUNGEST_AGE + 1} of them)")
    print(f"api key  : {'yes' if API_KEY else 'no (3 req/sec)'}")
    print()

    # A re-run replaces today's rows rather than doubling them, so firing the
    # workflow by hand after a failure is safe. kept excludes today, which also
    # means a re-run re-measures the same YTD pair rather than chaining onward.
    kept = [r for r in _read_existing(HERE / CSV_NAME)
            if (r.get("observed_et") or "")[:10] != f"{today_et}"]

    stamp = {"observed_et": f"{et:%Y-%m-%d %H:%M:%S}",
             "observed_utc": f"{now_utc:%Y-%m-%d %H:%M:%S}"}
    fresh, failed, baseline_failed = [], [], False

    # ---- the 31 daily cohorts -------------------------------------------
    for age in range(YOUNGEST_AGE, OLDEST_AGE + 1):
        cohort = today_et - timedelta(days=age)
        row = dict(stamp, row_type="cohort",
                   cohort_date=f"{cohort:%Y-%m-%d}",
                   close_date=f"{cohort:%Y-%m-%d}",
                   cohort_dow=f"{cohort:%a}", age_days=age)
        ok, err = _measure(f"{cohort:%Y/%m/%d}[{DATE_FIELD}]", row)
        if ok:
            flag = " <- baseline" if age == YOUNGEST_AGE else ""
            print(f"  {cohort:%Y-%m-%d} {cohort:%a} age {age:>2}  "
                  f"all_sb {row['all_sb']:>7,}  ft {row['fulltext']:>7,}{flag}")
        else:
            failed.append(f"{cohort}")
            # The baseline is the one hole that matters: nothing can diff
            # against it and it can never be recaptured on a later day.
            if age == YOUNGEST_AGE:
                baseline_failed = True
            print(f"  {cohort:%Y-%m-%d} {cohort:%a} age {age:>2}  FAILED -- {err}")
        fresh.append(row)

    # ---- the range families ---------------------------------------------
    # Each range is measured on exactly two consecutive mornings: once as the
    # new range, once re-pulled the next day. The window is identical across
    # that pair, so the difference is drift inside the records and carries no
    # growth from the window getting longer.
    #
    #   ytd      this calendar year to the close date
    #   alltime  the whole corpus to the close date. 1000-01-01 is simply
    #            earlier than any crdt: verified 2026-09-21, the bounded query
    #            returned 41,175,381 against an unbounded 41,176,236, the
    #            855-record gap being exactly the two excluded days. It matters
    #            because records more than a year old fall outside ytd, so this
    #            is the only window in which a back-catalogue change shows up.
    close = today_et - timedelta(days=YOUNGEST_AGE)
    FAMILIES = [
        ("ytd",     f"{close.year}-01-01"),
        ("alltime", "1000-01-01"),
    ]

    print()
    for kind, start in FAMILIES:
        new_range = f"{start}:{close:%Y-%m-%d}"
        prev_range = _previous_range(kept, kind)

        targets = []
        if prev_range and prev_range != new_range:
            targets.append((prev_range, "re-pull"))
        targets.append((new_range, "new"))

        for rng, which in targets:
            lo, hi = rng.split(":")
            row = dict(stamp, row_type=kind, cohort_date=rng, close_date=hi,
                       cohort_dow="", age_days="")
            ok, err = _measure(f"{lo.replace('-', '/')}:{hi.replace('-', '/')}"
                               f"[{DATE_FIELD}]", row)
            if ok:
                print(f"  {kind:<7} {rng:<26} {which:<8} "
                      f"all_sb {row['all_sb']:>10,}  ft {row['fulltext']:>10,}")
            else:
                failed.append(rng)
                print(f"  {kind:<7} {rng:<26} {which:<8} FAILED -- {err}")
            fresh.append(row)

    rows = kept + fresh

    with _atomic(CSV_NAME, newline="") as f:
        w = csv.DictWriter(f, fieldnames=COLUMNS, restval="", extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)

    print()
    print(f"  {len(fresh)} targets measured, {len(failed)} failed")
    print(f"  closed through {close:%Y-%m-%d}")
    print(f"  {len(kept)} earlier rows kept, {len(rows)} rows in {CSV_NAME}")

    if baseline_failed:
        print()
        print("  BASELINE FAILED -- the age-%d cohort has no locked number and one" % YOUNGEST_AGE)
        print("  can only be captured today. Re-run the workflow before the day ends.")
        return 1
    return 0


try:
    code = main()
except KeyboardInterrupt:
    print("\n\nstopped by Ctrl-C -- rows already written to the CSV are kept")
    code = STOPPED_BY_USER
except Exception:
    import traceback
    traceback.print_exc()
    print("\nno rows were written for this run; the CSV is unchanged.")
    code = 1
_done(code)
