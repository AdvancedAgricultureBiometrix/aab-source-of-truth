<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/country-runtime-guard.php';
require_once dirname(__DIR__) . '/supabase-auth-bridge.php';

// AAB is used in the field (often same-day capture). Keep server-side dates consistent with
// the primary operator timezone used by the UI.
// NOTE: This affects PHP's date()/strtotime() defaults. Adjust if your deployment uses a
// different operational timezone.
@date_default_timezone_set('Australia/Perth');

// --- Airtable select option sanitization (prevents INVALID_MULTIPLE_CHOICE_OPTIONS) ---
// NOTE: Airtable API keys often cannot auto-create new select options. We MUST only write existing options.
$ALLOWED_CHANGE_TYPE = [
  "Ingredient added",
  "Ingredient removed",
  "Ingredient swap",
  "Ratio/percentage change",
  "Method / mixing change",
  "Base type change (dry/wet gel)",
  "Cost optimization variant",
  "Safety / stability variant",
  "AI suggestion applied",
  "Field feedback iteration"
];

$ALLOWED_EXPECTED_OUTCOMES = [
  "Better adhesion",
  "Better stability",
  "Higher efficacy",
  "Lower burn risk",
  "Better shelf life",
  "Lower cost",
  "Faster mixing",
  "Better spray performance"
];

function aab_coerce_string_array($v): array {
  if ($v === null) return [];
  if (is_array($v)) {
    $out = [];
    foreach ($v as $x) {
      if ($x === null) continue;
      $s = trim((string)$x);
      if ($s === "") continue;
      // strip wrapping quotes (handles ""a"" and "a")
      $s = preg_replace('/^"+|"+$/', '', $s);
      $s = preg_replace("/^'+|'+$/", '', $s);
      if ($s !== "") $out[] = $s;
    }
    return array_values(array_unique($out));
  }

  $s = trim((string)$v);
  if ($s === "") return [];

  // JSON array string
  if (strlen($s) > 0 && $s[0] === '[') {
    $decoded = json_decode($s, true);
    if (is_array($decoded)) return aab_coerce_string_array($decoded);
  }

  // CSV fallback
  $parts = preg_split('/\s*,\s*/', $s);
  return aab_coerce_string_array($parts);
}

function aab_filter_allowed(array $vals, array $allowed): array {
  $allowedSet = array_flip($allowed);
  $ok = [];
  $drop = [];
  foreach ($vals as $v) {
    $vv = trim((string)$v);
    if ($vv === "") continue;
    if (isset($allowedSet[$vv])) $ok[] = $vv;
    else $drop[] = $vv;
  }
  return [array_values(array_unique($ok)), array_values(array_unique($drop))];
}


/**
 * IMPORTANT:
 * This API must ALWAYS return JSON.
 * Some hosts output HTML for PHP warnings/fatals ("<br /><b>...") which breaks fetch().
 *
 * We therefore:
 *  - disable display_errors
 *  - buffer + discard any accidental output
 *  - convert PHP errors/exceptions into JSON responses
 */

@ini_set('display_errors', '0');
@ini_set('html_errors', '0');
@ini_set('log_errors', '1');
error_reporting(E_ALL);

// Start a buffer early so we can discard accidental output (e.g., from included files).
if (!ob_get_level()) {
  ob_start();
}

function aab_json_header(): void {
  // Avoid duplicate headers if something already sent output.
  if (!headers_sent()) {
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
  }
}

// --- Hardening: capture fatal errors as JSON (prevents blank 502 errors)
register_shutdown_function(function () {
  $err = error_get_last();
  if (!$err) return;
  $fatalTypes = [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR, E_USER_ERROR];
  if (!in_array($err['type'], $fatalTypes, true)) return;
  if (!headers_sent()) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
  }
  echo json_encode([
    'ok' => false,
    'error' => 'fatal_error',
    'detail' => $err['message'],
    'file' => basename($err['file']),
    'line' => $err['line'],
  ], JSON_UNESCAPED_SLASHES);
});

// Generic HTTP request helper with cURL fallback
function aab_http_request(string $method, string $url, array $headers = [], ?string $body = null): array {
  $method = strtoupper($method);
  $hdrLines = [];
  foreach ($headers as $k => $v) { $hdrLines[] = $k . ': ' . $v; }

  if (function_exists('curl_init')) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $hdrLines);
    curl_setopt($ch, CURLOPT_TIMEOUT, 25);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
    if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    $respBody = curl_exec($ch);
    $err = curl_error($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['ok' => ($status >= 200 && $status < 300), 'status' => $status, 'body' => ($respBody === false ? '' : $respBody), 'error' => $err];
  }

  $opts = [
    'http' => [
      'method' => $method,
      'header' => implode("\r\n", $hdrLines),
      'timeout' => 25,
      'ignore_errors' => true,
    ]
  ];
  if ($body !== null) $opts['http']['content'] = $body;
  $ctx = stream_context_create($opts);
  $respBody = @file_get_contents($url, false, $ctx);

  $status = 0;
  if (isset($http_response_header) && is_array($http_response_header)) {
    foreach ($http_response_header as $h) {
      if (preg_match('#^HTTP/\S+\s+(\d{3})#', $h, $mm)) { $status = (int)$mm[1]; break; }
    }
  }
  return ['ok' => ($status >= 200 && $status < 300), 'status' => $status, 'body' => ($respBody === false ? '' : $respBody), 'error' => ''];
}


function aab_flush_ob(): void {
  // Discard any buffered output that could corrupt JSON.
  while (ob_get_level()) {
    ob_end_clean();
  }
}

function aab_fail(string $code, string $detail = '', int $http = 500): void {
  aab_flush_ob();
  aab_json_header();
  http_response_code($http);
  echo json_encode([
    'ok' => false,
    'error' => $code,
    'detail' => $detail,
  ], JSON_UNESCAPED_SLASHES);
  exit;
}

set_error_handler(function(int $severity, string $message, string $file, int $line): bool {
  // Respect @ suppression (error_reporting() == 0 for that expression).
  if (!(error_reporting() & $severity)) {
    return false;
  }
  // Convert all PHP notices/warnings/errors into JSON (but keep them short).
  aab_fail('php_error', $message . " @ $file:$line", 500);
  return true;
});

set_exception_handler(function(Throwable $e): void {
  aab_fail('php_exception', $e->getMessage(), 500);
});

// Ensure our normal success path sets JSON headers too.
aab_json_header();

function jexit(array $obj, int $code=200): void {
  aab_flush_ob();
  aab_json_header();
  http_response_code($code);
  echo json_encode($obj, JSON_UNESCAPED_SLASHES);
  exit;
}

function require_auth(): array {
  return aab_supabase_require_auth();
}

/* Historical Airtable transport and schema helpers removed. */

// Action can arrive via querystring, POST, or JSON body.
// We normalise it early to avoid "unknown_action" when JS posts JSON without ?action=...
// --- Read raw input once (JSON POST bodies) ---
$AAB_RAW_INPUT = file_get_contents('php://input');
$AAB_JSON_BODY = null;
if ($AAB_RAW_INPUT !== false && trim((string)$AAB_RAW_INPUT) !== '') {
  $tmp = json_decode((string)$AAB_RAW_INPUT, true);
  if (is_array($tmp)) $AAB_JSON_BODY = $tmp;
}

// Action can come from query string, form post, or JSON body.
// This avoids environments where POST requests drop ?action=... unexpectedly.
$action = $_GET['action'] ?? ($_POST['action'] ?? ($AAB_JSON_BODY['action'] ?? ''));
if ($action === '' || $action === null) {
  $rawActionBody = file_get_contents('php://input');
  if ($rawActionBody !== false && trim((string)$rawActionBody) !== '') {
    $tmpAction = json_decode((string)$rawActionBody, true);
    if (is_array($tmpAction) && isset($tmpAction['action']) && is_string($tmpAction['action'])) {
      $action = trim($tmpAction['action']);
    }
  }
}

/* AAB governed persistence boundary */
$AAB_LEGACY_AIRTABLE_ACTIONS = [
  'auth_probe','complete_trial','create_observation','create_observation_template','create_trial','create_vil','derive_version',
  'diag','diag_sources','field_choices','generation_zero_retirement_delete_action','generation_zero_retirement_residual_scan',
  'get_discovery_candidate','get_hypothesis','get_ingredient_library_record','get_metrics_by_ids','get_observation_template',
  'get_trial_plots','get_version','list_crops_varieties','list_discovery_candidates','list_farm_locations','list_hypothesis_queue',
  'list_ingredient_library','list_ingredients','list_observation_templates','list_observations','list_plots','list_trials',
  'list_versions_debug','list_vil','resolve_context_labels','save_outcome_v1','save_vil_bulk','schema_probe','search_metrics_catalog','update_vil'
];
$AAB_LEGACY_SQLITE_ACTIONS = [
  'account_activate','activate_invited_account','append_decision','change_password','community_register','country_issue_activation',
  'country_issue_invitation','create_observation_v2','create_plot','export_trial_report_pdf','forgot_password','list_round_events',
  'log_round_event','regulatory_context','regulatory_reauth','reset_password','set_plot_template','set_trial_template','system_health',
  'today_dashboard','update_observation_template'
];
if (in_array($action, $AAB_LEGACY_SQLITE_ACTIONS, true)) {
  jexit(['ok'=>false,'error'=>'LEGACY_SQLITE_ACTION_RETIRED','action'=>$action], 410);
}
if (in_array($action, $AAB_LEGACY_AIRTABLE_ACTIONS, true)) {
  jexit(['ok'=>false,'error'=>'LEGACY_AIRTABLE_ACTION_RETIRED','action'=>$action], 410);
}

/* =========================================================================
 * AAB-COUNTRY-FOUNDATION-GATEWAY-01
 * Country activation, personal dashboard, country setup/admin, bootstrap scan,
 * starter ingredients, daily impact and continuity health.
 * ========================================================================= */
