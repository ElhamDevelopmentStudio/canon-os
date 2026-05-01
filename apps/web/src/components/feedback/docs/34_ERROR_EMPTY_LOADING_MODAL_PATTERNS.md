# 34 - Error, Empty, Loading, Modal, and Drawer Patterns

## Purpose

Defines shared UX states used by all pages. Use these exact patterns instead of inventing page-specific alternatives.

## Loading Pattern

```text
+--------------------------------------------------------------------------------+
| Page Title                                      [Disabled Action]               |
| Loading required data...                                                        |
|--------------------------------------------------------------------------------|
| +------------------+ +------------------+ +------------------+                 |
| | ////// ///////// | | ////// ///////// | | ////// ///////// |                 |
| | ////// ///////// | | ////// ///////// | | ////// ///////// |                 |
| +------------------+ +------------------+ +------------------+                 |
| +--------------------------------------------------------------------------+   |
| | ////// ///////// ////// ///////// ////// /////////                        |   |
| +--------------------------------------------------------------------------+   |
+--------------------------------------------------------------------------------+
```

Rules:
- Use skeletons, not full-page spinners.
- Keep AppShell visible.
- Disable only controls that cannot be used.
- Background jobs show progress and keep the page usable.

## Empty State Pattern

```text
+--------------------------------------------------------------------------------+
| +--------------------------------------------------------------------------+   |
| | No items yet                                                             |   |
| | Start by adding media manually or importing existing history.             |   |
| | [Primary Empty Action] [Secondary Action]                                 |   |
| +--------------------------------------------------------------------------+   |
+--------------------------------------------------------------------------------+
```

Rules:
- Explain why the area is empty.
- Always include one primary next action.
- Use secondary action only if useful.

## Error State Pattern

```text
+--------------------------------------------------------------------------------+
| +--------------------------------------------------------------------------+   |
| | Something failed                                                         |   |
| | CanonOS could not load this data. Your saved data was not changed.        |   |
| | [Retry] [Go Back]                                                        |   |
| +--------------------------------------------------------------------------+   |
+--------------------------------------------------------------------------------+
```

Rules:
- Preserve user input whenever possible.
- Avoid raw backend exception text.
- Always provide Retry when useful.

## Confirmation Dialog Pattern

```text
+----------------------------------------------------------+
| Confirm action                                           |
|----------------------------------------------------------|
| Explain exactly what will happen and whether it can be   |
| undone.                                                  |
| [Cancel]                                      [Confirm]  |
+----------------------------------------------------------+
```

Required for:
- Delete
- Drop
- Skip
- Clear cached metadata
- Sign out all
- Delete account

## Add/Edit Drawer Pattern

```text
+--------------------------------------------------------------------------------+
| Main page content                                                      +-------+|
|                                                                        |Drawer ||
|                                                                        |Title  ||
|                                                                        |------ ||
|                                                                        |Form   ||
|                                                                        |------ ||
|                                                                        |Cancel||
|                                                                        |Save  ||
|                                                                        +-------+|
+--------------------------------------------------------------------------------+
```

Rules:
- Use for quick create/edit.
- Full page route uses same form component.
- Dirty drawer warns before close.

## Toast Pattern

```text
+---------------------------------------------+
| Action completed                            |
| Short success/failure message.      [Undo]  |
+---------------------------------------------+
```

Rules:
- Use success toast after save/import/queue.
- Use error toast for background job failure.
- Show Undo only when safe.

## Modal Inventory

| Modal/Drawer | Triggered From | Purpose |
|---|---|---|
| Add Media Drawer | Global `+ Add Media`, Library | Create media item. |
| Edit Media Drawer | Media Detail, row menu | Edit media item. |
| Add to Season Modal | Media Detail, Library row | Add media to season. |
| Edit Signals Modal | Taste Profile | Edit taste signals. |
| Job Detail Drawer | Import page | Inspect import job rows/errors. |
| Change Email Modal | Settings Account | Change email. |
| Change Password Modal | Settings Account | Change password. |
| Confirm Delete Dialog | Destructive actions | Confirm deletion/removal. |
| Advanced Search Drawer | Search page | Full search filter controls. |

## Accessibility Rules

- Every icon button must have visible text or aria-label.
- Every input must have a label.
- Dialog focus must be trapped.
- Toasts must not be the only place critical information appears.
- Color must not be the only decision/risk signal.
