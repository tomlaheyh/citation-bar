#!/usr/bin/env python3
# pull_pubmed_filters.py
# Version: 1.0 (built with python-script-standard v3.10)
# Required Python: 3.8+
# Series: standalone
# Required Libraries: none
# Writes: ../filters/pubmed-filters-data.csv

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
# Refreshes pubmed-filters-data.csv, the server-side cache behind the PubMed
# Filters page. Every query comes from filters-config.json -- the same file the
# page reads -- so the two can never disagree about what a row means.
#
# DEAD FILTERS ARE DROPPED, NOT RECORDED.
#
# When NLM retires a filter, PubMed answers the query with Count 0 *and* an
# <ErrorList><PhraseNotFound>. A date range never produces PhraseNotFound, so
# in a term shaped "{daterange} [crdt] AND (token)" that error can only mean
# the token itself is gone. Without the check a retired filter is a perfectly
# plausible zero, and the article-type total quietly understates -- which is
# exactly what the committed CSV was doing when this script was written.
#
# Those rows are left out of the file entirely and listed in the run log. They
# still appear in filters-config.json, so the page will render an empty row for
# them until they are pruned from the config by hand; the log says which.
#
# ALL OR NOTHING on network failures. A dead filter is an expected answer and
# drops one row; a failed request is not, and leaves the previous CSV untouched
# rather than publishing a file with unexplained holes.
# ---------------------------------------------------------------------------

import json
import re
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone

CONFIG_PATH = "../filters/filters-config.json"
CSV_NAME = "../filters/pubmed-filters-data.csv"

ENDPOINT = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
TOOL = "citation_bar_filters"

EMAIL = os.environ.get("NCBI_EMAIL", "").strip()
API_KEY = os.environ.get("NCBI_API_KEY", "").strip()

GAP_SECS = 0.15 if API_KEY else 0.40
ATTEMPTS = 3
TIMEOUT = 60

MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

DEAD = object()          # the filter token no longer exists


def _last_day(year, month_1based):
    if month_1based == 12:
        return 31
    from datetime import date, timedelta
    return (date(year, month_1based + 1, 1) - timedelta(days=1)).day


def build_period(now):
    """Mirrors buildClockPeriod() in the page. January reports the whole prior
    year; every other month reports Jan through the last COMPLETE month."""
    cy, m = now.year, now.month - 1          # m is 0-based current month
    if m == 0:
        py = cy - 1
        return {"label": "Jan-Dec", "year": py,
                "range": f"{py}/01/01:{py}/12/31"}
    last = m                                  # 1-based last complete month
    return {"label": f"Jan-{MONTHS[m - 1]}", "year": cy,
            "range": f"{cy}/01/01:{cy}/{last:02d}/{_last_day(cy, last):02d}"}


def _count(term):
    """Count for a term, or DEAD if PubMed does not know the filter token.

    Uses retmode=xml and the same two regexes the page uses, so the script and
    the page can never disagree about what counts as dead."""
    params = {"db": "pubmed", "retmode": "xml", "rettype": "count",
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
                text = r.read().decode("utf-8", "replace")
            if "<PhraseNotFound>" in text:
                return DEAD
            m = re.search(r"<Count>(\d+)</Count>", text)
            if m:
                return int(m.group(1))
            raise RuntimeError("no <Count> in response")
        except Exception as e:
            last = e
            if attempt < ATTEMPTS:
                time.sleep(2 ** attempt)
    raise RuntimeError(f"esearch failed {ATTEMPTS}x: {term}\n    last: {last!r}")


_FORMULA = re.compile(r"^\s*(\w+)\s*([+-])\s*(\w+)\s*$")


def evaluate(formula, counts):
    """Only 'a + b' and 'a - b' over row ids. Deliberately not eval(): a
    config file should not be able to execute anything. An unparseable
    formula stops the run rather than silently producing a number."""
    m = _FORMULA.match(formula or "")
    if not m:
        raise RuntimeError(f"unsupported formula: {formula!r}")
    a, op, b = m.group(1), m.group(2), m.group(3)
    if a not in counts or b not in counts:
        return None                      # an operand was dropped as dead
    return counts[a] + counts[b] if op == "+" else counts[a] - counts[b]


def main():
    cfg_path = HERE / CONFIG_PATH
    if not cfg_path.exists():
        print(f"config not found: {cfg_path}")
        return 1
    with open(cfg_path, encoding="utf-8-sig") as f:
        cfg = json.load(f)

    now = datetime.now(timezone.utc)
    period = build_period(now)
    sections = cfg["sections"]
    all_rows = [r for s in sections for r in s["rows"]]
    to_query = [r for r in all_rows if r["type"] == "count"]

    # A label carrying a double quote would break the hand-built CSV lines the
    # page parses. Stop now rather than emit a file that parses wrong.
    bad = [r["label"] for r in all_rows if '"' in r["label"]]
    if bad:
        print("labels contain a double quote, which this CSV format cannot carry:")
        for b in bad:
            print("   ", b)
        return 1

    print(f"period  : {period['label']} {period['year']}  ({period['range']})")
    print(f"rows    : {len(all_rows)} ({len(to_query)} queried)")
    print(f"api key : {'yes' if API_KEY else 'no (3 req/sec)'}")
    print()

    counts, dead = {}, []
    for r in to_query:
        v = _count(r["term"].replace("{daterange}", period["range"]))
        if v is DEAD:
            dead.append(r)
            print(f"  DEAD  {r['id']:<24} {r['label']}")
        else:
            counts[r["id"]] = v
        time.sleep(GAP_SECS)

    # ---- derived rows ---------------------------------------------------
    for r in all_rows:
        if r["type"] == "calculated":
            val = evaluate(r.get("formula"), counts)
            if val is not None:
                counts[r["id"]] = val
        elif r["type"] == "sum_all_at":
            # Dead article-type filters are gone from counts entirely, so this
            # is the sum over the filters that still exist. It overlaps by
            # design and is not a partition of anything.
            counts[r["id"]] = sum(v for k, v in counts.items() if k.startswith("at_"))

    # ---- write ----------------------------------------------------------
    def line(label, val):
        return f'"{label}",{"" if val is None else val}'

    out = [f'"PubMed Filters Report","{period["label"]} {period["year"]}",'
           f'"Generated {now:%Y-%m-%d}"', ""]

    for s in sections:
        out.append(f'"{s["header"]}",""')
        rows = s["rows"]
        if s.get("sorted"):
            rows = sorted(rows, key=lambda r: counts.get(r["id"], -1), reverse=True)
        for r in rows:
            if r["id"] in counts:            # dropped rows are simply absent
                out.append(line(r["label"], counts[r["id"]]))
        out.append("")

    with _atomic(CSV_NAME, newline="") as f:
        f.write("\n".join(out) + "\n")

    kept = sum(1 for r in all_rows if r["id"] in counts)
    print()
    print(f"  {kept} rows written, {len(dead)} dead filters dropped")
    print(f"  period {period['label']} {period['year']}")
    if dead:
        print()
        print("  ---- DEAD FILTERS -- still in filters-config.json ----")
        for r in dead:
            print(f"    {r['id']:<24} {r['label']}")
        print("  The page renders a blank row for each until they are removed")
        print("  from the config. Nothing else is affected.")
    return 0


try:
    code = main()
except KeyboardInterrupt:
    print("\n\nstopped by Ctrl-C -- the existing CSV was not touched")
    code = STOPPED_BY_USER
except Exception:
    import traceback
    traceback.print_exc()
    print("\nthe existing pubmed-filters-data.csv was NOT overwritten.")
    code = 1
_done(code)
