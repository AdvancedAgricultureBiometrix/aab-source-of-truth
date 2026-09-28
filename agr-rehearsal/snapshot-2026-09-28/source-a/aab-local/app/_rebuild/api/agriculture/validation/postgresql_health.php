<?php

declare(strict_types=1);

require_once __DIR__ . '/diagnostic-auth-guard.php';

@ini_set('display_errors', '0');
@ini_set('html_errors', '0');
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('X-Content-Type-Options: nosniff');

const AAB_CONTRACT =
    'AAB_AGRICULTURE_POSTGRESQL_CONNECTION_DIAGNOSTIC_04R4';

/**
 * Return a JSON response and stop execution.
 *
 * @param array<string, mixed> $payload
 */
function respond(array $payload, int $statusCode = 200): never
{
    http_response_code($statusCode);

    echo json_encode(
        $payload,
        JSON_PRETTY_PRINT
        | JSON_UNESCAPED_SLASHES
        | JSON_INVALID_UTF8_SUBSTITUTE
    );

    exit;
}

/**
 * Remove potentially sensitive connection details from an exception message.
 */
function sanitiseDatabaseMessage(string $message): string
{
    $message = preg_replace(
        '/postgresql:\/\/[^\s]+/i',
        '[REDACTED_CONNECTION_URI]',
        $message
    ) ?? $message;

    $message = preg_replace(
        '/password\s*=\s*[^\s;]+/i',
        'password=[REDACTED]',
        $message
    ) ?? $message;

    $message = preg_replace(
        '/user(name)?\s*=\s*[^\s;]+/i',
        'username=[REDACTED]',
        $message
    ) ?? $message;

    $message = preg_replace(
        '/host\s*=\s*[^\s;]+/i',
        'host=[REDACTED]',
        $message
    ) ?? $message;

    $message = preg_replace(
        '/postgres\.[a-z0-9_-]+/i',
        'postgres.[REDACTED_PROJECT_REFERENCE]',
        $message
    ) ?? $message;

    $message = preg_replace(
        '/aws-[a-z0-9.-]+\.pooler\.supabase\.(com|net)/i',
        '[REDACTED_POOLER_HOST]',
        $message
    ) ?? $message;

    return trim($message);
}

/**
 * Return a safe classification for a PostgreSQL/PDO failure.
 *
 * @return array{classification: string, recommended_action: string}
 */
function classifyFailure(
    string $sqlState,
    string $safeMessage
): array {
    $message = strtolower($safeMessage);

    if (
        $sqlState === '28P01'
        || str_contains($message, 'password authentication failed')
    ) {
        return [
            'classification' => 'AUTHENTICATION_REJECTED',
            'recommended_action' =>
                'Verify the Supabase database password and Session Pooler username.',
        ];
    }

    if (
        $sqlState === '3D000'
        || str_contains($message, 'database does not exist')
    ) {
        return [
            'classification' => 'DATABASE_NAME_REJECTED',
            'recommended_action' =>
                'Verify that the database value is postgres.',
        ];
    }

    if (
        $sqlState === '08006'
        || $sqlState === '08001'
        || str_contains($message, 'connection refused')
        || str_contains($message, 'could not connect')
        || str_contains($message, 'network is unreachable')
    ) {
        return [
            'classification' => 'NETWORK_OR_POOLER_CONNECTION_FAILURE',
            'recommended_action' =>
                'Verify the Supabase Session Pooler host, port 5432, DNS and outbound connectivity.',
        ];
    }

    if (
        str_contains($message, 'could not translate host name')
        || str_contains($message, 'name or service not known')
    ) {
        return [
            'classification' => 'DNS_RESOLUTION_FAILURE',
            'recommended_action' =>
                'Verify that the Session Pooler hostname was copied exactly.',
        ];
    }

    if (
        str_contains($message, 'ssl')
        || str_contains($message, 'certificate')
    ) {
        return [
            'classification' => 'SSL_CONNECTION_FAILURE',
            'recommended_action' =>
                'Verify sslmode=require and the Hostinger OpenSSL/PDO PostgreSQL configuration.',
        ];
    }

    if (
        str_contains($message, 'no pg_hba.conf entry')
    ) {
        return [
            'classification' => 'POSTGRESQL_ACCESS_POLICY_REJECTED',
            'recommended_action' =>
                'Verify the selected Supabase connection method and SSL requirement.',
        ];
    }

    return [
        'classification' => 'UNCLASSIFIED_DATABASE_FAILURE',
        'recommended_action' =>
            'Review the safe SQLSTATE and driver message before changing configuration.',
    ];
}

$timestamp = gmdate('c');

