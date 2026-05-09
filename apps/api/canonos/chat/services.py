from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

from django.contrib.auth.models import AbstractUser
from django.db import transaction
from django.utils import timezone

from canonos.aftertaste.models import AftertasteEntry
from canonos.aftertaste.serializers import AftertasteEntrySerializer
from canonos.ai.minimax import MiniMaxClient
from canonos.ai.web_search import WebSearchClient, WebSearchError
from canonos.candidates.models import Candidate, CandidateEvaluation
from canonos.candidates.serializers import CandidateEvaluationSerializer, CandidateSerializer
from canonos.candidates.services import evaluate_candidate
from canonos.detox.serializers import DetoxEvaluateResponseSerializer
from canonos.detox.services import evaluate_detox, get_time_saved_summary
from canonos.discovery.services import DiscoverySearch, build_search, generate_discovery_trail
from canonos.media.models import MediaItem
from canonos.queueing.models import TonightModeSession
from canonos.queueing.serializers import TonightModeSessionSerializer
from canonos.queueing.services import TonightContext, generate_tonight_recommendations

from .models import ChatMessage, ChatSession

MEDIA_TYPE_ALIASES = {
    "movie": MediaItem.MediaType.MOVIE,
    "film": MediaItem.MediaType.MOVIE,
    "tv": MediaItem.MediaType.TV_SHOW,
    "show": MediaItem.MediaType.TV_SHOW,
    "series": MediaItem.MediaType.TV_SHOW,
    "anime": MediaItem.MediaType.ANIME,
    "novel": MediaItem.MediaType.NOVEL,
    "book": MediaItem.MediaType.NOVEL,
    "audiobook": MediaItem.MediaType.AUDIOBOOK,
    "audio book": MediaItem.MediaType.AUDIOBOOK,
}

MODULE_LABELS = {
    ChatSession.Module.TONIGHT: "Tonight Mode",
    ChatSession.Module.CANDIDATE: "Candidate Evaluator",
    ChatSession.Module.DISCOVERY: "Media Archaeologist",
    ChatSession.Module.DETOX: "Completion Detox",
    ChatSession.Module.AFTERTASTE: "Aftertaste Log",
}


@dataclass(frozen=True)
class ChatTurnResult:
    assistant_content: str
    metadata: dict[str, Any]
    result: dict[str, Any]


def create_welcome_message(session: ChatSession) -> ChatMessage:
    return ChatMessage.objects.create(
        session=session,
        role=ChatMessage.Role.ASSISTANT,
        content=_welcome_for_module(session.module),
        metadata={
            "action": "ask_question",
            "module": session.module,
            "provider": "system",
            "quickReplies": _starter_replies(session.module),
        },
    )


def process_chat_turn(session: ChatSession, content: str) -> ChatMessage:
    with transaction.atomic():
        ChatMessage.objects.create(
            session=session,
            role=ChatMessage.Role.USER,
            content=content,
            metadata={},
        )
        result = _orchestrate(session, content)
        session.latest_result = result.result
        session.state = {
            **session.state,
            "slots": result.metadata.get("slots", session.state.get("slots", {})),
            "turnCount": int(session.state.get("turnCount", 0)) + 1,
        }
        if not session.title:
            session.title = _title_from_content(session.module, content)
        session.save(update_fields=["latest_result", "state", "title", "updated_at"])
        return ChatMessage.objects.create(
            session=session,
            role=ChatMessage.Role.ASSISTANT,
            content=result.assistant_content,
            metadata=result.metadata,
        )


def _orchestrate(session: ChatSession, latest_user_content: str) -> ChatTurnResult:
    slots = {
        **dict(session.state.get("slots") or {}),
        **_deterministic_slots(session.module, latest_user_content),
    }
    provider = "deterministic"
    provider_note = "MiniMax was not configured; deterministic slot extraction handled this turn."
    if MiniMaxClient().is_configured:
        llm_slots, provider_note = _minimax_slots(session, latest_user_content, slots)
        if llm_slots:
            slots = {**slots, **llm_slots}
            provider = "minimax"

    if session.module == ChatSession.Module.TONIGHT:
        return _tonight_turn(session.owner, slots, provider, provider_note)
    if session.module == ChatSession.Module.CANDIDATE:
        return _candidate_turn(session.owner, slots, provider, provider_note)
    if session.module == ChatSession.Module.DISCOVERY:
        return _discovery_turn(session.owner, slots, provider, provider_note)
    if session.module == ChatSession.Module.DETOX:
        return _detox_turn(session.owner, slots, provider, provider_note)
    if session.module == ChatSession.Module.AFTERTASTE:
        return _aftertaste_turn(session.owner, slots, provider, provider_note)
    return _ask(
        slots,
        "Which CanonOS module should this chat help with?",
        ["Tonight Mode", "Candidate Evaluator", "Discovery"],
        provider,
        provider_note,
    )


