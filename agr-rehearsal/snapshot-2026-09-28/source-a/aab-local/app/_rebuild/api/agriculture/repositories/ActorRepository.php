<?php
declare(strict_types=1);
namespace AAB\Agriculture\Repositories;
use PDO; use RuntimeException;
final class ActorRepository {
 public function __construct(private readonly PDO $pdo) {}
 public function requireActiveActor(string $actorId,array $allowedTypes): array {
  $s=$this->pdo->prepare('SELECT actor_id,display_name,actor_type,active FROM agriculture.actor WHERE actor_id=:id');
  $s->execute(['id'=>$actorId]); $actor=$s->fetch();
  if(!$actor || !$actor['active']) throw new RuntimeException('ACTIVE_ACTOR_REQUIRED');
  if(!in_array($actor['actor_type'],$allowedTypes,true)) throw new RuntimeException('ACTOR_AUTHORITY_INSUFFICIENT');
  return $actor;
 }
}