$AAB_COUNTRY_ACTIONS = [
  'country_first_page','personal_dashboard','personal_preferences','country_admin_snapshot','country_collaboration_snapshot','country_foundation_integrity','country_backup_health','country_starter_ingredients','country_impact','country_scan_events','country_recommendations','country_source_status','country_economic_context','country_scan_knowledge','country_onboarding_status','country_activation_status','manufacturing_transfer_summary','institution_setup_context',
  'personal_preferences_update','institution_save_settings','institution_add_unit','institution_add_metric','country_activate','country_create_primary_organization','country_add_organization','country_add_organization_workspace','country_set_entity_sharing','manufacturing_generate_transfer','country_add_recovery_contact','country_complete_setup','country_start_bootstrap','country_generate_brief','country_refresh_impact','country_accept_invitation'
];
if (in_array($action,$AAB_COUNTRY_ACTIONS,true)) {
  try {
    $auth=require_auth();
    $email=strtolower(trim((string)($auth['user']['email']??'')));$localRole=strtolower(trim((string)($auth['user']['role']??'user')));
    $factory=require __DIR__.'/api/agriculture/bootstrap.php';$ag=$factory();if(!isset($ag['pdo'])||!($ag['pdo'] instanceof PDO))throw new RuntimeException('POSTGRES_PDO_NOT_AVAILABLE');$pg=$ag['pdo'];
    $as=$pg->prepare('SELECT * FROM agriculture.api_resolve_authenticated_actor(:email,:role,:display_name)');$as->execute(['email'=>$email,'role'=>$localRole,'display_name'=>$email]);$actor=$as->fetch(PDO::FETCH_ASSOC);$actorId=(string)($actor['actor_id']??'');if($actorId==='')throw new RuntimeException('ACTOR_RESOLUTION_FAILED');
    $body=is_array($AAB_JSON_BODY)?$AAB_JSON_BODY:$_POST;
    $isPost=strtoupper((string)($_SERVER['REQUEST_METHOD']??'GET'))==='POST';
    if($action==='country_first_page'){$st=$pg->prepare('SELECT country_core.api_country_first_page(:a)::text');$st->execute(['a'=>$actorId]);jexit(['ok'=>true,'source'=>'POSTGRESQL_COUNTRY_CORE','actor'=>$actor,'context'=>json_decode((string)$st->fetchColumn(),true)]);}
    if($action==='personal_dashboard'){$st=$pg->prepare('SELECT country_core.api_personal_dashboard(:a)::text');$st->execute(['a'=>$actorId]);jexit(['ok'=>true,'source'=>'POSTGRESQL_COUNTRY_CORE','dashboard'=>json_decode((string)$st->fetchColumn(),true)]);}
    if($action==='personal_preferences'){$st=$pg->prepare('SELECT country_core.api_user_preferences(:a)::text');$st->execute(['a'=>$actorId]);jexit(['ok'=>true,'source'=>'POSTGRESQL_COUNTRY_CORE','preferences'=>json_decode((string)$st->fetchColumn(),true)]);}
    if($action==='country_foundation_integrity'){$row=$pg->query('SELECT * FROM country_core.v_country_foundation_seal')->fetch(PDO::FETCH_ASSOC);jexit(['ok'=>true,'source'=>'POSTGRESQL_COUNTRY_CORE','integrity'=>$row]);}
    if($action==='country_backup_health'){$row=$pg->query('SELECT * FROM continuity_core.v_backup_health')->fetch(PDO::FETCH_ASSOC);jexit(['ok'=>true,'source'=>'POSTGRESQL_CONTINUITY','health'=>$row]);}
    if($action==='country_starter_ingredients'){$rows=$pg->query('SELECT * FROM country_core.v_global_starter_ingredients ORDER BY knowledge_category,ingredient_name')->fetchAll(PDO::FETCH_ASSOC);jexit(['ok'=>true,'source'=>'POSTGRESQL_COUNTRY_CORE','records'=>$rows]);}
    if($action==='country_source_status'){$rows=$pg->query('SELECT * FROM country_core.v_bootstrap_source_status')->fetchAll(PDO::FETCH_ASSOC);jexit(['ok'=>true,'source'=>'POSTGRESQL_COUNTRY_CORE','records'=>$rows]);}
    if($action==='country_activation_status'){$st=$pg->prepare("SELECT agriculture.api_actor_has_capability(:a,'administer',NULL)");$st->execute(['a'=>$actorId]);if(!$st->fetchColumn())jexit(['ok'=>false,'error'=>'global_admin_required'],403);$rows=$pg->query('SELECT * FROM country_core.v_country_activation_status LIMIT 100')->fetchAll(PDO::FETCH_ASSOC);jexit(['ok'=>true,'source'=>'POSTGRESQL_COUNTRY_CORE','records'=>$rows]);}
    $workspace=trim((string)($body['country_workspace_id']??$_GET['country_workspace_id']??''));
    if($action==='country_admin_snapshot'){if($workspace==='')jexit(['ok'=>false,'error'=>'country_workspace_id_required'],400);$st=$pg->prepare('SELECT country_core.api_country_admin_snapshot(:a,:w)::text');$st->execute(['a'=>$actorId,'w'=>$workspace]);jexit(['ok'=>true,'source'=>'POSTGRESQL_COUNTRY_CORE','snapshot'=>json_decode((string)$st->fetchColumn(),true)]);}
    if($action==='country_collaboration_snapshot'){if($workspace==='')jexit(['ok'=>false,'error'=>'country_workspace_id_required'],400);$st=$pg->prepare('SELECT country_core.api_country_collaboration_snapshot(:a,:w)::text');$st->execute(['a'=>$actorId,'w'=>$workspace]);jexit(['ok'=>true,'source'=>'POSTGRESQL_COUNTRY_CORE','snapshot'=>json_decode((string)$st->fetchColumn(),true)]);}
    if($action==='manufacturing_transfer_summary'){if($workspace==='')jexit(['ok'=>false,'error'=>'country_workspace_id_required'],400);$st=$pg->prepare('SELECT * FROM manufacturing_core.v_transfer_package_summary WHERE country_workspace_id=:w ORDER BY generated_at DESC');$st->execute(['w'=>$workspace]);jexit(['ok'=>true,'source'=>'POSTGRESQL_MANUFACTURING_CORE','records'=>$st->fetchAll(PDO::FETCH_ASSOC)]);}
    if($action==='institution_setup_context'){$org=trim((string)($body['organization_id']??$_GET['organization_id']??''));if($org==='')jexit(['ok'=>false,'error'=>'organization_id_required'],400);$st=$pg->prepare('SELECT country_core.api_institution_setup_context(:a,:o)::text');$st->execute(['a'=>$actorId,'o'=>$org]);jexit(['ok'=>true,'source'=>'POSTGRESQL_COUNTRY_CORE','context'=>json_decode((string)$st->fetchColumn(),true)]);}
    if($action==='country_impact'){if($workspace==='')jexit(['ok'=>false,'error'=>'country_workspace_id_required'],400);$st=$pg->prepare('SELECT * FROM country_core.v_daily_country_impact WHERE country_workspace_id=:w ORDER BY snapshot_date DESC,metric_category,metric_name');$st->execute(['w'=>$workspace]);jexit(['ok'=>true,'source'=>'POSTGRESQL_COUNTRY_CORE','records'=>$st->fetchAll(PDO::FETCH_ASSOC)]);}
    if($action==='country_scan_events'){if($workspace==='')jexit(['ok'=>false,'error'=>'country_workspace_id_required'],400);$st=$pg->prepare('SELECT e.* FROM country_core.bootstrap_scan_brain_event e JOIN country_core.bootstrap_scan_run r ON r.bootstrap_scan_run_id=e.bootstrap_scan_run_id WHERE r.country_workspace_id=:w AND r.bootstrap_scan_run_id=(SELECT bootstrap_scan_run_id FROM country_core.bootstrap_scan_run WHERE country_workspace_id=:w ORDER BY initiated_at DESC LIMIT 1) ORDER BY event_order');$st->execute(['w'=>$workspace]);jexit(['ok'=>true,'source'=>'POSTGRESQL_COUNTRY_CORE','records'=>$st->fetchAll(PDO::FETCH_ASSOC)]);}
    if($action==='country_recommendations'){if($workspace==='')jexit(['ok'=>false,'error'=>'country_workspace_id_required'],400);$st=$pg->prepare('SELECT * FROM country_core.country_recommendation WHERE country_workspace_id=:w ORDER BY created_at DESC');$st->execute(['w'=>$workspace]);jexit(['ok'=>true,'source'=>'POSTGRESQL_COUNTRY_CORE','records'=>$st->fetchAll(PDO::FETCH_ASSOC)]);}
    if($action==='country_economic_context'){if($workspace==='')jexit(['ok'=>false,'error'=>'country_workspace_id_required'],400);$st=$pg->prepare('SELECT country_core.api_country_economic_context(:a,:w)::text');$st->execute(['a'=>$actorId,'w'=>$workspace]);jexit(['ok'=>true,'source'=>'POSTGRESQL_COUNTRY_CORE','context'=>json_decode((string)$st->fetchColumn(),true)]);}
    if($action==='country_scan_knowledge'){$st=$pg->query('SELECT country_core.api_country_scan_knowledge_definition()::text');jexit(['ok'=>true,'source'=>'POSTGRESQL_COUNTRY_CORE','definition'=>json_decode((string)$st->fetchColumn(),true)]);}
    if($action==='country_onboarding_status'){if($workspace==='')jexit(['ok'=>false,'error'=>'country_workspace_id_required'],400);$st=$pg->prepare('SELECT country_core.api_country_onboarding_status(:a,:w)::text');$st->execute(['a'=>$actorId,'w'=>$workspace]);jexit(['ok'=>true,'source'=>'POSTGRESQL_COUNTRY_CORE','onboarding'=>json_decode((string)$st->fetchColumn(),true)]);}

    if(!$isPost)jexit(['ok'=>false,'error'=>'method_not_allowed','allowed'=>'POST'],405);
    if($action==='personal_preferences_update'){$pc=trim((string)($body['preferred_country_workspace_id']??''));$po=trim((string)($body['preferred_organization_id']??''));$st=$pg->prepare('SELECT country_core.api_update_user_preferences(:a,:l,:tz,:d,:den,:pc,:po,:em,:app,:task)::text');$st->execute(['a'=>$actorId,'l'=>trim((string)($body['language_code']??'en')),'tz'=>trim((string)($body['timezone_name']??'UTC')),'d'=>trim((string)($body['default_landing_page']??'/aab-local/app/_rebuild/my-dashboard.html')),'den'=>strtoupper(trim((string)($body['dashboard_density']??'COMFORTABLE'))),'pc'=>$pc!==''?$pc:null,'po'=>$po!==''?$po:null,'em'=>filter_var($body['email_notifications']??true,FILTER_VALIDATE_BOOLEAN,FILTER_NULL_ON_FAILURE)??true,'app'=>filter_var($body['in_app_notifications']??true,FILTER_VALIDATE_BOOLEAN,FILTER_NULL_ON_FAILURE)??true,'task'=>filter_var($body['task_review_alerts']??true,FILTER_VALIDATE_BOOLEAN,FILTER_NULL_ON_FAILURE)??true]);jexit(['ok'=>true,'source'=>'POSTGRESQL_COUNTRY_CORE','preferences'=>json_decode((string)$st->fetchColumn(),true)]);}
    if($action==='institution_save_settings'){$org=trim((string)($body['organization_id']??''));$st=$pg->prepare('SELECT country_core.api_upsert_institution_settings(:a,:o,:l,:tz,:n)::text');$st->execute(['a'=>$actorId,'o'=>$org,'l'=>trim((string)($body['default_language']??'en')),'tz'=>trim((string)($body['default_timezone']??'UTC')),'n'=>trim((string)($body['notes']??''))]);jexit(['ok'=>true,'source'=>'POSTGRESQL_COUNTRY_CORE','settings'=>json_decode((string)$st->fetchColumn(),true)]);}
    if($action==='institution_add_unit'){$org=trim((string)($body['organization_id']??''));$mult=($body['conversion_multiplier']??'')===''?null:(float)$body['conversion_multiplier'];$off=($body['conversion_offset']??'')===''?0:(float)$body['conversion_offset'];$st=$pg->prepare('SELECT country_core.api_create_institution_unit(:a,:o,:c,:n,:s,:q,:cu,:m,:off,:d,:r)::text');$st->execute(['a'=>$actorId,'o'=>$org,'c'=>trim((string)($body['unit_code']??'')),'n'=>trim((string)($body['unit_name']??'')),'s'=>trim((string)($body['unit_symbol']??'')),'q'=>trim((string)($body['quantity_kind']??'')),'cu'=>trim((string)($body['canonical_unit']??'')),'m'=>$mult,'off'=>$off,'d'=>trim((string)($body['definition_summary']??'')),'r'=>trim((string)($body['reference']??''))]);jexit(['ok'=>true,'source'=>'POSTGRESQL_COUNTRY_CORE','unit'=>json_decode((string)$st->fetchColumn(),true)]);}
    if($action==='institution_add_metric'){$org=trim((string)($body['organization_id']??''));$gm=trim((string)($body['global_metric_definition_id']??''));$st=$pg->prepare('SELECT country_core.api_create_institution_metric(:a,:o,:c,:n,:d,:v,:u,:g,:m)::text');$st->execute(['a'=>$actorId,'o'=>$org,'c'=>trim((string)($body['metric_code']??'')),'n'=>trim((string)($body['metric_name']??'')),'d'=>trim((string)($body['description']??'')),'v'=>trim((string)($body['value_type']??'NUMERIC')),'u'=>trim((string)($body['source_unit_code']??'')),'g'=>$gm!==''?$gm:null,'m'=>trim((string)($body['method_reference']??''))]);jexit(['ok'=>true,'source'=>'POSTGRESQL_COUNTRY_CORE','metric'=>json_decode((string)$st->fetchColumn(),true)]);}
    if($action==='country_activate'){$cc=strtoupper(trim((string)($body['country_code']??'')));$code=trim((string)($body['activation_code']??''));if($cc===''||$code==='')jexit(['ok'=>false,'error'=>'country_activation_fields_required'],400);$st=$pg->prepare('SELECT row_to_json(x)::text FROM country_core.api_activate_country(:cc,:code,:actor,:name,:lang,:tz) x');$st->execute(['cc'=>$cc,'code'=>$code,'actor'=>$actorId,'name'=>trim((string)($body['workspace_name']??'')),'lang'=>trim((string)($body['default_language']??'en')),'tz'=>trim((string)($body['timezone_name']??'UTC'))]);jexit(['ok'=>true,'source'=>'POSTGRESQL_COUNTRY_CORE','workspace'=>json_decode((string)$st->fetchColumn(),true)]);}
    if($action==='country_create_primary_organization'){$st=$pg->prepare('SELECT row_to_json(x)::text FROM country_core.api_create_primary_organization(:w,:n,:t,:a) x');$st->execute(['w'=>$workspace,'n'=>trim((string)($body['organization_name']??'')),'t'=>strtoupper(trim((string)($body['organization_type']??'GOVERNMENT'))),'a'=>$actorId]);jexit(['ok'=>true,'source'=>'POSTGRESQL_COUNTRY_CORE','organization'=>json_decode((string)$st->fetchColumn(),true)]);}
    if($action==='country_add_organization'){$st=$pg->prepare('SELECT row_to_json(x)::text FROM country_core.api_create_organization(:a,:w,:n,:t) x');$st->execute(['a'=>$actorId,'w'=>$workspace,'n'=>trim((string)($body['organization_name']??'')),'t'=>strtoupper(trim((string)($body['organization_type']??'OTHER')))]);jexit(['ok'=>true,'source'=>'POSTGRESQL_COUNTRY_CORE','organization'=>json_decode((string)$st->fetchColumn(),true)]);}
    if($action==='country_add_organization_workspace'){$st=$pg->prepare('SELECT row_to_json(x)::text FROM country_core.api_create_organization_workspace(:a,:o,:n,:t) x');$st->execute(['a'=>$actorId,'o'=>trim((string)($body['organization_id']??'')),'n'=>trim((string)($body['workspace_name']??'')),'t'=>strtoupper(trim((string)($body['workspace_type']??'PROJECT')))]);jexit(['ok'=>true,'source'=>'POSTGRESQL_COUNTRY_CORE','organization_workspace'=>json_decode((string)$st->fetchColumn(),true)]);}
    if($action==='country_set_entity_sharing'){$st=$pg->prepare('SELECT row_to_json(x)::text FROM country_core.api_set_entity_sharing(:a,:w,:o,:et,:eid,:c,:ip,:conf,:lic) x');$st->execute(['a'=>$actorId,'w'=>$workspace,'o'=>trim((string)($body['owner_organization_id']??'')),'et'=>trim((string)($body['entity_type']??'')),'eid'=>trim((string)($body['entity_id']??'')),'c'=>strtoupper(trim((string)($body['sharing_classification']??'PRIVATE_TO_ORGANIZATION'))),'ip'=>trim((string)($body['ip_owner']??'')),'conf'=>trim((string)($body['confidentiality_note']??'')),'lic'=>trim((string)($body['licence_summary']??''))]);jexit(['ok'=>true,'source'=>'POSTGRESQL_COUNTRY_CORE','sharing_policy'=>json_decode((string)$st->fetchColumn(),true)]);}
    if($action==='manufacturing_generate_transfer'){$st=$pg->prepare('SELECT row_to_json(x)::text FROM manufacturing_core.api_generate_transfer_package(:a,:w,:s,:d,:f,:u,:x) x');$st->execute(['a'=>$actorId,'w'=>$workspace,'s'=>trim((string)($body['source_organization_id']??'')),'d'=>trim((string)($body['destination_manufacturer_id']??'')),'f'=>trim((string)($body['formulation_version_id']??'')),'u'=>strtoupper(trim((string)($body['permitted_use']??'MANUFACTURING_EVALUATION'))),'x'=>trim((string)($body['access_expires_at']??''))?:null]);jexit(['ok'=>true,'source'=>'POSTGRESQL_MANUFACTURING_CORE','transfer_package'=>json_decode((string)$st->fetchColumn(),true)]);}
    if($action==='country_add_recovery_contact'){$st=$pg->prepare('SELECT row_to_json(x)::text FROM country_core.api_add_recovery_contact(:w,:n,:e,:p,:a) x');$st->execute(['w'=>$workspace,'n'=>trim((string)($body['contact_name']??'')),'e'=>strtolower(trim((string)($body['contact_email']??''))),'p'=>(int)($body['priority_order']??1),'a'=>$actorId]);jexit(['ok'=>true,'source'=>'POSTGRESQL_COUNTRY_CORE','recovery_contact'=>json_decode((string)$st->fetchColumn(),true)]);}
    if($action==='country_complete_setup'){$st=$pg->prepare('SELECT row_to_json(x)::text FROM country_core.api_complete_country_setup(:w,:a) x');$st->execute(['w'=>$workspace,'a'=>$actorId]);jexit(['ok'=>true,'source'=>'POSTGRESQL_COUNTRY_CORE','workspace'=>json_decode((string)$st->fetchColumn(),true)]);}
    if($action==='country_start_bootstrap'){$st=$pg->prepare('SELECT row_to_json(x)::text FROM country_core.api_start_country_bootstrap(:w,:a) x');$st->execute(['w'=>$workspace,'a'=>$actorId]);jexit(['ok'=>true,'source'=>'POSTGRESQL_COUNTRY_CORE','scan'=>json_decode((string)$st->fetchColumn(),true)]);}
    if($action==='country_generate_brief'){$scan=trim((string)($body['bootstrap_scan_run_id']??''));$st=$pg->prepare('SELECT row_to_json(x)::text FROM country_core.api_generate_country_brief(:s,:a) x');$st->execute(['s'=>$scan,'a'=>$actorId]);jexit(['ok'=>true,'source'=>'POSTGRESQL_COUNTRY_CORE','brief'=>json_decode((string)$st->fetchColumn(),true)]);}
    if($action==='country_refresh_impact'){$st=$pg->prepare('SELECT country_core.api_refresh_daily_impact(:w)');$st->execute(['w'=>$workspace]);jexit(['ok'=>true,'source'=>'POSTGRESQL_COUNTRY_CORE','refreshed'=>(int)$st->fetchColumn()]);}
    if($action==='country_accept_invitation'){$token=trim((string)($body['invitation_token']??''));$st=$pg->prepare('SELECT row_to_json(x)::text FROM country_core.api_accept_invitation(:t,:a) x');$st->execute(['t'=>$token,'a'=>$actorId]);jexit(['ok'=>true,'source'=>'POSTGRESQL_COUNTRY_CORE','membership'=>json_decode((string)$st->fetchColumn(),true)]);}

  } catch(Throwable $e){$msg=$e->getMessage();$status=str_contains($msg,'AUTHORITY_REQUIRED')?403:500;jexit(['ok'=>false,'error'=>'aab_country_foundation_gateway_failed','source'=>'POSTGRESQL_COUNTRY_CORE','fail_closed'=>true,'detail'=>defined('AAB_DEBUG')&&AAB_DEBUG?$msg:null],$status);}
}


/* =========================================================================
 * AAB-POSTGRES-WIRE-02
 * Governed Agriculture Ingredient write lifecycle.
 *
 * Actions:
 *   create_ingredient
 *   update_ingredient
 *   archive_ingredient
 *
 * All actions require the existing AAB authenticated session. The authenticated
 * email/role is resolved to a PostgreSQL Agriculture actor. PostgreSQL then
 * enforces the actor capability and the canonical ingredient lifecycle.
 * No Airtable fallback is permitted.
 * ========================================================================= */
if (in_array($action, ['create_ingredient','update_ingredient','archive_ingredient'], true)) {
  try {
    if (strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== 'POST') {
      jexit(['ok'=>false,'error'=>'method_not_allowed','allowed'=>'POST'], 405);
    }

    $auth = require_auth();
    $email = strtolower(trim((string)($auth['user']['email'] ?? '')));
    $localRole = strtolower(trim((string)($auth['user']['role'] ?? 'user')));
    if ($email === '') {
      jexit(['ok'=>false,'error'=>'authenticated_email_missing'], 401);
    }

    $body = is_array($AAB_JSON_BODY) ? $AAB_JSON_BODY : $_POST;

    $factory = require __DIR__ . '/api/agriculture/bootstrap.php';
    $ag = $factory();
    if (!isset($ag['pdo']) || !($ag['pdo'] instanceof PDO)) {
      throw new RuntimeException('AGRICULTURE_POSTGRES_PDO_NOT_AVAILABLE');
    }
    /** @var PDO $agPdo */
    $agPdo = $ag['pdo'];

    // Resolve only from the already-authenticated AAB identity. The database
    // maps the local role to the Agriculture access/authority profile.
    $actorStmt = $agPdo->prepare(
      'SELECT * FROM agriculture.api_resolve_authenticated_actor(:email,:role,:display_name)'
    );
    $actorStmt->execute([
      'email' => $email,
      'role' => $localRole,
      'display_name' => $email,
    ]);
    $actor = $actorStmt->fetch(PDO::FETCH_ASSOC);
    $actorId = trim((string)($actor['actor_id'] ?? ''));
    if ($actorId === '') {
      throw new RuntimeException('AGRICULTURE_ACTOR_RESOLUTION_FAILED');
    }

    if ($action === 'create_ingredient') {
      $code = strtoupper(trim((string)($body['ingredient_code'] ?? $body['code'] ?? '')));
      $name = trim((string)($body['ingredient_name'] ?? $body['name'] ?? ''));
      $materialClass = strtoupper(trim((string)($body['material_class'] ?? '')));
      $preparationClass = strtoupper(trim((string)($body['preparation_class'] ?? '')));
      $why = trim((string)($body['why'] ?? $body['creation_rationale'] ?? $body['rationale'] ?? ''));
      $dataClass = strtoupper(trim((string)($body['data_class'] ?? 'EXPERIMENTAL_UNVERIFIED')));
      $countryCode = strtoupper(trim((string)($body['country_code'] ?? '')));
      $countryWorkspaceId = null;
      $wsStmt = $agPdo->prepare("SELECT m.country_workspace_id,w.country_code FROM country_core.workspace_membership m JOIN country_core.country_workspace w ON w.country_workspace_id=m.country_workspace_id WHERE m.actor_id=:actor AND m.membership_status='ACTIVE' AND (:country='' OR w.country_code=:country) ORDER BY CASE WHEN m.membership_role='HEAD_ADMIN' THEN 0 ELSE 1 END,m.granted_at LIMIT 1");
      $wsStmt->execute(['actor'=>$actorId,'country'=>$countryCode]);
      if ($ws = $wsStmt->fetch(PDO::FETCH_ASSOC)) { $countryWorkspaceId=(string)$ws['country_workspace_id']; if($countryCode==='')$countryCode=strtoupper((string)$ws['country_code']); }

      if ($code === '' || $name === '' || $materialClass === '' || $why === '') {
        jexit(['ok'=>false,'error'=>'ingredient_required_fields_missing','required'=>['ingredient_code','ingredient_name','material_class','why']], 400);
      }

      $stmt = $agPdo->prepare(
        'SELECT * FROM agriculture.api_create_ingredient(:code,:name,:material,:why,:actor,:prep,:data_class,:country)'
      );
      $stmt->execute([
        'code'=>$code,
        'name'=>$name,
        'material'=>$materialClass,
        'why'=>$why,
        'actor'=>$actorId,
        'prep'=>$preparationClass !== '' ? $preparationClass : null,
        'data_class'=>$dataClass !== '' ? $dataClass : 'EXPERIMENTAL_UNVERIFIED',
        'country'=>$countryCode !== '' ? $countryCode : null,
      ]);
      $record = $stmt->fetch(PDO::FETCH_ASSOC);
      if ($record && $countryWorkspaceId) { $stamp=$agPdo->prepare('UPDATE agriculture.ingredient SET country_workspace_id=:workspace WHERE ingredient_id=:id RETURNING *'); $stamp->execute(['workspace'=>$countryWorkspaceId,'id'=>$record['ingredient_id']]); $record=$stamp->fetch(PDO::FETCH_ASSOC) ?: $record; }
      jexit([
        'ok'=>true,
        'source'=>'POSTGRESQL_AGRICULTURE',
        'action'=>'create_ingredient',
        'record'=>$record,
        'actor'=>['actor_id'=>$actorId,'actor_type'=>$actor['actor_type'] ?? null],
      ]);
    }

    if ($action === 'update_ingredient') {
      $id = trim((string)($body['ingredient_id'] ?? $body['id'] ?? ''));
      $why = trim((string)($body['why'] ?? $body['amendment_rationale'] ?? $body['rationale'] ?? ''));
      if ($id === '' || $why === '') {
        jexit(['ok'=>false,'error'=>'ingredient_update_required_fields_missing','required'=>['ingredient_id','why']], 400);
      }

      $stmt = $agPdo->prepare(
        'SELECT * FROM agriculture.api_amend_ingredient(:id,:why,:actor,:name,:material,:prep,:category,:foliar,:fertigation,:risks,:mitigation,:handling)'
      );
      $nullable = static function($v): ?string {
        if ($v === null) return null;
        $v = trim((string)$v);
        return $v === '' ? null : $v;
      };
      $stmt->execute([
        'id'=>$id,
        'why'=>$why,
        'actor'=>$actorId,
        'name'=>$nullable($body['ingredient_name'] ?? $body['name'] ?? null),
        'material'=>isset($body['material_class']) ? strtoupper((string)$nullable($body['material_class'])) : null,
        'prep'=>isset($body['preparation_class']) ? strtoupper((string)$nullable($body['preparation_class'])) : null,
        'category'=>$nullable($body['category'] ?? null),
        'foliar'=>$nullable($body['foliar_compatibility'] ?? null),
        'fertigation'=>$nullable($body['fertigation_compatibility'] ?? null),
        'risks'=>$nullable($body['risks_contraindications'] ?? null),
        'mitigation'=>$nullable($body['mitigation_lever'] ?? null),
        'handling'=>$nullable($body['handling_storage_notes'] ?? null),
      ]);
      $record = $stmt->fetch(PDO::FETCH_ASSOC);
      jexit([
        'ok'=>true,
        'source'=>'POSTGRESQL_AGRICULTURE',
        'action'=>'update_ingredient',
        'record'=>$record,
        'versioned'=>true,
      ]);
    }

    $id = trim((string)($body['ingredient_id'] ?? $body['id'] ?? ''));
    $why = trim((string)($body['why'] ?? $body['archive_reason'] ?? $body['reason'] ?? ''));
    if ($id === '' || $why === '') {
      jexit(['ok'=>false,'error'=>'ingredient_archive_required_fields_missing','required'=>['ingredient_id','why']], 400);
    }
    $stmt = $agPdo->prepare(
      'SELECT * FROM agriculture.api_archive_ingredient(:id,:why,:actor)'
    );
    $stmt->execute(['id'=>$id,'why'=>$why,'actor'=>$actorId]);
    $record = $stmt->fetch(PDO::FETCH_ASSOC);
    jexit([
      'ok'=>true,
      'source'=>'POSTGRESQL_AGRICULTURE',
      'action'=>'archive_ingredient',
      'record'=>$record,
      'archived_from_active_lists'=>true,
    ]);

  } catch (Throwable $e) {
    error_log('AAB_POSTGRES_WIRE_02 ' . $e->getMessage());
    $sqlState = $e instanceof PDOException ? (string)$e->getCode() : '';
    $message = $e->getMessage();
    $status = ($sqlState === '42501' || str_contains($message,'CAPABILITY_DENIED')) ? 403 : 503;
    jexit([
      'ok'=>false,
      'error'=>'agriculture_postgresql_ingredient_write_failed',
      'source'=>'POSTGRESQL_AGRICULTURE',
      'fail_closed'=>true,
      'detail'=>defined('AAB_DEBUG') && AAB_DEBUG ? $message : null,
    ], $status);
  }
}


/* =========================================================================
 * AAB-POSTGRES-WIRE-05
 * PostgreSQL Formulation Workbench orchestration.
 *
 * Read actions:
 *   workbench_context
 *   list_workbench_formulations
 *   list_workbench_ingredients
 *   get_workbench_formulation
 *   get_workbench_ingredient_intelligence
 *
 * Governed write actions:
 *   create_workbench_formulation
 *   derive_workbench_formulation
 *   workbench_decide_formulation
 *   workbench_send_to_trial
 *
 * No Airtable fallback. All formulation writes are governed PostgreSQL calls.
 * ========================================================================= */
