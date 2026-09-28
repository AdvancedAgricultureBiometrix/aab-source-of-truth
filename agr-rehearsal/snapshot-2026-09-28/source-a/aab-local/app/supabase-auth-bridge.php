<?php
declare(strict_types=1);

function aab_supabase_auth_fail(string $code, int $status = 401): never {
  http_response_code($status);
  header('Content-Type: application/json; charset=utf-8');
  header('Cache-Control: no-store');
  echo json_encode(['ok' => false, 'error' => $code]);
  exit;
}

function aab_supabase_bearer_token(): string {
  $header = trim((string)($_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? ''));
  if (!preg_match('/^Bearer\s+(.+)$/i', $header, $match)) return '';
  return trim((string)$match[1]);
}

function aab_supabase_http(string $method, string $url, array $headers, ?string $body = null): array {
  if (!function_exists('curl_init')) aab_supabase_auth_fail('CURL_REQUIRED_FOR_SUPABASE_AUTH', 503);
  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CUSTOMREQUEST => $method,
    CURLOPT_HTTPHEADER => $headers,
    CURLOPT_TIMEOUT => 12,
    CURLOPT_CONNECTTIMEOUT => 5,
    CURLOPT_FOLLOWLOCATION => false,
  ]);
  if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
  $response = curl_exec($ch);
  $error = curl_error($ch);
  $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  if ($response === false || $error !== '') return ['ok' => false, 'status' => 0, 'json' => null];
  $json = json_decode((string)$response, true);
  return ['ok' => $status >= 200 && $status < 300, 'status' => $status, 'json' => is_array($json) ? $json : null];
}

function aab_supabase_require_auth(): array {
  $url = rtrim(trim((string)getenv('AAB_SUPABASE_URL')), '/');
  $key = trim((string)getenv('AAB_SUPABASE_PUBLISHABLE_KEY'));
  $token = aab_supabase_bearer_token();
  if ($url === '' || $key === '') aab_supabase_auth_fail('SUPABASE_PUBLIC_CONFIG_MISSING', 503);
  if ($token === '') aab_supabase_auth_fail('AUTHENTICATION_REQUIRED', 401);
  $headers = ['apikey: ' . $key, 'Authorization: Bearer ' . $token, 'Content-Type: application/json'];
  $userResponse = aab_supabase_http('GET', $url . '/auth/v1/user', $headers);
  $user = $userResponse['json'];
  if (!$userResponse['ok'] || !is_array($user) || empty($user['id']) || empty($user['email'])) {
    aab_supabase_auth_fail('SUPABASE_SESSION_INVALID', 401);
  }
  if (empty($user['email_confirmed_at']) && empty($user['confirmed_at'])) {
    aab_supabase_auth_fail('CONFIRMED_EMAIL_REQUIRED', 403);
  }
  $entryResponse = aab_supabase_http('POST', $url . '/rest/v1/rpc/aab_resolve_entry', $headers, '{}');
  $entry = $entryResponse['json'];
  if (!$entryResponse['ok'] || !is_array($entry)) aab_supabase_auth_fail('PERSISTED_MEMBERSHIP_RESOLUTION_FAILED', 403);
  return [
    'ok' => true,
    'user' => ['id' => (string)$user['id'], 'email' => (string)$user['email'], 'role' => 'SUPABASE_AUTHENTICATED'],
    'session' => ['user_id' => (string)$user['id']],
    'entry' => $entry,
    'auth_source' => 'supabase_access_token',
  ];
}
