<?php
declare(strict_types=1);

namespace AAB\Agriculture\Config;

use RuntimeException;

final class PostgresConfig
{
    public function __construct(
        public readonly string $host,
        public readonly int $port,
        public readonly string $database,
        public readonly string $username,
        public readonly string $password,
        public readonly string $sslMode,
        public readonly string $schema,
        public readonly int $connectTimeout,
        public readonly string $applicationName,
        public readonly string $configSource,
    ) {}

    public static function load(): self
    {
        $loaded = PrivateConfigLoader::load();
        $v = $loaded['values'];

        foreach (['host','database','username','password'] as $required) {
            if (!isset($v[$required]) || trim((string)$v[$required]) === '') {
                throw new RuntimeException('POSTGRESQL_CONFIG_MISSING_'.$required);
            }
        }

        $port = filter_var($v['port'] ?? 5432, FILTER_VALIDATE_INT);
        $timeout = filter_var($v['connect_timeout'] ?? 8, FILTER_VALIDATE_INT);
        if ($port === false || $port < 1 || $port > 65535) throw new RuntimeException('POSTGRESQL_CONFIG_INVALID_PORT');
        if ($timeout === false || $timeout < 1 || $timeout > 30) throw new RuntimeException('POSTGRESQL_CONFIG_INVALID_TIMEOUT');

        $sslMode = strtolower(trim((string)($v['sslmode'] ?? 'require')));
        if (!in_array($sslMode, ['require','verify-ca','verify-full'], true)) {
            throw new RuntimeException('POSTGRESQL_SSL_REQUIRED');
        }

        $schema = trim((string)($v['schema'] ?? 'agriculture'));
        if ($schema !== 'agriculture') throw new RuntimeException('POSTGRESQL_SCHEMA_MUST_BE_AGRICULTURE');

        $host = strtolower(trim((string)$v['host']));
        if (!str_ends_with($host, '.pooler.supabase.com')) {
            throw new RuntimeException('POSTGRESQL_HOST_MUST_BE_SUPABASE_POOLER');
        }

        return new self(
            $host,
            (int)$port,
            trim((string)$v['database']),
            trim((string)$v['username']),
            (string)$v['password'],
            $sslMode,
            $schema,
            (int)$timeout,
            trim((string)($v['application_name'] ?? 'aab-agriculture')),
            (string)$loaded['source'],
        );
    }

    public function safeSummary(): array
    {
        return [
            'config_source' => $this->configSource,
            'host_family' => 'supabase_pooler',
            'port' => $this->port,
            'database_configured' => $this->database !== '',
            'username_configured' => $this->username !== '',
            'password_configured' => $this->password !== '',
            'sslmode' => $this->sslMode,
            'schema' => $this->schema,
            'connect_timeout_seconds' => $this->connectTimeout,
            'application_name' => $this->applicationName,
        ];
    }
}
