# 05 - Register Page

## Route

`/register`

## Purpose

Creates a new private CanonOS account and sends the user into onboarding.

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
|                                               | Create your CanonOS                                |                                                |
|                                               | Start building your private taste map.             |                                                |
|                                               |----------------------------------------------------|                                                |
|                                               | Display name                                       |                                                |
|                                               | [ You ]                                            |                                                |
|                                               | Email                                              |                                                |
|                                               | [ you@example.com ]                                |                                                |
|                                               | Password                                           |                                                |
|                                               | [ ******** ]                                       |                                                |
|                                               | Confirm password                                   |                                                |
|                                               | [ ******** ]                                       |                                                |
|                                               |                                                    |                                                |
|                                               | [Create Account]                                   |                                                |
|                                               | Already have an account? (Login)                   |                                                |
|                                               +----------------------------------------------------+                                                |
|                                                                                                                                                     |
| Footer: Private by default. No public profile unless enabled.                                                                                       |
+-----------------------------------------------------------------------------------------------------------------------------------------------------+
```

## Element and Button Functions

| Element / Control | Required Function |
|---|---|
| Display name | Required. Used in sidebar/user profile. |
| Email | Required. Validate format. |
| Password | Required. Validate backend password policy. |
| Confirm password | Must match password. |
| Create Account | Create account and route to `/onboarding/welcome`. |
| Login | Route to `/login`. |

## Data Needed

- displayName
- email
- password
- confirmPassword

## Loading, Empty, and Error States

- **Loading:** Disable form while creating account.
- **Error:** Show field-level errors.
- **Success:** Route to onboarding welcome.

## Shared Components Used

- `AuthShell`
- `AuthCard`
- `TextInput`
- `PasswordInput`
- `Button`
- `InlineError`

## Implementation Notes

Do not collect taste data here; onboarding handles that.
