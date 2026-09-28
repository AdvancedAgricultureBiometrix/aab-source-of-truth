<?php
declare(strict_types=1);
namespace AAB\Agriculture\Services;
use AAB\Agriculture\Repositories\ObservationTemplateRepository;
final class ObservationTemplateService { public function __construct(private readonly ObservationTemplateRepository $repo){} public function listActive():array{return $this->repo->listActive();} public function getWithMetrics(string $id):?array{return $this->repo->getWithMetrics($id);} }