def _minimax_slots(
    session: ChatSession,
    latest_user_content: str,
    current_slots: dict[str, Any],
) -> tuple[dict[str, Any], str]:
    module_label = MODULE_LABELS.get(session.module, session.module)
    system_prompt = (
        "You extract structured slots for CanonOS recommendation chats. "
        "Return only valid JSON. Never recommend media. Use null for unknown values."
    )
    user_prompt = (
        f"Module: {module_label}\n"
        f"Existing slots: {current_slots}\n"
        f"Latest user message: {latest_user_content}\n"
        "Return JSON with a top-level object named slots. Preserve these key styles when relevant: "
        "availableMinutes, energyLevel, focusLevel, desiredEffect, "
        "preferredMediaTypes, riskTolerance, "
        "avoid, title, mediaType, releaseYear, knownCreator, premise, sourceOfInterest, hypeLevel, "
        "expectedGenericness, expectedTimeCostMinutes, mode, theme, mood, era, countryLanguage, "
        "creator, narrativePattern, favoriteWork, mediaItemTitle, progressValue, motivationScore, "
        "worthTime, stayedWithMeScore, feltAlive, feltGeneric, completionReason, whatWorked, "
        "whatFailed, finalThoughts, appetiteEffect."
    )
    try:
        data = MiniMaxClient().chat_json(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            max_completion_tokens=700,
            temperature=0.1,
        )
    except Exception as exc:  # noqa: BLE001
        return {}, f"MiniMax extraction failed and deterministic extraction was used: {exc}"
    slots = data.get("slots", {}) if isinstance(data, dict) else {}
    return _clean_slots(slots), "MiniMax extracted conversation slots for this turn."


def _tonight_turn(
    user: AbstractUser,
    slots: dict[str, Any],
    provider: str,
    provider_note: str,
) -> ChatTurnResult:
    missing = [
        key
        for key in [
            "availableMinutes",
            "energyLevel",
            "focusLevel",
            "desiredEffect",
            "riskTolerance",
        ]
        if not slots.get(key)
    ]
    if not slots.get("preferredMediaTypes"):
        missing.append("preferredMediaTypes")
    if missing:
        return _ask(
            slots,
            _question_for_missing("tonight", missing[0]),
            _quick_replies(missing[0]),
            provider,
            provider_note,
        )

    context = TonightContext(
        available_minutes=int(slots["availableMinutes"]),
        energy_level=str(slots["energyLevel"]),
        focus_level=str(slots["focusLevel"]),
        desired_effect=str(slots["desiredEffect"]),
        preferred_media_types=list(slots["preferredMediaTypes"]),
        risk_tolerance=str(slots["riskTolerance"]),
    )
    recommendations = generate_tonight_recommendations(user, context)
    session = TonightModeSession.objects.create(
        owner=user,
        available_minutes=context.available_minutes,
        energy_level=context.energy_level,
        focus_level=context.focus_level,
        desired_effect=context.desired_effect,
        preferred_media_types=context.preferred_media_types,
        risk_tolerance=context.risk_tolerance,
        generated_recommendations=recommendations,
    )
    result = {
        "action": "recommend",
        "module": ChatSession.Module.TONIGHT,
        "session": TonightModeSessionSerializer(session).data,
        "recommendations": recommendations,
        "safeChoice": _choice_for_slot(recommendations, "safe"),
        "challengingChoice": _choice_for_slot(recommendations, "challenging"),
        "wildcardChoice": _choice_for_slot(recommendations, "wildcard"),
        "summary": _recommendation_summary(recommendations),
    }
    content = _tonight_answer(recommendations, slots)
    return _done(slots, content, result, provider, provider_note)


def _candidate_turn(
    user: AbstractUser,
    slots: dict[str, Any],
    provider: str,
    provider_note: str,
) -> ChatTurnResult:
    missing = [key for key in ["title", "mediaType", "premise"] if not slots.get(key)]
    if missing:
        return _ask(
            slots,
            _question_for_missing("candidate", missing[0]),
            _quick_replies(missing[0]),
            provider,
            provider_note,
        )

    candidate, _ = Candidate.objects.update_or_create(
        owner=user,
        title=str(slots["title"])[:255],
        defaults={
            "media_type": slots["mediaType"],
            "release_year": _optional_int(slots.get("releaseYear")),
            "known_creator": str(slots.get("knownCreator") or "")[:255],
            "premise": str(slots.get("premise") or ""),
            "source_of_interest": str(slots.get("sourceOfInterest") or "Chat intake")[:255],
            "hype_level": _optional_int(slots.get("hypeLevel"))
            if slots.get("hypeLevel") is not None
            else 5,
            "expected_genericness": (
                _optional_int(slots.get("expectedGenericness"))
                if slots.get("expectedGenericness") is not None
                else 5
            ),
            "expected_time_cost_minutes": (
                _optional_int(slots.get("expectedTimeCostMinutes"))
                or _default_time_for_media_type(str(slots["mediaType"]))
            ),
        },
    )
    evaluation = evaluate_candidate(user, candidate)
    result = {
        "action": "recommend",
        "module": ChatSession.Module.CANDIDATE,
        "candidate": CandidateSerializer(candidate).data,
        "evaluation": CandidateEvaluationSerializer(
            evaluation, context={"candidate": candidate}
        ).data,
    }
    content = _candidate_answer(candidate, evaluation)
    return _done(slots, content, result, provider, provider_note)


