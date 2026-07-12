"""Placeholder for future LLM-based event metadata extraction from uploaded files."""

# TODO: Connect LLM parser here
# This module will receive uploaded file bytes and return structured event fields.


async def parse_event_from_file(content: bytes, filename: str) -> dict:
    """
    Extract event metadata from an uploaded file using an LLM.
    (Bypassed/Mocked for production setup).
    """
    # TODO: Connect LLM parser here
    return {
        "title": filename.rsplit(".", 1)[0] if filename else "Mock Event",
        "description": "Mock description extracted from file.",
        "event_date": "2026-07-13",
        "end_date": None,
        "start_time": "10:00",
        "end_time": "12:00",
        "venue": "Mock Venue",
        "priority": "STANDARD",
    }