$AAB_WORKBENCH_ACTIONS = [
  'workbench_context','list_workbench_formulations','list_workbench_ingredients',
  'get_workbench_formulation','get_workbench_ingredient_intelligence',
  'create_workbench_formulation','derive_workbench_formulation',
  'workbench_decide_formulation','workbench_send_to_trial'
];
if (in_array($action, $AAB_WORKBENCH_ACTIONS, true)) {
  try {
    $auth = require_auth();
    $email = strtolower(trim((string)($auth['user']['email'] ?? '')));
    $localRole = strtolower(trim((string)($auth['user']['role'] ?? 'user')));
    if ($email === '') jexit(['ok'=>false,'error'=>'authenticated_email_missing'], 401);

    $factory = require __DIR__ . '/api/agriculture/bootstrap.php';
    $ag = $factory();
    if (!isset($ag['pdo']) || !($ag['pdo'] instanceof PDO)) {
      throw new RuntimeException('AGRICULTURE_POSTGRES_PDO_NOT_AVAILABLE');
    }
    /** @var PDO $wbPdo */
    $wbPdo = $ag['pdo'];

    $actorStmt = $wbPdo->prepare('SELECT * FROM agriculture.api_resolve_authenticated_actor(:email,:role,:display_name)');
    $actorStmt->execute(['email'=>$email,'role'=>$localRole,'display_name'=>$email]);
    $actor = $actorStmt->fetch(PDO::FETCH_ASSOC) ?: [];
    $actorId = trim((string)($actor['actor_id'] ?? ''));
    if ($actorId === '') throw new RuntimeException('AGRICULTURE_ACTOR_RESOLUTION_FAILED');

    $cap = static function(PDO $pdo, string $actorId, string $name): bool {
      $s = $pdo->prepare('SELECT agriculture.api_actor_has_capability(:actor,:cap,NULL)');
      $s->execute(['actor'=>$actorId,'cap'=>$name]);
      return (bool)$s->fetchColumn();
    };
    $caps = [
      'read'=>$cap($wbPdo,$actorId,'read'),
      'create_draft'=>$cap($wbPdo,$actorId,'create_draft'),
      'update_draft'=>$cap($wbPdo,$actorId,'update_draft'),
      'submit_review'=>$cap($wbPdo,$actorId,'submit_review'),
      'review'=>$cap($wbPdo,$actorId,'review'),
      'approve'=>$cap($wbPdo,$actorId,'approve'),
      'retire'=>$cap($wbPdo,$actorId,'retire'),
    ];
    if (!$caps['read']) jexit(['ok'=>false,'error'=>'agriculture_capability_denied','capability'=>'read'],403);

    if ($action === 'workbench_context') {
      jexit(['ok'=>true,'source'=>'POSTGRESQL_AGRICULTURE','actor'=>$actor,'capabilities'=>$caps]);
    }

    if ($action === 'list_workbench_formulations') {
      $s=$wbPdo->query("SELECT * FROM agriculture.v_workbench_formulation_list ORDER BY created_at DESC, formulation_name, version_number DESC");
      jexit(['ok'=>true,'source'=>'POSTGRESQL_AGRICULTURE','records'=>$s->fetchAll(PDO::FETCH_ASSOC)]);
    }

    if ($action === 'list_workbench_ingredients') {
      $s=$wbPdo->query("SELECT * FROM agriculture.v_workbench_selectable_ingredients ORDER BY ingredient_name, ingredient_code");
      jexit(['ok'=>true,'source'=>'POSTGRESQL_AGRICULTURE','records'=>$s->fetchAll(PDO::FETCH_ASSOC)]);
    }

    if ($action === 'get_workbench_formulation') {
      $id=trim((string)($_GET['id'] ?? ''));
      if ($id==='') jexit(['ok'=>false,'error'=>'formulation_version_id_required'],400);
      $s=$wbPdo->prepare('SELECT agriculture.api_workbench_get_formulation(:id)');
      $s->execute(['id'=>$id]);
      $payload=$s->fetchColumn();
      jexit(['ok'=>true,'source'=>'POSTGRESQL_AGRICULTURE','workspace'=>json_decode((string)$payload,true)]);
    }

    if ($action === 'get_workbench_ingredient_intelligence') {
      $id=trim((string)($_GET['id'] ?? ''));
      if ($id==='') jexit(['ok'=>false,'error'=>'ingredient_id_required'],400);
      $s=$wbPdo->prepare('SELECT agriculture.api_workbench_get_ingredient_intelligence(:id)');
      $s->execute(['id'=>$id]);
      $payload=$s->fetchColumn();
      jexit(['ok'=>true,'source'=>'POSTGRESQL_AGRICULTURE','intelligence'=>json_decode((string)$payload,true)]);
    }

    if (strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== 'POST') {
      jexit(['ok'=>false,'error'=>'method_not_allowed','allowed'=>'POST'],405);
    }
    $body = is_array($AAB_JSON_BODY) ? $AAB_JSON_BODY : $_POST;

    if ($action === 'create_workbench_formulation') {
      if (!$caps['create_draft']) jexit(['ok'=>false,'error'=>'agriculture_capability_denied','capability'=>'create_draft'],403);
      $lines=$body['ingredient_lines'] ?? [];
      $s=$wbPdo->prepare('SELECT agriculture.api_workbench_create_formulation(:code,:name,:type,:why,:expected,:lines::jsonb,:actor,:data_class)');
      $s->execute([
        'code'=>strtoupper(trim((string)($body['version_code'] ?? ''))),
        'name'=>trim((string)($body['formulation_name'] ?? '')),
        'type'=>strtoupper(trim((string)($body['formulation_type'] ?? 'OTHER'))),
        'why'=>trim((string)($body['why'] ?? $body['change_rationale'] ?? '')),
        'expected'=>trim((string)($body['expected_outcomes'] ?? '')),
        'lines'=>json_encode($lines,JSON_UNESCAPED_SLASHES),
        'actor'=>$actorId,
        'data_class'=>strtoupper(trim((string)($body['data_class'] ?? 'TEST'))),
      ]);
      jexit(['ok'=>true,'source'=>'POSTGRESQL_AGRICULTURE','action'=>$action,'workspace'=>json_decode((string)$s->fetchColumn(),true)]);
    }

    if ($action === 'derive_workbench_formulation') {
      if (!$caps['update_draft']) jexit(['ok'=>false,'error'=>'agriculture_capability_denied','capability'=>'update_draft'],403);
      $lines=$body['ingredient_lines'] ?? [];
      $s=$wbPdo->prepare('SELECT agriculture.api_workbench_derive_formulation(:parent,:code,:name,:type,:change_type,:why,:expected,:lines::jsonb,:actor,:data_class)');
      $s->execute([
        'parent'=>trim((string)($body['parent_version_id'] ?? '')),
        'code'=>strtoupper(trim((string)($body['version_code'] ?? ''))),
        'name'=>trim((string)($body['formulation_name'] ?? '')),
        'type'=>strtoupper(trim((string)($body['formulation_type'] ?? 'OTHER'))),
        'change_type'=>strtoupper(trim((string)($body['change_type'] ?? 'OTHER'))),
        'why'=>trim((string)($body['why'] ?? $body['change_rationale'] ?? '')),
        'expected'=>trim((string)($body['expected_outcomes'] ?? '')),
        'lines'=>json_encode($lines,JSON_UNESCAPED_SLASHES),
        'actor'=>$actorId,
        'data_class'=>strtoupper(trim((string)($body['data_class'] ?? 'TEST'))),
      ]);
      jexit(['ok'=>true,'source'=>'POSTGRESQL_AGRICULTURE','action'=>$action,'workspace'=>json_decode((string)$s->fetchColumn(),true)]);
    }

    if ($action === 'workbench_decide_formulation') {
      $decision=strtoupper(trim((string)($body['decision'] ?? '')));
      $s=$wbPdo->prepare('SELECT agriculture.api_workbench_decide_formulation(:id,:decision,:why,:evidence,:actor)');
      $s->execute([
        'id'=>trim((string)($body['formulation_version_id'] ?? '')),
        'decision'=>$decision,
        'why'=>trim((string)($body['why'] ?? $body['rationale'] ?? '')),
        'evidence'=>trim((string)($body['evidence_summary'] ?? '')),
        'actor'=>$actorId,
      ]);
      jexit(['ok'=>true,'source'=>'POSTGRESQL_AGRICULTURE','action'=>$action,'workspace'=>json_decode((string)$s->fetchColumn(),true)]);
    }

    $s=$wbPdo->prepare('SELECT * FROM agriculture.api_workbench_send_to_trial(:id,:code,:name,:objective,:protocol,:actor)');
    $s->execute([
      'id'=>trim((string)($body['formulation_version_id'] ?? '')),
      'code'=>strtoupper(trim((string)($body['trial_code'] ?? ''))),
      'name'=>trim((string)($body['trial_name'] ?? '')),
      'objective'=>trim((string)($body['trial_objective'] ?? '')),
      'protocol'=>trim((string)($body['protocol_summary'] ?? '')),
      'actor'=>$actorId,
    ]);
    jexit(['ok'=>true,'source'=>'POSTGRESQL_AGRICULTURE','action'=>$action,'trial'=>$s->fetch(PDO::FETCH_ASSOC)]);
  } catch (Throwable $e) {
    error_log('AAB_POSTGRES_WIRE_05 ' . $e->getMessage());
    $sqlState = $e instanceof PDOException ? (string)$e->getCode() : '';
    $message = $e->getMessage();
    $status = ($sqlState === '42501' || str_contains($message,'CAPABILITY_DENIED')) ? 403 : 503;
    jexit([
      'ok'=>false,'error'=>'agriculture_postgresql_workbench_failed','source'=>'POSTGRESQL_AGRICULTURE','fail_closed'=>true,
      'detail'=>defined('AAB_DEBUG') && AAB_DEBUG ? $message : null
    ],$status);
  }
}


/* =========================================================================
 * AAB-AGRICULTURE-WB-TRIAL-WIRE-01
 * Canonical PostgreSQL Trial workspace reads.
 * ========================================================================= */
$AAB_TRIAL_WORKSPACE_ACTIONS = ['list_trial_workspace','get_trial_workspace'];
if (in_array($action, $AAB_TRIAL_WORKSPACE_ACTIONS, true)) {
  try {
    $auth = require_auth();
    $email = strtolower(trim((string)($auth['user']['email'] ?? '')));
    $localRole = strtolower(trim((string)($auth['user']['role'] ?? 'user')));
    if ($email === '') jexit(['ok'=>false,'error'=>'authenticated_email_missing'],401);

    $factory = require __DIR__ . '/api/agriculture/bootstrap.php';
    $ag = $factory();
    if (!isset($ag['pdo']) || !($ag['pdo'] instanceof PDO)) throw new RuntimeException('AGRICULTURE_POSTGRES_PDO_NOT_AVAILABLE');
    $trialPdo = $ag['pdo'];

    $actorStmt = $trialPdo->prepare('SELECT * FROM agriculture.api_resolve_authenticated_actor(:email,:role,:display_name)');
    $actorStmt->execute(['email'=>$email,'role'=>$localRole,'display_name'=>$email]);
    $actor = $actorStmt->fetch(PDO::FETCH_ASSOC) ?: [];
    $actorId = trim((string)($actor['actor_id'] ?? ''));
    if ($actorId === '') throw new RuntimeException('AGRICULTURE_ACTOR_RESOLUTION_FAILED');

    if ($action === 'list_trial_workspace') {
      $st=$trialPdo->prepare('SELECT agriculture.api_list_trial_workspace(:actor)');
      $st->execute(['actor'=>$actorId]);
      $payload=json_decode((string)$st->fetchColumn(),true);
      jexit(['ok'=>true,'source'=>'POSTGRESQL_AGRICULTURE','actor'=>$actor,'records'=>is_array($payload)?$payload:[]]);
    }

    $id=trim((string)($_GET['id'] ?? ''));
    if ($id==='') jexit(['ok'=>false,'error'=>'trial_id_required'],400);
    $st=$trialPdo->prepare('SELECT agriculture.api_get_trial_workspace(:id,:actor)');
    $st->execute(['id'=>$id,'actor'=>$actorId]);
    $payload=json_decode((string)$st->fetchColumn(),true);
    jexit(['ok'=>true,'source'=>'POSTGRESQL_AGRICULTURE','actor'=>$actor,'trial'=>$payload]);
  } catch (Throwable $e) {
    error_log('AAB_AGRICULTURE_WB_TRIAL_WIRE_01 ' . $e->getMessage());
    $sqlState = $e instanceof PDOException ? (string)$e->getCode() : '';
    $message=$e->getMessage();
    $status=($sqlState==='42501' || str_contains($message,'CAPABILITY_DENIED') || str_contains($message,'ACCESS_DENIED')) ? 403 : 503;
    jexit(['ok'=>false,'error'=>'agriculture_trial_workspace_gateway_failed','source'=>'POSTGRESQL_AGRICULTURE','fail_closed'=>true,'detail'=>defined('AAB_DEBUG')&&AAB_DEBUG?$message:null],$status);
  }
}


/* =========================================================================
 * AAB-AGRICULTURE-TRIAL-PLOT-ACTIVATION-02
 * Governed Trial configuration: Plot assignment -> activation review ->
 * Scientist approval/rejection -> ACTIVE Trial.
 * ========================================================================= */
$AAB_TRIAL_ACTIVATION_ACTIONS = [
  'get_trial_activation_workspace','add_trial_plot',
  'submit_trial_activation','decide_trial_activation'
];
if (in_array($action, $AAB_TRIAL_ACTIVATION_ACTIONS, true)) {
  try {
    $auth = require_auth();
    $email = strtolower(trim((string)($auth['user']['email'] ?? '')));
    $localRole = strtolower(trim((string)($auth['user']['role'] ?? 'user')));
    if ($email === '') jexit(['ok'=>false,'error'=>'authenticated_email_missing'],401);

    $factory = require __DIR__ . '/api/agriculture/bootstrap.php';
    $ag = $factory();
    if (!isset($ag['pdo']) || !($ag['pdo'] instanceof PDO)) throw new RuntimeException('AGRICULTURE_POSTGRES_PDO_NOT_AVAILABLE');
    $pdo = $ag['pdo'];

    $actorStmt = $pdo->prepare('SELECT * FROM agriculture.api_resolve_authenticated_actor(:email,:role,:display_name)');
    $actorStmt->execute(['email'=>$email,'role'=>$localRole,'display_name'=>$email]);
    $actor = $actorStmt->fetch(PDO::FETCH_ASSOC) ?: [];
    $actorId = trim((string)($actor['actor_id'] ?? ''));
    if ($actorId === '') throw new RuntimeException('AGRICULTURE_ACTOR_RESOLUTION_FAILED');

    if ($action === 'get_trial_activation_workspace') {
      $id=trim((string)($_GET['id'] ?? ''));
      if ($id==='') jexit(['ok'=>false,'error'=>'trial_id_required'],400);
      $st=$pdo->prepare('SELECT agriculture.api_get_trial_activation_workspace(:id,:actor)');
      $st->execute(['id'=>$id,'actor'=>$actorId]);
      jexit(['ok'=>true,'source'=>'POSTGRESQL_AGRICULTURE','actor'=>$actor,'workspace'=>json_decode((string)$st->fetchColumn(),true)]);
    }

    $body = json_decode((string)file_get_contents('php://input'), true);
    if (!is_array($body)) $body=[];
    $id=trim((string)($body['trial_id'] ?? ''));
    if ($id==='') jexit(['ok'=>false,'error'=>'trial_id_required'],400);

    if ($action === 'add_trial_plot') {
      $st=$pdo->prepare('SELECT * FROM agriculture.api_trial_add_plot(:trial,:code,:name,:role,:fv,:rep,:lat,:lng,:area,:unit,:actor)');
      $fv=trim((string)($body['formulation_version_id'] ?? ''));
      $st->execute([
        'trial'=>$id,
        'code'=>strtoupper(trim((string)($body['plot_code'] ?? ''))),
        'name'=>trim((string)($body['plot_name'] ?? '')),
        'role'=>strtoupper(trim((string)($body['treatment_role'] ?? 'TREATMENT'))),
        'fv'=>$fv!==''?$fv:null,
        'rep'=>($body['replicate_number'] ?? '')!==''?(int)$body['replicate_number']:null,
        'lat'=>($body['latitude'] ?? '')!==''?$body['latitude']:null,
        'lng'=>($body['longitude'] ?? '')!==''?$body['longitude']:null,
        'area'=>($body['area_value'] ?? '')!==''?$body['area_value']:null,
        'unit'=>trim((string)($body['area_unit'] ?? '')) ?: null,
        'actor'=>$actorId,
      ]);
      jexit(['ok'=>true,'source'=>'POSTGRESQL_AGRICULTURE','action'=>$action,'plot'=>$st->fetch(PDO::FETCH_ASSOC)]);
    }

    if ($action === 'submit_trial_activation') {
      $st=$pdo->prepare('SELECT agriculture.api_trial_submit_for_activation(:trial,:why,:evidence,:actor)');
      $st->execute(['trial'=>$id,'why'=>trim((string)($body['why'] ?? '')),'evidence'=>trim((string)($body['evidence_summary'] ?? '')),'actor'=>$actorId]);
      jexit(['ok'=>true,'source'=>'POSTGRESQL_AGRICULTURE','action'=>$action,'result'=>json_decode((string)$st->fetchColumn(),true)]);
    }

    $st=$pdo->prepare('SELECT agriculture.api_trial_decide_activation(:trial,:decision,:evidence,:rationale,:result,:followup,:actor)');
    $st->execute([
      'trial'=>$id,
      'decision'=>strtoupper(trim((string)($body['decision'] ?? ''))),
      'evidence'=>trim((string)($body['evidence_reviewed_summary'] ?? '')),
      'rationale'=>trim((string)($body['review_rationale'] ?? '')),
      'result'=>trim((string)($body['review_result'] ?? '')),
      'followup'=>trim((string)($body['required_follow_up'] ?? '')) ?: null,
      'actor'=>$actorId,
    ]);
    jexit(['ok'=>true,'source'=>'POSTGRESQL_AGRICULTURE','action'=>$action,'result'=>json_decode((string)$st->fetchColumn(),true)]);
  } catch (Throwable $e) {
    error_log('AAB_AGRICULTURE_TRIAL_PLOT_ACTIVATION_02 ' . $e->getMessage());
    $sqlState = $e instanceof PDOException ? (string)$e->getCode() : '';
    $message=$e->getMessage();
    $status=($sqlState==='42501' || str_contains($message,'CAPABILITY_DENIED') || str_contains($message,'ACCESS_DENIED')) ? 403 : 503;
    jexit(['ok'=>false,'error'=>'agriculture_trial_activation_gateway_failed','source'=>'POSTGRESQL_AGRICULTURE','fail_closed'=>true,'detail'=>defined('AAB_DEBUG')&&AAB_DEBUG?$message:null],$status);
  }
}


/* =========================================================================
 * AAB-AGRICULTURE-OBSERVATION-CAPTURE-03
 * Trial protocol binding + canonical observation capture.
 * AAB owns metric units; observers submit values only.
 * ========================================================================= */