def _discovery_turn(
    user: AbstractUser,
    slots: dict[str, Any],
    provider: str,
    provider_note: str,
) -> ChatTurnResult:
    anchors = [
        "theme",
        "mood",
        "creator",
        "narrativePattern",
        "favoriteWork",
        "mediaType",
        "countryLanguage",
    ]
    if not any(slots.get(anchor) for anchor in anchors):
        return _ask(
            slots,
            (
                "Give me one useful anchor: a mood, theme, favorite work, "
                "creator, country/language, or medium."
            ),
            ["Existential Japanese film", "Cross-medium moral collapse", "Modern exception anime"],
            provider,
            provider_note,
        )
    payload = {
        "mode": slots.get("mode") or "deep_cut",
        "theme": slots.get("theme") or "",
        "mood": slots.get("mood") or "",
        "era": slots.get("era") or "",
        "country_language": slots.get("countryLanguage") or "",
        "media_type": slots.get("mediaType") or "",
        "creator": slots.get("creator") or "",
        "narrative_pattern": slots.get("narrativePattern") or "",
        "favorite_work": slots.get("favoriteWork") or "",
    }
    if provider == "minimax":
        ai_result, ai_note = _minimax_discovery_trail(user, slots, payload)
        if ai_result:
            result = {"action": "recommend", "module": ChatSession.Module.DISCOVERY, **ai_result}
            return _done(slots, _discovery_answer(result), result, provider, ai_note)
        provider_note = ai_note

    result = generate_discovery_trail(user, build_search(payload))
    result = {"action": "recommend", "module": ChatSession.Module.DISCOVERY, **result}
    return _done(slots, _discovery_answer(result), result, provider, provider_note)


def _minimax_discovery_trail(
    user: AbstractUser,
    slots: dict[str, Any],
    payload: dict[str, Any],
) -> tuple[dict[str, Any] | None, str]:
    web_note = "No web search context was used."
    web_context = ""
    try:
        web_context = WebSearchClient().search_text(_discovery_web_query(slots, payload))
        if web_context:
            web_note = "MiniMax used live web search context for candidate discovery."
    except WebSearchError as exc:
        web_note = f"Web search failed; MiniMax used model knowledge only: {exc}"

    search = build_search(payload)
    constraints = [
        "Return exactly JSON with keys draft, results, search, analysis.",
        "Prefer non-obvious, under-discussed works over mainstream defaults.",
        "Do not include items the user already knows if the prompt implies a new discovery trail.",
        "Every result must include title, mediaType, releaseYear, countryLanguage, creator, "
        "premise, discoveryScore, obscurityScore, confidenceScore, estimatedTimeMinutes, "
        "reasons, expansionRationale, riskRationale, suggestedAction.",
    ]
    if search.media_type:
        constraints.append(f"Hard constraint: every result mediaType must be {search.media_type}.")
    if search.era == "modern_exception":
        constraints.append("Hard constraint: every result releaseYear must be 2017 or later.")
    elif search.era == "2000s":
        constraints.append(
            "Hard constraint: every result releaseYear must be from 2000 through 2016."
        )
    elif search.era == "1970s_1990s":
        constraints.append(
            "Hard constraint: every result releaseYear must be from 1970 through 1999."
        )
    elif search.era == "pre_1970":
        constraints.append("Hard constraint: every result releaseYear must be before 1970.")

    known_titles = sorted(_known_media_titles(user))[:80]
    system_prompt = (
        "You are CanonOS Media Archaeologist. Generate careful discovery trails. "
        "Ask no follow-up here; produce structured JSON only. Respect hard constraints."
    )
    user_prompt = (
        f"Search request: {payload}\n"
        f"Conversation slots: {slots}\n"
        f"Known user titles to avoid: {known_titles}\n"
        f"Rules:\n- " + "\n- ".join(constraints) + "\n\n"
        f"Web search context:\n{web_context or '[none]'}\n\n"
        "For reasons, use objects with kind, label, detail, weight. Allowed kinds: "
        "taste_expansion, underexplored_medium, underexplored_era, underexplored_region, "
        "creator_adjacent, theme_adjacent, deep_cut_score, risk, action."
    )
    try:
        data = MiniMaxClient().chat_json(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            max_completion_tokens=2400,
            temperature=0.35,
        )
    except Exception as exc:  # noqa: BLE001
        return None, f"MiniMax discovery generation failed; local fallback was used: {exc}"

    normalized = _normalize_ai_discovery_payload(data, search)
    if normalized is None:
        return None, "MiniMax returned results that violated filters; local fallback was used."
    return normalized, web_note


