from __future__ import annotations

from .models import CanonSeason

CANON_THEME_PROMPTS: dict[str, list[str]] = {
    CanonSeason.Theme.MORAL_COLLAPSE: [
        "What line does each work draw between pressure, choice, and collapse?",
        "Which early warning signs did characters ignore?",
        "What did this season teach you about consequence and accountability?",
    ],
    CanonSeason.Theme.ANTI_HEROES_DONE_RIGHT: [
        "Which compromises felt revealing rather than edgy?",
        "Where did charisma hide or distort harm?",
        "Which work earned empathy without asking for absolution?",
    ],
    CanonSeason.Theme.FORGOTTEN_MASTERPIECES: [
        "What made these works feel overlooked rather than merely obscure?",
        "Which older choices still feel alive now?",
        "What would you recommend first to prove the season's thesis?",
    ],
    CanonSeason.Theme.MODERN_WORKS_WORTH_IT: [
        "Which modern conventions helped rather than diluted the work?",
        "Where did novelty become substance?",
        "What standards should future modern works meet?",
    ],
    CanonSeason.Theme.ATMOSPHERE_OVER_PLOT: [
        "Which sensory details stayed with you after the plot faded?",
        "Where did mood carry meaning by itself?",
        "What pacing or texture did you want more of?",
    ],
    CanonSeason.Theme.CUSTOM: [
        "What question is this season trying to answer?",
        "Which item changed the shape of the theme most?",
        "What would you add, remove, or reorder after finishing?",
    ],
}


def reflection_prompts_for_theme(theme: str) -> list[str]:
    return CANON_THEME_PROMPTS.get(theme, CANON_THEME_PROMPTS[CanonSeason.Theme.CUSTOM])
