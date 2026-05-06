from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from typing import Any, Protocol
from urllib.error import HTTPError, URLError
from urllib.parse import quote_plus, urlencode
from urllib.request import Request, urlopen

from canonos.media.models import MediaItem
from canonos.metadata.models import ExternalMetadata

REQUEST_TIMEOUT_SECONDS = 8
USER_AGENT = "CanonOS/0.1 metadata provider"


@dataclass(frozen=True)
class ExternalMediaMatch:
    provider: str
    provider_item_id: str
    media_type: str
    title: str
    original_title: str = ""
    description: str = ""
    release_year: int | None = None
    creator: str = ""
    image_url: str = ""
    external_rating: float | None = None
    external_popularity: float | None = None
    confidence: float = 0.7
    source_url: str = ""
    raw_payload: dict[str, Any] = field(default_factory=dict)


class MetadataProvider(Protocol):
    provider_name: str
    supported_media_types: tuple[str, ...]

    def search(self, query: str, media_type: str | None = None) -> list[ExternalMediaMatch]: ...

    def fetch_details(self, provider_item_id: str) -> ExternalMediaMatch: ...


@dataclass(frozen=True)
class ProviderCapability:
    provider: str
    label: str
    lookup_supported: bool
    lookup_configured: bool
    account_import_supported: bool
    export_upload_supported: bool
    source_providers: tuple[str, ...] = ()
    notes: str = ""


class DeterministicPlaceholderProvider:
    provider_name = ExternalMetadata.ExternalProvider.MANUAL
    supported_media_types: tuple[str, ...] = ()
    provider_label = "Manual metadata provider"
    example_creator = "Unknown creator"
    default_media_type = MediaItem.MediaType.MOVIE
    base_rating = 7.1
    base_popularity = 40.0

    def search(self, query: str, media_type: str | None = None) -> list[ExternalMediaMatch]:
        clean_query = " ".join(query.split()).strip()
        if not clean_query:
            return []
        chosen_media_type = self._coerce_media_type(media_type)
        return [self._make_match(clean_query, chosen_media_type)]

    def fetch_details(self, provider_item_id: str) -> ExternalMediaMatch:
        title_slug = provider_item_id.split(":", maxsplit=1)[-1].replace("-", " ").strip()
        title = title_slug.title() if title_slug else "Untitled metadata"
        return self._make_match(title, self.default_media_type, provider_item_id=provider_item_id)

    def _coerce_media_type(self, media_type: str | None) -> str:
        if media_type in self.supported_media_types:
            return media_type
        return self.default_media_type

    def _make_match(
        self,
        title: str,
        media_type: str,
        *,
        provider_item_id: str | None = None,
    ) -> ExternalMediaMatch:
        slug = quote_plus(title.lower()).replace("+", "-")
        external_id = provider_item_id or f"{self.provider_name}:{media_type}:{slug}"
        source = f"https://metadata.local/{self.provider_name}/{quote_plus(external_id)}"
        return ExternalMediaMatch(
            provider=self.provider_name,
            provider_item_id=external_id,
            media_type=media_type,
            title=title,
            original_title=title,
            description=(
                f"Deterministic {self.provider_label} match for {title}. "
                "Replace this placeholder adapter with a configured external API "
                "when provider keys are available."
            ),
            release_year=2000 + (len(title) % 24),
            creator=self.example_creator,
            image_url=f"https://placehold.co/320x480?text={quote_plus(title[:32])}",
            external_rating=round(min(9.5, self.base_rating + (len(title) % 7) / 10), 2),
            external_popularity=round(min(98.0, self.base_popularity + (len(title) % 23)), 2),
            confidence=0.76,
            source_url=source,
            raw_payload={
                "provider": self.provider_name,
                "providerItemId": external_id,
                "queryTitle": title,
                "placeholder": True,
            },
        )


class MovieTvPlaceholderProvider(DeterministicPlaceholderProvider):
    provider_name = ExternalMetadata.ExternalProvider.MOVIE_TV
    supported_media_types = (MediaItem.MediaType.MOVIE, MediaItem.MediaType.TV_SHOW)
    provider_label = "movie/TV"
    example_creator = "Placeholder director"
    default_media_type = MediaItem.MediaType.MOVIE
    base_rating = 7.2
    base_popularity = 54.0