def _normalize_ai_discovery_payload(
    data: dict[str, Any],
    search: DiscoverySearch,
) -> dict[str, Any] | None:
    if not isinstance(data, dict):
        return None
    raw_results = data.get("results")
    if not isinstance(raw_results, list):
        return None

    results: list[dict[str, Any]] = []
    for item in raw_results:
        if not isinstance(item, dict):
            continue
        result = _normalize_ai_discovery_result(item, search)
        if result:
            results.append(result)
    if not results:
        return None

    draft = data.get("draft") if isinstance(data.get("draft"), dict) else {}
    theme = search.theme or search.favorite_work or search.creator or search.mood or "AI discovery"
    name = str(draft.get("name") or f"{search.mode.replace('_', ' ').title()}: {theme}")[:255]
    description = str(
        draft.get("description")
        or "AI-generated discovery trail with hard filters and explainability."
    )
    return {
        "search": {
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
        },
        "analysis": {
            "underexploredMediaTypes": [],
            "underexploredEras": [search.era] if search.era else [],
            "underexploredCountryLanguages": [],
            "strongestMediaTypes": [],
            "sourceTitle": None,
        },
        "draft": {
            "name": name,
            "theme": str(draft.get("theme") or theme)[:255],
            "description": description,
            "sourceMediaItemId": None,
            "sourceMediaItemTitle": None,
            "resultItems": results[:5],
            "createdAt": None,
        },
        "results": results[:5],
        "generatedAt": timezone.now().isoformat(),
    }


def _normalize_ai_discovery_result(
    item: dict[str, Any], search: DiscoverySearch
) -> dict[str, Any] | None:
    title = str(item.get("title") or "").strip()
    media_type = _normalize_media_type(str(item.get("mediaType") or item.get("media_type") or ""))
    release_year = _optional_int(item.get("releaseYear") or item.get("release_year"))
    if not title or not media_type or release_year is None:
        return None
    if search.media_type and media_type != search.media_type:
        return None
    if search.era and not _release_year_matches_era(release_year, search.era):
        return None

    reasons = item.get("reasons") if isinstance(item.get("reasons"), list) else []
    normalized_reasons = []
    for reason in reasons:
        if isinstance(reason, dict):
            normalized_reason = _normalize_ai_reason(reason)
            if normalized_reason is not None:
                normalized_reasons.append(normalized_reason)
    if not normalized_reasons:
        normalized_reasons = [
            {
                "kind": "taste_expansion",
                "label": "Taste expansion",
                "detail": "AI selected this as a non-obvious adjacent discovery for the request.",
                "weight": 24,
            },
            {
                "kind": "risk",
                "label": "Why it may fail",
                "detail": "Confidence depends on tolerance for unusual structure and tone.",
                "weight": 30,
            },
        ]

    return {
        "id": f"ai-{media_type}-{release_year}-{_slug(title)}",
        "title": title[:255],
        "mediaType": media_type,
        "releaseYear": release_year,
        "countryLanguage": str(item.get("countryLanguage") or item.get("country_language") or "")[
            :120
        ],
        "creator": str(item.get("creator") or "")[:255],
        "premise": str(item.get("premise") or "")[:500],
        "discoveryScore": _bounded_score(item.get("discoveryScore"), default=78),
        "obscurityScore": _bounded_score(item.get("obscurityScore"), default=70),
        "confidenceScore": _bounded_score(item.get("confidenceScore"), default=65),
        "estimatedTimeMinutes": _optional_int(item.get("estimatedTimeMinutes")),
        "reasons": normalized_reasons[:6],
        "expansionRationale": str(item.get("expansionRationale") or "AI-selected taste expansion.")[
            :500
        ],
        "riskRationale": str(item.get("riskRationale") or "Sample before fully committing.")[:500],
        "suggestedAction": str(
            item.get("suggestedAction") or "Queue as a focused sample, then reassess."
        )[:500],
    }


def _normalize_ai_reason(reason: dict[str, Any]) -> dict[str, Any] | None:
    kind = _normalize_token(str(reason.get("kind") or "taste_expansion"))
    allowed = {
        "taste_expansion",
        "underexplored_medium",
        "underexplored_era",
        "underexplored_region",
        "creator_adjacent",
        "theme_adjacent",
        "deep_cut_score",
        "risk",
        "action",
    }
    if kind not in allowed:
        kind = "taste_expansion"
    detail = str(reason.get("detail") or "").strip()
    if not detail:
        return None
    return {
        "kind": kind,
        "label": str(reason.get("label") or kind.replace("_", " ").title())[:80],
        "detail": detail[:500],
        "weight": _bounded_score(reason.get("weight"), default=20),
    }


def _release_year_matches_era(release_year: int, era: str) -> bool:
    if era == "pre_1970":
        return release_year < 1970
    if era == "1970s_1990s":
        return 1970 <= release_year <= 1999
    if era == "2000s":
        return 2000 <= release_year <= 2016
    if era == "modern_exception":
        return release_year >= 2017
    return True


def _bounded_score(value: object, *, default: int) -> int:
    parsed = _optional_int(value)
    if parsed is None:
        return default
    return max(0, min(100, parsed))


def _slug(value: str) -> str:
    tokens = re.findall(r"[a-z0-9]+", value.casefold())
    return "-".join(tokens[:8]) or "untitled"


def _known_media_titles(user: AbstractUser) -> set[str]:
    return set(MediaItem.objects.filter(owner=user).values_list("title", flat=True))