$AAB_OBSERVATION_CAPTURE_ACTIONS = [
  'trial_protocol_catalog','bind_trial_protocol',
  'list_observation_capture_targets','get_observation_capture_workspace',
  'capture_observation'
];
if (in_array($action, $AAB_OBSERVATION_CAPTURE_ACTIONS, true)) {
  try {
    $auth = require_auth();
    $email = strtolower(trim((string)($auth['user']['email'] ?? '')));
    $localRole = strtolower(trim((string)($auth['user']['role'] ?? 'user')));
    if ($email === '') jexit(['ok'=>false,'error'=>'authenticated_email_missing'],401);

    $factory = require __DIR__ . '/api/agriculture/bootstrap.php';
    $ag = $factory();
    if (!isset($ag['pdo']) || !($ag['pdo'] instanceof PDO)) throw new RuntimeException('AGRICULTURE_POSTGRES_PDO_NOT_AVAILABLE');
    $pdo = $ag['pdo'];

    $actorStmt = $pdo->prepare('SELECT * FROM agriculture.api_resolve_authenticated_actor(:email,:role,:display_name)');
    $actorStmt->execute(['email'=>$email,'role'=>$localRole,'display_name'=>$email]);
    $actor = $actorStmt->fetch(PDO::FETCH_ASSOC) ?: [];
    $actorId = trim((string)($actor['actor_id'] ?? ''));
    if ($actorId === '') throw new RuntimeException('AGRICULTURE_ACTOR_RESOLUTION_FAILED');

    if ($action === 'list_observation_capture_targets') {
      $st=$pdo->prepare('SELECT agriculture.api_list_observation_capture_targets(:actor)');
      $st->execute(['actor'=>$actorId]);
      $payload=json_decode((string)$st->fetchColumn(),true);
      jexit(['ok'=>true,'source'=>'POSTGRESQL_AGRICULTURE','actor'=>$actor,'records'=>is_array($payload)?$payload:[]]);
    }

    if ($action === 'trial_protocol_catalog') {
      $id=trim((string)($_GET['id'] ?? ''));
      if ($id==='') jexit(['ok'=>false,'error'=>'trial_id_required'],400);
      $st=$pdo->prepare('SELECT agriculture.api_trial_protocol_catalog(:trial,:actor)');
      $st->execute(['trial'=>$id,'actor'=>$actorId]);
      jexit(['ok'=>true,'source'=>'POSTGRESQL_AGRICULTURE','actor'=>$actor,'catalog'=>json_decode((string)$st->fetchColumn(),true)]);
    }

    if ($action === 'get_observation_capture_workspace') {
      $trial=trim((string)($_GET['trial_id'] ?? ''));
      $plot=trim((string)($_GET['plot_id'] ?? ''));
      $template=trim((string)($_GET['template_version_id'] ?? ''));
      if ($trial==='' || $plot==='' || $template==='') jexit(['ok'=>false,'error'=>'trial_plot_template_required'],400);
      $st=$pdo->prepare('SELECT agriculture.api_get_observation_capture_workspace(:trial,:plot,:template,:actor)');
      $st->execute(['trial'=>$trial,'plot'=>$plot,'template'=>$template,'actor'=>$actorId]);
      jexit(['ok'=>true,'source'=>'POSTGRESQL_AGRICULTURE','actor'=>$actor,'workspace'=>json_decode((string)$st->fetchColumn(),true)]);
    }

    $body = json_decode((string)file_get_contents('php://input'), true);
    if (!is_array($body)) $body=[];

    if ($action === 'bind_trial_protocol') {
      $trial=trim((string)($body['trial_id'] ?? ''));
      $template=trim((string)($body['template_version_id'] ?? ''));
      if ($trial==='' || $template==='') jexit(['ok'=>false,'error'=>'trial_template_required'],400);
      $st=$pdo->prepare('SELECT * FROM agriculture.api_bind_trial_protocol(:trial,:template,:role,:required,:actor)');
      $st->bindValue(':trial',$trial);
      $st->bindValue(':template',$template);
      $st->bindValue(':role',strtoupper(trim((string)($body['binding_role'] ?? 'PRIMARY'))));
      $st->bindValue(':required',(bool)($body['required'] ?? true),PDO::PARAM_BOOL);
      $st->bindValue(':actor',$actorId);
      $st->execute();
      jexit(['ok'=>true,'source'=>'POSTGRESQL_AGRICULTURE','action'=>$action,'binding'=>$st->fetch(PDO::FETCH_ASSOC)]);
    }

    $trial=trim((string)($body['trial_id'] ?? ''));
    $plot=trim((string)($body['plot_id'] ?? ''));
    $template=trim((string)($body['template_version_id'] ?? ''));
    $code=strtoupper(trim((string)($body['observation_code'] ?? '')));
    if ($trial==='' || $plot==='' || $template==='' || $code==='') jexit(['ok'=>false,'error'=>'observation_capture_fields_required'],400);
    $values=$body['values'] ?? [];
    if (!is_array($values)) $values=[];
    $observedAt=trim((string)($body['observed_at'] ?? ''));
    $st=$pdo->prepare('SELECT agriculture.api_capture_observation(:code,:trial,:plot,:template,:observed_at,:notes,CAST(:values AS jsonb),:actor)');
    $st->execute([
      'code'=>$code,'trial'=>$trial,'plot'=>$plot,'template'=>$template,
      'observed_at'=>$observedAt!==''?$observedAt:null,
      'notes'=>trim((string)($body['notes'] ?? '')) ?: null,
      'values'=>json_encode($values,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE),
      'actor'=>$actorId
    ]);
    jexit(['ok'=>true,'source'=>'POSTGRESQL_AGRICULTURE','action'=>$action,'result'=>json_decode((string)$st->fetchColumn(),true)]);
  } catch (Throwable $e) {
    error_log('AAB_AGRICULTURE_OBSERVATION_CAPTURE_03 ' . $e->getMessage());
    $sqlState = $e instanceof PDOException ? (string)$e->getCode() : '';
    $message=$e->getMessage();
    $status=($sqlState==='42501' || str_contains($message,'CAPABILITY_DENIED') || str_contains($message,'ACCESS_DENIED')) ? 403 : 503;
    jexit(['ok'=>false,'error'=>'agriculture_observation_capture_gateway_failed','source'=>'POSTGRESQL_AGRICULTURE','fail_closed'=>true,'detail'=>defined('AAB_DEBUG')&&AAB_DEBUG?$message:null],$status);
  }
}

/* =========================================================================
 * AAB-AGRICULTURE-OBSERVATION-EVIDENCE-OUTCOME-04
 * Governed observation review, evidence eligibility and outcome lifecycle.
 * ========================================================================= */
$AAB_OBSERVATION_OUTCOME_ACTIONS = [
  'list_observation_science_workspace','get_observation_science_workspace',
  'prepare_observation_review','decide_observation_review',
  'list_outcome_workspace','get_outcome_workspace',
  'record_outcome','prepare_outcome_review','decide_outcome_review','complete_trial'
];
if (in_array($action, $AAB_OBSERVATION_OUTCOME_ACTIONS, true)) {
  try {
    $auth = require_auth();
    $email = strtolower(trim((string)($auth['user']['email'] ?? '')));
    $localRole = strtolower(trim((string)($auth['user']['role'] ?? 'user')));
    if ($email === '') jexit(['ok'=>false,'error'=>'authenticated_email_missing'],401);

    $factory = require __DIR__ . '/api/agriculture/bootstrap.php';
    $ag = $factory();
    if (!isset($ag['pdo']) || !($ag['pdo'] instanceof PDO)) throw new RuntimeException('AGRICULTURE_POSTGRES_PDO_NOT_AVAILABLE');
    $pdo = $ag['pdo'];

    $actorStmt = $pdo->prepare('SELECT * FROM agriculture.api_resolve_authenticated_actor(:email,:role,:display_name)');
    $actorStmt->execute(['email'=>$email,'role'=>$localRole,'display_name'=>$email]);
    $actor = $actorStmt->fetch(PDO::FETCH_ASSOC) ?: [];
    $actorId = trim((string)($actor['actor_id'] ?? ''));
    if ($actorId === '') throw new RuntimeException('AGRICULTURE_ACTOR_RESOLUTION_FAILED');

    if ($action === 'list_observation_science_workspace') {
      $st=$pdo->prepare('SELECT agriculture.api_list_observation_science_workspace(:actor)');
      $st->execute(['actor'=>$actorId]);
      $payload=json_decode((string)$st->fetchColumn(),true);
      jexit(['ok'=>true,'source'=>'POSTGRESQL_AGRICULTURE','actor'=>$actor,'records'=>is_array($payload)?$payload:[]]);
    }
    if ($action === 'get_observation_science_workspace') {
      $id=trim((string)($_GET['id'] ?? ''));
      if ($id==='') jexit(['ok'=>false,'error'=>'observation_id_required'],400);
      $st=$pdo->prepare('SELECT agriculture.api_get_observation_science_workspace(:id,:actor)');
      $st->execute(['id'=>$id,'actor'=>$actorId]);
      jexit(['ok'=>true,'source'=>'POSTGRESQL_AGRICULTURE','actor'=>$actor,'observation'=>json_decode((string)$st->fetchColumn(),true)]);
    }
    if ($action === 'list_outcome_workspace') {
      $st=$pdo->prepare('SELECT agriculture.api_list_outcome_workspace(:actor)');
      $st->execute(['actor'=>$actorId]);
      $payload=json_decode((string)$st->fetchColumn(),true);
      jexit(['ok'=>true,'source'=>'POSTGRESQL_AGRICULTURE','actor'=>$actor,'records'=>is_array($payload)?$payload:[]]);
    }
    if ($action === 'get_outcome_workspace') {
      $id=trim((string)($_GET['id'] ?? ''));
      if ($id==='') jexit(['ok'=>false,'error'=>'outcome_id_required'],400);
      $st=$pdo->prepare('SELECT agriculture.api_get_outcome_workspace(:id,:actor)');
      $st->execute(['id'=>$id,'actor'=>$actorId]);
      jexit(['ok'=>true,'source'=>'POSTGRESQL_AGRICULTURE','actor'=>$actor,'outcome'=>json_decode((string)$st->fetchColumn(),true)]);
    }

    $body=json_decode((string)file_get_contents('php://input'),true);
    if (!is_array($body)) $body=[];

    if ($action === 'prepare_observation_review') {
      $id=trim((string)($body['observation_id'] ?? ''));
      if ($id==='') jexit(['ok'=>false,'error'=>'observation_id_required'],400);
      $st=$pdo->prepare('SELECT agriculture.api_prepare_observation_review(:id,:actor)');
      $st->execute(['id'=>$id,'actor'=>$actorId]);
      jexit(['ok'=>true,'source'=>'POSTGRESQL_AGRICULTURE','action'=>$action,'result'=>json_decode((string)$st->fetchColumn(),true)]);
    }
    if ($action === 'decide_observation_review') {
      $id=trim((string)($body['observation_id'] ?? ''));
      $decision=strtoupper(trim((string)($body['decision'] ?? '')));
      if ($id==='' || !in_array($decision,['APPROVE','REJECT'],true)) jexit(['ok'=>false,'error'=>'observation_review_fields_required'],400);
      $st=$pdo->prepare('SELECT agriculture.api_decide_observation_review(:id,:decision,:evidence,:rationale,:quality,:complete,:context,:method,:evidence_quality,:photo,:actor)');
      $st->execute([
        'id'=>$id,'decision'=>$decision,
        'evidence'=>trim((string)($body['evidence_reviewed_summary'] ?? '')),
        'rationale'=>trim((string)($body['review_rationale'] ?? '')),
        'quality'=>strtoupper(trim((string)($body['quality_status'] ?? 'ACCEPTABLE'))),
        'complete'=>strtoupper(trim((string)($body['completeness_status'] ?? 'COMPLETE'))),
        'context'=>strtoupper(trim((string)($body['context_quality'] ?? 'ADEQUATE'))),
        'method'=>strtoupper(trim((string)($body['method_quality'] ?? 'MODERATE'))),
        'evidence_quality'=>strtoupper(trim((string)($body['evidence_quality'] ?? 'MODERATE'))),
        'photo'=>strtoupper(trim((string)($body['photo_quality'] ?? 'NOT_APPLICABLE'))),
        'actor'=>$actorId
      ]);
      $result=json_decode((string)$st->fetchColumn(),true);
      $cognitiveSync=null;
      if ($decision==='APPROVE') {
        try {
          $cognitiveSync=['ok'=>true,'result'=>aab_run_agriculture_cognitive_with_activity($pdo,$actorId,['source_action'=>$action,'entity_type'=>'OBSERVATION','entity_id'=>$id,'headline'=>'Approved Observation triggered governed cognitive reasoning.'])];
        } catch (Throwable $syncError) {
          $cognitiveSync=['ok'=>false,'fail_closed'=>true,'detail'=>defined('AAB_DEBUG')&&AAB_DEBUG?$syncError->getMessage():null];
        }
      }
      jexit(['ok'=>true,'source'=>'POSTGRESQL_AGRICULTURE','action'=>$action,'result'=>$result,'cognitive_sync'=>$cognitiveSync]);
    }
    if ($action === 'record_outcome') {
      $trial=trim((string)($body['trial_id'] ?? ''));
      $code=strtoupper(trim((string)($body['outcome_code'] ?? '')));
      $summary=trim((string)($body['outcome_summary'] ?? ''));
      if ($trial==='' || $code==='' || $summary==='') jexit(['ok'=>false,'error'=>'outcome_fields_required'],400);
      $st=$pdo->prepare('SELECT * FROM agriculture.api_record_outcome(:code,:trial,:type,:summary,:plot,CAST(:payload AS jsonb),NULL,:actor)');
      $st->execute([
        'code'=>$code,'trial'=>$trial,'type'=>strtoupper(trim((string)($body['outcome_type'] ?? 'TRIAL'))),
        'summary'=>$summary,'plot'=>trim((string)($body['plot_id'] ?? '')) ?: null,
        'payload'=>json_encode($body['outcome_payload'] ?? [],JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE),'actor'=>$actorId
      ]);
      jexit(['ok'=>true,'source'=>'POSTGRESQL_AGRICULTURE','action'=>$action,'outcome'=>$st->fetch(PDO::FETCH_ASSOC)]);
    }
    if ($action === 'prepare_outcome_review') {
      $id=trim((string)($body['outcome_id'] ?? ''));
      if ($id==='') jexit(['ok'=>false,'error'=>'outcome_id_required'],400);
      $st=$pdo->prepare('SELECT agriculture.api_prepare_outcome_review(:id,:actor)');
      $st->execute(['id'=>$id,'actor'=>$actorId]);
      jexit(['ok'=>true,'source'=>'POSTGRESQL_AGRICULTURE','action'=>$action,'result'=>json_decode((string)$st->fetchColumn(),true)]);
    }
    if ($action === 'decide_outcome_review') {
      $id=trim((string)($body['outcome_id'] ?? ''));
      $decision=strtoupper(trim((string)($body['decision'] ?? '')));
      if ($id==='' || !in_array($decision,['APPROVE','REJECT'],true)) jexit(['ok'=>false,'error'=>'outcome_review_fields_required'],400);
      $st=$pdo->prepare('SELECT * FROM agriculture.api_decide_outcome_review(:id,:decision,:evidence,:rationale,:actor)');
      $st->execute(['id'=>$id,'decision'=>$decision,'evidence'=>trim((string)($body['evidence_reviewed_summary'] ?? '')),'rationale'=>trim((string)($body['review_rationale'] ?? '')),'actor'=>$actorId]);
      $outcome=$st->fetch(PDO::FETCH_ASSOC);
      $cognitiveSync=null;
      if ($decision==='APPROVE') {
        try {
          $cognitiveSync=['ok'=>true,'result'=>aab_run_agriculture_cognitive_with_activity($pdo,$actorId,['source_action'=>$action,'entity_type'=>'OUTCOME','entity_id'=>$id,'headline'=>'Approved Outcome triggered governed cognitive reasoning.'])];
        } catch (Throwable $syncError) {
          $cognitiveSync=['ok'=>false,'fail_closed'=>true,'detail'=>defined('AAB_DEBUG')&&AAB_DEBUG?$syncError->getMessage():null];
        }
      }
      jexit(['ok'=>true,'source'=>'POSTGRESQL_AGRICULTURE','action'=>$action,'outcome'=>$outcome,'cognitive_sync'=>$cognitiveSync]);
    }
    if ($action === 'complete_trial') {
      $id=trim((string)($body['trial_id'] ?? ''));
      if ($id==='') jexit(['ok'=>false,'error'=>'trial_id_required'],400);
      $st=$pdo->prepare('SELECT * FROM agriculture.api_complete_trial(:id,:actor)');
      $st->execute(['id'=>$id,'actor'=>$actorId]);
      $trial=$st->fetch(PDO::FETCH_ASSOC);
      $cognitiveSync=null;
      try {
        $cognitiveSync=['ok'=>true,'result'=>aab_run_agriculture_cognitive_with_activity($pdo,$actorId,['source_action'=>$action,'entity_type'=>'TRIAL','entity_id'=>$id,'headline'=>'Completed Trial triggered governed cognitive reasoning.'])];
      } catch (Throwable $syncError) {
        $cognitiveSync=['ok'=>false,'fail_closed'=>true,'detail'=>defined('AAB_DEBUG')&&AAB_DEBUG?$syncError->getMessage():null];
      }
      jexit(['ok'=>true,'source'=>'POSTGRESQL_AGRICULTURE','action'=>$action,'trial'=>$trial,'cognitive_sync'=>$cognitiveSync]);
    }
  } catch (Throwable $e) {
    error_log('AAB_AGRICULTURE_OBSERVATION_EVIDENCE_OUTCOME_04 ' . $e->getMessage());
    $sqlState=$e instanceof PDOException ? (string)$e->getCode() : '';
    $message=$e->getMessage();
    $status=($sqlState==='42501' || str_contains($message,'CAPABILITY_DENIED') || str_contains($message,'ACCESS_DENIED')) ? 403 : 503;
    jexit(['ok'=>false,'error'=>'agriculture_observation_outcome_gateway_failed','source'=>'POSTGRESQL_AGRICULTURE','fail_closed'=>true,'detail'=>defined('AAB_DEBUG')&&AAB_DEBUG?$message:null],$status);
  }
}

/* =========================================================================
 * AAB-AGRICULTURE-LEARNING-MEMORY-05
 * Completed Trial -> governed Learning Candidate -> Scientific Memory.
 * ========================================================================= */