class AnimePlaceholderProvider(DeterministicPlaceholderProvider):
    provider_name = ExternalMetadata.ExternalProvider.ANIME
    supported_media_types = (MediaItem.MediaType.ANIME,)
    provider_label = "anime"
    example_creator = "Placeholder studio"
    default_media_type = MediaItem.MediaType.ANIME
    base_rating = 7.4
    base_popularity = 48.0


class BookPlaceholderProvider(DeterministicPlaceholderProvider):
    provider_name = ExternalMetadata.ExternalProvider.BOOK
    supported_media_types = (MediaItem.MediaType.NOVEL,)
    provider_label = "book"
    example_creator = "Placeholder author"
    default_media_type = MediaItem.MediaType.NOVEL
    base_rating = 7.6
    base_popularity = 35.0


class AudiobookPlaceholderProvider(DeterministicPlaceholderProvider):
    provider_name = ExternalMetadata.ExternalProvider.AUDIOBOOK
    supported_media_types = (MediaItem.MediaType.AUDIOBOOK,)
    provider_label = "audiobook"
    example_creator = "Placeholder narrator"
    default_media_type = MediaItem.MediaType.AUDIOBOOK
    base_rating = 7.3
    base_popularity = 32.0


class ProviderRequestError(RuntimeError):
    pass


def _json_request(
    url: str,
    *,
    headers: dict[str, str] | None = None,
    body: dict[str, object] | None = None,
) -> dict[str, Any]:
    request_headers = {"Accept": "application/json", "User-Agent": USER_AGENT, **(headers or {})}
    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        request_headers["Content-Type"] = "application/json"
    request = Request(url, data=data, headers=request_headers)
    try:
        with urlopen(request, timeout=REQUEST_TIMEOUT_SECONDS) as response:  # noqa: S310
            payload = response.read().decode("utf-8")
    except (HTTPError, URLError, TimeoutError) as exc:
        raise ProviderRequestError(str(exc)) from exc
    try:
        decoded = json.loads(payload)
    except json.JSONDecodeError as exc:
        raise ProviderRequestError("Provider returned invalid JSON.") from exc
    if not isinstance(decoded, dict):
        raise ProviderRequestError("Provider returned an unexpected payload shape.")
    return decoded


def _provider_network_enabled() -> bool:
    explicit = os.environ.get("CANONOS_METADATA_ENABLE_NETWORK", "").strip().lower()
    if explicit in {"1", "true", "yes", "on"}:
        return True
    if explicit in {"0", "false", "no", "off"}:
        return False
    return os.environ.get("DJANGO_SETTINGS_MODULE") != "config.settings.test"


def _clean_text(value: object) -> str:
    if not isinstance(value, str):
        return ""
    return " ".join(value.replace("<br>", " ").replace("<br />", " ").split()).strip()


def _year_from_date(value: object) -> int | None:
    if not isinstance(value, str) or len(value) < 4:
        return None
    try:
        return int(value[:4])
    except ValueError:
        return None


def _float_or_none(value: object) -> float | None:
    try:
        return float(value) if value not in {None, ""} else None
    except (TypeError, ValueError):
        return None


def _scale_popularity(value: object, *, divisor: float = 1.0) -> float | None:
    parsed = _float_or_none(value)
    if parsed is None:
        return None
    return round(max(0.0, min(100.0, parsed / divisor)), 2)


def _tmdb_image_url(path: object) -> str:
    return f"https://image.tmdb.org/t/p/w500{path}" if isinstance(path, str) and path else ""


