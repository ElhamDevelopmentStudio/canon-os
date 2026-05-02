# Metadata Provider Adapter Contract

CanonOS treats external metadata as optional enrichment. Manual entry stays fully usable when a provider is disabled, unavailable, incomplete, or wrong.

## Privacy rules

- Search requests send only the user-entered query, selected media type, and optional provider name.
- User notes, personal ratings, queue state, aftertaste, and taste scores must not be sent to metadata providers.
- Provider payloads are stored separately from canonical user data so refreshes never overwrite personal judgment.

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
5. Document any API-only exception if a provider has no user-facing flow yet.
