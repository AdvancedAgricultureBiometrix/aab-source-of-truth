# AAB Platform Owner Trust Gate deployment candidate

This is a controlled deployment candidate, not evidence of live browser validation.

## File

- `aab-admin-trust-gate.v02.js` (upload as `aab-admin-trust-gate.js`)

Upload it beside `aab-admin.js` in the protected Platform Administration directory.

Add this deferred script after `aab-admin.js` and before `aab-admin-security.js`:

```html
<script src="./aab-admin-trust-gate.js?v=02" defer></script>
```

## Boundary

The module:

- reuses the existing protected Supabase client;
- checks the current and next Authenticator Assurance Level;
- permits TOTP enrolment and challenge/verification;
- displays the QR code and manual secret only in the current browser DOM;
- does not persist or log the TOTP secret;
- removes cancelled unverified factors;
- does not create a nomination, invitation, activation, membership or authority;
- clearly states that AAL2 is authentication assurance, not authorization.
- requests the controlled nomination context only after AAL2 is proven;
- presents server-supplied purpose choices rather than free-form rationale;
- calls the v2 nomination RPC with only an email and controlled purpose code;
- creates a nomination decision only, never handoff, invitation, activation, membership or authority.

The database independently requires Platform Owner authority, `aal2` and a real `session_id`. It resolves the canonical document and rationale on the server. Browser state, a browser-supplied hash or browser-supplied free text cannot satisfy or alter that gate.

## Required rehearsal sequence

1. Upload the module and add the single script include.
2. Sign in through the existing Turnstile and email OTP path.
3. Confirm the Trust Gate reports `AAL1`.
4. Register a TOTP authenticator and verify the newest code.
5. Confirm the Trust Gate reports `AAL2`.
6. Sign out and sign in again.
7. Confirm the registered factor is challenged before any future sensitive action.
8. Inspect Auth logs and verify that no QR secret, OTP or TOTP code was recorded.

The original Trust Gate sequence has passed live. The controlled nomination UI still requires its own live, stop-on-failure rehearsal. Creating a nomination must be a deliberate user action; handoff remains a separate future action.