class MovieTvProvider(MovieTvPlaceholderProvider):
    provider_label = "TMDb/OMDb movie and TV"

    def __init__(self) -> None:
        self.tmdb_read_access_token = os.environ.get("TMDB_READ_ACCESS_TOKEN", "").strip()
        self.tmdb_api_key = os.environ.get("TMDB_API_KEY", "").strip()
        self.omdb_api_key = os.environ.get("OMDB_API_KEY", "").strip()

    def search(self, query: str, media_type: str | None = None) -> list[ExternalMediaMatch]:
        if not _provider_network_enabled():
            return super().search(query, media_type)
        matches: list[ExternalMediaMatch] = []
        if self.tmdb_read_access_token or self.tmdb_api_key:
            matches.extend(self._search_tmdb(query, media_type))
        if self.omdb_api_key:
            matches.extend(self._search_omdb(query, media_type))
        return matches or super().search(query, media_type)

    def fetch_details(self, provider_item_id: str) -> ExternalMediaMatch:
        if provider_item_id.startswith("tmdb:"):
            return self._fetch_tmdb_details(provider_item_id)
        if provider_item_id.startswith("omdb:"):
            return self._fetch_omdb_details(provider_item_id)
        return super().fetch_details(provider_item_id)

    def _search_tmdb(self, query: str, media_type: str | None) -> list[ExternalMediaMatch]:
        paths: list[tuple[str, str]]
        if media_type == MediaItem.MediaType.TV_SHOW:
            paths = [("tv", MediaItem.MediaType.TV_SHOW)]
        elif media_type == MediaItem.MediaType.MOVIE:
            paths = [("movie", MediaItem.MediaType.MOVIE)]
        else:
            paths = [("movie", MediaItem.MediaType.MOVIE), ("tv", MediaItem.MediaType.TV_SHOW)]

        matches: list[ExternalMediaMatch] = []
        for tmdb_type, canon_type in paths:
            url = self._tmdb_url(f"/search/{tmdb_type}", {"query": query, "include_adult": "false"})
            try:
                payload = _json_request(url, headers=self._tmdb_headers())
            except ProviderRequestError:
                continue
            for item in payload.get("results", [])[:5]:
                if isinstance(item, dict):
                    matches.append(
                        self._tmdb_match(item, tmdb_type=tmdb_type, media_type=canon_type)
                    )
        return matches

    def _fetch_tmdb_details(self, provider_item_id: str) -> ExternalMediaMatch:
        _, tmdb_type, item_id = provider_item_id.split(":", maxsplit=2)
        canon_type = MediaItem.MediaType.TV_SHOW if tmdb_type == "tv" else MediaItem.MediaType.MOVIE
        payload = _json_request(
            self._tmdb_url(f"/{tmdb_type}/{item_id}", {"append_to_response": "credits"}),
            headers=self._tmdb_headers(),
        )
        return self._tmdb_match(
            payload,
            tmdb_type=tmdb_type,
            media_type=canon_type,
            confidence=0.95,
        )

    def _tmdb_match(
        self,
        item: dict[str, Any],
        *,
        tmdb_type: str,
        media_type: str,
        confidence: float = 0.86,
    ) -> ExternalMediaMatch:
        item_id = str(item.get("id") or "")
        title = _clean_text(item.get("title") or item.get("name"))
        original_title = (
            _clean_text(item.get("original_title") or item.get("original_name")) or title
        )
        release_year = _year_from_date(item.get("release_date") or item.get("first_air_date"))
        source_url = f"https://www.themoviedb.org/{tmdb_type}/{item_id}" if item_id else ""
        creator = self._tmdb_creator(item, tmdb_type=tmdb_type)
        return ExternalMediaMatch(
            provider=self.provider_name,
            provider_item_id=f"tmdb:{tmdb_type}:{item_id}",
            media_type=media_type,
            title=title or original_title or "Untitled",
            original_title=original_title,
            description=_clean_text(item.get("overview")),
            release_year=release_year,
            creator=creator,
            image_url=_tmdb_image_url(item.get("poster_path")),
            external_rating=_float_or_none(item.get("vote_average")),
            external_popularity=_scale_popularity(item.get("popularity")),
            confidence=confidence,
            source_url=source_url,
            raw_payload={
                "sourceProvider": "tmdb",
                "sourceMediaType": tmdb_type,
                "tmdbId": item_id,
                "imdbId": item.get("imdb_id"),
                "raw": item,
            },
        )

    def _tmdb_creator(self, item: dict[str, Any], *, tmdb_type: str) -> str:
        if tmdb_type == "tv":
            creators = item.get("created_by")
            if isinstance(creators, list):
                names = [
                    _clean_text(creator.get("name"))
                    for creator in creators
                    if isinstance(creator, dict)
                ]
                return ", ".join(name for name in names if name)
        credits = item.get("credits")
        if isinstance(credits, dict):
            crew = credits.get("crew")
            if isinstance(crew, list):
                directors = [
                    _clean_text(person.get("name"))
                    for person in crew
                    if isinstance(person, dict) and person.get("job") == "Director"
                ]
                if directors:
                    return ", ".join(director for director in directors if director)
        return ""

    def _tmdb_url(self, path: str, params: dict[str, object]) -> str:
        query = {**params}
        if self.tmdb_api_key and not self.tmdb_read_access_token:
            query["api_key"] = self.tmdb_api_key
        return f"https://api.themoviedb.org/3{path}?{urlencode(query)}"

    def _tmdb_headers(self) -> dict[str, str]:
        if not self.tmdb_read_access_token:
            return {}
        return {"Authorization": f"Bearer {self.tmdb_read_access_token}"}

    def _search_omdb(self, query: str, media_type: str | None) -> list[ExternalMediaMatch]:
        omdb_type = "series" if media_type == MediaItem.MediaType.TV_SHOW else "movie"
        if media_type not in {MediaItem.MediaType.MOVIE, MediaItem.MediaType.TV_SHOW}:
            omdb_type = ""
        params = {"apikey": self.omdb_api_key, "s": query}
        if omdb_type:
            params["type"] = omdb_type
        try:
            payload = _json_request(f"https://www.omdbapi.com/?{urlencode(params)}")
        except ProviderRequestError:
            return []
        results = payload.get("Search") if payload.get("Response") == "True" else []
        matches: list[ExternalMediaMatch] = []
        if isinstance(results, list):
            for item in results[:5]:
                if isinstance(item, dict):
                    matches.append(self._omdb_match(item, confidence=0.78))
        return matches

    def _fetch_omdb_details(self, provider_item_id: str) -> ExternalMediaMatch:
        imdb_id = provider_item_id.split(":", maxsplit=1)[-1]
        params = {"apikey": self.omdb_api_key, "i": imdb_id, "plot": "full"}
        payload = _json_request(f"https://www.omdbapi.com/?{urlencode(params)}")
        if payload.get("Response") == "False":
            raise ProviderRequestError(str(payload.get("Error") or "OMDb lookup failed."))
        return self._omdb_match(payload, confidence=0.9)

    def _omdb_match(self, item: dict[str, Any], *, confidence: float) -> ExternalMediaMatch:
        imdb_id = str(item.get("imdbID") or "")
        media_type = (
            MediaItem.MediaType.TV_SHOW
            if item.get("Type") == "series"
            else MediaItem.MediaType.MOVIE
        )
        poster = str(item.get("Poster") or "")
        rating = _float_or_none(item.get("imdbRating"))
        return ExternalMediaMatch(
            provider=self.provider_name,
            provider_item_id=f"omdb:{imdb_id}",
            media_type=media_type,
            title=_clean_text(item.get("Title")) or "Untitled",
            original_title=_clean_text(item.get("Title")),
            description=_clean_text(item.get("Plot")),
            release_year=_year_from_date(item.get("Year")),
            creator=_clean_text(item.get("Director") or item.get("Writer")),
            image_url="" if poster == "N/A" else poster,
            external_rating=rating,
            external_popularity=None,
            confidence=confidence,
            source_url=f"https://www.imdb.com/title/{imdb_id}/" if imdb_id else "",
            raw_payload={
                "sourceProvider": "omdb",
                "imdbId": imdb_id,
                "accountImport": False,
                "raw": item,
            },
        )


