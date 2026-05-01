# 04 - Login Page

## Route

`/login`

## Purpose

Allows an existing user to access CanonOS.

## Required Layout

Use `AuthShell`. No authenticated sidebar/topbar.

## ASCII Wireframe

```text
+-----------------------------------------------------------------------------------------------------------------------------------------------------+
| CanonOS                                                                                                                                             |
| Private Media Intelligence                                                                                                                          |
|-----------------------------------------------------------------------------------------------------------------------------------------------------|
|                                                                                                                                                     |
|                                               +----------------------------------------------------+                                                |
|                                               | Welcome back                                       |                                                |
|                                               | Access your private media system.                  |                                                |
|                                               |----------------------------------------------------|                                                |
|                                               | Email                                              |                                                |
|                                               | [ you@example.com ]                                |                                                |
|                                               | Password                                           |                                                |
|                                               | [ ******** ]                                       |                                                |
|                                               | [ ] Remember me        (Forgot password?)          |                                                |
|                                               |                                                    |                                                |
|                                               | [Login]                                            |                                                |
|                                               | New to CanonOS? (Create account)                   |                                                |
|                                               +----------------------------------------------------+                                                |
|                                                                                                                                                     |
| Footer: Private by default. No public profile unless enabled.                                                                                       |
+-----------------------------------------------------------------------------------------------------------------------------------------------------+
```

## Element and Button Functions

| Element / Control | Required Function |
|---|---|
| Email input | Required. Validate email format. |
| Password input | Required. Hidden by default. |
| Remember me | Requests longer session when supported. |
| Forgot password | Route to `/forgot-password`. |
| Login | Submit credentials. On success route to onboarding if incomplete, otherwise dashboard. |
| Create account | Route to `/register`. |

## Data Needed

- email
- password
- rememberMe
- auth response
- onboarding completion status

## Loading, Empty, and Error States

- **Loading:** Disable form and show loading on Login.
- **Error:** Show inline auth error without clearing email.
- **Success:** Store auth state and redirect.

## Shared Components Used

- `AuthShell`
- `AuthCard`
- `TextInput`
- `PasswordInput`
- `Checkbox`
- `Button`
- `InlineError`

## Implementation Notes

Store auth/session in Zustand. Clear SWR cache on login.
