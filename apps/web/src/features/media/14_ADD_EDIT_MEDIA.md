# 14 - Add/Edit Media

## Route

`/app/library/new and /app/library/:mediaId/edit`

## Purpose

Creates or edits a media item across all supported media types.

## Required Layout

Use `AppShell` for full page. Reuse same `MediaForm` inside global Add Media drawer.

## ASCII Wireframe

```text
+----------------------------+--------------------------------------------------------------------------------------------------------------------------+
| CanonOS                    | Library / Add Media    [Cmd+K Search]  [+ Add Media] [Evaluate] [Me]                                                     |
| Private Media Intelligence | ------------------------------------------------------------------------------------------------------------------------ |
| [Search library/pages]     | Add Media                                                                                                  [Save Media]  |
|                            | Add a movie, series, anime, novel, or audiobook.                                                                         |
| CORE                       | ------------------------------------------------------------------------------------------------------------------------ |
|   Dashboard                | +----------------------------------------------------+ +------------------------+                                        |
|   Tonight Mode             | | Basic Information                                  | | Quick Classification   |                                        |
|   Candidate Evaluator      | | Title                    [                     ]   | | Medium [Movie v]       |                                        |
| > Library                  | | Original title           [                     ]   | | Status [Planned v]     |                                        |
|   Adaptive Queue           | | Year [      ] Runtime/Length [                 ]   | | Ownership [None v]     |                                        |
|                            | | Country [ v ] Language [ v ]                       | | [Auto Fetch Metadata]  |                                        |
| INTELLIGENCE               | | Creator/Director/Author [                     ]   | | [ ] Evaluate after save|                                         |
|   Taste Profile            | | Source URL / External ID [                    ]   | +------------------------+                                         |
|   TasteGraph               | +----------------------------------------------------+                                                                   |
|   Anti-Generic Filter      | +----------------------------------------------------+                                                                   |
|   Media Archaeologist      | | Personal Starting Signals                          |                                                                   |
|   Critic Council           | | [ ] I expect this to be great                      |                                                                   |
|   Personal Canon           | | [ ] I suspect this may be generic                  |                                                                   |
|   Adaptation Intel         | | [ ] I want to sample only                          |                                                                   |
|                            | | Notes [                                          ] |                                                                   |
| SYSTEM                     | | [Cancel]                                      [Save]|                                                                  |
|   Insights                 | +----------------------------------------------------+                                                                   |
|   Import                   |                                                                                                                          |
|   Activity                 |                                                                                                                          |
|   Settings                 |                                                                                                                          |
|                            |                                                                                                                          |
| User: You                  |                                                                                                                          |
| [Mood: Unknown] [Logout]   |                                                                                                                          |
+----------------------------+--------------------------------------------------------------------------------------------------------------------------+
```

## Element and Button Functions

| Element / Control | Required Function |
|---|---|
| Save Media | Save and route to detail page. |
| Medium select | Controls type-specific fields. |
| Status select | Sets planned/watching/reading/listening/completed/dropped/paused. |
| Auto Fetch Metadata | Call metadata lookup; do not overwrite user fields without confirmation. |
| Evaluate after save | After save, route to evaluator with item prefilled. |
| Starting signals | Seed evaluator/TasteGraph. |
| Cancel | Return previous page; confirm if dirty. |
| Save | Same as top Save Media action. |

## Data Needed

- title
- originalTitle
- medium
- status
- year
- runtimeOrLength
- country
- language
- creators
- externalIds
- notes
- startingSignals

## Loading, Empty, and Error States

- **Loading edit:** Skeleton form.
- **Saving:** Disable submit buttons.
- **Validation:** Title and medium are required.
- **Metadata conflict:** Show confirmation before replacing fields.

## Shared Components Used

- `AppShell`
- `PageHeader`
- `MediaForm`
- `FormSection`
- `Select`
- `Checkbox`
- `Textarea`
- `Button`
- `ConfirmDialog`

## Implementation Notes

One form component must power create, edit, and drawer usage.