class AnimeProvider(AnimePlaceholderProvider):
    provider_label = "AniList anime"
    graphql_url = "https://graphql.anilist.co"

    def search(self, query: str, media_type: str | None = None) -> list[ExternalMediaMatch]:
        if not _provider_network_enabled():
            return super().search(query, media_type)
        if media_type not in {None, "", MediaItem.MediaType.ANIME}:
            return []
        body = {
            "query": """
                query ($search: String) {
                  Page(page: 1, perPage: 8) {
                    media(search: $search, type: ANIME) {
                      id
                      title { romaji english native }
                      description(asHtml: false)
                      startDate { year }
                      coverImage { large }
                      averageScore
                      popularity
                      siteUrl
                      studios(isMain: true) { nodes { name } }
                    }
                  }
                }
            """,
            "variables": {"search": query},
        }
        try:
            payload = _json_request(self.graphql_url, body=body)
        except ProviderRequestError:
            return super().search(query, media_type)
        media = payload.get("data", {}).get("Page", {}).get("media", [])
        if not isinstance(media, list):
            return []
        matches = [
            self._anilist_match(item, confidence=0.84) for item in media if isinstance(item, dict)
        ]
        return matches or super().search(query, media_type)

    def fetch_details(self, provider_item_id: str) -> ExternalMediaMatch:
        if not provider_item_id.startswith("anilist:"):
            return super().fetch_details(provider_item_id)
        anilist_id = provider_item_id.split(":", maxsplit=1)[-1]
        body = {
            "query": """
                query ($id: Int) {
                  Media(id: $id, type: ANIME) {
                    id
                    title { romaji english native }
                    description(asHtml: false)
                    startDate { year }
                    coverImage { large }
                    averageScore
                    popularity
                    siteUrl
                    studios(isMain: true) { nodes { name } }
                  }
                }
            """,
            "variables": {"id": int(anilist_id)},
        }
        payload = _json_request(self.graphql_url, body=body)
        media = payload.get("data", {}).get("Media")
        if not isinstance(media, dict):
            raise ProviderRequestError("AniList media was not found.")
        return self._anilist_match(media, confidence=0.94)

    def _anilist_match(self, item: dict[str, Any], *, confidence: float) -> ExternalMediaMatch:
        title_data = item.get("title") if isinstance(item.get("title"), dict) else {}
        title = _clean_text(
            title_data.get("english") or title_data.get("romaji") or title_data.get("native")
        )
        studios = item.get("studios", {}).get("nodes", [])
        studio_names = (
            [_clean_text(studio.get("name")) for studio in studios if isinstance(studio, dict)]
            if isinstance(studios, list)
            else []
        )
        average_score = _float_or_none(item.get("averageScore"))
        return ExternalMediaMatch(
            provider=self.provider_name,
            provider_item_id=f"anilist:{item.get('id')}",
            media_type=MediaItem.MediaType.ANIME,
            title=title or "Untitled anime",
            original_title=(
                _clean_text(title_data.get("romaji") or title_data.get("native")) or title
            ),
            description=_clean_text(item.get("description")),
            release_year=(
                item.get("startDate", {}).get("year")
                if isinstance(item.get("startDate"), dict)
                else None
            ),
            creator=", ".join(name for name in studio_names if name),
            image_url=str(item.get("coverImage", {}).get("large") or ""),
            external_rating=round(average_score / 10, 2) if average_score is not None else None,
            external_popularity=_scale_popularity(item.get("popularity"), divisor=1000),
            confidence=confidence,
            source_url=str(item.get("siteUrl") or ""),
            raw_payload={"sourceProvider": "anilist", "anilistId": item.get("id"), "raw": item},
        )


