"""Step 1: Download raw CSV files from Ontario.ca."""

from __future__ import annotations

import hashlib
from pathlib import Path

import httpx
import typer

from etl.config import settings

# ── Expected columns in every raw CSV ────────────────────────────────
EXPECTED_COLUMNS = {
    "Sector",
    "Last Name",
    "First Name",
    "Salary Paid",
    "Taxable Benefits",
    "Employer",
    "Job Title",
    "Calendar Year",
}

# ── URL overrides for years with non-standard paths ──────────────────
# The Ontario data portal has changed URL patterns over the years.
# Keys are years; values are full download URLs.
_URL_OVERRIDES: dict[int, str] = {
    1996: "https://files.ontario.ca/pssd/pssd-salary-disclosure-1996-en-2024-03.csv",
    1997: "https://files.ontario.ca/pssd/pssd-salary-disclosure-1997-en-2024-03.csv",
    1998: "https://files.ontario.ca/pssd/pssd-salary-disclosure-1998-en-2024-03.csv",
    1999: "https://files.ontario.ca/pssd/pssd-salary-disclosure-1999-en-2024-03.csv",
    2000: "https://files.ontario.ca/pssd/pssd-salary-disclosure-2000-en-2024-03.csv",
    2001: "https://files.ontario.ca/pssd/pssd-salary-disclosure-2001-en-2024-03.csv",
    2002: "https://files.ontario.ca/pssd/pssd-salary-disclosure-2002-en-2024-03.csv",
    2003: "https://files.ontario.ca/pssd/pssd-salary-disclosure-2003-en-2024-03.csv",
    2004: "https://files.ontario.ca/pssd/pssd-salary-disclosure-2004-en-2024-03.csv",
    2005: "https://files.ontario.ca/pssd/pssd-salary-disclosure-2005-en-2024-03.csv",
    2006: "https://files.ontario.ca/pssd/pssd-salary-disclosure-2006-en-2024-03.csv",
    2007: "https://files.ontario.ca/pssd/pssd-salary-disclosure-2007-en-2024-03.csv",
    2008: "https://files.ontario.ca/pssd/pssd-salary-disclosure-2008-en-2024-03.csv",
    2009: "https://files.ontario.ca/pssd/pssd-salary-disclosure-2009-en-2024-03.csv",
    2010: "https://files.ontario.ca/pssd/pssd-salary-disclosure-2010-en-2024-03.csv",
    2011: "https://files.ontario.ca/pssd/pssd-salary-disclosure-2011-en-2024-03.csv",
    2012: "https://files.ontario.ca/pssd/pssd-salary-disclosure-2012-en-2024-03.csv",
    2013: "https://files.ontario.ca/pssd/pssd-salary-disclosure-2013-en-2024-03.csv",
    2014: "https://files.ontario.ca/pssd/pssd-salary-disclosure-2014-en-2024-03.csv",
    2015: "https://files.ontario.ca/pssd/pssd-salary-disclosure-2015-en-2024-03.csv",
    2016: "https://files.ontario.ca/pssd/pssd-salary-disclosure-2016-en-2024-03.csv",
    2017: "https://files.ontario.ca/pssd/pssd-salary-disclosure-2017-en-2024-03.csv",
    2018: "https://files.ontario.ca/pssd/pssd-salary-disclosure-2018-en-2024-03.csv",
    2019: "https://files.ontario.ca/pssd/pssd-salary-disclosure-2019-en-2024-03.csv",
    2020: "https://files.ontario.ca/pssd/pssd-salary-disclosure-2020-en-2024-03.csv",
    2021: "https://files.ontario.ca/pssd/pssd-salary-disclosure-2021-en-2024-03.csv",
    2022: "https://files.ontario.ca/pssd/pssd-salary-disclosure-2022-en-2024-03.csv",
    2023: "https://files.ontario.ca/pssd/pssd-salary-disclosure-2023-en-2024-03.csv",
    2024: "https://files.ontario.ca/pssd/pssd-salary-disclosure-2024-en-2025-03.csv",
}


def _url_for_year(year: int) -> str:
    """Resolve the download URL for a given year."""
    if year in _URL_OVERRIDES:
        return _URL_OVERRIDES[year]
    return f"{settings.ONTARIO_DATA_BASE_URL}-{year}-en.csv"


def _sha256(path: Path) -> str:
    """Compute the SHA-256 hex digest of a file."""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def _validate_csv_columns(path: Path) -> None:
    """Ensure the CSV contains all expected header columns."""
    with open(path, "r", encoding="utf-8-sig") as f:
        header_line = f.readline().strip()

    if not header_line:
        raise ValueError(f"Empty CSV file: {path}")

    columns = {col.strip() for col in header_line.split(",")}
    missing = EXPECTED_COLUMNS - columns
    if missing:
        raise ValueError(
            f"CSV {path.name} is missing expected columns: {missing}. "
            f"Found: {columns}"
        )


def download(years: list[int]) -> list[Path]:
    """Download raw Sunshine List CSVs for the specified years.

    Files are saved to ``data/raw/{year}.csv``.  If a file already
    exists with the same SHA-256 hash as the remote content, the
    download is skipped.

    Returns the list of downloaded (or already-present) file paths.
    """
    raw_dir = settings.RAW_DIR
    raw_dir.mkdir(parents=True, exist_ok=True)

    downloaded: list[Path] = []

    for year in sorted(years):
        dest = raw_dir / f"{year}.csv"
        url = _url_for_year(year)
        typer.echo(f"  [{year}] {url}")

        # Download to a temporary location first
        try:
            with httpx.stream("GET", url, timeout=60.0, follow_redirects=True) as resp:
                resp.raise_for_status()
                tmp_path = dest.with_suffix(".csv.tmp")
                with open(tmp_path, "wb") as f:
                    for chunk in resp.iter_bytes(chunk_size=8192):
                        f.write(chunk)
        except httpx.HTTPError as exc:
            typer.echo(f"  ERROR downloading {year}: {exc}", err=True)
            continue

        new_hash = _sha256(tmp_path)

        # Idempotency: skip if the file already exists with the same hash
        if dest.exists():
            existing_hash = _sha256(dest)
            if existing_hash == new_hash:
                typer.echo(f"  [{year}] Unchanged (SHA-256: {new_hash[:12]}...)")
                tmp_path.unlink()
                downloaded.append(dest)
                continue

        tmp_path.rename(dest)

        # Validate columns
        try:
            _validate_csv_columns(dest)
        except ValueError as exc:
            typer.echo(f"  WARNING: {exc}", err=True)

        size_mb = dest.stat().st_size / (1024 * 1024)
        typer.echo(
            f"  [{year}] Saved ({size_mb:.1f} MB, SHA-256: {new_hash[:12]}...)"
        )
        downloaded.append(dest)

    typer.echo(f"  Download complete: {len(downloaded)} file(s).")
    return downloaded
