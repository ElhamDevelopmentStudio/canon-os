from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from django.contrib.auth.models import User
from django.db.models import Avg, Count
from django.utils import timezone

from canonos.candidates.models import Candidate
from canonos.media.models import MediaItem

MEDIA_TYPES = [choice[0] for choice in MediaItem.MediaType.choices]
ERA_BUCKETS = ["pre_1970", "1970s_1990s", "2000s", "modern_exception"]


@dataclass(frozen=True)
class DiscoverySeed:
    title: str
    media_type: str
    release_year: int | None
    country_language: str
    creator: str
    premise: str
    themes: tuple[str, ...]
    narrative_patterns: tuple[str, ...]
    estimated_time_minutes: int | None
    base_obscurity: int


@dataclass(frozen=True)
class DiscoverySearch:
    mode: str = "deep_cut"
    theme: str = ""
    mood: str = ""
    era: str = ""
    country_language: str = ""
    media_type: str = ""
    creator: str = ""
    narrative_pattern: str = ""
    favorite_work: str = ""
    source_media_item_id: str | None = None


@dataclass(frozen=True)
class DiscoveryAnalysis:
    underexplored_media_types: list[str]
    underexplored_eras: list[str]
    underexplored_country_languages: list[str]
    strongest_media_types: list[str]
    source_title: str | None


