<?php
declare(strict_types=1);
require_once dirname(__DIR__, 2) . '/aab-local/app/country-runtime-guard.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
echo json_encode([
  'ok' => true,
  'projectRef' => (string)getenv('AAB_SUPABASE_PROJECT_REF'),
  'supabaseUrl' => (string)getenv('AAB_SUPABASE_URL'),
  'publishableKey' => (string)getenv('AAB_SUPABASE_PUBLISHABLE_KEY'),
'turnstileSiteKey' => (string)getenv('AAB_TURNSTILE_SITE_KEY'),
], JSON_UNESCAPED_SLASHES);
