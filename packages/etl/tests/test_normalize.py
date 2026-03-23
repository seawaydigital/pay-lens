"""Tests for the normalize step and its helper functions."""

import pytest

from etl.steps.s02_normalize import _clean_name, _employer_slug, _parse_amount
from etl.utils.hashing import disclosure_id, person_id


class TestCleanName:
    """Tests for name cleaning."""

    def test_strips_whitespace(self):
        assert _clean_name("  John  ") == "John"

    def test_title_cases(self):
        assert _clean_name("JANE") == "Jane"
        assert _clean_name("jane doe") == "Jane Doe"

    def test_removes_honorifics(self):
        assert _clean_name("Dr. Jane Smith") == "Jane Smith"
        assert _clean_name("Mr. John Doe") == "John Doe"
        assert _clean_name("Mrs. Sarah Connor") == "Sarah Connor"
        assert _clean_name("Prof. Albert Einstein") == "Albert Einstein"

    def test_handles_none(self):
        assert _clean_name(None) == ""

    def test_handles_empty_string(self):
        assert _clean_name("") == ""

    def test_preserves_hyphenated_names(self):
        assert _clean_name("MARY-JANE WATSON") == "Mary-Jane Watson"

    def test_multiple_honorifics(self):
        result = _clean_name("Dr. Prof. Jane Smith")
        assert "Dr" not in result
        assert "Prof" not in result
        assert "Jane Smith" in result


class TestEmployerSlug:
    """Tests for employer slug generation."""

    def test_basic_slug(self):
        assert _employer_slug("University of Toronto") == "university-of-toronto"

    def test_strips_special_chars(self):
        assert _employer_slug("Hydro One Inc.") == "hydro-one-inc"

    def test_collapses_whitespace(self):
        assert _employer_slug("City  of   Ottawa") == "city-of-ottawa"

    def test_strips_leading_trailing_hyphens(self):
        assert _employer_slug(" -City of Toronto- ") == "city-of-toronto"


class TestParseAmount:
    """Tests for dollar amount parsing."""

    def test_standard_format(self):
        assert _parse_amount("$123,456.78") == 123456.78

    def test_no_dollar_sign(self):
        assert _parse_amount("123456.78") == 123456.78

    def test_plain_integer(self):
        assert _parse_amount("100000") == 100000.0

    def test_with_spaces(self):
        assert _parse_amount("$ 123 456.78") == 123456.78

    def test_none_input(self):
        assert _parse_amount(None) is None

    def test_empty_string(self):
        assert _parse_amount("") is None

    def test_non_numeric(self):
        assert _parse_amount("N/A") is None


class TestPersonId:
    """Tests for deterministic person ID generation."""

    def test_deterministic(self):
        id1 = person_id("John", "Doe")
        id2 = person_id("John", "Doe")
        assert id1 == id2

    def test_case_insensitive(self):
        assert person_id("john", "doe") == person_id("JOHN", "DOE")

    def test_strips_whitespace(self):
        assert person_id(" John ", " Doe ") == person_id("John", "Doe")

    def test_returns_12_hex_chars(self):
        pid = person_id("Jane", "Smith")
        assert len(pid) == 12
        assert all(c in "0123456789abcdef" for c in pid)

    def test_different_names_different_ids(self):
        assert person_id("John", "Doe") != person_id("Jane", "Smith")


class TestDisclosureId:
    """Tests for deterministic disclosure ID generation."""

    def test_deterministic(self):
        id1 = disclosure_id(2024, "city-of-toronto", "John", "Doe", "Manager")
        id2 = disclosure_id(2024, "city-of-toronto", "John", "Doe", "Manager")
        assert id1 == id2

    def test_different_years_different_ids(self):
        id1 = disclosure_id(2023, "city-of-toronto", "John", "Doe", "Manager")
        id2 = disclosure_id(2024, "city-of-toronto", "John", "Doe", "Manager")
        assert id1 != id2

    def test_returns_12_hex_chars(self):
        did = disclosure_id(2024, "employer", "First", "Last", "Title")
        assert len(did) == 12
        assert all(c in "0123456789abcdef" for c in did)
