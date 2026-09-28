<?php
declare(strict_types=1);
namespace AAB\Agriculture\Services;
use AAB\Agriculture\Config\PostgresConfig; use PDO;
final class PostgresHealthService {
 public function __construct(private readonly PDO $pdo,private readonly PostgresConfig $config){}
 public function inspect():array{
  $server=$this->pdo->query("SELECT current_database() database_name,current_user database_user,current_schema() current_schema,version() server_version")->fetch();
  $schemaExists=(bool)$this->pdo->query("SELECT EXISTS(SELECT 1 FROM information_schema.schemata WHERE schema_name='agriculture')")->fetchColumn();
  $required=['schema_migration','ingredient','ingredient_version','observation_template','observation_template_version','metric_definition','audit_event'];$tables=[];
  $s=$this->pdo->prepare('SELECT to_regclass(:name) IS NOT NULL');foreach($required as$t){$s->execute(['name'=>'agriculture.'.$t]);$tables[$t]=(bool)$s->fetchColumn();}
  $migrationCount=$tables['schema_migration']?(int)$this->pdo->query('SELECT count(*) FROM agriculture.schema_migration')->fetchColumn():0;
  $templateCount=$tables['observation_template']?(int)$this->pdo->query('SELECT count(*) FROM agriculture.observation_template')->fetchColumn():0;
  $ready=$schemaExists&&!in_array(false,$tables,true);
  return ['ok'=>$ready,'contract'=>'AAB_AGRICULTURE_POSTGRESQL_DATA_LAYER_04R1','status'=>$ready?'PASS_READY_FOR_API_COMPATIBILITY':'CONNECTED_MIGRATIONS_REQUIRED','mode'=>'READ_ONLY_HEALTH','configuration'=>$this->config->safeSummary(),'database'=>['connected'=>true,'database_name'=>$server['database_name']??null,'schema_exists'=>$schemaExists,'server_family'=>str_contains((string)($server['server_version']??''),'PostgreSQL')?'PostgreSQL':'UNKNOWN'],'migration_count'=>$migrationCount,'required_tables'=>$tables,'template_count'=>$templateCount,'timestamp_utc'=>gmdate('c')];
 }
}