$AAB_LEARNING_MEMORY_ACTIONS = [
  'list_learning_memory_workspace','prepare_trial_learning',
  'submit_learning_review','decide_learning_review'
];
if (in_array($action, $AAB_LEARNING_MEMORY_ACTIONS, true)) {
  try {
    $auth = require_auth();
    $email = strtolower(trim((string)($auth['user']['email'] ?? '')));
    $localRole = strtolower(trim((string)($auth['user']['role'] ?? 'user')));
    if ($email === '') jexit(['ok'=>false,'error'=>'authenticated_email_missing'],401);

    $factory = require __DIR__ . '/api/agriculture/bootstrap.php';
    $ag = $factory();
    if (!isset($ag['pdo']) || !($ag['pdo'] instanceof PDO)) throw new RuntimeException('AGRICULTURE_POSTGRES_PDO_NOT_AVAILABLE');
    $pdo = $ag['pdo'];

    $actorStmt = $pdo->prepare('SELECT * FROM agriculture.api_resolve_authenticated_actor(:email,:role,:display_name)');
    $actorStmt->execute(['email'=>$email,'role'=>$localRole,'display_name'=>$email]);
    $actor = $actorStmt->fetch(PDO::FETCH_ASSOC) ?: [];
    $actorId = trim((string)($actor['actor_id'] ?? ''));
    if ($actorId === '') throw new RuntimeException('AGRICULTURE_ACTOR_RESOLUTION_FAILED');

    if ($action === 'list_learning_memory_workspace') {
      $st=$pdo->prepare('SELECT agriculture.api_list_learning_workspace(:actor)');
      $st->execute(['actor'=>$actorId]);
      $payload=json_decode((string)$st->fetchColumn(),true);
      jexit(['ok'=>true,'source'=>'POSTGRESQL_AGRICULTURE','actor'=>$actor,'workspace'=>is_array($payload)?$payload:[]]);
    }

    $body=json_decode((string)file_get_contents('php://input'),true);
    if (!is_array($body)) $body=[];

    if ($action === 'prepare_trial_learning') {
      $trial=trim((string)($body['trial_id'] ?? ''));
      $type=strtoupper(trim((string)($body['candidate_type'] ?? '')));
      $statement=trim((string)($body['learning_statement'] ?? ''));
      if ($trial==='' || $type==='' || $statement==='') jexit(['ok'=>false,'error'=>'learning_candidate_fields_required'],400);
      $st=$pdo->prepare('SELECT * FROM agriculture.api_prepare_trial_learning(:trial,:type,:statement,:uncertainty,:contradiction,:actor)');
      $st->execute([
        'trial'=>$trial,'type'=>$type,'statement'=>$statement,
        'uncertainty'=>trim((string)($body['uncertainty_summary'] ?? '')) ?: null,
        'contradiction'=>trim((string)($body['contradiction_summary'] ?? '')) ?: null,
        'actor'=>$actorId
      ]);
      jexit(['ok'=>true,'source'=>'POSTGRESQL_AGRICULTURE','action'=>$action,'learning_candidate'=>$st->fetch(PDO::FETCH_ASSOC)]);
    }

    if ($action === 'submit_learning_review') {
      $id=trim((string)($body['learning_candidate_id'] ?? ''));
      if ($id==='') jexit(['ok'=>false,'error'=>'learning_candidate_id_required'],400);
      $st=$pdo->prepare('SELECT agriculture.api_prepare_learning_review(:id,:actor)');
      $st->execute(['id'=>$id,'actor'=>$actorId]);
      jexit(['ok'=>true,'source'=>'POSTGRESQL_AGRICULTURE','action'=>$action,'result'=>json_decode((string)$st->fetchColumn(),true)]);
    }

    if ($action === 'decide_learning_review') {
      $id=trim((string)($body['learning_candidate_id'] ?? ''));
      $decision=strtoupper(trim((string)($body['decision'] ?? '')));
      if ($id==='' || !in_array($decision,['APPROVE','REJECT'],true)) jexit(['ok'=>false,'error'=>'learning_review_fields_required'],400);
      $scope=$body['applicability_scope'] ?? [];
      if (!is_array($scope)) $scope=[];
      $st=$pdo->prepare('SELECT agriculture.api_decide_learning_review(:id,:decision,:evidence,:rationale,CAST(:scope AS jsonb),:limitations,:negative_action,:mechanism_statement,:mechanism_pathway,:mechanism_effects,:claim_a,:claim_b,:actor)');
      $st->execute([
        'id'=>$id,'decision'=>$decision,
        'evidence'=>trim((string)($body['evidence_reviewed_summary'] ?? '')),
        'rationale'=>trim((string)($body['review_rationale'] ?? '')),
        'scope'=>json_encode($scope,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE),
        'limitations'=>trim((string)($body['limitation_summary'] ?? '')) ?: null,
        'negative_action'=>strtoupper(trim((string)($body['negative_downstream_action'] ?? ''))) ?: null,
        'mechanism_statement'=>trim((string)($body['mechanism_statement'] ?? '')) ?: null,
        'mechanism_pathway'=>trim((string)($body['mechanism_pathway'] ?? '')) ?: null,
        'mechanism_effects'=>trim((string)($body['mechanism_expected_effects'] ?? '')) ?: null,
        'claim_a'=>trim((string)($body['claim_a'] ?? '')) ?: null,
        'claim_b'=>trim((string)($body['claim_b'] ?? '')) ?: null,
        'actor'=>$actorId
      ]);
      $result=json_decode((string)$st->fetchColumn(),true);
      $cognitiveSync=null;
      if ($decision==='APPROVE') {
        try {
          $cognitiveSync=['ok'=>true,'result'=>aab_run_agriculture_cognitive_with_activity($pdo,$actorId,['source_action'=>$action,'entity_type'=>'LEARNING_CANDIDATE','entity_id'=>$id,'headline'=>'Approved Learning triggered governed cognitive reasoning.'])];
        } catch (Throwable $syncError) {
          $cognitiveSync=['ok'=>false,'fail_closed'=>true,'detail'=>defined('AAB_DEBUG')&&AAB_DEBUG?$syncError->getMessage():null];
        }
      }
      jexit(['ok'=>true,'source'=>'POSTGRESQL_AGRICULTURE','action'=>$action,'result'=>$result,'cognitive_sync'=>$cognitiveSync]);
    }
  } catch (Throwable $e) {
    error_log('AAB_AGRICULTURE_LEARNING_MEMORY_05 ' . $e->getMessage());
    $sqlState=$e instanceof PDOException ? (string)$e->getCode() : '';
    $message=$e->getMessage();
    $status=($sqlState==='42501' || str_contains($message,'CAPABILITY_DENIED') || str_contains($message,'ACCESS_DENIED')) ? 403 : 503;
    jexit(['ok'=>false,'error'=>'agriculture_learning_memory_gateway_failed','source'=>'POSTGRESQL_AGRICULTURE','fail_closed'=>true,'detail'=>defined('AAB_DEBUG')&&AAB_DEBUG?$message:null],$status);
  }
}

/* =========================================================================
 * AAB-LIVE-INTELLIGENCE-SURFACE-01
 * Truthful runtime activity instrumentation. No decorative/simulated status.
 * ========================================================================= */
function aab_intel_record_completed(PDO $pdo, string $actorId, array $event): ?array {
  try {
    $st=$pdo->prepare("SELECT cognitive_core.api_record_completed_intelligence_activity(:domain,:scope,:code,:label,:type,:headline,:trigger_type,:trigger_id,:trigger_label,CAST(:detail AS jsonb),:actor,:country,:correlation,:parent)");
    $st->execute([
      'domain'=>$event['domain'] ?? 'AGRICULTURE',
      'scope'=>$event['scope'] ?? 'SYSTEM',
      'code'=>$event['code'] ?? null,
      'label'=>$event['label'] ?? null,
      'type'=>$event['type'] ?? 'COMPLETED',
      'headline'=>$event['headline'] ?? 'AAB intelligence activity completed.',
      'trigger_type'=>$event['trigger_type'] ?? null,
      'trigger_id'=>$event['trigger_id'] ?? null,
      'trigger_label'=>$event['trigger_label'] ?? null,
      'detail'=>json_encode($event['detail'] ?? [],JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE),
      'actor'=>$actorId,
      'country'=>$event['country'] ?? null,
      'correlation'=>$event['correlation'] ?? null,
      'parent'=>$event['parent'] ?? null,
    ]);
    return json_decode((string)$st->fetchColumn(),true);
  } catch (Throwable $e) {
    error_log('AAB_LIVE_INTEL_RECORD ' . $e->getMessage());
    return null;
  }
}

function aab_run_agriculture_cognitive_with_activity(PDO $pdo, string $actorId, array $trigger=[]): array {
  $eventId=null; $correlation=null;
  try {
    $begin=$pdo->prepare("SELECT cognitive_core.api_begin_intelligence_activity('AGRICULTURE','BRAIN','UNIVERSAL_COGNITIVE_KERNEL','Universal Cognitive Kernel','PROCESSING',:headline,:trigger_type,:trigger_id,:trigger_label,CAST(:detail AS jsonb),:actor,NULL,NULL,NULL)");
    $begin->execute([
      'headline'=>$trigger['headline'] ?? 'Agriculture cognitive reasoning is processing governed scientific state.',
      'trigger_type'=>$trigger['entity_type'] ?? null,
      'trigger_id'=>$trigger['entity_id'] ?? null,
      'trigger_label'=>$trigger['label'] ?? null,
      'detail'=>json_encode(['source_action'=>$trigger['source_action'] ?? 'cognitive_refresh'],JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE),
      'actor'=>$actorId,
    ]);
    $evt=json_decode((string)$begin->fetchColumn(),true) ?: [];
    $eventId=$evt['activity_event_id'] ?? null;
    $correlation=$evt['correlation_id'] ?? null;

    $st=$pdo->prepare('SELECT cognitive_core.api_run_agriculture_cognitive_loop(:actor)');
    $st->execute(['actor'=>$actorId]);
    $result=json_decode((string)$st->fetchColumn(),true) ?: [];
    $obs=$result['observation_sync'] ?? [];
    $agr=$result['agriculture_sync'] ?? [];

    $base=['domain'=>'AGRICULTURE','correlation'=>$correlation,'parent'=>$eventId,'trigger_type'=>$trigger['entity_type'] ?? null,'trigger_id'=>$trigger['entity_id'] ?? null,'trigger_label'=>$trigger['label'] ?? null];
    $obsNodes=(int)($obs['observation_nodes_materialised'] ?? 0);
    $obsSignals=(int)($obs['observation_evidence_signals_materialised'] ?? 0);
    if ($obsNodes>0 || $obsSignals>0) aab_intel_record_completed($pdo,$actorId,$base+[
      'scope'=>'BRAIN','code'=>'EVIDENCE_REASONING_ENGINE','label'=>'Evidence Reasoning Engine','type'=>'ANALYSING',
      'headline'=>'Reviewed Agriculture evidence was integrated into the cognitive graph.',
      'detail'=>['observation_nodes'=>$obsNodes,'evidence_signals'=>$obsSignals]
    ]);

    $nodes=(int)($agr['nodes_materialised'] ?? 0);
    if ($nodes>0) aab_intel_record_completed($pdo,$actorId,$base+[
      'scope'=>'NODE','code'=>'AGRICULTURE_NODE_MATERIALISATION','label'=>'Agriculture Node Materialisation','type'=>'MATERIALISING',
      'headline'=>$nodes.' governed Agriculture node materialisation step(s) completed.',
      'detail'=>['nodes_materialised'=>$nodes]
    ]);

    $rels=(int)($agr['relationships_materialised'] ?? 0);
    if ($rels>0) aab_intel_record_completed($pdo,$actorId,$base+[
      'scope'=>'RELATIONSHIP','code'=>'AGRICULTURE_RELATIONSHIP_ENGINE','label'=>'Agriculture Relationship Engine','type'=>'EVALUATING',
      'headline'=>$rels.' governed scientific relationship evaluation step(s) completed.',
      'detail'=>['relationships_materialised'=>$rels]
    ]);

    $states=(int)($agr['states_recomputed'] ?? 0);
    if ($states>0) aab_intel_record_completed($pdo,$actorId,$base+[
      'scope'=>'ALGORITHM','code'=>'UCK_STATE_VECTOR_SET','label'=>'Universal Cognitive State Algorithms','type'=>'RECOMPUTING',
      'headline'=>$states.' intelligent node state(s) were recomputed from governed evidence.',
      'detail'=>['states_recomputed'=>$states,'algorithm_codes'=>['EVIDENCE_WEIGHTED_BELIEF','EVIDENCE_INDEPENDENCE','CONTEXT_DISTANCE','CONTRADICTION_PRESSURE','MECHANISM_CONSISTENCY','NEGATIVE_LEARNING_PRESSURE','KNOWLEDGE_GAP_DENSITY','EXPECTED_INFORMATION_GAIN','ANOMALY_SIGNAL','TEMPORAL_RELEVANCE']]
    ]);

    $investigations=(int)($agr['investigations_created'] ?? 0);
    if ($investigations>0) aab_intel_record_completed($pdo,$actorId,$base+[
      'scope'=>'BRAIN','code'=>'ACTIVE_LEARNING_ENGINE','label'=>'Active Learning Engine','type'=>'ANALYSING',
      'headline'=>$investigations.' next-investigation candidate(s) were derived from real knowledge gaps.',
      'detail'=>['investigations_created'=>$investigations]
    ]);
    if ($investigations>0) aab_intel_record_completed($pdo,$actorId,$base+[
      'scope'=>'INVESTIGATION','code'=>'NEXT_INVESTIGATION','label'=>'Next Investigation','type'=>'CREATED',
      'headline'=>$investigations.' governed investigation candidate(s) are available for human review.',
      'detail'=>['investigations_created'=>$investigations]
    ]);

    $problems=(int)($agr['aab_problem_signals_created'] ?? 0);
    if ($problems>0) aab_intel_record_completed($pdo,$actorId,$base+[
      'scope'=>'BRAIN','code'=>'LOCAL_PROBLEM_BRAIN','label'=>'Local Problem Brain','type'=>'ANALYSING',
      'headline'=>$problems.' AAB-detected scientific problem signal(s) were created from governed gaps.',
      'detail'=>['problem_signals_created'=>$problems]
    ]);

    if ($eventId) {
      $finish=$pdo->prepare("SELECT cognitive_core.api_finish_intelligence_activity(:id,'COMPLETED',:headline,CAST(:detail AS jsonb),:actor)");
      $finish->execute(['id'=>$eventId,'headline'=>'Agriculture cognitive reasoning completed and is up to date.','detail'=>json_encode(['result'=>$result],JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE),'actor'=>$actorId]);
    }
    return $result;
  } catch (Throwable $e) {
    if ($eventId) {
      try {
        $fail=$pdo->prepare("SELECT cognitive_core.api_finish_intelligence_activity(:id,'FAILED',:headline,CAST(:detail AS jsonb),:actor)");
        $fail->execute(['id'=>$eventId,'headline'=>'Agriculture cognitive reasoning failed closed.','detail'=>json_encode(['error'=>$e->getMessage()],JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE),'actor'=>$actorId]);
      } catch (Throwable $ignored) {}
    }
    throw $e;
  }
}

/* =========================================================================
 * AAB-UNIVERSAL-COGNITIVE-KERNEL-01
 * Shared cognitive foundation inherited by every registered AAB domain.
 * ========================================================================= */
$AAB_COGNITIVE_ACTIONS = [
  'cognitive_foundation_workspace','submit_problem_signal',
  'create_transformation_opportunity','propose_ingredient_build_candidate',
  'compute_cognitive_node_state','agriculture_cognitive_loop_workspace',
  'run_agriculture_cognitive_loop','live_intelligence_surface','intelligence_activity_timeline'
];
if (in_array($action, $AAB_COGNITIVE_ACTIONS, true)) {
  try {
    $auth = require_auth();
    $email = strtolower(trim((string)($auth['user']['email'] ?? '')));
    $localRole = strtolower(trim((string)($auth['user']['role'] ?? 'user')));
    if ($email === '') jexit(['ok'=>false,'error'=>'authenticated_email_missing'],401);

    $factory = require __DIR__ . '/api/agriculture/bootstrap.php';
    $ag = $factory();
    if (!isset($ag['pdo']) || !($ag['pdo'] instanceof PDO)) throw new RuntimeException('AGRICULTURE_POSTGRES_PDO_NOT_AVAILABLE');
    $pdo = $ag['pdo'];

    $actorStmt = $pdo->prepare('SELECT * FROM agriculture.api_resolve_authenticated_actor(:email,:role,:display_name)');
    $actorStmt->execute(['email'=>$email,'role'=>$localRole,'display_name'=>$email]);
    $actor = $actorStmt->fetch(PDO::FETCH_ASSOC) ?: [];
    $actorId = trim((string)($actor['actor_id'] ?? ''));
    if ($actorId === '') throw new RuntimeException('AGRICULTURE_ACTOR_RESOLUTION_FAILED');

    if ($action === 'agriculture_cognitive_loop_workspace') {
      $st=$pdo->prepare('SELECT cognitive_core.api_get_agriculture_cognitive_loop_workspace(:actor)');
      $st->execute(['actor'=>$actorId]);
      jexit(['ok'=>true,'source'=>'POSTGRESQL_COGNITIVE_CORE','actor'=>$actor,'workspace'=>json_decode((string)$st->fetchColumn(),true)]);
    }
    if ($action === 'run_agriculture_cognitive_loop') {
      $result=aab_run_agriculture_cognitive_with_activity($pdo,$actorId,['source_action'=>'run_agriculture_cognitive_loop','headline'=>'Manual governed Agriculture cognitive refresh is processing.']);
      jexit(['ok'=>true,'source'=>'POSTGRESQL_COGNITIVE_CORE','action'=>$action,'result'=>$result]);
    }
    if ($action === 'live_intelligence_surface') {
      $domain=strtoupper(trim((string)($_GET['domain'] ?? 'AGRICULTURE')));
      $st=$pdo->prepare('SELECT cognitive_core.api_get_live_intelligence_surface(:domain,:actor)');
      $st->execute(['domain'=>$domain,'actor'=>$actorId]);
      jexit(['ok'=>true,'source'=>'POSTGRESQL_COGNITIVE_CORE','actor'=>$actor,'surface'=>json_decode((string)$st->fetchColumn(),true)]);
    }
    if ($action === 'intelligence_activity_timeline') {
      $domain=strtoupper(trim((string)($_GET['domain'] ?? 'AGRICULTURE')));
      $limit=max(1,min(250,(int)($_GET['limit'] ?? 100)));
      $st=$pdo->prepare('SELECT cognitive_core.api_get_intelligence_activity_timeline(:domain,:actor,:lim)');
      $st->bindValue(':domain',$domain,PDO::PARAM_STR);$st->bindValue(':actor',$actorId,PDO::PARAM_STR);$st->bindValue(':lim',$limit,PDO::PARAM_INT);$st->execute();
      jexit(['ok'=>true,'source'=>'POSTGRESQL_COGNITIVE_CORE','actor'=>$actor,'domain_code'=>$domain,'events'=>json_decode((string)$st->fetchColumn(),true)]);
    }

    if ($action === 'cognitive_foundation_workspace') {
      $st=$pdo->prepare('SELECT cognitive_core.api_get_foundation_workspace(:actor)');
      $st->execute(['actor'=>$actorId]);
      $payload=json_decode((string)$st->fetchColumn(),true);
      jexit(['ok'=>true,'source'=>'POSTGRESQL_COGNITIVE_CORE','actor'=>$actor,'workspace'=>is_array($payload)?$payload:[]]);
    }

    $body=json_decode((string)file_get_contents('php://input'),true);
    if (!is_array($body)) $body=[];

    if ($action === 'submit_problem_signal') {
      $problem=trim((string)($body['problem_statement'] ?? ''));
      $type=strtoupper(trim((string)($body['problem_type'] ?? 'LOCAL_PROBLEM')));
      $domain=strtoupper(trim((string)($body['domain_code'] ?? 'AGRICULTURE')));
      $country=trim((string)($body['country_workspace_id'] ?? '')) ?: null;
      $origin=strtoupper(trim((string)($body['origin_type'] ?? 'HUMAN')));
      if ($problem==='') jexit(['ok'=>false,'error'=>'problem_statement_required'],400);
      $originRef=$body['origin_reference'] ?? []; if(!is_array($originRef))$originRef=[];
      $context=$body['local_context'] ?? []; if(!is_array($context))$context=[];
      $st=$pdo->prepare('SELECT cognitive_core.api_submit_problem_signal_guarded(:type,:statement,:domain,:country,:origin,CAST(:origin_ref AS jsonb),CAST(:context AS jsonb),:actor)');
      $st->execute(['type'=>$type,'statement'=>$problem,'domain'=>$domain?:null,'country'=>$country,'origin'=>$origin,'origin_ref'=>json_encode($originRef,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE),'context'=>json_encode($context,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE),'actor'=>$actorId]);
      jexit(['ok'=>true,'source'=>'POSTGRESQL_COGNITIVE_CORE','action'=>$action,'result'=>json_decode((string)$st->fetchColumn(),true)]);
    }

    if ($action === 'create_transformation_opportunity') {
      $problemId=trim((string)($body['problem_signal_id'] ?? ''));
      $summary=trim((string)($body['opportunity_summary'] ?? ''));
      if ($problemId==='' || $summary==='') jexit(['ok'=>false,'error'=>'problem_signal_and_opportunity_summary_required'],400);
      $st=$pdo->prepare('SELECT cognitive_core.api_create_transformation_opportunity(:problem,:type,:summary,:hypothesis,:novelty,:environmental,:economic,:scientific,:feasibility,:actor)');
      $st->execute(['problem'=>$problemId,'type'=>strtoupper(trim((string)($body['opportunity_type'] ?? 'OTHER'))),'summary'=>$summary,'hypothesis'=>trim((string)($body['scientific_resource_hypothesis'] ?? '')) ?: null,'novelty'=>strtoupper(trim((string)($body['novelty_mode'] ?? 'UNASSESSED'))),'environmental'=>(float)($body['environmental_value'] ?? 0),'economic'=>(float)($body['economic_value'] ?? 0),'scientific'=>(float)($body['scientific_value'] ?? 0.5),'feasibility'=>(float)($body['feasibility'] ?? 0.5),'actor'=>$actorId]);
      jexit(['ok'=>true,'source'=>'POSTGRESQL_COGNITIVE_CORE','action'=>$action,'result'=>json_decode((string)$st->fetchColumn(),true)]);
    }

    if ($action === 'propose_ingredient_build_candidate') {
      $opp=trim((string)($body['transformation_opportunity_id'] ?? ''));
      $name=trim((string)($body['candidate_name'] ?? ''));
      $concept=trim((string)($body['candidate_concept'] ?? ''));
      if ($opp==='' || $name==='' || $concept==='') jexit(['ok'=>false,'error'=>'ingredient_candidate_fields_required'],400);
      $composition=$body['composition_plan'] ?? []; if(!is_array($composition))$composition=[];
      $process=$body['process_plan'] ?? []; if(!is_array($process))$process=[];
      $mechs=$body['target_mechanisms'] ?? []; if(!is_array($mechs))$mechs=[];
      $functions=$body['predicted_functions'] ?? []; if(!is_array($functions))$functions=[];
      $st=$pdo->prepare('SELECT cognitive_core.api_propose_ingredient_candidate(:opp,:name,:novelty,:concept,CAST(:composition AS jsonb),CAST(:process AS jsonb),CAST(:mechanisms AS jsonb),CAST(:functions AS jsonb),:actor)');
      $st->execute(['opp'=>$opp,'name'=>$name,'novelty'=>strtoupper(trim((string)($body['novelty_mode'] ?? 'NOVEL_INGREDIENT'))),'concept'=>$concept,'composition'=>json_encode($composition,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE),'process'=>json_encode($process,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE),'mechanisms'=>json_encode($mechs,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE),'functions'=>json_encode($functions,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE),'actor'=>$actorId]);
      jexit(['ok'=>true,'source'=>'POSTGRESQL_COGNITIVE_CORE','action'=>$action,'result'=>json_decode((string)$st->fetchColumn(),true)]);
    }

    if ($action === 'compute_cognitive_node_state') {
      $id=trim((string)($body['node_id'] ?? ''));
      if ($id==='') jexit(['ok'=>false,'error'=>'node_id_required'],400);
      $st=$pdo->prepare('SELECT cognitive_core.api_compute_node_state(:id,:actor)');
      $st->execute(['id'=>$id,'actor'=>$actorId]);
      jexit(['ok'=>true,'source'=>'POSTGRESQL_COGNITIVE_CORE','action'=>$action,'state'=>json_decode((string)$st->fetchColumn(),true)]);
    }
  } catch (Throwable $e) {
    error_log('AAB_UNIVERSAL_COGNITIVE_KERNEL_01 ' . $e->getMessage());
    $sqlState=$e instanceof PDOException ? (string)$e->getCode() : '';
    $message=$e->getMessage();
    $status=($sqlState==='42501' || str_contains($message,'ACCESS_DENIED')) ? 403 : 503;
    jexit(['ok'=>false,'error'=>'aab_cognitive_foundation_gateway_failed','source'=>'POSTGRESQL_COGNITIVE_CORE','fail_closed'=>true,'detail'=>defined('AAB_DEBUG')&&AAB_DEBUG?$message:null],$status);
  }
}

