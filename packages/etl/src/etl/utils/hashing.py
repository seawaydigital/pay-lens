"""Deterministic ID generation for entities."""

import hashlib


def person_id(first_name: str, last_name: str) -> str:
    """Generate a stable person identifier from name components.

    Uses SHA-256 of the lowercased, stripped name parts and returns the
    first 12 hex characters.  Two records with the same canonical name
    will always produce the same ID.
    """
    key = f"{first_name.strip().lower()}|{last_name.strip().lower()}"
    return hashlib.sha256(key.encode("utf-8")).hexdigest()[:12]


def disclosure_id(
    year: int,
    employer_id: str,
    first_name: str,
    last_name: str,
    job_title: str,
) -> str:
    """Generate a stable disclosure record identifier.

    The composite key ensures uniqueness across years, employers, and
    individuals while remaining deterministic.
    """
    key = "|".join(
        [
            str(year),
            employer_id.strip().lower(),
            first_name.strip().lower(),
            last_name.strip().lower(),
            job_title.strip().lower(),
        ]
    )
    return hashlib.sha256(key.encode("utf-8")).hexdigest()[:12]
