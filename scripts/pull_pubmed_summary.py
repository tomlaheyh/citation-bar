#!/usr/bin/env python3
# pull_pubmed_summary.py
# Version: 1.0 (built with python-script-standard v3.10)
# Required Python: 3.8+
# Series: standalone
# Required Libraries: none
# Writes: ../pubmed-summary/pubmed-data.csv

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
# Refreshes pubmed-data.csv, the server-side cache behind the PubMed Summary
# page, so a first-time visitor sees current numbers instead of whatever was
# last saved by hand.
#
# Every query comes from config.json -- the same file the page reads -- so the
# script and the page can never disagree about what a row means. Add a row
# there and it appears here on the next run with no code change.
#
# The frame is rebuilt exactly as the page's buildClockFrame() does: six full
# years, plus a current-year YTD column ending at the last COMPLETE month. In
# January there is no complete month yet, so no YTD column appears at all.
#
# ALL OR NOTHING. If any single query fails after its retries, the existing CSV
# is left untouched and the run exits non-zero. A partly-refreshed file would
# mix this month's numbers with last month's in the same row and there would be
# nothing in the file to say so. A stale file is honest; a blended one is not.
# ---------------------------------------------------------------------------

import csv
import json
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone

# ------------------------------------------------------------- configuration

CONFIG_PATH = "../pubmed-summary/config.json"
CSV_NAME = "../pubmed-summary/pubmed-data.csv"

ENDPOINT = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
TOOL = "citation_bar_summary"

# Never hardcode a real address here: this file lives in a public repository.
EMAIL = os.environ.get("NCBI_EMAIL", "").strip()
API_KEY = os.environ.get("NCBI_API_KEY", "").strip()

GAP_SECS = 0.15 if API_KEY else 0.40    # NCBI: 10 req/sec with a key, 3 without
ATTEMPTS = 3
TIMEOUT = 60

YEARS_BACK = 6
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

# --------------------------------------------------------------------- work


def _count(db, term):
    """Records matching term in db. Retries, then raises -- never a fallback value."""
    params = {"db": db, "rettype": "count", "retmode": "json",
              "term": term, "tool": TOOL}
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
    raise RuntimeError(f"esearch failed {ATTEMPTS}x ({db}): {term}\n    last: {last!r}")


def _last_day(year, month_idx):
    """Last day of a 0-based month."""
    if month_idx == 11:
        return 31
    nxt = datetime(year, month_idx + 2, 1)
    return (nxt - __import__("datetime").timedelta(days=1)).day


def build_frame(now):
    """Six full years, plus a YTD column ending at the last complete month.

    Mirrors buildClockFrame() in the page. Keep the two in step: the page
    rebuilds the frame from the CSV header when it reads the file, so a frame
    written here that the page would not have produced is a silent mismatch."""
    cy, m = now.year, now.month - 1          # m is the current, incomplete month
    years = list(range(cy - YEARS_BACK, cy))
    labels = [str(y) for y in years]
    ytd_year = ytd_range = None
    if m >= 1:
        last_complete = m - 1                # 0-based
        ytd_year = cy
        ytd_range = (f"{cy}/01/01:{cy}/{last_complete + 1:02d}/"
                     f"{_last_day(cy, last_complete):02d}")
        years.append(cy)
        labels.append(f"{MONTHS[last_complete]} YTD")
    return years, labels, ytd_year, ytd_range


def main():
    cfg_path = HERE / CONFIG_PATH
    if not cfg_path.exists():
        print(f"config not found: {cfg_path}")
        return 1
    with open(cfg_path, encoding="utf-8-sig") as f:
        cfg = json.load(f)
    rows = cfg["rows"]

    now = datetime.now(timezone.utc)
    years, labels, ytd_year, ytd_range = build_frame(now)

    counts = [r for r in rows if r.get("type") == "count"]
    print(f"frame    : {labels[0]} .. {labels[-1]}")
    if ytd_range:
        print(f"ytd range: {ytd_range}")
    print(f"rows     : {len(rows)} ({len(counts)} queried, "
          f"{len(rows) - len(counts)} derived)")
    print(f"queries  : {len(counts) * len(years)}")
    print(f"api key  : {'yes' if API_KEY else 'no (3 req/sec)'}")
    print()

    # ---- query every count row across every column ----------------------
    got = {}
    for r in counts:
        vals = []
        for y in years:
            span = ytd_range if (ytd_year == y and ytd_range) else str(y)
            term = r["term"].replace("{year}", span)
            vals.append(_count(r.get("db", "pubmed"), term))
            time.sleep(GAP_SECS)
        got[r["id"]] = dict(zip(years, vals))
        print(f"  {r['id']:<22} " + "  ".join(f"{v:>9,}" for v in vals))

    # ---- assemble every line, counts and derived alike ------------------
    # One line per config row, in config order: the page walks its own rows
    # and this file in lockstep, so a missing line would shift every label
    # after it onto the wrong numbers.
    out_rows = []
    for r in rows:
        cells = []
        if r.get("type") == "count":
            cells = [got[r["id"]][y] for y in years]
        else:
            num, den = got.get(r["numerator"], {}), got.get(r["denominator"], {})
            for y in years:
                n, d = num.get(y), den.get(y)
                # A rate needs a denominator. No population is no data, not 0%.
                cells.append("" if not d or n is None else f"{n / d:.4f}")
        out_rows.append([r["label"]] + cells)

    period = f"{years[0]}-{years[-1]}"
    stamp = now.strftime("%Y-%m-%d")

    with _atomic(CSV_NAME, newline="") as f:
        w = csv.writer(f, quoting=csv.QUOTE_MINIMAL)
        w.writerow([cfg.get("title", "PubMed Summary") + " Report", period,
                    f"Generated {stamp}"])
        w.writerow([])
        w.writerow([""] + labels)
        for row in out_rows:
            w.writerow(row)

    print()
    print(f"  {len(out_rows)} rows written to {CSV_NAME}")
    print(f"  generated {stamp}, period {period}")
    return 0


try:
    code = main()
except KeyboardInterrupt:
    print("\n\nstopped by Ctrl-C -- the existing CSV was not touched")
    code = STOPPED_BY_USER
except Exception:
    import traceback
    traceback.print_exc()
    print("\nthe existing pubmed-data.csv was NOT overwritten -- it is still the")
    print("last good full refresh. Re-run the workflow to try again.")
    code = 1
_done(code)
