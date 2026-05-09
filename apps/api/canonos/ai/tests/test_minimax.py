from __future__ import annotations

from canonos.ai.minimax import _extract_json_object, _stream_delta


def test_extract_json_object_handles_fenced_json() -> None:
    assert _extract_json_object('```json\n{"slots": {"mediaType": "movie"}}\n```') == (
        '{"slots": {"mediaType": "movie"}}'
    )


def test_extract_json_object_handles_leading_text() -> None:
    assert _extract_json_object('Here is the JSON:\n{"slots": {"theme": "memory"}}') == (
        '{"slots": {"theme": "memory"}}'
    )


def test_stream_delta_reads_openai_compatible_chunk() -> None:
    assert (
        _stream_delta(
            {
                "choices": [
                    {
                        "delta": {
                            "content": "Mind-bending",
                        }
                    }
                ]
            }
        )
        == "Mind-bending"
    )
