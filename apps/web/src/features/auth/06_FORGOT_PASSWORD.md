# 06 - Forgot Password Page

## Route

`/forgot-password`

## Purpose

Allows user to request password reset instructions.

## Required Layout

Use `AuthShell`.

## ASCII Wireframe

```text
+-----------------------------------------------------------------------------------------------------------------------------------------------------+
| CanonOS                                                                                                                                             |
| Private Media Intelligence                                                                                                                          |
|-----------------------------------------------------------------------------------------------------------------------------------------------------|
|                                                                                                                                                     |
|                                               +----------------------------------------------------+                                                |
|                                               | Reset password                                     |                                                |
|                                               | Enter your email to receive a reset link.          |                                                |
|                                               |----------------------------------------------------|                                                |
|                                               | Email                                              |                                                |
|                                               | [ you@example.com ]                                |                                                |
|                                               |                                                    |                                                |
|                                               | [Send Reset Link]                                  |                                                |
|                                               | Remembered it? (Back to login)                     |                                                |
|                                               +----------------------------------------------------+                                                |
|                                                                                                                                                     |
| Footer: Private by default. No public profile unless enabled.                                                                                       |
+-----------------------------------------------------------------------------------------------------------------------------------------------------+
```

## Element and Button Functions

| Element / Control | Required Function |
|---|---|
| Email | Required. Validate format. |
| Send Reset Link | Submit request. Show generic success whether account exists or not. |
| Back to login | Route to `/login`. |

## Data Needed

- email
- request status

## Loading, Empty, and Error States

- **Loading:** Disable form while sending.
- **Success:** Replace form with generic sent-message.
- **Error:** Show network/server retry.

## Shared Components Used

- `AuthShell`
- `AuthCard`
- `TextInput`
- `Button`
- `InlineError`

## Implementation Notes

Use generic copy to avoid account enumeration.
