<?php

declare(strict_types=1);

require_once __DIR__ . '/diagnostic-auth-guard.php';

@ini_set('display_errors', '0');
@ini_set('html_errors', '0');
error_reporting(E_ALL);

require_once dirname(__DIR__) . '/http/JsonResponse.php';
require_once dirname(__DIR__) . '/config/PrivateConfigLoader.php';

use AAB\Agriculture\Config\PrivateConfigLoader;
use AAB\Agriculture\Http\JsonResponse;
use Throwable;

try {
    $path = PrivateConfigLoader::privateConfigPath();

    $pdoPgsqlEnabled = extension_loaded('pdo_pgsql');
    $pgsqlEnabled = extension_loaded('pgsql');
    $configPresent = is_file($path);
    $configReadable = $configPresent && is_readable($path);

    JsonResponse::send([
        'ok' => (
            $pdoPgsqlEnabled &&
            $configPresent &&
            $configReadable
        ),
        'contract' =>
            'AAB_AGRICULTURE_POSTGRESQL_DATA_LAYER_04R2',
        'mode' => 'HOSTINGER_PREFLIGHT',
        'php_version' => PHP_VERSION,
        'pdo_pgsql_enabled' => $pdoPgsqlEnabled,
        'pgsql_enabled' => $pgsqlEnabled,
        'private_config_expected_path' => $path,
        'private_config_present' => $configPresent,
        'private_config_readable' => $configReadable,
        'candidate_config_paths' =>
            PrivateConfigLoader::candidatePaths(),
        'timestamp_utc' => gmdate('c'),
    ]);
} catch (Throwable $exception) {
    JsonResponse::send([
        'ok' => false,
        'contract' =>
            'AAB_AGRICULTURE_POSTGRESQL_DATA_LAYER_04R2',
        'mode' => 'HOSTINGER_PREFLIGHT',
        'error' => 'PREFLIGHT_EXECUTION_FAILED',
        'detail' => $exception->getMessage(),
        'timestamp_utc' => gmdate('c'),
    ], 500);
}