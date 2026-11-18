# Data pipeline: environmental-policy country guessing game

Builds `output/countries.json` (for the game) and `output/countries.csv` (to look at in a spreadsheet)
for the 177 countries ranked in the 2026 Environmental Performance Index.

## Run it

```bash
pip install pandas pycountry requests openpyxl
python build_dataset.py
```

The script downloads what it can on its own, caches it in `raw/`, and writes a
`output/coverage_report.txt` showing how many countries have each value.
Delete a file in `raw/` to force a fresh download. `--offline` skips downloading.

## One manual step: climate laws

Climate Change Laws of the World only offers a download button, not a fixed link.

1. Go to https://climate-laws.org/search
2. Click **Download data (.csv): whole database**
3. Save the file into `sources/manual/` (keep "laws", "cclw", "climate", "search" or "document" in the name)
4. Re-run `python build_dataset.py`

The script counts **unique law/policy families** per country (one law plus its amendments = 1),
and keeps only Legislative and Executive entries (UNFCCC submissions are left out).
It prints which categories it kept so you can check that.

## Optional: official EPI file

`sources/epi2026_scores.csv` was copied from the ranking table on epi.yale.edu.
To use Yale's own file instead, download **2026 Scores, trends, and ranks [XLSX]** from
https://epi.yale.edu/downloads and save it as `sources/manual/epi2026_results.xlsx`.

## Columns

| Field | Meaning | Source |
|---|---|---|
| `epi_score`, `epi_rank` | 2026 EPI score (0–100) and rank | Yale / Columbia EPI 2026 |
| `co2_per_capita_t` | Tonnes of CO₂ per person (fossil + cement) | Global Carbon Project via Our World in Data |
| `co2_total_mt` | Million tonnes of CO₂ | same |
| `renewables_share_elec_pct` | % of electricity from renewables | Ember / Energy Institute via Our World in Data |
| `pm25_ugm3` | Population-weighted PM2.5 exposure, µg/m³ (WHO guideline: 5) | SatPM (WashU) via Our World in Data |
| `climate_laws_count` | Climate laws + policies on record | Climate Change Laws of the World (LSE Grantham / Climate Policy Radar) |
| `net_zero_year`, `net_zero_status` | National net-zero (or carbon-neutral) target year and how binding it is | Van Coppenolle (2025), Zenodo doi:10.5281/zenodo.19296074, CC BY 4.0 |
| `region`, `subregion` | UN regions, for geographic hints | datasets/country-codes |
| `years.*` | Year of the most recent value used | — |

Each metric uses the latest year available for that country (nothing older than 2015).

## Things to know

- **Net zero:** a country missing from the net-zero file gets `"No target listed"`. That usually means it has
  no target, but spot-check a few before the game shows it as fact. The US status may be out of date because
  of its 2025 policy reversals. The Net Zero Tracker (zerotracker.net) is a good place to cross-check.
- **Palau** has no renewables figure in the Our World in Data energy data. Fill it in by hand or have the game show "—".
- Data use: the EPI may not be used commercially. That's fine for a class project, but keep the credit lines in `meta.sources`.