CATALOG: tuple[DiscoverySeed, ...] = (
    DiscoverySeed(
        title="Woman in the Dunes",
        media_type=MediaItem.MediaType.MOVIE,
        release_year=1964,
        country_language="Japan / Japanese",
        creator="Hiroshi Teshigahara",
        premise=(
            "A schoolteacher is trapped with a widow in a sand pit, turning survival into "
            "existential ritual."
        ),
        themes=("identity", "isolation", "existential", "psychological", "ritual"),
        narrative_patterns=("contained pressure cooker", "identity erosion", "surreal realism"),
        estimated_time_minutes=147,
        base_obscurity=78,
    ),
    DiscoverySeed(
        title="The Face of Another",
        media_type=MediaItem.MediaType.MOVIE,
        release_year=1966,
        country_language="Japan / Japanese",
        creator="Hiroshi Teshigahara",
        premise=(
            "A disfigured man receives a lifelike mask and tests whether identity survives "
            "a new face."
        ),
        themes=("identity", "alienation", "modernity", "psychological"),
        narrative_patterns=("identity fracture", "ethical experiment", "urban alienation"),
        estimated_time_minutes=124,
        base_obscurity=74,
    ),
    DiscoverySeed(
        title="A Page of Madness",
        media_type=MediaItem.MediaType.MOVIE,
        release_year=1926,
        country_language="Japan / Japanese",
        creator="Teinosuke Kinugasa",
        premise=(
            "Silent avant-garde cinema turns an asylum into a subjective storm of guilt and "
            "memory."
        ),
        themes=("madness", "memory", "silent cinema", "guilt"),
        narrative_patterns=(
            "fragmented subjectivity",
            "silent expressionism",
            "psychological maze",
        ),
        estimated_time_minutes=71,
        base_obscurity=88,
    ),
    DiscoverySeed(
        title="The Saragossa Manuscript",
        media_type=MediaItem.MediaType.MOVIE,
        release_year=1965,
        country_language="Poland / Polish",
        creator="Wojciech Has",
        premise=(
            "Nested stories, trickster encounters, and occult detours form a labyrinth of "
            "belief and appetite."
        ),
        themes=("labyrinth", "folklore", "occult", "identity", "storytelling"),
        narrative_patterns=("nested stories", "picaresque maze", "unreliable reality"),
        estimated_time_minutes=182,
        base_obscurity=82,
    ),
    DiscoverySeed(
        title="The Cremator",
        media_type=MediaItem.MediaType.MOVIE,
        release_year=1969,
        country_language="Czech Republic / Czech",
        creator="Juraj Herz",
        premise=(
            "A polite crematorium worker slides from bourgeois ritual into fascist "
            "self-mythology."
        ),
        themes=("moral decay", "fascism", "ritual", "satire", "horror"),
        narrative_patterns=("unreliable protagonist", "moral descent", "grotesque satire"),
        estimated_time_minutes=95,
        base_obscurity=80,
    ),
    DiscoverySeed(
        title="The Spirit of the Beehive",
        media_type=MediaItem.MediaType.MOVIE,
        release_year=1973,
        country_language="Spain / Spanish",
        creator="Víctor Erice",
        premise=(
            "A child processes cinema, silence, and postwar dread through one haunting "
            "village mystery."
        ),
        themes=("childhood", "memory", "postwar", "cinema", "silence"),
        narrative_patterns=("child perspective", "quiet mystery", "political afterimage"),
        estimated_time_minutes=98,
        base_obscurity=72,
    ),
    DiscoverySeed(
        title="Dekalog",
        media_type=MediaItem.MediaType.TV_SHOW,
        release_year=1989,
        country_language="Poland / Polish",
        creator="Krzysztof Kieślowski",
        premise=(
            "Ten intimate moral puzzles turn apartment-block lives into spiritual pressure "
            "tests."
        ),
        themes=("morality", "faith", "ordinary life", "consequence", "ethics"),
        narrative_patterns=("anthology", "moral dilemma", "quiet tragedy"),
        estimated_time_minutes=570,
        base_obscurity=70,
    ),
    DiscoverySeed(
        title="The Singing Detective",
        media_type=MediaItem.MediaType.TV_SHOW,
        release_year=1986,
        country_language="United Kingdom / English",
        creator="Dennis Potter",
        premise=(
            "A bedridden writer remixes noir, memory, illness, and music into one unstable "
            "confession."
        ),
        themes=("memory", "illness", "noir", "identity", "music"),
        narrative_patterns=("nested fiction", "memory collage", "unreliable narrator"),
        estimated_time_minutes=415,
        base_obscurity=76,
    ),
    DiscoverySeed(
        title="The Prisoner",
        media_type=MediaItem.MediaType.TV_SHOW,
        release_year=1967,
        country_language="United Kingdom / English",
        creator="Patrick McGoohan",
        premise=(
            "A former spy is trapped in a surreal village that weaponizes comfort, "
            "surveillance, and identity."
        ),
        themes=("surveillance", "identity", "autonomy", "absurdity"),
        narrative_patterns=("paranoid allegory", "episodic puzzle", "symbolic captivity"),
        estimated_time_minutes=850,
        base_obscurity=68,
    ),
    DiscoverySeed(
        title="Angel's Egg",
        media_type=MediaItem.MediaType.ANIME,
        release_year=1985,
        country_language="Japan / Japanese",
        creator="Mamoru Oshii",
        premise=(
            "A girl carrying an egg crosses a drowned world of fossils, soldiers, faith, "
            "and silence."
        ),
        themes=("faith", "silence", "ruins", "symbolism", "dream"),
        narrative_patterns=("minimal dialogue", "symbolic quest", "post-apocalyptic dream"),
        estimated_time_minutes=71,
        base_obscurity=83,
    ),
    DiscoverySeed(
        title="Kaiba",
        media_type=MediaItem.MediaType.ANIME,
        release_year=2008,
        country_language="Japan / Japanese",
        creator="Masaaki Yuasa",
        premise=(
            "Memory can be bought, sold, and moved between bodies in a bright world with a "
            "devastated soul."
        ),
        themes=("memory", "identity", "class", "body", "love"),
        narrative_patterns=("body swapping", "memory economy", "soft-looking dystopia"),
        estimated_time_minutes=300,
        base_obscurity=76,
    ),
    DiscoverySeed(
        title="The Wolf House",
        media_type=MediaItem.MediaType.MOVIE,
        release_year=2018,
        country_language="Chile / Spanish, German",
        creator="Cristóbal León and Joaquín Cociña",
        premise=(
            "A stop-motion nightmare turns an isolated colony, fairy-tale refuge, and "
            "political dread into a shifting house of memory."
        ),
        themes=("memory", "identity", "cult", "fairy tale", "psychological"),
        narrative_patterns=("unstable reality", "animated nightmare", "subjective captivity"),
        estimated_time_minutes=75,
        base_obscurity=86,
    ),
    DiscoverySeed(
        title="Possessor",
        media_type=MediaItem.MediaType.MOVIE,
        release_year=2020,
        country_language="Canada / English",
        creator="Brandon Cronenberg",
        premise=(
            "An assassin hijacks other people's bodies until the boundary between host, "
            "handler, and self begins to collapse."
        ),
        themes=("identity", "body", "violence", "technology", "alienation"),
        narrative_patterns=("identity fracture", "body invasion", "corporate nightmare"),
        estimated_time_minutes=103,
        base_obscurity=70,
    ),
    DiscoverySeed(
        title="Beyond the Infinite Two Minutes",
        media_type=MediaItem.MediaType.MOVIE,
        release_year=2020,
        country_language="Japan / Japanese",
        creator="Kanta Yamaguchi",
        premise=(
            "A cafe monitor looks two minutes into the future, turning a tiny time loop "
            "into a precise comic puzzle."
        ),
        themes=("time", "loop", "choice", "absurdity", "constraint"),
        narrative_patterns=("time-loop puzzle", "single-location escalation", "formal constraint"),
        estimated_time_minutes=70,
        base_obscurity=75,
    ),
    DiscoverySeed(
        title="We're All Going to the World's Fair",
        media_type=MediaItem.MediaType.MOVIE,
        release_year=2021,
        country_language="United States / English",
        creator="Jane Schoenbrun",
        premise=(
            "An isolated teenager enters an online horror challenge where performance, "
            "identity, and dissociation blur."
        ),
        themes=("identity", "internet", "dissociation", "loneliness", "performance"),
        narrative_patterns=("unreliable identity", "screenlife drift", "ambiguous transformation"),
        estimated_time_minutes=86,
        base_obscurity=73,
    ),
    DiscoverySeed(
        title="Skinamarink",
        media_type=MediaItem.MediaType.MOVIE,
        release_year=2022,
        country_language="Canada / English",
        creator="Kyle Edward Ball",
        premise=(
            "Two children wake to a house without doors or parents, where fear becomes "
            "architecture and time loses shape."
        ),
        themes=("childhood", "fear", "home", "dream", "absence"),
        narrative_patterns=("liminal horror", "fragmented perception", "ambient nightmare"),
        estimated_time_minutes=100,
        base_obscurity=78,
    ),
    DiscoverySeed(
        title="Mars Express",
        media_type=MediaItem.MediaType.MOVIE,
        release_year=2023,
        country_language="France / French",
        creator="Jérémie Périn",
        premise=(
            "A detective story on Mars uses android autonomy, memory, and labor politics "
            "as a sleek philosophical machine."
        ),
        themes=("identity", "memory", "technology", "autonomy", "conspiracy"),
        narrative_patterns=("future noir", "synthetic identity", "investigation spiral"),
        estimated_time_minutes=89,
        base_obscurity=72,
    ),
    DiscoverySeed(
        title="Texhnolyze",
        media_type=MediaItem.MediaType.ANIME,
        release_year=2003,
        country_language="Japan / Japanese",
        creator="Yasuyuki Ueda",
        premise=(
            "A dying underground city turns body modification, factional violence, and "
            "despair into slow apocalypse."
        ),
        themes=("nihilism", "body", "decay", "urban", "violence"),
        narrative_patterns=("slow apocalypse", "minimalist dystopia", "faction collapse"),
        estimated_time_minutes=550,
        base_obscurity=79,
    ),
    DiscoverySeed(
        title="The Invention of Morel",
        media_type=MediaItem.MediaType.NOVEL,
        release_year=1940,
        country_language="Argentina / Spanish",
        creator="Adolfo Bioy Casares",
        premise=(
            "A fugitive on an island falls for a woman caught inside a machine that may "
            "have defeated time."
        ),
        themes=("memory", "obsession", "time", "island", "image"),
        narrative_patterns=("metaphysical mystery", "island trap", "ontological twist"),
        estimated_time_minutes=220,
        base_obscurity=77,
    ),
    DiscoverySeed(
        title="The Tartar Steppe",
        media_type=MediaItem.MediaType.NOVEL,
        release_year=1940,
        country_language="Italy / Italian",
        creator="Dino Buzzati",
        premise="A soldier waits at a remote fortress until anticipation becomes his entire life.",
        themes=("waiting", "meaning", "time", "military", "regret"),
        narrative_patterns=("existential waiting", "life as delay", "fortress allegory"),
        estimated_time_minutes=360,
        base_obscurity=74,
    ),
    DiscoverySeed(
        title="Ice",
        media_type=MediaItem.MediaType.NOVEL,
        release_year=1967,
        country_language="United Kingdom / English",
        creator="Anna Kavan",
        premise=(
            "A nameless pursuit crosses a freezing world where obsession and apocalypse "
            "blur together."
        ),
        themes=("obsession", "apocalypse", "dream", "cold", "alienation"),
        narrative_patterns=("dream logic", "pursuit spiral", "climate nightmare"),
        estimated_time_minutes=260,
        base_obscurity=78,
    ),
    DiscoverySeed(
        title="Roadside Picnic",
        media_type=MediaItem.MediaType.NOVEL,
        release_year=1972,
        country_language="Soviet Union / Russian",
        creator="Arkady and Boris Strugatsky",
        premise=(
            "Alien visitation leaves behind zones of dangerous trash, human greed, and "
            "impossible longing."
        ),
        themes=("zone", "alienation", "moral compromise", "science fiction"),
        narrative_patterns=("zone expedition", "artifact economy", "wish with cost"),
        estimated_time_minutes=300,
        base_obscurity=68,
    ),
    DiscoverySeed(
        title="Solaris audiobook",
        media_type=MediaItem.MediaType.AUDIOBOOK,
        release_year=1961,
        country_language="Poland / Polish",
        creator="Stanisław Lem",
        premise=(
            "An ocean planet forces scientists to confront embodied memories rather than "
            "solve a puzzle."
        ),
        themes=("memory", "grief", "alien", "knowledge", "guilt"),
        narrative_patterns=("first contact inward", "haunting return", "epistemic limit"),
        estimated_time_minutes=510,
        base_obscurity=66,
    ),
    DiscoverySeed(
        title="The King of Elfland's Daughter audiobook",
        media_type=MediaItem.MediaType.AUDIOBOOK,
        release_year=1924,
        country_language="Ireland / English",
        creator="Lord Dunsany",
        premise=(
            "A border between mundane village life and elfland turns longing into mythic "
            "consequence."
        ),
        themes=("myth", "longing", "threshold", "fantasy", "time"),
        narrative_patterns=("mythic quest", "fairy border", "enchanted consequence"),
        estimated_time_minutes=420,
        base_obscurity=82,
    ),
    DiscoverySeed(
        title="I Who Have Never Known Men audiobook",
        media_type=MediaItem.MediaType.AUDIOBOOK,
        release_year=1995,
        country_language="Belgium / French",
        creator="Jacqueline Harpman",
        premise=(
            "Women escape an underground cage into a world where survival may not come with "
            "explanation."
        ),
        themes=("existence", "captivity", "memory", "freedom", "mystery"),
        narrative_patterns=(
            "post-catastrophe unknown",
            "philosophical survival",
            "withheld explanation",
        ),
        estimated_time_minutes=420,
        base_obscurity=72,
    ),
)


