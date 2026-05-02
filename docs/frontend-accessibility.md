# Frontend Accessibility Checklist

Use this checklist for every new API-backed page or shared component.

- Page has one clear `h1`.
- Primary content is inside the shared `main` landmark.
- Forms use visible labels or accessible names for every input.
- Buttons describe the action without relying only on icons.
- Icon-only buttons include `aria-label`.
- Loading, empty, error, and success states are reachable by screen readers.
- Focus styles are visible for keyboard navigation.
- Dialogs use `role="dialog"`, `aria-modal="true"`, and an accessible title.
- Destructive actions require confirmation or an undo-safe flow.
- Browser e2e selectors prefer roles, labels, and headings over test IDs.
