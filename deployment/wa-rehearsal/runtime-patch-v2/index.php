<?php
declare(strict_types=1);
require_once __DIR__ . '/aab-local/app/country-runtime-guard.php';
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
header('Cache-Control: no-store');
?><!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>AAB Western Australia — Rehearsal entry</title>
  <link rel="stylesheet" href="/entry.css?v=2">
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" defer></script>
  <script src="/entry.js?v=2" defer></script>
</head>
<body>
  <main class="shell">
    <header><span class="mark">AAB</span><span>WESTERN AUSTRALIA</span><strong>INTERNAL REHEARSAL</strong></header>
    <section class="panel">
      <p class="eyebrow">Governed country entry</p>
      <h1>Verify your approved email.</h1>
      <p class="lead">This isolated rehearsal accepts existing WA members only. Email verification confirms identity; persisted membership determines authority and dashboard routing.</p>
      <div id="message" class="message">Preparing secure entry…</div>
      <div id="error" class="error" role="alert"></div>
      <form id="email-form" hidden>
        <label>Email address<input id="email" type="email" autocomplete="email" required></label>
        <div id="turnstile-widget" class="turnstile"></div>
        <button id="send" disabled>Send six-digit verification code</button>
      </form>
      <form id="code-form" hidden>
        <p>Enter the newest code sent to <strong id="code-email"></strong>.</p>
        <label>Six-digit code<input id="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required></label>
        <button>Verify and enter AAB</button>
        <button class="secondary" type="button" id="restart">Use another email</button>
      </form>
      <aside><strong>Rehearsal boundary</strong><span>No government, production, legal or automatic scientific authority is created here.</span></aside>
    </section>
  </main>
</body>
</html>