def build_search(payload: dict[str, Any]) -> DiscoverySearch:
    return DiscoverySearch(
        mode=payload.get("mode") or "deep_cut",
        theme=(payload.get("theme") or "").strip(),
        mood=(payload.get("mood") or "").strip(),
        era=payload.get("era") or "",
        country_language=(payload.get("country_language") or "").strip(),
        media_type=payload.get("media_type") or "",
        creator=(payload.get("creator") or "").strip(),
        narrative_pattern=(payload.get("narrative_pattern") or "").strip(),
        favorite_work=(payload.get("favorite_work") or "").strip(),
        source_media_item_id=str(payload["source_media_item_id"])
        if payload.get("source_media_item_id")
        else None,
    )


def detect_underexplored_media_types(user: User) -> list[str]:
    counts = {
        row["media_type"]: row["count"]
        for row in MediaItem.objects.filter(owner=user)
        .values("media_type")
        .annotate(count=Count("id"))
    }
    if not counts:
        return list(MEDIA_TYPES)
    max_count = max(counts.values())
    threshold = max(1, round(max_count * 0.4))
    return [media_type for media_type in MEDIA_TYPES if counts.get(media_type, 0) <= threshold]


def detect_underexplored_eras(user: User) -> list[str]:
    counts = {era: 0 for era in ERA_BUCKETS}
    for release_year in MediaItem.objects.filter(
        owner=user, release_year__isnull=False
    ).values_list("release_year", flat=True):
        counts[_era_for_year(release_year)] += 1
    if not any(counts.values()):
        return list(ERA_BUCKETS)
    return [era for era, count in counts.items() if count <= 1]


