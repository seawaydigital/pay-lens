"""Fuzzy-matching utilities built on rapidfuzz."""

from rapidfuzz import process as rfprocess


def match_role(
    title: str,
    taxonomy: list[str],
    threshold: int = 80,
) -> str | None:
    """Match a job title to the closest entry in a role taxonomy.

    Parameters
    ----------
    title:
        The raw job title to match.
    taxonomy:
        List of canonical role family names to match against.
    threshold:
        Minimum similarity score (0-100) required for a match.

    Returns
    -------
    The best-matching taxonomy entry, or ``None`` if no match meets
    the threshold.
    """
    if not title or not taxonomy:
        return None

    result = rfprocess.extractOne(
        title.strip(),
        taxonomy,
        score_cutoff=threshold,
    )

    if result is None:
        return None

    matched_value, score, _index = result
    return matched_value
