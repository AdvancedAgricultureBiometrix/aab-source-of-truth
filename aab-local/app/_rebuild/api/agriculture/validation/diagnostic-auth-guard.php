<?php
declare(strict_types=1);

/**
 * AAB agriculture diagnostic endpoint authority gate.
 *
 * Fail-closed shared-secret gate for operator-only diagnostic endpoints
 * (PostgreSQL health check, PHP preflight). These endpoints connect to the
 * live database or reveal server filesystem paths, so they must never
 * execute for an unauthenticated caller. Require this file before any
 * other logic in a guarded script.
 */
function aab_diagnostic_auth_fail(string $code): never
{
    http_response_code(403);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode(['ok' => false, 'error' => $code]);
    exit;
}

$expectedKey = trim((string) getenv('AAB_DIAGNOSTIC_KEY'));

if ($expectedKey === '') {
    aab_diagnostic_auth_fail('DIAGNOSTIC_KEY_NOT_CONFIGURED');
}

$suppliedKey = '';

if (isset($_SERVER['HTTP_X_AAB_DIAGNOSTIC_KEY'])) {
    $suppliedKey = trim((string) $_SERVER['HTTP_X_AAB_DIAGNOSTIC_KEY']);
} elseif (function_exists('getallheaders')) {
    foreach ((getallheaders() ?: []) as $name => $value) {
        if (strcasecmp($name, 'X-AAB-Diagnostic-Key') === 0) {
            $suppliedKey = trim((string) $value);
            break;
        }
    }
}

if ($suppliedKey === '' || !hash_equals($expectedKey, $suppliedKey)) {
    aab_diagnostic_auth_fail('DIAGNOSTIC_KEY_REJECTED');
}