def detect_underexplored_country_languages(user: User) -> list[str]:
    values = [
        value.strip()
        for value in MediaItem.objects.filter(owner=user)
        .exclude(country_language="")
        .values_list("country_language", flat=True)
    ]
    catalog_regions = sorted({seed.country_language for seed in CATALOG})
    if not values:
        return catalog_regions[:6]
    known_tokens = " ".join(values).casefold()
    return [region for region in catalog_regions if not _tokens(region) & _tokens(known_tokens)][:6]


def generate_discovery_trail(user: User, search: DiscoverySearch) -> dict[str, Any]:
    source_item = _source_item(user, search.source_media_item_id)
    analysis = DiscoveryAnalysis(
        underexplored_media_types=detect_underexplored_media_types(user),
        underexplored_eras=detect_underexplored_eras(user),
        underexplored_country_languages=detect_underexplored_country_languages(user),
        strongest_media_types=_strongest_media_types(user),
        source_title=source_item.title if source_item else None,
    )
    known_titles = _known_titles(user)
    pool = [seed for seed in CATALOG if seed.title.casefold() not in known_titles]
    if search.media_type:
        typed_pool = [seed for seed in pool if seed.media_type == search.media_type]
        pool = typed_pool
    if search.era:
        pool = [seed for seed in pool if _era_for_year(seed.release_year) == search.era]

    scored = sorted(
        (_score_seed(seed, search, analysis, source_item) for seed in pool),
        key=lambda result: (-result["discoveryScore"], -result["obscurityScore"], result["title"]),
    )
    results = scored[:5]
    if not results and not search.media_type and not search.era:
        results = [
            _seed_to_result(seed, 50, 50, search, analysis, source_item) for seed in CATALOG[:3]
        ]

    primary_theme = _trail_theme(search, analysis)
    description = _trail_description(search, analysis, len(results))
    now = timezone.now().isoformat()
    draft = {
        "name": _trail_name(search, primary_theme),
        "theme": primary_theme,
        "description": description,
        "sourceMediaItemId": str(source_item.id) if source_item else None,
        "sourceMediaItemTitle": source_item.title if source_item else None,
        "resultItems": results,
        "createdAt": None,
    }
    return {
        "search": _search_to_payload(search),
        "analysis": {
            "underexploredMediaTypes": analysis.underexplored_media_types,
            "underexploredEras": analysis.underexplored_eras,
            "underexploredCountryLanguages": analysis.underexplored_country_languages,
            "strongestMediaTypes": analysis.strongest_media_types,
            "sourceTitle": analysis.source_title,
        },
        "draft": draft,
        "results": results,
        "generatedAt": now,
    }