def _discovery_web_query(slots: dict[str, Any], payload: dict[str, Any]) -> str:
    pieces = [
        str(slots.get("theme") or payload.get("theme") or ""),
        str(slots.get("mood") or payload.get("mood") or ""),
        str(slots.get("favoriteWork") or payload.get("favorite_work") or ""),
        str(slots.get("creator") or payload.get("creator") or ""),
        str(slots.get("mediaType") or payload.get("media_type") or "media"),
        str(slots.get("era") or payload.get("era") or ""),
        "underseen recommendations",
    ]
    return " ".join(piece for piece in pieces if piece).strip()


def _detox_turn(
    user: AbstractUser,
    slots: dict[str, Any],
    provider: str,
    provider_note: str,
) -> ChatTurnResult:
    media_item = _media_from_slots(user, slots)
    if media_item:
        slots["mediaItemId"] = str(media_item.id)
        slots["mediaItemTitle"] = media_item.title
    for missing in ["mediaItemId", "progressValue", "motivationScore"]:
        if not slots.get(missing):
            return _ask(
                slots,
                _question_for_missing("detox", missing),
                _quick_replies(missing),
                provider,
                provider_note,
            )

    media_item = MediaItem.objects.filter(owner=user, id=slots["mediaItemId"]).first()
    if media_item is None:
        return _ask(
            slots,
            "I could not find that library item. Which exact title should I evaluate?",
            [],
            provider,
            provider_note,
        )
    decision = evaluate_detox(
        user,
        media_item,
        progress_value=int(slots["progressValue"]),
        motivation_score=int(slots["motivationScore"]),
    )
    result = {
        "action": "recommend",
        "module": ChatSession.Module.DETOX,
        **DetoxEvaluateResponseSerializer(
            {
                "decision": decision,
                "matchedRule": decision.rule,
                "mediaItem": media_item,
                "timeSavedSummary": get_time_saved_summary(user),
            }
        ).data,
    }
    return _done(slots, _detox_answer(result), result, provider, provider_note)


def _aftertaste_turn(
    user: AbstractUser,
    slots: dict[str, Any],
    provider: str,
    provider_note: str,
) -> ChatTurnResult:
    media_item = _media_from_slots(user, slots)
    if media_item:
        slots["mediaItemId"] = str(media_item.id)
        slots["mediaItemTitle"] = media_item.title
    required = [
        "mediaItemId",
        "worthTime",
        "stayedWithMeScore",
        "feltAlive",
        "feltGeneric",
        "finalThoughts",
    ]
    for missing in required:
        if slots.get(missing) is None:
            return _ask(
                slots,
                _question_for_missing("aftertaste", missing),
                _quick_replies(missing),
                provider,
                provider_note,
            )
    media_item = MediaItem.objects.filter(owner=user, id=slots["mediaItemId"]).first()
    if media_item is None:
        return _ask(
            slots,
            "I could not find that media item. Which exact completed title is this about?",
            [],
            provider,
            provider_note,
        )
    entry = AftertasteEntry.objects.create(
        owner=user,
        media_item=media_item,
        worth_time=bool(slots["worthTime"]),
        stayed_with_me_score=int(slots["stayedWithMeScore"]),
        felt_alive=bool(slots["feltAlive"]),
        felt_generic=bool(slots["feltGeneric"]),
        completion_reason=str(slots.get("completionReason") or "Chat reflection"),
        what_worked=str(slots.get("whatWorked") or ""),
        what_failed=str(slots.get("whatFailed") or ""),
        final_thoughts=str(slots.get("finalThoughts") or ""),
        appetite_effect=str(
            slots.get("appetiteEffect") or AftertasteEntry.AppetiteEffect.NO_CHANGE
        ),
    )
    result = {
        "action": "recommend",
        "module": ChatSession.Module.AFTERTASTE,
        "aftertaste": AftertasteEntrySerializer(entry).data,
    }
    return _done(slots, _aftertaste_answer(entry), result, provider, provider_note)


def _ask(
    slots: dict[str, Any],
    question: str,
    quick_replies: list[str],
    provider: str,
    provider_note: str,
) -> ChatTurnResult:
    return ChatTurnResult(
        assistant_content=question,
        metadata={
            "action": "ask_question",
            "slots": slots,
            "quickReplies": quick_replies,
            "provider": provider,
            "providerNote": provider_note,
        },
        result={"action": "ask_question", "question": question, "slots": slots},
    )


def _done(
    slots: dict[str, Any],
    content: str,
    result: dict[str, Any],
    provider: str,
    provider_note: str,
) -> ChatTurnResult:
    return ChatTurnResult(
        assistant_content=content,
        metadata={
            "action": "recommend",
            "slots": slots,
            "quickReplies": ["Add to queue", "Try another angle", "Start a new chat"],
            "provider": provider,
            "providerNote": provider_note,
        },
        result=result,
    )


