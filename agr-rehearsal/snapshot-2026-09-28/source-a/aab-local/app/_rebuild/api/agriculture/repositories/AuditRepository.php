<?php
declare(strict_types=1);
namespace AAB\Agriculture\Repositories;
use PDO;
final class AuditRepository {
 public function __construct(private readonly PDO $pdo) {}
 public function append(string $eventType,string $subjectType,?string $subjectId,?string $actorId,?string $authority,string $rationale,?array $before,?array $after): string {
  $s=$this->pdo->prepare('INSERT INTO agriculture.audit_event(event_type,subject_type,subject_id,actor_id,authority_context,rationale,before_state,after_state) VALUES(:event,:stype,:sid,:actor,:authority,:rationale,CAST(:before AS jsonb),CAST(:after AS jsonb)) RETURNING audit_event_id');
  $s->execute(['event'=>$eventType,'stype'=>$subjectType,'sid'=>$subjectId?:null,'actor'=>$actorId?:null,'authority'=>$authority,'rationale'=>$rationale,'before'=>$before===null?null:json_encode($before,JSON_THROW_ON_ERROR),'after'=>$after===null?null:json_encode($after,JSON_THROW_ON_ERROR)]);
  return (string)$s->fetchColumn();
 }
}