def _score_seed(
    seed: DiscoverySeed,
    search: DiscoverySearch,
    analysis: DiscoveryAnalysis,
    source_item: MediaItem | None,
) -> dict[str, Any]:
    score = 34 + (seed.base_obscurity * 0.22)
    confidence = 54

    if seed.media_type in analysis.underexplored_media_types:
        score += 13
    if _era_for_year(seed.release_year) in analysis.underexplored_eras:
        score += 8
    if any(
        token in seed.country_language.casefold()
        for token in _tokens(" ".join(analysis.underexplored_country_languages))
    ):
        score += 6
    if search.mode == "deep_cut":
        score += seed.base_obscurity * 0.18
    if search.mode == "cross_medium" and seed.media_type not in analysis.strongest_media_types[:1]:
        score += 12
    if search.mode == "modern_exception" and _era_for_year(seed.release_year) == "modern_exception":
        score += 18

    theme_tokens = _tokens(search.theme)
    mood_tokens = _tokens(search.mood)
    creator_tokens = _tokens(search.creator)
    pattern_tokens = _tokens(search.narrative_pattern)
    favorite_tokens = _tokens(search.favorite_work)
    seed_tokens = _seed_tokens(seed)

    if theme_tokens:
        overlap = theme_tokens & seed_tokens
        score += 9 * min(len(overlap), 3)
        confidence += 5 if overlap else -6
    if mood_tokens:
        overlap = mood_tokens & seed_tokens
        score += 5 * min(len(overlap), 2)
    if pattern_tokens:
        overlap = pattern_tokens & seed_tokens
        score += 9 * min(len(overlap), 2)
        confidence += 4 if overlap else 0
    if creator_tokens:
        score += 16 if creator_tokens & _tokens(seed.creator) else 3
    if favorite_tokens:
        score += 6 * min(len(favorite_tokens & seed_tokens), 3)
    if source_item:
        source_tokens = (
            _tokens(source_item.title) | _tokens(source_item.creator) | _tokens(source_item.notes)
        )
        if source_item.media_type != seed.media_type:
            score += 7
        score += 5 * min(len(source_tokens & seed_tokens), 3)
        confidence += 8
    if search.country_language and _tokens(search.country_language) & _tokens(
        seed.country_language
    ):
        score += 16
        confidence += 5
    if search.era and _era_for_year(seed.release_year) == search.era:
        score += 14
        confidence += 4
    if search.media_type and seed.media_type == search.media_type:
        score += 10
        confidence += 5

    return _seed_to_result(seed, score, confidence, search, analysis, source_item)


