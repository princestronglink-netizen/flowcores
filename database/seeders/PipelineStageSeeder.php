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

        // stage name => flags. Only one stage may hold each flag, and the
        // delivery stage can't also create quotations or client POs.
        $stages = [
            'New'         => [],
            'Quotation'   => ['creates_quotation' => true],
            'Negotiation' => ['creates_client_po' => true], // adjust to where the client PO belongs
            'Delivery'    => ['deducts_stock' => true],
            'Completed'   => [],
        ];

        $last = count($stages) - 1;
        $i    = 0;

        foreach ($stages as $name => $flags) {
            // updateOrCreate so re-running the seeder also fixes existing stages.
            $pipeline->stages()->updateOrCreate(
                ['stage_code' => strtolower($name)],
                $flags + [
                    'stage_name' => $name,
                    'sort_order' => $i,
                    'is_initial' => $i === 0,
                    'is_final'   => $i === $last,
                ]
            );

            $i++;
        }
    }
}