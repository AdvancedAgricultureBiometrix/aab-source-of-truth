<?php
declare(strict_types=1);
namespace AAB\Agriculture\Repositories;
use PDO;
final class ObservationTemplateRepository {
 public function __construct(private readonly PDO $pdo) {}
 public function listActive(): array {
  $q="SELECT t.observation_template_id,t.template_code,t.template_name,t.lifecycle_status,v.observation_template_version_id,v.version_no,v.objective,v.purpose,v.guidance_notes,v.review_status FROM agriculture.observation_template t JOIN agriculture.observation_template_version v ON v.observation_template_id=t.observation_template_id AND v.version_no=t.current_version_no WHERE t.lifecycle_status='ACTIVE' ORDER BY t.template_name";return $this->pdo->query($q)->fetchAll();
 }
 public function getWithMetrics(string $id): ?array {
  $s=$this->pdo->prepare('SELECT t.template_code,t.template_name,t.lifecycle_status,v.* FROM agriculture.observation_template_version v JOIN agriculture.observation_template t ON t.observation_template_id=v.observation_template_id WHERE v.observation_template_version_id=:id');$s->execute(['id'=>$id]);$t=$s->fetch();if(!$t)return null;
  $m=$this->pdo->prepare('SELECT tm.requirement_level,tm.display_order,tm.override_unit,tm.override_min,tm.override_max,tm.capture_guidance_override,d.metric_definition_id,d.metric_code,d.metric_name,d.value_type,d.capture_input_type,d.default_unit,d.allowed_units,d.default_precision,d.suggested_min,d.suggested_max,d.help_text,d.measurement_guidance,d.metadata_status FROM agriculture.observation_template_metric tm JOIN agriculture.metric_definition d ON d.metric_definition_id=tm.metric_definition_id WHERE tm.observation_template_version_id=:id ORDER BY tm.display_order');$m->execute(['id'=>$id]);$t['metrics']=$m->fetchAll();return $t;
 }
}