def _seed_to_result(
    seed: DiscoverySeed,
    score: float,
    confidence: float,
    search: DiscoverySearch,
    analysis: DiscoveryAnalysis,
    source_item: MediaItem | None,
) -> dict[str, Any]:
    era = _era_for_year(seed.release_year)
    reasons = [
        {
            "kind": "taste_expansion",
            "label": "Taste expansion",
            "detail": _expansion_detail(seed, search, source_item),
            "weight": 24,
        },
        {
            "kind": "deep_cut_score",
            "label": "Deep-cut signal",
            "detail": _deep_cut_detail(seed, era),
            "weight": seed.base_obscurity,
        },
    ]
    if seed.media_type in analysis.underexplored_media_types:
        reasons.append(
            {
                "kind": "underexplored_medium",
                "label": "Underexplored medium",
                "detail": (
                    f"{seed.media_type.replace('_', ' ').title()} is light in your library, "
                    "so this broadens format exposure."
                ),
                "weight": 18,
            }
        )
    if era in analysis.underexplored_eras:
        reasons.append(
            {
                "kind": "underexplored_era",
                "label": "Underexplored era",
                "detail": f"The { _era_label(era) } bucket has low exposure in your history.",
                "weight": 15,
            }
        )
    if search.country_language and _tokens(search.country_language) & _tokens(
        seed.country_language
    ):
        reasons.append(
            {
                "kind": "underexplored_region",
                "label": "Region/language match",
                "detail": (
                    f"Matches the requested {search.country_language} direction "
                    "without relying on popularity charts."
                ),
                "weight": 16,
            }
        )
    if search.creator:
        reasons.append(
            {
                "kind": "creator_adjacent",
                "label": "Creator-adjacent dig",
                "detail": (
                    f"Uses {seed.creator} as an adjacent authored signal rather than "
                    "a same-title recommendation."
                ),
                "weight": 12,
            }
        )
    if search.theme or search.narrative_pattern:
        reasons.append(
            {
                "kind": "theme_adjacent",
                "label": "Theme-adjacent dig",
                "detail": _theme_detail(seed, search),
                "weight": 14,
            }
        )
    reasons.append(
        {
            "kind": "risk",
            "label": "Why it may fail",
            "detail": _risk_detail(seed),
            "weight": max(10, 100 - seed.base_obscurity),
        }
    )

    discovery_score = round(max(0, min(100, score)))
    confidence_score = round(max(35, min(95, confidence)))
    return {
        "id": _result_id(seed),
        "title": seed.title,
        "mediaType": seed.media_type,
        "releaseYear": seed.release_year,
        "countryLanguage": seed.country_language,
        "creator": seed.creator,
        "premise": seed.premise,
        "discoveryScore": discovery_score,
        "obscurityScore": seed.base_obscurity,
        "confidenceScore": confidence_score,
        "estimatedTimeMinutes": seed.estimated_time_minutes,
        "reasons": reasons[:6],
        "expansionRationale": _expansion_detail(seed, search, source_item),
        "riskRationale": _risk_detail(seed),
        "suggestedAction": _suggested_action(seed, discovery_score),
    }


