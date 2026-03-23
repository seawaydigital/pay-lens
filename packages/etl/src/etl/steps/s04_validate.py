"""Step 4: Validate the enriched dataset."""

from __future__ import annotations

from pathlib import Path

import polars as pl
import typer

from etl.config import settings


def validate(enriched_path: Path | None = None) -> bool:
    """Run validation checks on the enriched dataset.

    Hard assertions halt the pipeline on failure.  Soft warnings are
    logged but do not prevent the pipeline from continuing.

    Returns ``True`` if all assertions pass.
    """
    if enriched_path is None:
        enriched_path = settings.STAGING_DIR / "enriched.parquet"

    typer.echo(f"  Reading {enriched_path}...")
    df = pl.read_parquet(enriched_path)
    total_rows = len(df)
    typer.echo(f"  Rows: {total_rows:,}")

    all_passed = True

    # ── Hard assertions ──────────────────────────────────────────────
    typer.echo("  Running assertions...")

    # 1. Row count > 0
    if total_rows == 0:
        typer.echo("  FAIL: Dataset is empty.", err=True)
        return False

    # 2. No null critical fields
    for col in ("year", "employer_id", "last_name", "salary_paid"):
        null_count = df[col].null_count()
        if null_count > 0:
            typer.echo(
                f"  FAIL: Column '{col}' has {null_count:,} null values.",
                err=True,
            )
            all_passed = False

    # 3. All salary_paid >= 100,000
    below_threshold = df.filter(pl.col("salary_paid") < 100_000)
    if len(below_threshold) > 0:
        typer.echo(
            f"  FAIL: {len(below_threshold):,} records have salary_paid < $100,000.",
            err=True,
        )
        all_passed = False

    # 4. All years within valid range
    years_out_of_range = df.filter(
        (pl.col("year") < settings.FIRST_YEAR) | (pl.col("year") > settings.LATEST_YEAR)
    )
    if len(years_out_of_range) > 0:
        bad_years = years_out_of_range["year"].unique().sort().to_list()
        typer.echo(
            f"  FAIL: {len(years_out_of_range):,} records have year outside "
            f"[{settings.FIRST_YEAR}, {settings.LATEST_YEAR}]: {bad_years}",
            err=True,
        )
        all_passed = False

    # 5. No duplicate (year, employer_id, first_name, last_name, job_title)
    dup_cols = ["year", "employer_id", "first_name", "last_name", "job_title"]
    dup_count = total_rows - df.unique(subset=dup_cols).height
    if dup_count > 0:
        typer.echo(
            f"  FAIL: {dup_count:,} duplicate (year, employer_id, first_name, "
            f"last_name, job_title) tuples found.",
            err=True,
        )
        all_passed = False

    if all_passed:
        typer.echo("  All assertions passed.")
    else:
        typer.echo("  Some assertions FAILED.", err=True)
        return False

    # ── Soft warnings ────────────────────────────────────────────────
    typer.echo("  Running warnings checks...")

    # Employers without region mapping
    no_region = df.filter(pl.col("region_id").is_null())
    no_region_count = len(no_region)
    no_region_pct = no_region_count / total_rows * 100
    if no_region_count > 0:
        unique_employers = no_region["employer_id"].n_unique()
        typer.echo(
            f"  WARN: {no_region_count:,} rows ({no_region_pct:.1f}%) from "
            f"{unique_employers:,} employers have no region mapping."
        )

    # Titles without role family match
    if "role_family" in df.columns:
        no_role = df.filter(pl.col("role_family").is_null())
        no_role_count = len(no_role)
        no_role_pct = no_role_count / total_rows * 100
        if no_role_count > 0:
            typer.echo(
                f"  WARN: {no_role_count:,} rows ({no_role_pct:.1f}%) have "
                f"no role family match."
            )

    # Large YoY changes
    if "yoy_salary_change" in df.columns:
        yoy_valid = df.filter(pl.col("yoy_salary_change").is_not_null())
        large_increase = yoy_valid.filter(pl.col("yoy_salary_change") > 100.0)
        large_decrease = yoy_valid.filter(pl.col("yoy_salary_change") < -50.0)
        if len(large_increase) > 0:
            typer.echo(
                f"  WARN: {len(large_increase):,} records show >100% YoY salary increase."
            )
        if len(large_decrease) > 0:
            typer.echo(
                f"  WARN: {len(large_decrease):,} records show >50% YoY salary decrease."
            )

    typer.echo("  Validation complete.")
    return True
