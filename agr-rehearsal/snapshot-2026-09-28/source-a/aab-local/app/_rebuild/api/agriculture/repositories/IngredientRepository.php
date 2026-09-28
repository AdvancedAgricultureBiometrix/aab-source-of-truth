<?php
declare(strict_types=1);
namespace AAB\Agriculture\Repositories;
use PDO; use RuntimeException;
final class IngredientRepository {
 public function __construct(private readonly PDO $pdo) {}
 public function list(array $filters=[],int $limit=100,int $offset=0): array {
  $limit=max(1,min(500,$limit)); $offset=max(0,$offset); $where=[]; $p=[];
  if(!empty($filters['status'])){$where[]='i.lifecycle_status=:status';$p['status']=$filters['status'];}
  if(!empty($filters['search'])){$where[]='(i.ingredient_name ILIKE :search OR i.ingredient_code ILIKE :search)';$p['search']='%'.$filters['search'].'%';}
  $sql='SELECT i.*,v.ingredient_version_id,v.version_no,v.category,v.foliar_compatibility,v.fertigation_compatibility,v.risks_contraindications,v.mitigation_lever,v.handling_storage_notes,v.review_status FROM agriculture.ingredient i LEFT JOIN agriculture.ingredient_version v ON v.ingredient_id=i.ingredient_id AND v.version_no=i.current_version_no';
  if($where)$sql.=' WHERE '.implode(' AND ',$where); $sql.=' ORDER BY i.ingredient_name LIMIT :limit OFFSET :offset';
  $s=$this->pdo->prepare($sql); foreach($p as $k=>$v)$s->bindValue(':'.$k,$v); $s->bindValue(':limit',$limit,PDO::PARAM_INT);$s->bindValue(':offset',$offset,PDO::PARAM_INT);$s->execute(); return $s->fetchAll();
 }
 public function get(string $id,bool $forUpdate=false): ?array {
  $sql='SELECT i.*,v.ingredient_version_id,v.version_no,v.category,v.foliar_compatibility,v.fertigation_compatibility,v.risks_contraindications,v.mitigation_lever,v.handling_storage_notes,v.review_status FROM agriculture.ingredient i LEFT JOIN agriculture.ingredient_version v ON v.ingredient_id=i.ingredient_id AND v.version_no=i.current_version_no WHERE i.ingredient_id=:id'.($forUpdate?' FOR UPDATE OF i':'');
  $s=$this->pdo->prepare($sql);$s->execute(['id'=>$id]);$r=$s->fetch();return $r?:null;
 }
 public function createDraft(array $d,string $actorId): array {
  $s=$this->pdo->prepare('INSERT INTO agriculture.ingredient(ingredient_code,ingredient_name,lifecycle_status,material_class,preparation_class,data_class,country_code,created_by) VALUES(:code,:name,\'DRAFT\',:material,:prep,:data_class,:country,:actor) RETURNING *');
  $s->execute(['code'=>$d['ingredient_code'],'name'=>$d['ingredient_name'],'material'=>$d['material_class'],'prep'=>$d['preparation_class']??null,'data_class'=>$d['data_class']??'MIGRATED_UNREVIEWED','country'=>$d['country_code']??'TH','actor'=>$actorId]);$ingredient=$s->fetch();
  $v=$this->pdo->prepare('INSERT INTO agriculture.ingredient_version(ingredient_id,version_no,category,foliar_compatibility,fertigation_compatibility,risks_contraindications,mitigation_lever,handling_storage_notes,amendment_rationale,review_status,created_by) VALUES(:id,1,:category,:foliar,:fertigation,:risks,:mitigation,:handling,:why,\'PENDING\',:actor) RETURNING *');
  $v->execute(['id'=>$ingredient['ingredient_id'],'category'=>$d['category']??null,'foliar'=>$d['foliar_compatibility']??null,'fertigation'=>$d['fertigation_compatibility']??null,'risks'=>$d['risks_contraindications']??null,'mitigation'=>$d['mitigation_lever']??null,'handling'=>$d['handling_storage_notes']??null,'why'=>$d['amendment_rationale']??'Initial draft creation','actor'=>$actorId]);
  return $this->get((string)$ingredient['ingredient_id']) ?? throw new RuntimeException('INGREDIENT_CREATE_READBACK_FAILED');
 }
 public function createAmendment(string $id,array $changes,string $actorId,string $rationale): array {
  $current=$this->get($id,true)??throw new RuntimeException('INGREDIENT_NOT_FOUND');$next=((int)$current['current_version_no'])+1;
  $v=$this->pdo->prepare('INSERT INTO agriculture.ingredient_version(ingredient_id,version_no,category,foliar_compatibility,fertigation_compatibility,risks_contraindications,mitigation_lever,handling_storage_notes,amendment_rationale,review_status,created_by) VALUES(:id,:version,:category,:foliar,:fertigation,:risks,:mitigation,:handling,:why,\'PENDING\',:actor)');
  $v->execute(['id'=>$id,'version'=>$next,'category'=>$changes['category']??$current['category'],'foliar'=>$changes['foliar_compatibility']??$current['foliar_compatibility'],'fertigation'=>$changes['fertigation_compatibility']??$current['fertigation_compatibility'],'risks'=>$changes['risks_contraindications']??$current['risks_contraindications'],'mitigation'=>$changes['mitigation_lever']??$current['mitigation_lever'],'handling'=>$changes['handling_storage_notes']??$current['handling_storage_notes'],'why'=>$rationale,'actor'=>$actorId]);
  $u=$this->pdo->prepare('UPDATE agriculture.ingredient SET ingredient_name=COALESCE(:name,ingredient_name),material_class=COALESCE(:material,material_class),preparation_class=COALESCE(:prep,preparation_class),current_version_no=:version,updated_at=now() WHERE ingredient_id=:id');
  $u->execute(['name'=>$changes['ingredient_name']??null,'material'=>$changes['material_class']??null,'prep'=>$changes['preparation_class']??null,'version'=>$next,'id'=>$id]); return $this->get($id)??throw new RuntimeException('INGREDIENT_AMEND_READBACK_FAILED');
 }
 public function setLifecycleStatus(string $id,string $status): array {
  $s=$this->pdo->prepare('UPDATE agriculture.ingredient SET lifecycle_status=:status,updated_at=now(),retired_at=CASE WHEN :status=\'RETIRED\' THEN now() ELSE retired_at END WHERE ingredient_id=:id RETURNING *');$s->execute(['status'=>$status,'id'=>$id]);if(!$s->fetch())throw new RuntimeException('INGREDIENT_NOT_FOUND');return $this->get($id)??throw new RuntimeException('INGREDIENT_STATUS_READBACK_FAILED');
 }
 public function dependencyCounts(string $id): array {
  $sql="SELECT (SELECT count(*) FROM agriculture.formulation_version_ingredient WHERE ingredient_id=:id) formulation_lines,(SELECT count(*) FROM agriculture.ingredient_evidence WHERE ingredient_id=:id) evidence,(SELECT count(*) FROM agriculture.ingredient_alias WHERE ingredient_id=:id) aliases";$s=$this->pdo->prepare($sql);$s->execute(['id'=>$id]);return $s->fetch()?:[];
 }
 public function hardDeleteUnreferencedDraft(string $id): void {
  $this->pdo->prepare('DELETE FROM agriculture.ingredient_version WHERE ingredient_id=:id')->execute(['id'=>$id]);$s=$this->pdo->prepare("DELETE FROM agriculture.ingredient WHERE ingredient_id=:id AND lifecycle_status='DRAFT'");$s->execute(['id'=>$id]);if($s->rowCount()!==1)throw new RuntimeException('INGREDIENT_HARD_DELETE_BLOCKED');
 }
}
