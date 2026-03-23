"""CLI entrypoint for the Pay Lens ETL pipeline."""

from __future__ import annotations

import time

import typer

app = typer.Typer(
    name="pay-lens-etl",
    help="ETL pipeline for Ontario Sunshine List data.",
    no_args_is_help=True,
)


def _parse_years(years_str: str) -> list[int]:
    """Parse a year range string into a list of integers.

    Supports formats: "2019-2024", "2020,2021,2022", "2024", or
    combinations like "1996-2000,2010,2020-2024".
    """
    result: list[int] = []
    for part in years_str.split(","):
        part = part.strip()
        if "-" in part:
            start_str, end_str = part.split("-", 1)
            start, end = int(start_str.strip()), int(end_str.strip())
            result.extend(range(start, end + 1))
        else:
            result.append(int(part))
    return sorted(set(result))


@app.command()
def run(
    years: str = typer.Option(
        "2019-2024",
        "--years",
        "-y",
        help='Year range to process (e.g. "2019-2024", "2020,2022", "1996-2024").',
    ),
    skip_download: bool = typer.Option(
        False,
        "--skip-download",
        help="Skip the download step (use existing raw files).",
    ),
) -> None:
    """Run the full ETL pipeline."""
    year_list = _parse_years(years)
    typer.echo(f"Pay Lens ETL — processing years: {year_list[0]}-{year_list[-1]}")
    typer.echo(f"  ({len(year_list)} year(s))\n")

    timings: list[tuple[str, float]] = []

    # ── Step 1: Download ─────────────────────────────────────────────
    if not skip_download:
        typer.echo("Step 1/5: Download")
        t0 = time.perf_counter()

        from etl.steps.s01_download import download

        download(year_list)
        elapsed = time.perf_counter() - t0
        timings.append(("Download", elapsed))
        typer.echo(f"  Done in {elapsed:.1f}s\n")
    else:
        typer.echo("Step 1/5: Download (skipped)\n")

    # ── Step 2: Normalize ────────────────────────────────────────────
    typer.echo("Step 2/5: Normalize")
    t0 = time.perf_counter()

    from etl.steps.s02_normalize import normalize

    normalized_path = normalize()
    elapsed = time.perf_counter() - t0
    timings.append(("Normalize", elapsed))
    typer.echo(f"  Done in {elapsed:.1f}s\n")

    # ── Step 3: Enrich ───────────────────────────────────────────────
    typer.echo("Step 3/5: Enrich")
    t0 = time.perf_counter()

    from etl.steps.s03_enrich import enrich

    enriched_path = enrich(normalized_path)
    elapsed = time.perf_counter() - t0
    timings.append(("Enrich", elapsed))
    typer.echo(f"  Done in {elapsed:.1f}s\n")

    # ── Step 4: Validate ─────────────────────────────────────────────
    typer.echo("Step 4/5: Validate")
    t0 = time.perf_counter()

    from etl.steps.s04_validate import validate

    passed = validate(enriched_path)
    elapsed = time.perf_counter() - t0
    timings.append(("Validate", elapsed))

    if not passed:
        typer.echo("  Validation FAILED. Halting pipeline.", err=True)
        raise typer.Exit(code=1)
    typer.echo(f"  Done in {elapsed:.1f}s\n")

    # ── Step 5: Load ─────────────────────────────────────────────────
    typer.echo("Step 5/5: Load")
    t0 = time.perf_counter()

    from etl.steps.s05_load import load

    load(enriched_path)
    elapsed = time.perf_counter() - t0
    timings.append(("Load", elapsed))
    typer.echo(f"  Done in {elapsed:.1f}s\n")

    # ── Summary ──────────────────────────────────────────────────────
    total = sum(t for _, t in timings)
    typer.echo("Pipeline complete!")
    typer.echo(f"  Total time: {total:.1f}s")
    for name, t in timings:
        typer.echo(f"    {name:12s} {t:6.1f}s")


if __name__ == "__main__":
    app()
