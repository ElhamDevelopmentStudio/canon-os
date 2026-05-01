# CanonOS Frontend Lo-Fi Wireframe Document Set

Version: v1.0

This bundle contains one separate Markdown document per CanonOS page, plus shared layout/component documents. Markdown is used because fenced ASCII wireframes are preserved exactly and are easy for an implementation agent to consume.

## How to Use

1. Read `01_SHARED_LAYOUT_AND_NAVIGATION.md`.
2. Read `02_SHARED_COMPONENTS_AND_UI_RULES.md`.
3. Read `03_PAGE_LIST_AND_ROUTING_MAP.md`.
4. Implement pages in numerical order.
5. Reuse shared components. Do not create page-specific sidebars, tables, cards, filters, dialogs, drawers, or empty states unless explicitly specified.

## Stack Assumptions

- React + Vite
- Tailwind CSS
- shadcn/ui with customized shared wrappers
- Axios
- SWR
- Zustand
- Backend APIs from DRF, documented by Swagger/Scalar
