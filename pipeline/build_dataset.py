#!/usr/bin/env python3
"""
Build the country dataset for the environmental-policy guessing game.

Country list = every country ranked in the 2026 Environmental Performance Index (177).

Columns produced (per country):
  epi_score, epi_rank              Yale/Columbia EPI 2026
  co2_per_capita_t                 tonnes CO2 per person        (OWID / Global Carbon Project)
  co2_total_mt                     million tonnes CO2           (OWID / Global Carbon Project)
  renewables_share_elec_pct        % of electricity from renewables (OWID / Ember + EI)
  pm25_ugm3                        population-weighted PM2.5, ug/m3 (OWID / SatPM, WashU)
  climate_laws_count               climate laws + policies     (Climate Change Laws of the World)
  net_zero_year, net_zero_status   national net-zero target    (Van Coppenolle 2025, Zenodo)
plus region / subregion for geographic hints, and the data year for each metric.

Usage:
  python build_dataset.py            # download what's missing, then build
  python build_dataset.py --offline  # only use files already in raw/ and sources/manual/

Sources that need a manual download (the site only offers a button, not a stable URL):
  * Climate Change Laws of the World -> https://climate-laws.org/search
      click "Download data (.csv): whole database", save into sources/manual/
      (any filename ending in .csv containing "laws" or "cclw" or "climate" works)
  * (optional) Official EPI 2026 "Scores, trends, and ranks [XLSX]" from
      https://epi.yale.edu/downloads -> save as sources/manual/epi2026_results.xlsx
      If absent, the bundled sources/epi2026_scores.csv is used.
"""
from __future__ import annotations

import argparse
import csv
import io
import json
import math
import re
import sys
import unicodedata
from datetime import date
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent
RAW = ROOT / "raw"
MANUAL = ROOT / "sources" / "manual"
OUT = ROOT / "output"

UA = {"User-Agent": "environmentle-data-pipeline/1.0 (educational project)"}

DOWNLOADS = {
    "owid-co2-data.csv": "https://raw.githubusercontent.com/owid/co2-data/master/owid-co2-data.csv",
    "owid-energy-data.csv": "https://raw.githubusercontent.com/owid/energy-data/master/owid-energy-data.csv",
    "country-codes.csv": "https://raw.githubusercontent.com/datasets/country-codes/main/data/country-codes.csv",
    "pm25-owid.csv": "https://ourworldindata.org/grapher/outdoor-air-pollution-exposure.csv?v=1&csvType=full&useColumnShortNames=false",
    "netzero-zenodo.csv": "https://zenodo.org/records/19296074/files/2025-10-30_Net-Zero%20commitments.csv?download=1",
}

# EPI uses its own short names. Map every one that pycountry can't resolve on its own.
EPI_NAME_TO_ISO3 = {
    "Antigua & Barbuda": "ATG", "St. Vincent & the Gren.": "VCT", "Saint Kitts & Nevis": "KNA",
    "Saint Lucia": "LCA", "Bosnia & Herzegovina": "BIH", "São Tomé & Príncipe": "STP",
    "Trinidad & Tobago": "TTO", "Republic of Congo": "COG", "Dem. Rep. Congo": "COD",
    "Central African Rep.": "CAF", "Côte d'Ivoire": "CIV", "Russia": "RUS", "Iran": "IRN",
    "South Korea": "KOR", "Laos": "LAO", "Viet Nam": "VNM", "Türkiye": "TUR", "Taiwan": "TWN",
    "Moldova": "MDA", "Tanzania": "TZA", "Bolivia": "BOL", "Brunei Darussalam": "BRN",
    "Cabo Verde": "CPV", "Timor-Leste": "TLS", "Eswatini": "SWZ", "Czechia": "CZE",
    "Gambia": "GMB", "Bahamas": "BHS", "United States": "USA", "United Kingdom": "GBR",
    "Micronesia": "FSM", "North Macedonia": "MKD", "Kyrgyzstan": "KGZ",
}

# Regions for places the UN country-codes file leaves out
REGION_OVERRIDES = {"TWN": ("Asia", "Eastern Asia")}

# Display names (EPI abbreviates some)
DISPLAY_NAME = {
    "VCT": "Saint Vincent and the Grenadines", "CAF": "Central African Republic",
    "COD": "DR Congo", "COG": "Republic of the Congo", "BRN": "Brunei",
    "VNM": "Vietnam", "ATG": "Antigua and Barbuda", "KNA": "Saint Kitts and Nevis",
    "BIH": "Bosnia and Herzegovina", "STP": "São Tomé and Príncipe",
    "TTO": "Trinidad and Tobago",
}