def _deterministic_slots(module: str, content: str) -> dict[str, Any]:
    text = content.casefold()
    slots: dict[str, Any] = {}
    number = _first_int(text)
    if module == ChatSession.Module.TONIGHT:
        if number:
            slots["availableMinutes"] = number
        slots.update(_common_state_slots(text))
        media_types = [value for alias, value in MEDIA_TYPE_ALIASES.items() if alias in text]
        if media_types:
            slots["preferredMediaTypes"] = sorted(set(media_types))
        if "avoid" in text or "no " in text:
            slots["avoid"] = content
    elif module == ChatSession.Module.CANDIDATE:
        slots.update(_media_title_slots(content))
        if number and 1800 <= number <= 2100:
            slots["releaseYear"] = number
        elif number:
            slots["expectedTimeCostMinutes"] = number
        if "generic" in text:
            slots["expectedGenericness"] = 8
        if "hype" in text:
            slots["hypeLevel"] = 7
        if len(content) > 35:
            slots["premise"] = content
    elif module == ChatSession.Module.DISCOVERY:
        slots.update(_media_type_slot(text))
        if "modern" in text:
            slots["mode"] = "modern_exception"
            slots["era"] = "modern_exception"
        elif "cross" in text:
            slots["mode"] = "cross_medium"
        if "creator" in text or "director" in text or "author" in text:
            slots["creator"] = content
        elif "like " in text:
            slots["favoriteWork"] = content.split("like ", 1)[1][:120]
        else:
            slots["theme"] = content[:255]
            slots["mood"] = content[:255]
    elif module == ChatSession.Module.DETOX:
        slots.update(_media_title_slots(content))
        if number is not None:
            slots["progressValue"] = number
        motivation = _score_near(text, ["motivation", "interest", "care", "curiosity"])
        if motivation is not None:
            slots["motivationScore"] = motivation
        elif any(word in text for word in ["bored", "don't care", "dont care", "tired"]):
            slots["motivationScore"] = 3
    elif module == ChatSession.Module.AFTERTASTE:
        slots.update(_media_title_slots(content))
        score = _first_score(text)
        if score is not None:
            slots["stayedWithMeScore"] = score
        if any(word in text for word in ["worth it", "worth the time", "good use"]):
            slots["worthTime"] = True
        if any(word in text for word in ["not worth", "waste"]):
            slots["worthTime"] = False
        if any(word in text for word in ["alive", "authored", "specific"]):
            slots["feltAlive"] = True
        if "generic" in text:
            slots["feltGeneric"] = True
        if any(word in text for word in ["forgettable", "hollow", "formulaic"]):
            slots["feltAlive"] = False
        if len(content) > 25:
            slots["finalThoughts"] = content
    return _clean_slots(slots)


def _clean_slots(slots: dict[str, Any]) -> dict[str, Any]:
    clean: dict[str, Any] = {}
    for key, value in slots.items():
        if value is None or value == "" or value == [] or value == {}:
            continue
        if key in {
            "availableMinutes",
            "progressValue",
            "motivationScore",
            "stayedWithMeScore",
            "hypeLevel",
            "expectedGenericness",
            "expectedTimeCostMinutes",
            "releaseYear",
        }:
            number = _optional_int(value)
            if number is not None:
                clean[key] = number
        elif key in {
            "energyLevel",
            "focusLevel",
            "desiredEffect",
            "riskTolerance",
            "mode",
            "era",
            "appetiteEffect",
        }:
            clean[key] = _normalize_token(str(value))
        elif key in {"mediaType"}:
            media = _normalize_media_type(str(value))
            if media:
                clean[key] = media
        elif key == "preferredMediaTypes":
            values = value if isinstance(value, list) else [value]
            media_types = [_normalize_media_type(str(item)) for item in values]
            clean[key] = [item for item in media_types if item]
        else:
            clean[key] = value
    return clean


def _common_state_slots(text: str) -> dict[str, Any]:
    slots: dict[str, Any] = {}
    if "low energy" in text or "tired" in text or "drained" in text:
        slots["energyLevel"] = "low"
    elif "high energy" in text or "wired" in text:
        slots["energyLevel"] = "high"
    elif "medium energy" in text:
        slots["energyLevel"] = "medium"
    if "low focus" in text or "distracted" in text:
        slots["focusLevel"] = "low"
    elif "deep focus" in text or "locked in" in text:
        slots["focusLevel"] = "deep"
    elif "medium focus" in text:
        slots["focusLevel"] = "medium"
    if "comfort" in text or "cozy" in text:
        slots["desiredEffect"] = "comfort"
    elif "surprise" in text or "strange" in text:
        slots["desiredEffect"] = "surprise"
    elif "light" in text or "easy" in text:
        slots["desiredEffect"] = "light"
    elif "deep" in text or "heavy" in text:
        slots["desiredEffect"] = "deep"
    elif "quality" in text or "excellent" in text:
        slots["desiredEffect"] = "quality"
    if "low risk" in text or "safe" in text:
        slots["riskTolerance"] = "low"
    elif "high risk" in text or "challenging" in text:
        slots["riskTolerance"] = "high"
    elif "medium risk" in text:
        slots["riskTolerance"] = "medium"
    return slots


