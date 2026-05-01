# 01 - Shared Layout and Navigation

## Purpose

Defines the shared UI rules for CanonOS. All authenticated pages must use the same `AppShell`. Auth and onboarding pages use separate shells.

## Non-Negotiable Layout Rules

- Auth pages use `AuthShell`.
- Onboarding pages use `OnboardingShell`.
- Every authenticated page uses `AppShell`.
- The sidebar must remain identical across authenticated pages.
- The topbar must remain identical across authenticated pages.
- Page-specific differences belong inside the main content area only.
- Use shared components for cards, tables, filters, modals, drawers, badges, scores, skeletons, and empty states.
- Do not invent one-off page styling unless the wireframe explicitly requires it.

## Visual Style

- Dark-first private command-center style.
- Calm, serious, analytical, not a bright streaming-app clone.
- Primary accent: warm gold/amber.
- Positive fit: green badge text.
- Warnings: amber badge text.
- Skip/destructive signals: red badge text.
- Neutral metadata: muted gray/slate.
- Color must never be the only signal. Always include text labels.

## Desktop AppShell

```text
+----------------------------+--------------------------------------------------------------------------------------------------------------------------+
| CanonOS                    | Breadcrumb / Current Page    [Cmd+K Search]  [+ Add Media] [Evaluate] [Me]                                               |
| Private Media Intelligence | ------------------------------------------------------------------------------------------------------------------------ |
| [Search library/pages]     | Page Title                                                                                            [Optional Action]  |
|                            | Short page explanation.                                                                                                  |
| CORE                       | ------------------------------------------------------------------------------------------------------------------------ |
| > Dashboard                | Main content area starts here.                                                                                           |
|   Tonight Mode             | Use cards, tables, forms, drawers, tabs, right rails, and panels from shared components.                                 |
|   Candidate Evaluator      | Do not change sidebar or topbar per page.                                                                                |
|   Library                  |                                                                                                                          |
|   Adaptive Queue           |                                                                                                                          |
|                            |                                                                                                                          |
| INTELLIGENCE               |                                                                                                                          |
|   Taste Profile            |                                                                                                                          |
|   TasteGraph               |                                                                                                                          |
|   Anti-Generic Filter      |                                                                                                                          |
|   Media Archaeologist      |                                                                                                                          |
|   Critic Council           |                                                                                                                          |
|   Personal Canon           |                                                                                                                          |
|   Adaptation Intel         |                                                                                                                          |
|                            |                                                                                                                          |
| SYSTEM                     |                                                                                                                          |
|   Insights                 |                                                                                                                          |
|   Import                   |                                                                                                                          |
|   Activity                 |                                                                                                                          |
|   Settings                 |                                                                                                                          |
|                            |                                                                                                                          |
| User: You                  |                                                                                                                          |
| [Mood: Unknown] [Logout]   |                                                                                                                          |
+----------------------------+--------------------------------------------------------------------------------------------------------------------------+```

## Sidebar Behavior

| Area | Behavior |
|---|---|
| CanonOS logo | Routes to `/app/dashboard`. |
| Sidebar search | Opens the global command palette. |
| Active nav item | Show with accent left border, selected background, and stronger text. |
| Nav groups | Static groups: Core, Intelligence, System. |
| User card | Shows display name and latest mood state. |
| Logout | Opens confirmation dialog before logout. |

## Topbar Behavior

| Control | Behavior |
|---|---|
| Breadcrumb | Shows route hierarchy. Last item is not clickable. |
| `Cmd+K Search` | Opens global command palette. |
| `+ Add Media` | Opens shared Add Media drawer from any page. |
| `Evaluate` | Routes to `/app/evaluator` unless already there. |
| `Me` | Opens account menu: Profile, Preferences, Activity, Logout. |

## Responsive Rules

| Breakpoint | Required Behavior |
|---|---|
| Desktop | Fixed sidebar, fixed topbar, main scroll area. |
| Tablet | Sidebar collapses to icon rail. |
| Mobile | Sidebar becomes drawer; page actions collapse under `More`. |
