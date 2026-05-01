# CanonOS Product Scoring

CanonOS scoring captures *why* a work succeeded or failed, not only whether it was liked.
Scores are private user-owned taste data and use a documented `0` to `10` scale.

## Score Range

- `0` means the dimension was absent, failed, or not valuable for that work.
- `10` means the dimension was exceptionally strong.
- Half-point values are allowed.
- Blank scores mean the dimension has not been judged yet.
- Negative-direction dimensions are still scored `0` to `10`, but lower is better.

## Default Taste Dimensions

| Slug | Direction | Definition |
| --- | --- | --- |
| `story_depth` | Positive | How meaningful, layered, and worth thinking about the story feels. |
| `character_depth` | Positive | How complex, consistent, and memorable the characters feel. |
| `atmosphere` | Positive | Strength of mood, setting, tone, visual/prose/audio identity. |
| `originality` | Positive | How non-generic, creatively alive, or surprising the execution feels. |
| `dialogue` | Positive | Quality of dialogue for screen works or prose voice for books. |
| `emotional_impact` | Positive | How strongly the work affected the user emotionally. |
| `intellectual_impact` | Positive | How much it provoked thought or changed perspective. |
| `pacing` | Positive | How well the work uses time and avoids filler. |
| `ending_quality` | Positive | How satisfying, fitting, or powerful the ending feels. |
| `memorability` | Positive | How much remains after days or weeks. |
| `rewatch_read_value` | Positive | Likelihood of rewatching, rereading, relistening, or recommending to a similar self. |
| `genericness` | Negative | How manufactured, predictable, hollow, or trend-driven it felt. |
| `regret_score` | Negative | How much the user regrets spending time on it. |

## UI Rules

- The scorecard appears in Add/Edit Media and Media Detail.
- Score notes should explain the reason for the numeric judgment.
- Genericness, regret, and memorability receive visible signal indicators because they strongly affect later taste modeling.
