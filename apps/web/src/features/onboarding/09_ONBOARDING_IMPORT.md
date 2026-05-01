# 09 - Onboarding Import

## Route

`/onboarding/import`

## Purpose

Allows importing previous media history or starting empty.

## Required Layout

Use `OnboardingShell`. Import preview card required.

## ASCII Wireframe

```text
+-----------------------------------------------------------------------------------------------------------------------------------------------------+
| CanonOS   Step 3 of 4                                                                                                                               |
|-----------------------------------------------------------------------------------------------------------------------------------------------------|
| Bring in your existing history.                                                                                                                     |
| CanonOS works better when it knows what you already watched, read, heard, dropped.                                                                  |
|-----------------------------------------------------------------------------------------------------------------------------------------------------|
| +---------------------+ +---------------------+ +---------------------+                                                                             |
| | CSV / Spreadsheet   | | JSON File           | | Manual Start        |                                                                             |
| | Ratings and titles  | | Existing export     | | Add later yourself  |                                                                             |
| | [Upload CSV]        | | [Upload JSON]       | | [Start Empty]       |                                                                             |
| +---------------------+ +---------------------+ +---------------------+                                                                             |
| Sources: [Letterboxd] [IMDb] [Trakt] [MAL] [AniList] [Goodreads] [Custom]                                                                           |
| +----------------------------------------------------------------------------+                                                                      |
| | Import Preview                                                             |                                                                      |
| | No file selected yet.                                                       |                                                                     |
| +----------------------------------------------------------------------------+                                                                      |
| [Back]                                                    [Skip] [Continue]                                                                         |
+-----------------------------------------------------------------------------------------------------------------------------------------------------+
```

## Element and Button Functions

| Element / Control | Required Function |
|---|---|
| Upload CSV | Open file picker and parse preview. |
| Upload JSON | Open file picker and parse preview. |
| Start Empty | Continue without imported history. |
| Source chips | Guide parser selection; disabled if unsupported. |
| Preview card | Show item count, duplicates, errors. |
| Skip | Route to finish without import. |
| Continue | Start import if file selected, otherwise finish. |

## Data Needed

- file
- source
- parsedPreview
- duplicateCount
- importJobId

## Loading, Empty, and Error States

- **Empty:** Preview says no file selected.
- **Parsing:** Show progress in preview card.
- **Error:** Show parsing errors and allow re-upload.

## Shared Components Used

- `OnboardingShell`
- `UploadCard`
- `SourceChip`
- `ImportPreview`
- `Button`

## Implementation Notes

External source chips must not imply active sync unless backend supports it.