def _source_item(user: User, source_media_item_id: str | None) -> MediaItem | None:
    if not source_media_item_id:
        return None
    return MediaItem.objects.filter(owner=user, id=source_media_item_id).first()


def _known_titles(user: User) -> set[str]:
    media_titles = MediaItem.objects.filter(owner=user).values_list("title", flat=True)
    candidate_titles = Candidate.objects.filter(owner=user).values_list("title", flat=True)
    return {title.casefold() for title in [*media_titles, *candidate_titles]}


def _strongest_media_types(user: User) -> list[str]:
    rows = (
        MediaItem.objects.filter(owner=user, personal_rating__isnull=False)
        .values("media_type")
        .annotate(avg_rating=Avg("personal_rating"), count=Count("id"))
        .order_by("-avg_rating", "-count")
    )
    return [row["media_type"] for row in rows]


def _era_for_year(year: int | None) -> str:
    if year is None:
        return "modern_exception"
    if year < 1970:
        return "pre_1970"
    if year <= 1999:
        return "1970s_1990s"
    if year <= 2016:
        return "2000s"
    return "modern_exception"


def _era_label(era: str) -> str:
    return {
        "pre_1970": "pre-1970",
        "1970s_1990s": "1970s–1990s",
        "2000s": "2000s–mid-2010s",
        "modern_exception": "modern exception",
    }.get(era, era.replace("_", " "))


def _tokens(value: str) -> set[str]:
    cleaned = "".join(character.casefold() if character.isalnum() else " " for character in value)
    return {token for token in cleaned.split() if len(token) >= 3}


def _seed_tokens(seed: DiscoverySeed) -> set[str]:
    return (
        _tokens(seed.title)
        | _tokens(seed.creator)
        | _tokens(seed.country_language)
        | _tokens(seed.premise)
        | set(seed.themes)
        | {token for pattern in seed.narrative_patterns for token in _tokens(pattern)}
    )


def _result_id(seed: DiscoverySeed) -> str:
    slug = "-".join(sorted(_tokens(seed.title)))
    return f"curated-{seed.media_type}-{seed.release_year or 'unknown'}-{slug}"


