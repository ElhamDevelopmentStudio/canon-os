from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol
from urllib.parse import quote_plus

from canonos.media.models import MediaItem
from canonos.metadata.models import ExternalMetadata


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


PROVIDERS: tuple[MetadataProvider, ...] = (
    MovieTvPlaceholderProvider(),
    AnimePlaceholderProvider(),
    BookPlaceholderProvider(),
    AudiobookPlaceholderProvider(),
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
