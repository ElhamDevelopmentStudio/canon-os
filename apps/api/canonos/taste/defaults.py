from __future__ import annotations

SCORE_MIN = 0
SCORE_MAX = 10

DEFAULT_TASTE_DIMENSIONS = [
    {
        "slug": "story_depth",
        "name": "Story depth",
        "description": "How meaningful, layered, and worth thinking about the story feels.",
        "direction": "positive",
    },
    {
        "slug": "character_depth",
        "name": "Character depth",
        "description": "How complex, consistent, and memorable the characters feel.",
        "direction": "positive",
    },
    {
        "slug": "atmosphere",
        "name": "Atmosphere",
        "description": "Strength of mood, setting, tone, visual/prose/audio identity.",
        "direction": "positive",
    },
    {
        "slug": "originality",
        "name": "Originality",
        "description": "How non-generic, creatively alive, or surprising the execution feels.",
        "direction": "positive",
    },
    {
        "slug": "dialogue",
        "name": "Dialogue",
        "description": "Quality of dialogue for screen works or prose voice for books.",
        "direction": "positive",
    },
    {
        "slug": "emotional_impact",
        "name": "Emotional impact",
        "description": "How strongly the work affected you emotionally.",
        "direction": "positive",
    },
    {
        "slug": "intellectual_impact",
        "name": "Intellectual impact",
        "description": "How much it provoked thought or changed perspective.",
        "direction": "positive",
    },
    {
        "slug": "pacing",
        "name": "Pacing",
        "description": "How well the work uses time and avoids filler.",
        "direction": "positive",
    },
    {
        "slug": "ending_quality",
        "name": "Ending quality",
        "description": "How satisfying, fitting, or powerful the ending feels.",
        "direction": "positive",
    },
    {
        "slug": "memorability",
        "name": "Memorability",
        "description": "How much remains after days or weeks.",
        "direction": "positive",
    },
    {
        "slug": "rewatch_read_value",
        "name": "Rewatch/read value",
        "description": "Likelihood of rewatching, rereading, relistening, or recommending.",
        "direction": "positive",
    },
    {
        "slug": "genericness",
        "name": "Genericness",
        "description": "How manufactured, predictable, hollow, or trend-driven it felt.",
        "direction": "negative",
    },
    {
        "slug": "regret_score",
        "name": "Regret score",
        "description": "How much you regret spending time on it.",
        "direction": "negative",
    },
]
