# CanonOS Frontend Lo-Fi Wireframe Document

This document is part of the CanonOS frontend wireframe pack. It is written for implementation.
Treat ASCII layout as low-fidelity structure requirements. Visual polish and exact spacing can be refined.

# 01 - Shared Layout and Components
Use one `AppShell` for all authenticated routes:
- `SidebarNav` (expanded 272px, collapsed 80px)
- `TopBar` (search, mood, quick add, notifications, user menu)
- `PageHeader` (title, subtitle, actions)
- `PageContent`

```text
+---------------------------+------------------------------------------------------------+
| SidebarNav                | TopBar                                                     |
|                           +------------------------------------------------------------+
|                           | PageHeader                                                 |
|                           +------------------------------------------------------------+
|                           | PageContent                                                |
+---------------------------+------------------------------------------------------------+
```
