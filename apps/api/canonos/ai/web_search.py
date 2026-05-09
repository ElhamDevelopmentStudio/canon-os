from __future__ import annotations

import os
from dataclasses import dataclass
from urllib import error, parse, request


@dataclass(frozen=True)
class WebSearchResult:
    title: str
    url: str
    snippet: str


class WebSearchError(RuntimeError):
    pass


class WebSearchClient:
    def __init__(self) -> None:
        self.enabled = os.environ.get("CANONOS_WEB_SEARCH_ENABLED", "true").strip().lower() in {
            "1",
            "true",
            "yes",
            "on",
        }
        self.timeout = _int_env("CANONOS_WEB_SEARCH_TIMEOUT_SECONDS", default=8)
        self.max_chars = _int_env("CANONOS_WEB_SEARCH_MAX_CHARS", default=5000)

    def search_text(self, query: str) -> str:
        clean_query = " ".join(query.split()).strip()
        if not self.enabled or not clean_query:
            return ""
        url = f"https://s.jina.ai/?q={parse.quote(clean_query)}"
        http_request = request.Request(
            url,
            headers={
                "Accept": "text/plain",
                "User-Agent": "CanonOS/0.1 discovery web search",
            },
        )
        try:
            with request.urlopen(http_request, timeout=self.timeout) as response:  # noqa: S310
                text = response.read().decode("utf-8", errors="replace")
        except (TimeoutError, error.HTTPError, error.URLError) as exc:
            raise WebSearchError(str(exc)) from exc
        return text[: self.max_chars]


def _int_env(name: str, *, default: int) -> int:
    try:
        return max(1, int(os.environ.get(name, str(default))))
    except ValueError:
        return default