# ----------------------------------------------------------------------------- helpers
def log(msg: str) -> None:
    print(msg, flush=True)


def download_missing(offline: bool) -> dict[str, str]:
    status = {}
    RAW.mkdir(exist_ok=True)
    for fname, url in DOWNLOADS.items():
        dest = RAW / fname
        if dest.exists() and dest.stat().st_size > 0:
            status[fname] = "cached"
            continue
        if offline:
            status[fname] = "missing (offline)"
            continue
        try:
            import requests
            r = requests.get(url, headers=UA, timeout=120)
            r.raise_for_status()
            dest.write_bytes(r.content)
            status[fname] = "downloaded"
        except Exception as e:  # keep going; that column will just be empty
            status[fname] = f"FAILED: {type(e).__name__}: {str(e)[:120]}"
    for k, v in status.items():
        log(f"  {k:24s} {v}")
    return status


def iso3_for(name: str) -> str:
    if name in EPI_NAME_TO_ISO3:
        return EPI_NAME_TO_ISO3[name]
    import pycountry
    try:
        return pycountry.countries.lookup(name).alpha_3
    except LookupError:
        return pycountry.countries.search_fuzzy(name)[0].alpha_3


def latest_value(df: pd.DataFrame, iso_col: str, year_col: str, value_col: str,
                 min_year: int = 2015) -> pd.DataFrame:
    """Most recent non-null value per country (ignoring anything older than min_year)."""
    d = df[[iso_col, year_col, value_col]].dropna()
    d = d[d[year_col] >= min_year]
    d = d.sort_values(year_col).groupby(iso_col).tail(1)
    return d.set_index(iso_col)


def find_col(cols, *patterns, required=True):
    for p in patterns:
        for c in cols:
            if re.search(p, str(c), re.I):
                return c
    if required:
        raise KeyError(f"No column matching {patterns} in {list(cols)}")
    return None


# ----------------------------------------------------------------------------- sources
def load_epi() -> pd.DataFrame:
    xlsx = MANUAL / "epi2026_results.xlsx"
    if xlsx.exists():
        x = pd.read_excel(xlsx)
        iso = find_col(x.columns, r"^iso$", r"iso3", r"code")
        name = find_col(x.columns, r"country")
        score = find_col(x.columns, r"^EPI\.new$", r"^EPI$", r"EPI.*score", r"^score")
        rank = find_col(x.columns, r"^EPI\.rnk", r"rank", required=False)
        epi = pd.DataFrame({"iso3": x[iso], "epi_name": x[name], "epi_score": x[score]})
        epi["epi_rank"] = x[rank] if rank else epi["epi_score"].rank(ascending=False, method="min")
        src = "official XLSX"
    else:
        epi = pd.read_csv(ROOT / "sources" / "epi2026_scores.csv")
        epi = epi.rename(columns={"country": "epi_name", "score": "epi_score", "rank": "epi_rank"})
        epi["iso3"] = epi["epi_name"].map(iso3_for)
        src = "bundled CSV (from epi.yale.edu results table)"
    epi["epi_rank"] = epi["epi_rank"].astype(int)
    assert epi["iso3"].is_unique, epi[epi["iso3"].duplicated(keep=False)]
    log(f"  EPI: {len(epi)} countries from {src}")
    return epi.set_index("iso3")


def load_co2():
    f = RAW / "owid-co2-data.csv"
    if not f.exists():
        return None, None
    df = pd.read_csv(f, usecols=["iso_code", "year", "co2", "co2_per_capita"])
    df = df[df["iso_code"].str.len() == 3]  # drop OWID aggregates (OWID_WRL etc.)
    tot = latest_value(df, "iso_code", "year", "co2")
    pc = latest_value(df, "iso_code", "year", "co2_per_capita")
    return tot, pc


def load_renewables():
    f = RAW / "owid-energy-data.csv"
    if not f.exists():
        return None
    df = pd.read_csv(f, usecols=["iso_code", "year", "renewables_share_elec"])
    df = df[df["iso_code"].str.len() == 3]
    return latest_value(df, "iso_code", "year", "renewables_share_elec")


def load_pm25():
    f = RAW / "pm25-owid.csv"
    if not f.exists():
        return None
    df = pd.read_csv(f)
    val = [c for c in df.columns if c not in ("Entity", "Code", "Year")][0]
    df = df.rename(columns={val: "pm25"})
    df = df[df["Code"].astype(str).str.len() == 3]
    return latest_value(df, "Code", "Year", "pm25")


