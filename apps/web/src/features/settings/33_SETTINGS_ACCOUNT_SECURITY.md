# 33 - Settings - Account and Security

## Route

`/app/settings/account-security`

## Purpose

Manages email, password, sessions, privacy, data export, and account deletion.

## Required Layout

Use `AppShell`. Active sidebar item: Settings. Same settings subnav.

## ASCII Wireframe

```text
+----------------------------+--------------------------------------------------------------------------------------------------------------------------+
| CanonOS                    | Settings / Account    [Cmd+K Search]  [+ Add Media] [Evaluate] [Me]                                                      |
| Private Media Intelligence | ------------------------------------------------------------------------------------------------------------------------ |
| [Search library/pages]     | Settings                                                                                                                 |
|                            | Account, security, sessions, and privacy controls.                                                                       |
| CORE                       | ------------------------------------------------------------------------------------------------------------------------ |
|   Dashboard                | +---------------------------+ +------------------------------------------------------+                                   |
|   Tonight Mode             | | Settings Sections         | | Account and Security                               |                                     |
|   Candidate Evaluator      | |   Profile & Preferences   | | Email: you@example.com                 [Change Email]|                                   |
|   Library                  | |   Data & Integrations     | | Password last changed: unknown        [Change Pass] |                                    |
|   Adaptive Queue           | | > Account & Security      | | Active sessions                                    |                                     |
|                            | |                           | | Current device                         [Sign out all]|                                   |
| INTELLIGENCE               | |                           | | Privacy                                            |                                     |
|   Taste Profile            | |                           | | [x] Keep profile private by default                |                                     |
|   TasteGraph               | |                           | | [x] Do not share taste data externally             |                                     |
|   Anti-Generic Filter      | |                           | | Danger zone                                        |                                     |
|   Media Archaeologist      | |                           | | [Export Account Data] [Delete Account]             |                                     |
|   Critic Council           | +---------------------------+ +------------------------------------------------------+                                   |
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
| Change Email | Open email modal with password confirmation if required. |
| Change Pass | Open password change modal. |
| Sign out all | Confirm and invalidate other sessions. |
| Privacy checkboxes | Save privacy settings. |
| Export Account Data | Start export job. |
| Delete Account | Destructive flow with typed confirmation. |

## Data Needed

- accountEmail
- passwordMetadata
- sessions
- privacySettings
- exportJobStatus
- deleteStatus

## Loading, Empty, and Error States

- **Loading:** Skeleton sections.
- **Saving privacy:** Inline saving state.
- **Modal validation:** Field-level modal errors.
- **Danger action:** Deletion requires typed confirmation.

## Shared Components Used

- `AppShell`
- `PageHeader`
- `SettingsSubnav`
- `AccountSecurityPanel`
- `ChangeEmailModal`
- `ChangePasswordModal`
- `ConfirmDialog`

## Implementation Notes

Security actions must be conservative and confirmation-heavy.