class BookProvider(BookPlaceholderProvider):
    provider_label = "Google Books/Open Library book"

    def __init__(self) -> None:
        self.google_books_api_key = os.environ.get("GOOGLE_BOOKS_API_KEY", "").strip()

    def search(self, query: str, media_type: str | None = None) -> list[ExternalMediaMatch]:
        if not _provider_network_enabled():
            return super().search(query, media_type)
        if media_type not in {None, "", MediaItem.MediaType.NOVEL}:
            return []
        matches = self._search_google_books(query, MediaItem.MediaType.NOVEL)
        matches.extend(self._search_open_library(query, MediaItem.MediaType.NOVEL))
        return matches or super().search(query, media_type)

    def fetch_details(self, provider_item_id: str) -> ExternalMediaMatch:
        if provider_item_id.startswith("google_books:"):
            return self._fetch_google_books(provider_item_id, MediaItem.MediaType.NOVEL)
        if provider_item_id.startswith("open_library:"):
            return self._fetch_open_library(provider_item_id, MediaItem.MediaType.NOVEL)
        return super().fetch_details(provider_item_id)

    def _search_google_books(self, query: str, media_type: str) -> list[ExternalMediaMatch]:
        params = {"q": query, "maxResults": 8, "printType": "books"}
        if self.google_books_api_key:
            params["key"] = self.google_books_api_key
        try:
            payload = _json_request(
                f"https://www.googleapis.com/books/v1/volumes?{urlencode(params)}"
            )
        except ProviderRequestError:
            return []
        items = payload.get("items", [])
        if not isinstance(items, list):
            return []
        return [
            self._google_books_match(item, media_type=media_type, confidence=0.82)
            for item in items
            if isinstance(item, dict)
        ]

    def _fetch_google_books(self, provider_item_id: str, media_type: str) -> ExternalMediaMatch:
        volume_id = provider_item_id.split(":", maxsplit=1)[-1]
        params = {"key": self.google_books_api_key} if self.google_books_api_key else {}
        payload = _json_request(
            f"https://www.googleapis.com/books/v1/volumes/{quote_plus(volume_id)}?{urlencode(params)}"
        )
        return self._google_books_match(payload, media_type=media_type, confidence=0.92)

    def _google_books_match(
        self,
        item: dict[str, Any],
        *,
        media_type: str,
        confidence: float,
    ) -> ExternalMediaMatch:
        volume = item.get("volumeInfo") if isinstance(item.get("volumeInfo"), dict) else {}
        authors = volume.get("authors") if isinstance(volume.get("authors"), list) else []
        image_links = volume.get("imageLinks") if isinstance(volume.get("imageLinks"), dict) else {}
        volume_id = str(item.get("id") or "")
        return ExternalMediaMatch(
            provider=self.provider_name,
            provider_item_id=f"google_books:{volume_id}",
            media_type=media_type,
            title=_clean_text(volume.get("title")) or "Untitled book",
            original_title=_clean_text(volume.get("title")),
            description=_clean_text(volume.get("description")),
            release_year=_year_from_date(volume.get("publishedDate")),
            creator=", ".join(_clean_text(author) for author in authors if author),
            image_url=str(image_links.get("thumbnail") or image_links.get("smallThumbnail") or ""),
            external_rating=_float_or_none(volume.get("averageRating")),
            external_popularity=_scale_popularity(volume.get("ratingsCount"), divisor=100),
            confidence=confidence,
            source_url=str(volume.get("canonicalVolumeLink") or volume.get("infoLink") or ""),
            raw_payload={
                "sourceProvider": "google_books",
                "googleBooksId": volume_id,
                "industryIdentifiers": volume.get("industryIdentifiers"),
                "raw": item,
            },
        )

    def _search_open_library(self, query: str, media_type: str) -> list[ExternalMediaMatch]:
        params = {
            "q": query,
            "limit": 8,
            "fields": (
                "key,title,author_name,first_publish_year,cover_i,ratings_average,edition_key"
            ),
        }
        try:
            payload = _json_request(f"https://openlibrary.org/search.json?{urlencode(params)}")
        except ProviderRequestError:
            return []
        docs = payload.get("docs", [])
        if not isinstance(docs, list):
            return []
        return [
            self._open_library_match(item, media_type=media_type, confidence=0.74)
            for item in docs
            if isinstance(item, dict)
        ]

    def _fetch_open_library(self, provider_item_id: str, media_type: str) -> ExternalMediaMatch:
        work_key = provider_item_id.split(":", maxsplit=1)[-1]
        payload = _json_request(f"https://openlibrary.org{work_key}.json")
        return self._open_library_match(payload, media_type=media_type, confidence=0.88)

    def _open_library_match(
        self,
        item: dict[str, Any],
        *,
        media_type: str,
        confidence: float,
    ) -> ExternalMediaMatch:
        key = str(item.get("key") or "")
        authors = item.get("author_name") if isinstance(item.get("author_name"), list) else []
        cover_id = item.get("cover_i")
        description = item.get("description")
        if isinstance(description, dict):
            description = description.get("value")
        return ExternalMediaMatch(
            provider=self.provider_name,
            provider_item_id=f"open_library:{key}",
            media_type=media_type,
            title=_clean_text(item.get("title")) or "Untitled book",
            original_title=_clean_text(item.get("title")),
            description=_clean_text(description),
            release_year=(
                item.get("first_publish_year")
                if isinstance(item.get("first_publish_year"), int)
                else None
            ),
            creator=", ".join(_clean_text(author) for author in authors if author),
            image_url=f"https://covers.openlibrary.org/b/id/{cover_id}-L.jpg" if cover_id else "",
            external_rating=_float_or_none(item.get("ratings_average")),
            external_popularity=None,
            confidence=confidence,
            source_url=f"https://openlibrary.org{key}" if key else "",
            raw_payload={"sourceProvider": "open_library", "openLibraryKey": key, "raw": item},
        )


