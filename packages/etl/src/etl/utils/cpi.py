"""Bank of Canada CPI data fetcher and adjustment calculator."""

from __future__ import annotations

import json
from pathlib import Path

import httpx
import typer

from etl.config import settings


def fetch_cpi_data(cache_path: Path | None = None) -> dict[int, float]:
    """Fetch CPI data from the Bank of Canada Valet API.

    Returns a mapping of year to CPI index value.  If *cache_path* is
    provided and exists, the cached data is returned instead of making
    a network request.  New fetches are written to *cache_path* when
    supplied.
    """
    if cache_path is None:
        cache_path = settings.STAGING_DIR / "cpi_cache.json"

    # Return cached data when available
    if cache_path.exists():
        typer.echo(f"  Using cached CPI data from {cache_path}")
        with open(cache_path, "r") as f:
            raw: dict[str, float] = json.load(f)
        return {int(k): v for k, v in raw.items()}

    typer.echo("  Fetching CPI data from Bank of Canada...")
    try:
        response = httpx.get(
            settings.BANK_OF_CANADA_CPI_URL,
            timeout=30.0,
        )
        response.raise_for_status()
        payload = response.json()
    except httpx.HTTPError as exc:
        typer.echo(f"  WARNING: Failed to fetch CPI data: {exc}", err=True)
        typer.echo("  Falling back to built-in CPI estimates.", err=True)
        return _fallback_cpi()

    observations = payload.get("observations", [])
    cpi_by_year: dict[int, float] = {}

    for obs in observations:
        date_str = obs.get("d", "")
        value_obj = obs.get("STATIC_INFLATIONCALC", {})
        value = value_obj.get("v")

        if not date_str or value is None:
            continue

        try:
            year = int(date_str[:4])
            cpi_by_year[year] = float(value)
        except (ValueError, TypeError):
            continue

    if not cpi_by_year:
        typer.echo("  WARNING: No CPI observations parsed, using fallback.", err=True)
        return _fallback_cpi()

    # Cache the result
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    with open(cache_path, "w") as f:
        json.dump({str(k): v for k, v in sorted(cpi_by_year.items())}, f, indent=2)

    typer.echo(f"  Fetched CPI data for {len(cpi_by_year)} years.")
    return cpi_by_year


def compute_adjustment_factors(
    cpi_data: dict[int, float],
    target_year: int,
) -> dict[int, float]:
    """Compute CPI adjustment factors relative to a target year.

    Returns a dict mapping each year to a multiplier that converts
    that year's dollars into *target_year* dollars.

    ``adjusted_salary = salary * factor[year]``
    """
    if target_year not in cpi_data:
        raise ValueError(
            f"Target year {target_year} not found in CPI data. "
            f"Available: {sorted(cpi_data.keys())}"
        )

    target_cpi = cpi_data[target_year]
    return {year: target_cpi / cpi for year, cpi in cpi_data.items() if cpi > 0}


def _fallback_cpi() -> dict[int, float]:
    """Hardcoded CPI estimates (Canada, 2002=100 base) as a safety net."""
    return {
        1996: 88.9,
        1997: 90.4,
        1998: 91.3,
        1999: 92.9,
        2000: 95.4,
        2001: 97.8,
        2002: 100.0,
        2003: 102.8,
        2004: 104.7,
        2005: 107.0,
        2006: 109.1,
        2007: 111.5,
        2008: 114.1,
        2009: 114.4,
        2010: 116.5,
        2011: 119.9,
        2012: 121.7,
        2013: 122.8,
        2014: 125.2,
        2015: 126.6,
        2016: 128.4,
        2017: 130.4,
        2018: 133.4,
        2019: 136.0,
        2020: 137.0,
        2021: 141.7,
        2022: 151.2,
        2023: 156.0,
        2024: 159.7,
    }
