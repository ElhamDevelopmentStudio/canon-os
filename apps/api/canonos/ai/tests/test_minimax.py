from __future__ import annotations

from canonos.ai.minimax import _extract_json_object


def test_extract_json_object_handles_fenced_json() -> None:
    assert _extract_json_object('```json\n{"slots": {"mediaType": "movie"}}\n```') == (
        '{"slots": {"mediaType": "movie"}}'
    )


def test_extract_json_object_handles_leading_text() -> None:
    assert _extract_json_object('Here is the JSON:\n{"slots": {"theme": "memory"}}') == (
        '{"slots": {"theme": "memory"}}'
    )
