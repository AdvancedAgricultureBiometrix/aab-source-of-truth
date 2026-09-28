<?php
declare(strict_types=1);
namespace AAB\Agriculture\Http;
final class JsonResponse {
 public static function send(array $payload,int $status=200): never {
  while(ob_get_level()>0) ob_end_clean();
  http_response_code($status);
  header('Content-Type: application/json; charset=utf-8');
  header('Cache-Control: no-store, max-age=0');
  header('X-Content-Type-Options: nosniff');
  echo json_encode($payload,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE|JSON_INVALID_UTF8_SUBSTITUTE);
  exit;
 }
}