def _media_title_slots(content: str) -> dict[str, Any]:
    slots = _media_type_slot(content.casefold())
    match = re.search(r'["“](.+?)["”]', content)
    if match:
        slots["title"] = match.group(1).strip()
        slots["mediaItemTitle"] = slots["title"]
    elif len(content.split()) <= 8 and not slots:
        slots["title"] = content.strip(" .?!")
        slots["mediaItemTitle"] = slots["title"]
    return slots


def _media_type_slot(text: str) -> dict[str, Any]:
    media = [_normalize_media_type(alias) for alias in MEDIA_TYPE_ALIASES if alias in text]
    return {"mediaType": media[0]} if media and media[0] else {}


def _media_from_slots(user: AbstractUser, slots: dict[str, Any]) -> MediaItem | None:
    if slots.get("mediaItemId"):
        return MediaItem.objects.filter(owner=user, id=slots["mediaItemId"]).first()
    title = slots.get("mediaItemTitle") or slots.get("title")
    if not title:
        return None
    return (
        MediaItem.objects.filter(owner=user, title__icontains=str(title).strip())
        .order_by("-updated_at")
        .first()
    )


def _normalize_media_type(value: str) -> str | None:
    token = value.casefold().replace("-", "_").replace(" ", "_")
    if token in {choice[0] for choice in MediaItem.MediaType.choices}:
        return token
    return MEDIA_TYPE_ALIASES.get(value.casefold())


def _normalize_token(value: str) -> str:
    return value.casefold().strip().replace(" ", "_").replace("-", "_")


def _optional_int(value: object) -> int | None:
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _first_int(text: str) -> int | None:
    match = re.search(r"\b(\d{1,4})\b", text)
    return int(match.group(1)) if match else None


def _first_score(text: str) -> int | None:
    match = re.search(r"\b([0-9]|10)\s*/\s*10\b", text)
    if match:
        return int(match.group(1))
    return _score_near(text, ["score", "stayed", "memorable"])


def _score_near(text: str, keywords: list[str]) -> int | None:
    for keyword in keywords:
        match = re.search(rf"{keyword}[^0-9]{{0,20}}([0-9]|10)\b", text)
        if match:
            return int(match.group(1))
    return None


def _question_for_missing(module: str, slot: str) -> str:
    questions = {
        "availableMinutes": "How much time do you actually have for this session?",
        "energyLevel": "What is your energy level right now: low, medium, or high?",
        "focusLevel": "How much focus do you have: low, medium, or deep?",
        "desiredEffect": "What effect do you want: comfort, quality, surprise, light, or deep?",
        "preferredMediaTypes": (
            "Which formats are acceptable tonight: movie, TV, anime, novel, or audiobook?"
        ),
        "riskTolerance": "How much risk are you willing to take tonight: low, medium, or high?",
        "title": "What is the exact title you want me to evaluate?",
        "mediaType": "What kind of work is it: movie, TV show, anime, novel, or audiobook?",
        "premise": "What do you know about the premise, appeal, or source of interest?",
        "mediaItemId": "Which saved library item is this about? Give me the exact title.",
        "progressValue": "Where are you in it now: minutes, episodes, pages, or listening minutes?",
        "motivationScore": "On a 1-10 scale, how much genuine curiosity do you still have?",
        "worthTime": "Was it worth the time overall?",
        "stayedWithMeScore": "How strongly did it stay with you on a 0-10 scale?",
        "feltAlive": "Did it feel alive, authored, specific, or emotionally true?",
        "feltGeneric": "Did it feel generic, formulaic, hollow, or copy-pasted?",
        "finalThoughts": "What final aftertaste should future recommendations remember?",
    }
    return questions.get(slot, f"What should I know next for {module}?")


def _quick_replies(slot: str) -> list[str]:
    return {
        "energyLevel": ["Low", "Medium", "High"],
        "focusLevel": ["Low focus", "Medium focus", "Deep focus"],
        "desiredEffect": ["Comfort", "Quality", "Surprise", "Light", "Deep"],
        "riskTolerance": ["Low risk", "Medium risk", "High risk"],
        "preferredMediaTypes": ["Movie or anime", "Novel or audiobook", "Anything except TV"],
        "motivationScore": ["3/10", "5/10", "8/10"],
        "worthTime": ["Worth the time", "Not worth the time"],
        "feltAlive": ["Felt alive", "Felt hollow"],
        "feltGeneric": ["Felt generic", "Did not feel generic"],
    }.get(slot, [])


def _starter_replies(module: str) -> list[str]:
    return {
        ChatSession.Module.TONIGHT: [
            "90 minutes, tired, low risk",
            "45 minutes, light anime",
            "Deep focus, surprise me",
        ],
        ChatSession.Module.CANDIDATE: [
            'Evaluate "Severance" as a TV show',
            "Is this anime worth sampling?",
            "Check a novel before I commit",
        ],
        ChatSession.Module.DISCOVERY: [
            "Deep-cut existential movie",
            "Cross-medium moral collapse",
            "Modern exception anime",
        ],
        ChatSession.Module.DETOX: [
            "I don't care anymore, 3/10 motivation",
            "Two episodes in",
            "30 minutes into a movie",
        ],
        ChatSession.Module.AFTERTASTE: [
            "It was worth it, stayed 8/10",
            "Felt generic and forgettable",
            "Alive but only in the right mood",
        ],
    }.get(module, [])


