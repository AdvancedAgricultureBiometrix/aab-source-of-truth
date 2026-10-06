<?php
declare(strict_types=1);
require_once dirname(__DIR__, 2) . '/aab-local/app/country-runtime-guard.php';
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
header('Cache-Control: no-store');
?><!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>AAB Western Australia — Controlled activation</title>
  <link rel="stylesheet" href="/onboarding/activate/onboarding.css?v=1">
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" defer></script>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2" defer></script>
  <script src="/onboarding/activate/onboarding.js?v=1" defer></script>
</head>
<body>
<main class="shell">
  <header><span class="mark">AAB</span><span>WESTERN AUSTRALIA</span><strong>INTERNAL REHEARSAL</strong></header>
  <section class="panel">
    <p class="eyebrow">Controlled head-admin activation</p>
    <h1>Complete each gate in order.</h1>
    <p class="lead">This is an isolated rehearsal. Identity verification does not create authority. Membership exists only after the final server-controlled gate succeeds.</p>
    <div id="message" class="message" role="status" aria-live="polite">Preparing secure activation…</div>
    <div id="error" class="error" role="alert"></div>

    <section id="identity" hidden><h2>1. Verify the nominated email</h2><form id="email-form"><label>Email address<input id="email" type="email" autocomplete="email" required></label><div id="turnstile-widget"></div><button id="send" disabled>Send six-digit verification code</button></form><form id="code-form" hidden><label>Six-digit code<input id="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required></label><button>Verify email</button></form></section>

    <section id="claim" hidden><h2>2. Claim the pending activation</h2><label>Activation code<input id="activation-code" autocomplete="off" spellcheck="false" required></label><label>Workspace name<input id="workspace-name" value="AAB Western Australia Rehearsal" required></label><label>Language<select id="language"><option value="en">English</option></select></label><label>Timezone<input id="timezone" value="Australia/Perth" required></label><button id="claim-button">Claim activation</button></section>

    <section id="profile" hidden><h2>3. Complete the accountable profile</h2><label>Full name<input id="full-name" autocomplete="name" required></label><label>Official position<input id="position" required></label><label>Institution or office<input id="institution" required></label><button id="profile-button">Save accountable profile</button></section>

    <section id="document" hidden><h2>4. Review and acknowledge the rehearsal document</h2><div id="document-details" class="boundary"></div><button id="open-document" class="secondary">Open the verified PDF</button><label class="check"><input id="ack-check" type="checkbox"><span>I acknowledge this test-only document for the sole purpose of rehearsing the AAB WA onboarding workflow.</span></label><button id="ack-button" disabled>Record rehearsal acknowledgement</button></section>

    <section id="finalize" hidden><h2>5. Finalize the rehearsal membership</h2><p>The server will re-check the claimed activation, profile, exact document acknowledgement and rehearsal boundaries.</p><button id="finalize-button">Finalize and enter the WA rehearsal</button></section>
    <aside><strong>Immutable boundary</strong><span>No government authority, production authority, legal effect, external invitation right, scientific authority or automatic promotion is created.</span></aside>
  </section>
</main>
</body>
</html>