STATUS_STRENGTH = {  # higher = more binding; used to pick one target per country
    "achieved": 5, "in law": 4, "law": 4, "policy": 3, "declaration": 2, "pledge": 2,
    "proposed": 1, "discussion": 1,
}


def load_net_zero():
    f = RAW / "netzero-zenodo.csv"
    if not f.exists():
        return None
    raw = f.read_bytes()
    for enc in ("utf-8-sig", "latin-1"):
        try:
            df = pd.read_csv(io.BytesIO(raw), encoding=enc, sep=None, engine="python")
            break
        except Exception:
            continue
    # Older releases had an "iso" column; the 2025-10 release puts ISO-3 codes in "country".
    iso = find_col(df.columns, r"iso", r"^country$")
    year = find_col(df.columns, r"end.*target.*year", r"target.*year")
    status = find_col(df.columns, r"end.*target.*status", r"status")
    # "target_year" in the 2025-10 release = year the entry relates to (not the net-zero year)
    entry_year = find_col(df.columns, r"year.*(entry|relates)", r"^target_year$", required=False)
    d = df[[iso, year, status] + ([entry_year] if entry_year else [])].copy()
    d.columns = ["iso3", "nz_year", "nz_status"] + (["entry_year"] if entry_year else [])
    d["nz_year"] = pd.to_numeric(d["nz_year"].astype(str).str.extract(r"(\d{4})")[0], errors="coerce")

    def strength(s):
        s = str(s).lower()
        return max((v for k, v in STATUS_STRENGTH.items() if k in s), default=0)

    d["strength"] = d["nz_status"].map(strength)
    sort_cols = (["entry_year"] if entry_year else []) + ["strength"]
    d = d.dropna(subset=["iso3"]).sort_values(sort_cols).groupby("iso3").tail(1)
    return d.set_index("iso3")[["nz_year", "nz_status"]]


def load_cclw():
    candidates = [p for p in MANUAL.glob("*.csv")
                  if re.search(r"law|cclw|climate|search|document", p.name, re.I)]
    if not candidates:
        return None, "no CCLW CSV in sources/manual/"
    f = max(candidates, key=lambda p: p.stat().st_mtime)
    df = pd.read_csv(f, low_memory=False)
    geo = find_col(df.columns, r"geograph(y|ies)\s*iso", r"^iso", r"geograph", r"country")
    fam = find_col(df.columns, r"family\s*id", r"family.*slug", r"family\s*name", required=False)
    cat = find_col(df.columns, r"^category$", r"family.*category", r"document.*category", required=False)
    d = df.copy()
    if cat is not None:
        # Keep national laws & policies; drop UNFCCC submissions, litigation, MCF/reports
        keep = d[cat].astype(str).str.contains(r"legislat|executive|policy|law", case=False)
        vc = d[cat].astype(str).value_counts()
        log("  CCLW categories (kept = *):")
        for v, n in vc.items():
            log(f"    {'*' if keep[d[cat].astype(str) == v].any() else ' '} {v}: {n} rows")
        d = d[keep]
    # A row can list several geographies separated by ';' or ','
    d[geo] = d[geo].astype(str).str.split(r"[;,]")
    d = d.explode(geo)
    d[geo] = d[geo].str.strip()
    key = fam if fam is not None else d.columns[0]
    counts = d.groupby(geo)[key].nunique()
    # Map to ISO3 if the column holds names rather than codes
    if not counts.index.str.fullmatch(r"[A-Z]{3}").mean() > 0.8:
        mapped = {}
        for n in counts.index:
            try:
                mapped[n] = iso3_for(n)
            except Exception:
                pass
        counts = counts.rename(index=mapped)
        counts = counts[counts.index.str.fullmatch(r"[A-Z]{3}")]
    note = f"{f.name}: geo='{geo}', unit={'families' if fam else 'rows'} ('{key}'), category filter='{cat}'"
    return counts.groupby(level=0).sum(), note


def load_regions():
    f = RAW / "country-codes.csv"
    if not f.exists():
        return {}
    cc = pd.read_csv(f, keep_default_na=False)
    out = {}
    for _, r in cc.iterrows():
        iso = r["ISO3166-1-Alpha-3"]
        if iso:
            out[iso] = (r["Region Name"] or None, r["Sub-region Name"] or None)
    out.update(REGION_OVERRIDES)
    return out


