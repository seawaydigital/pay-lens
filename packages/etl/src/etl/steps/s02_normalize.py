"""Step 2: Normalize and clean raw Sunshine List CSV data."""

from __future__ import annotations

import importlib.resources
import re
from pathlib import Path

import polars as pl
import typer

from etl.config import settings
from etl.utils.hashing import person_id as compute_person_id

# ── Honorifics / titles to strip from names ──────────────────────────
_HONORIFICS = re.compile(
    r"\b(Dr\.?|Mr\.?|Mrs\.?|Ms\.?|Prof\.?|Rev\.?|Hon\.?|Sr\.?|Jr\.?)\b",
    re.IGNORECASE,
)

# ── Path to bundled lookup files ─────────────────────────────────────
_LOOKUPS_DIR = Path(__file__).resolve().parent.parent / "lookups"


def _load_employer_aliases() -> dict[str, str]:
    """Load the employer alias mapping (raw_name -> canonical_name).

    Keys are upper-cased for case-insensitive matching.
    """
    csv_path = _LOOKUPS_DIR / "employer_aliases.csv"
    if not csv_path.exists():
        typer.echo("  WARNING: employer_aliases.csv not found, skipping alias mapping.")
        return {}

    df = pl.read_csv(csv_path)
    return {
        row["raw_name"].strip().upper(): row["canonical_name"].strip()
        for row in df.iter_rows(named=True)
    }


def _employer_slug(name: str) -> str:
    """Generate a stable slug from an employer name.

    Example: "University of Toronto" -> "university-of-toronto"
    """
    slug = name.strip().lower()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"\s+", "-", slug)
    slug = re.sub(r"-+", "-", slug)
    return slug.strip("-")


def _clean_name(name: str | None) -> str:
    """Strip whitespace, remove honorifics, and title-case a name."""
    if name is None:
        return ""
    cleaned = name.strip()
    cleaned = _HONORIFICS.sub("", cleaned)
    # Collapse multiple spaces left by removed honorifics
    cleaned = re.sub(r"\s{2,}", " ", cleaned).strip()
    return cleaned.title()


def _parse_amount(value: str | None) -> float | None:
    """Parse a dollar-formatted string to float.

    Handles: "$123,456.78", "123456.78", "$123 456.78"
    """
    if value is None:
        return None
    cleaned = value.replace("$", "").replace(",", "").replace(" ", "").strip()
    if not cleaned:
        return None
    try:
        return float(cleaned)
    except ValueError:
        return None


def normalize(raw_dir: Path | None = None) -> Path:
    """Read all raw CSVs, clean and normalize, write to staging.

    Returns the path to the output ``normalized.parquet`` file.
    """
    if raw_dir is None:
        raw_dir = settings.RAW_DIR

    staging_dir = settings.STAGING_DIR
    staging_dir.mkdir(parents=True, exist_ok=True)
    output_path = staging_dir / "normalized.parquet"

    # ── Collect all CSV files ────────────────────────────────────────
    csv_files = sorted(raw_dir.glob("*.csv"))
    if not csv_files:
        raise FileNotFoundError(f"No CSV files found in {raw_dir}")

    typer.echo(f"  Reading {len(csv_files)} CSV file(s) from {raw_dir}...")

    frames: list[pl.DataFrame] = []
    for csv_path in csv_files:
        try:
            df = pl.read_csv(
                csv_path,
                infer_schema_length=0,  # read everything as strings first
                encoding="utf8-lossy",
            )
            frames.append(df)
            typer.echo(f"    {csv_path.name}: {len(df):,} rows")
        except Exception as exc:
            typer.echo(f"    ERROR reading {csv_path.name}: {exc}", err=True)

    if not frames:
        raise RuntimeError("No CSV files could be read successfully.")

    combined = pl.concat(frames, how="diagonal_relaxed")
    typer.echo(f"  Combined: {len(combined):,} rows")

    # ── Load employer aliases ────────────────────────────────────────
    aliases = _load_employer_aliases()

    # ── Transform ────────────────────────────────────────────────────
    typer.echo("  Cleaning names, employers, and amounts...")

    # Work in Python-land for cleaning, then convert back to Polars
    records: list[dict] = []
    for row in combined.iter_rows(named=True):
        first_name = _clean_name(row.get("First Name"))
        last_name = _clean_name(row.get("Last Name"))

        # Employer normalisation
        raw_employer = (row.get("Employer") or "").strip()
        employer_upper = raw_employer.upper()
        canonical_employer = aliases.get(employer_upper, raw_employer)
        # Title-case if the alias mapping didn't provide one
        if canonical_employer == raw_employer and raw_employer == raw_employer.upper():
            canonical_employer = raw_employer.title()
        employer_id = _employer_slug(canonical_employer)

        # Title cleaning
        job_title = (row.get("Job Title") or "").strip().title()

        # Amount parsing
        salary_paid = _parse_amount(row.get("Salary Paid"))
        taxable_benefits = _parse_amount(row.get("Taxable Benefits"))

        # Year
        year_raw = row.get("Calendar Year")
        try:
            year = int(str(year_raw).strip()) if year_raw else None
        except (ValueError, TypeError):
            year = None

        # Sector
        sector = (row.get("Sector") or "").strip().title()

        # Computed fields
        total_comp = None
        if salary_paid is not None and taxable_benefits is not None:
            total_comp = salary_paid + taxable_benefits
        elif salary_paid is not None:
            total_comp = salary_paid

        pid = compute_person_id(first_name, last_name)

        records.append(
            {
                "year": year,
                "sector": sector,
                "employer": canonical_employer,
                "employer_id": employer_id,
                "first_name": first_name,
                "last_name": last_name,
                "job_title": job_title,
                "salary_paid": salary_paid,
                "taxable_benefits": taxable_benefits,
                "total_compensation": total_comp,
                "person_id": pid,
            }
        )

    result = pl.DataFrame(records)

    # ── Write output ─────────────────────────────────────────────────
    result.write_parquet(output_path)
    typer.echo(
        f"  Normalized: {len(result):,} rows -> {output_path} "
        f"({output_path.stat().st_size / (1024*1024):.1f} MB)"
    )
    return output_path