/* =========================================================================
 * AAB-PLATFORM-WIRE-01
 * Permanent Platform navigation, Settings/Admin and Libraries gateway.
 *
 * Read actions:
 *   platform_navigation_context
 *   platform_admin_snapshot
 *   platform_library_summary
 *
 * Governed Ingredient review actions:
 *   submit_ingredient_for_review
 *   decide_ingredient_review
 *
 * No direct table writes. No Airtable fallback.
 * ========================================================================= */
$AAB_PLATFORM_ACTIONS = [
  'platform_navigation_context','platform_admin_snapshot','platform_library_summary',
  'submit_ingredient_for_review','decide_ingredient_review'
];
if (in_array($action, $AAB_PLATFORM_ACTIONS, true)) {
  try {
    $auth = require_auth();
    $email = strtolower(trim((string)($auth['user']['email'] ?? '')));
    $localRole = strtolower(trim((string)($auth['user']['role'] ?? 'user')));
    if ($email === '') jexit(['ok'=>false,'error'=>'authenticated_email_missing'],401);

    $factory = require __DIR__ . '/api/agriculture/bootstrap.php';
    $ag = $factory();
    if (!isset($ag['pdo']) || !($ag['pdo'] instanceof PDO)) {
      throw new RuntimeException('AGRICULTURE_POSTGRES_PDO_NOT_AVAILABLE');
    }
    /** @var PDO $platformPdo */
    $platformPdo = $ag['pdo'];

    $actorStmt = $platformPdo->prepare('SELECT * FROM agriculture.api_resolve_authenticated_actor(:email,:role,:display_name)');
    $actorStmt->execute(['email'=>$email,'role'=>$localRole,'display_name'=>$email]);
    $actor = $actorStmt->fetch(PDO::FETCH_ASSOC) ?: [];
    $actorId = trim((string)($actor['actor_id'] ?? ''));
    if ($actorId === '') throw new RuntimeException('AGRICULTURE_ACTOR_RESOLUTION_FAILED');

    $cap = static function(PDO $pdo, string $actorId, string $name): bool {
      $s = $pdo->prepare('SELECT agriculture.api_actor_has_capability(:actor,:cap,NULL)');
      $s->execute(['actor'=>$actorId,'cap'=>$name]);
      return (bool)$s->fetchColumn();
    };
    $caps = [
      'read'=>$cap($platformPdo,$actorId,'read'),
      'create_draft'=>$cap($platformPdo,$actorId,'create_draft'),
      'update_draft'=>$cap($platformPdo,$actorId,'update_draft'),
      'submit_review'=>$cap($platformPdo,$actorId,'submit_review'),
      'review'=>$cap($platformPdo,$actorId,'review'),
      'approve'=>$cap($platformPdo,$actorId,'approve'),
      'retire'=>$cap($platformPdo,$actorId,'retire'),
      'read_audit'=>$cap($platformPdo,$actorId,'read_audit'),
      'integrity_check'=>$cap($platformPdo,$actorId,'integrity_check'),
      'administer'=>$cap($platformPdo,$actorId,'administer'),
      'community_capture'=>$cap($platformPdo,$actorId,'community_capture'),
    ];
    if (!$caps['read'] && !($action === 'platform_navigation_context' && $caps['community_capture'])) {
      jexit(['ok'=>false,'error'=>'agriculture_capability_denied','capability'=>'read'],403);
    }

    if ($action === 'platform_navigation_context') {
      $stmt=$platformPdo->prepare('SELECT platform.api_navigation_for_actor(:actor)');
      $stmt->execute(['actor'=>$actorId]);
      $nav=json_decode((string)$stmt->fetchColumn(),true) ?: [];
      jexit(['ok'=>true,'source'=>'POSTGRESQL_PLATFORM','actor'=>$actor,'capabilities'=>$caps,'navigation'=>$nav]);
    }

    if ($action === 'platform_admin_snapshot') {
      $stmt=$platformPdo->prepare('SELECT platform.api_admin_snapshot(:actor)');
      $stmt->execute(['actor'=>$actorId]);
      $snapshot=json_decode((string)$stmt->fetchColumn(),true) ?: [];
      jexit(['ok'=>true,'source'=>'POSTGRESQL_PLATFORM','actor'=>$actor,'capabilities'=>$caps,'snapshot'=>$snapshot]);
    }

    if ($action === 'platform_library_summary') {
      $rows=$platformPdo->query('SELECT * FROM platform.v_library_summary ORDER BY library_name')->fetchAll(PDO::FETCH_ASSOC);
      jexit(['ok'=>true,'source'=>'POSTGRESQL_PLATFORM','records'=>$rows]);
    }

    if (strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== 'POST') {
      jexit(['ok'=>false,'error'=>'method_not_allowed','allowed'=>'POST'],405);
    }
    $body = is_array($AAB_JSON_BODY) ? $AAB_JSON_BODY : $_POST;
    $ingredientId=trim((string)($body['ingredient_id'] ?? $body['id'] ?? ''));
    if ($ingredientId==='') jexit(['ok'=>false,'error'=>'ingredient_id_required'],400);

    if ($action === 'submit_ingredient_for_review') {
      if (!$caps['submit_review']) jexit(['ok'=>false,'error'=>'agriculture_capability_denied','capability'=>'submit_review'],403);
      $stmt=$platformPdo->prepare('SELECT * FROM agriculture.api_submit_ingredient_for_review(:id,:actor)');
      $stmt->execute(['id'=>$ingredientId,'actor'=>$actorId]);
      jexit(['ok'=>true,'source'=>'POSTGRESQL_AGRICULTURE','action'=>$action,'record'=>$stmt->fetch(PDO::FETCH_ASSOC)]);
    }

    if (!$caps['review']) jexit(['ok'=>false,'error'=>'agriculture_capability_denied','capability'=>'review'],403);
    $decision=strtoupper(trim((string)($body['decision'] ?? '')));
    $rationale=trim((string)($body['rationale'] ?? $body['why'] ?? ''));
    $evidence=trim((string)($body['evidence_summary'] ?? ''));
    if (!in_array($decision,['APPROVE','REJECT'],true) || $rationale==='') {
      jexit(['ok'=>false,'error'=>'ingredient_review_fields_invalid','required'=>['decision: APPROVE|REJECT','rationale']],400);
    }
    $stmt=$platformPdo->prepare('SELECT agriculture.api_decide_ingredient_review(:id,:decision,:rationale,:evidence,:actor)');
    $stmt->execute(['id'=>$ingredientId,'decision'=>$decision,'rationale'=>$rationale,'evidence'=>$evidence,'actor'=>$actorId]);
    jexit(['ok'=>true,'source'=>'POSTGRESQL_AGRICULTURE','action'=>$action,'result'=>json_decode((string)$stmt->fetchColumn(),true)]);
  } catch (Throwable $e) {
    error_log('AAB_PLATFORM_WIRE_01 ' . $e->getMessage());
    $sqlState = $e instanceof PDOException ? (string)$e->getCode() : '';
    $message = $e->getMessage();
    $status = ($sqlState === '42501' || str_contains($message,'CAPABILITY_DENIED')) ? 403 : 503;
    jexit([
      'ok'=>false,
      'error'=>'aab_platform_gateway_failed',
      'source'=>'POSTGRESQL_PLATFORM',
      'fail_closed'=>true,
      'detail'=>defined('AAB_DEBUG') && AAB_DEBUG ? $message : null,
    ],$status);
  }
}


/* =========================================================================
 * AAB-RESOURCE-DISCOVERY-OPERATIONAL-01
 * Country Resource Intelligence + Resource Recovery operational gateway.
 * No direct table writes. No Airtable fallback. All writes use governed DB functions.
 * ========================================================================= */
$AAB_RESOURCE_INTELLIGENCE_ACTIONS = [
  'resource_intelligence_context','list_country_resources','list_resource_waste_streams','list_resource_discovery_queue',
  'create_country_resource','add_country_resource_domain_relevance','create_resource_waste_stream','create_resource_recovery_pathway',
  'record_environmental_burden','run_resource_discovery','submit_resource_discovery_review','complete_resource_discovery_review','bridge_resource_discovery'
];
if (in_array($action, $AAB_RESOURCE_INTELLIGENCE_ACTIONS, true)) {
  try {
    $auth = require_auth();
    $email = strtolower(trim((string)($auth['user']['email'] ?? '')));
    $localRole = strtolower(trim((string)($auth['user']['role'] ?? 'user')));
    if ($email === '') jexit(['ok'=>false,'error'=>'authenticated_email_missing'],401);

    $factory = require __DIR__ . '/api/agriculture/bootstrap.php';
    $ag = $factory();
    if (!isset($ag['pdo']) || !($ag['pdo'] instanceof PDO)) throw new RuntimeException('AGRICULTURE_POSTGRES_PDO_NOT_AVAILABLE');
    /** @var PDO $riPdo */
    $riPdo = $ag['pdo'];

    $actorStmt = $riPdo->prepare('SELECT * FROM agriculture.api_resolve_authenticated_actor(:email,:role,:display_name)');
    $actorStmt->execute(['email'=>$email,'role'=>$localRole,'display_name'=>$email]);
    $actor = $actorStmt->fetch(PDO::FETCH_ASSOC) ?: [];
    $actorId = trim((string)($actor['actor_id'] ?? ''));
    if ($actorId === '') throw new RuntimeException('AGRICULTURE_ACTOR_RESOLUTION_FAILED');

    $has = static function(PDO $pdo,string $actorId,string $cap): bool {
      $q=$pdo->prepare('SELECT agriculture.api_actor_has_capability(:actor,:cap,NULL)');
      $q->execute(['actor'=>$actorId,'cap'=>$cap]);
      return (bool)$q->fetchColumn();
    };
    $caps=[
      'read'=>$has($riPdo,$actorId,'read'),'create_draft'=>$has($riPdo,$actorId,'create_draft'),'update_draft'=>$has($riPdo,$actorId,'update_draft'),
      'submit_review'=>$has($riPdo,$actorId,'submit_review'),'review'=>$has($riPdo,$actorId,'review'),'approve'=>$has($riPdo,$actorId,'approve')
    ];
    if (!$caps['read']) jexit(['ok'=>false,'error'=>'agriculture_capability_denied','capability'=>'read'],403);

    if ($action === 'resource_intelligence_context') {
      $settings=json_decode((string)$riPdo->query('SELECT agriculture.api_get_country_intelligence_settings(NULL)')->fetchColumn(),true) ?: [];
      $counts=$riPdo->query("SELECT (SELECT count(*) FROM agriculture.country_resource_candidate WHERE scientific_status<>'ARCHIVED') AS resources,(SELECT count(*) FROM agriculture.resource_waste_stream WHERE recovery_status<>'ARCHIVED') AS waste_streams,(SELECT count(*) FROM agriculture.resource_discovery_run WHERE run_status='COMPLETED') AS discovery_runs,(SELECT count(*) FROM agriculture.resource_discovery_scientist_review WHERE review_status IN ('PENDING','IN_REVIEW')) AS pending_reviews,(SELECT count(*) FROM agriculture.resource_discovery_bridge WHERE bridge_status='CREATED_FOR_INVESTIGATION') AS bridged_candidates")->fetch(PDO::FETCH_ASSOC) ?: [];
      $att=$riPdo->query('SELECT * FROM agriculture.v_resource_discovery_integrity_attestation')->fetch(PDO::FETCH_ASSOC) ?: [];
      jexit(['ok'=>true,'source'=>'POSTGRESQL_AGRICULTURE','actor'=>$actor,'capabilities'=>$caps,'settings'=>$settings,'counts'=>$counts,'integrity'=>$att]);
    }
    if ($action === 'list_country_resources') {
      $rows=$riPdo->query('SELECT * FROM agriculture.v_country_resource_intelligence ORDER BY country_code NULLS LAST,resource_name')->fetchAll(PDO::FETCH_ASSOC);
      jexit(['ok'=>true,'source'=>'POSTGRESQL_AGRICULTURE','records'=>$rows]);
    }
    if ($action === 'list_resource_waste_streams') {
      $rows=$riPdo->query('SELECT * FROM agriculture.v_resource_recovery_intelligence ORDER BY country_code NULLS LAST,waste_stream_name')->fetchAll(PDO::FETCH_ASSOC);
      jexit(['ok'=>true,'source'=>'POSTGRESQL_AGRICULTURE','records'=>$rows]);
    }
    if ($action === 'list_resource_discovery_queue') {
      $rows=$riPdo->query('SELECT * FROM agriculture.v_resource_discovery_priority_queue LIMIT 100')->fetchAll(PDO::FETCH_ASSOC);
      jexit(['ok'=>true,'source'=>'POSTGRESQL_AGRICULTURE','records'=>$rows]);
    }

    if (strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== 'POST') jexit(['ok'=>false,'error'=>'method_not_allowed','allowed'=>'POST'],405);
    $body=is_array($AAB_JSON_BODY)?$AAB_JSON_BODY:$_POST;
    $requestedCountry=strtoupper(trim((string)($body['country_code']??''))); $resourceWorkspaceId=null; $resourceWorkspaceCountry=$requestedCountry;
    $wsStmt=$riPdo->prepare("SELECT m.country_workspace_id,w.country_code FROM country_core.workspace_membership m JOIN country_core.country_workspace w ON w.country_workspace_id=m.country_workspace_id WHERE m.actor_id=:actor AND m.membership_status='ACTIVE' AND (:country='' OR w.country_code=:country) ORDER BY CASE WHEN m.membership_role='HEAD_ADMIN' THEN 0 ELSE 1 END,m.granted_at LIMIT 1");
    $wsStmt->execute(['actor'=>$actorId,'country'=>$requestedCountry]); if($ws=$wsStmt->fetch(PDO::FETCH_ASSOC)){ $resourceWorkspaceId=(string)$ws['country_workspace_id']; if($resourceWorkspaceCountry==='')$resourceWorkspaceCountry=strtoupper((string)$ws['country_code']); }

    if ($action === 'create_country_resource') {
      if (!$caps['create_draft']) jexit(['ok'=>false,'error'=>'agriculture_capability_denied','capability'=>'create_draft'],403);
      $sql='SELECT * FROM agriculture.api_create_country_resource_candidate(:code,:name,:resource_class,:asset_type,:summary,:uncertainty,:actor,:country,:origin,:known_use,:tk_linked,:tk_summary,:composition,:mechanism,:evidence,:observation,:gap,:potential)';
      $st=$riPdo->prepare($sql); $st->execute([
        'code'=>trim((string)($body['resource_code']??'')),'name'=>trim((string)($body['resource_name']??'')),'resource_class'=>strtoupper(trim((string)($body['resource_class']??''))),
        'asset_type'=>strtoupper(trim((string)($body['asset_type']??''))),'summary'=>trim((string)($body['candidate_summary']??'')),'uncertainty'=>trim((string)($body['uncertainty_summary']??'')),'actor'=>$actorId,
        'country'=>$resourceWorkspaceCountry!==''?$resourceWorkspaceCountry:null,'origin'=>($body['resource_origin']??null)?:null,'known_use'=>($body['current_known_use']??null)?:null,'tk_linked'=>(bool)($body['traditional_knowledge_linked']??false),'tk_summary'=>($body['traditional_knowledge_summary']??null)?:null,
        'composition'=>strtoupper((string)($body['composition_status']??'UNKNOWN')),'mechanism'=>strtoupper((string)($body['mechanism_status']??'UNKNOWN')),'evidence'=>strtoupper((string)($body['evidence_status']??'NONE')),'observation'=>strtoupper((string)($body['observation_status']??'NONE')),'gap'=>strtoupper((string)($body['knowledge_gap_status']??'HIGH')),'potential'=>strtoupper((string)($body['discovery_potential']??'UNASSESSED'))
      ]); $record=$st->fetch(PDO::FETCH_ASSOC); if($record && $resourceWorkspaceId){$stamp=$riPdo->prepare('UPDATE agriculture.country_resource_candidate SET country_workspace_id=:workspace WHERE country_resource_candidate_id=:id RETURNING *');$stamp->execute(['workspace'=>$resourceWorkspaceId,'id'=>$record['country_resource_candidate_id']]);$record=$stamp->fetch(PDO::FETCH_ASSOC)?:$record;} jexit(['ok'=>true,'source'=>'POSTGRESQL_AGRICULTURE','action'=>$action,'record'=>$record]);
    }
    if ($action === 'add_country_resource_domain_relevance') {
      if (!$caps['update_draft']) jexit(['ok'=>false,'error'=>'agriculture_capability_denied','capability'=>'update_draft'],403);
      $st=$riPdo->prepare('SELECT * FROM agriculture.api_add_country_resource_domain_relevance(:id,:domain,:status,:summary,:evidence,:actor)');
      $st->execute(['id'=>$body['country_resource_candidate_id']??null,'domain'=>strtoupper((string)($body['domain_code']??'')),'status'=>strtoupper((string)($body['relevance_status']??'POSSIBLE')),'summary'=>trim((string)($body['relevance_summary']??'')),'evidence'=>strtoupper((string)($body['evidence_strength']??'UNASSESSED')),'actor'=>$actorId]);
      jexit(['ok'=>true,'source'=>'POSTGRESQL_AGRICULTURE','action'=>$action,'record'=>$st->fetch(PDO::FETCH_ASSOC)]);
    }
    if ($action === 'create_resource_waste_stream') {
      if (!$caps['create_draft']) jexit(['ok'=>false,'error'=>'agriculture_capability_denied','capability'=>'create_draft'],403);
      $st=$riPdo->prepare('SELECT * FROM agriculture.api_create_resource_waste_stream(:code,:name,:type,:resource,:actor,:country,:sector,:context,:disposal,:burning,:dumping,:landfill,:pollution,:availability,:seasonality,:contamination,:contaminants)');
      $st->execute(['code'=>trim((string)($body['waste_stream_code']??'')),'name'=>trim((string)($body['waste_stream_name']??'')),'type'=>strtoupper((string)($body['waste_stream_type']??'')),'resource'=>$body['linked_country_resource_candidate_id']??null,'actor'=>$actorId,'country'=>$resourceWorkspaceCountry!==''?$resourceWorkspaceCountry:null,'sector'=>($body['source_sector']??null)?:null,'context'=>($body['generation_context']??null)?:null,'disposal'=>($body['current_disposal_pathway']??null)?:null,'burning'=>(bool)($body['burning_involved']??false),'dumping'=>(bool)($body['dumping_involved']??false),'landfill'=>(bool)($body['landfill_involved']??false),'pollution'=>($body['pollution_pathway']??null)?:null,'availability'=>strtoupper((string)($body['estimated_availability_status']??'UNKNOWN')),'seasonality'=>($body['seasonality_summary']??null)?:null,'contamination'=>strtoupper((string)($body['contamination_status']??'UNKNOWN')),'contaminants'=>($body['known_contaminants']??null)?:null]);
      $record=$st->fetch(PDO::FETCH_ASSOC); if($record && $resourceWorkspaceId){$stamp=$riPdo->prepare('UPDATE agriculture.resource_waste_stream SET country_workspace_id=:workspace WHERE resource_waste_stream_id=:id RETURNING *');$stamp->execute(['workspace'=>$resourceWorkspaceId,'id'=>$record['resource_waste_stream_id']]);$record=$stamp->fetch(PDO::FETCH_ASSOC)?:$record;}
      jexit(['ok'=>true,'source'=>'POSTGRESQL_AGRICULTURE','action'=>$action,'record'=>$record]);
    }
    if ($action === 'create_resource_recovery_pathway') {
      if (!$caps['create_draft']) jexit(['ok'=>false,'error'=>'agriculture_capability_denied','capability'=>'create_draft'],403);
      $st=$riPdo->prepare('SELECT * FROM agriculture.api_create_resource_recovery_pathway(:waste,:code,:type,:summary,:feasibility,:actor,:processing)');
      $st->execute(['waste'=>$body['resource_waste_stream_id']??null,'code'=>trim((string)($body['pathway_code']??'')),'type'=>strtoupper((string)($body['pathway_type']??'')),'summary'=>trim((string)($body['pathway_summary']??'')),'feasibility'=>strtoupper((string)($body['recovery_feasibility']??'UNASSESSED')),'actor'=>$actorId,'processing'=>($body['processing_requirements']??null)?:null]);
      jexit(['ok'=>true,'source'=>'POSTGRESQL_AGRICULTURE','action'=>$action,'record'=>$st->fetch(PDO::FETCH_ASSOC)]);
    }
    if ($action === 'record_environmental_burden') {
      if (!$caps['create_draft']) jexit(['ok'=>false,'error'=>'agriculture_capability_denied','capability'=>'create_draft'],403);
      $st=$riPdo->prepare('SELECT * FROM agriculture.api_record_environmental_burden(:waste,:summary,:actor,:air,:water,:soil,:burning,:landfill,:dumping,:evidence,NULL)');
      $st->execute(['waste'=>$body['resource_waste_stream_id']??null,'summary'=>trim((string)($body['environmental_burden_summary']??'')),'actor'=>$actorId,'air'=>strtoupper((string)($body['air_pollution_burden']??'UNASSESSED')),'water'=>strtoupper((string)($body['water_pollution_burden']??'UNASSESSED')),'soil'=>strtoupper((string)($body['soil_pollution_burden']??'UNASSESSED')),'burning'=>strtoupper((string)($body['burning_pressure']??'UNASSESSED')),'landfill'=>strtoupper((string)($body['landfill_pressure']??'UNASSESSED')),'dumping'=>strtoupper((string)($body['dumping_pressure']??'UNASSESSED')),'evidence'=>strtoupper((string)($body['evidence_strength']??'UNASSESSED'))]);
      jexit(['ok'=>true,'source'=>'POSTGRESQL_AGRICULTURE','action'=>$action,'record'=>$st->fetch(PDO::FETCH_ASSOC)]);
    }
    if ($action === 'run_resource_discovery') {
      if (!$caps['create_draft']) jexit(['ok'=>false,'error'=>'agriculture_capability_denied','capability'=>'create_draft'],403);
      $st=$riPdo->prepare('SELECT agriculture.api_run_full_resource_discovery(:resource,:waste,:actor)');
      $st->execute(['resource'=>$body['country_resource_candidate_id']??null,'waste'=>($body['resource_waste_stream_id']??null)?:null,'actor'=>$actorId]);
      jexit(['ok'=>true,'source'=>'POSTGRESQL_AGRICULTURE','action'=>$action,'result'=>json_decode((string)$st->fetchColumn(),true)]);
    }
    if ($action === 'submit_resource_discovery_review') {
      if (!$caps['submit_review']) jexit(['ok'=>false,'error'=>'agriculture_capability_denied','capability'=>'submit_review'],403);
      $st=$riPdo->prepare('SELECT * FROM agriculture.api_submit_resource_discovery_for_review(:run,:actor)'); $st->execute(['run'=>$body['resource_discovery_run_id']??null,'actor'=>$actorId]);
      jexit(['ok'=>true,'source'=>'POSTGRESQL_AGRICULTURE','action'=>$action,'record'=>$st->fetch(PDO::FETCH_ASSOC)]);
    }
    if ($action === 'complete_resource_discovery_review') {
      if (!$caps['review']) jexit(['ok'=>false,'error'=>'agriculture_capability_denied','capability'=>'review'],403);
      $st=$riPdo->prepare('SELECT * FROM agriculture.api_complete_resource_discovery_review(:review,:status,:evidence,:rationale,:result,:followup,:actor)');
      $st->execute(['review'=>$body['resource_discovery_scientist_review_id']??null,'status'=>strtoupper((string)($body['review_status']??'')),'evidence'=>trim((string)($body['evidence_reviewed_summary']??'')),'rationale'=>trim((string)($body['review_rationale']??'')),'result'=>trim((string)($body['review_result']??'')),'followup'=>($body['required_follow_up']??null)?:null,'actor'=>$actorId]);
      jexit(['ok'=>true,'source'=>'POSTGRESQL_AGRICULTURE','action'=>$action,'record'=>$st->fetch(PDO::FETCH_ASSOC)]);
    }
    if ($action === 'bridge_resource_discovery') {
      if (!$caps['review']) jexit(['ok'=>false,'error'=>'agriculture_capability_denied','capability'=>'review'],403);
      $st=$riPdo->prepare('SELECT * FROM agriculture.api_bridge_resource_to_discovery_candidate(:run,:rationale,:actor,:object_type)');
      $st->execute(['run'=>$body['resource_discovery_run_id']??null,'rationale'=>trim((string)($body['bridge_rationale']??'')),'actor'=>$actorId,'object_type'=>strtoupper((string)($body['candidate_object_type']??'INGREDIENT'))]);
      jexit(['ok'=>true,'source'=>'POSTGRESQL_AGRICULTURE','action'=>$action,'record'=>$st->fetch(PDO::FETCH_ASSOC)]);
    }
  } catch (Throwable $e) {
    error_log('AAB_RESOURCE_DISCOVERY_OPERATIONAL_01 ' . $e->getMessage());
    $sqlState=$e instanceof PDOException?(string)$e->getCode():''; $message=$e->getMessage();
    $status=($sqlState==='42501'||str_contains($message,'CAPABILITY_DENIED'))?403:503;
    jexit(['ok'=>false,'error'=>'aab_resource_intelligence_gateway_failed','source'=>'POSTGRESQL_AGRICULTURE','fail_closed'=>true,'detail'=>defined('AAB_DEBUG')&&AAB_DEBUG?$message:null],$status);
  }
}



