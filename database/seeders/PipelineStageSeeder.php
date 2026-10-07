<?php

namespace Database\Seeders;

use App\Models\Pipeline;
use Illuminate\Database\Seeder;

class PipelineStageSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * This seeds stages for ONE pipeline at a time. To add a second
     * pipeline with a different flow later (e.g. a "Support" pipeline
     * with Open → In Progress → Resolved → Closed), create the
     * Pipeline row first, then call seedStages() again with its id
     * and its own stage list — no schema changes needed.
     */
    public function run(): void
    {
        $pipeline = Pipeline::firstOrCreate(
            ['pipeline_code' => 'sales'],
            [
                'pipeline_name' => 'Sales',
                'pipeline_description' => 'Standard sales transaction pipeline',
            ]
        );

        $this->seedStages($pipeline, [
            ['code' => 'request', 'name' => 'Request', 'initial' => true],
            ['code' => 'negotiation', 'name' => 'Negotiation'],
            ['code' => 'item_preparation', 'name' => 'Item Preparation'],
            ['code' => 'delivered', 'name' => 'Delivered'],
            ['code' => 'payment', 'name' => 'Payment', 'final' => true],
        ]);
    }

    /**
     * @param  array<int, array{code: string, name: string, initial?: bool, final?: bool}>  $stages
     */
    private function seedStages(Pipeline $pipeline, array $stages): void
    {
        foreach ($stages as $index => $stage) {
            $pipeline->stages()->updateOrCreate(
                ['stage_code' => $stage['code']],
                [
                    'stage_name' => $stage['name'],
                    'sort_order' => $index + 1,
                    'is_initial' => $stage['initial'] ?? false,
                    'is_final' => $stage['final'] ?? false,
                ]
            );
        }
    }
}