if (!extension_loaded('pdo_pgsql')) {
    respond([
        'ok' => false,
        'contract' => AAB_CONTRACT,
        'status' => 'FAIL_CLOSED',
        'stage' => 'PHP_EXTENSION_CHECK',
        'error' => 'PDO_PGSQL_EXTENSION_NOT_ENABLED',
        'credentials_exposed' => false,
        'timestamp_utc' => $timestamp,
    ], 503);
}

$documentRoot = isset($_SERVER['DOCUMENT_ROOT'])
    ? rtrim((string) $_SERVER['DOCUMENT_ROOT'], '/')
    : '';

if ($documentRoot === '') {
    respond([
        'ok' => false,
        'contract' => AAB_CONTRACT,
        'status' => 'FAIL_CLOSED',
        'stage' => 'DOCUMENT_ROOT_RESOLUTION',
        'error' => 'DOCUMENT_ROOT_UNAVAILABLE',
        'credentials_exposed' => false,
        'timestamp_utc' => $timestamp,
    ], 503);
}
$configPath = dirname($documentRoot)
    . '/_private/agriculture-postgresql-config.php';
    
if (!is_file($configPath)) {
    respond([
        'ok' => false,
        'contract' => AAB_CONTRACT,
        'status' => 'FAIL_CLOSED',
        'stage' => 'PRIVATE_CONFIG_DISCOVERY',
        'error' => 'PRIVATE_CONFIG_NOT_FOUND',
        'config_path' => $configPath,
        'credentials_exposed' => false,
        'timestamp_utc' => $timestamp,
    ], 503);
}

if (!is_readable($configPath)) {
    respond([
        'ok' => false,
        'contract' => AAB_CONTRACT,
        'status' => 'FAIL_CLOSED',
        'stage' => 'PRIVATE_CONFIG_ACCESS',
        'error' => 'PRIVATE_CONFIG_NOT_READABLE',
        'config_path' => $configPath,
        'credentials_exposed' => false,
        'timestamp_utc' => $timestamp,
    ], 503);
}

$config = require $configPath;

if (!is_array($config)) {
    respond([
        'ok' => false,
        'contract' => AAB_CONTRACT,
        'status' => 'FAIL_CLOSED',
        'stage' => 'PRIVATE_CONFIG_VALIDATION',
        'error' => 'PRIVATE_CONFIG_MUST_RETURN_ARRAY',
        'credentials_exposed' => false,
        'timestamp_utc' => $timestamp,
    ], 503);
}

$requiredKeys = [
    'host',
    'port',
    'database',
    'username',
    'password',
    'sslmode',
];

$missingKeys = [];

foreach ($requiredKeys as $requiredKey) {
    if (
        !array_key_exists($requiredKey, $config)
        || trim((string) $config[$requiredKey]) === ''
    ) {
        $missingKeys[] = $requiredKey;
    }
}

if ($missingKeys !== []) {
    respond([
        'ok' => false,
        'contract' => AAB_CONTRACT,
        'status' => 'FAIL_CLOSED',
        'stage' => 'PRIVATE_CONFIG_VALIDATION',
        'error' => 'PRIVATE_CONFIG_INCOMPLETE',
        'missing_keys' => $missingKeys,
        'credentials_exposed' => false,
        'timestamp_utc' => $timestamp,
    ], 503);
}

$host = trim((string) $config['host']);
$port = (int) $config['port'];
$database = trim((string) $config['database']);
$username = trim((string) $config['username']);
$password = (string) $config['password'];
$sslmode = trim((string) $config['sslmode']);

$connectTimeout = isset($config['connect_timeout'])
    ? max(1, (int) $config['connect_timeout'])
    : 8;

$applicationName = isset($config['application_name'])
    ? trim((string) $config['application_name'])
    : 'aab-agriculture';

$schema = isset($config['schema'])
    ? trim((string) $config['schema'])
    : 'agriculture';

if ($port < 1 || $port > 65535) {
    respond([
        'ok' => false,
        'contract' => AAB_CONTRACT,
        'status' => 'FAIL_CLOSED',
        'stage' => 'PRIVATE_CONFIG_VALIDATION',
        'error' => 'INVALID_POSTGRESQL_PORT',
        'credentials_exposed' => false,
        'timestamp_utc' => $timestamp,
    ], 503);
}

$dsn = sprintf(
    'pgsql:host=%s;port=%d;dbname=%s;sslmode=%s;connect_timeout=%d;application_name=%s',
    $host,
    $port,
    $database,
    $sslmode,
    $connectTimeout,
    $applicationName
);