class AudiobookProvider(BookProvider, AudiobookPlaceholderProvider):
    provider_name = ExternalMetadata.ExternalProvider.AUDIOBOOK
    supported_media_types = (MediaItem.MediaType.AUDIOBOOK,)
    provider_label = "Google Books/Open Library audiobook"
    default_media_type = MediaItem.MediaType.AUDIOBOOK

    def search(self, query: str, media_type: str | None = None) -> list[ExternalMediaMatch]:
        if not _provider_network_enabled():
            return AudiobookPlaceholderProvider.search(self, query, media_type)
        if media_type not in {None, "", MediaItem.MediaType.AUDIOBOOK}:
            return []
        matches = self._search_google_books(f"{query} audiobook", MediaItem.MediaType.AUDIOBOOK)
        matches.extend(self._search_open_library(query, MediaItem.MediaType.AUDIOBOOK))
        return matches or AudiobookPlaceholderProvider.search(self, query, media_type)

    def fetch_details(self, provider_item_id: str) -> ExternalMediaMatch:
        if provider_item_id.startswith("google_books:"):
            return self._fetch_google_books(provider_item_id, MediaItem.MediaType.AUDIOBOOK)
        if provider_item_id.startswith("open_library:"):
            return self._fetch_open_library(provider_item_id, MediaItem.MediaType.AUDIOBOOK)
        return AudiobookPlaceholderProvider.fetch_details(self, provider_item_id)


