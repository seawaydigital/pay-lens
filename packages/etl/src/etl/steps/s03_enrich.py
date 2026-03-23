"""Step 3: Enrich normalized data with region, role family, and CPI adjustment."""

from __future__ import annotations

from pathlib import Path

import polars as pl
import typer

from etl.config import settings
from etl.utils.cpi import compute_adjustment_factors, fetch_cpi_data
from etl.utils.fuzzy import match_role

_LOOKUPS_DIR = Path(__file__).resolve().parent.parent / "lookups"


def _load_region_mapping() -> dict[str, tuple[str, str]]:
    """Load employer_id -> (region_id, region_name) mapping."""
    csv_path = _LOOKUPS_DIR / "employer_regions.csv"
    if not csv_path.exists():
        typer.echo("  WARNING: employer_regions.csv not found.")
        return {}

    df = pl.read_csv(csv_path, infer_schema_length=0)
    mapping: dict[str, tuple[str, str]] = {}
    for row in df.iter_rows(named=True):
        eid = row["employer_id"].strip()
        rid = row["region_id"].strip()
        rname = row["region_name"].strip()
        mapping[eid] = (rid, rname)
    return mapping


def _load_role_taxonomy() -> list[str]:
    """Load the list of canonical role family names."""
    csv_path = _LOOKUPS_DIR / "role_taxonomy.csv"
    if not csv_path.exists():
        typer.echo("  WARNING: role_taxonomy.csv not found.")
        return []

    df = pl.read_csv(csv_path)
    return df["name"].to_list()


def enrich(normalized_path: Path | None = None) -> Path:
    """Enrich the normalized dataset with derived fields.

    Adds: region_id, region_name, role_family, cpi_adjusted_salary,
    cpi_adjusted_compensation, yoy_salary_change.

    Returns the path to ``staging/enriched.parquet``.
    """
    if normalized_path is None:
        normalized_path = settings.STAGING_DIR / "normalized.parquet"

    staging_dir = settings.STAGING_DIR
    staging_dir.mkdir(parents=True, exist_ok=True)
    output_path = staging_dir / "enriched.parquet"

    typer.echo(f"  Reading {normalized_path}...")
    df = pl.read_parquet(normalized_path)
    typer.echo(f"  Input: {len(df):,} rows")

    # ── Region tagging ───────────────────────────────────────────────
    typer.echo("  Tagging regions...")
    region_map = _load_region_mapping()

    region_ids: list[str | None] = []
    region_names: list[str | None] = []
    for eid in df["employer_id"].to_list():
        match = region_map.get(eid)
        if match:
            region_ids.append(match[0])
            region_names.append(match[1])
        else:
            region_ids.append(None)
            region_names.append(None)

    df = df.with_columns(
        pl.Series("region_id", region_ids, dtype=pl.Utf8),
        pl.Series("region_name", region_names, dtype=pl.Utf8),
    )

    # ── Role family matching ─────────────────────────────────────────
    typer.echo("  Matching role families...")
    taxonomy = _load_role_taxonomy()

    if taxonomy:
        # Build a cache so we don't re-match the same title repeatedly
        title_cache: dict[str, str | None] = {}
        role_families: list[str | None] = []

        for title in df["job_title"].to_list():
            if title is None:
                role_families.append(None)
                continue
            title_key = title.strip().lower()
            if title_key not in title_cache:
                title_cache[title_key] = match_role(
                    title, taxonomy, settings.FUZZY_MATCH_THRESHOLD
                )
            role_families.append(title_cache[title_key])

        df = df.with_columns(
            pl.Series("role_family", role_families, dtype=pl.Utf8),
        )
        matched = sum(1 for rf in role_families if rf is not None)
        typer.echo(
            f"    Matched {matched:,}/{len(role_families):,} titles "
            f"({matched / max(len(role_families), 1) * 100:.1f}%)"
        )
    else:
        df = df.with_columns(pl.lit(None).alias("role_family").cast(pl.Utf8))

    # ── CPI adjustment ───────────────────────────────────────────────
    typer.echo("  Computing CPI adjustments...")
    cpi_data = fetch_cpi_data()
    target_year = settings.LATEST_YEAR
    factors = compute_adjustment_factors(cpi_data, target_year)

    cpi_adj_salary: list[float | None] = []
    cpi_adj_comp: list[float | None] = []

    for row in df.iter_rows(named=True):
        year = row["year"]
        factor = factors.get(year) if year else None
        if factor is not None and row["salary_paid"] is not None:
            cpi_adj_salary.append(round(row["salary_paid"] * factor, 2))
        else:
            cpi_adj_salary.append(None)

        if factor is not None and row["total_compensation"] is not None:
            cpi_adj_comp.append(round(row["total_compensation"] * factor, 2))
        else:
            cpi_adj_comp.append(None)

    df = df.with_columns(
        pl.Series("cpi_adjusted_salary", cpi_adj_salary, dtype=pl.Float64),
        pl.Series("cpi_adjusted_compensation", cpi_adj_comp, dtype=pl.Float64),
    )

    # ── YoY salary change ────────────────────────────────────────────
    typer.echo("  Computing year-over-year salary changes...")
    df = df.sort(["person_id", "year"])

    df = df.with_columns(
        pl.col("salary_paid")
        .shift(1)
        .over("person_id")
        .alias("_prev_salary"),
        pl.col("year")
        .shift(1)
        .over("person_id")
        .alias("_prev_year"),
    )

    # Only compute YoY when the previous record is exactly 1 year prior
    df = df.with_columns(
        pl.when(
            (pl.col("_prev_salary").is_not_null())
            & (pl.col("_prev_salary") > 0)
            & (pl.col("year") - pl.col("_prev_year") == 1)
        )
        .then(
            ((pl.col("salary_paid") - pl.col("_prev_salary")) / pl.col("_prev_salary") * 100.0)
            .round(2)
        )
        .otherwise(None)
        .alias("yoy_salary_change")
    )

    df = df.drop(["_prev_salary", "_prev_year"])

    # ── Write output ─────────────────────────────────────────────────
    df.write_parquet(output_path)
    typer.echo(
        f"  Enriched: {len(df):,} rows -> {output_path} "
        f"({output_path.stat().st_size / (1024*1024):.1f} MB)"
    )
    return output_path
