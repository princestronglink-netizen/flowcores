<?php

namespace Database\Seeders;

use App\Models\Pipeline;
use Illuminate\Database\Seeder;

class PipelineStageSeeder extends Seeder
{
    public function run(): void
    {
        $pipeline = Pipeline::firstOrCreate(
            ['pipeline_code' => 'MAIN'],
            ['pipeline_name' => 'Main Pipeline', 'pipeline_description' => 'Default sales pipeline']
        );

        if ($pipeline->stages()->doesntExist()) {
            $stages = ['New', 'Quotation', 'Negotiation', 'Delivery', 'Completed'];
            $last = count($stages) - 1;

            foreach ($stages as $i => $name) {
                $pipeline->stages()->create([
                    'stage_code' => strtolower($name),
                    'stage_name' => $name,
                    'sort_order' => $i,
                    'is_initial' => $i === 0,
                    'is_final'   => $i === $last,
                ]);
            }
        }
    }
}