def _trail_theme(search: DiscoverySearch, analysis: DiscoveryAnalysis) -> str:
    if search.theme:
        return search.theme
    if search.creator:
        return f"Creator-adjacent path from {search.creator}"
    if search.country_language:
        return f"{search.country_language} deep cuts"
    if search.media_type:
        return f"Underexplored {search.media_type.replace('_', ' ')} trail"
    if analysis.underexplored_media_types:
        return f"Underexplored {analysis.underexplored_media_types[0].replace('_', ' ')} trail"
    return "Deep-cut discovery trail"


def _trail_name(search: DiscoverySearch, theme: str) -> str:
    mode_label = search.mode.replace("_", " ").title()
    return f"{mode_label}: {theme[:90]}"


def _trail_description(
    search: DiscoverySearch, analysis: DiscoveryAnalysis, result_count: int
) -> str:
    pieces = [f"{result_count} explainable discovery result(s)"]
    if search.media_type:
        pieces.append(f"filtered toward {search.media_type.replace('_', ' ')}")
    if search.era:
        pieces.append(f"aimed at {_era_label(search.era)}")
    if analysis.underexplored_media_types:
        pieces.append(
            "using underexplored media signals: "
            + ", ".join(
                media_type.replace("_", " ")
                for media_type in analysis.underexplored_media_types[:3]
            )
        )
    return "; ".join(pieces) + "."


def _search_to_payload(search: DiscoverySearch) -> dict[str, Any]:
    return {
        "mode": search.mode,
        "theme": search.theme,
        "mood": search.mood,
        "era": search.era,
        "countryLanguage": search.country_language,
        "mediaType": search.media_type,
        "creator": search.creator,
        "narrativePattern": search.narrative_pattern,
        "favoriteWork": search.favorite_work,
        "sourceMediaItemId": search.source_media_item_id,
    }


def _expansion_detail(
    seed: DiscoverySeed,
    search: DiscoverySearch,
    source_item: MediaItem | None,
) -> str:
    if source_item:
        return (
            f"Expands from “{source_item.title}” into {seed.country_language} "
            f"{seed.media_type.replace('_', ' ')} language without repeating the same work."
        )
    if search.theme:
        return (
            f"Uses “{search.theme}” as a bridge into {seed.creator}'s "
            f"{seed.country_language} work, so the match is thematic rather than "
            "just genre-based."
        )
    return (
        f"Adds {seed.country_language} {seed.media_type.replace('_', ' ')} context around "
        f"{', '.join(seed.themes[:2])}, widening the map instead of only matching known favorites."
    )


def _deep_cut_detail(seed: DiscoverySeed, era: str) -> str:
    return (
        f"First-pass deep-cut score {seed.base_obscurity}/100 from age, region/language, "
        f"and under-discussed catalog position ({_era_label(era)})."
    )


def _theme_detail(seed: DiscoverySeed, search: DiscoverySearch) -> str:
    requested = search.theme or search.narrative_pattern or "the requested pattern"
    return (
        f"Connects {requested} to {', '.join(seed.themes[:3])} through "
        f"{', '.join(seed.narrative_patterns[:2])}."
    )


def _risk_detail(seed: DiscoverySeed) -> str:
    if seed.estimated_time_minutes and seed.estimated_time_minutes > 500:
        return (
            "High commitment: sample one episode/chapter-equivalent before accepting "
            "the full trail."
        )
    if seed.release_year and seed.release_year < 1970:
        return (
            "Older pacing or formal style may feel austere; treat it as a deliberate slow sample."
        )
    if seed.base_obscurity >= 80:
        return (
            "The deep-cut signal is high, so confidence depends on mood and tolerance "
            "for strangeness."
        )
    return "Risk is moderate: the recommendation expands taste, but evidence is still first-pass."


def _suggested_action(seed: DiscoverySeed, score: int) -> str:
    if score >= 80 and (seed.estimated_time_minutes or 0) <= 180:
        return "Queue as a focused sample for the next curious, high-attention window."
    if (seed.estimated_time_minutes or 0) > 500:
        return "Queue only the first episode or chapter-equivalent as a protected sample."
    return "Save the trail, then sample when you want a non-obvious expansion rather than comfort."
