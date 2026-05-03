from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from canonos.media.models import MediaItem


@dataclass(frozen=True)
class NarrativeProviderResult:
    character_complexity_score: int
    plot_complexity_score: int
    pacing_density_score: int
    thematic_weight_score: int
    moral_ambiguity_score: int
    atmosphere_score: int
    ending_dependency_score: int
    trope_freshness_score: int
    confidence_score: int
    analysis_summary: str
    extracted_traits: list[dict[str, object]]
    evidence_notes: str
    source_basis: str


class NarrativeAnalysisProvider(Protocol):
    key: str

    def analyze(self, *, media_item: MediaItem, notes: str) -> NarrativeProviderResult:
        """Return Narrative DNA from allowed user notes/metadata, not full copyrighted text."""


TRAIT_DEFINITIONS: dict[str, dict[str, str]] = {
    "character_complexity": {
        "label": "Character complexity",
        "description": "Interior life, agency, contradictions, and arc depth.",
    },
    "plot_complexity": {
        "label": "Plot complexity",
        "description": "Structural intricacy, mystery, causality, and nonlinear movement.",
    },
    "pacing_density": {
        "label": "Pacing density",
        "description": "How much narrative, scene, or idea movement is packed into the work.",
    },
    "thematic_weight": {
        "label": "Thematic weight",
        "description": "The intensity and persistence of themes beyond surface genre.",
    },
    "moral_ambiguity": {
        "label": "Moral ambiguity",
        "description": "Ethical grayness, unresolved choices, and refusal of easy answers.",
    },
    "atmosphere": {
        "label": "Atmosphere",
        "description": "Mood, sensory identity, place-feel, and emotional weather.",
    },
    "ending_dependency": {
        "label": "Ending dependency",
        "description": "How much the work depends on its ending, twist, or final payoff.",
    },
    "trope_freshness": {
        "label": "Trope freshness",
        "description": "Originality and resistance to formula, cliché, or obvious genre defaults.",
    },
}


class LocalHeuristicNarrativeProvider:
    key = "local_heuristic"

    def analyze(self, *, media_item: MediaItem, notes: str) -> NarrativeProviderResult:
        text = " ".join(
            [
                media_item.title,
                media_item.original_title,
                media_item.creator,
                media_item.country_language,
                media_item.get_media_type_display(),
                media_item.notes,
                notes,
            ]
        ).lower()
        release_hint = (
            0 if media_item.release_year is None else _release_year_hint(media_item.release_year)
        )
        character = _score_keywords(
            text,
            base=48,
            positive={
                "character": 12,
                "arc": 10,
                "agency": 10,
                "interiority": 14,
                "psychological": 12,
                "identity": 10,
                "contradiction": 9,
                "ensemble": 7,
                "relationship": 7,
            },
            negative={"flat character": 18, "weak character": 18, "cardboard": 16},
        )
        plot = _score_keywords(
            text,
            base=45,
            positive={
                "nonlinear": 14,
                "mystery": 9,
                "twist": 8,
                "layered": 11,
                "structure": 8,
                "political": 8,
                "intrigue": 9,
                "fragmented": 12,
                "puzzle": 10,
            },
            negative={"simple plot": 14, "predictable": 12, "thin plot": 16},
        )
        pacing = _score_keywords(
            text,
            base=46,
            positive={
                "dense": 15,
                "propulsive": 13,
                "fast": 9,
                "packed": 11,
                "relentless": 10,
                "compressed": 10,
                "tight": 8,
                "no filler": 8,
            },
            negative={"slow": 8, "patient": 6, "meditative": 7, "filler": 18, "meandering": 12},
        )
        theme = _score_keywords(
            text,
            base=50,
            positive={
                "theme": 10,
                "grief": 10,
                "memory": 9,
                "identity": 8,
                "faith": 8,
                "meaning": 9,
                "political": 8,
                "spiritual": 11,
                "trauma": 8,
                "alienation": 8,
                "class": 7,
            },
            negative={"shallow": 15, "surface": 10},
        )
        moral = _score_keywords(
            text,
            base=42,
            positive={
                "ambiguous": 14,
                "ambiguity": 14,
                "moral": 9,
                "ethical": 9,
                "complicit": 12,
                "gray": 10,
                "grey": 10,
                "unresolved": 10,
                "dilemma": 9,
            },
            negative={"black and white": 18, "simple morality": 14},
        )
        atmosphere = _score_keywords(
            text,
            base=50,
            positive={
                "atmosphere": 16,
                "atmospheric": 16,
                "mood": 10,
                "haunting": 12,
                "surreal": 12,
                "quiet": 7,
                "sensory": 9,
                "place": 6,
                "dream": 8,
                "melancholy": 8,
            },
            negative={"bland": 14, "generic look": 12},
        )
        ending = _score_keywords(
            text,
            base=36,
            positive={
                "ending": 12,
                "finale": 11,
                "payoff": 10,
                "reveal": 9,
                "twist": 12,
                "closure": 9,
                "ambiguous ending": 12,
                "last act": 9,
            },
            negative={"episodic": 8, "slice of life": 8, "open-ended": 4},
        )
        trope = _score_keywords(
            text,
            base=55 + release_hint,
            positive={
                "original": 12,
                "fresh": 10,
                "strange": 10,
                "weird": 10,
                "singular": 12,
                "authorial": 11,
                "unusual": 8,
                "experimental": 12,
                "distinctive": 10,
            },
            negative={
                "generic": 18,
                "formula": 14,
                "formulaic": 15,
                "cliche": 14,
                "cliched": 14,
                "tropey": 12,
                "trend": 10,
            },
        )
        confidence = _confidence(text=text, notes=notes, media_item=media_item)
        scores = {
            "character_complexity": character,
            "plot_complexity": plot,
            "pacing_density": pacing,
            "thematic_weight": theme,
            "moral_ambiguity": moral,
            "atmosphere": atmosphere,
            "ending_dependency": ending,
            "trope_freshness": trope,
        }
        traits = [_trait_payload(key, score, text, confidence) for key, score in scores.items()]
        strongest = sorted(traits, key=lambda item: int(item["score"]), reverse=True)[:3]
        summary = _summary(media_item, strongest, confidence)
        return NarrativeProviderResult(
            character_complexity_score=character,
            plot_complexity_score=plot,
            pacing_density_score=pacing,
            thematic_weight_score=theme,
            moral_ambiguity_score=moral,
            atmosphere_score=atmosphere,
            ending_dependency_score=ending,
            trope_freshness_score=trope,
            confidence_score=confidence,
            analysis_summary=summary,
            extracted_traits=traits,
            evidence_notes=_evidence_notes(
                media_item=media_item,
                notes=notes,
                confidence=confidence,
            ),
            source_basis=_source_basis(media_item=media_item, notes=notes),
        )


