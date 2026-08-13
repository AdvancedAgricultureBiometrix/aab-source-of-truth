<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
echo json_encode([
    'ok' => true,
    'url' => 'https://epjhsrflzeuqzastevtz.supabase.co',
    'publishableKey' => 'sb_publishable_kYiKij8nK0bJrI-xm3ylkg_mNQm7epA',
    'turnstileSiteKey' => '0x4AAAAAAEOwVaJnqcxENmt0'
], JSON_UNESCAPED_SLASHES);
