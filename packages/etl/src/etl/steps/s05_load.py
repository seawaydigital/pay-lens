"""Step 5: Export final data files (Parquet + JSON)."""

from __future__ import annotations

import json
from pathlib import Path

import polars as pl
import typer

from etl.config import settings
from etl.utils.cpi import fetch_cpi_data


def _log_file(path: Path) -> None:
    """Log the size of an output file."""
    size_kb = path.stat().st_size / 1024
    if size_kb > 1024:
        typer.echo(f"    {path.name}: {size_kb / 1024:.1f} MB")
    else:
        typer.echo(f"    {path.name}: {size_kb:.1f} KB")


def load(enriched_path: Path | None = None) -> None:
    """Export final Parquet and JSON files for the web application.

    Reads the enriched dataset and produces:
    - Parquet: disclosures, disclosures-recent, employers, employees, cpi
    - JSON: stats-summary, sectors, employers-index
    """
    if enriched_path is None:
        enriched_path = settings.STAGING_DIR / "enriched.parquet"

    output_dir = settings.OUTPUT_DIR
    output_dir.mkdir(parents=True, exist_ok=True)

    typer.echo(f"  Reading {enriched_path}...")
    df = pl.read_parquet(enriched_path)
    typer.echo(f"  Input: {len(df):,} rows")

    # ── disclosures.parquet ──────────────────────────────────────────
    typer.echo("  Writing Parquet files...")

    disclosures = df.sort("year", descending=True)
    disclosures_path = output_dir / "disclosures.parquet"
    disclosures.write_parquet(disclosures_path)
    _log_file(disclosures_path)

    # ── disclosures-recent.parquet (last 6 years) ────────────────────
    cutoff_year = settings.LATEST_YEAR - 5
    recent = disclosures.filter(pl.col("year") >= cutoff_year)
    recent_path = output_dir / "disclosures-recent.parquet"
    recent.write_parquet(recent_path)
    _log_file(recent_path)

    # ── employers.parquet ────────────────────────────────────────────
    employers = (
        df.group_by(["employer_id", "employer", "sector"])
        .agg(
            pl.col("year").min().alias("first_year"),
            pl.col("year").max().alias("last_year"),
            pl.len().alias("total_records"),
            pl.col("salary_paid").median().alias("median_salary"),
            pl.col("salary_paid").mean().alias("mean_salary"),
            pl.col("salary_paid").max().alias("max_salary"),
            pl.col("total_compensation").sum().alias("total_compensation"),
            pl.col("person_id").n_unique().alias("unique_employees"),
            pl.col("region_id").first().alias("region_id"),
            pl.col("region_name").first().alias("region_name"),
        )
        .sort("total_records", descending=True)
    )
    employers_path = output_dir / "employers.parquet"
    employers.write_parquet(employers_path)
    _log_file(employers_path)

    # ── employees.parquet ────────────────────────────────────────────
    employees = (
        df.group_by("person_id")
        .agg(
            pl.col("first_name").first(),
            pl.col("last_name").first(),
            pl.col("employer").last().alias("latest_employer"),
            pl.col("employer_id").last().alias("latest_employer_id"),
            pl.col("job_title").last().alias("latest_job_title"),
            pl.col("sector").last().alias("latest_sector"),
            pl.col("year").min().alias("first_year"),
            pl.col("year").max().alias("last_year"),
            pl.len().alias("total_records"),
            pl.col("salary_paid").last().alias("latest_salary"),
            pl.col("salary_paid").max().alias("max_salary"),
            pl.col("total_compensation").sum().alias("career_total_compensation"),
        )
        .sort("latest_salary", descending=True)
    )
    employees_path = output_dir / "employees.parquet"
    employees.write_parquet(employees_path)
    _log_file(employees_path)

    # ── cpi.parquet ──────────────────────────────────────────────────
    cpi_data = fetch_cpi_data()
    cpi_records = [{"year": y, "cpi_value": v} for y, v in sorted(cpi_data.items())]
    cpi_df = pl.DataFrame(cpi_records)
    cpi_path = output_dir / "cpi.parquet"
    cpi_df.write_parquet(cpi_path)
    _log_file(cpi_path)

    # ── JSON exports ─────────────────────────────────────────────────
    typer.echo("  Writing JSON files...")

    # stats-summary.json
    latest_year_df = df.filter(pl.col("year") == settings.LATEST_YEAR)
    prev_year_df = df.filter(pl.col("year") == settings.LATEST_YEAR - 1)

    latest_median = float(latest_year_df["salary_paid"].median()) if len(latest_year_df) > 0 else 0
    prev_median = float(prev_year_df["salary_paid"].median()) if len(prev_year_df) > 0 else 0
    yoy_growth = (
        round((latest_median - prev_median) / prev_median * 100, 2)
        if prev_median > 0
        else None
    )

    stats = {
        "total_records": len(df),
        "total_years": df["year"].n_unique(),
        "latest_year": settings.LATEST_YEAR,
        "total_employers": df["employer_id"].n_unique(),
        "total_unique_people": df["person_id"].n_unique(),
        "total_compensation": round(float(df["total_compensation"].sum()), 2),
        "median_salary": round(float(df["salary_paid"].median()), 2),
        "mean_salary": round(float(df["salary_paid"].mean()), 2),
        "latest_year_records": len(latest_year_df),
        "latest_year_median_salary": round(latest_median, 2),
        "yoy_median_growth_pct": yoy_growth,
    }
    stats_path = output_dir / "stats-summary.json"
    with open(stats_path, "w") as f:
        json.dump(stats, f, indent=2)
    _log_file(stats_path)

    # sectors.json
    sectors_agg = (
        df.group_by("sector")
        .agg(
            pl.len().alias("count"),
            pl.col("salary_paid").median().alias("median_salary"),
            pl.col("salary_paid").mean().alias("mean_salary"),
            pl.col("employer_id").n_unique().alias("employer_count"),
            pl.col("person_id").n_unique().alias("unique_people"),
        )
        .sort("count", descending=True)
    )
    sectors_list = [
        {
            "name": row["sector"],
            "count": row["count"],
            "median_salary": round(float(row["median_salary"]), 2) if row["median_salary"] else None,
            "mean_salary": round(float(row["mean_salary"]), 2) if row["mean_salary"] else None,
            "employer_count": row["employer_count"],
            "unique_people": row["unique_people"],
        }
        for row in sectors_agg.iter_rows(named=True)
    ]
    sectors_path = output_dir / "sectors.json"
    with open(sectors_path, "w") as f:
        json.dump(sectors_list, f, indent=2)
    _log_file(sectors_path)

    # employers-index.json
    employers_index = [
        {
            "id": row["employer_id"],
            "name": row["employer"],
            "sector": row["sector"],
            "total_records": row["total_records"],
            "unique_employees": row["unique_employees"],
            "median_salary": round(float(row["median_salary"]), 2) if row["median_salary"] else None,
            "max_salary": round(float(row["max_salary"]), 2) if row["max_salary"] else None,
            "first_year": row["first_year"],
            "last_year": row["last_year"],
            "region_id": row["region_id"],
            "region_name": row["region_name"],
        }
        for row in employers.iter_rows(named=True)
    ]
    employers_index_path = output_dir / "employers-index.json"
    with open(employers_index_path, "w") as f:
        json.dump(employers_index, f, indent=2)
    _log_file(employers_index_path)

    typer.echo(f"  Load complete: {len(list(output_dir.iterdir()))} output files.")
