# Metadata Provider Adapter Contract

CanonOS treats external metadata as optional enrichment. Manual entry stays fully usable when a provider is disabled, unavailable, incomplete, or wrong.

Provider search and account imports are separate capabilities. A provider may support metadata lookup without supporting user-library import.

- TMDb is the first movie/TV search adapter and may support account-based imports when user authentication and provider terms allow it.
- OMDb is a lookup fallback for IMDb ID/title metadata and is not treated as an account-integration provider.
- Trakt is the preferred movie/TV account import candidate for watched history, ratings, watchlists, and lists when the user connects an account.
- AniList is the preferred anime/manga account import candidate when the user connects an account or provides an export.
- Open Library or Google Books should support book/audiobook lookup; account import depends on available export/API support.
- IMDb, Letterboxd, and any other platform that does not expose allowed account APIs should be supported through guided export-and-upload flows where practical.

## Privacy rules

- Search requests send only the user-entered query, selected media type, and optional provider name.
- User notes, personal ratings, queue state, aftertaste, and taste scores must not be sent to metadata providers.
- Provider payloads are stored separately from canonical user data so refreshes never overwrite personal judgment.
- Account imports and uploaded exports must pass through preview, duplicate detection, and explicit confirmation before writing library data.

## Backend adapter interface

Every metadata provider implements this shape:

```python
class MetadataProvider:
    provider_name: ExternalProvider
    supported_media_types: tuple[str, ...]

    def search(self, query: str, media_type: str | None = None) -> list[ExternalMediaMatch]: ...
    def fetch_details(self, provider_item_id: str) -> ExternalMediaMatch: ...
```

Adapters return normalized `ExternalMediaMatch` records. Backend services may attach a match to a `MediaItem` as an `ExternalMetadata` snapshot, then refresh it later through the same provider.

## Future provider rule

Adding a real provider requires:

1. Add provider enum/type support in `packages/contracts/src/metadata.ts` if needed.
2. Implement the adapter under `canonos.metadata.providers`.
3. Add backend provider tests with mocked external responses.
4. Add browser e2e coverage for search, attach, and refresh through the Media UI.
5. Document whether the provider supports lookup, account import, export upload, or some combination of those modes.
6. Document any API-only exception if a provider has no user-facing flow yet.

## Export upload fallback

When a platform cannot be connected directly, the frontend should show a concise tutorial for exporting data from that platform and route the uploaded file through the standard import preview flow. Import parsers should be provider-specific, version-aware where possible, and conservative: unknown columns or unsupported JSON shapes should produce preview warnings or errors instead of silent data loss.