def _welcome_for_module(module: str) -> str:
    return {
        ChatSession.Module.TONIGHT: (
            "Tell me your time, energy, focus, desired effect, acceptable formats, "
            "and risk tolerance. I will ask for anything missing before choosing."
        ),
        ChatSession.Module.CANDIDATE: (
            "Tell me the title, format, and what you know about it. I will gather "
            "enough signal before evaluating commit, sample, delay, or skip."
        ),
        ChatSession.Module.DISCOVERY: (
            "Give me a mood, theme, favorite work, creator, region, or medium. "
            "I will turn it into a small deep-cut trail."
        ),
        ChatSession.Module.DETOX: (
            "Tell me the title, where you are, and your honest curiosity from 1-10. "
            "I will check the sample boundary before recommending drop, pause, or continue."
        ),
        ChatSession.Module.AFTERTASTE: (
            "Tell me what you finished or dropped and what stayed with you. "
            "I will ask enough follow-up to save a useful taste memory."
        ),
    }.get(module, "Tell me what you want CanonOS to help decide.")


def _title_from_content(module: str, content: str) -> str:
    label = MODULE_LABELS.get(module, "Chat")
    short = content.strip().replace("\n", " ")[:80]
    return f"{label}: {short}" if short else label


def _default_time_for_media_type(media_type: str) -> int:
    return {
        MediaItem.MediaType.MOVIE: 120,
        MediaItem.MediaType.TV_SHOW: 480,
        MediaItem.MediaType.ANIME: 300,
        MediaItem.MediaType.NOVEL: 360,
        MediaItem.MediaType.AUDIOBOOK: 420,
    }.get(media_type, 120)


def _recommendation_summary(recommendations: list[dict[str, Any]]) -> str:
    if not recommendations:
        return "No matching recommendation was found for this context."
    top = recommendations[0]
    return f"Start with {top['title']} at {round(float(top['score']))}/100 fit."


def _choice_for_slot(recommendations: list[dict[str, Any]], slot: str) -> dict[str, Any] | None:
    return next((item for item in recommendations if item.get("slot") == slot), None)


def _tonight_answer(recommendations: list[dict[str, Any]], slots: dict[str, Any]) -> str:
    if not recommendations:
        return (
            "I do not have a clean fit for that exact window. Add or restore queue items, "
            "or loosen time/risk constraints."
        )
    lines = [
        (
            f"Start with {recommendations[0]['title']}. It is the strongest fit for "
            f"{slots.get('availableMinutes')} minutes, {slots.get('energyLevel')} energy, "
            f"and {slots.get('focusLevel')} focus."
        ),
        "",
        "Recommended order:",
    ]
    for index, item in enumerate(recommendations[:5], start=1):
        lines.append(
            f"{index}. {item['title']} - {round(float(item['score']))}/100 fit. "
            f"{item['reason']}"
        )
    return "\n".join(lines)


def _candidate_answer(candidate: Candidate, evaluation: CandidateEvaluation) -> str:
    return (
        f"My recommendation for {candidate.title}: {evaluation.get_decision_display()}.\n\n"
        f"Fit {evaluation.likely_fit_score}/100, risk {evaluation.risk_score}/100, "
        f"confidence {evaluation.confidence_score}/100.\n"
        f"Action: {evaluation.recommended_action}\n\n"
        f"Why it works: {' '.join(evaluation.reasons_for)}\n"
        f"Watch-outs: {' '.join(evaluation.reasons_against)}"
    )


def _discovery_answer(result: dict[str, Any]) -> str:
    items = result.get("results", [])
    if not items:
        return (
            "I could not build a discovery trail from that anchor. Try a clearer theme, "
            "favorite work, or medium."
        )
    lines = [f"I built {result['draft']['name']} with {len(items)} options.", "", "Best trail:"]
    for index, item in enumerate(items[:5], start=1):
        lines.append(
            f"{index}. {item['title']} - discovery {item['discoveryScore']}/100, "
            f"obscurity {item['obscurityScore']}/100. {item['suggestedAction']}"
        )
    return "\n".join(lines)


def _detox_answer(result: dict[str, Any]) -> str:
    decision = result["decision"]
    return (
        f"Completion Detox says: {decision['decision'].replace('_', ' ').title()}.\n\n"
        f"{decision['reason']}\n\n"
        f"Estimated time saved: {decision['estimatedTimeSavedMinutes']} minutes."
    )


def _aftertaste_answer(entry: AftertasteEntry) -> str:
    worth = "worth the time" if entry.worth_time else "not worth the time"
    generic = "generic" if entry.felt_generic else "not generic"
    return (
        f"Saved aftertaste for {entry.media_item.title}: {worth}, stayed "
        f"{entry.stayed_with_me_score}/10, {generic}.\n\n"
        "This will now feed future taste and recommendation signals."
    )
