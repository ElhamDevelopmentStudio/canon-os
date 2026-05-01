# 15 - Import Library

## Route

`/app/import`

## Purpose

Imports external media history and manages import jobs.

## Required Layout

Use `AppShell`. Active sidebar item: Import.

## ASCII Wireframe

```text
+----------------------------+--------------------------------------------------------------------------------------------------------------------------+
| CanonOS                    | Import    [Cmd+K Search]  [+ Add Media] [Evaluate] [Me]                                                                  |
| Private Media Intelligence | ------------------------------------------------------------------------------------------------------------------------ |
| [Search library/pages]     | Import Library                                                                                             [New Import]  |
|                            | Bring external media history into CanonOS.                                                                               |
| CORE                       | ------------------------------------------------------------------------------------------------------------------------ |
|   Dashboard                | +------------------------------------------+ +------------------------------------------+                                |
|   Tonight Mode             | | Start Import                             | | Import Rules                             |                                |
|   Candidate Evaluator      | | Source [CSV / Spreadsheet v]             | | [ ] Merge duplicates                     |                                |
|   Library                  | | File [Choose File] No file chosen        | | [ ] Keep external ratings                |                                |
|   Adaptive Queue           | |                                          | | [ ] Mark unknown as planned              |                                |
|                            | | [Preview Import] [Start Import]          | | [ ] Create tags from lists               |                                |
| INTELLIGENCE               | +------------------------------------------+ | [Save Rules]                             |                                |
|   Taste Profile            |                                              +------------------------------------------+                                |
|   TasteGraph               | +--------------------------------------------------------------------------------+                                       |
|   Anti-Generic Filter      | | Import Jobs                                                                    |                                       |
|   Media Archaeologist      | | Date        Source     Items   Duplicates   Status       Actions                |                                      |
|   Critic Council           | | Today       CSV        218     12           Running      View                   |                                      |
|   Personal Canon           | | Apr 29      JSON       84      3            Completed    View                   |                                      |
|   Adaptation Intel         | +--------------------------------------------------------------------------------+                                       |
|                            |                                                                                                                          |
| SYSTEM                     |                                                                                                                          |
|   Insights                 |                                                                                                                          |
| > Import                   |                                                                                                                          |
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
| New Import | Reset import form and focus source selector. |
| Source | Choose parser/source type. |
| Choose File | Open file picker. |
| Preview Import | Parse/upload for preview. |
| Start Import | Create backend import job. |
| Rule checkboxes | Control duplicates, external ratings, default status, tags. |
| Save Rules | Persist default import preferences. |
| Job View | Open import job detail drawer. |

## Data Needed

- importSources
- selectedFile
- importRules
- previewResult
- importJobs
- jobStatus

## Loading, Empty, and Error States

- **Loading:** Skeleton job table.
- **No jobs:** Show start-first-import empty state.
- **Running job:** Use SWR polling and progress.
- **Error:** Show parsing/job error and retry.

## Shared Components Used

- `AppShell`
- `PageHeader`
- `UploadPanel`
- `ImportRulesPanel`
- `ImportJobsTable`
- `JobDetailDrawer`

## Implementation Notes

Represent Celery jobs as backend import job records and poll with SWR.