try {
    $pdo = new PDO(
        $dsn,
        $username,
        $password,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_TIMEOUT => $connectTimeout,
        ]
    );

    $connectionStatement = $pdo->query(
        "
        SELECT
            current_database() AS database_name,
            current_user AS authenticated_user,
            version() AS server_version,
            inet_server_port() AS server_port,
            current_setting('server_version_num') AS server_version_number
        "
    );

    $connection = $connectionStatement->fetch();

    $schemaStatement = $pdo->prepare(
        "
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.schemata
            WHERE schema_name = :schema_name
        ) AS schema_exists
        "
    );

    $schemaStatement->execute([
        'schema_name' => $schema,
    ]);

    $schemaExistsRaw = $schemaStatement->fetchColumn();

    $schemaExists = filter_var(
        $schemaExistsRaw,
        FILTER_VALIDATE_BOOLEAN
    );

    respond([
        'ok' => $schemaExists,
        'contract' => AAB_CONTRACT,
        'status' => $schemaExists
            ? 'CONNECTED_SCHEMA_AVAILABLE'
            : 'CONNECTED_MIGRATIONS_REQUIRED',
        'stage' => 'POSTGRESQL_CONNECTION_COMPLETE',
        'connection' => [
            'connected' => true,
            'database_name' =>
                isset($connection['database_name'])
                    ? (string) $connection['database_name']
                    : null,
            'authenticated_user_confirmed' =>
                isset($connection['authenticated_user']),
            'server_port' =>
                isset($connection['server_port'])
                    ? (int) $connection['server_port']
                    : null,
            'server_version_number' =>
                isset($connection['server_version_number'])
                    ? (string) $connection['server_version_number']
                    : null,
            'sslmode_requested' => $sslmode,
            'session_pooler_expected' => true,
        ],
        'agriculture_schema' => [
            'name' => $schema,
            'exists' => $schemaExists,
        ],
        'credentials_exposed' => false,
        'timestamp_utc' => $timestamp,
    ], $schemaExists ? 200 : 503);
} catch (PDOException $exception) {
    $sqlState = trim((string) $exception->getCode());

    $driverSqlState = null;
    $driverCode = null;
    $driverMessage = null;

    if (
        isset($exception->errorInfo)
        && is_array($exception->errorInfo)
    ) {
        $driverSqlState = isset($exception->errorInfo[0])
            ? (string) $exception->errorInfo[0]
            : null;

        $driverCode = isset($exception->errorInfo[1])
            ? (string) $exception->errorInfo[1]
            : null;

        $driverMessage = isset($exception->errorInfo[2])
            ? sanitiseDatabaseMessage(
                (string) $exception->errorInfo[2]
            )
            : null;
    }

    $safeMessage = sanitiseDatabaseMessage(
        $driverMessage ?: $exception->getMessage()
    );

    $effectiveSqlState = $driverSqlState ?: $sqlState;

    $classification = classifyFailure(
        $effectiveSqlState,
        $safeMessage
    );

    respond([
        'ok' => false,
        'contract' => AAB_CONTRACT,
        'status' => 'FAIL_CLOSED',
        'stage' => 'POSTGRESQL_CONNECTION_ATTEMPT',
        'error' => 'POSTGRESQL_CONNECTION_FAILED',
        'diagnostic' => [
            'sqlstate' =>
                $effectiveSqlState !== ''
                    ? $effectiveSqlState
                    : null,
            'driver_code' => $driverCode,
            'safe_driver_message' => $safeMessage,
            'classification' =>
                $classification['classification'],
            'recommended_action' =>
                $classification['recommended_action'],
        ],
        'connection_profile' => [
            'connection_method' =>
                'SUPABASE_SESSION_POOLER',
            'port' => $port,
            'database' => $database,
            'sslmode' => $sslmode,
            'username_format_valid' =>
                str_starts_with($username, 'postgres.'),
            'host_format_valid' =>
                str_contains(
                    strtolower($host),
                    '.pooler.supabase.com'
                ),
            'password_present' => $password !== '',
        ],
        'credentials_exposed' => false,
        'timestamp_utc' => $timestamp,
    ], 503);
} catch (Throwable $exception) {
    respond([
        'ok' => false,
        'contract' => AAB_CONTRACT,
        'status' => 'FAIL_CLOSED',
        'stage' => 'UNEXPECTED_EXECUTION_FAILURE',
        'error' => 'UNEXPECTED_DIAGNOSTIC_FAILURE',
        'detail' => sanitiseDatabaseMessage(
            $exception->getMessage()
        ),
        'credentials_exposed' => false,
        'timestamp_utc' => $timestamp,
    ], 500);
}