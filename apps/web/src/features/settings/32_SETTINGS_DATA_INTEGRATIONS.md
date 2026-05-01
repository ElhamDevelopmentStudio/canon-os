# 32 - Settings - Data and Integrations

## Route

`/app/settings/integrations`

## Purpose

Manages metadata lookup, external source statuses, exports, graph rebuild, and cache maintenance.

## Required Layout

Use `AppShell`. Active sidebar item: Settings. Same settings subnav.

## ASCII Wireframe

```text
+----------------------------+--------------------------------------------------------------------------------------------------------------------------+
| CanonOS                    | Settings / Data    [Cmd+K Search]  [+ Add Media] [Evaluate] [Me]                                                         |
| Private Media Intelligence | ------------------------------------------------------------------------------------------------------------------------ |
| [Search library/pages]     | Settings                                                                                                 [Save Changes]  |
|                            | Manage data sources, exports, and integrations.                                                                          |
| CORE                       | ------------------------------------------------------------------------------------------------------------------------ |
|   Dashboard                | +---------------------------+ +------------------------------------------------------+                                   |
|   Tonight Mode             | | Settings Sections         | | Data and Integrations                               |                                    |
|   Candidate Evaluator      | |   Profile & Preferences   | | Metadata lookup                                     |                                    |
|   Library                  | | > Data & Integrations     | | [x] Allow metadata fetching when available          |                                    |
|   Adaptive Queue           | |   Account & Security      | | Preferred source [Auto v]                           |                                    |
|                            | |                           | | External sources                                    |                                    |
| INTELLIGENCE               | |                           | | Letterboxd   Not connected   [Configure]           |                                     |
|   Taste Profile            | |                           | | IMDb         Not connected   [Configure]           |                                     |
|   TasteGraph               | |                           | | MAL/AniList  Not connected   [Configure]           |                                     |
|   Anti-Generic Filter      | |                           | | Goodreads    Not connected   [Configure]           |                                     |
|   Media Archaeologist      | |                           | | Data maintenance                                    |                                    |
|   Critic Council           | |                           | | [Export All Data] [Rebuild TasteGraph]             |                                     |
|   Personal Canon           | |                           | | [Clear Cached Metadata]                             |                                    |
|   Adaptation Intel         | |                           | | [Cancel]                              [Save Changes]|                                    |
|                            | +---------------------------+ +------------------------------------------------------+                                   |
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
| Save Changes | Save integration preferences. |
| Metadata fetching | Allow/disallow automatic lookup. |
| Preferred source | Provider priority. |
| Configure | Open integration modal or disabled coming-later state. |
| Export All Data | Start export job. |
| Rebuild TasteGraph | Trigger graph rebuild job. |
| Clear Cached Metadata | Confirm then clear nonessential cache. |
| Cancel | Revert changes. |

## Data Needed

- metadataPreferences
- integrationStatuses
- exportJobs
- graphRebuildJobs
- cacheSettings

## Loading, Empty, and Error States

- **Loading:** Skeleton rows.
- **Job running:** Progress/toast.
- **Unavailable:** Disabled configure with tooltip.
- **Error:** Retry/inline error.

## Shared Components Used

- `AppShell`
- `PageHeader`
- `SettingsSubnav`
- `IntegrationRow`
- `SettingsForm`
- `ConfirmDialog`

## Implementation Notes

Never show fake connected states.
