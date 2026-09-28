<?php

declare(strict_types=1);

namespace AAB\Agriculture\Config;

use RuntimeException;

final class PrivateConfigLoader
{
    public const CONTRACT = 'AAB_AGRICULTURE_POSTGRESQL_DATA_LAYER_04R3';

    public static function load(): array
    {
        $environment = self::fromEnvironment();

        if ($environment !== null) {
            return [
                'source' => 'environment',
                'path' => null,
                'values' => $environment,
            ];
        }

        $path = self::privateConfigPath();

        if (!is_file($path)) {
            throw new RuntimeException('PRIVATE_POSTGRESQL_CONFIG_NOT_FOUND');
        }

        if (!is_readable($path)) {
            throw new RuntimeException('PRIVATE_POSTGRESQL_CONFIG_NOT_READABLE');
        }

        $values = require $path;

        if (!is_array($values)) {
            throw new RuntimeException('PRIVATE_POSTGRESQL_CONFIG_INVALID');
        }

        return [
            'source' => 'private_file',
            'path' => $path,
            'values' => $values,
        ];
    }

    public static function privateConfigPath(): string
    {
        $override = self::readEnvironment('AAB_PG_PRIVATE_CONFIG_PATH');

        if ($override !== '') {
            return $override;
        }
        $documentRoot = rtrim((string) ($_SERVER['DOCUMENT_ROOT'] ?? ''), '/');
        if ($documentRoot === '') {
            throw new RuntimeException('AAB_PG_ENVIRONMENT_OR_PRIVATE_PATH_REQUIRED');
        }
        return dirname($documentRoot)
            . '/_private/agriculture-postgresql-config.php';
    }

    public static function candidatePaths(): array
    {
        $paths = [];

        $override = self::readEnvironment('AAB_PG_PRIVATE_CONFIG_PATH');

        if ($override !== '') {
            $paths[] = $override;
        }
        $documentRoot = rtrim((string) ($_SERVER['DOCUMENT_ROOT'] ?? ''), '/');
        if ($documentRoot !== '') {
            $paths[] = dirname($documentRoot)
                . '/_private/agriculture-postgresql-config.php';
        }

        return array_values(array_unique($paths));
    }

    private static function fromEnvironment(): ?array
    {
        $host = self::readEnvironment('AAB_PG_HOST');
        $database = self::readEnvironment('AAB_PG_DATABASE');
        $username = self::readEnvironment('AAB_PG_USER');
        $password = self::readEnvironment('AAB_PG_PASSWORD');

        if (
            $host === '' &&
            $database === '' &&
            $username === '' &&
            $password === ''
        ) {
            return null;
        }

        if (
            $host === '' ||
            $database === '' ||
            $username === '' ||
            $password === ''
        ) {
            throw new RuntimeException(
                'POSTGRESQL_ENVIRONMENT_CONFIG_INCOMPLETE'
            );
        }

        return [
            'host' => $host,
            'port' => self::readEnvironment('AAB_PG_PORT', '5432'),
            'database' => $database,
            'username' => $username,
            'password' => $password,
            'sslmode' => self::readEnvironment(
                'AAB_PG_SSLMODE',
                'require'
            ),
            'schema' => self::readEnvironment(
                'AAB_PG_SCHEMA',
                'agriculture'
            ),
            'connect_timeout' => self::readEnvironment(
                'AAB_PG_CONNECT_TIMEOUT',
                '8'
            ),
            'application_name' => self::readEnvironment(
                'AAB_PG_APPLICATION_NAME',
                'aab-agriculture'
            ),
        ];
    }

    private static function readEnvironment(
        string $key,
        string $default = ''
    ): string {
        $candidates = [
            getenv($key),
            $_SERVER[$key] ?? null,
            $_SERVER['REDIRECT_' . $key] ?? null,
            $_ENV[$key] ?? null,
        ];

        foreach ($candidates as $value) {
            if (
                $value !== false &&
                $value !== null &&
                trim((string) $value) !== ''
            ) {
                return trim((string) $value);
            }
        }

        return $default;
    }
}
