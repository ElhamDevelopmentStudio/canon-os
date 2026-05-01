# 31 - Settings - Profile and Preferences

## Route

`/app/settings/profile-preferences`

## Purpose

Edits user profile, default UI behavior, recommendation tone, queue defaults, and privacy preferences.

## Required Layout

Use `AppShell`. Active sidebar item: Settings. Settings pages use internal left subnav.

## ASCII Wireframe

```text
+----------------------------+--------------------------------------------------------------------------------------------------------------------------+
| CanonOS                    | Settings    [Cmd+K Search]  [+ Add Media] [Evaluate] [Me]                                                                |
| Private Media Intelligence | ------------------------------------------------------------------------------------------------------------------------ |
| [Search library/pages]     | Settings                                                                                                 [Save Changes]  |
|                            | Configure your CanonOS workspace.                                                                                        |
| CORE                       | ------------------------------------------------------------------------------------------------------------------------ |
|   Dashboard                | +---------------------------+ +------------------------------------------------------+                                   |
|   Tonight Mode             | | Settings Sections         | | Profile and Preferences                              |                                   |
|   Candidate Evaluator      | | > Profile & Preferences   | | Display name [ You                                ]  |                                   |
|   Library                  | |   Data & Integrations     | | Default start page [Dashboard v]                    |                                    |
|   Adaptive Queue           | |   Account & Security      | | Default library view [Table v]                      |                                    |
|                            | |                           | | Taste stance [Skeptical but fair v]                 |                                    |
| INTELLIGENCE               | |                           | | Queue behavior                                      |                                    |
|   Taste Profile            | |                           | | [x] Suggest dropping low-value items                |                                    |
|   TasteGraph               | |                           | | [x] Warn before long low-confidence series          |                                    |
|   Anti-Generic Filter      | |                           | | [Cancel]                              [Save Changes]|                                    |
|   Media Archaeologist      | +---------------------------+ +------------------------------------------------------+                                   |
|   Critic Council           |                                                                                                                          |
|   Personal Canon           |                                                                                                                          |
|   Adaptation Intel         |                                                                                                                          |
|                            |                                                                                                                          |
| SYSTEM                     |                                                                                                                          |
|   Insights                 |                                                                                                                          |
|   Import                   |                                                                                                                          |
|   Activity                 |                                                                                                                          |
| > Settings                 |                                                                                                                          |
|                            |                                                                                                                          |
| User: You                  |                                                                                                                          |
| [Mood: Unknown] [Logout]   |                                                                                                                          |
+----------------------------+--------------------------------------------------------------------------------------------------------------------------+
```

## Element and Button Functions

| Element / Control | Required Function |
|---|---|
| Save Changes | Save dirty preferences. |
| Settings subnav | Route between settings pages. |
| Display name | Update user display name. |
| Default start page | Set post-login route. |
| Default library view | Set table/grid preference. |
| Taste stance | Set recommender tone. |
| Queue behavior | Control warnings/suggestions. |
| Cancel | Revert unsaved changes. |

## Data Needed

- userProfile
- uiPreferences
- tasteStance
- queuePreferences

## Loading, Empty, and Error States

- **Loading:** Skeleton form.
- **Saving:** Disable inputs.
- **Error:** Field/API errors.
- **Unsaved:** Warn before navigation.

## Shared Components Used

- `AppShell`
- `PageHeader`
- `SettingsSubnav`
- `SettingsForm`
- `Select`
- `Checkbox`

## Implementation Notes

Use same settings subnav for all settings pages.
