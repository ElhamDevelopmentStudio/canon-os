# 02 - Shared Components and UI Rules

## Required Shared Components

| Component | Purpose | Suggested Base |
|---|---|---|
| `AppShell` | Sidebar + topbar + authenticated content. | Custom layout |
| `AuthShell` | Centered auth card layout. | Custom layout |
| `OnboardingShell` | Focused onboarding layout. | Custom layout |
| `PageHeader` | Page title, description, primary action. | Custom |
| `MetricCard` | Dashboard and insight metrics. | shadcn Card |
| `MediaCard` | Grid item for media. | shadcn Card |
| `MediaTable` | Dense library table. | shadcn Table |
| `FilterBar` | Search, filter, sort row. | Input, Select, Badge |
| `ScoreBar` | 0-100 score visualization. | Progress |
| `DecisionBadge` | Watch, Maybe, Skip, Sample, Delay. | Badge |
| `RiskBadge` | Low, Medium, High. | Badge |
| `MoodSelector` | Mood, energy, focus, risk selectors. | Toggle/Button group |
| `EmptyState` | Standard no-data message. | Card |
| `LoadingSkeleton` | Page/card/table skeletons. | Skeleton |
| `ConfirmDialog` | Destructive/action confirmation. | AlertDialog |
| `FormDrawer` | Quick create/edit side drawer. | Sheet |
| `DetailDrawer` | Quick preview drawer. | Sheet |
| `CommandPalette` | Search pages, media, actions. | Command |
| `TabsHeader` | Detail/settings tabs. | Tabs |
| `InsightRail` | Right-side explanations. | Card |
| `CriticMessageCard` | Critic Council response card. | Card |
| `Timeline` | Activity and taste evolution list. | Custom |

## Button Hierarchy

| ASCII | Component Intent | Use |
|---|---|---|
| `[Primary Action]` | primary | Main action on a page/form. |
| `[Secondary]` | secondary | Useful but not main action. |
| `(Ghost Action)` | ghost/link | Low-emphasis action. |
| `[Delete]` | destructive | Delete, skip, reset, abandon. |
| `[i]` | icon | Tooltip required. |

## Standard Data Table Pattern

```text
+--------------------------------------------------------------------------------+
| [Search...] [Filter v] [Sort v] [View v]                         [Export]      |
|--------------------------------------------------------------------------------|
| Title             Medium      Status       Score       Risk       Actions       |
|--------------------------------------------------------------------------------|
| Item title        Movie       Completed    94          Low        Details ...   |
+--------------------------------------------------------------------------------+
```

## Standard Card Pattern

```text
+------------------------------+
| Poster / Cover               |
|------------------------------|
| Title                        |
| Year - Medium - Length       |
| [Decision] [Risk] [Score]    |
| Tags: Atmospheric, Complex   |
| [Details] [Evaluate] [+Queue]|
+------------------------------+
```

## Standard Modal Pattern

```text
+----------------------------------------------------------+
| Modal Title                                              |
| Short explanation.                                       |
|----------------------------------------------------------|
| Form or confirmation content.                            |
|                                                          |
| [Cancel]                                      [Confirm]  |
+----------------------------------------------------------+
```

## Global Interaction Rules

- Clicking a media title opens `/app/library/:mediaId`.
- `Evaluate` opens `/app/evaluator` with the item prefilled.
- `+ Queue` adds the item to Adaptive Queue and shows a toast.
- `Delete`, `Drop`, `Skip`, `Clear`, `Sign out all`, and `Delete account` require confirmation.
- Long-running jobs show progress and keep the page usable when possible.
- API errors preserve user input and show retry.
