<?php
declare(strict_types=1);

/**
 * AAB sovereign country runtime deployment guard.
 *
 * This checks deployment identity before a server API can execute. It does not
 * replace database-side tenancy enforcement or RLS.
 */
function aab_country_runtime_fail(string $code): never {
  http_response_code(503);
  header('Content-Type: application/json; charset=utf-8');
  header('Cache-Control: no-store');
  echo json_encode(['ok' => false, 'error' => $code]);
  exit;
}

$runtimeKind = trim((string)getenv('AAB_RUNTIME_KIND'));
$countryCode = strtoupper(trim((string)getenv('AAB_COUNTRY_CODE')));
$environment = strtolower(trim((string)getenv('AAB_DEPLOYMENT_ENV')));
$expectedHost = strtolower(trim((string)getenv('AAB_EXPECTED_HOST')));
$projectRef = strtolower(trim((string)getenv('AAB_SUPABASE_PROJECT_REF')));
$supabaseUrl = trim((string)getenv('AAB_SUPABASE_URL'));

if ($runtimeKind !== 'SOVEREIGN_COUNTRY_RUNTIME') aab_country_runtime_fail('COUNTRY_RUNTIME_KIND_INVALID');
if (!preg_match('/^[A-Z]{2}(?:-[A-Z0-9]{1,8})?$/', $countryCode)) aab_country_runtime_fail('COUNTRY_CODE_INVALID');
if (!in_array($environment, ['development', 'rehearsal', 'staging', 'production'], true)) aab_country_runtime_fail('DEPLOYMENT_ENVIRONMENT_INVALID');
if ($expectedHost === '' || $projectRef === '' || $supabaseUrl === '') aab_country_runtime_fail('COUNTRY_RUNTIME_IDENTITY_INCOMPLETE');

$actualHost = strtolower(preg_replace('/:\d+$/', '', (string)($_SERVER['HTTP_HOST'] ?? '')));
if (PHP_SAPI !== 'cli' && !hash_equals($expectedHost, $actualHost)) aab_country_runtime_fail('COUNTRY_RUNTIME_HOST_MISMATCH');

$supabaseHost = strtolower((string)(parse_url($supabaseUrl, PHP_URL_HOST) ?? ''));
$expectedSupabaseHost = $projectRef . '.supabase.co';
if (!hash_equals($expectedSupabaseHost, $supabaseHost)) aab_country_runtime_fail('COUNTRY_RUNTIME_PROJECT_MISMATCH');

$airtableConfigured = trim((string)getenv('AAB_AIRTABLE_BASE_ID')) !== '' || trim((string)getenv('AAB_AIRTABLE_TOKEN')) !== '';
if ($airtableConfigured) aab_country_runtime_fail('LEGACY_AIRTABLE_CONFIGURATION_FORBIDDEN');
$sqliteConfigured = trim((string)getenv('AAB_AUTH_DB_PATH')) !== '';
if ($sqliteConfigured) aab_country_runtime_fail('LEGACY_SQLITE_CONFIGURATION_FORBIDDEN');