PROVIDERS: tuple[MetadataProvider, ...] = (
    MovieTvProvider(),
    AnimeProvider(),
    BookProvider(),
    AudiobookProvider(),
)

PROVIDERS_BY_NAME = {provider.provider_name: provider for provider in PROVIDERS}


def get_provider(provider_name: str) -> MetadataProvider:
    try:
        return PROVIDERS_BY_NAME[provider_name]
    except KeyError as exc:
        raise ValueError(f"Unsupported metadata provider: {provider_name}") from exc


def providers_for_media_type(media_type: str | None = None) -> list[MetadataProvider]:
    if not media_type:
        return list(PROVIDERS)
    return [provider for provider in PROVIDERS if media_type in provider.supported_media_types]


def provider_capabilities() -> list[ProviderCapability]:
    network_enabled = _provider_network_enabled()
    tmdb_configured = bool(
        os.environ.get("TMDB_READ_ACCESS_TOKEN", "").strip()
        or os.environ.get("TMDB_API_KEY", "").strip()
    )
    omdb_configured = bool(os.environ.get("OMDB_API_KEY", "").strip())
    google_books_configured = bool(os.environ.get("GOOGLE_BOOKS_API_KEY", "").strip())
    return [
        ProviderCapability(
            provider=ExternalMetadata.ExternalProvider.MOVIE_TV,
            label="Movie/TV metadata",
            lookup_supported=True,
            lookup_configured=network_enabled and (tmdb_configured or omdb_configured),
            account_import_supported=False,
            export_upload_supported=False,
            source_providers=tuple(
                source
                for source, configured in (
                    ("tmdb", tmdb_configured),
                    ("omdb", omdb_configured),
                )
                if configured
            ),
            notes="TMDb is primary for movie/TV search. OMDb is IMDb ID/title fallback only.",
        ),
        ProviderCapability(
            provider=ExternalMetadata.ExternalProvider.ANIME,
            label="Anime metadata",
            lookup_supported=True,
            lookup_configured=network_enabled,
            account_import_supported=False,
            export_upload_supported=False,
            source_providers=("anilist",) if network_enabled else (),
            notes=(
                "AniList public GraphQL search does not require a key. "
                "Account import is a later OAuth feature."
            ),
        ),
        ProviderCapability(
            provider=ExternalMetadata.ExternalProvider.BOOK,
            label="Book metadata",
            lookup_supported=True,
            lookup_configured=network_enabled,
            account_import_supported=False,
            export_upload_supported=False,
            source_providers=(("google_books",) if google_books_configured else ())
            + (("open_library",) if network_enabled else ()),
            notes="Google Books is used when configured. Open Library remains the no-key fallback.",
        ),
        ProviderCapability(
            provider=ExternalMetadata.ExternalProvider.AUDIOBOOK,
            label="Audiobook metadata",
            lookup_supported=True,
            lookup_configured=network_enabled,
            account_import_supported=False,
            export_upload_supported=False,
            source_providers=(("google_books",) if google_books_configured else ())
            + (("open_library",) if network_enabled else ()),
            notes=(
                "Audiobook lookup reuses book providers and preserves the "
                "CanonOS audiobook media type."
            ),
        ),
    ]
