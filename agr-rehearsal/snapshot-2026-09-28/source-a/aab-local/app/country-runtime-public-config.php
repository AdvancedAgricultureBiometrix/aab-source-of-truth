<?php
declare(strict_types=1);
require_once __DIR__ . '/country-runtime-guard.php';
header('Content-Type: application/javascript; charset=utf-8');
header('Cache-Control: no-store');
$config = [
  'project_ref' => (string)getenv('AAB_SUPABASE_PROJECT_REF'),
  'supabase_url' => (string)getenv('AAB_SUPABASE_URL'),
  'publishable_key' => (string)getenv('AAB_SUPABASE_PUBLISHABLE_KEY'),
  'country_code' => (string)getenv('AAB_COUNTRY_CODE'),
  'environment' => (string)getenv('AAB_DEPLOYMENT_ENV'),
  'auth_entry_path' => (string)(getenv('AAB_AUTH_ENTRY_PATH') ?: '/'),
];
echo 'window.AAB_COUNTRY_RUNTIME_CONFIG=Object.freeze(' . json_encode($config, JSON_UNESCAPED_SLASHES) . ');';