class DisabledExternalNarrativeProvider:
    key = "external_ai"

    def analyze(self, *, media_item: MediaItem, notes: str) -> NarrativeProviderResult:
        raise RuntimeError("External narrative provider is not configured for this environment.")


def get_narrative_provider(provider_key: str | None = None) -> NarrativeAnalysisProvider:
    if provider_key == "external_ai":
        return DisabledExternalNarrativeProvider()
    return LocalHeuristicNarrativeProvider()


def _score_keywords(
    text: str,
    *,
    base: int,
    positive: dict[str, int],
    negative: dict[str, int],
) -> int:
    score = base
    for keyword, weight in positive.items():
        if keyword in text:
            score += weight
    for keyword, weight in negative.items():
        if keyword in text:
            score -= weight
    return _clamp(score)


def _confidence(*, text: str, notes: str, media_item: MediaItem) -> int:
    score = 28
    if notes.strip():
        score += min(len(notes.strip()) // 12, 32)
    if media_item.notes.strip():
        score += min(len(media_item.notes.strip()) // 16, 20)
    if media_item.release_year:
        score += 5
    if media_item.creator.strip():
        score += 5
    if any(keyword in text for keyword in ("theme", "character", "atmosphere", "ending")):
        score += 8
    return _clamp(score)


def _release_year_hint(year: int) -> int:
    if year < 1980:
        return 4
    if year >= 2018:
        return -4
    return 0


def _trait_payload(key: str, score: int, text: str, confidence: int) -> dict[str, object]:
    definition = TRAIT_DEFINITIONS[key]
    evidence = _trait_evidence(key, text, score)
    return {
        "key": key,
        "label": definition["label"],
        "description": definition["description"],
        "score": score,
        "confidenceScore": confidence,
        "evidence": evidence,
        "source": "user_notes_metadata_heuristic",
    }


def _trait_evidence(key: str, text: str, score: int) -> str:
    label = TRAIT_DEFINITIONS[key]["label"]
    if score >= 75:
        return f"{label} is strongly indicated by the available notes and metadata."
    if score >= 55:
        return f"{label} has moderate support in the available notes and metadata."
    if score <= 35:
        return f"{label} appears limited or under-evidenced from the available notes."
    if any(keyword in text for keyword in ("unknown", "no notes", "unsure")):
        return f"{label} is tentative because the available evidence is sparse."
    return f"{label} is currently a neutral estimate from limited allowed evidence."


def _summary(
    media_item: MediaItem,
    strongest: list[dict[str, object]],
    confidence: int,
) -> str:
    labels = ", ".join(str(trait["label"]).lower() for trait in strongest)
    return (
        f"{media_item.title} currently reads strongest on {labels}. "
        f"This is a {confidence}/100 confidence Narrative DNA estimate from user-owned "
        "notes and metadata, not full-source textual analysis."
    )


def _evidence_notes(*, media_item: MediaItem, notes: str, confidence: int) -> str:
    sources: list[str] = []
    if media_item.notes.strip():
        sources.append("saved media notes")
    if notes.strip():
        sources.append("manual analysis notes")
    sources.extend(["title", "media type"])
    if media_item.creator.strip():
        sources.append("creator")
    if media_item.release_year:
        sources.append("release year")
    return (
        f"Basis: {', '.join(sources)}. Confidence {confidence}/100. "
        "CanonOS did not ingest or store full copyrighted source text for this analysis."
    )


def _source_basis(*, media_item: MediaItem, notes: str) -> str:
    has_notes = bool(notes.strip())
    has_media_notes = bool(media_item.notes.strip())
    if has_notes and has_media_notes:
        return "mixed_notes_metadata"
    if has_notes:
        return "manual_analysis"
    if has_media_notes:
        return "user_notes"
    return "metadata"


def _clamp(value: int, minimum: int = 0, maximum: int = 100) -> int:
    return max(minimum, min(maximum, value))
