<?php
declare(strict_types=1);

namespace AAB\Agriculture\Services;

use PDO;
use RuntimeException;

final class PostgresIngredientReadBridge
{
    public function __construct(private readonly PDO $pdo) {}

    public function listRecords(int $limit = 100, int $offset = 0): array
    {
        $limit = max(1, min(500, $limit));
        $offset = max(0, $offset);
        $sql = <<<'SQL'
SELECT
  ingredient_id,
  ingredient_code,
  ingredient_name,
  lifecycle_status,
  material_class,
  preparation_class,
  data_class,
  country_code,
  current_version_no,
  ingredient_version_id,
  current_version_review_status,
  amendment_rationale,
  approved_by,
  approved_at,
  alias_count,
  evidence_count,
  approved_evidence_count,
  originated_from_discovery
FROM agriculture.v_ingredient_governance_status
WHERE lifecycle_status <> 'ARCHIVED'
ORDER BY ingredient_name, ingredient_code
LIMIT :limit OFFSET :offset
SQL;
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public function getRecord(string $ingredientId): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT * FROM agriculture.v_ingredient_governance_status WHERE ingredient_id = :id LIMIT 1'
        );
        $stmt->execute(['id' => $ingredientId]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function toLegacyRecord(array $row): array
    {
        $id = (string)($row['ingredient_id'] ?? '');
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
    }
}