# ----------------------------------------------------------------------------- build
def clean(v, nd=2):
    if v is None or (isinstance(v, float) and math.isnan(v)):
        return None
    if nd == 0:
        return int(round(float(v)))
    return round(float(v), nd)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--offline", action="store_true")
    args = ap.parse_args()

    log("Fetching sources:")
    dl = download_missing(args.offline)

    log("Loading:")
    epi = load_epi()
    co2_tot, co2_pc = load_co2()
    ren = load_renewables()
    pm = load_pm25()
    nz = load_net_zero()
    laws, laws_note = load_cclw()
    regions = load_regions()
    log(f"  CCLW: {laws_note}")

    rows = []
    for iso, e in epi.sort_values("epi_rank").iterrows():
        def get(tbl, col):
            if tbl is None or iso not in tbl.index:
                return None, None
            r = tbl.loc[iso]
            yr = next((r[c] for c in ("year", "Year") if c in r.index), None)
            return r[col], (int(yr) if yr is not None else None)

        co2t, co2t_y = get(co2_tot, "co2")
        co2p, co2p_y = get(co2_pc, "co2_per_capita")
        rn, rn_y = get(ren, "renewables_share_elec")
        p, p_y = get(pm, "pm25")
        reg, sub = regions.get(iso, (None, None))

        if nz is None:
            nz_year, nz_status = None, None
        elif iso in nz.index:
            nz_year = clean(nz.loc[iso, "nz_year"], 0)
            s = nz.loc[iso, "nz_status"]
            # Blank status = latest entry is "No Net Zero" (e.g. Angola 2025)
            nz_status = "No net-zero target" if pd.isna(s) or not str(s).strip() else str(s).strip()
        else:
            # Absent from the dataset: almost always means no national target,
            # but check by hand before showing it as a fact in the game.
            nz_year, nz_status = None, "No target listed"

        rows.append({
            "iso3": iso,
            "name": DISPLAY_NAME.get(iso, e["epi_name"]),
            "region": reg,
            "subregion": sub,
            "epi_score": clean(e["epi_score"]),
            "epi_rank": int(e["epi_rank"]),
            "co2_per_capita_t": clean(co2p),
            "co2_total_mt": clean(co2t, 1),
            "renewables_share_elec_pct": clean(rn, 1),
            "pm25_ugm3": clean(p, 1),
            "climate_laws_count": None if laws is None else int(laws.get(iso, 0)),
            "net_zero_year": nz_year,
            "net_zero_status": nz_status,
            "years": {"co2": co2t_y, "co2_per_capita": co2p_y, "renewables": rn_y, "pm25": p_y},
        })

    OUT.mkdir(exist_ok=True)
    meta = {
        "generated": date.today().isoformat(),
        "country_count": len(rows),
        "sources": {
            "epi": "Wendling et al. (2026), 2026 Environmental Performance Index, Yale Center for Environmental Law & Policy, epi.yale.edu",
            "co2": "Our World in Data co2-data (Global Carbon Project), github.com/owid/co2-data",
            "renewables": "Our World in Data energy-data (Ember, Energy Institute), github.com/owid/energy-data",
            "pm25": "SatPM v5-gl-06, Atmospheric Composition Analysis Group, WashU, via Our World in Data",
            "climate_laws": "Climate Change Laws of the World, Grantham Research Institute (LSE) & Climate Policy Radar, climate-laws.org",
            "net_zero": "Van Coppenolle, H. (2025) National Net Zero (or adjacent) targets, Zenodo, doi 10.5281/zenodo.19296074",
        },
        "download_status": dl,
    }
    (OUT / "countries.json").write_text(json.dumps({"meta": meta, "countries": rows}, ensure_ascii=False, indent=1))

    flat = [{k: v for k, v in r.items() if k != "years"} | {f"year_{k}": v for k, v in r["years"].items()} for r in rows]
    pd.DataFrame(flat).to_csv(OUT / "countries.csv", index=False)

    # Coverage report
    metrics = ["epi_score", "co2_per_capita_t", "co2_total_mt", "renewables_share_elec_pct",
               "pm25_ugm3", "climate_laws_count", "net_zero_year", "region"]
    lines = [f"Coverage report ({meta['generated']}) - {len(rows)} countries", ""]
    for m in metrics:
        missing = [r["name"] for r in rows if r[m] is None]
        if m == "net_zero_year":
            missing = [r["name"] for r in rows if r[m] is None and r["net_zero_status"] is None]
        lines.append(f"{m:28s} {len(rows)-len(missing):3d}/{len(rows)}"
                     + (f"   missing: {', '.join(missing)}" if 0 < len(missing) <= 25 else
                        ("   (source not loaded)" if len(missing) == len(rows) else
                         (f"   missing: {len(missing)} countries" if missing else ""))))
    report = "\n".join(lines)
    (OUT / "coverage_report.txt").write_text(report + "\n")
    log("")
    log(report)


if __name__ == "__main__":
    sys.exit(main())
