# AAB Platform Owner Trust Gate deployment candidate

This is a controlled deployment candidate, not evidence of live browser validation.

## File

- `aab-admin-trust-gate.js`

Upload it beside `aab-admin.js` in the protected Platform Administration directory.

Add this deferred script after `aab-admin.js` and before `aab-admin-security.js`:

```html
<script src="./aab-admin-trust-gate.js?v=01" defer></script>
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

The database independently requires `aal2` and a real `session_id` for the internal-rehearsal nomination RPC. Browser state alone cannot satisfy that gate.

## Required rehearsal sequence

1. Upload the module and add the single script include.
2. Sign in through the existing Turnstile and email OTP path.
3. Confirm the Trust Gate reports `AAL1`.
4. Register a TOTP authenticator and verify the newest code.
5. Confirm the Trust Gate reports `AAL2`.
6. Sign out and sign in again.
7. Confirm the registered factor is challenged before any future sensitive action.
8. Inspect Auth logs and verify that no QR secret, OTP or TOTP code was recorded.

Do not add the internal nomination action until this sequence passes.