/* =========================================================================
 * AAB-UNIVERSAL-OBSERVATION-OPERATIONAL-01
 * Universal Observation Engine + Community/Citizen Science gateway.
 * Photo-first, location-required community capture with offline idempotency.
 * No direct table writes. No Airtable fallback. No public Brain promotion.
 * ========================================================================= */
$AAB_OBSERVATION_ACTIONS = [
  'observation_settings_context','list_observation_adapters','list_observation_campaigns','list_active_community_campaigns',
  'get_community_profile','list_my_community_submissions','upsert_community_profile','start_community_submission',
  'upload_community_photo','get_community_photo','finalize_community_submission','find_offline_community_submission',
  'create_observation_campaign','submit_observation_campaign','decide_observation_campaign','list_observation_review_queue',
  'record_observation_validation','propose_observation_routes','assess_observation_photo','review_universal_observation',
  'promote_universal_observation_evidence'
];
if (in_array($action, $AAB_OBSERVATION_ACTIONS, true)) {
  try {
    $auth = require_auth();
    $email = strtolower(trim((string)($auth['user']['email'] ?? '')));
    $localRole = strtolower(trim((string)($auth['user']['role'] ?? 'user')));
    if ($email === '') jexit(['ok'=>false,'error'=>'authenticated_email_missing'],401);

    $factory = require __DIR__ . '/api/agriculture/bootstrap.php';
    $ag = $factory();
    if (!isset($ag['pdo']) || !($ag['pdo'] instanceof PDO)) throw new RuntimeException('AGRICULTURE_POSTGRES_PDO_NOT_AVAILABLE');
    /** @var PDO $obsPdo */
    $obsPdo = $ag['pdo'];

    $actorStmt = $obsPdo->prepare('SELECT * FROM agriculture.api_resolve_authenticated_actor(:email,:role,:display_name)');
    $actorStmt->execute(['email'=>$email,'role'=>$localRole,'display_name'=>$email]);
    $actor = $actorStmt->fetch(PDO::FETCH_ASSOC) ?: [];
    $actorId = trim((string)($actor['actor_id'] ?? ''));
    if ($actorId === '') throw new RuntimeException('AGRICULTURE_ACTOR_RESOLUTION_FAILED');

    $hasObsCap = static function(PDO $pdo,string $actorId,string $cap): bool {
      $q=$pdo->prepare('SELECT agriculture.api_actor_has_capability(:actor,:cap,NULL)');
      $q->execute(['actor'=>$actorId,'cap'=>$cap]);
      return (bool)$q->fetchColumn();
    };
    $caps=[
      'read'=>$hasObsCap($obsPdo,$actorId,'read'),'create_draft'=>$hasObsCap($obsPdo,$actorId,'create_draft'),
      'update_draft'=>$hasObsCap($obsPdo,$actorId,'update_draft'),'submit_review'=>$hasObsCap($obsPdo,$actorId,'submit_review'),
      'review'=>$hasObsCap($obsPdo,$actorId,'review'),'approve'=>$hasObsCap($obsPdo,$actorId,'approve'),
      'community_capture'=>$hasObsCap($obsPdo,$actorId,'community_capture')
    ];
    if (!$caps['read'] && !$caps['community_capture']) jexit(['ok'=>false,'error'=>'observation_access_denied'],403);

    if ($action === 'observation_settings_context') {
      $s=$obsPdo->prepare('SELECT observation_core.api_settings_snapshot(:actor)'); $s->execute(['actor'=>$actorId]);
      $settings=json_decode((string)$s->fetchColumn(),true) ?: [];
      $p=$obsPdo->prepare('SELECT observation_core.api_get_community_profile(:actor)'); $p->execute(['actor'=>$actorId]);
      $profile=json_decode((string)$p->fetchColumn(),true);
      $countryStmt=$obsPdo->query('SELECT observation_core.api_community_country_context()');
      $countries=json_decode((string)$countryStmt->fetchColumn(),true) ?: [];
      jexit(['ok'=>true,'source'=>'POSTGRESQL_OBSERVATION_CORE','actor'=>$actor,'capabilities'=>$caps,'settings'=>$settings,'community_profile'=>$profile,'countries'=>$countries]);
    }
    if ($action === 'list_observation_adapters') {
      if (!$caps['read']) jexit(['ok'=>false,'error'=>'agriculture_capability_denied','capability'=>'read'],403);
      $rows=$obsPdo->query('SELECT * FROM observation_core.v_domain_adapters ORDER BY domain_name')->fetchAll(PDO::FETCH_ASSOC);
      jexit(['ok'=>true,'source'=>'POSTGRESQL_OBSERVATION_CORE','records'=>$rows]);
    }
    if ($action === 'list_observation_campaigns') {
      if (!$caps['read']) jexit(['ok'=>false,'error'=>'agriculture_capability_denied','capability'=>'read'],403);
      $rows=$obsPdo->query('SELECT * FROM observation_core.v_campaign_status ORDER BY created_at DESC')->fetchAll(PDO::FETCH_ASSOC);
      jexit(['ok'=>true,'source'=>'POSTGRESQL_OBSERVATION_CORE','records'=>$rows]);
    }
    if ($action === 'list_active_community_campaigns') {
      $rows=$obsPdo->query('SELECT * FROM observation_core.v_active_community_campaigns ORDER BY campaign_name')->fetchAll(PDO::FETCH_ASSOC);
      jexit(['ok'=>true,'source'=>'POSTGRESQL_OBSERVATION_CORE','records'=>$rows]);
    }
    if ($action === 'get_community_profile') {
      $s=$obsPdo->prepare('SELECT observation_core.api_get_community_profile(:actor)'); $s->execute(['actor'=>$actorId]);
      jexit(['ok'=>true,'source'=>'POSTGRESQL_OBSERVATION_CORE','record'=>json_decode((string)$s->fetchColumn(),true)]);
    }
    if ($action === 'list_my_community_submissions') {
      $s=$obsPdo->prepare('SELECT observation_core.api_list_my_community_submissions(:actor)'); $s->execute(['actor'=>$actorId]);
      jexit(['ok'=>true,'source'=>'POSTGRESQL_OBSERVATION_CORE','records'=>json_decode((string)$s->fetchColumn(),true) ?: []]);
    }
    if ($action === 'list_observation_review_queue') {
      if (!$caps['review']) jexit(['ok'=>false,'error'=>'agriculture_capability_denied','capability'=>'review'],403);
      $rows=$obsPdo->query('SELECT * FROM observation_core.v_review_queue ORDER BY observed_at DESC')->fetchAll(PDO::FETCH_ASSOC);
      jexit(['ok'=>true,'source'=>'POSTGRESQL_OBSERVATION_CORE','records'=>$rows]);
    }
    if ($action === 'find_offline_community_submission') {
      $offline=trim((string)($_GET['offline_capture_id']??''));
      if ($offline==='') jexit(['ok'=>false,'error'=>'offline_capture_id_required'],400);
      $s=$obsPdo->prepare('SELECT observation_core.api_find_offline_capture(:actor,:offline)'); $s->execute(['actor'=>$actorId,'offline'=>$offline]);
      jexit(['ok'=>true,'source'=>'POSTGRESQL_OBSERVATION_CORE','result'=>json_decode((string)$s->fetchColumn(),true)]);
    }
    if ($action === 'get_community_photo') {
      $photoId=trim((string)($_GET['photo_id']??''));
      if ($photoId==='') jexit(['ok'=>false,'error'=>'photo_id_required'],400);
      $s=$obsPdo->prepare('SELECT observation_core.api_get_community_photo_metadata(:actor,:photo)'); $s->execute(['actor'=>$actorId,'photo'=>$photoId]);
      $meta=json_decode((string)$s->fetchColumn(),true) ?: [];
      if (($meta['storage_provider']??'')!=='AAB_HOSTINGER_PRIVATE') jexit(['ok'=>false,'error'=>'unsupported_photo_storage_provider'],409);
      $key=(string)($meta['storage_object_key']??'');
      if ($key==='' || str_contains($key,'..') || !preg_match('~^[A-Za-z0-9_./-]+$~',$key)) jexit(['ok'=>false,'error'=>'invalid_photo_storage_key'],500);
      $root=dirname((string)($_SERVER['DOCUMENT_ROOT']??__DIR__)) . '/_private/community-observation-photos';
      $file=$root . '/' . ltrim($key,'/');
      if (!is_file($file) || !is_readable($file)) jexit(['ok'=>false,'error'=>'community_photo_file_missing'],404);
      header('Content-Type: '.((string)($meta['media_type']??'application/octet-stream')));
      header('Content-Length: '.filesize($file));
      header('Cache-Control: private, max-age=300');
      readfile($file); exit;
    }

    if (strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== 'POST') jexit(['ok'=>false,'error'=>'method_not_allowed','allowed'=>'POST'],405);
    $body=is_array($AAB_JSON_BODY)?$AAB_JSON_BODY:$_POST;

    if ($action === 'upsert_community_profile') {
      $pt=strtoupper(trim((string)($body['participant_type']??'')));
      if (!in_array($pt,['FARMER','PUBLIC','STUDENT','TEACHER'],true)) jexit(['ok'=>false,'error'=>'participant_type_invalid'],400);
      $s=$obsPdo->prepare('SELECT * FROM observation_core.api_upsert_community_profile(:actor,:type,:country,:science,:environment,:org,:lang)');
      $s->execute(['actor'=>$actorId,'type'=>$pt,'country'=>($body['country_code']??null)?:null,'science'=>(bool)($body['consent_scientific_use']??false),'environment'=>(bool)($body['consent_environmental_use']??false),'org'=>($body['organization_or_school']??null)?:null,'lang'=>($body['preferred_language']??null)?:null]);
      jexit(['ok'=>true,'source'=>'POSTGRESQL_OBSERVATION_CORE','record'=>$s->fetch(PDO::FETCH_ASSOC)]);
    }

    if ($action === 'start_community_submission') {
      if (!$caps['create_draft'] && !$caps['community_capture']) jexit(['ok'=>false,'error'=>'community_capture_capability_denied'],403);
      $desc=trim((string)($body['brief_description']??''));
      if ($desc==='') jexit(['ok'=>false,'error'=>'brief_description_required'],400);
      $s=$obsPdo->prepare('SELECT observation_core.api_start_community_submission(:actor,:domain,:country,:description,:lat,:lng,:observed,:consent,:hint,:identification,:campaign,:offline,:captured,:version,:lowbw)');
      $s->execute([
        'actor'=>$actorId,'domain'=>($body['domain_code']??'COMMUNITY_INTAKE')?:'COMMUNITY_INTAKE','country'=>($body['country_code']??null)?:null,
        'description'=>$desc,'lat'=>$body['latitude']??null,'lng'=>$body['longitude']??null,'observed'=>($body['observed_at']??null)?:date(DATE_ATOM),
        'consent'=>(bool)($body['consent_confirmed']??false),'hint'=>($body['user_category_hint']??null)?:null,'identification'=>($body['user_identification_text']??null)?:null,
        'campaign'=>($body['campaign_id']??null)?:null,'offline'=>($body['offline_capture_id']??null)?:null,'captured'=>($body['client_captured_at']??null)?:null,
        'version'=>($body['client_app_version']??'community-01'),'lowbw'=>(bool)($body['low_bandwidth_mode']??false)
      ]);
      jexit(['ok'=>true,'source'=>'POSTGRESQL_OBSERVATION_CORE','result'=>json_decode((string)$s->fetchColumn(),true)]);
    }

    if ($action === 'upload_community_photo') {
      $observationId=trim((string)($_POST['observation_id']??''));
      if ($observationId==='') jexit(['ok'=>false,'error'=>'observation_id_required'],400);
      $own=$obsPdo->prepare('SELECT observation_core.api_actor_can_attach_community_photo(:actor,:obs)'); $own->execute(['actor'=>$actorId,'obs'=>$observationId]);
      if (!(bool)$own->fetchColumn()) jexit(['ok'=>false,'error'=>'community_photo_access_denied'],403);
      if (!isset($_FILES['photo']) || !is_array($_FILES['photo']) || (int)($_FILES['photo']['error']??UPLOAD_ERR_NO_FILE)!==UPLOAD_ERR_OK) jexit(['ok'=>false,'error'=>'photo_upload_required'],400);
      $tmp=(string)$_FILES['photo']['tmp_name']; $size=(int)$_FILES['photo']['size']; $orig=(string)$_FILES['photo']['name'];
      if ($size<=0 || $size>12*1024*1024) jexit(['ok'=>false,'error'=>'photo_size_invalid','max_bytes'=>12582912],413);
      $finfo=new finfo(FILEINFO_MIME_TYPE); $mime=(string)$finfo->file($tmp);
      $extMap=['image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp'];
      if (!isset($extMap[$mime])) jexit(['ok'=>false,'error'=>'photo_type_invalid','allowed'=>array_keys($extMap)],415);
      $dim=@getimagesize($tmp); $width=is_array($dim)?(int)($dim[0]??0):null; $height=is_array($dim)?(int)($dim[1]??0):null;
      $hash=hash_file('sha256',$tmp); if (!$hash) throw new RuntimeException('PHOTO_HASH_FAILED');
      $root=dirname((string)($_SERVER['DOCUMENT_ROOT']??__DIR__)) . '/_private/community-observation-photos';
      $sub=date('Y/m'); $dir=$root.'/'.$sub; if (!is_dir($dir) && !mkdir($dir,0750,true) && !is_dir($dir)) throw new RuntimeException('COMMUNITY_PHOTO_PRIVATE_DIRECTORY_CREATE_FAILED');
      $key=$sub.'/'.$hash.'-'.bin2hex(random_bytes(5)).'.'.$extMap[$mime]; $dest=$root.'/'.$key;
      if (!move_uploaded_file($tmp,$dest)) throw new RuntimeException('COMMUNITY_PHOTO_MOVE_FAILED');
      @chmod($dest,0640);
      try {
        $obsPdo->beginTransaction();
        $s=$obsPdo->prepare('SELECT * FROM agriculture.api_register_photo_evidence(:subject_type,:subject_id,:photo_type,:provider,:object_key,:mime,:bytes,:hash,:actor,:orig,:width,:height,NULL,:captured,:device,:lat,:lng,false,NULL)');
        $s->execute(['subject_type'=>'UNIVERSAL_OBSERVATION','subject_id'=>$observationId,'photo_type'=>'OTHER','provider'=>'AAB_HOSTINGER_PRIVATE','object_key'=>$key,'mime'=>$mime,'bytes'=>$size,'hash'=>$hash,'actor'=>$actorId,'orig'=>$orig,'width'=>$width?:null,'height'=>$height?:null,'captured'=>($_POST['captured_at']??null)?:date(DATE_ATOM),'device'=>($_POST['capture_device']??null)?:null,'lat'=>($_POST['latitude']??null)?:null,'lng'=>($_POST['longitude']??null)?:null]);
        $photo=$s->fetch(PDO::FETCH_ASSOC) ?: [];
        $attach=$obsPdo->prepare('SELECT * FROM observation_core.api_attach_photo_evidence(:obs,:photo)'); $attach->execute(['obs'=>$observationId,'photo'=>$photo['photo_evidence_id']??null]);
        $evidenceLink=$attach->fetch(PDO::FETCH_ASSOC);
        $obsPdo->commit();
        jexit(['ok'=>true,'source'=>'POSTGRESQL_OBSERVATION_CORE','photo'=>$photo,'evidence_link'=>$evidenceLink]);
      } catch (Throwable $inner) {
        if ($obsPdo->inTransaction()) $obsPdo->rollBack();
        @unlink($dest); throw $inner;
      }
    }

    if ($action === 'finalize_community_submission') {
      $id=trim((string)($body['community_submission_id']??'')); if($id==='') jexit(['ok'=>false,'error'=>'community_submission_id_required'],400);
      $s=$obsPdo->prepare('SELECT * FROM observation_core.api_finalize_community_submission(:id,:actor)'); $s->execute(['id'=>$id,'actor'=>$actorId]);
      $record=$s->fetch(PDO::FETCH_ASSOC) ?: [];
      $routes=[]; if (!empty($record['observation_id'])) { $r=$obsPdo->prepare('SELECT * FROM observation_core.api_propose_observation_routes(:obs)'); $r->execute(['obs'=>$record['observation_id']]); $routes=$r->fetchAll(PDO::FETCH_ASSOC); }
      jexit(['ok'=>true,'source'=>'POSTGRESQL_OBSERVATION_CORE','record'=>$record,'routes'=>$routes]);
    }

    if ($action === 'create_observation_campaign') {
      if (!$caps['create_draft']) jexit(['ok'=>false,'error'=>'agriculture_capability_denied','capability'=>'create_draft'],403);
      $modes=$body['participant_source_modes']??['SCIENTIST','FIELD_TECHNICIAN']; if(!is_array($modes))$modes=['SCIENTIST','FIELD_TECHNICIAN'];
      $support=$body['supporting_domain_codes']??[]; if(!is_array($support))$support=[];
      $s=$obsPdo->prepare('SELECT * FROM observation_core.api_create_campaign(:name,:country,:domain,:question,:purpose,:actor,:support,:locations,:required,:modes,:photo,:start,:end)');
      $s->bindValue(':name',trim((string)($body['campaign_name']??''))); $s->bindValue(':country',($body['country_code']??null)?:null); $s->bindValue(':domain',strtoupper(trim((string)($body['primary_domain_code']??'')))); $s->bindValue(':question',trim((string)($body['campaign_question']??''))); $s->bindValue(':purpose',trim((string)($body['purpose']??''))); $s->bindValue(':actor',$actorId);
      $s->bindValue(':support','{'.implode(',',array_map(fn($x)=>strtoupper(trim((string)$x)),$support)).'}'); $s->bindValue(':locations',json_encode($body['target_locations']??[],JSON_UNESCAPED_SLASHES)); $s->bindValue(':required',json_encode($body['required_observations']??[],JSON_UNESCAPED_SLASHES)); $s->bindValue(':modes','{'.implode(',',array_map(fn($x)=>strtoupper(trim((string)$x)),$modes)).'}'); $s->bindValue(':photo',strtoupper((string)($body['photo_policy']??'REQUIRED'))); $s->bindValue(':start',($body['start_date']??null)?:null); $s->bindValue(':end',($body['end_date']??null)?:null); $s->execute();
      jexit(['ok'=>true,'source'=>'POSTGRESQL_OBSERVATION_CORE','record'=>$s->fetch(PDO::FETCH_ASSOC)]);
    }
    if ($action === 'submit_observation_campaign') {
      if (!$caps['submit_review']) jexit(['ok'=>false,'error'=>'agriculture_capability_denied','capability'=>'submit_review'],403);
      $s=$obsPdo->prepare('SELECT * FROM observation_core.api_submit_campaign_for_review(:id,:actor)'); $s->execute(['id'=>$body['campaign_id']??null,'actor'=>$actorId]);
      jexit(['ok'=>true,'source'=>'POSTGRESQL_OBSERVATION_CORE','record'=>$s->fetch(PDO::FETCH_ASSOC)]);
    }
    if ($action === 'decide_observation_campaign') {
      if (!$caps['review']) jexit(['ok'=>false,'error'=>'agriculture_capability_denied','capability'=>'review'],403);
      $s=$obsPdo->prepare('SELECT * FROM observation_core.api_decide_campaign(:id,:decision,:rationale,:actor)'); $s->execute(['id'=>$body['campaign_id']??null,'decision'=>strtoupper((string)($body['decision']??'')),'rationale'=>trim((string)($body['rationale']??'')),'actor'=>$actorId]);
      jexit(['ok'=>true,'source'=>'POSTGRESQL_OBSERVATION_CORE','record'=>$s->fetch(PDO::FETCH_ASSOC)]);
    }
    if ($action === 'record_observation_validation') {
      if (!$caps['review']) jexit(['ok'=>false,'error'=>'agriculture_capability_denied','capability'=>'review'],403);
      $s=$obsPdo->prepare('SELECT * FROM observation_core.api_record_validation(:obs,:dim,:result,:rule,:summary,:actor,:detail)');
      $s->execute(['obs'=>$body['observation_id']??null,'dim'=>strtoupper((string)($body['validation_dimension']??'')),'result'=>strtoupper((string)($body['validation_result']??'')),'rule'=>strtoupper((string)($body['rule_code']??'')),'summary'=>trim((string)($body['summary']??'')),'actor'=>$actorId,'detail'=>json_encode($body['detail']??[],JSON_UNESCAPED_SLASHES)]);
      jexit(['ok'=>true,'source'=>'POSTGRESQL_OBSERVATION_CORE','record'=>$s->fetch(PDO::FETCH_ASSOC)]);
    }
    if ($action === 'propose_observation_routes') {
      if (!$caps['review']) jexit(['ok'=>false,'error'=>'agriculture_capability_denied','capability'=>'review'],403);
      $s=$obsPdo->prepare('SELECT * FROM observation_core.api_propose_observation_routes(:obs)'); $s->execute(['obs'=>$body['observation_id']??null]);
      jexit(['ok'=>true,'source'=>'POSTGRESQL_OBSERVATION_CORE','records'=>$s->fetchAll(PDO::FETCH_ASSOC)]);
    }
    if ($action === 'assess_observation_photo') {
      if (!$caps['review']) jexit(['ok'=>false,'error'=>'agriculture_capability_denied','capability'=>'review'],403);
      $s=$obsPdo->prepare('SELECT * FROM agriculture.api_assess_photo_evidence(:photo,:quality,:context,:review,:consent,:actor)');
      $s->execute(['photo'=>$body['photo_evidence_id']??null,'quality'=>strtoupper((string)($body['image_quality_status']??'ACCEPTABLE')),'context'=>strtoupper((string)($body['context_validation_status']??'VALID')),'review'=>strtoupper((string)($body['review_status']??'APPROVED')),'consent'=>strtoupper((string)($body['consent_usage_status']??'APPROVED_FOR_RESEARCH')),'actor'=>$actorId]);
      jexit(['ok'=>true,'source'=>'POSTGRESQL_AGRICULTURE','record'=>$s->fetch(PDO::FETCH_ASSOC)]);
    }
    if ($action === 'review_universal_observation') {
      if (!$caps['review']) jexit(['ok'=>false,'error'=>'agriculture_capability_denied','capability'=>'review'],403);
      $s=$obsPdo->prepare('SELECT * FROM observation_core.api_review_observation(:obs,:decision,:summary,:actor)');
      $s->execute(['obs'=>$body['observation_id']??null,'decision'=>strtoupper((string)($body['decision']??'')),'summary'=>trim((string)($body['review_summary']??'')),'actor'=>$actorId]);
      jexit(['ok'=>true,'source'=>'POSTGRESQL_OBSERVATION_CORE','record'=>$s->fetch(PDO::FETCH_ASSOC)]);
    }
    if ($action === 'promote_universal_observation_evidence') {
      if (!$caps['approve']) jexit(['ok'=>false,'error'=>'agriculture_capability_denied','capability'=>'approve'],403);
      $s=$obsPdo->prepare('SELECT observation_core.api_promote_observation_to_evidence(:obs,:summary,:actor)');
      $s->execute(['obs'=>$body['observation_id']??null,'summary'=>trim((string)($body['review_summary']??'')),'actor'=>$actorId]);
      jexit(['ok'=>true,'source'=>'POSTGRESQL_OBSERVATION_CORE','result'=>json_decode((string)$s->fetchColumn(),true)]);
    }
  } catch (Throwable $e) {
    error_log('AAB_UNIVERSAL_OBSERVATION_OPERATIONAL_01 ' . $e->getMessage());
    $sqlState=$e instanceof PDOException?(string)$e->getCode():''; $message=$e->getMessage();
    $status=($sqlState==='42501'||str_contains($message,'CAPABILITY_DENIED')||str_contains($message,'ACCESS_DENIED'))?403:503;
    jexit(['ok'=>false,'error'=>'aab_universal_observation_gateway_failed','source'=>'POSTGRESQL_OBSERVATION_CORE','fail_closed'=>true,'detail'=>defined('AAB_DEBUG')&&AAB_DEBUG?$message:null],$status);
  }
}


