<?php
declare(strict_types=1);

namespace AAB\Agriculture\Database;

use AAB\Agriculture\Config\PostgresConfig;
use PDO;
use PDOException;
use RuntimeException;

final class ConnectionFactory
{
    public static function create(PostgresConfig $config): PDO
    {
        if (!extension_loaded('pdo_pgsql')) {
            throw new RuntimeException('PHP_EXTENSION_PDO_PGSQL_NOT_ENABLED');
        }

        $dsn = sprintf(
            'pgsql:host=%s;port=%d;dbname=%s;sslmode=%s;connect_timeout=%d;application_name=%s',
            $config->host,
            $config->port,
            $config->database,
            $config->sslMode,
            $config->connectTimeout,
            $config->applicationName
        );

        try {
            $pdo = new PDO($dsn, $config->username, $config->password, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::ATTR_STRINGIFY_FETCHES => false,
                PDO::ATTR_TIMEOUT => $config->connectTimeout,
            ]);
            $pdo->exec("SET TIME ZONE 'UTC'");
            $pdo->exec('SET search_path TO agriculture, public');
            return $pdo;
        } catch (PDOException $e) {
            throw new RuntimeException(self::safeConnectionCode($e), 0, $e);
        }
    }

    private static function safeConnectionCode(PDOException $e): string
    {
        $message = strtolower($e->getMessage());
        if (str_contains($message, 'password authentication failed')) return 'POSTGRESQL_AUTHENTICATION_FAILED';
        if (str_contains($message, 'could not find driver')) return 'PHP_EXTENSION_PDO_PGSQL_NOT_ENABLED';
        if (str_contains($message, 'could not translate host name')) return 'POSTGRESQL_HOST_DNS_FAILED';
        if (str_contains($message, 'connection timed out')) return 'POSTGRESQL_CONNECTION_TIMEOUT';
        if (str_contains($message, 'no route to host')) return 'POSTGRESQL_NETWORK_UNREACHABLE';
        if (str_contains($message, 'ssl')) return 'POSTGRESQL_SSL_CONNECTION_FAILED';
        return 'POSTGRESQL_CONNECTION_FAILED';
    }
}
