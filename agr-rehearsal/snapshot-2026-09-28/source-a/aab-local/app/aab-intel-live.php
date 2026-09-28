<?php
declare(strict_types=1);
require_once __DIR__ . '/country-runtime-guard.php';
http_response_code(410);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
echo json_encode(['ok'=>false,'error'=>'LEGACY_AIRTABLE_INTELLIGENCE_FEED_RETIRED']);