/* =========================================================================
 * AAB-POSTGRES-WIRE-01
 * Controlled Agriculture PostgreSQL read bridge.
 *
 * Intercepts the existing ingredient read actions without changing the
 * browser-side API contract. No Airtable fallback is allowed: fail closed.
 * ========================================================================= */
if (in_array($action, ['list_ingredients', 'list_ingredient_library', 'get_ingredient_library_record', 'get_ingredient', 'list_ingredient_versions'], true)) {
  try {
    $factory = require __DIR__ . '/api/agriculture/bootstrap.php';
    $ag = $factory();
    if (!isset($ag['pdo']) || !($ag['pdo'] instanceof PDO)) {
      throw new RuntimeException('AGRICULTURE_POSTGRES_PDO_NOT_AVAILABLE');
    }
    /** @var PDO $agPdo */
    $agPdo = $ag['pdo'];

    $toLegacyIngredient = static function(array $row): array {
      $id = trim((string)($row['ingredient_id'] ?? ''));
      if ($id === '') {
        throw new RuntimeException('POSTGRES_INGREDIENT_ID_MISSING');
      }
      return [
        'id' => $id,
        'createdTime' => null,
        'fields' => [
          'Ingredient ID' => $id,
          'Ingredient Code' => $row['ingredient_code'] ?? null,
          'Ingredient Name' => $row['ingredient_name'] ?? null,
          'Name' => $row['ingredient_name'] ?? null,
          'Category' => $row['material_class'] ?? null,
          'Material Class' => $row['material_class'] ?? null,
          'Preparation Class' => $row['preparation_class'] ?? null,
          'Lifecycle Status' => $row['lifecycle_status'] ?? null,
          'Data Class' => $row['data_class'] ?? null,
          'Country Code' => $row['country_code'] ?? null,
          'Current Version No' => $row['current_version_no'] ?? null,
          'Current Version Review Status' => $row['current_version_review_status'] ?? null,
          'Amendment Rationale' => $row['amendment_rationale'] ?? null,
          'Alias Count' => (int)($row['alias_count'] ?? 0),
          'Evidence Count' => (int)($row['evidence_count'] ?? 0),
          'Approved Evidence Count' => (int)($row['approved_evidence_count'] ?? 0),
          'Originated From Discovery' => (bool)($row['originated_from_discovery'] ?? false),
          'Foliar Compatibility' => null,
          'Fertigation Compatibility' => null,
          'Risks / Contraindications' => null,
          'Mitigation Lever' => null,
          'Handling / Storage Notes' => null,
          'Version Ingredient Lines' => [],
          'NEGATIVE LEARNING REGISTER' => [],
        ],
        '_source' => 'POSTGRESQL_AGRICULTURE',
        '_gateway' => 'ingredients.list',
      ];
    };

    if (in_array($action, ['get_ingredient_library_record', 'get_ingredient'], true)) {
      $id = trim((string)($_GET['id'] ?? ''));
      if ($id === '') jexit(['ok'=>false,'error'=>'missing_id'], 400);
      $stmt = $agPdo->prepare('SELECT * FROM agriculture.v_ingredient_detail WHERE ingredient_id = :id LIMIT 1');
      $stmt->execute(['id' => $id]);
      $row = $stmt->fetch(PDO::FETCH_ASSOC);
      if (!$row) jexit(['ok'=>false,'error'=>'ingredient_not_found','source'=>'POSTGRESQL_AGRICULTURE'], 404);

      $legacy = $toLegacyIngredient($row);
      $legacy['fields']['Category'] = $row['category'] ?? ($legacy['fields']['Category'] ?? null);
      $legacy['fields']['Foliar Compatibility'] = $row['foliar_compatibility'] ?? null;
      $legacy['fields']['Foliar'] = $row['foliar_compatibility'] ?? null;
      $legacy['fields']['Fertigation Compatibility'] = $row['fertigation_compatibility'] ?? null;
      $legacy['fields']['Fertigation'] = $row['fertigation_compatibility'] ?? null;
      $legacy['fields']['Risks / Contraindications'] = $row['risks_contraindications'] ?? null;
      $legacy['fields']['Mitigation Lever'] = $row['mitigation_lever'] ?? null;
      $legacy['fields']['Handling / Storage Notes'] = $row['handling_storage_notes'] ?? null;
      $legacy['fields']['Version Count'] = (int)($row['version_count'] ?? 0);
      $legacy['fields']['Audit Event Count'] = (int)($row['audit_event_count'] ?? 0);
      $legacy['fields']['Updated At'] = $row['updated_at'] ?? null;
      $legacy['fields']['Retired At'] = $row['retired_at'] ?? null;
      $legacy['_gateway'] = 'ingredients.detail';

      if ($action === 'get_ingredient') {
        jexit([
          'ok'=>true,
          'source'=>'POSTGRESQL_AGRICULTURE',
          'record'=>$legacy
        ]);
      }

      jexit([
        'ok'=>true,
        'source'=>'POSTGRESQL_AGRICULTURE',
        'record'=>aab_normalise_ingredient_library_record($legacy),
        'raw_record'=>$legacy
      ]);
    }

    if ($action === 'list_ingredient_versions') {
      $id = trim((string)($_GET['id'] ?? ''));
      if ($id === '') jexit(['ok'=>false,'error'=>'missing_id'], 400);
      $stmt = $agPdo->prepare('SELECT * FROM agriculture.v_ingredient_version_history WHERE ingredient_id = :id ORDER BY version_no DESC');
      $stmt->execute(['id' => $id]);
      $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
      jexit([
        'ok'=>true,
        'source'=>'POSTGRESQL_AGRICULTURE',
        'gateway'=>'ingredients.versions',
        'ingredient_id'=>$id,
        'records'=>$rows,
        'count'=>count($rows)
      ]);
    }

    $limit = max(1, min(500, isset($_GET['limit']) ? (int)$_GET['limit'] : 100));
    $offset = max(0, isset($_GET['offset']) ? (int)$_GET['offset'] : 0);
    $sql = 'SELECT ingredient_id, ingredient_code, ingredient_name, lifecycle_status, material_class, preparation_class, data_class, country_code, current_version_no, ingredient_version_id, current_version_review_status, amendment_rationale, approved_by, approved_at, alias_count, evidence_count, approved_evidence_count, originated_from_discovery FROM agriculture.v_ingredient_governance_status WHERE lifecycle_status NOT IN (\'RETIRED\',\'SUPERSEDED\') ORDER BY ingredient_name, ingredient_code LIMIT :limit OFFSET :offset';
    $stmt = $agPdo->prepare($sql);
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $legacyRecords = array_map($toLegacyIngredient, $rows);

    if ($action === 'list_ingredients') {
      jexit(['ok'=>true,'source'=>'POSTGRESQL_AGRICULTURE','records'=>$legacyRecords]);
    }

    $normalised = array_map('aab_normalise_ingredient_library_record', $legacyRecords);
    jexit(['ok'=>true,'source'=>'POSTGRESQL_AGRICULTURE','records'=>$normalised,'count'=>count($normalised)]);
  } catch (Throwable $e) {
    error_log('AAB_POSTGRES_WIRE_03 ' . $e->getMessage());
    jexit([
      'ok'=>false,
      'error'=>'agriculture_postgresql_gateway_failed',
      'source'=>'POSTGRESQL_AGRICULTURE',
      'fail_closed'=>true,
      'detail'=>defined('AAB_DEBUG') && AAB_DEBUG ? $e->getMessage() : null
    ], 503);
  }
}


// Simple healthcheck (some older builds used ping.php; Capture may call ping)
if ($action === 'ping') {
  jexit(['ok'=>true,'pong'=>true,'ts'=>date('c')]);
}


/* Historical persistence implementation removed from sovereign candidate. */
if (in_array($action, ['diag','auth_probe','diag_sources'], true)) {
  jexit(['ok'=>false,'error'=>'LEGACY_DIAGNOSTIC_RETIRED','action'=>$action], 410);
}
jexit(['ok'=>false,'error'=>'ACTION_NOT_AVAILABLE_IN_GOVERNED_RUNTIME','action'=>$action], 404);
